const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  listLogicalDrives: () => ipcRenderer.invoke('list-logical-drives'),
  
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 窗口内容控制
  reloadWindow: () => ipcRenderer.invoke('reload-window'),
  forceReloadWindow: () => ipcRenderer.invoke('force-reload-window'),
  toggleDevTools: () => ipcRenderer.invoke('toggle-dev-tools'),
  setFullscreen: (fullscreen) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  
  // 缩放控制
  setZoomLevel: (zoomLevel) => ipcRenderer.invoke('set-zoom-level', zoomLevel),
  getZoomLevel: () => ipcRenderer.invoke('get-zoom-level'),
  zoomIn: () => ipcRenderer.invoke('zoom-in'),
  zoomOut: () => ipcRenderer.invoke('zoom-out'),
  resetZoom: () => ipcRenderer.invoke('reset-zoom'),
  // 监听应用缩放变化（菜单/快捷键触发时由主进程发送，用于显示“缩放至 XX%”提示）
  onAppZoomChanged: (callback) => {
    const fn = (event, data) => callback(data)
    ipcRenderer.on('app-zoom-changed', fn)
    return () => ipcRenderer.removeListener('app-zoom-changed', fn)
  },
  
  // 文件操作（已移除 openFile 和 saveFile，因为 electron.js 中没有对应的 IPC 处理程序）
  
  // JSON 文件操作
  writeJsonFile: (filePath, data) => ipcRenderer.invoke('write-json-file', filePath, data),
  readJsonFile: (filePath) => ipcRenderer.invoke('read-json-file', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  deleteDirectory: (dirPath) => ipcRenderer.invoke('delete-directory', dirPath),
  ensureDirectory: (dirPath) => ipcRenderer.invoke('ensure-directory', dirPath),
  renameFolder: (oldPath, newPath) => ipcRenderer.invoke('rename-folder', oldPath, newPath),
  
  // 文件操作
  writeFile: (filePath, buffer) => ipcRenderer.invoke('write-file', filePath, buffer),
  saveThumbnail: (filePath, dataUrl) => ipcRenderer.invoke('save-thumbnail', filePath, dataUrl),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  searchMatchingFiles: (rootDir, extensions) => ipcRenderer.invoke('search-matching-files', rootDir, extensions),
  
  // 伪装图片功能
  readDisguiseImages: () => ipcRenderer.invoke('read-disguise-images'),
  getAppRootPath: () => ipcRenderer.invoke('get-app-root-path'),
  
  // 文件选择对话框
  selectExecutableFile: () => ipcRenderer.invoke('select-executable-file'),
  detectLocaleEmulator: () => ipcRenderer.invoke('detect-locale-emulator'),
  selectImageFile: (defaultPath) => ipcRenderer.invoke('select-image-file', defaultPath),
  selectScreenshotImage: (screenshotDir) => ipcRenderer.invoke('select-screenshot-image', screenshotDir),
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  // 根据过滤器数组选择文件（统一入口）
  selectFileWithExtensions: (filters, defaultPath, title) => ipcRenderer.invoke('select-file-with-extensions', filters, defaultPath, title),
  listImageFiles: (folderPath) => ipcRenderer.invoke('list-image-files', folderPath),
  listImageFilesInArchive: (archivePath) => ipcRenderer.invoke('list-image-files-in-archive', archivePath),
  getFolderSize: (filePath) => ipcRenderer.invoke('get-folder-size', filePath),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  
  // 文件URL处理
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),
  // 将本地文件读为 data:URL（用于在 http 源下安全显示本地图片）
  readFileAsDataUrl: (filePath) => ipcRenderer.invoke('read-file-as-data-url', filePath),
  openExternal: (filePath) => ipcRenderer.invoke('open-external', filePath),
  
  // 游戏启动
  launchGame: (executablePath, gameName) => ipcRenderer.invoke('launch-game', executablePath, gameName),
  // 使用转区工具启动游戏（LEProc -run）
  launchGameWithLocale: (localeEmulatorPath, executablePath, gameName) => ipcRenderer.invoke('launch-game-with-locale', localeEmulatorPath, executablePath, gameName),
  // 强制结束游戏
  terminateGame: (executablePath) => ipcRenderer.invoke('terminate-game', executablePath),
  // 通过 PID 获取所有窗口标题
  getAllWindowTitlesByPID: (pid) => ipcRenderer.invoke('get-all-window-titles-by-pid', pid),
  
  // 系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // 磁盘信息
  getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),
  getDiskTypeByPath: (filePath) => ipcRenderer.invoke('get-disk-type-by-path', filePath),
  getLogicalDrivesInfo: () => ipcRenderer.invoke('get-logical-drives-info'),

  // SQLite demo 数据（数据库页面展示）
  sqliteGetAllTablesData: () => ipcRenderer.invoke('sqlite-get-all-tables-data'),
  // 从数据库读取页面数据
  sqliteGetPageData: (pageId) => ipcRenderer.invoke('sqlite-get-page-data', pageId),
  // 保存资源到数据库
  sqliteSaveResource: (resourceType, resource) => ipcRenderer.invoke('sqlite-save-resource', resourceType, resource),
  // 添加资源到页面索引
  sqliteAddResourceToPage: (pageId, resourceType, resourceId) => ipcRenderer.invoke('sqlite-add-resource-to-page', pageId, resourceType, resourceId),
  // 保存页面资源（批量）
  sqliteSavePageResources: (pageId, resources) => ipcRenderer.invoke('sqlite-save-page-resources', pageId, resources),
  // 从数据库删除资源
  sqliteDeleteResource: (tableName, resourceId) => ipcRenderer.invoke('sqlite-delete-resource', tableName, resourceId),
  // 将旧格式 SQL 迁移为 id+jsonData 格式
  sqliteMigrateToJsonFormat: () => ipcRenderer.invoke('sqlite-migrate-to-json-format'),
  // 从 JSON 迁移成就数据到 SQLite
  sqliteMigrateAchievements: (customSaveDataPath) => ipcRenderer.invoke('sqlite-migrate-achievements', customSaveDataPath),
  // 从 JSON 迁移设置数据到 SQLite
  sqliteMigrateSettings: (customSaveDataPath) => ipcRenderer.invoke('sqlite-migrate-settings', customSaveDataPath),
  // 从 SQLite 读取设置数据
  sqliteGetSettings: () => ipcRenderer.invoke('sqlite-get-settings'),
  // 保存设置数据到 SQLite
  sqliteSaveSettings: (settings) => ipcRenderer.invoke('sqlite-save-settings', settings),
  // 从 JSON 迁移用户数据到 SQLite
  sqliteMigrateUser: (customSaveDataPath) => ipcRenderer.invoke('sqlite-migrate-user', customSaveDataPath),
  // 从 SQLite 读取用户数据
  sqliteGetUser: () => ipcRenderer.invoke('sqlite-get-user'),
  // 保存用户数据到 SQLite
  sqliteSaveUser: (user) => ipcRenderer.invoke('sqlite-save-user', user),
  
  // 刮削库数据库操作
  scraperDbImport: (scrapableFieldsByTable, sourceDbPath) => ipcRenderer.invoke('scraper-db-import', scrapableFieldsByTable, sourceDbPath),
  scraperDbGetAll: () => ipcRenderer.invoke('scraper-db-get-all'),
  scraperDbClear: () => ipcRenderer.invoke('scraper-db-clear'),
  scraperDbSearch: (sourceTable, name, resourcePath) => ipcRenderer.invoke('scraper-db-search', sourceTable, name, resourcePath),
  scraperDbApply: (sourceTable, mainResourceId, jsonData) => ipcRenderer.invoke('scraper-db-apply', sourceTable, mainResourceId, jsonData),
  scraperDbReadExternal: (dbPath) => ipcRenderer.invoke('scraper-db-read-external', dbPath),
  scraperDbMerge: (overwrites, adds) => ipcRenderer.invoke('scraper-db-merge', overwrites, adds),
  
  // 获取文件图标
  getFileIcon: (filePath, size) => ipcRenderer.invoke('get-file-icon', filePath, size),
  
  // 检测 WinRAR 是否已安装
  checkWinRARInstalled: () => ipcRenderer.invoke('check-winrar-installed'),
  
  // 解压压缩包文件
  extractArchive: (archivePath, outputDir, password) => ipcRenderer.invoke('extract-archive', archivePath, outputDir, password),
  
  // 测试压缩包密码（不实际解压，只验证密码）
  testArchivePassword: (archivePath, password) => ipcRenderer.invoke('test-archive-password', archivePath, password),
  
  // 压缩文件或文件夹
  compressFile: (sourcePath, archivePath) => ipcRenderer.invoke('compress-file', sourcePath, archivePath),
  
  // 读取常用密码列表
  readArchivePasswords: () => ipcRenderer.invoke('read-archive-passwords'),
  
  // 写入密码列表到文件
  writeArchivePasswords: (passwords) => ipcRenderer.invoke('write-archive-passwords', passwords),
  
  // 通知
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // 截图功能
  takeScreenshot: (directory, format, quality, runningGameNames) => ipcRenderer.invoke('take-screenshot', directory, format, quality, runningGameNames),
  getScreenshotsDirectory: () => ipcRenderer.invoke('get-screenshots-directory'),
  setScreenshotsDirectory: () => ipcRenderer.invoke('set-screenshots-directory'),
  
  // 存档文件夹功能
  getSaveDataDirectory: () => ipcRenderer.invoke('get-save-data-directory'),
  setSaveDataDirectory: () => ipcRenderer.invoke('set-save-data-directory'),
  
  openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),
  getAvailableWindows: () => ipcRenderer.invoke('get-available-windows'),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  updateGlobalShortcut: (newKey) => ipcRenderer.invoke('update-global-shortcut', newKey),
  checkGlobalShortcutAvailable: (key) => ipcRenderer.invoke('check-global-shortcut-available', key),
  updateShowWindowShortcut: (newKey) => ipcRenderer.invoke('update-show-window-shortcut', newKey),
  
  // 选择音频文件
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  
  // 选择小说文件
  selectNovelFile: () => ipcRenderer.invoke('select-novel-file'),
  
  // 读取文本文件内容
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  
  // 打开文件所在文件夹
  openFileFolder: (filePath) => ipcRenderer.invoke('open-file-folder', filePath),
  
  // 打开视频播放窗口
  openVideoWindow: (filePath, options) => ipcRenderer.invoke('open-video-window', filePath, options),
  
  // 开机自启功能
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  
  // 系统托盘功能
  createTray: () => ipcRenderer.invoke('create-tray'),
  destroyTray: () => ipcRenderer.invoke('destroy-tray'),
  setTrayTooltip: (tooltip) => ipcRenderer.invoke('set-tray-tooltip', tooltip),
  setTrayContextMenu: (menuTemplate) => ipcRenderer.invoke('set-tray-context-menu', menuTemplate),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  restoreFromTray: () => ipcRenderer.invoke('restore-from-tray'),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
  getMinimizeToTray: () => ipcRenderer.invoke('get-minimize-to-tray'),
  
  // 自动更新功能
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  
  // 监听事件
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  onAppUpdate: (callback) => ipcRenderer.on('app-update', callback),
  onGameProcessEnded: (callback) => ipcRenderer.on('game-process-ended', callback),
  onGlobalScreenshotTrigger: (callback) => ipcRenderer.on('global-screenshot-trigger', callback),
  onFlashPlayerError: (callback) => ipcRenderer.on('flash-player-error', callback),
  
  // 移除事件监听器
  removeGlobalScreenshotListener: () => ipcRenderer.removeAllListeners('global-screenshot-trigger'),
  removeFlashPlayerErrorListener: () => ipcRenderer.removeAllListeners('flash-player-error'),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // 自动更新事件监听
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  
  // 安全键功能
  setSafetyKey: (enabled, url) => ipcRenderer.invoke('set-safety-key', enabled, url),
  onSafetyKeyTriggered: (callback) => ipcRenderer.on('safety-key-triggered', callback),
  
  // 备份整个存档目录
  backupSaveDataDirectory: (saveDataDir, maxBackups) => ipcRenderer.invoke('backup-save-data-directory', saveDataDir, maxBackups),
  
  // 封面管理
  saveCoverToFolder: (sourceImagePath, saveDataDir, resourceType, resourceId) => ipcRenderer.invoke('save-cover-to-folder', sourceImagePath, saveDataDir, resourceType, resourceId),
  saveCoverFromDataUrl: (dataUrl, saveDataDir, resourceType, resourceId) => ipcRenderer.invoke('save-cover-from-dataurl', dataUrl, saveDataDir, resourceType, resourceId),
  getCoverFullPath: (coverPath, saveDataDir) => ipcRenderer.invoke('get-cover-full-path', coverPath, saveDataDir),
  
  // 桌宠功能
  showPetWindow: () => ipcRenderer.invoke('show-pet-window'),
  hidePetWindow: () => ipcRenderer.invoke('hide-pet-window'),
  togglePetWindow: () => ipcRenderer.invoke('toggle-pet-window'),
  isPetWindowVisible: () => ipcRenderer.invoke('is-pet-window-visible'),
  getPetWindowPosition: () => ipcRenderer.invoke('get-pet-window-position'),
  movePetWindow: (x, y) => ipcRenderer.invoke('move-pet-window', x, y),
  resizePetWindow: (width, height) => ipcRenderer.invoke('resize-pet-window', width, height),
  getPetAffection: () => ipcRenderer.invoke('get-pet-affection'),
  savePetAffection: (affection) => ipcRenderer.invoke('save-pet-affection', affection),
  getPetData: () => ipcRenderer.invoke('get-pet-data'),
  savePetData: (data) => ipcRenderer.invoke('save-pet-data', data),
  // 桌宠窗口缩放
  setPetWindowZoom: (zoomLevel) => ipcRenderer.invoke('set-pet-window-zoom', zoomLevel),
  getPetWindowZoom: () => ipcRenderer.invoke('get-pet-window-zoom'),
  adjustPetWindowZoom: (delta) => ipcRenderer.invoke('adjust-pet-window-zoom', delta),
  // 获取游戏数据（用于收益页面）
  getPetGamesData: () => ipcRenderer.invoke('get-pet-games-data'),
  
  // 标签页管理
  tabCreate: (options) => ipcRenderer.invoke('tab-create', options),
  tabClose: (tabId) => ipcRenderer.invoke('tab-close', { tabId }),
  tabActivate: (tabId) => ipcRenderer.invoke('tab-activate', { tabId }),
  tabGetAll: () => ipcRenderer.invoke('tab-get-all'),
  tabNavigate: (tabId, url) => ipcRenderer.invoke('tab-navigate', { tabId, url }),
  
  // 标签页事件监听
  onTabLoaded: (callback) => ipcRenderer.on('tab-loaded', (event, data) => callback(data)),
  onTabClosed: (callback) => ipcRenderer.on('tab-closed', (event, data) => callback(data)),
  onTabActivated: (callback) => ipcRenderer.on('tab-activated', (event, data) => callback(data)),
  onTabTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (event, data) => callback(data))
})

// 监听来自主进程的消息
ipcRenderer.on('app-ready', () => {
  console.log('Electron应用已准备就绪')
})

// 监听窗口事件
window.addEventListener('DOMContentLoaded', () => {
  console.log('Vue应用已加载完成')
})
