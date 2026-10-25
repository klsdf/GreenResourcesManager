/**
 * 创意工坊公共目录的 IPC 处理器。
 *
 * 目录和插件包都在 GitHub 上：
 * - community-mods.json 描述有哪些插件、各自在哪个仓库
 * - 插件作者在自己的仓库发布 latest Release，资源固定叫 manifest.json、index.js 等
 *
 * 这里用 Electron 的 net.fetch 下载，能走系统代理；不使用 GitHub API，
 * 避免匿名 60 次/小时的限制。
 */

const path = require('path')
const { app, ipcMain, net } = require('electron')
const pathUtils = require('../utils/path-utils')
const { createWorkshopService } = require('../utils/workshop-service')

const REGISTRY_REPO = 'klsdf/GreenResourcesManager'
const REGISTRY_BRANCH = 'main'
// 仓库是 monorepo，根目录是 project/，应用在 green-resources-manager 子目录里
const REGISTRY_PATH = 'green-resources-manager/workshop/community-mods.json'

const REGISTRY_URLS = [
  `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}/${REGISTRY_PATH}`,
  `https://cdn.jsdelivr.net/gh/${REGISTRY_REPO}@${REGISTRY_BRANCH}/${REGISTRY_PATH}`
]

async function fetchBuffer(url, { maxBytes, timeoutMs = 20000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await net.fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    })

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (maxBytes && contentLength > maxBytes) {
      throw new Error('文件超过大小限制')
    }

    if (!response.body) {
      return { status: response.status, headers: response.headers, body: Buffer.alloc(0) }
    }

    const reader = response.body.getReader()
    const chunks = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      total += value.length
      if (maxBytes && total > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new Error('文件超过大小限制')
      }
      chunks.push(Buffer.from(value))
    }

    return {
      status: response.status,
      headers: response.headers,
      body: Buffer.concat(chunks)
    }
  } finally {
    clearTimeout(timer)
  }
}

let service = null

function getService() {
  if (!service) {
    service = createWorkshopService({
      modsRoot: path.join(pathUtils.getAppRootPath(), 'mods'),
      cacheRoot: path.join(app.getPath('userData'), 'workshop-cache'),
      registryUrls: REGISTRY_URLS,
      appVersion: app.getVersion(),
      fetchBuffer
    })
  }
  return service
}

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('workshop-get-registry', async (event, force) => {
    try {
      return await getService().getRegistry({ force: Boolean(force) })
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workshop-install-mod', async (event, payload) => {
    try {
      return await getService().installMod(payload || {})
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workshop-uninstall-mod', async (event, id) => {
    try {
      return await getService().uninstallMod(id)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workshop-get-installed', async () => {
    try {
      return { success: true, mods: await getService().getInstalled() }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('workshop-check-updates', async () => {
    try {
      return await getService().checkUpdates()
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerIpcHandlers,
  REGISTRY_URLS
}
