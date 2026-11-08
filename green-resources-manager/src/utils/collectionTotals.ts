import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import { isCollectionRecord, memberIdsOf, resourceIdOf } from './collectionScope'

/**
 * 合集面板上可以合计的一种数字。
 * 时长和次数都在成员自己的记录上，合集只负责加总。
 */
export interface CollectionTotalSpec {
	/** 成员记录上的字段名 */
	key: string
	/** 面板上的名称。播放次数和打开次数共用 playCount，由调用方按页面改名。 */
	label: string
	/** seconds 用秒显示，minutes 先换成秒再显示，count 直接显示次数 */
	unit: 'seconds' | 'minutes' | 'count'
}

/**
 * 算完的一行总数据。
 */
export interface CollectionTotal {
	/** 字段名，和成员记录上的键一致 */
	key: string
	/** 给人看的名称 */
	label: string
	/** 怎么格式化 */
	unit: CollectionTotalSpec['unit']
	/** 子树合计。缺这个字段的成员按 0。 */
	value: number
}

/** 各页都可能出现的合计。没有这个字段的页面不会显示对应的一行。 */
export const COLLECTION_TOTAL_SPECS: CollectionTotalSpec[] = [
	{ key: 'playTime', label: '游玩时长', unit: 'seconds' },
	{ key: 'watchTime', label: '观看时长', unit: 'seconds' },
	{ key: 'readTime', label: '阅读时长', unit: 'minutes' },
	{ key: 'playCount', label: '打开次数', unit: 'count' }
]

/**
 * 读一条资源上的数字字段。
 * 类字段包在 ResourceField 里，普通对象和只读 getter 则直接是数。字段根本不存在时返回空，好和「有这个字段但值是 0」分开。
 * @param item 成员或合集
 * @param key 字段名
 */
export function numericField(item: any, key: string): number | null {
	if (!item || !key) return null
	/** 字段原值。类字段、存档残留和只读 getter 都收成同一个数。 */
	let raw: unknown
	if (Object.prototype.hasOwnProperty.call(item, key)) {
		raw = BaseResources.extractPrimitiveValue(item[key])
	} else if (item.retainedFields && Object.prototype.hasOwnProperty.call(item.retainedFields, key)) {
		raw = item.retainedFields[key]
	} else if (typeof item[key] === 'number') {
		raw = item[key]
	} else {
		return null
	}
	if (raw === undefined || raw === null || raw === '') return null
	const value = Number(raw)
	return Number.isFinite(value) ? value : null
}

/**
 * 合集里面的普通资源，包含子合集里的。
 * 同一个合集不重复进入，避免以后嵌套绕成环时把时长加个没完。
 * @param items 当前页的全部记录
 * @param collection 正在看的合集
 */
export function subtreeResources(items: any[], collection: any): any[] {
	/** 按 id 找成员。子合集和普通资源都在这一页里。 */
	const byId = new Map<string, any>()
	for (const item of items || []) {
		const id = resourceIdOf(item)
		if (id) byId.set(id, item)
	}
	/** 已经走进去的合集，用来挡住环。 */
	const seen = new Set<string>()
	/**
	 * 展开一个合集的直接成员。
	 * @param current 当前这一层合集
	 */
	const walk = (current: any): any[] => {
		const id = resourceIdOf(current)
		if (!id || seen.has(id)) return []
		seen.add(id)
		/** 这一层收来的普通资源。 */
		const found: any[] = []
		for (const memberId of memberIdsOf(current)) {
			const member = byId.get(memberId)
			if (!member) continue
			if (isCollectionRecord(member)) found.push(...walk(member))
			else found.push(member)
		}
		return found
	}
	return walk(collection)
}

/**
 * 计算合集面板下半的总数据。
 * 页面字段里有的一定显示，哪怕现在是 0。页面没写、但成员自己带着的也显示，这样自定义页不会把时长藏掉。
 * 旧番剧迁过来的底数加在合计上。底数存在合集的 carried 加字段名上，没有就是 0。
 * @param items 当前页的全部记录
 * @param collection 正在看的合集
 * @param pageFieldKeys 这一页配置过的字段。空表示没配过，只根据成员身上有没有字段来决定
 */
export function collectionTotals(items: any[], collection: any, pageFieldKeys: string[] | null): CollectionTotal[] {
	/** 子树里的普通资源。合集自己不拿来加时长。 */
	const members = subtreeResources(items, collection)
	/** 这一页明确要求显示的字段。 */
	const listed = new Set(pageFieldKeys || [])
	/** 面板上要画的行。 */
	const rows: CollectionTotal[] = []
	for (const spec of COLLECTION_TOTAL_SPECS) {
		const onPage = pageFieldKeys != null && listed.has(spec.key)
		const onMember = members.some(member => numericField(member, spec.key) != null)
		if (!onPage && !onMember) continue
		/** 成员合计。没有该字段的成员不加。 */
		const sum = members.reduce((total, member) => total + (numericField(member, spec.key) || 0), 0)
		/** 迁移旧番剧时留下的底数，字段名是 carried 加上原来的键。 */
		const carried = numericField(collection, `carried${spec.key.charAt(0).toUpperCase()}${spec.key.slice(1)}`) || 0
		const label = spec.key === 'playCount' && listed.has('watchTime') && !listed.has('playTime')
			? '播放次数'
			: spec.label
		rows.push({ key: spec.key, label, unit: spec.unit, value: sum + carried })
	}
	return rows
}

/**
 * 把合计格式化成面板上的文字。
 * 次数直接写数字。时长为 0 时写「0 分钟」，不用「未游玩」，因为这是一组的总数。
 * @param total 一行合计
 */
export function formatCollectionTotal(total: CollectionTotal): string {
	if (total.unit === 'count') return String(Math.max(0, Math.round(total.value)))
	/** 阅读时长按分钟存，显示前换成秒，和游玩时长同一套小时分钟。 */
	const seconds = total.unit === 'minutes' ? total.value * 60 : total.value
	if (!seconds) return '0 分钟'
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
	if (minutes > 0) return `${minutes} 分钟`
	return `${Math.round(seconds)} 秒`
}
