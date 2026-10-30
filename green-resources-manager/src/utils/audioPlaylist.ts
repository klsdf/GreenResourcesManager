/**
 * 音乐播放列表。
 *
 * 播放器不应该把资料库里的全部音频都拉进来。
 * 列表里只放两种歌：读者用「添加到播放列表」放进来的，以及这次点了播放、但还不在列表里的那一首。
 * 列表写在设置里，主窗口和播放器标签页都能读到同一份。
 */

/** 播放列表里的一首歌。只留播放和展示要用的字段。 */
export interface PlaylistTrack {
  /** 资源编号。没有编号时用文件路径代替。 */
  id: string
  /** 歌名。 */
  name: string
  /** 艺术家。没有时是空字符串。 */
  artist: string
  /** 音频文件路径。 */
  path: string
  /** 封面路径。没有时是空字符串。 */
  coverPath: string
  /** 时长，单位秒。未知时是 0。 */
  duration: number
  /** 备注。 */
  description: string
  /** 标签。 */
  tags: string[]
  /** 参与者。 */
  actors: string[]
}

/** 这次打开播放器时该播哪些歌。 */
export interface PlaybackQueue {
  /** 要放进播放器左侧的歌。 */
  tracks: PlaylistTrack[]
  /** 从哪一首开始播，对应 tracks 的下标。 */
  startIndex: number
  /**
   * 为真时，这份列表就是读者存下来的播放列表。
   * 删歌要写回去。为假时只是临时播点击的那一首，不能把存好的列表清掉。
   */
  fromSaved: boolean
}

/**
 * 取出普通字符串，或资源字段上的 value。
 * 列表里的音频有时是纯对象，有时包在字段对象里。
 * @param value 原始值
 * @returns 字符串。不是文字时是空字符串
 */
function readText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object' && 'value' in value) {
    return readText((value as { value: unknown }).value)
  }
  return ''
}

/**
 * 取出字符串数组。
 * @param value 原始值
 * @returns 字符串数组。不是数组时是空数组
 */
function readTextList(value: unknown): string[] {
  const source = value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value
  if (!Array.isArray(source)) return []
  return source.map((item) => readText(item)).filter(Boolean)
}

/**
 * 把路径收成同一种写法，用来判断是不是同一首歌。
 * @param filePath 文件路径
 * @returns 小写且统一斜杠的路径
 */
export function normalizeTrackPath(filePath: unknown): string {
  return readText(filePath).trim().replace(/\//g, '\\').toLowerCase()
}

/**
 * 两首歌是不是同一首。
 * 先看编号，编号对不上再看文件路径。
 * @param left 一首歌
 * @param right 另一首歌
 * @returns 同一首时为真
 */
export function isSamePlaylistTrack(left: PlaylistTrack, right: PlaylistTrack): boolean {
  if (left.id && right.id && left.id === right.id) return true
  const leftPath = normalizeTrackPath(left.path)
  const rightPath = normalizeTrackPath(right.path)
  return Boolean(leftPath) && leftPath === rightPath
}

/**
 * 把一条音频收成播放列表里的歌。
 * 没有文件路径的不能播，直接丢掉。
 * @param raw 资源、播放器参数或已经存过的歌
 * @returns 可以放进列表的歌。没有路径时是 null
 */
export function normalizePlaylistTrack(raw: unknown): PlaylistTrack | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const path = readText(item.resourcePath) || readText(item.filePath) || readText(item.path)
  if (!path.trim()) return null
  const fallbackName = path.split(/[\\/]/).pop() || '未知音频'
  const duration = Number(readText(item.duration) || item.duration)
  return {
    id: readText(item.id) || path,
    name: readText(item.name) || fallbackName,
    artist: readText(item.artist),
    path,
    coverPath: readText(item.coverPath),
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    description: readText(item.description),
    tags: readTextList(item.tags),
    actors: readTextList(item.actors)
  }
}

/**
 * 决定这次播放器里显示哪些歌。
 * 点到的歌已经在播放列表里，就播整份列表，并从这一首开始。
 * 不在列表里，就只播这一首，免得把资料库里的其他音频一起带进来。
 * @param saved 已经添加到播放列表的歌
 * @param clicked 这次点了播放的歌
 * @returns 播放器要用的队列
 */
export function resolvePlaybackQueue(saved: PlaylistTrack[], clicked: PlaylistTrack | null): PlaybackQueue {
  const stored = saved.filter((track) => track.path)
  if (!clicked) {
    return { tracks: stored, startIndex: stored.length > 0 ? 0 : -1, fromSaved: true }
  }
  const index = stored.findIndex((track) => isSamePlaylistTrack(track, clicked))
  if (index >= 0) {
    const tracks = stored.slice()
    tracks[index] = { ...tracks[index], ...clicked, id: tracks[index].id || clicked.id }
    return { tracks, startIndex: index, fromSaved: true }
  }
  return { tracks: [clicked], startIndex: 0, fromSaved: false }
}

/**
 * 把一首歌加进已有列表。已经在里面就不重复加。
 * @param saved 当前播放列表
 * @param track 要添加的歌
 * @returns 新列表，以及这次是不是新加进去的
 */
export function appendPlaylistTrack(saved: PlaylistTrack[], track: PlaylistTrack): { tracks: PlaylistTrack[], added: boolean } {
  if (saved.some((item) => isSamePlaylistTrack(item, track))) {
    return { tracks: saved, added: false }
  }
  return { tracks: [...saved, track], added: true }
}

/**
 * 从设置里读出播放列表。
 * 直接读数据库，不走设置缓存，避免主窗口和播放器各记一份旧列表。
 * @returns 已添加的歌。读不到时是空数组
 */
export async function loadAudioPlaylist(): Promise<PlaylistTrack[]> {
  const api = window.electronAPI
  if (!api?.sqliteGetSettings) return []
  try {
    const result = await api.sqliteGetSettings()
    const list = result?.settings?.musicPlaylist
    if (!Array.isArray(list)) return []
    return list.map((item) => normalizePlaylistTrack(item)).filter((item): item is PlaylistTrack => Boolean(item))
  } catch (error) {
    console.warn('[audioPlaylist] 读取播放列表失败:', error)
    return []
  }
}

/**
 * 把播放列表写回设置。
 * 只改 musicPlaylist 这一个字段，其他设置保持原样。
 * @param tracks 要保存的歌
 * @returns 写成功时为真
 */
export async function saveAudioPlaylist(tracks: PlaylistTrack[]): Promise<boolean> {
  const api = window.electronAPI
  if (!api?.sqliteGetSettings || !api?.sqliteSaveSettings) return false
  try {
    const current = await api.sqliteGetSettings()
    const settings = current?.ok && current.settings ? { ...current.settings } : {}
    settings.musicPlaylist = tracks
    const saved = await api.sqliteSaveSettings(settings)
    return Boolean(saved?.ok)
  } catch (error) {
    console.warn('[audioPlaylist] 保存播放列表失败:', error)
    return false
  }
}

/**
 * 把一首歌添加到保存的播放列表。
 * @param track 要添加的歌
 * @returns added 表示这次是新加的；失败时 added 为假且 saved 为假
 */
export async function addTrackToSavedPlaylist(track: PlaylistTrack): Promise<{ added: boolean, saved: boolean }> {
  const current = await loadAudioPlaylist()
  const next = appendPlaylistTrack(current, track)
  if (!next.added) return { added: false, saved: true }
  const saved = await saveAudioPlaylist(next.tracks)
  return { added: saved, saved }
}
