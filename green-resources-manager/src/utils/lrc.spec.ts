import { describe, expect, it } from 'vitest'
import { findActiveLyricIndex, parseLrc } from './lrc'

describe('LRC 歌词解析', () => {
  it('解析常见的毫米秒时间标签', () => {
    const lines = parseLrc('[ti:示例]\n[ar:歌手]\n[00:01.50]第一句\n[00:12.00]第二句')
    expect(lines).toEqual([
      { time: 1.5, text: '第一句' },
      { time: 12, text: '第二句' }
    ])
  })

  it('一行多个时间标签会展开成多行', () => {
    const lines = parseLrc('[00:05.00][00:20.00]副歌')
    expect(lines).toEqual([
      { time: 5, text: '副歌' },
      { time: 20, text: '副歌' }
    ])
  })

  it('兼容 [mm:ss] 和 [mm:ss:xx] 写法', () => {
    const lines = parseLrc('[00:03]甲\n[00:04:50]乙\n[01:02:25]丙')
    expect(lines).toEqual([
      { time: 3, text: '甲' },
      { time: 4.5, text: '乙' },
      { time: 62.25, text: '丙' }
    ])
  })

  it('offset 为正时歌词提前', () => {
    const lines = parseLrc('[offset:+500]\n[00:10.00]一句')
    expect(lines).toEqual([{ time: 9.5, text: '一句' }])
  })

  it('忽略没有时间标签的行，并按时间排序', () => {
    const lines = parseLrc('随便写的说明\n[00:30.00]后\n[00:10.00]前')
    expect(lines.map((line) => line.text)).toEqual(['前', '后'])
  })

  it('空行和时间行都能保留空文本', () => {
    const lines = parseLrc('[00:10.00]\n[00:12.00]有字')
    expect(lines).toEqual([
      { time: 10, text: '' },
      { time: 12, text: '有字' }
    ])
  })
})

describe('当前歌词行', () => {
  const lines = parseLrc('[00:01.00]一\n[00:05.00]二\n[00:09.00]三')

  it('返回播放时间之前最后一句', () => {
    expect(findActiveLyricIndex(lines, 0.5)).toBe(-1)
    expect(findActiveLyricIndex(lines, 1)).toBe(0)
    expect(findActiveLyricIndex(lines, 6.8)).toBe(1)
    expect(findActiveLyricIndex(lines, 100)).toBe(2)
  })
})
