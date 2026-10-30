import { BaseResources } from '@resources/base/ResourcesDataBase.ts'

/**
 * 读资源上的一个字段。
 * 类实例的字段包在 ResourceField 里，测试和存档里的普通对象则直接是值。
 * @param field 字段或原始值
 */
export function readResourceValue(field: unknown): unknown {
	return BaseResources.extractPrimitiveValue(field)
}

/**
 * 这条是不是合集。
 * 合集没有文件路径，点它是进入二级目录，不是打开详情里的播放器或阅读器。
 * @param item 列表中的一条
 */
export function isCollectionRecord(item: any): boolean {
	if (!item) return false
	if (item.constructor?.name === 'Collection') return true
	const savedType = String(readResourceValue(item.resourceType) || '').trim().toLowerCase()
	return savedType === 'collection'
}

/**
 * 资源 id。没有 id 的记录不能加入合集。
 * @param item 列表中的一条
 */
export function resourceIdOf(item: any): string {
	const id = readResourceValue(item?.id)
	return id == null ? '' : String(id)
}

/**
 * 合集的成员 id。不是合集，或名单不是数组时，返回空数组。
 * @param item 可能是合集的记录
 */
export function memberIdsOf(item: any): string[] {
	if (!isCollectionRecord(item)) return []
	const raw = readResourceValue(item.memberIds)
	if (!Array.isArray(raw)) return []
	return raw.map(id => String(id)).filter(Boolean)
}

/**
 * 把成员名单写回合集。
 * 类实例写到 ResourceField.value，普通对象直接改数组。
 * @param item 合集
 * @param memberIds 新的成员 id，按显示顺序
 */
export function writeMemberIds(item: any, memberIds: string[]): void {
	if (!item) return
	const next = [...memberIds]
	const field = item.memberIds
	if (field && typeof field === 'object' && 'value' in field) {
		field.value = next
		return
	}
	item.memberIds = next
}

/**
 * 一个资源当前属于哪个合集。
 * 同一页只保留先出现的那个合集，后面的重复 id 在整理时会被拿掉。
 */
export interface MembershipIndex {
	/** 成员 id 到合集 id */
	ownerByMember: Map<string, string>
	/** 成员 id 到合集名称，搜索打穿时标在卡片上 */
	nameByMember: Map<string, string>
}

/**
 * 扫描整页，建立成员和合集的对照。
 * 用全部资源而不是筛选结果，这样根目录才知道谁已经被收进合集。
 * @param items 当前页的全部记录
 */
export function indexMembership(items: any[]): MembershipIndex {
	/** 成员属于哪一个合集。 */
	const ownerByMember = new Map<string, string>()
	/** 成员所属合集的名称。 */
	const nameByMember = new Map<string, string>()
	for (const item of items || []) {
		if (!isCollectionRecord(item)) continue
		const collectionId = resourceIdOf(item)
		if (!collectionId) continue
		const name = String(readResourceValue(item.name) || '未命名合集')
		for (const memberId of memberIdsOf(item)) {
			if (ownerByMember.has(memberId)) continue
			ownerByMember.set(memberId, collectionId)
			nameByMember.set(memberId, name)
		}
	}
	return { ownerByMember, nameByMember }
}

/**
 * 决定这一屏要列出哪些卡片。
 * 没有搜索和筛选时，根目录是合集加上还没归组的资源，合集排在前面。
 * 有搜索或筛选时，根目录把已经收进合集的资源也列出来。
 * 已经进入某个合集时，只列它的成员，并且仍尊重当前搜索和筛选。
 * @param items 当前页全部记录
 * @param filtered 搜索、筛选和排序之后的记录
 * @param currentCollectionId 正在看的合集。空字符串表示还在根目录
 * @param punchThrough 根目录是否要打穿合集
 */
export function listCollectionScope(
	items: any[],
	filtered: any[],
	currentCollectionId: string,
	punchThrough: boolean
): any[] {
	/** 全部记录按 id 查找，进入合集时要按成员顺序取。 */
	const byId = new Map<string, any>()
	for (const item of items || []) {
		const id = resourceIdOf(item)
		if (id) byId.set(id, item)
	}
	/** 筛选结果里的 id。合集内部只显示既是成员、又通过筛选的资源。 */
	const filteredIds = new Set((filtered || []).map(resourceIdOf).filter(Boolean))

	if (currentCollectionId) {
		const collection = byId.get(currentCollectionId)
		if (!collection || !isCollectionRecord(collection)) return []
		/** 按合集里的顺序排，不跟着根目录的排序打乱剧集或书卷。 */
		const members: any[] = []
		for (const memberId of memberIdsOf(collection)) {
			if (!filteredIds.has(memberId)) continue
			const member = byId.get(memberId)
			if (!member || isCollectionRecord(member)) continue
			members.push(member)
		}
		return members
	}

	if (punchThrough) return filtered || []

	const { ownerByMember } = indexMembership(items)
	/** 合集卡片保持筛选结果里的相对顺序，再统一放到未归组资源前面。 */
	const collections = (filtered || []).filter(item => isCollectionRecord(item))
	const ungrouped = (filtered || []).filter(item => {
		if (isCollectionRecord(item)) return false
		const id = resourceIdOf(item)
		return !id || !ownerByMember.has(id)
	})
	return [...collections, ...ungrouped]
}
