/**
 * ============================================================================
 * 视频播放窗口管理模块 (Video Window Manager)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块负责创建和管理独立的视频播放窗口，用于在应用中播放视频文件。
 * 支持多种视频格式，包含完整的视频播放器功能。
 * 
 * 主要功能：
 * 1. 创建独立的视频播放窗口（可同时打开多个）
 * 2. 加载视频播放器 HTML 页面（video-player.html，包含完整的播放器 UI 和逻辑）
 * 3. 支持多种视频格式（mp4, webm, avi, mkv, mov, flv, wmv 等）
 * 4. 视频播放控制（播放、暂停、进度控制）
 * 5. 键盘快捷键支持（空格播放/暂停、左右箭头快进/快退、ESC 退出全屏）
 * 6. 错误处理和降级方案（支持使用外部播放器打开）
 * 7. 管理视频窗口生命周期（创建、关闭、清理）
 * 
 * 导出的函数：
 * - openVideoWindow()          打开视频播放窗口
 * - getAllVideoWindows()       获取所有视频窗口实例
 * - registerIpcHandlers()      注册视频窗口相关的 IPC 处理器
 * 
 * IPC 处理器：
 * - open-video-window           打开视频播放窗口
 * 
 * 视频播放器特性：
 * - 支持多种视频格式和 MIME 类型
 * - 自动检测视频格式并设置正确的 MIME 类型
 * - 处理中文路径和特殊字符
 * - 完整的错误处理机制
 * - 支持使用外部播放器作为降级方案
 * - 键盘快捷键控制
 * 
 * ============================================================================
 */

const { BrowserWindow, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { resolveMainPreloadPath } = require('../utils/preload-path')

// 持有视频窗口的全局引用，防止被垃圾回收
const videoWindows = []

/**
 * 打开视频播放窗口
 * @param {string} filePath - 视频文件路径
 * @param {Object} options - 窗口选项
 * @param {boolean} isDev - 是否为开发环境
 * @returns {Promise<Object>} 结果对象
 */
async function openVideoWindow(filePath, options = {}, isDev = false) {
  try {
    console.log('=== Electron: 开始打开视频播放窗口 ===')
    console.log('视频文件路径:', filePath)
    console.log('窗口选项:', options)
    
    if (!filePath) {
      console.log('❌ 视频文件路径为空')
      return { success: false, error: '无效的视频文件路径' }
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log('❌ 视频文件不存在:', filePath)
      return { success: false, error: '视频文件不存在' }
    }
    
    // 获取应用路径
    const appPath = app.getAppPath()
    
    // 确定 video-player.html 路径
    let videoPlayerHtmlPath
    if (isDev) {
      // 开发环境：使用 public/html 目录下的文件
      videoPlayerHtmlPath = path.join(__dirname, '../../html/video-player.html')
    } else {
      // 生产环境：尝试多个可能的路径
      const possiblePaths = [
        path.join(appPath, 'dist', 'html', 'video-player.html'),
        path.join(appPath, 'html', 'video-player.html'),
        path.join(__dirname, '../../html/video-player.html')
      ]
      videoPlayerHtmlPath = possiblePaths.find(p => fs.existsSync(p))
      
      if (!videoPlayerHtmlPath) {
        const errorMsg = `找不到 video-player.html 文件。尝试的路径: ${possiblePaths.join(', ')}`
        console.error('❌', errorMsg)
        return { success: false, error: errorMsg }
      }
    }
    
    // 创建视频播放窗口
    const videoWindow = new BrowserWindow({
      width: options.width || 1200,
      height: options.height || 800,
      minWidth: 800,
      minHeight: 600,
      title: options.title || '视频播放器',
      resizable: options.resizable !== false,
      minimizable: options.minimizable !== false,
      maximizable: options.maximizable !== false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false, // 允许访问本地文件
        allowRunningInsecureContent: true, // 允许不安全内容
        preload: resolveMainPreloadPath()
      },
      icon: path.join(__dirname, '../../butter-icon.ico'),
      show: true
    })
    
    // 保持全局引用，防止被GC
    videoWindows.push(videoWindow)
    
    // 构建 URL，通过 query string 传递视频路径和标题
    const videoPathEncoded = encodeURIComponent(filePath)
    const titleEncoded = encodeURIComponent(options.title || '视频播放器')
    
    if (isDev) {
      // 开发环境：通过 Vite 服务器加载
      const url = `http://localhost:5173/html/video-player.html?path=${videoPathEncoded}&title=${titleEncoded}`
      await videoWindow.loadURL(url)
    } else {
      // 生产环境：使用 file:// 协议加载
      const url = `file://${videoPlayerHtmlPath.replace(/\\/g, '/')}?path=${videoPathEncoded}&title=${titleEncoded}`
      await videoWindow.loadURL(url)
    }
    
    console.log('✅ 视频播放窗口已创建并开始加载内容')
    
    // 窗口关闭时清理
    videoWindow.on('closed', () => {
      console.log('视频播放窗口已关闭')
      const index = videoWindows.indexOf(videoWindow)
      if (index > -1) {
        videoWindows.splice(index, 1)
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('❌ 打开视频播放窗口失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取所有视频窗口
 * @returns {BrowserWindow[]} 视频窗口数组
 */
function getAllVideoWindows() {
  return videoWindows.filter(w => w && !w.isDestroyed())
}

/**
 * 注册视频窗口相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC Main 对象
 * @param {boolean} isDev - 是否为开发环境
 */
function registerIpcHandlers(ipcMain, isDev = false) {
  ipcMain.handle('open-video-window', async (event, filePath, options = {}) => {
    return await openVideoWindow(filePath, options, isDev)
  })
}

module.exports = {
  openVideoWindow,
  getAllVideoWindows,
  registerIpcHandlers
}

