/**
 * @module Screenshot
 * @description 管理应用程序的截图功能，包括窗口截图、截图目录管理和窗口列表获取。
 *
 * 主要功能:
 * 1. 截取当前聚焦窗口的截图，支持多种格式（PNG、JPEG、WebP）和质量设置。
 * 2. 根据运行中的游戏信息自动匹配窗口标题，并按游戏名称组织截图文件夹。
 * 3. 过滤系统窗口和通知窗口，只截取应用程序窗口。
 * 4. 管理截图保存目录，支持自定义目录设置。
 * 5. 获取可用窗口列表和当前活跃窗口信息。
 * 6. 注册与截图相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, getMainWindow, app)`: 注册 IPC 处理器。
 *
 * 内部函数:
 * - `takeScreenshot(customDirectory, format, quality, runningGamesInfo, app)`: 执行截图操作。
 * - `renameScreenshotFolderIfNeeded(baseScreenshotsDir, gameId, expectedFolderName)`: 查找并重命名游戏截图文件夹（如果需要）。
 * - `getScreenshotsDirectory(app)`: 获取默认截图目录。
 * - `setScreenshotsDirectory(getMainWindow, dialog)`: 设置截图目录。
 * - `getAvailableWindows(desktopCapturer)`: 获取可用窗口列表。
 * - `getActiveWindow(desktopCapturer)`: 获取当前活跃窗口。
 *
 * IPC 处理器:
 * - `take-screenshot`: 执行截图操作。
 * - `get-screenshots-directory`: 获取截图保存目录。
 * - `set-screenshots-directory`: 设置截图保存目录。
 * - `get-available-windows`: 获取可用窗口列表。
 * - `get-active-window`: 获取当前活跃窗口。
 *
 * 截图功能特性:
 * - 自动识别游戏窗口（通过窗口标题匹配）。
 * - 游戏名对不上窗口时（如 MTool / NW.js），按聚焦窗口、最大窗口、当前活动窗口依次兜底。
 * - 按游戏名称或窗口名称组织截图文件夹。
 * - 支持 PNG（无损）、JPEG（有损）、WebP（有损）格式。
 * - 可配置的图片质量（仅适用于 JPEG 和 WebP）。
 * - 自动创建截图保存目录。
 * - 使用时间戳生成唯一的文件名。
 */

const { desktopCapturer, BrowserWindow, nativeImage, protocol, session, app, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const windowsUtils = require('../utils/windows-utils')

/**
 * 捕获页必须是安全来源，否则浏览器不提供 mediaDevices，单窗口抓取会直接失败。
 * 这个注册只能在 app ready 之前做，所以放在模块加载时。
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'grm-capture',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
])

/** 捕获页协议是否已经挂上。 */
let captureProtocolReady = false

/**
 * 隐藏的捕获窗口。只创建一次，避免每次截图都新开一个窗口再吃掉几百毫秒。
 * @type {BrowserWindow|null}
 */
let captureWindow = null

/**
 * 捕获任务排队。全局快捷键连按时不能两个画面同时抢这一个窗口。
 * @type {Promise<void>}
 */
let captureQueue = Promise.resolve()

/**
 * 查找并重命名游戏截图文件夹（如果需要）
 * 查找以 gameId_ 开头的文件夹，如果名称不匹配则重命名为新名称
 * @param {string} baseScreenshotsDir - 基础截图目录
 * @param {string} gameId - 游戏ID
 * @param {string} expectedFolderName - 期望的文件夹名称（格式：ID_游戏名）
 * @returns {{screenshotsDir: string, foundExistingFolder: boolean}} 返回最终的文件夹路径和是否找到现有文件夹
 */
function renameScreenshotFolderIfNeeded(baseScreenshotsDir, gameId, expectedFolderName) {
  const expectedScreenshotsDir = path.join(baseScreenshotsDir, expectedFolderName)
  let screenshotsDir = expectedScreenshotsDir
  let foundExistingFolder = false

  try {
    if (fs.existsSync(baseScreenshotsDir)) {
      const files = fs.readdirSync(baseScreenshotsDir)
      // 清理游戏ID中的非法字符，用于匹配
      const cleanGameId = gameId.replace(/[<>:"/\\|?*]/g, '_').trim()
      
      // 查找所有以 gameId_ 开头的文件夹
      const matchingFolder = files.find(folder => {
        const folderPath = path.join(baseScreenshotsDir, folder)
        const stats = fs.statSync(folderPath)
        return stats.isDirectory() && folder.startsWith(`${cleanGameId}_`)
      })

      if (matchingFolder) {
        const existingFolderPath = path.join(baseScreenshotsDir, matchingFolder)
        console.log(`找到以ID开头的截图文件夹: ${matchingFolder}`)
        
        // 如果找到的文件夹名称与期望的不一致，重命名它
        if (matchingFolder !== expectedFolderName) {
          try {
            fs.renameSync(existingFolderPath, expectedScreenshotsDir)
            console.log(`✅ 已重命名截图文件夹: "${matchingFolder}" -> "${expectedFolderName}"`)
            screenshotsDir = expectedScreenshotsDir
          } catch (renameError) {
            console.warn(`⚠️ 重命名截图文件夹失败:`, renameError.message)
            // 重命名失败，使用现有文件夹
            screenshotsDir = existingFolderPath
          }
        } else {
          screenshotsDir = existingFolderPath
        }
        foundExistingFolder = true
      }
    }
  } catch (error) {
    console.warn('查找截图文件夹失败:', error.message)
  }

  return { screenshotsDir, foundExistingFolder }
}

/**
 * 截图兜底时要避开的窗口关键词。
 * MTool（NW.js）启动游戏后，游戏窗口标题经常对不上存档里的名字。
 * 这时不能按列表随便抓一个窗口，否则会截到显卡叠加层、浏览器、编辑器、聊天软件或 MTool 自己。
 * 比较时不区分大小写，窗口标题包含其中任一关键词就会被排除。
 */
const FALLBACK_WINDOW_BLACKLIST = [
  'nvidia',
  'overlay',
  'visual studio code',
  'chrome',
  'edge',
  'mtool',
  'green resource manager',
  'butter manager',
  'program manager',
  'qq',
  '微信',
  'wechat',
  '钉钉',
  'dingtalk',
  'wallpaper engine'
]

/**
 * 判断窗口标题是否命中截图兜底黑名单。
 * @param {string} name 窗口标题
 * @returns {boolean} 命中黑名单时返回 true
 */
function isFallbackWindowBlacklisted(name) {
  const lowerName = String(name || '').toLowerCase()
  return FALLBACK_WINDOW_BLACKLIST.some(keyword => lowerName.includes(keyword))
}

/**
 * 判断两个窗口标题是否指向同一个窗口。
 * desktopCapturer 不提供 PID，只能靠标题完全相同或互相包含，对上系统报出的聚焦窗口。
 * @param {string} sourceName 捕获源里的窗口标题
 * @param {string} focusedName 系统前台窗口标题
 * @returns {boolean} 视为同一窗口时返回 true
 */
function windowTitlesReferToSameWindow(sourceName, focusedName) {
  const left = String(sourceName || '').trim()
  const right = String(focusedName || '').trim()
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

/**
 * 按缩略图面积选出最大的窗口。
 * 名字对不上时，全屏游戏通常就是面积最大的那个，比按列表顺序更不容易截错。
 * @param {Electron.DesktopCapturerSource[]} windowSources 候选窗口
 * @returns {Electron.DesktopCapturerSource|null} 面积最大的窗口，没有候选时返回 null
 */
function pickLargestWindowSource(windowSources) {
  if (!windowSources.length) return null
  return windowSources.reduce((largest, source) => {
    const largestSize = largest.thumbnail.getSize()
    const currentSize = source.thumbnail.getSize()
    const largestArea = largestSize.width * largestSize.height
    const currentArea = currentSize.width * currentSize.height
    return currentArea > largestArea ? source : largest
  })
}

/**
 * 决定兜底截图记到哪一个正在运行的游戏上。
 * 优先记到 PID 与当前聚焦窗口一致的游戏，避免存进另一个同时开着的游戏文件夹。
 * @param {Object} runningGamesInfo 运行中的游戏信息
 * @param {number|null} focusedWindowPID 当前聚焦窗口的进程号
 * @returns {[string, Object]|null} [游戏 ID, 游戏数据]，没有运行中的游戏时返回 null
 */
function pickFallbackRunningGame(runningGamesInfo, focusedWindowPID) {
  const runningGameEntries = Object.entries(runningGamesInfo)
  if (runningGameEntries.length === 0) return null
  const focusedEntry = runningGameEntries.find(([, gameData]) => focusedWindowPID && gameData.pid === focusedWindowPID)
  return focusedEntry || runningGameEntries[0]
}

/**
 * 打印当前能看到的全部窗口，方便对照 NW.js 游戏真实的窗口标题。
 * @param {Electron.DesktopCapturerSource[]} sources 全部窗口源
 */
function logAllWindowSources(sources) {
  console.log('====== 所有窗口列表 ======')
  sources.forEach((source, index) => {
    const size = source.thumbnail.getSize()
    const area = size.width * size.height
    console.log(`  [${index}] "${source.name}" → ${size.width} x ${size.height}（面积 ${area}）`)
  })
  console.log('==========================')
}

/**
 * 按游戏名匹配不到窗口时，选出真正该截的那个窗口。
 * 顺序固定为三步：当前聚焦窗口（排除黑名单）→ 面积最大的非黑名单窗口 → 当前活动窗口。
 * 前两步避开叠加层和聊天软件；前两步都没有时，仍截当前活动窗口，避免直接失败。
 * @param {Object} params
 * @param {Electron.DesktopCapturerSource[]} params.sources 全部窗口源
 * @param {Electron.DesktopCapturerSource[]} params.nonSystemWindows 已去掉系统窗口的列表
 * @param {string|null} params.focusedWindowTitle 当前聚焦窗口标题
 * @returns {Electron.DesktopCapturerSource|null} 选中的窗口，一个都没有时返回 null
 */
function pickFallbackScreenshotSource({ sources, nonSystemWindows, focusedWindowTitle }) {
  logAllWindowSources(sources)

  if (focusedWindowTitle) {
    const focusedSource = nonSystemWindows.find(source =>
      windowTitlesReferToSameWindow(source.name, focusedWindowTitle)
    )
    if (focusedSource && !isFallbackWindowBlacklisted(focusedSource.name)) {
      console.log(`  ✅ 兜底：采用当前聚焦窗口: "${focusedSource.name}"`)
      return focusedSource
    }
    if (focusedSource) {
      console.log(`  ⚠️ 聚焦窗口 "${focusedSource.name}" 命中黑名单，跳过`)
    } else {
      console.log('  ⚠️ 未在非系统窗口中找到聚焦窗口，回退到按面积选最大')
    }
  }

  const matchedSources = nonSystemWindows.filter(source => !isFallbackWindowBlacklisted(source.name))
  console.log(`  📐 排除黑名单后，候选窗口 ${matchedSources.length} 个:`)
  matchedSources.forEach(source => {
    const size = source.thumbnail.getSize()
    const area = size.width * size.height
    console.log(`     - "${source.name}" → ${size.width} x ${size.height}（面积 ${area}）`)
  })

  const largestSource = pickLargestWindowSource(matchedSources)
  if (largestSource) {
    console.log(`  ✅ 兜底：选择面积最大的窗口: "${largestSource.name}"`)
    return largestSource
  }

  console.log('  ⚠️ 未找到候选窗口，改用当前前台活动窗口')
  if (nonSystemWindows.length > 0) {
    const activeSource = nonSystemWindows[0]
    console.log(`  ✅ 兜底：使用当前活动窗口: "${activeSource.name}"`)
    return activeSource
  }

  return null
}

/**
 * 过滤系统窗口和通知窗口，返回非系统窗口列表。
 * @param {Array} sources - 窗口源列表。
 * @returns {Array} 过滤后的非系统窗口列表。
 */
function filterSystemWindows(sources) {
  return sources.filter(source => {
    const name = source.name.toLowerCase()
    return !name.includes('desktop') &&
           !name.includes('taskbar') &&
           !name.includes('start menu') &&
           !name.includes('butter manager') &&
           !name.includes('electron') &&
           !name.includes('chrome') &&
           !name.includes('browser') &&
           !name.includes('system') &&
           !name.includes('windows') &&
           !name.includes('notification') &&
           !name.includes('通知') &&
           !name.includes('新通知') &&
           !name.includes('electron.app.electron')
  })
}

/**
 * 列出窗口时不要带画面。
 * desktopCapturer 会按 thumbnailSize 给每一个窗口出一张图。设成 1920×1080 时，
 * 桌面上每一个窗口都会先被整帧抓下来，窗口一多就要将近 3 秒，而最后只用其中一张。
 * 宽高都为 0 表示只要窗口名字和 id，用来对上游戏窗口。
 * @returns {Promise<Electron.DesktopCapturerSource[]>}
 */
async function listWindowSources() {
  return desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  })
}

/**
 * 准备用来抓单个窗口的隐藏页。
 * 必须关沙箱并允许媒体权限，否则 getUserMedia 拿不到 desktopCapturer 给出的源。
 * @returns {Promise<BrowserWindow>}
 */
async function ensureCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    return captureWindow
  }
  captureWindow = new BrowserWindow({
    show: false,
    width: 2,
    height: 2,
    skipTaskbar: true,
    focusable: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: false,
      backgroundThrottling: false,
      partition: 'screenshot-capture'
    }
  })
  captureWindow.on('closed', () => {
    captureWindow = null
  })
  const captureSession = session.fromPartition('screenshot-capture')
  captureSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'display-capture')
  })
  captureSession.setPermissionCheckHandler(() => true)
  if (!captureProtocolReady) {
    captureSession.protocol.registerStringProtocol('grm-capture', (_request, callback) => {
      callback({ mimeType: 'text/html', data: '<!doctype html><title>capture</title>' })
    })
    captureProtocolReady = true
  }
  await captureWindow.loadURL('grm-capture://local/index.html')
  return captureWindow
}

/**
 * 只抓已经认准的那一个窗口。
 * 以前的缩略图接口会把所有窗口都抓一遍；这里用源 id 让系统只回这一帧。
 * @param {string} sourceId desktopCapturer 返回的窗口源 id
 * @returns {Promise<Electron.NativeImage>}
 */
async function captureWindowNativeImage(sourceId) {
  const run = captureQueue.then(() => captureWindowNativeImageNow(sourceId))
  captureQueue = run.then(() => {}, () => {})
  return run
}

/**
 * 实际抓取一帧。失败时关掉隐藏窗口，下次重新建，避免卡在一个坏页面上。
 * @param {string} sourceId 窗口源 id
 * @returns {Promise<Electron.NativeImage>}
 */
async function captureWindowNativeImageNow(sourceId) {
  const win = await ensureCaptureWindow()
  const startedAt = Date.now()
  try {
    const dataUrl = await win.webContents.executeJavaScript(`
      (async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: ${JSON.stringify(sourceId)}
            }
          }
        })
        const video = document.createElement('video')
        video.srcObject = stream
        video.muted = true
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject(new Error('窗口画面加载失败'))
        })
        await video.play()
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        stream.getTracks().forEach((track) => track.stop())
        return canvas.toDataURL('image/png')
      })()
    `, true)
    const image = nativeImage.createFromDataURL(dataUrl)
    if (image.isEmpty()) {
      throw new Error('截到的画面是空的')
    }
    console.log('[截图] 单窗口捕获耗时', Date.now() - startedAt, 'ms，尺寸', image.getSize())
    return image
  } catch (error) {
    console.warn('[截图] 单窗口捕获失败，改回整表缩略图:', error.message)
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.destroy()
      captureWindow = null
    }
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
      fetchWindowIcons: false
    })
    const matched = sources.find((source) => source.id === sourceId)
    if (!matched || matched.thumbnail.isEmpty()) {
      throw error
    }
    return matched.thumbnail
  }
}

/**
 * 执行截图操作。
 * 
 * 截图逻辑（修正版）：
 * 1. 先找到所有运行中的游戏的窗口
 * 2. 获取当前聚焦窗口的 PID（用于判断哪个游戏窗口被聚焦）
 * 3. 在所有游戏窗口中，找到正在被聚焦的那个
 * 4. 截图聚焦的游戏窗口
 * 5. 如果没有聚焦的游戏窗口，但只有一个游戏在运行，截图那个游戏
 * 6. 按游戏名一个窗口都匹配不到时，改用聚焦窗口、最大非黑名单窗口、当前活动窗口兜底
 * 
 * @param {string|null} customDirectory - 自定义截图目录。
 * @param {string} format - 图片格式（png、jpg、jpeg、webp）。
 * @param {number} quality - 图片质量（1-100，仅适用于 JPEG 和 WebP）。
 * @param {Object} runningGamesInfo - 运行中的游戏信息对象。每个游戏包含 pid、windowTitles、gameName 等字段。
 * @param {Object} appInstance - Electron app 实例。
 * @returns {Promise<{success: boolean, filepath?: string, filename?: string, windowName?: string, gameFolder?: string, screenshotsDir?: string, matchedGame?: string, error?: string}>} 截图结果。
 */
async function takeScreenshot(customDirectory, format = 'png', quality = 90, runningGamesInfo = {}, appInstance) {
  try {
    console.log('开始截图，格式:', format, '质量:', quality, '运行中的游戏信息:', runningGamesInfo)

    // 检查是否有运行中的游戏
    if (!runningGamesInfo || Object.keys(runningGamesInfo).length === 0) {
      throw new Error('没有运行中的游戏')
    }

    // 只取窗口名单。整帧画面留到认准目标窗口之后再抓。
    const listedAt = Date.now()
    const sources = await listWindowSources()
    console.log('[截图] 列出窗口耗时', Date.now() - listedAt, 'ms，数量', sources.length)

    if (sources.length === 0) {
      throw new Error('无法获取窗口源')
    }

    // 过滤掉系统窗口和通知窗口
    const nonSystemWindows = filterSystemWindows(sources)

    // 先用启动游戏时记下的标题匹配。只有一个游戏对上时，不必再问系统谁在前台。
    // 问前台窗口会启动 PowerShell，每次都要一两秒，这是截图发闷的另一个原因。
    let focusedWindowPID = null
    let focusedWindowTitle = null

    // 添加调试：打印所有窗口源
    console.log('------------------------------')
    console.log('所有可用窗口源 (共', sources.length, '个):')
    sources.slice(0, 20).forEach((source, index) => {
      console.log(`  [${index}] "${source.name}" (长度: ${source.name.length})`)
    })
    if (sources.length > 20) {
      console.log(`  ... 还有 ${sources.length - 20} 个窗口`)
    }
    console.log('------------------------------')

    // 第一步：找到所有运行中游戏的窗口
    const gameWindows = [] // [{ gameId, gameData, windowTitle, source, isFocused }]

    for (const [gameId, gameData] of Object.entries(runningGamesInfo)) {
      const gamePid = gameData.pid
      const gameWindowTitles = gameData.windowTitles || []
      const gameName = gameData.gameName || gameId

      console.log(`查找游戏 "${gameName}" (PID: ${gamePid}) 的窗口...`)
      console.log(`  游戏窗口标题列表 (共 ${gameWindowTitles.length} 个):`)
      gameWindowTitles.forEach((title, index) => {
        console.log(`    [${index}] "${title}" (长度: ${title.length}, 字符编码: ${JSON.stringify(title)})`)
      })

      // 检查游戏的 PID 是否匹配聚焦窗口的 PID（如果匹配，说明该游戏的某个窗口是聚焦的）
      const gamePidMatchesFocused = focusedWindowPID && gamePid === focusedWindowPID

      // 不再为每个游戏另开 PowerShell 问标题。启动时已经记下窗口标题，对不上再走后面的兜底。
      let pidWindowTitles = []

      // 合并窗口标题列表（优先使用PID获取的标题）
      const allWindowTitles = [...new Set([...pidWindowTitles, ...gameWindowTitles])]
      
      // 在窗口源中查找匹配的游戏窗口
      let matchedSource = null
      let matchedWindowTitle = null
      
      for (const windowTitle of allWindowTitles) {
        // 尝试多种匹配方式来处理编码问题
        
        // 方式1：严格匹配
        matchedSource = sources.find(source => source.name === windowTitle)
        
        // 方式2：如果严格匹配失败，尝试包含匹配（处理编码问题或标题变化）
        if (!matchedSource) {
          matchedSource = sources.find(source => {
            // 去除首尾空格后比较
            const sourceNameNormalized = source.name.trim()
            const windowTitleNormalized = windowTitle.trim()
            
            // 完全匹配
            if (sourceNameNormalized === windowTitleNormalized) return true
            
            // 包含匹配（任一方向）
            if (sourceNameNormalized.includes(windowTitleNormalized) || 
                windowTitleNormalized.includes(sourceNameNormalized)) {
              return true
            }
            
            // 尝试解码后匹配（处理可能的编码问题）
            try {
              // 如果窗口标题包含非ASCII字符，可能是编码问题
              // 尝试将两个字符串都转换为UTF-8后再比较
              const sourceBuffer = Buffer.from(sourceNameNormalized, 'utf8')
              const titleBuffer = Buffer.from(windowTitleNormalized, 'utf8')
              
              // 如果缓冲区相同，说明是编码显示问题但实际相同
              if (sourceBuffer.equals(titleBuffer)) return true
              
              // 尝试包含匹配（缓冲区层面）
              if (sourceBuffer.includes(titleBuffer) || titleBuffer.includes(sourceBuffer)) {
                return true
              }
            } catch (e) {
              // 编码转换失败，忽略
            }
            
            return false
          })
        }
        
        if (matchedSource) {
          matchedWindowTitle = windowTitle
          break // 找到匹配的窗口，退出循环
        }
      }
      
      // 如果仍然没找到，但PID匹配聚焦窗口，尝试使用PID获取的标题再次匹配
      if (!matchedSource && gamePidMatchesFocused && pidWindowTitles.length > 0) {
        console.log(`  🔄 窗口标题匹配失败，但PID匹配聚焦窗口，尝试使用PID获取的标题匹配`)
        for (const pidTitle of pidWindowTitles) {
          matchedSource = sources.find(source => {
            const sourceNameNormalized = source.name.trim()
            const pidTitleNormalized = pidTitle.trim()
            return sourceNameNormalized === pidTitleNormalized ||
                   sourceNameNormalized.includes(pidTitleNormalized) ||
                   pidTitleNormalized.includes(sourceNameNormalized)
          })
          if (matchedSource) {
            matchedWindowTitle = pidTitle
            break
          }
        }
      }
      
      // 如果仍然没找到，但PID匹配聚焦窗口，尝试通过部分字符匹配（处理编码问题）
      if (!matchedSource && gamePidMatchesFocused) {
        console.log(`  🔄 窗口标题完全匹配失败，但PID匹配聚焦窗口，尝试部分字符匹配`)
        // 尝试从已知的窗口标题中提取可打印的ASCII字符进行匹配
        for (const windowTitle of allWindowTitles) {
          // 提取可打印的ASCII字符（去除乱码）
          const asciiChars = windowTitle.replace(/[^\x20-\x7E]/g, '').trim()
          if (asciiChars.length > 0) {
            matchedSource = sources.find(source => {
              const sourceNameNormalized = source.name.trim()
              // 检查是否包含这些ASCII字符
              return sourceNameNormalized.includes(asciiChars) || 
                     asciiChars.includes(sourceNameNormalized.replace(/[^\x20-\x7E]/g, '').trim())
            })
            if (matchedSource) {
              matchedWindowTitle = windowTitle
              console.log(`  ✅ 通过部分字符匹配找到窗口: "${asciiChars}" -> "${matchedSource.name}"`)
              break
            }
          }
        }
      }
      
      // 如果仍然没找到，但PID匹配聚焦窗口，尝试使用非系统窗口中的第一个（作为最后的备用方案）
      if (!matchedSource && gamePidMatchesFocused && nonSystemWindows.length > 0) {
        console.log(`  ⚠️ 窗口标题匹配完全失败，但PID匹配聚焦窗口，使用第一个非系统窗口作为备用方案`)
        // 检查是否有其他游戏已经匹配了这个窗口
        const alreadyMatched = gameWindows.some(gw => gw.source.id === nonSystemWindows[0].id)
        if (!alreadyMatched) {
          matchedSource = nonSystemWindows[0]
          matchedWindowTitle = matchedSource.name
          console.log(`  ✅ 使用备用窗口: "${matchedWindowTitle}"`)
        }
      }
        
      if (matchedSource) {
          console.log(`  ✅ 找到匹配的窗口: "${matchedWindowTitle}" -> "${matchedSource.name}"`)
          
          // 判断这个窗口是否是聚焦窗口
          // 方式1：如果游戏的PID匹配聚焦窗口的PID，并且窗口标题也匹配，则确定是聚焦窗口
          // 方式2：如果窗口标题直接匹配聚焦窗口的标题，也是聚焦窗口
          let isFocused = false
          if (gamePidMatchesFocused) {
            // 如果PID匹配，检查窗口标题是否匹配（使用灵活的匹配方式）
            if (focusedWindowTitle) {
              const sourceNameNormalized = matchedSource.name.trim()
              const focusedTitleNormalized = focusedWindowTitle.trim()
              
              if (sourceNameNormalized === focusedTitleNormalized ||
                  sourceNameNormalized.includes(focusedTitleNormalized) ||
                  focusedTitleNormalized.includes(sourceNameNormalized)) {
                isFocused = true
                console.log(`  ✅ 游戏窗口通过 PID + 窗口标题匹配到聚焦窗口`)
              }
            } else {
              // PID匹配但无法获取聚焦窗口标题，假设是聚焦的
              isFocused = true
              console.log(`  ✅ 游戏窗口通过 PID 匹配到聚焦窗口`)
            }
          } else if (focusedWindowTitle) {
            // PID不匹配，尝试通过窗口标题匹配
            const sourceNameNormalized = matchedSource.name.trim()
            const focusedTitleNormalized = focusedWindowTitle.trim()
            
            if (sourceNameNormalized === focusedTitleNormalized ||
                sourceNameNormalized.includes(focusedTitleNormalized) ||
                focusedTitleNormalized.includes(sourceNameNormalized)) {
              isFocused = true
              console.log(`  ✅ 游戏窗口通过窗口标题匹配到聚焦窗口`)
            }
          }

          gameWindows.push({
            gameId,
            gameData,
            windowTitle: matchedWindowTitle || matchedSource.name,
            source: matchedSource,
            isFocused
          })
          console.log(`  ✅ 添加游戏窗口: "${matchedWindowTitle}" -> "${matchedSource.name}" (聚焦: ${isFocused})`)
        }
      
      // 如果没有找到匹配的窗口，记录日志
      if (!matchedSource) {
        console.log(`  ❌ 未找到匹配的窗口，尝试过的窗口标题:`, allWindowTitles)
      }
    }

    // 多个游戏，或一个标题都没对上时，才查前台窗口。单个已对上的游戏不再付这笔开销。
    if (gameWindows.length !== 1 && process.platform === 'win32') {
      try {
        const foreground = await windowsUtils.getForegroundWindowInfo()
        focusedWindowPID = foreground.pid
        focusedWindowTitle = foreground.title
        console.log('当前聚焦窗口:', focusedWindowPID, focusedWindowTitle)
        gameWindows.forEach((gameWindow) => {
          const samePid = focusedWindowPID && gameWindow.gameData.pid === focusedWindowPID
          const sameTitle = windowTitlesReferToSameWindow(gameWindow.source.name, focusedWindowTitle)
          gameWindow.isFocused = !!(samePid || sameTitle)
        })
      } catch (error) {
        console.warn('获取聚焦窗口失败:', error.message)
        if (nonSystemWindows.length > 0) {
          focusedWindowTitle = nonSystemWindows[0].name
        }
      }
    }

    // 按游戏名和标题都匹配不到时进入兜底。MTool 等 NW.js 启动器的窗口名经常和存档不一致，旧逻辑会直接失败或截到黑屏。
    if (gameWindows.length === 0) {
      console.log('⚠️ 按游戏名未匹配到任何窗口，进入兜底逻辑')
      const fallbackEntry = pickFallbackRunningGame(runningGamesInfo, focusedWindowPID)
      if (fallbackEntry) {
        const [fallbackGameId, fallbackGameData] = fallbackEntry
        const fallbackSource = pickFallbackScreenshotSource({
          sources,
          nonSystemWindows,
          focusedWindowTitle
        })
        if (fallbackSource) {
          gameWindows.push({
            gameId: fallbackGameId,
            gameData: fallbackGameData,
            windowTitle: fallbackSource.name,
            source: fallbackSource,
            isFocused: true
          })
          console.log(`  ✅ 兜底添加截图窗口: "${fallbackSource.name}"`)
        }
      }
    }

    if (gameWindows.length === 0) {
      throw new Error('未找到任何运行中游戏的窗口')
    }

    // 第二步：找到正在被聚焦的游戏窗口
    let targetGameWindow = gameWindows.find(gw => gw.isFocused)

    // 如果没有聚焦的游戏窗口，但只有一个游戏窗口，使用它
    if (!targetGameWindow && gameWindows.length === 1) {
      targetGameWindow = gameWindows[0]
      console.log('⚠️ 没有聚焦的游戏窗口，但只有一个游戏窗口，使用它')
    }
    // 如果有多个游戏窗口但没有聚焦的，选择第一个
    else if (!targetGameWindow && gameWindows.length > 1) {
      console.log('⚠️ 多个游戏窗口但没有聚焦的，选择第一个游戏窗口')
      targetGameWindow = gameWindows[0]
    }

    if (!targetGameWindow) {
      throw new Error('无法确定要截图的游戏窗口')
    }

    const { gameData, windowTitle, source: targetSource, isFocused } = targetGameWindow
    const matchedGameName = gameData.gameName || targetGameWindow.gameId
    const windowName = targetSource.name
    // 获取游戏ID（唯一标识符）
    const gameId = targetGameWindow.gameId || gameData.id || 'unknown'
    const thumbnail = await captureWindowNativeImage(targetSource.id)

    console.log('------------------------------')
    console.log('最终选择截图窗口:')
    console.log('  游戏ID:', gameId)
    console.log('  游戏名称:', matchedGameName)
    console.log('  窗口标题:', windowName)
    console.log('  是否聚焦:', isFocused)
    console.log('------------------------------')

    // 确定截图保存目录
    let baseScreenshotsDir
    if (customDirectory && customDirectory.trim()) {
      baseScreenshotsDir = customDirectory.trim()
    } else {
      baseScreenshotsDir = path.join(appInstance.getPath('documents'), 'Butter Manager', 'Screenshots')
    }

    // 使用 "ID_游戏名" 格式作为文件夹名，既保证唯一性又方便识别
    // 清理非法字符
    const cleanGameId = gameId.replace(/[<>:"/\\|?*]/g, '_').trim()
    const cleanGameName = (matchedGameName || windowName || 'Screenshots').replace(/[<>:"/\\|?*]/g, '_').trim()
    const expectedFolderName = `${cleanGameId}_${cleanGameName}`

    // 查找并重命名截图文件夹（如果需要）
    const { screenshotsDir, foundExistingFolder } = renameScreenshotFolderIfNeeded(
      baseScreenshotsDir,
      gameId,
      expectedFolderName
    )

    // 如果没找到现有文件夹，创建新文件夹
    if (!foundExistingFolder) {
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true })
        console.log('创建游戏截图文件夹:', screenshotsDir)
      }
    }

    // 生成文件名，使用匹配的游戏名称或窗口名称
    // 使用更易读的时间格式：YYYY-MM-DD_HH-MM-SS
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
    
    const fileNameBase = matchedGameName || windowName || 'Screenshot'
    const filename = `${fileNameBase.replace(/[<>:"/\\|?*]/g, '_')}_${timestamp}.${format}`
    const filepath = path.join(screenshotsDir, filename)

    // 根据格式保存截图
    let buffer
    switch (format.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        buffer = thumbnail.toJPEG(quality)
        break
      case 'webp':
        buffer = thumbnail.toWebP(quality)
        break
      case 'png':
      default:
        buffer = thumbnail.toPNG()
        break
    }

    fs.writeFileSync(filepath, buffer)

    console.log('截图已保存:', filepath, '窗口:', targetSource.name)

    // 从 screenshotsDir 中提取文件夹名称
    const gameFolderName = path.basename(screenshotsDir)

    return {
      success: true,
      filepath: filepath,
      filename: filename,
      windowName: windowName,
      gameFolder: gameFolderName,
      screenshotsDir: screenshotsDir,
      matchedGame: matchedGameName || null,
      gameId: gameId || null // 返回游戏ID，用于更新封面图
    }
  } catch (error) {
    console.error('截图失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取默认截图保存目录。
 * @param {Object} appInstance - Electron app 实例。
 * @returns {string} 截图保存目录路径。
 */
function getScreenshotsDirectory(appInstance) {
  return path.join(appInstance.getPath('documents'), 'Butter Manager', 'Screenshots')
}

/**
 * 设置截图保存目录（通过对话框选择）。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} dialogInstance - Electron dialog 实例。
 * @returns {Promise<string|null>} 选择的目录路径或 null。
 */
async function setScreenshotsDirectory(getMainWindow, dialogInstance) {
  try {
    const mainWindow = getMainWindow()
    const result = await dialogInstance.showOpenDialog(mainWindow, {
      title: '选择截图保存目录',
      properties: ['openDirectory', 'createDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  } catch (error) {
    console.error('选择截图目录失败:', error)
    throw error
  }
}

/**
 * 获取可用窗口列表。
 * @returns {Promise<{success: boolean, windows?: Array, error?: string}>} 窗口列表结果。
 */
async function getAvailableWindows() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 200, height: 150 }
    })

    // 过滤掉系统窗口和通知窗口
    const windows = filterSystemWindows(sources)
      .map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))

    return { success: true, windows }
  } catch (error) {
    console.error('获取窗口列表失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取当前激活的窗口信息。
 * @returns {Promise<{success: boolean, window?: Object, error?: string}>} 活跃窗口结果。
 */
async function getActiveWindow() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 200, height: 150 }
    })

    if (sources.length === 0) {
      return { success: false, error: '无法获取窗口信息' }
    }

    // 过滤掉系统窗口和通知窗口，选择第一个（通常是当前激活的）
    const activeWindows = filterSystemWindows(sources)

    if (activeWindows.length > 0) {
      return {
        success: true,
        window: {
          id: activeWindows[0].id,
          name: activeWindows[0].name,
          thumbnail: activeWindows[0].thumbnail.toDataURL()
        }
      }
    }

    return { success: false, error: '未找到活跃窗口' }
  } catch (error) {
    console.error('获取活跃窗口失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册与截图相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} appInstance - Electron app 实例。
 */
function registerIpcHandlers(ipcMain, getMainWindow, appInstance) {
  // 执行截图
  ipcMain.handle('take-screenshot', async (event, customDirectory, format = 'png', quality = 90, runningGamesInfo = {}) => {
    return await takeScreenshot(customDirectory, format, quality, runningGamesInfo, appInstance)
  })

  // 获取截图保存目录
  ipcMain.handle('get-screenshots-directory', () => {
    return getScreenshotsDirectory(appInstance)
  })

  // 设置截图保存目录
  ipcMain.handle('set-screenshots-directory', async () => {
    return await setScreenshotsDirectory(getMainWindow, dialog)
  })

  // 获取可用窗口列表
  ipcMain.handle('get-available-windows', async () => {
    return await getAvailableWindows()
  })

  // 获取当前激活的窗口
  ipcMain.handle('get-active-window', async () => {
    return await getActiveWindow()
  })
}

module.exports = {
  registerIpcHandlers
}

