const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const { getTabManager } = require('../window/tab-manager')

/**
 * 注册标签页相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC 主进程对象
 * @param {BrowserWindow} mainWindow - 主窗口实例
 * @param {boolean} isDev - 是否为开发环境
 */
function registerTabHandlers(ipcMain, mainWindow, isDev) {
  // 创建新标签页
  ipcMain.handle('tab-create', async (event, { url, title } = {}) => {
    try {
      const tabManager = getTabManager(mainWindow, isDev)
      const tabId = tabManager.createTab(url, title)
      return { success: true, tabId }
    } catch (error) {
      console.error('创建标签页失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 在新标签页中打开漫画阅读器
  // 渲染进程传入 path（资源路径）和 title（资源名称），主进程根据环境构建 comic-viewer.html URL
  ipcMain.handle('tab-open-comic-viewer', async (event, { path: resourcePath, title, theme } = {}) => {
    try {
      if (!resourcePath) {
        return { success: false, error: '未提供漫画路径' }
      }

      let viewerUrl
      const pathEncoded = encodeURIComponent(resourcePath)
      const titleEncoded = encodeURIComponent(title || '漫画阅读器')
      const themeEncoded = encodeURIComponent(theme || '')
      const query = `?path=${pathEncoded}&title=${titleEncoded}&theme=${themeEncoded}`

      if (isDev) {
        // 开发环境：通过 Vite 服务器加载
        viewerUrl = `http://localhost:5173/comic-viewer.html${query}`
      } else {
        // 生产环境：加载打包后的 comic-viewer.html
        const appPath = app.getAppPath()
        const possiblePaths = [
          path.join(appPath, 'dist', 'comic-viewer.html'),
          path.join(appPath, 'comic-viewer.html'),
          path.join(__dirname, '../../comic-viewer.html'),
          path.join(__dirname, '../../dist/comic-viewer.html')
        ]
        const htmlPath = possiblePaths.find((p) => fs.existsSync(p))
        if (!htmlPath) {
          const errorMsg = `找不到 comic-viewer.html 文件。尝试的路径: ${possiblePaths.join(', ')}`
          console.error('❌', errorMsg)
          return { success: false, error: errorMsg }
        }
        // 转换为 file:// URL（Windows 路径反斜杠转正斜杠）
        const normalized = htmlPath.replace(/\\/g, '/')
        viewerUrl = `file:///${normalized}${query}`
      }

      const tabManager = getTabManager(mainWindow, isDev)
      const tabId = tabManager.createTab(viewerUrl, title || '漫画阅读器')
      return { success: true, tabId }
    } catch (error) {
      console.error('在新标签页打开漫画失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 在新标签页中打开小说阅读器
  // 渲染进程传入 path（文件路径）、title（资源名称）与 fileType（txt/pdf/epub）
  ipcMain.handle('tab-open-novel-viewer', async (event, { path: filePath, title, fileType } = {}) => {
    try {
      if (!filePath) {
        return { success: false, error: '未提供小说文件路径' }
      }

      let viewerUrl
      const pathEncoded = encodeURIComponent(filePath)
      const titleEncoded = encodeURIComponent(title || '小说阅读器')
      const typeEncoded = encodeURIComponent(fileType || 'txt')
      const query = `?path=${pathEncoded}&title=${titleEncoded}&fileType=${typeEncoded}`

      if (isDev) {
        viewerUrl = `http://localhost:5173/novel-viewer.html${query}`
      } else {
        const appPath = app.getAppPath()
        const possiblePaths = [
          path.join(appPath, 'dist', 'novel-viewer.html'),
          path.join(appPath, 'novel-viewer.html'),
          path.join(__dirname, '../../novel-viewer.html'),
          path.join(__dirname, '../../dist/novel-viewer.html')
        ]
        const htmlPath = possiblePaths.find((p) => fs.existsSync(p))
        if (!htmlPath) {
          const errorMsg = `找不到 novel-viewer.html 文件。尝试的路径: ${possiblePaths.join(', ')}`
          console.error('❌', errorMsg)
          return { success: false, error: errorMsg }
        }
        const normalized = htmlPath.replace(/\\/g, '/')
        viewerUrl = `file:///${normalized}${query}`
      }

      const tabManager = getTabManager(mainWindow, isDev)
      const tabId = tabManager.createTab(viewerUrl, title || '小说阅读器')
      console.log('✅ 已在新标签页打开小说:', title, fileType, viewerUrl)
      return { success: true, tabId }
    } catch (error) {
      console.error('在新标签页打开小说失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 在新标签页中打开视频播放器
  // 渲染进程传入 path（视频文件路径）和 title（视频名称）
  ipcMain.handle('tab-open-video-player', async (event, { path: filePath, title } = {}) => {
    try {
      if (!filePath) {
        return { success: false, error: '未提供视频文件路径' }
      }
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '视频文件不存在' }
      }

      /** 视频播放器页面地址，开发环境走 Vite，生产环境走本地 html */
      let viewerUrl
      const pathEncoded = encodeURIComponent(filePath)
      const titleEncoded = encodeURIComponent(title || '视频播放器')
      const query = `?path=${pathEncoded}&title=${titleEncoded}`

      if (isDev) {
        viewerUrl = `http://localhost:5173/html/video-player.html${query}`
      } else {
        const appPath = app.getAppPath()
        const possiblePaths = [
          path.join(appPath, 'dist', 'html', 'video-player.html'),
          path.join(appPath, 'dist', 'video-player.html'),
          path.join(appPath, 'public', 'html', 'video-player.html'),
          path.join(appPath, 'html', 'video-player.html'),
          path.join(__dirname, '../../html/video-player.html'),
          path.join(__dirname, '../../public/html/video-player.html')
        ]
        const htmlPath = possiblePaths.find((p) => fs.existsSync(p))
        if (!htmlPath) {
          const errorMsg = `找不到 video-player.html 文件。尝试的路径: ${possiblePaths.join(', ')}`
          console.error('❌', errorMsg)
          return { success: false, error: errorMsg }
        }
        const normalized = htmlPath.replace(/\\/g, '/')
        viewerUrl = `file:///${normalized}${query}`
      }

      const tabManager = getTabManager(mainWindow, isDev)
      const tabId = tabManager.createTab(viewerUrl, title || '视频播放器')
      console.log('✅ 已在新标签页打开视频:', title, viewerUrl)
      return { success: true, tabId }
    } catch (error) {
      console.error('在新标签页打开视频失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 关闭标签页
  ipcMain.handle('tab-close', async (event, { tabId }) => {
    try {
      const tabManager = getTabManager(mainWindow, isDev)
      tabManager.closeTab(tabId)
      return { success: true }
    } catch (error) {
      console.error('关闭标签页失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 切换活动标签页
  ipcMain.handle('tab-activate', async (event, { tabId }) => {
    try {
      const tabManager = getTabManager(mainWindow, isDev)
      tabManager.setActiveTab(tabId)
      return { success: true }
    } catch (error) {
      console.error('切换标签页失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取所有标签页
  ipcMain.handle('tab-get-all', async (event) => {
    try {
      const tabManager = getTabManager(mainWindow, isDev)
      const tabs = tabManager.getAllTabs()
      const activeTabId = tabManager.getActiveTabId()
      return { success: true, tabs, activeTabId }
    } catch (error) {
      console.error('获取标签页列表失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 导航标签页
  ipcMain.handle('tab-navigate', async (event, { tabId, url }) => {
    try {
      const tabManager = getTabManager(mainWindow, isDev)
      tabManager.navigateTab(tabId, url)
      return { success: true }
    } catch (error) {
      console.error('导航标签页失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerTabHandlers
}
