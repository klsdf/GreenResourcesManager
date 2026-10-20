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
const { resolveMainPreloadPath } = require('../utils/preload-path')

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
 * 界面缩放的下限，约等于默认大小的 50%。
 * Electron 的 zoom level 满足 scale = 1.2 ^ level，所以用对数把百分比换算成 level。
 */
const MIN_ZOOM_LEVEL = Math.log(0.5) / Math.log(1.2)

/**
 * 界面缩放的上限，约等于默认大小的 300%。
 * 再放大布局容易挤出窗口，300% 和 Chromium 常见的缩放下限对称，足够把字号看清楚。
 */
const MAX_ZOOM_LEVEL = Math.log(3) / Math.log(1.2)

/**
 * Ctrl+滚轮每一格的缩放步长。
 * 1.2 ^ 0.5 ≈ 1.095，大约 10%，和浏览器滚轮缩放的手感接近；
 * 菜单里的 Ctrl+加号/减号仍用更小的 0.1，方便微调。
 */
const WHEEL_ZOOM_STEP = 0.5

/**
 * 是否正在把缩放写回窗口。
 * setZoomLevel 不应再次进入缩放逻辑，避免和 zoom-changed 叠成死循环。
 */
let applyingZoom = false

/**
 * 把缩放级别限制在 50%～300%。
 * @param {number} level Electron zoom level
 * @returns {number} 限制后的 zoom level；非法输入回落到 0（100%）
 */
function clampZoomLevel(level) {
  if (typeof level !== 'number' || Number.isNaN(level)) return 0
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, level))
}

/**
 * 缩放记忆文件路径。
 * 放在 userData 而不是项目目录，打包后和开发环境都能跨重启保留用户选过的字号。
 * @returns {string}
 */
function getZoomLevelFilePath() {
  return path.join(app.getPath('userData'), 'app-zoom-level.json')
}

/**
 * 读取上次保存的界面缩放。
 * @returns {number} zoom level，没有记录或读失败时返回 0
 */
function readSavedZoomLevel() {
  try {
    const raw = fs.readFileSync(getZoomLevelFilePath(), 'utf8')
    const data = JSON.parse(raw)
    if (data && typeof data.zoomLevel === 'number') {
      return clampZoomLevel(data.zoomLevel)
    }
  } catch {
    // 首次启动还没有这个文件，按 100% 处理
  }
  return 0
}

/**
 * 把当前缩放写到磁盘，下次启动时恢复。
 * @param {number} level 已经限制过范围的 zoom level
 */
function writeSavedZoomLevel(level) {
  try {
    const payload = JSON.stringify({ zoomLevel: Math.round(level * 1000) / 1000 })
    fs.writeFileSync(getZoomLevelFilePath(), payload, 'utf8')
  } catch (err) {
    console.warn('保存界面缩放失败:', err)
  }
}

/**
 * 设置主窗口整体缩放，并可选地记住、通知界面。
 *
 * 设计原因：页面里大量字号是写死的 px，只改根元素 font-size 覆盖不到。
 * 视图菜单已经用 webContents.setZoomLevel 缩放整个界面（文字、间距、图片一起变），
 * Ctrl+滚轮必须走同一条路径，百分比提示才和实际看到的大小一致。
 *
 * @param {number} level 目标 zoom level
 * @param {{ notify?: boolean, persist?: boolean }} [options]
 * notify 为 false 时不弹「缩放至」提示（用于启动时恢复）；
 * persist 为 false 时不写磁盘（恢复时避免无意义覆盖）。
 * @returns {number} 实际应用的 zoom level
 */
function setMainWindowZoom(level, options = {}) {
  const notify = options.notify !== false
  const persist = options.persist !== false
  if (!mainWindow || mainWindow.isDestroyed()) return 0

  const next = clampZoomLevel(level)
  applyingZoom = true
  try {
    mainWindow.webContents.setZoomLevel(next)
    if (persist) writeSavedZoomLevel(next)
    if (notify) {
      // 百分比按 Chromium 公式 scale = 1.2 ^ level 计算，避免渲染进程再用 2^level 算错
      const zoomFactor = Math.pow(1.2, next)
      mainWindow.webContents.send('app-zoom-changed', { zoomLevel: next, zoomFactor })
    }
  } finally {
    applyingZoom = false
  }
  return next
}

/**
 * 绑定 Ctrl+滚轮缩放，并在页面加载完成后恢复上次的缩放。
 *
 * Electron 29 在用户按住 Ctrl 滚动滚轮时，只会调用 ContentsZoomChange 发出
 * zoom-changed（方向为 in / out），不会自己改 zoom level。所以要在这里补上 setZoomLevel。
 * 只监听这个事件、不在渲染进程再听 wheel，是为了避免一次滚动缩两次。
 *
 * @param {BrowserWindow} win 主窗口
 */
function bindMainWindowZoom(win) {
  win.webContents.on('zoom-changed', (_event, zoomDirection) => {
    if (applyingZoom || !mainWindow || mainWindow.isDestroyed()) return
    const currentZoom = mainWindow.webContents.getZoomLevel()
    const delta = zoomDirection === 'in' ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
    setMainWindowZoom(currentZoom + delta)
  })

  // 页面每次加载都会回到默认 100%，所以在 did-finish-load 里把记忆的缩放设回去
  win.webContents.on('did-finish-load', () => {
    const saved = readSavedZoomLevel()
    if (saved === 0) return
    setMainWindowZoom(saved, { notify: false, persist: false })
  })
}

/**
 * 创建主窗口
 * @param {boolean} isDev - 是否为开发环境
 * @param {Function} getMinimizeToTrayEnabled - 获取最小化到托盘功能状态
 * @param {Function} getSystemTray - 获取系统托盘实例的函数
 * @param {Function} displayBalloon - 显示托盘通知的函数
 * @param {{ showWhenReady?: boolean }} [options] showWhenReady 为 false 时，窗口创建后留在后台（右键解压用）
 * @returns {BrowserWindow} 主窗口实例
 */
function createMainWindow(isDev, getMinimizeToTrayEnabled, getSystemTray, displayBalloon, options = {}) {
  /** 右键解压拉起时不弹出主界面。 */
  const showWhenReady = options.showWhenReady !== false
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

  /** 与桌宠、视频、标签页共用同一解析，避免各窗口把相对路径多写一层 */
  const preloadPath = resolveMainPreloadPath()
  
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
    show: false, // 先不显示，等加载完成后再显示
    skipTaskbar: !showWhenReady
  })

  // 先挂上滚轮缩放，再加载页面，这样第一次 did-finish-load 就能恢复上次的大小
  bindMainWindowZoom(mainWindow)

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
    if (!mainWindow || mainWindow.isDestroyed() || !showWhenReady) return
    mainWindow.show()

    // 开发环境下自动打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools()
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
    
    // 右键解压时主窗口不在任务栏上，这里再放回来
    mainWindow.setSkipTaskbar(false)
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

  // 设置缩放级别（与 Ctrl+滚轮、视图菜单共用同一套范围和记忆）
  ipcMain.handle('set-zoom-level', (event, zoomLevel) => {
    setMainWindowZoom(zoomLevel)
  })

  // 获取当前缩放级别
  ipcMain.handle('get-zoom-level', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.webContents.getZoomLevel()
    }
    return 0
  })

  // 放大一档，步长与滚轮一致
  ipcMain.handle('zoom-in', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setMainWindowZoom(mainWindow.webContents.getZoomLevel() + WHEEL_ZOOM_STEP)
    }
  })

  // 缩小一档，步长与滚轮一致
  ipcMain.handle('zoom-out', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setMainWindowZoom(mainWindow.webContents.getZoomLevel() - WHEEL_ZOOM_STEP)
    }
  })

  // 重置缩放
  ipcMain.handle('reset-zoom', () => {
    setMainWindowZoom(0)
  })
}

module.exports = {
  createMainWindow,
  getMainWindow,
  showAndFocusMainWindow,
  registerIpcHandlers,
  setMainWindowZoom
}

