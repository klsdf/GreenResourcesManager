/**
 * @module ResourceMarker
 * @description 在资源旁边写入隐藏的标记文件，记住这条资源在软件里的 ID。
 *
 * 文件夹资源在根目录下写 `.grm-resource.json`；
 * 单个文件（含压缩包、exe）在旁边写 `.grm-<文件名>.json`。
 * 移动或改名时标记会跟着资源走，再拖进来就能按 ID 找回原记录。
 * 压缩包内部不会被修改。
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')

const MARKER_APP = 'GreenResourcesManager'
const MARKER_VERSION = 1
const FOLDER_MARKER_NAME = '.grm-resource.json'
const SIDECAR_PREFIX = '.grm-'
const SIDECAR_SUFFIX = '.json'
const MAX_BASE_LENGTH = 80

/**
 * 标记文件名是不是本软件写的。
 * @param {string} fileName 文件名
 * @returns {boolean}
 */
function isMarkerFileName(fileName) {
  const name = String(fileName || '')
  return name.startsWith(SIDECAR_PREFIX) && name.toLowerCase().endsWith(SIDECAR_SUFFIX)
}

/**
 * 去掉文件名里的非法字符。太长时截断并补摘要，避免超过 Windows 路径限制。
 * @param {string} baseName 原文件名
 * @returns {string}
 */
function sanitizeMarkerBaseName(baseName) {
  const safe = String(baseName || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .trim()
  if (!safe) return 'resource'
  if (safe.length <= MAX_BASE_LENGTH) return safe
  const digest = crypto.createHash('sha1').update(safe).digest('hex').slice(0, 8)
  return `${safe.slice(0, MAX_BASE_LENGTH)}_${digest}`
}

/**
 * 文件夹资源的标记路径。
 * @param {string} folderPath 文件夹路径
 * @returns {string}
 */
function getFolderMarkerPath(folderPath) {
  return path.join(folderPath, FOLDER_MARKER_NAME)
}

/**
 * 文件资源的侧车标记路径。
 * @param {string} filePath 文件路径
 * @returns {string}
 */
function getFileMarkerPath(filePath) {
  return path.join(
    path.dirname(filePath),
    `${SIDECAR_PREFIX}${sanitizeMarkerBaseName(path.basename(filePath))}${SIDECAR_SUFFIX}`
  )
}

/**
 * 把标记文件设成隐藏。Windows 上点号开头还不够，资源管理器仍然会显示。
 * @param {string} markerPath 标记文件路径
 */
function hideMarkerFile(markerPath) {
  if (process.platform !== 'win32') return
  execFile('attrib', ['+h', markerPath], { windowsHide: true }, (error) => {
    if (error) console.warn('隐藏资源标记文件失败:', markerPath, error.message)
  })
}

/**
 * 读取并解析标记文件。坏文件、别的软件写的文件都当成没有。
 * @param {string} markerPath 标记文件路径
 * @returns {Object|null}
 */
function readMarkerFile(markerPath) {
  try {
    const raw = fs.readFileSync(markerPath, 'utf8')
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    if (data.app !== MARKER_APP) return null
    if (!data.resourceId) return null
    return data
  } catch {
    return null
  }
}

/**
 * 列出目录里所有本软件的标记。
 * @param {string} dirPath 目录
 * @returns {Object[]}
 */
function readMarkersInDirectory(dirPath) {
  const markers = []
  let entries = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return markers
  }
  for (const entry of entries) {
    if (!entry.isFile() || !isMarkerFileName(entry.name)) continue
    const markerPath = path.join(dirPath, entry.name)
    const marker = readMarkerFile(markerPath)
    if (marker) markers.push({ ...marker, markerPath })
  }
  return markers
}

/**
 * 读取一个资源旁边的标记。
 * 文件夹只看自己的根标记；单个文件看同目录的所有侧车标记。
 * @param {string} targetPath 资源路径
 * @returns {{ success: boolean, markers?: Object[], error?: string }}
 */
function listMarkersNearPath(targetPath) {
  try {
    if (!targetPath || typeof targetPath !== 'string' || targetPath.includes('://')) {
      return { success: false, error: '无效的资源路径' }
    }
    const target = path.resolve(targetPath)
    const stats = fs.statSync(target)
    if (stats.isDirectory()) {
      const marker = readMarkerFile(getFolderMarkerPath(target))
      return { success: true, markers: marker ? [{ ...marker, markerPath: getFolderMarkerPath(target) }] : [] }
    }

    const baseName = path.basename(target)
    const markers = readMarkersInDirectory(path.dirname(target))
      .filter(marker => marker.targetType !== 'folder')
      .sort((left, right) => {
        const leftExact = left.targetFileName === baseName ? 1 : 0
        const rightExact = right.targetFileName === baseName ? 1 : 0
        return rightExact - leftExact
      })
    return { success: true, markers }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 删除同目录里同一个资源残留的旧标记。文件改名后侧车文件名不会自动跟着变。
 * @param {string} dirPath 目录
 * @param {string} keepPath 要保留的标记
 * @param {string} resourceId 资源 ID
 */
function removeStaleSiblingMarkers(dirPath, keepPath, resourceId) {
  let entries = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return
  }
  const keep = path.resolve(keepPath).toLowerCase()
  for (const entry of entries) {
    if (!entry.isFile() || !isMarkerFileName(entry.name)) continue
    const markerPath = path.join(dirPath, entry.name)
    if (markerPath.toLowerCase() === keep) continue
    const marker = readMarkerFile(markerPath)
    if (!marker || String(marker.resourceId) !== String(resourceId)) continue
    if (marker.targetType === 'folder') continue
    try {
      fs.unlinkSync(markerPath)
    } catch (error) {
      console.warn('删除旧资源标记失败:', markerPath, error.message)
    }
  }
}

/**
 * 旧资源已经不在原位置时，清掉它留下的标记。
 * 原位置还能打开就不动，那里可能是一份拷贝。
 * @param {string} oldPath 旧路径
 * @param {string} resourceId 资源 ID
 */
function removeMarkerAtOldPath(oldPath, resourceId) {
  if (!oldPath || fs.existsSync(oldPath)) return
  const candidates = [getFolderMarkerPath(oldPath), getFileMarkerPath(oldPath)]
  for (const markerPath of candidates) {
    const marker = readMarkerFile(markerPath)
    if (!marker || String(marker.resourceId) !== String(resourceId)) continue
    try {
      fs.unlinkSync(markerPath)
    } catch (error) {
      console.warn('删除旧位置标记失败:', markerPath, error.message)
    }
  }
}

/**
 * 写入（或刷新）一个资源的标记文件。
 * @param {Object} payload 资源信息
 * @param {string} payload.resourcePath 资源路径
 * @param {string} payload.resourceId 资源 ID
 * @param {string} [payload.resourceType] 资源类型
 * @param {string} [payload.resourceName] 资源名称
 * @param {string} [payload.previousPath] 移动前的路径，用于清理旧侧车
 * @param {boolean} [payload.onlyIfMissing] 已有标记时不覆盖
 * @param {boolean} [payload.skipHide] 测试用，不设置隐藏属性
 * @returns {{ success: boolean, markerPath?: string, skipped?: boolean, error?: string }}
 */
function writeResourceMarker(payload = {}) {
  const {
    resourcePath,
    resourceId,
    resourceType = '',
    resourceName = '',
    previousPath = '',
    onlyIfMissing = false,
    skipHide = false
  } = payload

  try {
    if (!resourcePath || typeof resourcePath !== 'string' || resourcePath.includes('://')) {
      return { success: false, error: '无效的资源路径' }
    }
    if (!resourceId) {
      return { success: false, error: '缺少资源 ID' }
    }

    const target = path.resolve(resourcePath)
    const stats = fs.statSync(target)
    const isDirectory = stats.isDirectory()
    const markerPath = isDirectory ? getFolderMarkerPath(target) : getFileMarkerPath(target)

    const existing = readMarkerFile(markerPath)
    // 已有标记且 ID 对得上才跳过。ID 对不上说明是旧存档留下的，要覆盖成现在的。
    if (onlyIfMissing && existing && String(existing.resourceId) === String(resourceId)) {
      return { success: true, markerPath, skipped: true }
    }
    const now = new Date().toISOString()
    const data = {
      app: MARKER_APP,
      markerVersion: MARKER_VERSION,
      resourceId: String(resourceId),
      resourceType: String(resourceType || ''),
      resourceName: String(resourceName || ''),
      targetType: isDirectory ? 'folder' : 'file',
      targetFileName: isDirectory ? '' : path.basename(target),
      resourcePath: target,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }

    fs.writeFileSync(markerPath, JSON.stringify(data, null, 2), 'utf8')
    if (!skipHide) hideMarkerFile(markerPath)

    if (!isDirectory) {
      removeStaleSiblingMarkers(path.dirname(target), markerPath, String(resourceId))
    }
    if (previousPath && path.resolve(previousPath).toLowerCase() !== target.toLowerCase()) {
      removeMarkerAtOldPath(previousPath, String(resourceId))
    }

    return { success: true, markerPath }
  } catch (error) {
    console.warn('写入资源标记失败:', resourcePath, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 在旧路径附近找同一个资源 ID 的标记，返回标记指向的新位置。
 * 只看旧路径的父目录和一层子目录，不扫描整个磁盘。
 * @param {string} resourceId 资源 ID
 * @param {string} oldPath 旧路径
 * @param {number} [maxDepth] 往下找的层数
 * @returns {{ success: boolean, newPath?: string|null, ambiguous?: boolean, error?: string }}
 */
function findMarkerLocation(resourceId, oldPath, maxDepth = 1) {
  try {
    if (!resourceId || !oldPath) {
      return { success: false, error: '缺少资源 ID 或旧路径' }
    }
    // 文件夹资源本身丢了时父目录还在；
    // 游戏这类以 exe 为路径的资源，如果整个游戏文件夹被改名，原来的文件夹已经不在了，
    // 这时退到上一层去找同级的文件夹。
    const immediateParent = path.dirname(path.resolve(oldPath))
    const parent = fs.existsSync(immediateParent) ? immediateParent : path.dirname(immediateParent)
    if (!fs.existsSync(parent)) {
      return { success: true, newPath: null, ambiguous: false }
    }

    const oldNormalized = path.resolve(oldPath).toLowerCase()
    const candidates = new Set()

    const addCandidate = (candidatePath) => {
      if (!candidatePath) return
      const resolved = path.resolve(candidatePath)
      if (resolved.toLowerCase() === oldNormalized) return
      if (!fs.existsSync(resolved)) return
      candidates.add(resolved)
    }

    const scanDirectory = (dirPath, depth) => {
      for (const marker of readMarkersInDirectory(dirPath)) {
        if (String(marker.resourceId) !== String(resourceId)) continue
        if (marker.targetType === 'folder') continue
        if (marker.targetFileName) addCandidate(path.join(dirPath, marker.targetFileName))
      }

      if (depth >= maxDepth) return
      let entries = []
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const childPath = path.join(dirPath, entry.name)
        const folderMarker = readMarkerFile(getFolderMarkerPath(childPath))
        if (folderMarker && String(folderMarker.resourceId) === String(resourceId)) {
          addCandidate(childPath)
        }
        scanDirectory(childPath, depth + 1)
      }
    }

    scanDirectory(parent, 0)
    const list = [...candidates]
    return {
      success: true,
      newPath: list.length === 1 ? list[0] : null,
      ambiguous: list.length > 1
    }
  } catch (error) {
    console.warn('按标记查找资源新位置失败:', oldPath, error.message)
    return { success: false, error: error.message }
  }
}

module.exports = {
  MARKER_APP,
  MARKER_VERSION,
  FOLDER_MARKER_NAME,
  SIDECAR_PREFIX,
  SIDECAR_SUFFIX,
  isMarkerFileName,
  sanitizeMarkerBaseName,
  getFolderMarkerPath,
  getFileMarkerPath,
  readMarkerFile,
  listMarkersNearPath,
  writeResourceMarker,
  findMarkerLocation
}
