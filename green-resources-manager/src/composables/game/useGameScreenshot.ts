import { ref, type Ref } from 'vue'
import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'

/**
 * 截图根目录和目录列表都缓存一小段时间。
 * 以前每张游戏卡片各读一次设置、各列一次根目录，几百个游戏时全堵在这上面。
 */
const BASE_PATH_CACHE_TTL = 5_000
const FOLDER_LIST_CACHE_TTL = 5_000
let cachedBasePath: { path: string; expiresAt: number } | null = null
let cachedFolderList: { basePath: string; folders: string[]; expiresAt: number } | null = null
let pendingFolderList: { basePath: string; promise: Promise<string[]> } | null = null

async function resolveBaseScreenshotsPath(): Promise<string> {
  if (cachedBasePath && cachedBasePath.expiresAt > Date.now()) {
    return cachedBasePath.path
  }
  const settings = await saveManager.loadSettings()

  let baseScreenshotsPath = ''
  if (settings.screenshotLocation === 'default') {
    baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
  } else if (settings.screenshotLocation === 'custom') {
    baseScreenshotsPath = settings.screenshotsPath || ''
  } else {
    baseScreenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
  }

  if (!baseScreenshotsPath || baseScreenshotsPath.trim() === '') {
    baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
  }
  cachedBasePath = { path: baseScreenshotsPath, expiresAt: Date.now() + BASE_PATH_CACHE_TTL }
  return baseScreenshotsPath
}

async function listScreenshotFolders(baseScreenshotsPath: string): Promise<string[]> {
  if (cachedFolderList?.basePath === baseScreenshotsPath && cachedFolderList.expiresAt > Date.now()) {
    return cachedFolderList.folders
  }
  if (pendingFolderList?.basePath === baseScreenshotsPath) {
    return pendingFolderList.promise
  }
  const promise = (async () => {
    try {
      const filesResult = await window.electronAPI.listFiles(baseScreenshotsPath)
      const folders = filesResult?.success && Array.isArray(filesResult.files) ? filesResult.files : []
      cachedFolderList = {
        basePath: baseScreenshotsPath,
        folders,
        expiresAt: Date.now() + FOLDER_LIST_CACHE_TTL
      }
      return folders
    } catch (error) {
      console.warn('查找截图文件夹失败:', error)
      return []
    } finally {
      pendingFolderList = null
    }
  })()
  pendingFolderList = { basePath: baseScreenshotsPath, promise }
  return promise
}

/**
 * 获取游戏截图文件夹路径（查找以ID开头的文件夹，找不到则返回期望路径）
 * 这是一个独立的工具函数，可以在任何地方使用
 * @param gameId - 游戏ID
 * @param gameName - 游戏名称
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @returns 截图文件夹路径
 */
export async function getGameScreenshotFolderPath(
  gameId: string,
  gameName: string,
  isElectronEnvironment: boolean = typeof window !== 'undefined' && !!(window as any).electronAPI
): Promise<string> {
  const baseScreenshotsPath = await resolveBaseScreenshotsPath()

  // 永远寻找以ID开头的文件夹，找不到则创建新的
  const cleanGameId = gameId.replace(/[<>:"/\\|?*]/g, '_').trim()
  const cleanGameName = gameName.replace(/[<>:"/\\|?*]/g, '_').trim()
  const expectedFolderName = `${cleanGameId}_${cleanGameName}`
  let gameScreenshotPath = `${baseScreenshotsPath}/${expectedFolderName}`

  // 查找以 gameId_ 开头的文件夹
  if (isElectronEnvironment && window.electronAPI && window.electronAPI.listFiles) {
    const folders = await listScreenshotFolders(baseScreenshotsPath)
    const matchingFolder = folders.find((folder: string) => folder.startsWith(`${cleanGameId}_`))

    if (matchingFolder) {
      const existingFolderPath = `${baseScreenshotsPath}/${matchingFolder}`

      // 如果找到的文件夹名称与期望的不一致，直接重命名它
      if (matchingFolder !== expectedFolderName && window.electronAPI.renameFolder) {
        try {
          const renameResult = await window.electronAPI.renameFolder(existingFolderPath, gameScreenshotPath)
          if (renameResult.success) {
            // 目录列表变了，下一次重新列
            cachedFolderList = null
          } else {
            console.warn(`⚠️ 重命名截图文件夹失败:`, renameResult.error)
            gameScreenshotPath = existingFolderPath
          }
        } catch (error) {
          console.warn('重命名截图文件夹异常:', error)
          gameScreenshotPath = existingFolderPath
        }
      } else if (matchingFolder !== expectedFolderName) {
        gameScreenshotPath = existingFolderPath
      }
    }
  }

  return gameScreenshotPath
}

/**
 * 游戏截图功能的 composable
 */
export function useGameScreenshot(
  isElectronEnvironment: Ref<boolean>,
  getRunningGames: () => Map<string, any>, // 获取运行中游戏的函数
  onScreenshotSuccess?: (result: { gameId?: string; filepath: string }) => void // 截图成功后的回调
) {
  const isScreenshotInProgress = ref(false)
  const lastScreenshotTime = ref(0)

  /**
   * 把本地截图路径转成通知里能显示的地址。
   * 每一段单独编码，中文文件名也不会把预览变成空白。
   * @param filePath 截图文件的本地路径
   * @returns 供 img 使用的地址
   */
  function toScreenshotPreviewUrl(filePath: string): string {
    const normalizedPath = String(filePath || '').replace(/\\/g, '/')
    const encodedPath = normalizedPath.split('/').map(segment => {
      if (/^[A-Za-z]:$/.test(segment)) return segment
      return encodeURIComponent(segment)
    }).join('/')
    return `file:///${encodedPath}`
  }

  /**
   * 播放截图音效
   */
  function playScreenshotSound() {
    try {
      const audio = new Audio('./camera.mp3')
      audio.volume = 1
      audio.play().catch(error => {
        console.warn('播放截图音效失败:', error)
      })
    } catch (error) {
      console.warn('创建音频对象失败:', error)
    }
  }

  /**
   * 获取截图设置
   */
  async function getScreenshotSettings() {
    const settings = await saveManager.loadSettings()
    
    // 根据截图位置设置确定实际路径
    let screenshotsPath = ''
    if (settings.screenshotLocation === 'default') {
      screenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
    } else if (settings.screenshotLocation === 'custom') {
      screenshotsPath = settings.screenshotsPath || ''
    } else {
      // 兼容旧设置
      screenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
    }

    return {
      screenshotsPath,
      format: settings.screenshotFormat || 'png',
      quality: settings.screenshotQuality || 90,
      showNotification: settings.screenshotNotification !== false,
      autoOpenFolder: settings.autoOpenScreenshotFolder || false,
      smartWindowDetection: settings.smartWindowDetection !== false,
      screenshotKey: settings.screenshotKey || 'Ctrl+F12'
    }
  }

  /**
   * 转换运行中游戏信息为可序列化格式
   */
  function serializeRunningGames(runningGamesMap: Map<string, any>) {
    const runningGamesInfo: Record<string, any> = {}
    for (const [gameId, runtimeGameData] of runningGamesMap) {
      const gameData = {
        id: String(runtimeGameData.id),
        pid: Number(runtimeGameData.pid),
        windowTitles: Array.isArray(runtimeGameData.windowTitles)
          ? runtimeGameData.windowTitles.map((title: string) => String(title)).filter((title: string) => title)
          : [],
        gameName: runtimeGameData.gameName ? String(runtimeGameData.gameName) : null,
        startTime: Number(runtimeGameData.startTime)
      }
      runningGamesInfo[String(gameId)] = JSON.parse(JSON.stringify(gameData))
    }
    return runningGamesInfo
  }

  /**
   * 截图功能
   */
  async function takeScreenshot() {
    console.log('[useGameScreenshot] takeScreenshot 被调用')
    // 防止重复截图
    const now = Date.now()
    if (isScreenshotInProgress.value || (now - lastScreenshotTime.value < 1000)) {
      console.log('[useGameScreenshot] 截图请求被忽略：正在截图或距离上次截图时间太短')
      return
    }

    isScreenshotInProgress.value = true
    lastScreenshotTime.value = now

    console.log('开始截图，时间戳:', now)

    try {
      // 获取运行中的游戏信息
      const runningGamesMap = getRunningGames()
      const runningGamesInfo = serializeRunningGames(runningGamesMap)

      // 获取截图设置
      const settings = await getScreenshotSettings()

      console.log('截图设置:', {
        runningGames: runningGamesInfo,
        screenshotLocation: settings.screenshotsPath,
        format: settings.format,
        quality: settings.quality,
        smartWindowDetection: settings.smartWindowDetection
      })

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.takeScreenshot) {
        // 确保截图目录存在
        try {
          if (window.electronAPI.ensureDirectory) {
            const result = await window.electronAPI.ensureDirectory(settings.screenshotsPath)
            if (result.success) {
              console.log('截图目录已确保存在:', settings.screenshotsPath)
            } else {
              console.warn('创建截图目录失败:', result.error)
            }
          }
        } catch (error) {
          console.warn('创建截图目录失败:', error)
        }

        const result = await window.electronAPI.takeScreenshot(
          settings.screenshotsPath,
          settings.format,
          settings.quality,
          runningGamesInfo
        )

        if (result.success) {
          console.log('截图成功:', result.filepath, '窗口:', result.windowName)

          // 播放截图音效
          playScreenshotSound()

          // 调用截图成功回调（用于更新封面图等）
          if (onScreenshotSuccess && result.gameId) {
            try {
              onScreenshotSuccess({
                gameId: result.gameId,
                filepath: result.filepath
              })
            } catch (error) {
              console.warn('执行截图成功回调失败:', error)
            }
          }

          if (settings.showNotification) {
            setTimeout(() => {
              notify.toast(
                'success',
                '截图成功',
                `保存到：${result.filepath}`,
                null,
                {
                  image: toScreenshotPreviewUrl(result.filepath),
                  duration: 6000
                }
              )
            }, 100)
          }

          // 自动打开截图文件夹
          if (settings.autoOpenFolder && isElectronEnvironment.value && window.electronAPI && window.electronAPI.openFolder) {
            try {
              await window.electronAPI.openFolder(result.filepath)
            } catch (error) {
              console.error('打开文件夹失败:', error)
            }
          }
        } else {
          console.error('截图失败:', result.error)
          if (settings.showNotification) {
            setTimeout(() => {
              notify.toast('error', '截图失败', result.error)
            }, 100)
          }
        }
      } else {
        console.log('Electron API不可用，无法截图')
        if (settings.showNotification) {
          setTimeout(() => {
            notify.toast('error', '截图失败', '当前环境不支持截图功能')
          }, 100)
        }
      }
    } catch (error: any) {
      console.error('截图过程中发生错误:', error)
      const settings = await getScreenshotSettings()
      if (settings.showNotification) {
        setTimeout(() => {
          notify.toast('error', '截图失败', error.message)
        }, 100)
      }
    } finally {
      isScreenshotInProgress.value = false
    }
  }

  /**
   * 从资源对象中取原始值（兼容 ResourceField 与普通值）
   */
  function getPrimitive(value: any): string | undefined {
    if (value == null) return undefined
    if (typeof value === 'object' && value !== null && 'value' in value) return value.value
    return String(value)
  }

  /**
   * 打开游戏截图文件夹
   */
  async function openGameScreenshotFolder(game: { id?: string | { value?: string }; name: string | { value?: string }; executablePath?: string }) {
    try {
      const gameId = getPrimitive(game.id)
      const gameName = getPrimitive(game.name) ?? (typeof game.name === 'string' ? game.name : '')
      if (!gameId) {
        throw new Error('游戏ID不存在，无法打开截图文件夹')
      }

      // 使用公共函数获取截图文件夹路径
      const gameScreenshotPath = await getGameScreenshotFolderPath(gameId, gameName, isElectronEnvironment.value)

      console.log('尝试打开游戏截图文件夹:', gameScreenshotPath)

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.openFolder) {
        // 确保目录存在
        try {
          if (window.electronAPI.ensureDirectory) {
            const ensureResult = await window.electronAPI.ensureDirectory(gameScreenshotPath)
            if (ensureResult.success) {
              console.log('游戏截图目录已确保存在:', gameScreenshotPath)
            }
          }
        } catch (error) {
          console.warn('创建游戏截图目录失败:', error)
        }

        const result = await window.electronAPI.openFolder(gameScreenshotPath)
        if (result.success) {
          console.log('游戏截图文件夹已打开:', gameScreenshotPath)
          notify.native('文件夹已打开', `已打开 ${gameName} 的截图文件夹`)
        } else {
          console.error('打开游戏截图文件夹失败:', result.error)
          alert(`打开截图文件夹失败: ${result.error}`)
        }
      } else {
        alert(`${gameName} 的截图文件夹路径:\n${gameScreenshotPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
      }
    } catch (error: any) {
      console.error('打开游戏截图文件夹失败:', error)
      alert(`打开截图文件夹失败: ${error.message}`)
    }
  }

  /**
   * 初始化全局快捷键
   */
  async function initializeGlobalShortcut() {
    try {
      const settings = await getScreenshotSettings()
      const screenshotKey = settings.screenshotKey

      console.log('[useGameScreenshot] 初始化全局快捷键, key:', screenshotKey, ', isElectron:', isElectronEnvironment.value, ', hasUpdateAPI:', !!(window.electronAPI && window.electronAPI.updateGlobalShortcut))

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.updateGlobalShortcut) {
        const result = await window.electronAPI.updateGlobalShortcut(screenshotKey)
        console.log('[useGameScreenshot] updateGlobalShortcut 结果:', result)
        if (result.success) {
          console.log('[useGameScreenshot] 全局快捷键注册成功:', result.key)
        } else {
          console.error('[useGameScreenshot] 全局快捷键注册失败:', result.error)
        }
      } else {
        console.warn('[useGameScreenshot] 未调用 updateGlobalShortcut（非 Electron 或 API 不可用）')
      }
    } catch (error) {
      console.error('[useGameScreenshot] 初始化全局快捷键失败:', error)
    }
  }

  /**
   * 清理全局截图事件监听器
   */
  function cleanupGlobalScreenshotListener() {
    if (isElectronEnvironment.value && window.electronAPI) {
      if (window.electronAPI.removeGlobalScreenshotListener) {
        window.electronAPI.removeGlobalScreenshotListener()
        console.log('清理全局截图事件监听器')
      } else if (window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('global-screenshot-trigger')
        console.log('清理所有全局截图事件监听器')
      }
    }
  }

  return {
    isScreenshotInProgress,
    lastScreenshotTime,
    takeScreenshot,
    playScreenshotSound,
    openGameScreenshotFolder,
    initializeGlobalShortcut,
    cleanupGlobalScreenshotListener
  }
}

