import { describe, expect, it } from 'vitest'
import { getFilterFunctions } from './filterLibrary'

/**
 * 造一条带完成标记和访问记录的资源。
 * @param finished 是否已标记完成
 * @param visits 访问次数
 */
function resource(finished: boolean, visits: number) {
  return {
    finished: { value: finished },
    visitedSessions: { value: Array.from({ length: visits }, (_, index) => `2026-01-0${index + 1}`) }
  }
}

describe('完成情况筛选', () => {
  const { extractFn, matchFn } = getFilterFunctions('completion', {})

  it('分成已看完、未看完和未访问，空档也保留', () => {
    const items = [
      resource(true, 2),
      resource(true, 0),
      resource(false, 1),
      resource(false, 0),
      { finished: false }
    ]

    expect(extractFn(items)).toEqual([
      { name: '已看完', count: 2 },
      { name: '未看完', count: 1 },
      { name: '未访问', count: 2 }
    ])
  })

  it('多选时保留其中任意一类，排除优先于选中', () => {
    expect(matchFn(resource(true, 1), ['已看完', '未访问'], [])).toBe(true)
    expect(matchFn(resource(false, 1), ['已看完'], [])).toBe(false)
    expect(matchFn(resource(false, 0), ['未访问'], [])).toBe(true)
    expect(matchFn(resource(false, 3), [], ['未看完'])).toBe(false)
    expect(matchFn(resource(true, 0), ['已看完'], ['已看完'])).toBe(false)
    expect(matchFn(resource(false, 0), [], [])).toBe(true)
  })
})
