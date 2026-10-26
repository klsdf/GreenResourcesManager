import { describe, expect, it } from 'vitest'
import {
  clampReadingPage,
  clampReadingPercent,
  mergeReadingPosition,
  readReadingPosition,
  readingPercent
} from './readingProgress'

describe('阅读位置', () => {
  it('页码至少从 1 开始，并且不超过总页数', () => {
    expect(clampReadingPage(0, 20)).toBe(1)
    expect(clampReadingPage(8, 20)).toBe(8)
    expect(clampReadingPage(50, 20)).toBe(20)
    expect(clampReadingPage(undefined)).toBe(1)
  })

  it('用当前页算出百分比，最后一页是 100', () => {
    expect(readingPercent(1, 4)).toBe(25)
    expect(readingPercent(4, 4)).toBe(100)
    expect(readingPercent(3, 0)).toBe(0)
    expect(clampReadingPercent(140)).toBe(100)
    expect(clampReadingPercent(-5)).toBe(0)
  })

  it('合并时只改位置，空的 EPUB 位置不会擦掉原来的', () => {
    const merged = mergeReadingPosition(
      { id: 'n1', name: '旧小说', tags: ['奇幻'], currentPage: 2, readProgress: 10, epubCfi: 'epubcfi(/6/4)' },
      { currentPage: 9, readProgress: 40, totalPages: 20 }
    )
    expect(merged.name).toBe('旧小说')
    expect(merged.tags).toEqual(['奇幻'])
    expect(merged.currentPage).toBe(9)
    expect(merged.readProgress).toBe(40)
    expect(merged.epubCfi).toBe('epubcfi(/6/4)')
  })

  it('旧记录没有进度时从第一页开始', () => {
    expect(readReadingPosition(null)).toEqual({ currentPage: 1, readProgress: 0, epubCfi: '' })
    expect(readReadingPosition({ currentPage: 6, readProgress: 12, epubCfi: 'epubcfi(/6/8)' })).toEqual({
      currentPage: 6,
      readProgress: 12,
      epubCfi: 'epubcfi(/6/8)'
    })
  })
})
