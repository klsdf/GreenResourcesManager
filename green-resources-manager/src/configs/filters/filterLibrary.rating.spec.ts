import { describe, expect, it } from 'vitest'
import { getFilterFunctions } from './filterLibrary'

/** 带字段对象评分的资源，和运行时 ResourceField 的形态一致。 */
function rated(rating: unknown) {
  return { rating: { value: rating } }
}

describe('星级筛选', () => {
  const { extractFn, matchFn } = getFilterFunctions('rating', {})

  it('按 5 星到未评分统计，空档也保留', () => {
    const items = [
      rated(5),
      rated(5),
      rated(4),
      rated(1),
      rated(0),
      rated(null),
      { rating: 3 },
      rated(9)
    ]

    expect(extractFn(items)).toEqual([
      { name: '5 星', count: 2 },
      { name: '4 星', count: 1 },
      { name: '3 星', count: 1 },
      { name: '2 星', count: 0 },
      { name: '1 星', count: 1 },
      { name: '未评分', count: 3 }
    ])
  })

  it('多选星级时保留其中任意一档，排除优先于选中', () => {
    expect(matchFn(rated(5), ['5 星', '4 星'], [])).toBe(true)
    expect(matchFn(rated(3), ['5 星', '4 星'], [])).toBe(false)
    expect(matchFn(rated(0), [], ['未评分'])).toBe(false)
    expect(matchFn(rated(5), ['5 星'], ['5 星'])).toBe(false)
    expect(matchFn({ rating: undefined }, [], [])).toBe(true)
  })
})
