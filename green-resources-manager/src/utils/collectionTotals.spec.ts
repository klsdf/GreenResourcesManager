import { describe, expect, it } from 'vitest'
import { collectionTotals, formatCollectionTotal, subtreeResources } from './collectionTotals'

/**
 * 做一条带时长的资源。
 * @param id 资源 id
 * @param playTime 游玩秒数
 * @param playCount 打开次数
 */
function game(id: string, playTime: number, playCount: number) {
	return { id, name: id, resourceType: 'game', playTime, playCount }
}

/**
 * 做一条合集。
 * @param id 合集 id
 * @param memberIds 成员 id
 */
function collection(id: string, memberIds: string[]) {
	return { id, name: id, resourceType: 'collection', memberIds }
}

describe('合集总数据', () => {
	it('把子合集里的游戏时长和次数加进上一层，同一部不加两次', () => {
		const inner = collection('inner', ['g1'])
		const outer = collection('outer', ['inner', 'g2'])
		const items = [game('g1', 3600, 2), game('g2', 120, 1), inner, outer]
		expect(subtreeResources(items, outer).map(item => item.id)).toEqual(['g1', 'g2'])
		const rows = collectionTotals(items, outer, ['playTime', 'playCount'])
		expect(rows.find(row => row.key === 'playTime')?.value).toBe(3720)
		expect(rows.find(row => row.key === 'playCount')?.value).toBe(3)
		expect(formatCollectionTotal(rows[0])).toBe('1 小时 2 分钟')
	})

	it('成员自己带的时长也会显示，即使页面字段名单里没有写', () => {
		const series = collection('c1', ['g1'])
		const items = [game('g1', 10, 1), series]
		const rows = collectionTotals(items, series, ['name'])
		expect(rows.map(row => row.key)).toEqual(['playTime', 'playCount'])
	})

	it('旧番剧底数加在成员合计上', () => {
		const series = collection('c1', [])
		series.carriedWatchTime = 600
		const rows = collectionTotals([series], series, ['watchTime', 'playCount'])
		expect(rows.find(row => row.key === 'watchTime')?.value).toBe(600)
		expect(rows.find(row => row.key === 'playCount')?.label).toBe('播放次数')
	})
})
