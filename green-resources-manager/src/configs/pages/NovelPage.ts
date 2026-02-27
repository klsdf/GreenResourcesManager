import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Novel as NovelClass } from '@resources/novel.ts'

type Novel = InstanceType<typeof NovelClass>

export class NovelPage extends BasePage {
	readonly id: string = 'novels'
	readonly name: string = '小说'
	readonly icon: string = '📚'
	readonly description: string = '可以管理小说文件，支持 TXT、EPUB、PDF 等格式'
	
	// 分页设置键名（用于从设置中读取分页配置）
	readonly settingsKey: string = 'novel'
	
	// 默认每页显示数量
	readonly defaultPageSize: number = 8

	resourceTypes: string[] = ['Novel']

	displayLayoutConfig = {
		minWidth: 150,
		maxWidth: 400
	}

	sortOptions: SortOptionConfig[] = [
		{ id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
		{ id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
		{ id: 'author-asc', label: '按作者排序', field: 'author', order: 'asc' },
		{ id: 'author-desc', label: '按作者排序（降序）', field: 'author', order: 'desc' },
		{ id: 'readProgress-asc', label: '按阅读进度（升序）', field: 'readProgress', order: 'asc' },
		{ id: 'readProgress-desc', label: '按阅读进度（降序）', field: 'readProgress', order: 'desc' },
		{ id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
		{ id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' },
		{ id: 'lastRead-asc', label: '按最后阅读（升序）', field: 'lastRead', order: 'asc' },
		{ id: 'lastRead-desc', label: '按最后阅读（降序）', field: 'lastRead', order: 'desc' }
	]
	
	getEmptyStateConfig() {
		return {
			icon: '📚',
			title: '你的小说库是空的',
			description: '点击"添加小说"按钮来添加你的第一本小说',
			buttonText: '添加第一本小说',
			buttonAction: 'showAddNovelDialog'
		}
	}
	
	getToolbarConfig() {
		return {
			items: [
				{
					type: 'button',
					label: '添加小说',
					action: 'showAddNovelDialog',
					icon: '➕',
					buttonType: 'primary'
				},
				{
					type: 'button',
					label: '批量导入本地资源',
					action: 'showBatchImportDialog',
					icon: '📥'
				},
				{
					type: 'search',
					placeholder: '搜索小说...',
					action: 'filterBySearch'
				},
				{
					type: 'multi-select'
				},
				{
					type: 'layout'
				},
				{
					type: 'sort'
				}
			],
			sortOptions: this.sortOptions,
			pageType: this.id
		}
	}

	getFilterConfig<T = Novel>(): FilterConfig<T>[] {
		const baseFilters = super.getFilterConfig<T>()
		
		const novelFilters: FilterConfig<T>[] = [
			{
				key: 'tags',
				title: '标签筛选',
				fieldAccessor: (novel: any) => {
					return (novel as any).tags?.value || []
				},
				isArray: true
			},
			{
				key: 'authors',
				title: '作者筛选',
				fieldAccessor: (novel: any) => {
					return (novel as any).author?.value || ''
				},
				isArray: false
			}
		] as FilterConfig<T>[]
		
		return [...baseFilters, ...novelFilters]
	}
}
