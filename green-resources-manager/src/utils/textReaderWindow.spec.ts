import { describe, expect, it } from 'vitest'
import {
  MAX_MOUNTED_TEXT_PAGES,
  extendWindowDown,
  extendWindowUp,
  normalizeTextReadMode,
  seedWindowDown,
  sliceTextPage
} from './textReaderWindow'

describe('文本阅读器挂页窗口', () => {
  it('没写过阅读方式时仍是分页', () => {
    expect(normalizeTextReadMode(undefined)).toBe('paged')
    expect(normalizeTextReadMode('scroll')).toBe('paged')
    expect(normalizeTextReadMode('infinite')).toBe('infinite')
  })

  it('从第几万页打开时，只向后取固定的几页', () => {
    const seeded = seedWindowDown(20000, 50000, MAX_MOUNTED_TEXT_PAGES)
    expect(seeded).toEqual({ start: 20000, end: 20007 })
    expect(seeded.end - seeded.start + 1).toBe(MAX_MOUNTED_TEXT_PAGES)
  })

  it('书的末尾不够一窗时，停在最后一页', () => {
    expect(seedWindowDown(49998, 50000, 8)).toEqual({ start: 49998, end: 50000 })
    expect(seedWindowDown(1, 3, 8)).toEqual({ start: 1, end: 3 })
  })

  it('一直向下接页时，挂着的页数不会超过上限，也不会回到开头', () => {
    let window = seedWindowDown(8000, 20000, 8)
    for (let step = 0; step < 500; step += 1) {
      window = extendWindowDown(window, 20000, 8)
      expect(window.end - window.start + 1).toBeLessThanOrEqual(8)
      expect(window.start).toBeGreaterThan(1)
    }
    expect(window).toEqual({ start: 8500, end: 8507 })
  })

  it('向上回翻同样只保留附近几页', () => {
    let window = seedWindowDown(8000, 20000, 8)
    for (let step = 0; step < 10; step += 1) {
      window = extendWindowUp(window, 20000, 8)
      expect(window.end - window.start + 1).toBeLessThanOrEqual(8)
    }
    expect(window).toEqual({ start: 7990, end: 7997 })
    expect(extendWindowUp({ start: 1, end: 8 }, 20000, 8)).toEqual({ start: 1, end: 8 })
  })

  it('切页只取当前这一段，不会把几万页拼成一段', () => {
    const content = '甲'.repeat(1000) + '乙'.repeat(1000)
    expect(sliceTextPage(content, 1, 1000)).toBe('甲'.repeat(1000))
    expect(sliceTextPage(content, 2, 1000)).toBe('乙'.repeat(1000))
    expect(sliceTextPage(content, 3, 1000)).toBe('')
  })
})
