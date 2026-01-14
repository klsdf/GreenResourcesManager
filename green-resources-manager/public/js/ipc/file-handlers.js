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
 * - `open-file-folder`: 打开文件所在文件夹。
 * - `check-file-exists`: 检查文件是否存在。
 * - `get-folder-size`: 获取文件夹大小。
 * - `list-image-files`: 列出图片文件。
 * - `backup-save-data-directory`: 备份存档目录。
 */

const fs = require('fs')
const path = require('path')
const { shell } = require('electron')
const { SUPPORTED_IMAGE_FORMATS, MAX_BACKUP_FILES } = require('../utils/constants')
const { normalizePath } = require('../utils/path-utils')

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

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    return await fileUtils.getFileStats(filePath)
  })

  ipcMain.handle('read-text-file', async (event, filePath) => {
    return await fileUtils.readTextFile(filePath)
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

  // Recursively scan a directory for files with given extensions
  ipcMain.handle('scan-directory-recursively', async (event, directoryPath, fileExtensions) => {
    try {
      if (!directoryPath || directoryPath.trim() === '') {
        return { success: false, error: 'Invalid directory path' };
      }

      const absolutePath = pathUtils ? pathUtils.normalizePath(directoryPath) : path.resolve(directoryPath);

      if (!fs.existsSync(absolutePath)) {
        return { success: false, error: `Directory does not exist: ${absolutePath}` };
      }

      const foundFiles = [];
      const lowerCaseExtensions = new Set(fileExtensions.map(ext => ext.toLowerCase()));

      const scan = (currentPath) => {
        const items = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          if (item.isDirectory()) {
            scan(itemPath);
          } else if (item.isFile()) {
            const extension = path.extname(item.name).toLowerCase();
            if (lowerCaseExtensions.has(extension)) {
              foundFiles.push(itemPath);
            }
          }
        }
      };

      scan(absolutePath);
      return { success: true, files: foundFiles };
    } catch (error) {
      console.error('Failed to recursively scan directory:', error);
      return { success: false, error: error.message };
    }
  });

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

  // 备份整个存档目录
  ipcMain.handle('backup-save-data-directory', async (event, saveDataDir, maxBackups = MAX_BACKUP_FILES) => {
    try {
      console.log('=== 开始备份整个存档目录 ===')
      console.log('存档目录:', saveDataDir)

      if (!fs.existsSync(saveDataDir)) {
        return { success: false, error: '存档目录不存在' }
      }

      const parentDir = path.dirname(saveDataDir)
      const saveDataName = path.basename(saveDataDir)

      // 查找下一个可用的备份编号
      let backupNumber = 1
      if (fs.existsSync(parentDir)) {
        const items = fs.readdirSync(parentDir)
        const backupPattern = new RegExp(`^${saveDataName}_(\\d+)$`)
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
      }
      const backupPath = path.join(parentDir, `${saveDataName}_${backupNumber}`)
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

      // 清理旧备份
      const items = fs.readdirSync(parentDir)
      const backupPattern = new RegExp(`^${saveDataName}_(\\d+)$`)
      const backups = items
        .filter(item => item.match(backupPattern))
        .map(item => ({
          name: item,
          path: path.join(parentDir, item),
          number: parseInt(item.match(backupPattern)[1]),
          mtime: fs.statSync(path.join(parentDir, item)).mtime.getTime()
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
}

module.exports = {
  registerIpcHandlers
}

