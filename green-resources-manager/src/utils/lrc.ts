/**
 * LRC 歌词解析
 * 支持 [mm:ss]、[mm:ss.xx]、[mm:ss:xx]，一行多个时间标签，以及 offset 标签。
 */

export interface LrcLine {
  /** 起始时间（秒） */
  time: number
  text: string
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const META_TAG = /^\[(ti|ar|al|by|offset|re|ve|length):([^\]]*)\]$/i

/**
 * 解析 LRC 文本。
 * 没有时间标签的行（标题、作者等）会被忽略。
 */
export function parseLrc(content: string): LrcLine[] {
  if (!content) return []

  const lines: LrcLine[] = []
  let offsetMs = 0

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const meta = META_TAG.exec(line)
    if (meta) {
      if (meta[1].toLowerCase() === 'offset') {
        const value = Number(meta[2])
        if (Number.isFinite(value)) offsetMs = value
      }
      continue
    }

    const times: number[] = []
    TIME_TAG.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = TIME_TAG.exec(line))) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0
      times.push(minutes * 60 + seconds + fraction)
    }
    if (times.length === 0) continue

    const text = line.replace(TIME_TAG, '').trim()
    for (const time of times) {
      lines.push({ time: Math.max(0, time - offsetMs / 1000), text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

/**
 * 找出当前时间对应的歌词行。
 * @returns 最后一行的下标；还没到第一句时返回 -1
 */
export function findActiveLyricIndex(lines: LrcLine[], time: number): number {
  let low = 0
  let high = lines.length - 1
  let found = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lines[mid].time <= time + 0.001) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}
