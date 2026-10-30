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
	it('根目录把合集放在未归组资源前面，已经收进去的不再重复出现', () => {
		const items = [
			resource('g1', '游戏一'),
			collection('c1', '系列', ['g1']),
			resource('g2', '游戏二')
		]
		const listed = listCollectionScope(items, items, '', false)
		expect(listed.map(item => item.id)).toEqual(['c1', 'g2'])
	})

	it('进入合集后按成员顺序显示，合集自己不出现', () => {
		const items = [
			resource('g1', '第一季'),
			resource('g2', '第二季'),
			collection('c1', '整部', ['g2', 'g1'])
		]
		const listed = listCollectionScope(items, items, 'c1', false)
		expect(listed.map(item => item.id)).toEqual(['g2', 'g1'])
		expect(listed.every(item => !isCollectionRecord(item))).toBe(true)
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
