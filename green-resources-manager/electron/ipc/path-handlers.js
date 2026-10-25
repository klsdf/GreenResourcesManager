/**
 * @module PathHandlers
 * @description 管理应用程序的路径和 URL 转换相关的 IPC 处理器。
 *
 * 主要功能:
 * 1. 将本地文件路径转换为 file:// URL。
 * 2. 将本地文件读取为 Data URL（Base64 编码）。
 * 3. 获取应用根目录路径。
 * 4. 注册与路径/URL 相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, pathUtils)`: 注册 IPC 处理器。
 *
 * IPC 处理器:
 * - `get-file-url`: 获取文件的 file:// URL。
 * - `read-file-as-data-url`: 将本地文件读取为 Data URL。
 * - `get-app-root-path`: 获取应用根目录路径。
 */

const fs = require('fs')

/**
 * 注册与路径/URL 相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} pathUtils - path-utils 模块。
 */
function registerIpcHandlers(ipcMain, pathUtils) {
  // 获取文件URL，用于在渲染进程中正确显示本地文件
  ipcMain.handle('get-file-url', async (event, filePath) => {
    try {
      if (!filePath || filePath.trim() === '') {
        return { success: false, error: '文件路径为空' }
      }

      // 检查文件是否存在。异步查，卡片封面再多也不会把主进程卡住
      try {
        await fs.promises.access(filePath, fs.constants.F_OK)
      } catch {
        console.warn('文件不存在:', filePath)
        return { success: false, error: '文件不存在' }
      }

      const fileUrl = pathUtils.getFileUrl(filePath)
      if (!fileUrl) {
        return { success: false, error: '无法生成文件 URL' }
      }

      return { success: true, url: fileUrl }
    } catch (error) {
      console.error('获取文件URL失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 将本地图片转为 data:URL 返回，避免 http(s) 环境下直接加载 file:// 被拦截
  ipcMain.handle('read-file-as-data-url', async (event, filePath) => {
    try {
      const dataUrl = pathUtils.readFileAsDataUrl(filePath)
      if (!dataUrl) {
        return null
      }
      return dataUrl
    } catch (error) {
      console.error('读取文件为 Data URL 失败:', error)
      return null
    }
  })

  // 获取应用根目录路径
  ipcMain.handle('get-app-root-path', async () => {
    try {
      const appRootPath = pathUtils.getAppRootPath()
      console.log('应用根目录路径:', appRootPath)
      return { success: true, path: appRootPath }
    } catch (error) {
      console.error('获取应用根目录路径失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerIpcHandlers
}

