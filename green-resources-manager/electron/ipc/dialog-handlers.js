/**
 * @module DialogHandlers
 * @description 管理应用程序的文件和文件夹选择对话框相关的 IPC 处理器。
 *
 * 主要功能:
 * 1. 提供各种文件类型的选择对话框（可执行文件、图片、视频、音频、小说等）。
 * 2. 提供文件夹选择对话框。
 * 3. 支持设置默认路径，方便用户快速定位到指定目录。
 * 4. 注册与对话框相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, getMainWindow, dialog)`: 注册 IPC 处理器。
 *
 * IPC 处理器:
 * - `select-executable-file`: 选择可执行文件（exe、app、sh）。
 * - `select-image-file`: 选择图片文件（jpg、png、gif 等），支持设置默认路径。
 * - `select-screenshot-image`: 选择截图作为封面，支持设置截图目录为默认路径。
 * - `select-folder`: 选择文件夹。
 * - `select-video-file`: 选择视频文件（mp4、avi、mkv 等）。
 * - `select-audio-file`: 选择音频文件（mp3、wav、flac 等）。
 * - `select-novel-file`: 选择小说文件（txt、epub、mobi 等）。
 */

const fs = require('fs')
const path = require('path')

/**
 * 处理默认路径，将其转换为绝对路径并验证。
 * @param {string|null} defaultPath - 默认路径。
 * @returns {string|undefined} 处理后的绝对路径或 undefined。
 */
function processDefaultPath(defaultPath) {
  if (!defaultPath) {
    return undefined
  }

  try {
    // 确保路径格式正确（统一使用反斜杠，因为是 Windows）
    const normalizedPath = defaultPath.replace(/\//g, '\\')

    // 将相对路径转换为绝对路径
    let absolutePath = normalizedPath
    if (!path.isAbsolute(normalizedPath)) {
      // 如果是相对路径，基于应用目录
      absolutePath = path.join(process.cwd(), normalizedPath)
    }

    // 检查路径是否存在
    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath)
      if (stats.isDirectory()) {
        // 使用绝对路径作为 defaultPath
        return absolutePath
      } else {
        // 如果路径是文件，使用其父目录
        const parentDir = path.dirname(absolutePath)
        if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
          return parentDir
        }
      }
    } else {
      // 如果路径不存在，尝试使用父目录
      const parentDir = path.dirname(absolutePath)
      if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
        return parentDir
      }
    }
  } catch (error) {
    console.warn('处理默认路径时出错:', error)
  }

  return undefined
}

/**
 * 处理截图目录路径，支持自动创建目录。
 * @param {string|null} screenshotDir - 截图目录路径。
 * @returns {string|undefined} 处理后的绝对路径或 undefined。
 */
function processScreenshotDir(screenshotDir) {
  if (!screenshotDir) {
    return undefined
  }

  try {
    // 确保路径格式正确（统一使用反斜杠，因为是 Windows）
    const normalizedPath = screenshotDir.replace(/\//g, '\\')

    // 将相对路径转换为绝对路径
    let absolutePath = normalizedPath
    if (!path.isAbsolute(normalizedPath)) {
      absolutePath = path.join(process.cwd(), normalizedPath)
    }

    // 检查路径是否存在
    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath)
      if (stats.isDirectory()) {
        return absolutePath
      } else {
        // 如果路径是文件，使用其父目录
        const parentDir = path.dirname(absolutePath)
        if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
          return parentDir
        }
      }
    } else {
      // 如果路径不存在，尝试创建目录
      try {
        fs.mkdirSync(absolutePath, { recursive: true })
        return absolutePath
      } catch (mkdirError) {
        // 如果创建失败，尝试使用父目录
        const parentDir = path.dirname(absolutePath)
        if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
          return parentDir
        }
      }
    }
  } catch (error) {
    console.warn('处理截图目录路径时出错:', error)
  }

  return undefined
}

/**
 * 注册与对话框相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} dialog - Electron 的 dialog 对象。
 */
function registerIpcHandlers(ipcMain, getMainWindow, dialog) {
  // 选择可执行文件
  ipcMain.handle('select-executable-file', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择游戏文件',
        filters: [
          { name: '可执行文件', extensions: ['exe', 'app', 'sh'] },
          { name: 'Flash游戏', extensions: ['swf'] },
          { name: '压缩包', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择游戏文件失败:', error)
      throw error
    }
  })

  // 选择图片文件
  ipcMain.handle('select-image-file', async (event, defaultPath = null) => {
    try {
      const dialogOptions = {
        title: '选择图片',
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'webp'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      }

      // 如果提供了默认路径，设置为默认目录
      const processedPath = processDefaultPath(defaultPath)
      if (processedPath) {
        dialogOptions.defaultPath = processedPath
      }

      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, dialogOptions)

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择图片文件失败:', error)
      throw error
    }
  })

  // 选择截图作为封面
  ipcMain.handle('select-screenshot-image', async (event, screenshotDir) => {
    try {
      const dialogOptions = {
        title: '选择截图作为封面',
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'webp'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      }

      // 如果提供了截图目录路径，设置为默认目录
      const processedPath = processScreenshotDir(screenshotDir)
      if (processedPath) {
        dialogOptions.defaultPath = processedPath
      }

      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, dialogOptions)

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择截图图片失败:', error)
      throw error
    }
  })

  // 选择文件夹
  ipcMain.handle('select-folder', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择文件夹',
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] }
      }
      return { success: false, error: '未选择文件夹' }
    } catch (error) {
      console.error('选择文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 选择视频文件
  ipcMain.handle('select-video-file', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择视频文件',
        filters: [
          { name: '视频文件', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择视频文件失败:', error)
      throw error
    }
  })

  // 选择音频文件
  ipcMain.handle('select-audio-file', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择音频文件',
        filters: [
          { name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择音频文件失败:', error)
      throw error
    }
  })

  // 选择小说文件
  ipcMain.handle('select-novel-file', async () => {
    try {
      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择小说文件',
        filters: [
          { name: '文本文件', extensions: ['txt', 'md', 'rtf'] },
          { name: '电子书', extensions: ['epub', 'mobi', 'azw', 'azw3', 'pdf'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('选择小说文件失败:', error)
      throw error
    }
  })

  // 根据过滤器数组选择文件（统一入口）
  // 接收过滤器数组，每个过滤器包含 name 和 extensions
  ipcMain.handle('select-file-with-extensions', async (event, filters = [], defaultPath = null, title = '选择文件') => {
    try {
      // 构建对话框选项
      const dialogOptions = {
        title: title,
        filters: [],
        properties: ['openFile']
      }

      // 处理过滤器数组
      if (Array.isArray(filters) && filters.length > 0) {
        // 标准化每个过滤器的扩展名
        filters.forEach(filter => {
          if (filter && filter.name && Array.isArray(filter.extensions)) {
            const normalizedExtensions = filter.extensions
              .filter(ext => ext && ext !== '其他' && ext !== '*')
              .map(ext => {
                const cleaned = ext.startsWith('.') ? ext.substring(1) : ext
                return cleaned.toLowerCase()
              })
            
            // 如果标准化后有扩展名，添加过滤器
            if (normalizedExtensions.length > 0) {
              dialogOptions.filters.push({
                name: filter.name,
                extensions: normalizedExtensions
              })
            }
            
            // 如果原始扩展名包含通配符，添加所有文件选项（只添加一次）
            if ((filter.extensions.includes('其他') || filter.extensions.includes('*')) && 
                !dialogOptions.filters.some(f => f.extensions.includes('*'))) {
              dialogOptions.filters.push({ name: '所有文件', extensions: ['*'] })
            }
          }
        })
      }

      // 如果没有有效的过滤器，显示所有文件
      if (dialogOptions.filters.length === 0) {
        dialogOptions.filters.push({ name: '所有文件', extensions: ['*'] })
      }

      // 如果提供了默认路径，设置为默认目录
      const processedPath = processDefaultPath(defaultPath)
      if (processedPath) {
        dialogOptions.defaultPath = processedPath
      }

      const mainWindow = getMainWindow()
      const result = await dialog.showOpenDialog(mainWindow, dialogOptions)

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
      return null
    } catch (error) {
      console.error('根据过滤器选择文件失败:', error)
      throw error
    }
  })

  // 自动识别转区工具（如 Locale Emulator）路径
  ipcMain.handle('detect-locale-emulator', async () => {
    const candidates = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Locale Emulator', 'LEProc.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Locale Emulator', 'LEProc.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Locale Emulator', 'LEInstaller.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Locale Emulator', 'LEInstaller.exe')
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p
      }
    }
    return null
  })
}

module.exports = {
  registerIpcHandlers
}

