import { BasePage } from './base/BasePage.ts'
import type { SortOption } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { Novel as NovelClass } from '@resources/novel.ts'

// Novel 类型就是 NovelClass 的实例类型
type Novel = InstanceType<typeof NovelClass>

export class NovelPage extends BasePage {
	readonly id: string = 'novels'
	readonly name: string = '小说'
	readonly icon: string = '📚'
	readonly description: string = '可以管理小说文件，支持 TXT、EPUB、PDF 等格式'

	// 接受的资源类型
	resourceTypes: string[] = ['Novel']

	// 页面布局配置
	displayLayoutConfig = {
		minWidth: 150,
		maxWidth: 400
	}
	
	/**
	 * 获取空状态配置
	 */
	getEmptyStateConfig() {
		return {
			icon: '📚',
			title: '你的小说库是空的',
			description: '点击"添加小说"按钮来添加你的第一本小说',
			buttonText: '添加第一本小说',
			buttonAction: 'showAddNovelDialog'
		}
	}
	
	/**
	 * 获取工具栏配置
	 */
	getToolbarConfig() {
		return {
			addButtonText: '添加小说',
			searchPlaceholder: '搜索小说...'
		}
	}

	/**
	 * 排序配置
	 */
	private sortConfigs: Record<string, SortConfig<Novel> & { label: string }> = {
		'name-asc': {
			label: '按名称排序',
			fieldAccessor: (novel: Novel) => {
				return (novel as any).name?.value || null
			},
			order: 'asc'
		},
		'name-desc': {
			label: '按名称排序（降序）',
			fieldAccessor: (novel: Novel) => {
				return (novel as any).name?.value || null
			},
			order: 'desc'
		},
		'author-asc': {
			label: '按作者排序',
			fieldAccessor: (novel: Novel) => {
				return (novel as any).author?.value || null
			},
			order: 'asc'
		},
		'author-desc': {
			label: '按作者排序（降序）',
			fieldAccessor: (novel: Novel) => {
				return (novel as any).author?.value || null
			},
			order: 'desc'
		},
		'readProgress-asc': {
			label: '按阅读进度（升序）',
			fieldAccessor: (novel: Novel) => {
				const value = (novel as any).readProgress?.value
				return value != null ? value : null
			},
			order: 'asc'
		},
		'readProgress-desc': {
			label: '按阅读进度（降序）',
			fieldAccessor: (novel: Novel) => {
				const value = (novel as any).readProgress?.value
				return value != null ? value : null
			},
			order: 'desc'
		},
		'added-asc': {
			label: '按添加时间（升序）',
			fieldAccessor: (novel: Novel) => {
				const addedDate = (novel as any).addedDate?.value || (novel as any).addedDate
				return addedDate ? new Date(addedDate).getTime() : null
			},
			order: 'asc'
		},
		'added-desc': {
			label: '按添加时间（降序）',
			fieldAccessor: (novel: Novel) => {
				const addedDate = (novel as any).addedDate?.value || (novel as any).addedDate
				return addedDate ? new Date(addedDate).getTime() : null
			},
			order: 'desc'
		},
		'lastRead-asc': {
			label: '按最后阅读（升序）',
			fieldAccessor: (novel: Novel) => {
				const lastRead = (novel as any).lastRead?.value
				return lastRead ? new Date(lastRead).getTime() : null
			},
			order: 'asc'
		},
		'lastRead-desc': {
			label: '按最后阅读（降序）',
			fieldAccessor: (novel: Novel) => {
				const lastRead = (novel as any).lastRead?.value
				return lastRead ? new Date(lastRead).getTime() : null
			},
			order: 'desc'
		}
	}

	/**
	 * 获取排序选项配置（用于工具栏显示）
	 */
	getSortOptions(): SortOption[] {
		return Object.entries(this.sortConfigs).map(([value, config]) => ({
			value,
			label: config.label
		}))
	}

	/**
	 * 根据排序值获取排序配置
	 */
	getSortConfig(sortValue: string): SortConfig<Novel> | null {
		const config = this.sortConfigs[sortValue]
		if (!config) {
			return null
		}
		
		return {
			fieldAccessor: config.fieldAccessor,
			order: config.order,
			compareFn: config.compareFn
		}
	}

	/**
	 * 获取筛选配置
	 * 定义小说页面支持的所有筛选器
	 */
	getFilterConfig<T = Novel>(): FilterConfig<T>[] {
		// 获取基类的筛选配置（包含"丢失的资源"）
		const baseFilters = super.getFilterConfig<T>()
		
		// 小说特有的筛选器
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
		
		// 合并基类配置和小说特有配置
		return [...baseFilters, ...novelFilters]
	}
}
