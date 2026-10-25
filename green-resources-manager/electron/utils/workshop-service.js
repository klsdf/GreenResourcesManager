/**
 * 创意工坊服务：拉取公共目录、安装/卸载插件、检查更新。
 *
 * 这个模块不直接依赖 Electron，网络请求和目录位置都由调用方注入，
 * 方便在 vitest 里用临时目录和假的 fetch 做端到端测试。
 */

const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const crypto = require('crypto')

const {
  cleanText,
  isValidModId,
  isValidRepo,
  isValidVersion,
  compareVersions,
  normalizeRegistry,
  normalizeManifest,
  buildReleaseAssetUrl
} = require('./workshop-utils')

const REGISTRY_MAX_BYTES = 512 * 1024
const MANIFEST_MAX_BYTES = 256 * 1024
const SCRIPT_MAX_BYTES = 8 * 1024 * 1024
const OPTIONAL_FILE_MAX_BYTES = {
  'styles.css': 2 * 1024 * 1024,
  'README.md': 512 * 1024
}

const REGISTRY_CACHE_TTL_MS = 5 * 60 * 1000
const LATEST_MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJson(filePath) {
  try {
    const text = await fsp.readFile(filePath, 'utf8')
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeJsonAtomic(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await fsp.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
  await fsp.rename(tempPath, filePath)
}

async function mapLimit(items, limit, worker) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  })
  await Promise.all(runners)
}

function createWorkshopService(options) {
  const {
    modsRoot,
    cacheRoot,
    registryUrls,
    fetchBuffer,
    appVersion = '',
    now = () => Date.now()
  } = options || {}

  if (!modsRoot || !cacheRoot) {
    throw new Error('创意工坊缺少 mods 目录或缓存目录')
  }
  if (!Array.isArray(registryUrls) || registryUrls.length === 0) {
    throw new Error('创意工坊缺少公共目录地址')
  }
  if (typeof fetchBuffer !== 'function') {
    throw new Error('创意工坊缺少网络请求实现')
  }

  const metaRoot = path.join(modsRoot, '.workshop')
  const stageRoot = path.join(modsRoot, '.workshop-tmp')
  const backupRoot = path.join(metaRoot, 'backups')
  const registryCachePath = path.join(cacheRoot, 'registry.json')

  const latestManifestCachePath = (repo) =>
    path.join(cacheRoot, `latest-${repo.replace(/[^A-Za-z0-9._-]/g, '_')}.json`)

  const metaPath = (id) => path.join(metaRoot, `${id}.json`)

  async function requestBody(url, maxBytes, { optional = false } = {}) {
    const response = await fetchBuffer(url, { maxBytes, timeoutMs: 20000 })
    if (!response || typeof response.status !== 'number') {
      throw new Error('网络请求没有返回有效响应')
    }
    if (response.status === 404 && optional) {
      return null
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`下载失败（HTTP ${response.status}）`)
    }
    const body = Buffer.isBuffer(response.body)
      ? response.body
      : Buffer.from(response.body || [])
    if (body.length > maxBytes) {
      throw new Error('文件超过大小限制')
    }
    return body
  }

  async function readRegistryCache() {
    const cached = await readJson(registryCachePath)
    if (!cached || !Array.isArray(cached.mods)) {
      return null
    }
    try {
      return {
        fetchedAt: Number(cached.fetchedAt) || 0,
        mods: normalizeRegistry(cached.mods)
      }
    } catch {
      return null
    }
  }

  async function getRegistry({ force = false } = {}) {
    const cached = await readRegistryCache()
    if (!force && cached && now() - cached.fetchedAt < REGISTRY_CACHE_TTL_MS) {
      return {
        success: true,
        mods: cached.mods,
        cached: true,
        fetchedAt: cached.fetchedAt,
        source: 'cache'
      }
    }

    let lastError = null
    for (const url of registryUrls) {
      try {
        const body = await requestBody(url, REGISTRY_MAX_BYTES)
        const mods = normalizeRegistry(JSON.parse(body.toString('utf8')))
        const fetchedAt = now()
        await writeJsonAtomic(registryCachePath, { fetchedAt, mods }).catch(() => {})
        return { success: true, mods, cached: false, fetchedAt, source: url }
      } catch (error) {
        lastError = error
      }
    }

    if (cached) {
      return {
        success: true,
        mods: cached.mods,
        cached: true,
        stale: true,
        fetchedAt: cached.fetchedAt,
        warning: '暂时连不上公共目录，当前显示的是上次缓存的列表'
      }
    }

    const message = lastError ? lastError.message : '未知错误'
    const missing = /HTTP 404/.test(message)
    return {
      success: false,
      error: missing
        ? '无法读取公共目录：目录文件还不存在（HTTP 404）。请确认 green-resources-manager/workshop/community-mods.json 已推送到 main 分支。'
        : `无法读取公共目录：${message}`
    }
  }

  async function getRegistryEntry(id) {
    const registry = await getRegistry()
    if (!registry.success) {
      throw new Error(registry.error || '无法读取公共目录')
    }
    return registry.mods.find((mod) => mod.id === id) || null
  }

  async function fetchLatestManifest(repo, { cacheTtlMs = LATEST_MANIFEST_CACHE_TTL_MS } = {}) {
    const cachePath = latestManifestCachePath(repo)
    if (cacheTtlMs > 0) {
      const cached = await readJson(cachePath)
      if (
        cached &&
        Number(cached.fetchedAt) &&
        now() - Number(cached.fetchedAt) < cacheTtlMs
      ) {
        try {
          return normalizeManifest(cached.manifest)
        } catch {
          // 缓存损坏时忽略它，重新下载
        }
      }
    }

    const body = await requestBody(buildReleaseAssetUrl(repo, 'manifest.json'), MANIFEST_MAX_BYTES)
    const manifest = normalizeManifest(JSON.parse(body.toString('utf8')))
    await writeJsonAtomic(cachePath, {
      fetchedAt: now(),
      manifest
    }).catch(() => {})
    return manifest
  }

  async function writeStageFile(stageDir, fileName, body) {
    await fsp.writeFile(path.join(stageDir, fileName), body)
  }

  async function installMod({ id, repo } = {}) {
    if (!isValidModId(id)) {
      throw new Error('插件 id 不合法')
    }
    if (!isValidRepo(repo)) {
      throw new Error('插件仓库地址不合法')
    }

    const entry = await getRegistryEntry(id)
    if (!entry) {
      throw new Error('公共目录里找不到这个插件')
    }
    if (entry.repo !== repo) {
      throw new Error('插件来源与公共目录记录不一致')
    }

    const manifestBody = await requestBody(
      buildReleaseAssetUrl(entry.repo, 'manifest.json'),
      MANIFEST_MAX_BYTES
    )
    const manifestText = manifestBody.toString('utf8')
    const rawManifest = JSON.parse(manifestText)
    const manifest = normalizeManifest(rawManifest)

    if (manifest.id !== id) {
      throw new Error(`插件包里的 id（${manifest.id}）与公共目录不一致`)
    }
    if (
      manifest.minAppVersion &&
      isValidVersion(appVersion) &&
      compareVersions(appVersion, manifest.minAppVersion) < 0
    ) {
      throw new Error(`这个插件需要应用版本 ${manifest.minAppVersion} 或更高`)
    }

    await fsp.mkdir(stageRoot, { recursive: true })
    const stageDir = path.join(
      stageRoot,
      `${id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
    )
    await fsp.mkdir(stageDir, { recursive: true })

    try {
      // 写回规范化后的 manifest，避免作者多写空格导致入口文件名对不上
      const manifestFile = { ...rawManifest, ...manifest }
      await writeStageFile(
        stageDir,
        'manifest.json',
        Buffer.from(JSON.stringify(manifestFile, null, 2), 'utf8')
      )

      const entryBody = await requestBody(
        buildReleaseAssetUrl(entry.repo, manifest.entry),
        SCRIPT_MAX_BYTES
      )
      await writeStageFile(stageDir, manifest.entry, entryBody)

      const optionalFiles = ['styles.css', 'README.md'].filter(
        (fileName) => fileName !== manifest.entry
      )
      for (const fileName of optionalFiles) {
        const body = await requestBody(
          buildReleaseAssetUrl(entry.repo, fileName),
          OPTIONAL_FILE_MAX_BYTES[fileName],
          { optional: true }
        )
        if (body) {
          await writeStageFile(stageDir, fileName, body)
        }
      }

      const fileHashes = {}
      for (const fileName of await fsp.readdir(stageDir)) {
        const content = await fsp.readFile(path.join(stageDir, fileName))
        fileHashes[fileName] = crypto.createHash('sha256').update(content).digest('hex')
      }

      const metadata = {
        id,
        repo: entry.repo,
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        installedAt: new Date(now()).toISOString(),
        files: fileHashes
      }

      const targetDir = path.join(modsRoot, id)
      await fsp.mkdir(modsRoot, { recursive: true })
      let backupDir = null

      if (await pathExists(targetDir)) {
        await fsp.mkdir(backupRoot, { recursive: true })
        backupDir = path.join(backupRoot, `${id}-${now()}`)
        await fsp.rename(targetDir, backupDir)
      }

      try {
        await fsp.rename(stageDir, targetDir)
        await writeJsonAtomic(metaPath(id), metadata)
      } catch (error) {
        await fsp.rm(targetDir, { recursive: true, force: true }).catch(() => {})
        if (backupDir) {
          await fsp.rename(backupDir, targetDir).catch(() => {})
        }
        throw error
      }

      if (backupDir) {
        await fsp.rm(backupDir, { recursive: true, force: true }).catch(() => {})
      }

      return {
        success: true,
        mod: {
          id,
          name: manifest.name,
          version: manifest.version,
          author: manifest.author,
          description: manifest.description,
          entry: manifest.entry,
          repo: entry.repo
        },
        metadata
      }
    } finally {
      await fsp.rm(stageDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  async function getInstalled() {
    const entries = await fsp
      .readdir(metaRoot, { withFileTypes: true })
      .catch(() => [])
    const installed = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue
      }
      const metadata = await readJson(path.join(metaRoot, entry.name))
      if (!metadata || !isValidModId(metadata.id)) {
        continue
      }
      const manifest = await readJson(path.join(modsRoot, metadata.id, 'manifest.json'))
      if (!manifest) {
        continue
      }
      installed.push({
        id: metadata.id,
        repo: cleanText(metadata.repo, 200),
        name: cleanText(manifest.name, 80) || cleanText(metadata.name, 80) || metadata.id,
        version: cleanText(manifest.version, 40) || cleanText(metadata.version, 40),
        installedAt: cleanText(metadata.installedAt, 40)
      })
    }

    return installed
  }

  async function uninstallMod(id) {
    if (!isValidModId(id)) {
      throw new Error('插件 id 不合法')
    }
    const metadata = await readJson(metaPath(id))
    if (!metadata || metadata.id !== id) {
      throw new Error('这个插件不是从创意工坊安装的，只能手动删除')
    }

    const targetDir = path.resolve(modsRoot, id)
    if (path.dirname(targetDir) !== path.resolve(modsRoot)) {
      throw new Error('插件目录不合法')
    }

    await fsp.rm(targetDir, { recursive: true, force: true })
    await fsp.rm(metaPath(id), { force: true })
    return { success: true, id }
  }

  async function checkUpdates() {
    const installed = await getInstalled()
    const updates = []
    const failed = []

    await mapLimit(installed, 3, async (mod) => {
      if (!isValidRepo(mod.repo)) {
        failed.push({ id: mod.id, error: '插件仓库地址不合法' })
        return
      }
      try {
        const latest = await fetchLatestManifest(mod.repo)
        if (latest.id !== mod.id) {
          failed.push({ id: mod.id, error: '仓库里的 manifest.id 与插件 id 不一致' })
          return
        }
        if (compareVersions(latest.version, mod.version) > 0) {
          updates.push({
            id: mod.id,
            repo: mod.repo,
            currentVersion: mod.version,
            latestVersion: latest.version
          })
        }
      } catch (error) {
        failed.push({ id: mod.id, error: error.message })
      }
    })

    updates.sort((left, right) => left.id.localeCompare(right.id))
    failed.sort((left, right) => left.id.localeCompare(right.id))
    return { success: true, updates, failed }
  }

  return {
    getRegistry,
    installMod,
    getInstalled,
    uninstallMod,
    checkUpdates
  }
}

module.exports = {
  createWorkshopService
}
