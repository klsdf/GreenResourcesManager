import { describe, expect, it } from 'vitest'
import { indexMembership, isCollectionRecord, listCollectionScope, writeMemberIds } from './collectionScope'

/**
 * 做一条测试用的普通资源。
 * @param id 资源 id
 * @param name 名称
 */
function resource(id: string, name: string) {
	return { id, name, resourceType: 'game' }
}

/**
 * 做一条测试用的合集。
 * @param id 合集 id
 * @param name 名称
 * @param memberIds 成员 id
 */
function collection(id: string, name: string, memberIds: string[]) {
	return { id, name, resourceType: 'collection', memberIds }
}

describe('合集列表范围', () => {
	it('根目录按当前排序穿插合集和单独文件，已经收进去的不再重复出现', () => {
		const hidden = resource('g1', '游戏一')
		const series = collection('c1', '系列', ['g1'])
		const second = resource('g2', '游戏二')
		const third = resource('g3', '游戏三')
		const items = [hidden, series, second, third]
		const listed = listCollectionScope(items, [second, series, third, hidden], '', false)
		expect(listed.map(item => item.id)).toEqual(['g2', 'c1', 'g3'])
	})

	it('进入合集后按当前排序显示成员，不按加入顺序，合集自己不出现', () => {
		const first = resource('g1', '第一季')
		const second = resource('g2', '第二季')
		const series = collection('c1', '整部', ['g2', 'g1'])
		const items = [first, second, series]
		const listed = listCollectionScope(items, [first, second, series], 'c1', false)
		expect(listed.map(item => item.id)).toEqual(['g1', 'g2'])
		expect(listed.every(item => !isCollectionRecord(item))).toBe(true)
	})

	it('进入合集后跟着筛选结果倒序，名称倒序时成员也倒序', () => {
		const first = resource('g1', '第一季')
		const second = resource('g2', '第二季')
		const series = collection('c1', '整部', ['g1', 'g2'])
		const items = [first, second, series]
		const listed = listCollectionScope(items, [second, first, series], 'c1', false)
		expect(listed.map(item => item.id)).toEqual(['g2', 'g1'])
	})

	it('根目录有搜索时打穿合集，成员可以和合集一起出现', () => {
		const loose = resource('g2', '另一部')
		const grouped = resource('g1', '第一季')
		const series = collection('c1', '整部', ['g1'])
		const items = [grouped, loose, series]
		const filtered = [grouped, series]
		const listed = listCollectionScope(items, filtered, '', true)
		expect(listed.map(item => item.id)).toEqual(['g1', 'c1'])
		expect(indexMembership(items).nameByMember.get('g1')).toBe('整部')
	})

	it('写入成员名单时覆盖旧数组', () => {
		const series = collection('c1', '整部', ['g1'])
		writeMemberIds(series, ['g2'])
		expect(series.memberIds).toEqual(['g2'])
	})
})
