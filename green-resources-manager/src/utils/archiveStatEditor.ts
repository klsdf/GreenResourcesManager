/**
 * 详情页「修改数据」用的读写。
 *
 * 编辑信息改的是名字、标签这些介绍。时长和次数是玩出来的记录，单独做一页，避免混在一起。
 * 第一次、最后一次并不是单独存的字段，它们是访问记录数组的头和尾，所以改时间只动这两端，中间的记录留着。
 * 游戏的次数是单独的数字，和访问记录条数可以不一样。漫画、视频、网站的次数就是访问记录的条数，改次数就要补上或去掉中间的时间。
 * 游戏时长按秒存，因为结束游戏时加上的是秒。小说阅读时长按分钟存，因为阅读速度是用分钟算的。表单都按小时和分钟填，保存时再换算。
 */

/** 时长在表单里拆开的时、分、秒。 */
export interface DurationFormValue {
  /** 小时 */
  hours: number
  /** 分钟 */
  minutes: number
  /** 秒。阅读时长按分钟存，这一项保持 0。 */
  seconds: number
}

/** 表单上的一种记录。 */
export interface ArchiveStatField {
  /** 存档里的字段名 */
  key: string
  /** 给玩家看的名字，跟详情页同一句中文 */
  label: string
  /** 用哪种输入框 */
  kind: 'duration' | 'count' | 'percent' | 'datetime'
  /** 时长在存档里的单位。游戏是秒，小说阅读时长是分钟。 */
  durationUnit?: 'seconds' | 'minutes'
  /** 次数由访问记录的条数算出来。改次数会改记录条数。 */
  sessionCount?: boolean
  /** 这个时间是访问记录的头或尾 */
  sessionEdge?: 'first' | 'last'
  /** 输入框下面的一句说明 */
  hint?: string
}

/** 一次提交里，访问记录要怎么改。空字符串表示玩家把输入框清空了，这时保留原来的那一端。 */
export interface SessionPatch {
  /** 最早一次。不传表示表单里没有这一项。 */
  first?: string | null
  /** 最晚一次。不传表示表单里没有这一项。 */
  last?: string | null
  /** 访问次数。不传表示次数是单独保存的，不要按条数重写记录。 */
  count?: number | null
}

/** 详情里出现、但不该手改的内容。页数和字数是文件自己的，不是玩出来的记录。 */
const SKIP_FIELDS = new Set(['pagesCount', 'totalWords', 'folderSize', 'duration'])

/** 按秒保存的时长。结束游戏、软件时加上的是秒。 */
const SECONDS_DURATION_FIELDS = new Set(['playTime'])

/** 按分钟保存的时长。小说的阅读速度用分钟算。 */
const MINUTES_DURATION_FIELDS = new Set(['readTime'])

/** 进度用 0 到 100 的百分比。 */
const PERCENT_FIELDS = new Set(['readProgress'])

/** 访问记录第一条对应的字段。 */
const SESSION_FIRST_FIELDS = new Set(['firstPlayed', 'firstViewed', 'firstRead'])

/** 访问记录最后一条对应的字段。 */
const SESSION_LAST_FIELDS = new Set(['lastPlayed', 'lastViewed', 'lastWatched', 'lastVisited', 'lastRead'])

/** 次数如果是计算出来的，就来自访问记录的条数。 */
const SESSION_COUNT_FIELDS = new Set(['playCount', 'viewCount', 'watchCount', 'visitCount'])

/** 次数单独保存时给玩家看的说明。 */
const STORED_COUNT_HINT = '次数是单独记下的。改成你使用这个软件之前的次数就行，不用为每一次都编一个时间。'

/** 次数来自访问记录时给玩家看的说明。 */
const SESSION_COUNT_HINT = '次数是每一次打开留下的时间。改大了会补上中间缺的次数，改小了会去掉中间的记录。最早和最晚的时间会留下。'

/** 改最早或最晚时间时给玩家看的说明。 */
const SESSION_EDGE_HINT = '这个时间记在最早或最晚的一次。中间每一次的时间不会被整段重写。'

/** 时长输入框下面的说明。 */
const DURATION_HINT = '按小时和分钟填写。没满一分钟的秒数也可以改。'

/**
 * 把未知值收成整数，并限制在范围内。
 * @param value 输入框里的值
 * @param min 最小值
 * @param max 最大值
 * @returns 落在范围内的整数
 */
function clampInt(value: unknown, min = 0, max = 1000000): number {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) return min
  return Math.min(max, Math.max(min, parsed))
}

/**
 * 判断一个值是不是资源字段。
 * 用鸭子类型，避免测试和页面各拿一份类时 instanceof 对不上。
 * @param value 实例上的属性
 * @returns 是资源字段时为 true
 */
function isResourceField(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'value' in (value as object) && 'saveable' in (value as object)
}

/**
 * 判断字段是不是只读的计算属性。
 * 这类字段没有自己的存档，改它其实是在改访问记录。
 * @param item 资源实例
 * @param key 字段名
 * @returns 是没有 setter 的 getter 时为 true
 */
function isDerivedGetter(item: object, key: string): boolean {
  let proto = Object.getPrototypeOf(item)
  while (proto && proto !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)
    if (descriptor) return typeof descriptor.get === 'function' && !descriptor.set
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

/**
 * 读出一个字段现在的原始值。
 * 资源字段取 value，计算属性直接读，类上没有的字段再看保留下来的存档。
 * @param item 资源实例
 * @param key 字段名
 * @returns 原始值。没有时是 undefined
 */
function readRaw(item: any, key: string): unknown {
  if (!item) return undefined
  const field = item[key]
  if (isResourceField(field)) return (field as { value: unknown }).value
  if (field !== undefined && typeof field !== 'function') return field
  const retained = item.retainedFields
  if (retained && Object.prototype.hasOwnProperty.call(retained, key)) return retained[key]
  return undefined
}

/**
 * 读出访问记录。
 * 只留下字符串，顺序保持存档里的样子。头和尾就是第一次和最后一次，不能在这里重排。
 * @param item 资源实例
 * @returns 访问时间数组
 */
export function readVisitedSessions(item: any): string[] {
  const raw = readRaw(item, 'visitedSessions')
  if (!Array.isArray(raw)) return []
  return raw.filter((entry) => typeof entry === 'string' && entry)
}

/**
 * 把总时长拆成小时、分钟、秒，给表单填上。
 * @param total 存档里的时长
 * @param unit 存档单位
 * @returns 表单上的时分秒
 */
export function splitDuration(total: number, unit: 'seconds' | 'minutes'): DurationFormValue {
  const safe = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  if (unit === 'minutes') {
    return {
      hours: Math.floor(safe / 60),
      minutes: safe % 60,
      seconds: 0
    }
  }
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60
  }
}

/**
 * 把表单上的时分秒换回存档单位。
 * 分钟或秒超过 59 时会进位，这样玩家写成 90 分钟也不会丢。
 * @param value 表单上的时分秒
 * @param unit 存档单位
 * @returns 要写回存档的数字
 */
export function joinDuration(value: DurationFormValue | undefined, unit: 'seconds' | 'minutes'): number {
  let hours = clampInt(value?.hours, 0, 100000)
  let minutes = clampInt(value?.minutes, 0, 100000)
  let seconds = clampInt(value?.seconds, 0, 100000)
  minutes += Math.floor(seconds / 60)
  seconds = seconds % 60
  hours += Math.floor(minutes / 60)
  minutes = minutes % 60
  if (unit === 'minutes') return hours * 60 + minutes
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * 把存档里的时间转成本地日期时间输入框的值。
 * @param value 存档里的时间
 * @returns `YYYY-MM-DDTHH:mm`。无法解析时是空字符串
 */
export function toDatetimeLocal(value: unknown): string {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 把日期时间输入框的值转成 ISO 字符串再存。
 * 用本地时间构造，避免玩家填的钟点被时区挪走。
 * @param value 输入框的值
 * @returns ISO 字符串。空的或无法解析时是空字符串
 */
export function fromDatetimeLocal(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

/**
 * 按详情页的数据记录，决定这张表单要显示哪些项。
 * 跟详情用同一份配置，这样游戏看到时长和次数，漫画看到浏览次数，不用在每个资源类里再写一遍。
 * @param item 资源实例
 * @returns 表单字段。没有可改的记录时是空数组
 */
export function collectArchiveStatFields(item: any): ArchiveStatField[] {
  const records = item?.constructor?.detailPanelConfig?.dataRecords
  if (!Array.isArray(records)) return []
  const fields: ArchiveStatField[] = []
  for (const record of records) {
    const key = record?.field
    if (!key || SKIP_FIELDS.has(key)) continue
    const label = record.label || key
    if (SECONDS_DURATION_FIELDS.has(key) || MINUTES_DURATION_FIELDS.has(key) || record.formatter === 'formatPlayTime') {
      const durationUnit = MINUTES_DURATION_FIELDS.has(key) ? 'minutes' : 'seconds'
      fields.push({ key, label, kind: 'duration', durationUnit, hint: DURATION_HINT })
      continue
    }
    if (PERCENT_FIELDS.has(key)) {
      fields.push({ key, label, kind: 'percent', hint: '填 0 到 100。' })
      continue
    }
    if (SESSION_FIRST_FIELDS.has(key)) {
      fields.push({ key, label, kind: 'datetime', sessionEdge: 'first', hint: SESSION_EDGE_HINT })
      continue
    }
    if (SESSION_LAST_FIELDS.has(key)) {
      fields.push({ key, label, kind: 'datetime', sessionEdge: 'last', hint: SESSION_EDGE_HINT })
      continue
    }
    if (record.formatter === 'formatDate' || record.formatter === 'formatLastPlayed' || record.formatter === 'formatFirstPlayed') {
      fields.push({ key, label, kind: 'datetime' })
      continue
    }
    const derived = item ? isDerivedGetter(item, key) : false
    if (derived && SESSION_COUNT_FIELDS.has(key)) {
      fields.push({ key, label, kind: 'count', sessionCount: true, hint: SESSION_COUNT_HINT })
      continue
    }
    if (derived) continue
    fields.push({
      key,
      label,
      kind: 'count',
      hint: SESSION_COUNT_FIELDS.has(key) ? STORED_COUNT_HINT : undefined
    })
  }
  return fields
}

/**
 * 用资源上的当前值填表单。
 * @param item 资源实例
 * @param fields 要显示的字段
 * @returns 表单初值。时长是时分秒对象，时间是本地输入框字符串，次数是数字
 */
export function readArchiveStatForm(item: any, fields: ArchiveStatField[]): Record<string, DurationFormValue | string | number> {
  const form: Record<string, DurationFormValue | string | number> = {}
  for (const field of fields) {
    const raw = readRaw(item, field.key)
    if (field.kind === 'duration') {
      form[field.key] = splitDuration(Number(raw) || 0, field.durationUnit || 'seconds')
    } else if (field.kind === 'datetime') {
      form[field.key] = toDatetimeLocal(raw)
    } else {
      form[field.key] = Number(raw) || 0
    }
  }
  return form
}

/**
 * 按玩家改过的头、尾和次数，重写访问记录。
 * 次数不传时只替换头和尾，中间的时间留着。次数传了就按条数补上或去掉中间，头和尾仍然用玩家填的时间。
 * 清空时间输入框不会把原来的那一端抹掉，避免手滑把记录清光。要把次数归零，把次数改成 0。
 * @param existing 原来的访问记录
 * @param patch 这次要改的头、尾和次数
 * @param nowIso 一条记录都没有、又要把次数改大时，用来补上的时间
 * @returns 新的访问记录
 */
export function rebuildVisitedSessions(existing: string[], patch: SessionPatch, nowIso = new Date().toISOString()): string[] {
  const list = existing.filter((entry) => typeof entry === 'string' && entry)
  const first = patch.first ? patch.first : list[0]
  const last = patch.last ? patch.last : (list.length > 0 ? list[list.length - 1] : undefined)

  if (patch.count === 0) return []
  if (typeof patch.count === 'number') {
    const count = Math.max(0, Math.floor(patch.count))
    if (count === 0) return []
    const start = first || last || nowIso
    const end = last || start
    if (count === 1) return [end]
    const middleSource = list.length > 2 ? list.slice(1, -1) : []
    const middleCount = count - 2
    const middles = middleSource.slice(0, middleCount)
    while (middles.length < middleCount) middles.push(start)
    return [start, ...middles, end]
  }

  if (!first && !last) return list
  if (list.length === 0) {
    if (first && last && first !== last) return [first, last]
    return [first || last!]
  }
  const next = list.slice()
  if (patch.first) next[0] = patch.first
  if (patch.last) {
    if (next.length === 1 && patch.last !== next[0]) next.push(patch.last)
    else next[next.length - 1] = patch.last
  }
  return next
}

/**
 * 把表单收成可以写回资源的普通对象。
 * 游戏正在运行时不写游玩时长，免得和这一次正在累加的秒数叠在一起。
 * @param item 资源实例
 * @param fields 表单字段
 * @param form 玩家填的值
 * @param options 额外限制
 * @param options.lockPlayTime 为 true 时跳过 playTime
 * @returns 交给 assignSavedValue 的更新
 */
export function buildArchiveUpdates(
  item: any,
  fields: ArchiveStatField[],
  form: Record<string, any>,
  options?: { lockPlayTime?: boolean }
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  const patch: SessionPatch = {}
  let touchSessions = false
  for (const field of fields) {
    if (field.kind === 'duration') {
      if (options?.lockPlayTime && field.key === 'playTime') continue
      updates[field.key] = joinDuration(form[field.key], field.durationUnit || 'seconds')
      continue
    }
    if (field.kind === 'percent') {
      updates[field.key] = clampInt(form[field.key], 0, 100)
      continue
    }
    if (field.kind === 'count') {
      const count = clampInt(form[field.key], 0, 1000000)
      if (field.sessionCount) {
        patch.count = count
        touchSessions = true
      } else {
        updates[field.key] = count
      }
      continue
    }
    if (field.kind === 'datetime') {
      // 输入框只能到分钟。玩家没改过的时间继续用原来的字符串，避免一保存就把秒数截掉。
      const input = String(form[field.key] || '')
      const original = readRaw(item, field.key)
      const iso = input && typeof original === 'string' && toDatetimeLocal(original) === input
        ? original
        : fromDatetimeLocal(input)
      if (field.sessionEdge === 'first') {
        patch.first = iso || null
        touchSessions = true
      } else if (field.sessionEdge === 'last') {
        patch.last = iso || null
        touchSessions = true
      } else {
        updates[field.key] = iso
      }
    }
  }
  if (touchSessions) {
    updates.visitedSessions = rebuildVisitedSessions(readVisitedSessions(item), patch)
  }
  return updates
}
