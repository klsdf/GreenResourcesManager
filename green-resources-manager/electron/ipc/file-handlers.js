/**
 * @module FileHandlers
 * @description 管理应用程序的文件操作相关的 IPC 处理器。
 *
 * 主要功能:
 * 1. 提供 JSON 文件的读写操作（通过 fileUtils）。
 * 2. 提供普通文件的读写、删除操作（通过 fileUtils）。
 * 3. 提供目录操作（创建、列表、统计等）。
 * 4. 提供文件统计信息获取。
 * 5. 提供文件夹大小计算。
 * 6. 提供图片文件列表功能。
 * 7. 提供备份存档目录功能。
 * 8. 注册与文件操作相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, fileUtils, pathUtils)`: 注册 IPC 处理器。
 *
 * IPC 处理器:
 * - `write-json-file`: 写入 JSON 文件。
 * - `read-json-file`: 读取 JSON 文件。
 * - `delete-file`: 删除文件。
 * - `ensure-directory`: 确保目录存在。
 * - `write-file`: 写入普通文件。
 * - `save-thumbnail`: 保存缩略图。
 * - `list-files`: 列出目录文件。
 * - `get-file-stats`: 获取文件统计信息。
 * - `read-text-file`: 读取文本文件。
 * - `count-novel-words`: 统计小说字数。
 * - `open-file-folder`: 打开文件所在文件夹。
 * - `check-file-exists`: 检查文件是否存在。
 * - `get-folder-size`: 获取文件夹大小。
 * - `list-image-files`: 列出图片文件。
 * - `backup-save-data-directory`: 备份存档目录。
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { app, shell } = require('electron')
const AdmZip = require('adm-zip')
const { SUPPORTED_IMAGE_FORMATS, MAX_BACKUP_FILES } = require('../utils/constants')

/**
 * 读取压缩包里某一张图的大小。
 * 漫画阅读器把包内图片写成 archive:// 地址，普通的文件统计读不到这个地址。
 * @param {string} archiveUrl archive:// 开头的图片地址
 * @returns {{ success: boolean, size?: number, isFile?: boolean, error?: string }}
 */
function getArchiveEntryStats(archiveUrl) {
  try {
    const url = new URL(archiveUrl)
    let archivePath = decodeURIComponent(url.pathname || '')
    if (process.platform === 'win32' && archivePath.startsWith('/') && archivePath.length > 2 && archivePath[2] === ':') {
      archivePath = archivePath.slice(1)
    }
    const entryName = url.hash ? decodeURIComponent(url.hash.slice(1)) : ''
    if (!archivePath || !entryName) {
      return { success: false, error: '压缩包图片地址不完整' }
    }
    if (!fs.existsSync(archivePath)) {
      return { success: false, error: '压缩包不存在' }
    }
    const zip = new AdmZip(archivePath)
    const entry = zip.getEntry(entryName)
    if (!entry) {
      return { success: false, error: '压缩包里没有这张图' }
    }
    return {
      success: true,
      size: entry.header.size,
      isFile: true,
      isDirectory: false
    }
  } catch (error) {
    console.error('读取压缩包内图片大小失败:', error)
    return { success: false, error: error.message }
  }
}
const { normalizePath } = require('../utils/path-utils')
const { resolveSaveDataDirectory } = require('../utils/save-location')
const { computeResourceFingerprint, findRelocatedResource } = require('../utils/resource-fingerprint')

/** CBZ/ZIP 漫画包扩展名 */
const CBZ_ARCHIVE_EXT = ['.cbz', '.zip']

/**
 * 注册与文件操作相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} fileUtils - file-utils 模块。
 * @param {Object} pathUtils - path-utils 模块（可选，用于某些路径操作）。
 */
function registerIpcHandlers(ipcMain, fileUtils, pathUtils) {
  // JSON 文件操作
  ipcMain.handle('write-json-file', async (event, filePath, data) => {
    return await fileUtils.writeJsonFile(filePath, data)
  })

  ipcMain.handle('read-json-file', async (event, filePath) => {
    return await fileUtils.readJsonFile(filePath)
  })

  ipcMain.handle('delete-file', async (event, filePath) => {
    return await fileUtils.deleteFile(filePath)
  })

  ipcMain.handle('delete-directory', async (event, dirPath) => {
    return await fileUtils.deleteDirectory(dirPath)
  })

  ipcMain.handle('ensure-directory', async (event, dirPath) => {
    return await fileUtils.ensureDirectory(dirPath)
  })

  // 普通文件操作
  ipcMain.handle('write-file', async (event, filePath, buffer) => {
    return await fileUtils.writeFile(filePath, buffer)
  })

  ipcMain.handle('save-thumbnail', async (event, filePath, dataUrl) => {
    return await fileUtils.saveThumbnail(filePath, dataUrl)
  })

  ipcMain.handle('list-files', async (event, dirPath) => {
    return await fileUtils.listFiles(dirPath)
  })

  ipcMain.handle('search-matching-files', async (event, rootDir, extensions) => {
    return await fileUtils.searchMatchingFiles(rootDir, extensions)
  })

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    if (typeof filePath === 'string' && filePath.startsWith('archive://')) {
      return getArchiveEntryStats(filePath)
    }
    return await fileUtils.getFileStats(filePath)
  })

  ipcMain.handle('read-text-file', async (event, filePath) => {
    return await fileUtils.readTextFile(filePath)
  })

  ipcMain.handle('count-novel-words', async (event, filePath) => {
    return await fileUtils.countNovelWords(filePath)
  })

  // 打开文件所在文件夹
  ipcMain.handle('open-file-folder', async (event, filePath) => {
    try {
      if (!filePath) {
        return { success: false, error: '文件路径不能为空' }
      }

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' }
      }

      // 获取文件所在目录
      const dirPath = path.dirname(filePath)

      // 使用 shell 打开文件夹并选中文件
      await shell.showItemInFolder(filePath)

      console.log('已打开文件夹:', dirPath)
      return { success: true, folderPath: dirPath }
    } catch (error) {
      console.error('打开文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检查文件是否存在
  ipcMain.handle('check-file-exists', async (event, filePath) => {
    try {
      if (!filePath || filePath.trim() === '') {
        return { success: false, error: '无效的文件路径' }
      }

      // 规范化路径
      const normalizedPath = pathUtils ? pathUtils.normalizePath(filePath) : filePath

      // 检查文件是否存在
      const exists = fs.existsSync(normalizedPath)

      return { success: true, exists: exists }
    } catch (error) {
      console.error('检查文件存在性失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取文件夹大小
  ipcMain.handle('get-folder-size', async (event, filePath) => {
    try {
      if (!filePath || filePath.trim() === '') {
        return { success: false, error: '无效的文件路径' }
      }

      const absolutePath = pathUtils ? pathUtils.normalizePath(filePath) : path.resolve(filePath)

      if (!fs.existsSync(absolutePath)) {
        return { success: false, error: `文件/文件夹不存在: ${absolutePath}` }
      }

      const stats = fs.statSync(absolutePath)
      let targetFolderPath = absolutePath

      if (stats.isFile()) {
        targetFolderPath = path.dirname(absolutePath)
      }

      let totalSize = 0
      const calculateSize = (itemPath) => {
        const itemStats = fs.statSync(itemPath)
        if (itemStats.isDirectory()) {
          fs.readdirSync(itemPath).forEach(child => {
            calculateSize(path.join(itemPath, child))
          })
        } else {
          totalSize += itemStats.size
        }
      }

      calculateSize(targetFolderPath)
      return { success: true, size: totalSize }
    } catch (error) {
      console.error('获取文件夹大小失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 列出指定文件夹下的图片文件
  ipcMain.handle('list-image-files', async (event, folderPath) => {
    try {
      if (!folderPath) {
        return { success: false, error: '未提供文件夹路径' }
      }

      // 将格式数组转换为扩展名集合（添加点号）
      const supportedExt = new Set(SUPPORTED_IMAGE_FORMATS.map(fmt => `.${fmt.toLowerCase()}`))
      const entries = fs.readdirSync(folderPath, { withFileTypes: true })
      const files = entries
        .filter(e => e.isFile())
        .map(e => path.join(folderPath, e.name))
        .filter(full => supportedExt.has(path.extname(full).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

      return { success: true, files }
    } catch (error) {
      console.error('列出图片文件失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 列出 CBZ/ZIP 漫画包内的图片条目（返回条目名称，用于 archive:// URL）
  ipcMain.handle('list-image-files-in-archive', async (event, archivePath) => {
    try {
      if (!archivePath || typeof archivePath !== 'string') {
        return { success: false, error: '未提供压缩包路径' }
      }
      const ext = path.extname(archivePath).toLowerCase()
      if (!CBZ_ARCHIVE_EXT.includes(ext)) {
        return { success: false, error: '仅支持 .cbz 或 .zip 格式' }
      }
      if (!fs.existsSync(archivePath)) {
        return { success: false, error: '压缩包不存在' }
      }
      const supportedExt = new Set(SUPPORTED_IMAGE_FORMATS.map(fmt => `.${fmt.toLowerCase()}`))
      const zip = new AdmZip(archivePath)
      const entries = zip.getEntries()
      const files = entries
        .filter(e => !e.isDirectory)
        .map(e => e.entryName)
        .filter(name => supportedExt.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      return { success: true, files }
    } catch (error) {
      console.error('列出压缩包内图片失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 保存封面到文件夹
  ipcMain.handle('save-cover-to-folder', async (event, sourceImagePath, saveDataDir, resourceType, resourceId) => {
    return await fileUtils.saveCoverToFolder(sourceImagePath, saveDataDir, resourceType, resourceId)
  })

  // 从 DataURL 保存封面到文件夹
  ipcMain.handle('save-cover-from-dataurl', async (event, dataUrl, saveDataDir, resourceType, resourceId) => {
    return await fileUtils.saveCoverFromDataUrl(dataUrl, saveDataDir, resourceType, resourceId)
  })

  // 获取封面的完整路径（用于显示）
  ipcMain.handle('get-cover-full-path', async (event, coverPath, saveDataDir) => {
    try {
      if (!coverPath) {
        return { success: false, error: '封面路径为空' }
      }
      
      // 如果是绝对路径，直接返回
      if (path.isAbsolute(coverPath) || coverPath.startsWith('file://') || coverPath.startsWith('archive://') || coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
        return { success: true, fullPath: coverPath }
      }
      
      // 如果是相对路径，拼接到 SaveData 目录
      const fullPath = path.join(saveDataDir, coverPath)
      return { success: true, fullPath: fullPath }
    } catch (error) {
      console.error('获取封面完整路径失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 返回当前存档对应的备份目录，没有就先建出来，方便设置页直接打开。
  ipcMain.handle('get-save-backup-directory', () => {
    const backupRoot = getSaveBackupRoot(resolveSaveDataDirectory())
    fs.mkdirSync(backupRoot, { recursive: true })
    return backupRoot
  })

  // 备份整个存档目录。备份不放在存档旁边，避免存档目录损坏时备份一起丢失。
  ipcMain.handle('backup-save-data-directory', async (event, saveDataDir, maxBackups = MAX_BACKUP_FILES) => {
    try {
      console.log('=== 开始备份整个存档目录 ===')
      console.log('存档目录:', saveDataDir)

      if (!fs.existsSync(saveDataDir)) {
        return { success: false, error: '存档目录不存在' }
      }

      const saveDataName = path.basename(saveDataDir)
      /** 系统用户目录下的备份根。Windows 上一般在 C 盘的 AppData。 */
      const backupRoot = getSaveBackupRoot(saveDataDir)
      fs.mkdirSync(backupRoot, { recursive: true })

      // 查找下一个可用的备份编号
      let backupNumber = 1
      const items = fs.readdirSync(backupRoot)
      const backupPattern = new RegExp(`^${escapeRegExp(saveDataName)}_(\\d+)$`)
      let maxNumber = 0
      for (const item of items) {
        const match = item.match(backupPattern)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
      backupNumber = maxNumber + 1
      const backupPath = path.join(backupRoot, `${saveDataName}_${backupNumber}`)
      console.log('备份路径:', backupPath)

      let copiedFiles = 0
      let copiedFolders = 0

      const copyRecursive = (src, dest) => {
        const stats = fs.statSync(src)
        if (stats.isDirectory()) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true })
            copiedFolders++
          }
          fs.readdirSync(src).forEach(item => {
            copyRecursive(path.join(src, item), path.join(dest, item))
          })
        } else {
          fs.copyFileSync(src, dest)
          copiedFiles++
        }
      }

      copyRecursive(saveDataDir, backupPath)
      console.log('✅ 备份完成:', backupPath)
      console.log('  - 复制文件数:', copiedFiles)
      console.log('  - 复制文件夹数:', copiedFolders)

      // 清理旧备份。只清理系统目录里这一份存档的备份，不动存档旁边以前留下的副本。
      const backupItems = fs.readdirSync(backupRoot)
      const backups = backupItems
        .filter(item => item.match(backupPattern))
        .map(item => ({
          name: item,
          path: path.join(backupRoot, item),
          number: parseInt(item.match(backupPattern)[1]),
          mtime: fs.statSync(path.join(backupRoot, item)).mtime.getTime()
        }))
        .sort((a, b) => b.number - a.number)

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups)
        for (const backup of toDelete) {
          try {
            fs.rmSync(backup.path, { recursive: true, force: true })
            console.log('🗑️ 已删除旧备份:', backup.name)
          } catch (deleteError) {
            console.warn('删除旧备份失败:', backup.name, deleteError.message)
          }
        }
        console.log(`✅ 已清理 ${toDelete.length} 个旧备份，保留最近的 ${maxBackups} 个备份`)
      }

      return {
        success: true,
        backupPath: backupPath,
        backupNumber: backupNumber,
        copiedFiles: copiedFiles,
        copiedFolders: copiedFolders
      }
    } catch (error) {
      console.error('备份存档目录失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 计算资源指纹。kind 由界面按资源类型传入：names / pages / size。
  ipcMain.handle('compute-resource-fingerprint', async (event, filePath, kind) => {
    return computeResourceFingerprint(filePath, kind)
  })

  // 在原路径的父目录里找改名或同级移动后的新路径。
  ipcMain.handle('find-relocated-resource', async (event, oldPath, fingerprint, allowPageCountOnly) => {
    return findRelocatedResource(oldPath, fingerprint, !!allowPageCountOnly)
  })
}

/**
 * 转义正则特殊字符，避免存档文件夹名字里的符号被当成表达式。
 * @param {string} value 原始文件夹名
 * @returns {string}
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 自动备份的存放目录。
 * 放在 Electron 用户数据目录，而不是存档的上一级。
 * Windows 上这个目录在用户配置里，一般位于 C 盘。存档文件夹或它所在的磁盘坏了，备份还在。
 * 不同存档路径用路径摘要分开，避免两个都叫 SaveData 的目录互相覆盖。
 * @param {string} saveDataDir 当前存档目录
 * @returns {string}
 */
function getSaveBackupRoot(saveDataDir) {
  const resolved = path.resolve(saveDataDir)
  const digest = crypto.createHash('sha1').update(resolved).digest('hex').slice(0, 8)
  const baseName = path.basename(resolved).replace(/[<>:"/\\|?*]/g, '_') || 'SaveData'
  return path.join(app.getPath('userData'), 'SaveBackups', `${baseName}_${digest}`)
}

module.exports = {
  registerIpcHandlers
}

