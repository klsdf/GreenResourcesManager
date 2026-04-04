const { app, BrowserWindow, dialog, ipcMain, shell, screen, nativeImage, protocol } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

// 引入系统托盘模块
const systemTray = require('./tray/system-tray')
// 引入窗口模块
const mainWindowModule = require('./window/main-window')
const videoWindowModule = require('./window/video-window')
const petWindowModule = require('./window/pet-window')
// 引入菜单模块
const appMenu = require('./menu/app-menu')
// 引入服务模块
const gameProcess = require('./services/game-process')
const screenshot = require('./services/screenshot')
const shortcuts = require('./services/shortcuts')
const autoUpdaterService = require('./services/auto-updater')
const apiServer = require('./api-server')
// 引入 IPC 处理器模块
const dialogHandlers = require('./ipc/dialog-handlers')
const fileHandlers = require('./ipc/file-handlers')
const pathHandlers = require('./ipc/path-handlers')
const systemHandlers = require('./ipc/system-handlers')
const settingsHandlers = require('./ipc/settings-handlers')
const mediaHandlers = require('./ipc/media-handlers')
const tabHandlers = require('./ipc/tab-handlers')
// 引入工具模块
const fileUtils = require('./utils/file-utils')
const pathUtils = require('./utils/path-utils')
const windowsUtils = require('./utils/windows-utils')
const constants = require('./utils/constants')
const sqlite = require('./database/sqlite')
const scraperDb = require('./database/scraper-db')

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const disableGpu = process.env.ELECTRON_DISABLE_GPU === '1' || process.env.GRM_DISABLE_GPU === '1'
if (disableGpu) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  console.log('GPU acceleration disabled by environment flag')
} else {
  const angle = (process.env.GRM_ANGLE || 'd3d11').toLowerCase()
  app.commandLine.appendSwitch('use-angle', angle)
  let profile = (process.env.GRM_GPU_PROFILE || '').toLowerCase()
  if (!profile) {
    try {
      if (process.platform === 'win32') {
        const result = require('child_process').spawnSync('powershell', [
          '-Command',
          'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name | ConvertTo-Json -Depth 5'
        ], { encoding: 'utf-8', timeout: 1500 })
        const names = JSON.parse(result.stdout || '[]')
        const nameStr = Array.isArray(names) ? names.join(' ').toLowerCase() : String(names || '').toLowerCase()
        if (nameStr.includes('amd') || nameStr.includes('radeon')) profile = 'amd'
        else if (nameStr.includes('nvidia') || nameStr.includes('geforce') || nameStr.includes('quadro')) profile = 'nvidia'
        else if (nameStr.includes('intel')) profile = 'intel'
      }
    } catch (e) {}
  }
  if (profile === 'amd') {
    app.commandLine.appendSwitch('disable-features', 'CanvasOopRasterization')
  } else {
    app.commandLine.appendSwitch('disable-features', 'CanvasOopRasterization,Vulkan')
    app.commandLine.appendSwitch('disable-direct-composition')
  }
  console.log('GPU acceleration profile applied:', { angle, profile: profile || 'auto' })
}

// 是否启用最小化到托盘功能
let minimizeToTrayEnabled = true

function createWindow() {
  // 使用主窗口模块创建窗口
  return mainWindowModule.createMainWindow(
    isDev,
    () => minimizeToTrayEnabled,
    () => systemTray.getTray(),
    (options) => systemTray.displayBalloon(options)
  )
}

// 单实例锁：确保应用只能运行一个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果获取锁失败，说明已有实例在运行，直接退出
  console.log('应用已在运行，退出当前实例')
  app.quit()
} else {
  process.on('SIGINT', () => {
    console.log('收到 SIGINT，准备退出应用')
    app.quit()
  })
  process.on('SIGTERM', () => {
    console.log('收到 SIGTERM，准备退出应用')
    app.quit()
  })
  // 监听第二个实例启动的事件
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当用户尝试启动第二个实例时，将焦点移到已运行的应用窗口
    console.log('检测到第二个实例启动，将焦点移到已运行的窗口')
    
    const mainWindow = mainWindowModule.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      // 使用主窗口模块的方法显示并聚焦窗口
      mainWindowModule.showAndFocusMainWindow()
      console.log('已运行的窗口已显示并聚焦')
    } else {
      // 如果窗口不存在（可能被销毁了），重新创建
      console.log('主窗口不存在，重新创建窗口')
      createWindow()
    }
  })
  
  // 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
  app.whenReady().then(() => {
    // 注册 archive 协议，用于 CBZ 漫画包内图片（archive:///path/to/file.cbz#entryName）
    const AdmZip = require('adm-zip')
    protocol.interceptBufferProtocol('archive', (request, callback) => {
      try {
        const u = new URL(request.url)
        let archivePath = decodeURIComponent(u.pathname || '')
        if (process.platform === 'win32' && archivePath.startsWith('/') && archivePath.length > 2 && archivePath[2] === ':') {
          archivePath = path.normalize(archivePath.slice(1))
        } else if (archivePath.startsWith('/')) {
          archivePath = path.normalize(archivePath.slice(1))
        }
        const entryName = u.hash ? decodeURIComponent(u.hash.slice(1)) : ''
        if (!archivePath || !entryName) {
          callback(Buffer.alloc(0))
          return
        }
        const zip = new AdmZip(archivePath)
        const entry = zip.getEntry(entryName)
        if (!entry) {
          callback(Buffer.alloc(0))
          return
        }
        const buffer = entry.getData()
        callback(buffer)
      } catch (e) {
        console.error('archive protocol error:', e)
        callback(Buffer.alloc(0))
      }
    })

    createWindow()
    appMenu.createMenu(() => mainWindowModule.getMainWindow())
    
    // 获取主窗口实例
    const mainWindow = mainWindowModule.getMainWindow()
    
    // 创建系统托盘
    systemTray.createTray(mainWindow, () => minimizeToTrayEnabled, (enabled) => { minimizeToTrayEnabled = enabled })
    
    // 注册系统托盘相关的 IPC 处理器
    systemTray.registerIpcHandlers(
      ipcMain,
      () => mainWindowModule.getMainWindow(),
      () => minimizeToTrayEnabled,
      (enabled) => { minimizeToTrayEnabled = enabled }
    )
    
    // 注册主窗口相关的 IPC 处理器
    mainWindowModule.registerIpcHandlers(ipcMain)
    
    // 注册视频窗口相关的 IPC 处理器
    videoWindowModule.registerIpcHandlers(ipcMain, isDev)
    
    // 注册桌宠窗口相关的 IPC 处理器
    petWindowModule.registerIpcHandlers(ipcMain, isDev)
    
    // 注册游戏进程相关的 IPC 处理器
    gameProcess.registerIpcHandlers(ipcMain, () => mainWindowModule.getMainWindow())
    
    // 注册截图相关的 IPC 处理器
    screenshot.registerIpcHandlers(ipcMain, () => mainWindowModule.getMainWindow(), app)
    
    // 注册对话框相关的 IPC 处理器
    dialogHandlers.registerIpcHandlers(ipcMain, () => mainWindowModule.getMainWindow(), dialog)
    
    // 注册文件操作相关的 IPC 处理器
    fileHandlers.registerIpcHandlers(ipcMain, fileUtils, pathUtils)
    
    // 注册路径/URL 相关的 IPC 处理器
    pathHandlers.registerIpcHandlers(ipcMain, pathUtils)
    
    // 注册系统信息相关的 IPC 处理器
    systemHandlers.registerIpcHandlers(ipcMain, app, windowsUtils, shell, () => mainWindowModule.getMainWindow())
    
    // 注册设置相关的 IPC 处理器
    settingsHandlers.registerIpcHandlers(ipcMain, app, dialog, () => mainWindowModule.getMainWindow())
    
    // 注册媒体相关的 IPC 处理器
    mediaHandlers.registerIpcHandlers(ipcMain, shell, pathUtils)
    
    // 注册标签页相关的 IPC 处理器
    tabHandlers.registerTabHandlers(ipcMain, mainWindow, isDev)

    // SQLite demo 数据查询（供「数据库」页面展示）
    ipcMain.handle('sqlite-get-all-tables-data', () => sqlite.getAllTablesData())
    
    // 从数据库读取页面数据
    ipcMain.handle('sqlite-get-page-data', (event, pageId) => sqlite.getPageData(pageId))
    
    // 保存资源到数据库
    ipcMain.handle('sqlite-save-resource', (event, resourceType, resource) => sqlite.saveResourceToTable(resourceType, resource))
    
    // 添加资源到页面索引
    ipcMain.handle('sqlite-add-resource-to-page', (event, pageId, resourceType, resourceId) => sqlite.addResourceToPage(pageId, resourceType, resourceId))
    
    // 保存页面资源（批量）
    ipcMain.handle('sqlite-save-page-resources', (event, pageId, resources) => sqlite.savePageResources(pageId, resources))
    
    // 从数据库删除资源
    ipcMain.handle('sqlite-delete-resource', (event, tableName, resourceId) => sqlite.deleteResourceFromTable(tableName, resourceId))
    
    // 将旧格式 SQL（多列）迁移为 id+jsonData 格式
    ipcMain.handle('sqlite-migrate-to-json-format', () => sqlite.migrateOldSqlToJsonFormat())
    
    // 从 JSON 迁移成就数据到 SQLite
    ipcMain.handle('sqlite-migrate-achievements', (event, customSaveDataPath) => sqlite.migrateAchievementsFromJson(customSaveDataPath))
    
    // 从 JSON 迁移设置数据到 SQLite
    ipcMain.handle('sqlite-migrate-settings', (event, customSaveDataPath) => sqlite.migrateSettingsFromJson(customSaveDataPath))
    
    // 从 SQLite 读取设置数据
    ipcMain.handle('sqlite-get-settings', () => sqlite.getSettingsFromSqlite())
    
    // 保存设置数据到 SQLite
    ipcMain.handle('sqlite-save-settings', (event, settings) => sqlite.saveSettingsToSqlite(settings))
    
    // 从 JSON 迁移用户数据到 SQLite
    ipcMain.handle('sqlite-migrate-user', (event, customSaveDataPath) => sqlite.migrateUserFromJson(customSaveDataPath))
    
    // 从 SQLite 读取用户数据
    ipcMain.handle('sqlite-get-user', () => sqlite.getUserFromSqlite())
    
    // 保存用户数据到 SQLite
    ipcMain.handle('sqlite-save-user', (event, user) => sqlite.saveUserToSqlite(user))
    
    // 刮削库数据库操作
    ipcMain.handle('scraper-db-import', (event, scrapableFieldsByTable, sourceDbPath) => scraperDb.scraperDbImportFromArchive(scrapableFieldsByTable, sourceDbPath))
    ipcMain.handle('scraper-db-get-all', () => scraperDb.scraperDbGetAll())
    ipcMain.handle('scraper-db-clear', () => scraperDb.scraperDbClear())
    ipcMain.handle('scraper-db-search', (event, sourceTable, name, resourcePath) => scraperDb.scraperDbSearch(sourceTable, name, resourcePath))
    ipcMain.handle('scraper-db-apply', (event, sourceTable, mainResourceId, jsonData) => scraperDb.scraperDbApplyToResource(sourceTable, mainResourceId, jsonData))
    ipcMain.handle('scraper-db-read-external', (event, dbPath) => scraperDb.scraperDbReadExternal(dbPath))
    ipcMain.handle('scraper-db-merge', (event, overwrites, adds) => scraperDb.scraperDbMerge(overwrites, adds))
    
    // 注册快捷键相关的 IPC 处理器
    shortcuts.registerIpcHandlers(
      ipcMain,
      () => mainWindowModule.getMainWindow(),
      () => gameProcess,
      () => mainWindowModule.showAndFocusMainWindow()
    )

    // 从 SQLite 读取设置，根据 showWindowShortcutEnabled 决定是否注册 F2 快捷键
    const initializeShowWindowShortcut = async () => {
      try {
        const result = await sqlite.getSettingsFromSqlite()
        let shouldEnable = false
        let shortcutKey = 'F2'
        
        if (result && result.ok && result.settings) {
          shouldEnable = result.settings.showWindowShortcutEnabled === true
          shortcutKey = result.settings.showWindowShortcut || 'F2'
          console.log('[main] 从设置读取的 showWindowShortcutEnabled:', shouldEnable)
        } else {
          console.log('[main] 未找到设置，默认不启用 F2 快捷键')
        }
        
        if (shouldEnable) {
          console.log('[main] 启用 F2 快捷键')
          shortcuts.updateShowWindowShortcut(
            shortcutKey,
            () => mainWindowModule.getMainWindow(),
            () => mainWindowModule.showAndFocusMainWindow()
          )
        } else {
          console.log('[main] 不启用 F2 快捷键')
          // 确保不注册任何快捷键
          shortcuts.updateShowWindowShortcut(
            '',
            () => mainWindowModule.getMainWindow(),
            () => mainWindowModule.showAndFocusMainWindow()
          )
        }
      } catch (error) {
        console.error('[main] 初始化 F2 快捷键失败:', error)
        // 出错时默认不启用
        shortcuts.updateShowWindowShortcut(
          '',
          () => mainWindowModule.getMainWindow(),
          () => mainWindowModule.showAndFocusMainWindow()
        )
      }
    }
    
    // 执行初始化
    initializeShowWindowShortcut()
    
    // 初始化自动更新
    autoUpdaterService.initAutoUpdater(
      autoUpdater,
      () => mainWindowModule.getMainWindow(),
      (options) => systemTray.displayBalloon(options),
      dialog,
      isDev
    )
    
    // 注册自动更新相关的 IPC 处理器
    autoUpdaterService.registerIpcHandlers(ipcMain, autoUpdater, isDev, () => mainWindowModule.getMainWindow())
    
    // 启动 HTTP API 服务器
    apiServer.startHttpServer()

    // 在 macOS 上，当单击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else {
        // 如果窗口存在，显示并聚焦
        mainWindowModule.showAndFocusMainWindow()
      }
    })
  })
}

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在这个文件中，你可以包含应用程序其余的主进程代码
// 也可以拆分成几个文件，然后用 require 导入

// 监听子进程崩溃（包括 GPU），记录并给出建议
app.on('child-process-gone', (event, details) => {
  if (details && details.type === 'GPU') {
    console.error('GPU process crashed:', details)
    const msg = '检测到 GPU 进程崩溃，已启用稳定化标志。如仍复现，可使用 GRM_DISABLE_GPU=1 重新启动以禁用 GPU。'
    const mainWindow = mainWindowModule.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gpu-crashed', { message: msg, details })
    }
  }
})

// 安全相关：防止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    // 可以在这里处理新窗口的创建逻辑
  })
})

// 对话框相关的 IPC 处理器已迁移到 js/ipc/dialog-handlers.js
// 在 app.whenReady() 中通过 dialogHandlers.registerIpcHandlers() 注册
// IPC 处理器已迁移：
// - select-executable-file
// - select-image-file
// - select-screenshot-image
// - select-folder
// - select-video-file
// - select-audio-file
// - select-novel-file

// IPC处理程序

// 视频窗口相关的 IPC 处理器已迁移到 js/window/video-window.js
// 在 app.whenReady() 中通过 videoWindowModule.registerIpcHandlers() 注册


// 游戏进程管理相关功能已迁移到 js/services/game-process.js
// 在 app.whenReady() 中通过 gameProcess.registerIpcHandlers() 注册

// 保留空的注释块以便查找相关代码位置
// IPC 处理器已迁移到 game-process.js:
// - launch-game
// - terminate-game
// - get-all-window-titles-by-pid

// 系统信息相关的 IPC 处理器已迁移到 js/ipc/system-handlers.js
// 在 app.whenReady() 中通过 systemHandlers.registerIpcHandlers() 注册
// IPC 处理器已迁移：
// - get-app-version
// - get-system-info
// - get-disk-info
// - get-disk-type-by-path
// - show-notification
// - open-external

// 获取所有物理磁盘信息（已迁移到 system-handlers.js）

// 截图功能已迁移到 js/services/screenshot.js
// 在 app.whenReady() 中通过 screenshot.registerIpcHandlers() 注册

// IPC 处理器已迁移到 screenshot.js:
// - take-screenshot
// - get-screenshots-directory
// - set-screenshots-directory
// - get-available-windows
// - get-active-window

// 获取存档文件夹目录
// 设置相关的 IPC 处理器已迁移到 js/ipc/settings-handlers.js
// 在 app.whenReady() 中通过 settingsHandlers.registerIpcHandlers() 注册
// IPC 处理器已迁移：
// - get-save-data-directory
// - set-save-data-directory
// - set-auto-start
// - get-auto-start

// 设置存档文件夹目录（已迁移到 settings-handlers.js）



// 快捷键管理相关功能已迁移到 js/services/shortcuts.js
// 在 app.whenReady() 中通过 shortcuts.registerIpcHandlers() 注册

// IPC 处理器已迁移到 shortcuts.js:
// - update-global-shortcut
// - check-global-shortcut-available
// - set-safety-key

// minimizeWindowByPID 函数已迁移到 js/utils/windows-utils.js
// 使用 windowsUtils.minimizeWindowByPID()

// minimizeAllGameWindows 函数已迁移到 js/services/game-process.js
// 使用 gameProcess.minimizeAllGameWindows()



// 文件操作相关的 IPC 处理器已迁移到 js/ipc/file-handlers.js
// 在 app.whenReady() 中通过 fileHandlers.registerIpcHandlers() 注册
// IPC 处理器已迁移：
// - write-json-file
// - read-json-file
// - delete-file
// - ensure-directory
// - write-file
// - save-thumbnail
// - list-files
// - get-file-stats
// - read-text-file
// - open-file-folder
// - check-file-exists
// - get-folder-size
// - list-image-files
// - backup-save-data-directory







// 系统托盘相关的IPC处理程序已迁移到 js/tray/system-tray.js
// 在 app.whenReady() 中通过 systemTray.registerIpcHandlers() 注册

// 应用退出时注销快捷键和销毁托盘
app.on('will-quit', () => {
  shortcuts.unregisterAllShortcuts()
  // 销毁系统托盘
  systemTray.destroyTray()
  // 关闭 HTTP 服务器
  apiServer.stopHttpServer()
})

// 自动更新相关功能已迁移到 js/services/auto-updater.js
// 在 app.whenReady() 中通过 autoUpdaterService.initAutoUpdater() 和 autoUpdaterService.registerIpcHandlers() 初始化

// IPC 处理器已迁移到 auto-updater.js:
// - check-for-updates
// - quit-and-install
