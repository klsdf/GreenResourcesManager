import { describe, expect, it } from 'vitest'
import {
  mergeWatchPosition,
  readWatchPosition,
  resumeSeconds,
  watchPercent
} from './watchProgress'

describe('视频播放位置', () => {
  it('按片长算出百分比', () => {
    expect(watchPercent(30, 120)).toBe(25)
    expect(watchPercent(0, 0)).toBe(0)
  })

  it('快到片尾或已经看完时从头播放', () => {
    expect(resumeSeconds({ seconds: 40, progress: 20, duration: 200 })).toBe(40)
    expect(resumeSeconds({ seconds: 2, progress: 1, duration: 200 })).toBe(0)
    expect(resumeSeconds({ seconds: 195, progress: 97, duration: 200 })).toBe(0)
    expect(resumeSeconds({ seconds: 190, progress: 80, duration: 200 })).toBe(0)
  })

  it('单个视频只改播放位置，看到 95% 记为看完', () => {
    const merged = mergeWatchPosition(
      { id: 'v1', name: '电影', resourcePath: 'D:/Video/a.mp4', tags: ['剧情'] },
      'D:/video/a.mp4',
      { seconds: 100, progress: 96, duration: 104 }
    )
    expect(merged.name).toBe('电影')
    expect(merged.tags).toEqual(['剧情'])
    expect(merged.playbackSeconds).toBe(100)
    expect(merged.watchProgress).toBe(96)
    expect(merged.finished).toBe(true)
  })

  it('番剧按文件记进度，不把整个文件夹标成看完', () => {
    const merged = mergeWatchPosition(
      { id: 'f1', name: '番剧', resourcePath: 'D:/Anime/Show', playbackByFile: {} },
      'D:/Anime/Show/02.mkv',
      { seconds: 12, progress: 8, duration: 1500 }
    )
    expect(merged.finished).toBeUndefined()
    const position = readWatchPosition(merged, 'd:/anime/show/02.mkv')
    expect(position.seconds).toBe(12)
    expect(position.progress).toBe(8)
    expect(merged.watchTime).toBe(12)
  })

  it('番剧继续播放时把前进的几秒累加到整季时长，快进一大段不计入', () => {
    const first = mergeWatchPosition(
      {
        id: 'f1',
        resourcePath: 'D:/Anime/Show',
        watchTime: 12,
        playbackByFile: {
          'd:\\anime\\show\\02.mkv': { seconds: 12, progress: 8, duration: 1500 }
        }
      },
      'D:/Anime/Show/02.mkv',
      { seconds: 18, progress: 10, duration: 1500 }
    )
    expect(first.watchTime).toBe(18)
    const skipped = mergeWatchPosition(
      first,
      'D:/Anime/Show/02.mkv',
      { seconds: 200, progress: 20, duration: 1500 }
    )
    expect(skipped.watchTime).toBe(18)
  })
})
