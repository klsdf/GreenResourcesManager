/**
 * 资源 Action Handler 注册系统
 * 将资源操作逻辑与页面解耦，通过资源类型的 handlerName 自动路由到对应的 handler
 */

import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import { isArchiveFile } from '../composables/useArchive'
import notify from './NotificationService.ts'
import saveManager from './SaveManager.ts'
import { normalizeWebUrl } from './webUrl.ts'

/**
 * cbr 是 RAR 漫画包，cbz 是 ZIP 漫画包。
 * 内置阅读器只能直接列 cbz，这两种都允许交给系统默认程序或用户指定的程序。
 */
const COMIC_ARCHIVE_PATTERN = /\.(cbr|cbz)$/i

/**
 * 判断路径是不是 cbr 或 cbz 漫画压缩包。
 * @param filePath 资源路径
 * @returns 扩展名是 .cbr 或 .cbz 时为 true
 */
export function isComicArchivePath(filePath: string | null | undefined): boolean {
  return COMIC_ARCHIVE_PATTERN.test(String(filePath || '').trim())
}

/**
 * 把用户选中的漫画阅读器记到图片设置里。
 * 右键「用指定程序打开」和设置页共用这一项，避免两处各记一个路径。
 * @param programPath 可执行文件路径
 */
async function rememberComicArchiveProgram(programPath: string): Promise<void> {
  const settings = await saveManager.loadSettings()
  if (!settings || typeof settings !== 'object') {
    return
  }
  if (!settings.image || typeof settings.image !== 'object') {
    settings.image = {}
  }
  settings.image.comicArchiveProgramPath = programPath
  const saved = await saveManager.saveSettings(settings)
  if (saved && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('comic-archive-program-selected', { detail: programPath }))
  }
}

/**
 * 用默认程序或指定程序打开 cbr/cbz。
 * 默认程序走系统关联；指定程序用设置里保存的 exe，没有就先让用户选一个。
 * @param resource 漫画资源
 * @param context 页面上下文
 * @param mode default 为系统默认程序，specified 为用户指定的程序
 */
async function openComicArchive(resource: any, context: ActionHandlerContext, mode: 'default' | 'specified'): Promise<void> {
  const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
  const resourcePath = BaseResources.extractPrimitiveValue(
    resource.resourcePath?.value || resource.resourcePath
  )
  if (!resourcePath || !String(resourcePath).trim()) {
    notify.toast('error', '打开失败', `漫画「${resourceName || ''}」没有路径`)
    return
  }
  if (!isComicArchivePath(resourcePath)) {
    notify.toast('warning', '打开失败', '只能用这种方式打开 cbr 或 cbz 漫画压缩包')
    return
  }
  if (!context.isElectronEnvironment || !window.electronAPI) {
    notify.toast('error', '打开失败', '当前环境无法打开漫画压缩包')
    return
  }

  if (context.updateViewInfo) {
    try {
      await context.updateViewInfo(resource)
    } catch (error) {
      console.warn('[ResourceActionHandlers] 更新漫画浏览记录失败:', error)
    }
  }

  if (mode === 'default') {
    const result = await window.electronAPI.openExternal(resourcePath)
    if (result?.success) {
      notify.toast('success', '已用默认程序打开', `「${resourceName || '漫画'}」已交给系统默认程序`)
      if (context.closeDetail) context.closeDetail()
    } else {
      notify.toast('error', '打开失败', result?.error || '系统没有打开这个压缩包')
    }
    return
  }

  const settings = await saveManager.loadSettings()
  /** 设置里记下的外部漫画程序。空着时这次打开会先让用户选。 */
  let programPath = String(settings?.image?.comicArchiveProgramPath || '').trim()
  if (!programPath) {
    if (!window.electronAPI.selectExecutableFile) {
      notify.toast('warning', '还没有指定程序', '请到设置 → 图片里选择用来打开漫画压缩包的程序')
      return
    }
    const selected = await window.electronAPI.selectExecutableFile()
    programPath = String(selected || '').trim()
    if (!programPath) {
      return
    }
    await rememberComicArchiveProgram(programPath)
  }

  if (!window.electronAPI.openFileWithProgram) {
    notify.toast('error', '打开失败', '当前环境不能用指定程序打开文件')
    return
  }
  const result = await window.electronAPI.openFileWithProgram(programPath, resourcePath)
  if (result?.success) {
    notify.toast('success', '已用指定程序打开', `「${resourceName || '漫画'}」已交给指定程序`)
    if (context.closeDetail) context.closeDetail()
  } else {
    notify.toast('error', '打开失败', result?.error || '指定程序没有打开这个压缩包')
  }
}

/**
 * 用系统默认程序打开 cbr/cbz。
 * @param resource 漫画资源
 * @param context 页面上下文
 */
export const openComicArchiveDefaultHandler = async (resource: any, context: ActionHandlerContext) => {
  try {
    await openComicArchive(resource, context, 'default')
  } catch (error: any) {
    console.error('[ResourceActionHandlers] 用默认程序打开漫画失败:', error)
    notify.toast('error', '打开失败', error?.message || '未知错误')
  }
}

/**
 * 用设置中指定的程序打开 cbr/cbz。
 * @param resource 漫画资源
 * @param context 页面上下文
 */
export const openComicArchiveSpecifiedHandler = async (resource: any, context: ActionHandlerContext) => {
  try {
    await openComicArchive(resource, context, 'specified')
  } catch (error: any) {
    console.error('[ResourceActionHandlers] 用指定程序打开漫画失败:', error)
    notify.toast('error', '打开失败', error?.message || '未知错误')
  }
}

/**
 * Action Handler 函数类型
 */
export type ActionHandler = (resource: any, context: ActionHandlerContext) => Promise<void> | void

/**
 * Action Handler 上下文
 * 提供 handler 执行时需要的上下文信息
 */
export interface ActionHandlerContext {
  // 是否为 Electron 环境
  isElectronEnvironment: boolean

  // 当前资源所在页面的 ID（用于独立播放器加载同页曲库）
  pageId?: string
  
  // 更新资源的方法
  updateResource: (id: string, updates: any) => Promise<void>
  
  // 检查资源是否正在运行（用于游戏等可执行资源）
  isResourceRunning?: (resource: any) => boolean
  
  // 添加运行资源的方法（用于游戏等可执行资源）
  addRunningResource?: (resourceInfo: any) => void
  
  // 移除运行资源的方法（用于游戏等可执行资源）
  removeRunningResource?: (resourceId: string) => void
  
  // 获取资源初始运行时长（用于游戏等可执行资源）
  getInitialPlayTime?: (resourceId: string) => number
  
  // 保存初始运行时长（用于游戏等可执行资源）
  saveInitialPlayTime?: (resourceId: string, playTime: number) => void
  
  // 关闭详情页面的方法
  closeDetail?: () => void
  
  // 显示终止确认对话框的方法（用于游戏等可执行资源）
  showTerminateConfirmDialog?: (resource: any) => void
  
  // 打开专辑/漫画的方法（用于图片/漫画资源）
  openAlbum?: (album: any) => Promise<void>
  
  // 设置当前专辑的方法（用于图片/漫画资源）
  setCurrentAlbum?: (album: any) => void
  
  // 设置当前页面索引的方法（用于图片/漫画资源）
  setCurrentPageIndex?: (index: number) => void
  
  // 清空页面数据的方法（用于图片/漫画资源）
  clearPages?: () => void
  
  // 更新浏览信息的方法（用于图片/漫画资源）
  updateViewInfo?: (album: any) => Promise<void>
  
  // 加载专辑页面的方法（用于图片/漫画资源）
  loadAlbumPages?: () => Promise<void>
  
  // 显示阅读器的方法（用于图片/漫画资源）
  showComicViewer?: (show: boolean) => void
  
  // 小说阅读器相关方法
  setCurrentNovel?: (novel: any) => void
  showNovelReader?: (show: boolean) => void
  showEbookReaderV2?: (show: boolean) => void
  setEbookReaderV2FilePath?: (filePath: string) => void
  getGlobalSettings?: () => Promise<any>
  getFileType?: (filePath: string) => string
  updateReadingStats?: (novel: any) => Promise<void>
}

/**
 * Action Handler 注册表
 */
const actionHandlers = new Map<string, ActionHandler>()

/**
 * 注册 Action Handler
 * @param handlerName Handler 名称（对应资源类的 actionConfig.handlerName）
 * @param handler Handler 函数
 */
export function registerActionHandler(handlerName: string, handler: ActionHandler) {
  actionHandlers.set(handlerName, handler)
}

/**
 * 获取 Action Handler
 * @param handlerName Handler 名称
 * @returns Handler 函数，如果不存在则返回 null
 */
export function getActionHandler(handlerName: string): ActionHandler | null {
  return actionHandlers.get(handlerName) || null
}

/**
 * 执行 Action Handler
 * @param resource 资源实例
 * @param context Handler 上下文
 * @returns 是否成功找到并执行了 handler
 */
export async function executeActionHandler(
  resource: any,
  context: ActionHandlerContext
): Promise<boolean> {
  console.log('[ResourceActionHandlers] executeActionHandler 被调用', {
    resource,
    resourceConstructor: resource?.constructor?.name,
    hasConstructor: !!resource?.constructor
  })
  
  // 通过 resource.constructor 获取运行时的实际构造函数
  if (!resource || !resource.constructor) {
    console.warn('[ResourceActionHandlers] 资源或构造函数不存在', {
      hasResource: !!resource,
      hasConstructor: !!resource?.constructor
    })
    return false
  }

  // 获取 handler 名称
  const hasGetActionHandlerName = typeof resource.constructor.getActionHandlerName === 'function'
  console.log('[ResourceActionHandlers] 检查 getActionHandlerName 方法', {
    hasMethod: hasGetActionHandlerName,
    actionConfig: resource.constructor.actionConfig
  })
  
  const handlerName = hasGetActionHandlerName ? resource.constructor.getActionHandlerName() : null
  console.log('[ResourceActionHandlers] 获取到的 handlerName', { handlerName })
  
  if (!handlerName) {
    console.warn('[ResourceActionHandlers] 资源类型未配置 action handler', {
      constructorName: resource.constructor.name,
      actionConfig: resource.constructor.actionConfig
    })
    return false
  }

  // 查找并执行 handler
  const handler = getActionHandler(handlerName)
  console.log('[ResourceActionHandlers] 查找 handler', {
    handlerName,
    found: !!handler,
    registeredHandlers: Array.from(actionHandlers.keys())
  })
  
  if (!handler) {
    console.warn(`[ResourceActionHandlers] 未找到 handler: ${handlerName}`, {
      availableHandlers: Array.from(actionHandlers.keys())
    })
    return false
  }

  try {
    console.log('[ResourceActionHandlers] 开始执行 handler', { handlerName })
    await handler(resource, context)
    console.log('[ResourceActionHandlers] handler 执行成功', { handlerName })
    return true
  } catch (error) {
    console.error(`[ResourceActionHandlers] 执行 handler ${handlerName} 失败:`, error)
    notify.toast('error', '操作失败', `执行操作失败: ${error.message}`)
    return false
  }
}

/**
 * 启动可执行文件的通用 Handler
 * 适用于所有可执行资源（Game, Software 等）
 */
export const launchExecutableHandler: ActionHandler = async (resource, context) => {
  try {
    // 获取资源属性值（支持 ResourceField 和普通属性）
    const executablePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.executablePath?.value || resource.resourcePath || resource.executablePath
    )
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const isArchiveValue = BaseResources.extractPrimitiveValue(resource.isArchive?.value ?? resource.isArchive)
    const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
    const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
    const playCountValue = BaseResources.extractPrimitiveValue(resource.playCount?.value || resource.playCount) || 0
    const playTimeValue = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0
    
    // 检查是否为压缩包，压缩包不能运行
    const isArchive = Boolean(isArchiveValue) || (executablePath && isArchiveFile(executablePath))
    if (isArchive) {
      notify.toast('warning', '无法运行', `压缩包文件无法直接运行。请先解压后再运行。`)
      return
    }

    // 检查资源是否正在运行
    if (context.isResourceRunning && context.isResourceRunning(resource)) {
      // 如果资源正在运行，显示确认对话框
      if (context.showTerminateConfirmDialog) {
        context.showTerminateConfirmDialog(resource)
      }
      return
    }

    console.log('启动资源:', resourceName, executablePath)
    console.log('更新前 - visitedSessions 数量:', visitedSessions.length)
    console.log('更新前 - playCount:', playCountValue)

    // 更新资源统计（每次启动记录到 visitedSessions）
    const launchTime = new Date().toISOString()
    const updates: any = {
      visitedSessions: [...visitedSessions, launchTime],
      playCount: playCountValue + 1
    }

    await context.updateResource(resourceId, updates)
    console.log('更新后 - 本次启动时间:', launchTime)
    console.log('更新后 - playCount:', updates.playCount)
    console.log('资源数据已保存')

    if (context.isElectronEnvironment && window.electronAPI && window.electronAPI.launchGame) {
      console.log('使用 Electron API 启动资源')
      const result = await window.electronAPI.launchGame(executablePath, resourceName)

      if (result.success) {
        console.log('------------------------------')
        console.log('资源启动成功，进程ID:', result.pid)
        console.log('资源窗口标题列表:', result.windowTitles)
        console.log('------------------------------')

        // 将资源添加到全局运行列表中（包含完整信息）
        if (context.addRunningResource) {
          context.addRunningResource({
            id: resourceId,
            pid: result.pid,
            windowTitles: result.windowTitles || [],
            gameName: resourceName
          })
        }
        
        // 保存资源启动时的初始 playTime
        if (context.saveInitialPlayTime) {
          context.saveInitialPlayTime(resourceId, playTimeValue)
        }

        // 显示成功提示
        notify.toast('success', '启动成功', `${resourceName} 已启动`)
      } else {
        console.error('资源启动失败:', result.error)
        notify.toast('error', '启动失败', `启动失败: ${result.error}`)
        return
      }
    } else {
      // 提供更详细的错误信息
      let errorMessage = `无法启动: ${resourceName}\n\n`
      if (!context.isElectronEnvironment) {
        errorMessage += `❌ 错误：未检测到 Electron 环境\n`
        errorMessage += `当前环境：${navigator.userAgent.includes('Electron') ? 'Electron 但 API 未加载' : '浏览器环境'}\n\n`
        errorMessage += `解决方案：\n`
        errorMessage += `1. 确保在打包后的应用中运行\n`
        errorMessage += `2. 检查 preload.js 是否正确加载\n`
        errorMessage += `3. 重新构建应用\n\n`
      } else {
        errorMessage += `❌ 错误：Electron API 不可用\n`
        errorMessage += `请检查应用是否正确打包\n\n`
      }
      errorMessage += `资源路径: ${executablePath}`
      notify.toast('error', '启动失败', errorMessage)
      return
    }

    // 关闭详情页面
    if (context.closeDetail) {
      context.closeDetail()
    }
  } catch (error) {
    console.error('启动资源失败:', error)
    notify.toast('error', '启动失败', `启动失败: ${error.message}`)
  }
}

/**
 * 使用转区工具（如 Locale Emulator）启动可执行文件。
 * 需在设置中配置 game.localeEmulatorPath（LEProc.exe 路径），调用方式：LEProc.exe -run <目标路径>。
 */
export const launchWithLocaleHandler: ActionHandler = async (resource, context) => {
  try {
    const executablePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.executablePath?.value || resource.resourcePath || resource.executablePath
    )
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const isArchiveValue = BaseResources.extractPrimitiveValue(resource.isArchive?.value ?? resource.isArchive)
    const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
    const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
    const playCountValue = BaseResources.extractPrimitiveValue(resource.playCount?.value || resource.playCount) || 0
    const playTimeValue = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0

    const isArchive = Boolean(isArchiveValue) || (executablePath && isArchiveFile(executablePath))
    if (isArchive) {
      notify.toast('warning', '无法运行', '压缩包文件无法直接运行。请先解压后再运行。')
      return
    }

    if (context.isResourceRunning?.(resource) && context.showTerminateConfirmDialog) {
      context.showTerminateConfirmDialog(resource)
      return
    }

    const settings = await saveManager.loadSettings()
    const localeEmulatorPath = (settings?.game?.localeEmulatorPath || '').trim()
    if (!localeEmulatorPath) {
      notify.toast('warning', '转区启动', '请先在设置 → 游戏中指定转区工具路径（如 Locale Emulator 的 LEProc.exe）。')
      return
    }

    const launchTime = new Date().toISOString()
    const updates: any = {
      visitedSessions: [...visitedSessions, launchTime],
      playCount: playCountValue + 1
    }
    await context.updateResource(resourceId, updates)

    if (context.isElectronEnvironment && window.electronAPI?.launchGameWithLocale) {
      const result = await window.electronAPI.launchGameWithLocale(localeEmulatorPath, executablePath, resourceName)
      if (result.success) {
        if (context.addRunningResource) {
          context.addRunningResource({
            id: resourceId,
            pid: result.pid,
            windowTitles: result.windowTitles || [],
            gameName: resourceName
          })
        }
        if (context.saveInitialPlayTime) {
          context.saveInitialPlayTime(resourceId, playTimeValue)
        }
        notify.toast('success', '启动成功', `已使用转区启动: ${resourceName}`)
      } else {
        notify.toast('error', '启动失败', result.error || '未知错误')
      }
    } else {
      notify.toast('error', '启动失败', '当前环境不支持转区启动或未配置转区工具。')
    }
  } catch (error: any) {
    console.error('转区启动失败:', error)
    notify.toast('error', '启动失败', error.message || '未知错误')
  }
}

/**
 * 打开专辑/漫画的通用 Handler
 * 适用于图片专辑、漫画等资源类型
 *
 * 在 Electron 环境下，会通过 tabOpenComicViewer 在新标签页中打开漫画，
 * 每个标签页展示一个独立的漫画，支持同时阅读多本漫画。
 * 当 Electron API 不可用时，回退到原内置的模态阅读器。
 */
export const openAlbumHandler: ActionHandler = async (resource, context) => {
  try {
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const resourcePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath
    )
    console.log('开始打开专辑:', resourceName, resourcePath)

    // cbr 是 RAR，内置阅读器列不出里面的图。提前停住，避免打开一个空白阅读器。
    if (isComicArchivePath(resourcePath) && /\.cbr$/i.test(String(resourcePath).trim())) {
      notify.toast('info', '内置阅读器打不开 cbr', '请改用「用默认程序打开」或「用指定程序打开」。指定程序可以在设置 → 图片里选好。')
      return
    }

    // 增加浏览次数（无论打开方式都应记录）
    if (context.updateViewInfo) {
      try {
        await context.updateViewInfo(resource)
      } catch (error) {
        console.warn('更新浏览信息失败:', error)
        // 不阻止打开阅读器，继续执行
      }
    }

    // 优先走新标签页打开方式
    if (context.isElectronEnvironment && window.electronAPI?.tabOpenComicViewer && resourcePath) {
      // 阅读器是单独的页面，不会继承主窗口的 data-theme，所以把当前主题带过去。
      const theme = document.documentElement.getAttribute('data-theme') || 'light'
      const result = await window.electronAPI.tabOpenComicViewer(resourcePath, resourceName, theme)
      if (result.success) {
        // 关闭详情页面，让用户回到资源列表（新标签页会自动激活并显示漫画）
        if (context.closeDetail) {
          context.closeDetail()
        }
        return
      }
      console.warn('新标签页打开漫画失败，回退到内置阅读器:', result.error)
    }

    // 回退：使用内置模态阅读器
    if (context.setCurrentAlbum) {
      context.setCurrentAlbum(resource)
    }
    if (context.setCurrentPageIndex) {
      context.setCurrentPageIndex(0)
    }
    if (context.clearPages) {
      context.clearPages()
    }
    if (context.loadAlbumPages) {
      await context.loadAlbumPages()
    }
    console.log('页面加载完成，显示阅读器')
    if (context.showComicViewer) {
      context.showComicViewer(true)
    }
  } catch (error) {
    console.error('打开专辑失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '打开失败', `无法打开 "${resourceName}": ${error.message || '未知错误'}`)
  }
}

/**
 * 打开单图的 Handler
 * 复用漫画阅读器逻辑：将单图视为「仅一页的专辑」，走 setCurrentAlbum -> loadAlbumPages -> showComicViewer
 */
export const openImageHandler: ActionHandler = async (resource, context) => {
  await openAlbumHandler(resource, context)
}

/**
 * 打开小说阅读器的通用 Handler
 * 适用于小说资源类型
 *
 * 在 Electron 环境下，会优先通过 tabOpenNovelViewer 在新标签页中打开小说，
 * 每个标签页展示一本独立的小说，支持同时阅读多本。
 * 当 Electron API 不可用时，回退到原内置模态阅读器。
 */
export const openNovelReaderHandler: ActionHandler = async (resource, context) => {
  try {
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const filePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.filePath?.value || resource.resourcePath || resource.filePath
    )

    if (resourceId && context.updateResource && resource.visitedSessions) {
      const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
      const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
      try {
        await context.updateResource(resourceId, { visitedSessions: [...visitedSessions, new Date().toISOString()] })
      } catch (e) {
        console.warn('[ResourceActionHandlers] 更新访问记录失败:', e)
      }
    }

    console.log('[ResourceActionHandlers] 开始打开小说:', resourceName, filePath)

    if (!filePath) {
      notify.toast('warning', '打开失败', '小说文件路径不存在')
      return
    }

    // 先检测文件类型（后面打开方式都要用）
    let fileType = 'txt'
    if (context.getFileType) {
      fileType = context.getFileType(filePath)
    } else {
      const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
      if (ext === '.epub') fileType = 'epub'
      else if (ext === '.mobi') fileType = 'mobi'
      else if (ext === '.pdf') fileType = 'pdf'
      else fileType = 'txt'
    }
    // mobi 暂不支持独立阅读器，回退为外部打开
    if (fileType === 'mobi') {
      fileType = 'mobi' // 保留原逻辑
    }

    // 获取全局设置（打开模式）
    let openMode = 'internal'
    if (context.getGlobalSettings) {
      try {
        const globalSettings = await context.getGlobalSettings()
        openMode = globalSettings.novelDefaultOpenMode || globalSettings.novel?.defaultOpenMode || 'internal'
      } catch (error) {
        console.warn('[ResourceActionHandlers] 获取全局设置失败，使用默认模式:', error)
      }
    }

    console.log('[ResourceActionHandlers] 打开模式:', openMode, '文件类型:', fileType)

    if (openMode === 'external') {
      // 使用外部应用打开
      if (context.isElectronEnvironment && window.electronAPI && window.electronAPI.openExternal) {
        const result = await window.electronAPI.openExternal(filePath)
        if (result.success) {
          notify.native('打开成功', `"${resourceName}" 已用默认程序打开`)
          if (context.updateReadingStats) await context.updateReadingStats(resource)
        } else {
          notify.toast('error', '打开失败', `打开失败: ${result.error || '未知错误'}`)
        }
      } else {
        notify.toast('info', '文件位置', `小说文件位置:\n${filePath}\n\n请手动打开此文件进行阅读`)
      }
      if (context.closeDetail) context.closeDetail()
      return
    }

    // === internal 模式：优先走新标签页 ===
    // mobi 暂不支持独立阅读器，回退内置模态
    const isSupportedType = fileType === 'txt' || fileType === 'pdf' || fileType === 'epub'
    const hasElectronAPI = !!(window as any).electronAPI
    const hasTabOpener = !!(window as any).electronAPI?.tabOpenNovelViewer

    console.log('[ResourceActionHandlers] 新标签页条件检查:', {
      isSupportedType,
      isElectronEnvironment: context.isElectronEnvironment,
      hasElectronAPI,
      hasTabOpener,
      fileType
    })

    if (
      isSupportedType &&
      context.isElectronEnvironment &&
      hasTabOpener
    ) {
      const result = await window.electronAPI!.tabOpenNovelViewer(filePath, resourceName, fileType)
      if (result.success) {
        console.log('[ResourceActionHandlers] 已在新标签页打开小说')
        if (context.updateReadingStats) await context.updateReadingStats(resource)
        if (context.closeDetail) context.closeDetail()
        return
      }
      console.warn('[ResourceActionHandlers] 新标签页打开小说失败，回退内置阅读器:', result.error)
    } else {
      console.warn('[ResourceActionHandlers] 不满足新标签页条件，回退内置阅读器。若刚修改过 preload/tab-handlers，请重启 Electron 主进程（npm run electron-dev 需要重启 electron 子进程）')
    }

    // === 回退：内置模态阅读器 ===
    if (fileType === 'epub') {
      if (context.setEbookReaderV2FilePath) context.setEbookReaderV2FilePath(filePath)
      if (context.showEbookReaderV2) context.showEbookReaderV2(true)
    } else {
      if (context.setCurrentNovel) context.setCurrentNovel(resource)
      if (context.showNovelReader) context.showNovelReader(true)
    }
    if (context.updateReadingStats) await context.updateReadingStats(resource)
    if (context.closeDetail) context.closeDetail()
  } catch (error) {
    console.error('[ResourceActionHandlers] 打开小说失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '打开失败', `无法打开 "${resourceName}": ${error.message || '未知错误'}`)
  }
}

/**
 * 打开网站的 Handler
 * 适用于 Website 资源类型
 */
export const openWebsiteHandler: ActionHandler = async (resource, context) => {
  try {
    // 获取网站 URL（Website 类使用 resourcePath 字段存储 URL）
    const url = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath
    )
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    
    if (!url) {
      notify.toast('error', '打开失败', `网站 "${resourceName}" 没有配置 URL`)
      return
    }

    const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
    const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
    
    if (context.updateResource && resourceId) {
      try {
        await context.updateResource(resourceId, {
          visitedSessions: [...visitedSessions, new Date().toISOString()]
        })
      } catch (error) {
        console.warn('[ResourceActionHandlers] 更新访问次数失败:', error)
        // 继续执行，不阻止打开网站
      }
    }

    /**
     * 保住用户写上的 https。
     * 裸域名补成 https，javascript: 这类地址不打开。
     */
    const safeUrl = normalizeWebUrl(url)
    if (!safeUrl) {
      notify.toast('error', '打开失败', `网站 "${resourceName}" 的地址不是网页链接`)
      return
    }

    /**
     * 打开方式来自设置页。
     * 没读到设置时仍用系统浏览器，和升级前的行为一致。
     */
    let openMode: 'external' | 'internal' = 'external'
    try {
      const globalSettings = context.getGlobalSettings
        ? await context.getGlobalSettings()
        : await saveManager.loadSettings()
      if (globalSettings?.websiteOpenMode === 'internal') {
        openMode = 'internal'
      }
    } catch (error) {
      console.warn('[ResourceActionHandlers] 读取网站打开方式失败，改用默认浏览器:', error)
    }

    // 软件新标签页不注入应用权限，只加载 http 或 https。
    if (openMode === 'internal' && context.isElectronEnvironment && window.electronAPI?.tabCreate) {
      const result = await window.electronAPI.tabCreate({
        url: safeUrl,
        title: resourceName || '网站',
        external: true
      })
      if (!result.success) {
        notify.toast('error', '访问失败', `无法打开网站: ${result.error || '未知错误'}`)
        return
      }
    } else if (context.isElectronEnvironment && window.electronAPI?.openExternal) {
      const result = await window.electronAPI.openExternal(safeUrl)
      if (!result.success) {
        notify.toast('error', '访问失败', `无法打开网站: ${result.error || '未知错误'}`)
      }
    } else {
      window.open(safeUrl, '_blank')
    }
    
    // 关闭详情页面
    if (context.closeDetail) {
      context.closeDetail()
    }
  } catch (error) {
    console.error('[ResourceActionHandlers] 打开网站失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '打开失败', `无法打开网站 "${resourceName}": ${error.message || '未知错误'}`)
  }
}

/**
 * 播放音频的 Handler
 * 适用于 Audio 资源类型
 * 完全参考 AudioView.vue 中的 playAudio 实现
 */
export const playAudioHandler: ActionHandler = async (resource, context) => {
  try {
    // 提取资源属性值（支持 ResourceField 和普通属性）
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const resourcePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath
    )
    const filePath = resourcePath // Audio 类使用 resourcePath，但 GlobalAudioPlayer 期望 filePath
    
    console.log('[ResourceActionHandlers] 开始播放音频:', resourceName)
    
    // 检查音频文件路径是否存在
    if (!filePath) {
      notify.toast('error', '播放失败', `音频 "${resourceName}" 没有配置文件路径`)
      return
    }
    
    const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
    const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
    const updates = { visitedSessions: [...visitedSessions, new Date().toISOString()] }
    
    if (context.updateResource && resourceId) {
      try {
        await context.updateResource(resourceId, updates)
        console.log('[ResourceActionHandlers] 播放统计已更新')
      } catch (error) {
        console.warn('[ResourceActionHandlers] 更新播放统计失败:', error)
        // 继续执行，不阻止播放
      }
    }
    
    // 构建传递给 GlobalAudioPlayer 的音频对象
    // GlobalAudioPlayer 期望普通对象格式，需要将 ResourceField 转换为普通值
    // 并且需要 filePath 字段（而不是 resourcePath）
    const audioForPlayer: any = {
      id: resourceId,
      name: resourceName,
      filePath: filePath, // GlobalAudioPlayer 使用 filePath
      resourcePath: filePath, // 也保留 resourcePath 以防万一
      artist: BaseResources.extractPrimitiveValue(resource.artist?.value || resource.artist) || '',
      duration: BaseResources.extractPrimitiveValue(resource.duration?.value || resource.duration) || 0,
      playCount: updates.visitedSessions.length,
      lastPlayed: updates.visitedSessions[updates.visitedSessions.length - 1],
      firstPlayed: updates.visitedSessions[0] || null,
      coverPath: BaseResources.extractPrimitiveValue(resource.coverPath?.value || resource.coverPath) || '',
      tags: Array.isArray(resource.tags?.value) ? resource.tags.value : (Array.isArray(resource.tags) ? resource.tags : []),
      actors: Array.isArray(resource.actors?.value) ? resource.actors.value : (Array.isArray(resource.actors) ? resource.actors : []),
      description: BaseResources.extractPrimitiveValue(resource.description?.value || resource.description) || '',
      addedDate: BaseResources.extractPrimitiveValue(resource.addedDate?.value || resource.addedDate) || '',
      rating: BaseResources.extractPrimitiveValue(resource.rating?.value || resource.rating) || 0,
      comment: BaseResources.extractPrimitiveValue(resource.comment?.value || resource.comment) || '',
      isFavorite: BaseResources.extractPrimitiveValue(resource.isFavorite?.value ?? resource.isFavorite) || false
    }
    
    // 优先在独立标签页中打开音乐播放器
    if (context.isElectronEnvironment && window.electronAPI?.tabOpenAudioPlayer) {
      const theme = document.documentElement.getAttribute('data-theme') || ''
      const result = await window.electronAPI.tabOpenAudioPlayer({
        path: filePath,
        title: resourceName,
        id: resourceId,
        pageId: context.pageId,
        theme
      })
      if (!result?.success) {
        notify.toast('error', '播放失败', result?.error || '打开音乐播放器标签页失败')
        return
      }
      console.log('🎵 已在独立标签页打开音乐播放器:', resourceName)
    } else {
      // 非 Electron 环境回退到全局播放器（GlobalAudioPlayer 会监听此事件）
      console.log('🎵 通过全局播放器播放音频:', resourceName)
      window.dispatchEvent(new CustomEvent('global-play-audio', { detail: audioForPlayer }))
    }
    
    // 显示播放通知（参考 useAudioPlayback.playAudio 的实现）
    // notify.native('开始播放', `正在播放: ${resourceName}`)
    
    // 关闭详情页面
    if (context.closeDetail) {
      context.closeDetail()
    }
  } catch (error) {
    console.error('[ResourceActionHandlers] 播放音频失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '播放失败', `播放音频失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 播放视频的 Handler
 * 适用于 Video 资源类型，逻辑与 VideoView / useVideoPlayback 一致
 */
export const playVideoHandler: ActionHandler = async (resource, context) => {
  try {
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const filePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath
    )
    const fileExists = BaseResources.extractPrimitiveValue(resource.fileExists?.value ?? resource.fileExists)

    if (!filePath) {
      notify.toast('error', '播放失败', `视频 "${resourceName}" 没有配置视频路径`)
      return
    }

    if (fileExists === false) {
      notify.toast('error', '播放失败', `视频文件不存在: ${resourceName}`)
      return
    }

    const settings = await saveManager.loadSettings()
    const playMode = settings?.videoPlayMode === 'internal' ? 'internal' : 'external'

    if (playMode === 'internal') {
      if (window.electronAPI?.getFileUrl) {
        const accessResult = await window.electronAPI.getFileUrl(filePath)
        if (!accessResult?.success) {
          notify.toast('error', '播放失败', `视频文件不可访问: ${accessResult?.error || '未知错误'}`)
          return
        }
      }
      if (window.electronAPI?.tabOpenVideoPlayer) {
        const result = await window.electronAPI.tabOpenVideoPlayer(filePath, resourceName)
        if (!result?.success) {
          notify.toast('error', '播放失败', result?.error || '打开视频标签页失败')
          return
        }
      } else {
        notify.toast('error', '播放失败', '内部播放器不可用')
        return
      }
    } else {
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(filePath)
      } else {
        notify.toast('error', '播放失败', '无法打开外部播放器')
        return
      }
    }

    const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
    const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
    if (context.updateResource && resourceId) {
      try {
        await context.updateResource(resourceId, {
          visitedSessions: [...visitedSessions, new Date().toISOString()]
        })
      } catch (e) {
        console.warn('[ResourceActionHandlers] 更新观看统计失败:', e)
      }
    }

    if (context.closeDetail) {
      context.closeDetail()
    }
  } catch (error: any) {
    console.error('[ResourceActionHandlers] 播放视频失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '播放失败', `播放视频失败: ${error?.message || '未知错误'}`)
  }
}

/**
 * 用系统默认应用打开资源
 * 适用于 Other 等任意文件类型，调用 shell.openPath / openExternal 用系统默认程序打开
 */
export const launchDefaultHandler: ActionHandler = async (resource, context) => {
  try {
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const filePath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath || resource.filePath?.value || resource.filePath
    )
    if (!filePath || !filePath.trim()) {
      notify.toast('error', '打开失败', `资源 "${resourceName}" 没有配置文件路径`)
      return
    }
    if (resourceId && context.updateResource && resource.visitedSessions) {
      const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
      const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
      try {
        await context.updateResource(resourceId, { visitedSessions: [...visitedSessions, new Date().toISOString()] })
      } catch (e) {
        console.warn('[ResourceActionHandlers] 更新访问记录失败:', e)
      }
    }
    if (context.isElectronEnvironment && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(filePath)
      if (context.closeDetail) context.closeDetail()
    } else {
      notify.toast('warning', '打开失败', '当前环境无法用系统默认应用打开文件')
    }
  } catch (error: any) {
    console.error('[ResourceActionHandlers] 用默认应用打开失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '打开失败', `${resourceName}: ${error?.message || '未知错误'}`)
  }
}

// 注册默认的 handlers
registerActionHandler('launchExecutable', launchExecutableHandler)
registerActionHandler('launchDefault', launchDefaultHandler)
registerActionHandler('launchWithLocale', launchWithLocaleHandler)
registerActionHandler('openAlbum', openAlbumHandler)
registerActionHandler('openComicArchiveDefault', openComicArchiveDefaultHandler)
registerActionHandler('openComicArchiveSpecified', openComicArchiveSpecifiedHandler)
registerActionHandler('openNovelReader', openNovelReaderHandler)
registerActionHandler('openWebsite', openWebsiteHandler)
registerActionHandler('playAudio', playAudioHandler)
registerActionHandler('playVideo', playVideoHandler)
registerActionHandler('openImage', openImageHandler)

/**
 * 打开文件夹的 Handler
 * 适用于番剧（VideoFolder）、音频文件夹等以文件夹形式管理的资源，
 * 在系统文件管理器中打开资源所在的文件夹
 */
export const openFolderHandler: ActionHandler = async (resource, context) => {
  try {
    const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    const folderPath = BaseResources.extractPrimitiveValue(
      resource.resourcePath?.value || resource.resourcePath
    )

    if (!folderPath || !folderPath.trim()) {
      notify.toast('error', '打开失败', `资源 "${resourceName}" 没有配置文件夹路径`)
      return
    }

    // 记录访问时间（用于"最近观看"等显示）
    if (resourceId && context.updateResource && resource.visitedSessions) {
      const visitedSessionsValue = BaseResources.extractPrimitiveValue(resource.visitedSessions?.value || resource.visitedSessions)
      const visitedSessions = Array.isArray(visitedSessionsValue) ? visitedSessionsValue : []
      try {
        await context.updateResource(resourceId, { visitedSessions: [...visitedSessions, new Date().toISOString()] })
      } catch (e) {
        console.warn('[ResourceActionHandlers] 更新访问记录失败:', e)
      }
    }

    if (!context.isElectronEnvironment || !window.electronAPI?.openFolder) {
      notify.toast('error', '打开失败', '当前环境无法打开文件夹')
      return
    }

    const result = await window.electronAPI.openFolder(folderPath)
    if (!result?.success) {
      notify.toast('error', '打开失败', result?.error || '未知错误')
    }
  } catch (error: any) {
    console.error('[ResourceActionHandlers] 打开文件夹失败:', error)
    const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
    notify.toast('error', '打开失败', `${resourceName}: ${error?.message || '未知错误'}`)
  }
}

registerActionHandler('openFolder', openFolderHandler)
