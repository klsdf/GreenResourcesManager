/**
 * 小说和漫画的阅读位置。
 *
 * 阅读器开在单独的标签页里，手里只有文件路径，没有列表上的那条资源。
 * 所以按路径把整条记录找回来，只改页码和进度再写回，名字、标签这些字段保持原样。
 * 页码从 1 开始，和阅读器底部「第 N 页」一致。漫画阅读器内部用 0 开始的下标，进出这里时要换算。
 */

/** 一次要写回存档的位置。没填的字段保持原值。 */
export interface ReadingPosition {
  /** 当前页，从 1 开始。EPUB 不靠页码恢复，可以不填。 */
  currentPage?: number
  /** 读完的百分比，0 到 100。 */
  readProgress?: number
  /** EPUB 内部位置。下次打开用它跳回原处，比百分比准。 */
  epubCfi?: string
  /** 这本书现在的总页数。有的话，页码不会超过它。 */
  totalPages?: number
}

/** 同一条路径上还没落盘的位置，连翻几页只写最后一次。 */
const pendingByPath = new Map<string, ReadingPosition>()

/** 每条路径对应的延迟写入计时器。 */
const timerByPath = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * 把路径收成同一种写法，用来对上存档里的资源。
 * Windows 上大小写和斜杠不同仍算同一个文件。
 * @param filePath 文件或文件夹路径
 * @returns 收过的路径。空路径返回空字符串
 */
export function normalizeReadingPath(filePath: unknown): string {
  if (typeof filePath !== 'string') return ''
  return filePath.trim().replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
}

/**
 * 把页码收成合法的正整数。
 * 超过总页数时停在最后一页，避免文件变短之后还跳到不存在的页。
 * @param page 想去的页码
 * @param totalPages 总页数。不知道时只保证至少是 1
 * @returns 从 1 开始的页码
 */
export function clampReadingPage(page: unknown, totalPages?: number): number {
  const parsed = Math.floor(Number(page))
  const safePage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  const total = Math.floor(Number(totalPages))
  if (!Number.isFinite(total) || total <= 0) return safePage
  return Math.min(safePage, total)
}

/**
 * 用当前页和总页数算出百分比。
 * 读到最后一页就是 100。还没有页时是 0，避免一本空漫画被记成已读完。
 * @param page 当前页，从 1 开始
 * @param totalPages 总页数
 * @returns 0 到 100 的整数
 */
export function readingPercent(page: unknown, totalPages: unknown): number {
  const total = Math.floor(Number(totalPages))
  if (!Number.isFinite(total) || total <= 0) return 0
  const current = clampReadingPage(page, total)
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)))
}

/**
 * 把百分比收进 0 到 100。
 * @param progress 阅读器报上来的进度
 * @returns 0 到 100 的整数。无效值当成 0
 */
export function clampReadingPercent(progress: unknown): number {
  const parsed = Math.round(Number(progress))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

/**
 * 从存档记录里读出上次读到的位置。
 * 旧记录没有这些字段时，从第 1 页、0% 开始。
 * @param resource 数据库里的资源对象
 * @returns 可以交给阅读器的位置
 */
export function readReadingPosition(resource: Record<string, unknown> | null | undefined): ReadingPosition {
  if (!resource) {
    return { currentPage: 1, readProgress: 0, epubCfi: '' }
  }
  const cfi = typeof resource.epubCfi === 'string' ? resource.epubCfi : ''
  return {
    currentPage: clampReadingPage(resource.currentPage),
    readProgress: clampReadingPercent(resource.readProgress),
    epubCfi: cfi
  }
}

/**
 * 把新位置合并进已有记录。
 * 只覆盖这次带上的字段。空的 EPUB 位置不会把已经记下的位置擦掉。
 * @param resource 原来的整条记录
 * @param position 这次读到的位置
 * @returns 可以整条写回数据库的对象
 */
export function mergeReadingPosition(resource: Record<string, unknown>, position: ReadingPosition): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...resource }
  if (position.currentPage != null) {
    merged.currentPage = clampReadingPage(position.currentPage, position.totalPages)
  }
  if (position.readProgress != null) {
    merged.readProgress = clampReadingPercent(position.readProgress)
  }
  if (typeof position.epubCfi === 'string' && position.epubCfi) {
    merged.epubCfi = position.epubCfi
  }
  return merged
}

/**
 * 按路径读取上次的阅读位置。
 * 找不到资源时返回开头，调用方照常打开，只是没法接着上次读。
 * @param filePath 小说文件或漫画文件夹路径
 * @returns 上次的位置。没有记录时是第 1 页
 */
export async function loadReadingPosition(filePath: string): Promise<ReadingPosition> {
  const api = window.electronAPI
  if (!filePath || !api?.sqliteFindResourceByPath) {
    return readReadingPosition(null)
  }
  try {
    const found = await api.sqliteFindResourceByPath(filePath)
    if (!found?.ok || !found.resource) return readReadingPosition(null)
    return readReadingPosition(found.resource)
  } catch (error) {
    console.warn('[readingProgress] 读取阅读位置失败:', error)
    return readReadingPosition(null)
  }
}

/**
 * 把阅读位置写进已有资源，并通知主窗口刷新卡片上的进度。
 * 没有对应资源时不新建记录。阅读器不负责创建资源。
 * @param filePath 小说文件或漫画文件夹路径
 * @param position 这次要记下的位置
 * @returns 写成功时为 true
 */
export async function saveReadingPosition(filePath: string, position: ReadingPosition): Promise<boolean> {
  const api = window.electronAPI
  if (!filePath || !api?.sqliteFindResourceByPath || !api?.sqliteSaveResource) return false
  try {
    const found = await api.sqliteFindResourceByPath(filePath)
    if (!found?.ok || !found.resource || !found.tableName) return false
    const merged = mergeReadingPosition(found.resource, position)
    const result = await api.sqliteSaveResource(found.tableName, JSON.parse(JSON.stringify(merged)))
    if (!result?.ok) {
      console.warn('[readingProgress] 保存阅读位置失败:', result?.message)
      return false
    }
    api.notifyReadingProgress?.({
      id: String(merged.id || ''),
      resourcePath: String(merged.resourcePath || filePath),
      currentPage: Number(merged.currentPage) || 1,
      readProgress: Number(merged.readProgress) || 0,
      epubCfi: typeof merged.epubCfi === 'string' ? merged.epubCfi : ''
    })
    return true
  } catch (error) {
    console.warn('[readingProgress] 保存阅读位置失败:', error)
    return false
  }
}

/**
 * 翻页时先攒着，停顿后再写数据库。
 * 连按下一页时如果每页都写一次，会把同一次阅读拆成很多次存档。
 * @param filePath 小说文件或漫画文件夹路径
 * @param position 目前读到的位置，会和还没写的那次合并
 * @param delay 停顿多久再写，默认 400 毫秒
 */
export function queueReadingPosition(filePath: string, position: ReadingPosition, delay = 400): void {
  if (!filePath) return
  const previous = pendingByPath.get(filePath) || {}
  pendingByPath.set(filePath, {
    ...previous,
    ...position,
    epubCfi: position.epubCfi || previous.epubCfi
  })
  if (timerByPath.has(filePath)) return
  const timer = setTimeout(() => {
    timerByPath.delete(filePath)
    flushReadingPosition(filePath).catch((error) => {
      console.warn('[readingProgress] 延迟保存阅读位置失败:', error)
    })
  }, delay)
  timerByPath.set(filePath, timer)
}

/**
 * 立刻写下这条路径还没落盘的位置。
 * 关闭阅读器或关掉标签页时调用，避免最后几页还停在计时器里。
 * @param filePath 小说文件或漫画文件夹路径
 */
export async function flushReadingPosition(filePath: string): Promise<void> {
  if (!filePath) return
  const timer = timerByPath.get(filePath)
  if (timer) {
    clearTimeout(timer)
    timerByPath.delete(filePath)
  }
  const position = pendingByPath.get(filePath)
  pendingByPath.delete(filePath)
  if (!position) return
  await saveReadingPosition(filePath, position)
}
