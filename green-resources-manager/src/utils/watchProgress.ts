/**
 * 视频播放位置。
 *
 * 播放页在单独的标签里，手里只有文件路径。
 * 单个视频写在资源自己的秒数上。番剧的每一集写在文件夹资源的对照表里，避免看完一集就把整部番标成看完。
 */

import { normalizeReadingPath } from './readingProgress'

/** 一次要记下的播放位置。 */
export interface WatchPosition {
  /** 看到的秒数。 */
  seconds: number
  /** 看到的百分比，0 到 100。 */
  progress: number
  /** 片长，秒。用来判断是不是停在片尾。 */
  duration: number
}

/** 同一条路径上还没落盘的位置。 */
const pendingByPath = new Map<string, WatchPosition>()

/** 每条路径的延迟写入计时器。 */
const timerByPath = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * 把秒数收成不小于 0 的数。
 * @param value 播放器报上来的时间
 * @returns 秒数。无效值是 0
 */
export function clampWatchSeconds(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed * 10) / 10
}

/**
 * 把进度收进 0 到 100。
 * @param value 百分比
 * @returns 0 到 100 的整数
 */
export function clampWatchProgress(value: unknown): number {
  const parsed = Math.round(Number(value))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

/**
 * 用秒数和片长算出百分比。
 * @param seconds 当前秒数
 * @param duration 片长
 * @returns 0 到 100 的整数。还不知道片长时是 0
 */
export function watchPercent(seconds: unknown, duration: unknown): number {
  const total = Number(duration)
  if (!Number.isFinite(total) || total <= 0) return 0
  return clampWatchProgress((clampWatchSeconds(seconds) / total) * 100)
}

/**
 * 文件所在的目录。
 * 番剧的资源路径是目录，不是某一集的文件。
 * @param filePath 视频文件路径
 * @returns 目录。没有分隔符时是空字符串
 */
export function parentDirectory(filePath: string): string {
  const normalized = String(filePath || '').replace(/\//g, '\\')
  const index = normalized.lastIndexOf('\\')
  return index > 0 ? normalized.slice(0, index) : ''
}

/**
 * 从一条资源里读出这个文件的播放位置。
 * 路径对上资源本身时读秒数字段；否则读番剧对照表。
 * @param resource 数据库里的资源
 * @param filePath 正在播的文件
 * @returns 上次的位置。没有记录时从 0 开始
 */
export function readWatchPosition(resource: Record<string, unknown> | null | undefined, filePath: string): WatchPosition {
  const empty = { seconds: 0, progress: 0, duration: 0 }
  if (!resource) return empty
  const key = normalizeReadingPath(filePath)
  const ownPath = normalizeReadingPath(resource.resourcePath || resource.filePath || resource.folderPath)
  if (ownPath && ownPath === key) {
    return {
      seconds: clampWatchSeconds(resource.playbackSeconds),
      progress: clampWatchProgress(resource.watchProgress),
      duration: clampWatchSeconds(resource.playbackDuration)
    }
  }
  const map = resource.playbackByFile
  if (!map || typeof map !== 'object' || Array.isArray(map)) return empty
  const entry = (map as Record<string, unknown>)[key]
  if (!entry || typeof entry !== 'object') return empty
  const record = entry as Record<string, unknown>
  return {
    seconds: clampWatchSeconds(record.seconds),
    progress: clampWatchProgress(record.progress),
    duration: clampWatchSeconds(record.duration)
  }
}

/**
 * 决定打开时要不要从上次的位置继续。
 * 刚开头、快到片尾，或者已经看到 95%，都从头播放。
 * @param position 上次的位置
 * @returns 应该跳到的秒数。从头播放时是 0
 */
export function resumeSeconds(position: WatchPosition): number {
  if (position.seconds < 3) return 0
  if (position.progress >= 95) return 0
  if (position.duration > 0 && position.seconds >= position.duration - 10) return 0
  return position.seconds
}

/**
 * 把新位置合并进已有记录。
 * 单个视频看到 95% 记为看完。番剧只更新这一集，不把整部文件夹标成看完。
 * @param resource 原来的整条记录
 * @param filePath 正在播的文件
 * @param position 这次的位置
 * @returns 可以写回数据库的对象
 */
export function mergeWatchPosition(
  resource: Record<string, unknown>,
  filePath: string,
  position: WatchPosition
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...resource }
  const key = normalizeReadingPath(filePath)
  const ownPath = normalizeReadingPath(resource.resourcePath || resource.filePath || resource.folderPath)
  const seconds = clampWatchSeconds(position.seconds)
  const progress = clampWatchProgress(position.progress)
  const duration = clampWatchSeconds(position.duration)
  if (ownPath && ownPath === key) {
    merged.playbackSeconds = seconds
    merged.watchProgress = progress
    if (duration > 0) merged.playbackDuration = duration
    if (progress >= 95) {
      merged.finished = true
      if (!merged.finishedAt) merged.finishedAt = new Date().toISOString()
    }
    return merged
  }
  const previous = merged.playbackByFile
  const map: Record<string, WatchPosition> = {}
  if (previous && typeof previous === 'object' && !Array.isArray(previous)) {
    Object.assign(map, previous)
  }
  map[key] = { seconds, progress, duration }
  merged.playbackByFile = map
  return merged
}

/**
 * 按路径读取上次看到的位置。
 * 先找文件本身，找不到再找它所在的文件夹资源。
 * @param filePath 视频文件路径
 * @returns 上次的位置
 */
export async function loadWatchPosition(filePath: string): Promise<WatchPosition> {
  const empty = { seconds: 0, progress: 0, duration: 0 }
  const api = window.electronAPI
  if (!filePath || !api?.sqliteFindResourceByPath) return empty
  try {
    const own = await api.sqliteFindResourceByPath(filePath)
    if (own?.ok && own.resource) {
      const position = readWatchPosition(own.resource, filePath)
      if (position.seconds > 0 || position.progress > 0) return position
    }
    const parent = parentDirectory(filePath)
    if (!parent) return empty
    const folder = await api.sqliteFindResourceByPath(parent)
    if (!folder?.ok || !folder.resource) return empty
    return readWatchPosition(folder.resource, filePath)
  } catch (error) {
    console.warn('[watchProgress] 读取播放位置失败:', error)
    return empty
  }
}

/**
 * 把播放位置写进已有资源。没有对应资源时不新建。
 * @param filePath 视频文件路径
 * @param position 这次的位置
 * @returns 写成功时为 true
 */
export async function saveWatchPosition(filePath: string, position: WatchPosition): Promise<boolean> {
  const api = window.electronAPI
  if (!filePath || !api?.sqliteFindResourceByPath || !api?.sqliteSaveResource) return false
  try {
    const own = await api.sqliteFindResourceByPath(filePath)
    const parent = parentDirectory(filePath)
    const folder = parent ? await api.sqliteFindResourceByPath(parent) : null
    const target = own?.ok && own.resource && normalizeReadingPath(own.resource.resourcePath || own.resource.filePath) === normalizeReadingPath(filePath)
      ? own
      : folder
    if (!target?.ok || !target.resource || !target.tableName) return false
    const merged = mergeWatchPosition(target.resource, filePath, position)
    const result = await api.sqliteSaveResource(target.tableName, JSON.parse(JSON.stringify(merged)))
    return !!result?.ok
  } catch (error) {
    console.warn('[watchProgress] 保存播放位置失败:', error)
    return false
  }
}

/**
 * 播放过程中先攒着，几秒后写一次。
 * 进度条每个瞬间都在变，不能每次都写数据库。
 * @param filePath 视频文件路径
 * @param position 目前看到的位置
 * @param delay 停顿多久再写，默认 5 秒
 */
export function queueWatchPosition(filePath: string, position: WatchPosition, delay = 5000): void {
  if (!filePath) return
  pendingByPath.set(filePath, position)
  if (timerByPath.has(filePath)) return
  const timer = setTimeout(() => {
    timerByPath.delete(filePath)
    flushWatchPosition(filePath).catch((error) => {
      console.warn('[watchProgress] 延迟保存播放位置失败:', error)
    })
  }, delay)
  timerByPath.set(filePath, timer)
}

/**
 * 立刻写下还没落盘的位置。
 * 换集、关闭标签时调用。
 * @param filePath 视频文件路径
 */
export async function flushWatchPosition(filePath: string): Promise<void> {
  if (!filePath) return
  const timer = timerByPath.get(filePath)
  if (timer) {
    clearTimeout(timer)
    timerByPath.delete(filePath)
  }
  const position = pendingByPath.get(filePath)
  pendingByPath.delete(filePath)
  if (!position) return
  await saveWatchPosition(filePath, position)
}
