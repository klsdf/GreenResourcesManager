/**
 * ============================================================================
 * 主窗口管理模块 (Main Window Manager)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块负责管理应用的主窗口（应用主界面），包括窗口的创建、生命周期管理、
 * 窗口状态控制以及与系统托盘的集成。
 * 
 * 主要功能：
 * 1. 创建和管理应用主窗口（单例模式）
 * 2. 根据环境加载内容（开发环境加载 Vite 服务器，生产环境加载构建文件）
 * 3. 处理窗口事件（关闭、最小化、大小变化）
 * 4. 支持最小化到托盘功能
 * 5. 窗口状态控制（最小化、最大化、关闭）
 * 6. 注册窗口相关的 IPC 处理器
 * 
 * 导出的函数：
 * - createMainWindow()         创建主窗口
 * - getMainWindow()            获取主窗口实例
 * - showAndFocusMainWindow()   显示并聚焦主窗口（用于单实例处理）
 * - registerIpcHandlers()      注册窗口相关的 IPC 处理器
 * 
 * IPC 处理器：
 * - minimize-window             最小化窗口
 * - maximize-window             最大化/还原窗口
 * - close-window                关闭窗口
 * 
 * ============================================================================
 */

const { BrowserWindow, app } = require('electron')
const path = require('path')
const fs = require('fs')

// 主窗口实例
let mainWindow = null

/**
 * "已最小化到托盘"首次提示标记文件（存于 Electron userData，跨重启生效）
 * 只在用户第一次触发最小化到托盘时弹一次系统通知，之后不再打扰
 */
function getMinimizeNoticeFlagPath() {
  return path.join(app.getPath('userData'), 'minimize-tray-notice-shown.json')
}

function hasShownMinimizeNotice() {
  try {
    return fs.existsSync(getMinimizeNoticeFlagPath())
  } catch {
    return false
  }
}

function markMinimizeNoticeShown() {
  try {
    fs.writeFileSync(
      getMinimizeNoticeFlagPath(),
      JSON.stringify({ shown: true, at: new Date().toISOString() }),
      'utf8'
    )
  } catch (err) {
    console.warn('写入最小化到托盘提示标记失败:', err)
  }
}

/**
 * 创建主窗口
 * @param {boolean} isDev - 是否为开发环境
 * @param {Function} getMinimizeToTrayEnabled - 获取最小化到托盘功能状态
 * @param {Function} getSystemTray - 获取系统托盘实例的函数
 * @param {Function} displayBalloon - 显示托盘通知的函数
 * @returns {BrowserWindow} 主窗口实例
 */
function createMainWindow(isDev, getMinimizeToTrayEnabled, getSystemTray, displayBalloon) {
  // 如果窗口已存在，直接返回
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  // ============================================================================
  // 【重要】路径解析修复说明
  // ============================================================================
  // 
  // 【之前的错误代码】
  // const indexPath = path.join(__dirname, '../../dist/index.html')
  // 
  // 【问题原因】
  // 1. 在打包后的 Electron 应用中，文件结构发生了变化：
  //    - 开发环境：项目根目录/electron/window/main-window.js
  //    - 打包后：resources/app/electron/window/main-window.js (或 app.asar 中)
  // 
  // 2. __dirname 在打包后指向 resources/app/electron/window/
  //    使用 ../../dist/index.html 会解析到错误的位置，导致找不到文件
  // 
  // 3. 结果：页面空白，body 中没有任何元素（因为 index.html 加载失败）
  // 
  // 【修复方案】
  // 使用 app.getAppPath() 获取应用根目录，无论是否打包都能正确工作：
  //    - 开发环境：返回项目根目录
  //    - 打包后：返回 resources/app/ 或 resources/app.asar/
  // 
  // 【学习要点】
  // - 在 Electron 打包后，不能依赖 __dirname 的相对路径
  // - 应该使用 app.getAppPath() 获取应用根目录，然后构建绝对路径
  // - 这是 Electron 应用打包时的常见陷阱
  // 
  // ============================================================================
  
  // 获取应用路径（在打包后也能正确工作）
  const appPath = app.getAppPath()
  
  // 确定 preload.js 路径
  let preloadPath
  if (isDev) {
    // 开发环境：使用相对路径（preload.js 现在在 electron/ 目录下）
    preloadPath = path.join(__dirname, '../preload.js')
  } else {
    // 生产环境：尝试多个可能的路径
    const fs = require('fs')
    const possiblePaths = [
      path.join(appPath, 'electron', 'preload.js'), // resources/app/electron/preload.js
      path.join(appPath, 'preload.js'),             // resources/app/preload.js (备用)
      path.join(__dirname, '../preload.js')         // 备用路径
    ]
    
    // 查找存在的 preload.js 文件
    preloadPath = possiblePaths.find(p => fs.existsSync(p))
    
    if (!preloadPath) {
      // 如果都找不到，使用第一个路径（让 Electron 报错）
      preloadPath = possiblePaths[0]
      console.warn('⚠️ 警告: 找不到 preload.js 文件，尝试的路径:', possiblePaths)
      console.warn('⚠️ 将使用路径:', preloadPath)
    } else {
      console.log('✅ 找到 preload.js 文件:', preloadPath)
    }
  }
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // preload 路径：使用确定的路径
      preload: preloadPath,
      // 允许在 http(s) 环境下加载 file:// 资源（用于本地视频缩略图生成）
      webSecurity: false
    },
    // 图标路径：开发环境用相对路径，生产环境用 appPath
    icon: isDev
      ? path.join(__dirname, '../../public/butter-icon.ico')
      : path.join(appPath, 'public', 'butter-icon.ico'), // ✅ 使用 appPath 而不是 __dirname
    titleBarStyle: 'default',
    autoHideMenuBar: true, // 自动隐藏菜单栏（Windows/Linux 上可通过 Alt 键显示）
    show: false // 先不显示，等加载完成后再显示
  })

  // 加载应用
  console.log('当前环境:', isDev ? '开发环境' : '生产环境')
  
  if (isDev) {
    // 开发环境：加载Vite开发服务器
    console.log('正在加载: http://localhost:5173')
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.error('加载失败:', err)
      // 如果Vite服务器还没启动，等待一下再重试
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173').catch(console.error)
        }
      }, 2000)
    })
  } else {
    // ============================================================================
    // 生产环境：加载构建后的文件
    // ============================================================================
    // 
    // 【修复后的正确代码】
    // ✅ 使用 appPath 构建路径，确保在打包后也能正确找到文件
    const indexPath = path.join(appPath, 'dist', 'index.html')
    console.log('应用路径:', appPath)
    console.log('正在加载文件:', indexPath)
    
    // 检查文件是否存在（用于调试和错误提示）
    const fs = require('fs')
    if (!fs.existsSync(indexPath)) {
      console.error('错误: 找不到 index.html 文件:', indexPath)
      // 尝试备用路径（相对于当前文件位置，仅作为最后的备用方案）
      // ⚠️ 注意：这个备用路径在打包后通常不会工作，但保留用于调试
      const altPath = path.join(__dirname, '../../dist/index.html')
      console.log('尝试备用路径:', altPath)
      if (fs.existsSync(altPath)) {
        mainWindow.loadFile(altPath)
      } else {
        console.error('错误: 备用路径也不存在')
        // 即使文件不存在也尝试加载，让 Electron 显示错误信息
        mainWindow.loadFile(indexPath).catch(err => {
          console.error('加载文件失败:', err)
        })
      }
    } else {
      // ✅ 文件存在，正常加载
      mainWindow.loadFile(indexPath)
    }
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      
      // 开发环境下自动打开开发者工具
      if (isDev) {
        mainWindow.webContents.openDevTools()
      }
    }
  })
  
  // 检查 electronAPI 是否已加载（用于调试）
  mainWindow.webContents.once('did-finish-load', () => {
    // 在页面加载完成后，检查 electronAPI 是否可用
    mainWindow.webContents.executeJavaScript(`
      console.log('🔍 检查 electronAPI 是否可用:', {
        hasElectronAPI: typeof window.electronAPI !== 'undefined',
        electronAPIKeys: typeof window.electronAPI !== 'undefined' ? Object.keys(window.electronAPI) : [],
        hasSetSaveDataDirectory: typeof window.electronAPI !== 'undefined' && typeof window.electronAPI.setSaveDataDirectory !== 'undefined'
      })
    `).catch(err => {
      console.error('检查 electronAPI 失败:', err)
    })
  })

  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  
  // 处理窗口关闭事件（支持最小化到托盘）
  mainWindow.on('close', (event) => {
    const minimizeToTrayEnabled = getMinimizeToTrayEnabled ? getMinimizeToTrayEnabled() : false
    const tray = getSystemTray ? getSystemTray() : null
    
    if (minimizeToTrayEnabled && tray) {
      // 阻止默认的关闭行为
      event.preventDefault()
      // 最小化到托盘
      mainWindow.hide()
      // 仅在首次最小化到托盘时提示一次，避免每次关闭都弹系统通知
      if (displayBalloon && !hasShownMinimizeNotice()) {
        displayBalloon({
          title: 'Green Resource Manager',
          content: '应用已最小化到系统托盘'
        })
        markMinimizeNoticeShown()
      }
    }
  })
  
  // 处理窗口最小化事件 - 正常最小化到任务栏，不干预
  mainWindow.on('minimize', (event) => {
    // 允许正常的最小化行为，不干预
    // console.log('窗口已最小化到任务栏')
  })

  // 处理窗口大小变化
  mainWindow.on('resize', () => {
    // 可以在这里添加窗口大小变化的处理逻辑
  })

  return mainWindow
}

/**
 * 获取主窗口实例
 * @returns {BrowserWindow|null} 主窗口实例
 */
function getMainWindow() {
  return mainWindow
}

/**
 * 显示并聚焦主窗口
 */
function showAndFocusMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 如果窗口被最小化，恢复窗口
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    
    // 显示并聚焦窗口
    mainWindow.show()
    mainWindow.focus()
    
    // 在 Windows 上，确保窗口在最前面
    if (process.platform === 'win32') {
      mainWindow.setAlwaysOnTop(true)
      // 短暂置顶后取消，确保窗口出现在最前面
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false)
        }
      }, 100)
    }
  }
}

/**
 * 注册主窗口相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC Main 对象
 */
function registerIpcHandlers(ipcMain) {
  // 最小化窗口
  ipcMain.handle('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  // 最大化/还原窗口
  ipcMain.handle('maximize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  // 关闭窗口
  ipcMain.handle('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  // 重新加载窗口
  ipcMain.handle('reload-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reload()
    }
  })

  // 强制重新加载窗口（忽略缓存）
  ipcMain.handle('force-reload-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reloadIgnoringCache()
    }
  })

  // 切换开发者工具
  ipcMain.handle('toggle-dev-tools', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // 设置全屏
  ipcMain.handle('set-fullscreen', (event, fullscreen) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(fullscreen)
    }
  })

  // 切换全屏
  ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  // 设置缩放级别
  ipcMain.handle('set-zoom-level', (event, zoomLevel) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.setZoomLevel(zoomLevel)
    }
  })

  // 获取当前缩放级别
  ipcMain.handle('get-zoom-level', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.webContents.getZoomLevel()
    }
    return 0
  })

  // 放大
  ipcMain.handle('zoom-in', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentZoom = mainWindow.webContents.getZoomLevel()
      mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
    }
  })

  // 缩小
  ipcMain.handle('zoom-out', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentZoom = mainWindow.webContents.getZoomLevel()
      mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
    }
  })

  // 重置缩放
  ipcMain.handle('reset-zoom', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.setZoomLevel(0)
    }
  })
}

module.exports = {
  createMainWindow,
  getMainWindow,
  showAndFocusMainWindow,
  registerIpcHandlers
}

