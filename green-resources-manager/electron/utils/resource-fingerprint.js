/**
 * 资源内容指纹。
 *
 * 设计原因：资源是否还在，以前只看 resourcePath 能不能打开。
 * 文件夹或文件一改名、或者在同一个父目录里挪一下，路径就变了，旧记录会被标成丢失，再拖进来又会新建一条。
 * 这里不读文件内容（大游戏会很慢），只用几种便宜的信号：
 * - names：游戏、软件、番剧文件夹。记录项目内相对路径（启动文件、存档、缓存不参与），改文件夹名或启动文件名不影响。
 * - pages：漫画。记录图片张数和图片相对路径。张数相同且图片名相同视为同一本；只有一本对得上、且页数够多时，才允许只凭张数认。
 * - size：电影、小说、单图等单个文件。文件名会变，大小和扩展名通常不变。
 *
 * 指纹是字符串，直接放进资源 JSON，不改数据库表结构。
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const AdmZip = require('adm-zip')
const { SUPPORTED_IMAGE_FORMATS } = require('./constants')

/**
 * 参与漫画页数统计的图片扩展名。
 * @type {Set<string>}
 */
const IMAGE_EXT = new Set(SUPPORTED_IMAGE_FORMATS.map((fmt) => `.${fmt.toLowerCase()}`))

/**
 * 游戏/软件的启动文件扩展名。这些文件改名很常见，不放进文件名指纹。
 * @type {Set<string>}
 */
const EXEC_EXT = new Set(['.exe', '.swf', '.bat', '.lnk', '.msi'])

/**
 * 会自己变化的目录名。游戏运行后会往里面写存档，不能拿来认身份。
 * @type {Set<string>}
 */
const VOLATILE_DIRS = new Set(['save', 'saves', 'log', 'logs', 'cache', 'temp', 'tmp', 'node_modules', '.git'])

/**
 * 会自己变化的文件名。
 * @type {Set<string>}
 */
const VOLATILE_FILE_NAMES = new Set(['thumbs.db', 'desktop.ini', '.ds_store'])

/**
 * 会自己变化的扩展名。
 * @type {Set<string>}
 */
const VOLATILE_FILE_EXT = new Set(['.log', '.tmp', '.temp', '.sav', '.save'])

/**
 * 递归层数上限，避免特别深的目录把检测拖死。
 * @type {number}
 */
const MAX_DEPTH = 8

/**
 * 参与指纹的文件数上限。超过就放弃，免得两份截断结果碰巧一样。
 * @type {number}
 */
const MAX_FILES = 6000

/**
 * 只凭页数认漫画时的最少张数。太少的话，很多不同漫画都会撞车。
 * @type {number}
 */
const MIN_PAGE_COUNT_ONLY = 8

/**
 * 漫画压缩包扩展名。其它压缩格式没有现成的列目录方法，退回按文件大小认。
 * @type {string[]}
 */
const ARCHIVE_EXT = ['.zip', '.cbz']

/**
 * 本次进程内的指纹缓存。同一次检测里，兄弟目录会被反复计算。
 * @type {Map<string, string|null>}
 */
const fingerprintCache = new Map()

/**
 * 路径比较用的统一写法。Windows 上大小写和斜杠不应影响判断。
 * @param {string} filePath 原始路径
 * @returns {string} 规范化后的路径
 */
function normalizePathKey(filePath) {
  return path.normalize(String(filePath || '')).replace(/[\\/]+$/, '').toLowerCase()
}

/**
 * 判断两个路径是不是同一个位置。
 * @param {string} left 路径一
 * @param {string} right 路径二
 * @returns {boolean} 是否相同
 */
function isSamePath(left, right) {
  return normalizePathKey(left) === normalizePathKey(right)
}

/**
 * 这个文件名会不会自己变（存档、日志、系统垃圾文件）。
 * @param {string} fileName 文件名
 * @returns {boolean} 为 true 时不参与指纹
 */
function isVolatileFile(fileName) {
  const lower = String(fileName || '').toLowerCase()
  if (VOLATILE_FILE_NAMES.has(lower)) return true
  return VOLATILE_FILE_EXT.has(path.extname(lower))
}

/**
 * 把相对路径列表做成稳定哈希。排序后再哈希，避免目录读取顺序影响结果。
 * @param {string[]} names 相对路径列表
 * @returns {string} sha1
 */
function hashNames(names) {
  const sorted = names.slice().sort()
  return crypto.createHash('sha1').update(sorted.join('\n')).digest('hex')
}

/**
 * 解析已保存的指纹字符串。
 * @param {string} fingerprint 形如 v1|names|数量|哈希|启动文件名
 * @returns {{ kind: string, count?: number, hash?: string, anchor?: string, size?: number, ext?: string, partial?: boolean }|null} 解析结果
 */
function parseFingerprint(fingerprint) {
  const parts = String(fingerprint || '').split('|')
  if (parts[0] !== 'v1') return null
  if (parts[1] === 'names') {
    const partial = parts[4] === 'partial'
    return {
      kind: 'names',
      count: Number(parts[2]),
      hash: parts[3] || '',
      partial,
      anchor: partial ? (parts[5] || '') : (parts[4] || '')
    }
  }
  if (parts[1] === 'pages') {
    return { kind: 'pages', count: Number(parts[2]), hash: parts[3] || '' }
  }
  if (parts[1] === 'size') {
    return { kind: 'size', size: Number(parts[2]), ext: parts[3] || '' }
  }
  return null
}

/**
 * 两条指纹是不是同一个资源。启动文件名不参与比较，因为改名的常常就是它。
 * @param {string} left 指纹一
 * @param {string} right 指纹二
 * @returns {boolean} 是否同一身份
 */
function isSameFingerprint(left, right) {
  const a = parseFingerprint(left)
  const b = parseFingerprint(right)
  if (!a || !b || a.kind !== b.kind || a.partial || b.partial) return false
  if (a.kind === 'names') {
    return a.count >= 1 && a.count === b.count && a.hash === b.hash
  }
  if (a.kind === 'pages') {
    return a.count >= 1 && a.count === b.count && !!a.hash && a.hash === b.hash
  }
  if (a.kind === 'size') {
    return a.size > 0 && a.size === b.size && a.ext === b.ext
  }
  return false
}

/**
 * 收集目录里用来认身份的相对路径。
 * 用相对路径而不是只记文件名，避免不同子目录里的同名文件被当成同一份清单。
 * 顶层启动文件排除在外，这样只改 exe 名字时，其余文件名仍然对得上。
 * @param {string} dirPath 要扫描的目录
 * @param {string[]} names 收集结果
 * @param {number} depth 当前深度
 * @param {boolean} isRoot 是否项目根目录
 * @param {string} relativeDir 相对项目根目录的路径
 * @returns {boolean} 是否因为文件太多而中断
 */
function collectIdentityNames(dirPath, names, depth, isRoot, relativeDir) {
  if (depth > MAX_DEPTH || names.length >= MAX_FILES) return names.length >= MAX_FILES
  let entries = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (error) {
    return false
  }
  for (const entry of entries) {
    if (names.length >= MAX_FILES) return true
    if (entry.isSymbolicLink()) continue
    const entryName = entry.name
    const childRelative = relativeDir ? `${relativeDir}/${entryName}` : entryName
    if (entry.isDirectory()) {
      if (VOLATILE_DIRS.has(entryName.toLowerCase()) || entryName.startsWith('.')) continue
      const childPartial = collectIdentityNames(path.join(dirPath, entryName), names, depth + 1, false, childRelative)
      if (childPartial) return true
      continue
    }
    if (!entry.isFile()) continue
    if (isRoot && EXEC_EXT.has(path.extname(entryName).toLowerCase())) continue
    if (isVolatileFile(entryName)) continue
    names.push(childRelative.toLowerCase())
  }
  return names.length >= MAX_FILES
}

/**
 * 为项目目录生成文件名指纹。
 * @param {string} dirPath 项目目录
 * @param {string} anchor 原来的启动文件名，只用于找回路径，不参与比较
 * @returns {string|null} 指纹；文件太少或太多时返回 null
 */
function fingerprintDirectoryNames(dirPath, anchor) {
  const cacheKey = `names|${normalizePathKey(dirPath)}|${anchor || ''}`
  if (fingerprintCache.has(cacheKey)) return fingerprintCache.get(cacheKey)
  const names = []
  const partial = collectIdentityNames(dirPath, names, 0, true, '')
  let fingerprint = null
  if (!partial && names.length >= 1) {
    fingerprint = `v1|names|${names.length}|${hashNames(names)}|${anchor || ''}`
  }
  fingerprintCache.set(cacheKey, fingerprint)
  return fingerprint
}

/**
 * 递归收集漫画图片的相对路径。用相对路径而不是只数张数，避免不同漫画页数碰巧一样。
 * @param {string} dirPath 当前目录
 * @param {string} relativeDir 相对漫画根目录的路径
 * @param {string[]} names 收集结果
 * @param {number} depth 当前深度
 * @returns {void}
 */
function collectImageNames(dirPath, relativeDir, names, depth) {
  if (depth > MAX_DEPTH || names.length >= MAX_FILES) return
  let entries = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (error) {
    return
  }
  for (const entry of entries) {
    if (names.length >= MAX_FILES) return
    if (entry.isSymbolicLink()) continue
    const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || VOLATILE_DIRS.has(entry.name.toLowerCase())) continue
      collectImageNames(path.join(dirPath, entry.name), childRelative, names, depth + 1)
      continue
    }
    if (!entry.isFile()) continue
    if (!IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) continue
    names.push(childRelative.toLowerCase())
  }
}

/**
 * 列出 zip/cbz 里的图片相对路径。
 * @param {string} archivePath 压缩包路径
 * @returns {string[]} 图片条目名
 */
function listArchiveImageNames(archivePath) {
  const zip = new AdmZip(archivePath)
  return zip.getEntries()
    .filter((entry) => !entry.isDirectory && IMAGE_EXT.has(path.extname(entry.entryName).toLowerCase()))
    .map((entry) => entry.entryName.replace(/\\/g, '/').toLowerCase())
}

/**
 * 生成单个文件的大小指纹。改名不会改变大小和扩展名。
 * @param {string} filePath 文件路径
 * @returns {string|null} 指纹
 */
function fingerprintFileSize(filePath) {
  const stats = fs.statSync(filePath)
  if (!stats.isFile() || stats.size <= 0) return null
  const ext = path.extname(filePath).toLowerCase()
  return `v1|size|${stats.size}|${ext}`
}

/**
 * 生成漫画指纹。文件夹和 zip/cbz 用页数加图片名；pdf 等无法列页的格式退回文件大小。
 * @param {string} filePath 漫画路径
 * @returns {string|null} 指纹
 */
function fingerprintPages(filePath) {
  const cacheKey = `pages|${normalizePathKey(filePath)}`
  if (fingerprintCache.has(cacheKey)) return fingerprintCache.get(cacheKey)
  const stats = fs.statSync(filePath)
  let names = []
  if (stats.isDirectory()) {
    collectImageNames(filePath, '', names, 0)
  } else if (ARCHIVE_EXT.includes(path.extname(filePath).toLowerCase())) {
    try {
      names = listArchiveImageNames(filePath)
    } catch (error) {
      names = []
    }
  }
  let fingerprint = null
  if (names.length >= 1 && names.length < MAX_FILES) {
    fingerprint = `v1|pages|${names.length}|${hashNames(names)}`
  } else if (stats.isFile()) {
    fingerprint = fingerprintFileSize(filePath)
  }
  fingerprintCache.set(cacheKey, fingerprint)
  return fingerprint
}

/**
 * 计算一条资源当前路径的指纹。
 * @param {string} filePath 资源路径，可以是文件或文件夹
 * @param {'names'|'pages'|'size'} kind 由资源类型决定的算法
 * @returns {{ success: boolean, fingerprint?: string, error?: string }} 计算结果
 */
function computeResourceFingerprint(filePath, kind) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: '路径不存在' }
    }
    const stats = fs.statSync(filePath)
    let fingerprint = null
    if (kind === 'pages') {
      fingerprint = fingerprintPages(filePath)
    } else if (kind === 'names' || (kind === 'size' && stats.isDirectory())) {
      // 文件夹类资源即使用了 size，也改走文件名。单个文件才用大小。
      const root = stats.isDirectory() ? filePath : path.dirname(filePath)
      const anchor = stats.isDirectory() ? '' : path.basename(filePath)
      fingerprint = fingerprintDirectoryNames(root, anchor)
      if (!fingerprint && stats.isFile()) {
        fingerprint = fingerprintFileSize(filePath)
      }
    } else {
      fingerprint = fingerprintFileSize(filePath)
    }
    if (!fingerprint) {
      return { success: false, error: '没有足够的内容可以生成指纹' }
    }
    return { success: true, fingerprint }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 在目录顶层找启动文件。优先用原来的文件名；原来的名字没了，就在剩下的启动文件里挑唯一一个像样的。
 * @param {string} dirPath 项目目录
 * @param {string} anchor 原来的启动文件名
 * @returns {string|null} 新的启动文件路径
 */
function resolveExecutable(dirPath, anchor) {
  if (anchor) {
    const anchored = path.join(dirPath, anchor)
    if (fs.existsSync(anchored)) return anchored
  }
  let entries = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (error) {
    return null
  }
  const executables = entries
    .filter((entry) => entry.isFile() && EXEC_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(dirPath, entry.name))
    .filter((fullPath) => !/uninstall|crashhandler|unitycrash|vc_redist|setup|notification_helper/i.test(path.basename(fullPath)))
  if (executables.length === 1) return executables[0]
  return null
}

/**
 * 列出父目录下的子项。
 * @param {string} parentDir 父目录
 * @param {'dir'|'file'} entryKind 要文件还是文件夹
 * @returns {string[]} 子路径
 */
function listChildren(parentDir, entryKind) {
  if (!parentDir || !fs.existsSync(parentDir)) return []
  try {
    return fs.readdirSync(parentDir, { withFileTypes: true })
      .filter((entry) => !entry.isSymbolicLink() && (entryKind === 'dir' ? entry.isDirectory() : entry.isFile()))
      .map((entry) => path.join(parentDir, entry.name))
  } catch (error) {
    return []
  }
}

/**
 * 在旧路径的父目录里找指纹相同的新位置。
 * 只搜上一级，不扫整块磁盘。搬到别的盘符后，要等用户再次拖入，由界面用同一套指纹合并。
 * @param {string} oldPath 原来的资源路径
 * @param {string} fingerprint 之前记下的指纹
 * @param {boolean} allowPageCountOnly 页数在本页丢失记录里是否唯一。唯一且页数够多时，允许只凭张数认漫画
 * @returns {{ success: boolean, newPath: string|null, ambiguous?: boolean, error?: string }} 新路径
 */
function findRelocatedResource(oldPath, fingerprint, allowPageCountOnly) {
  try {
    const parsed = parseFingerprint(fingerprint)
    if (!parsed || parsed.partial || !oldPath) {
      return { success: true, newPath: null }
    }

    if (parsed.kind === 'names' && parsed.anchor) {
      const root = path.dirname(oldPath)
      if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
        const current = fingerprintDirectoryNames(root, parsed.anchor)
        if (current && isSameFingerprint(current, fingerprint)) {
          const resolved = resolveExecutable(root, parsed.anchor)
          if (resolved && !isSamePath(resolved, oldPath)) {
            return { success: true, newPath: resolved }
          }
        }
        return { success: true, newPath: null }
      }
      const matches = []
      for (const dirPath of listChildren(path.dirname(root), 'dir')) {
        const current = fingerprintDirectoryNames(dirPath, parsed.anchor)
        if (!current || !isSameFingerprint(current, fingerprint)) continue
        const resolved = resolveExecutable(dirPath, parsed.anchor)
        if (resolved) matches.push(resolved)
      }
      if (matches.length === 1) return { success: true, newPath: matches[0] }
      return { success: true, newPath: null, ambiguous: matches.length > 1 }
    }

    if (parsed.kind === 'names') {
      const matches = []
      for (const dirPath of listChildren(path.dirname(oldPath), 'dir')) {
        if (isSamePath(dirPath, oldPath)) continue
        const current = fingerprintDirectoryNames(dirPath, '')
        if (current && isSameFingerprint(current, fingerprint)) matches.push(dirPath)
      }
      if (matches.length === 1) return { success: true, newPath: matches[0] }
      return { success: true, newPath: null, ambiguous: matches.length > 1 }
    }

    if (parsed.kind === 'pages') {
      const isArchive = ARCHIVE_EXT.includes(path.extname(oldPath).toLowerCase())
      const children = isArchive
        ? listChildren(path.dirname(oldPath), 'file').filter((filePath) => ARCHIVE_EXT.includes(path.extname(filePath).toLowerCase()))
        : listChildren(path.dirname(oldPath), 'dir')
      const countMatches = []
      const hashMatches = []
      for (const candidate of children) {
        if (isSamePath(candidate, oldPath)) continue
        const current = fingerprintPages(candidate)
        const currentParsed = parseFingerprint(current)
        if (!currentParsed || currentParsed.kind !== 'pages' || currentParsed.count !== parsed.count) continue
        countMatches.push(candidate)
        if (currentParsed.hash && currentParsed.hash === parsed.hash) hashMatches.push(candidate)
      }
      if (hashMatches.length === 1) return { success: true, newPath: hashMatches[0] }
      if (hashMatches.length > 1) return { success: true, newPath: null, ambiguous: true }
      if (allowPageCountOnly && parsed.count >= MIN_PAGE_COUNT_ONLY && countMatches.length === 1) {
        return { success: true, newPath: countMatches[0] }
      }
      return { success: true, newPath: null, ambiguous: countMatches.length > 1 }
    }

    if (parsed.kind === 'size') {
      const matches = []
      for (const filePath of listChildren(path.dirname(oldPath), 'file')) {
        if (isSamePath(filePath, oldPath)) continue
        if (path.extname(filePath).toLowerCase() !== parsed.ext) continue
        let stats = null
        try {
          stats = fs.statSync(filePath)
        } catch (error) {
          continue
        }
        if (stats.isFile() && stats.size === parsed.size) matches.push(filePath)
      }
      if (matches.length === 1) return { success: true, newPath: matches[0] }
      return { success: true, newPath: null, ambiguous: matches.length > 1 }
    }

    return { success: true, newPath: null }
  } catch (error) {
    return { success: false, newPath: null, error: error.message }
  }
}

module.exports = {
  computeResourceFingerprint,
  findRelocatedResource,
  isSameFingerprint,
  parseFingerprint
}
