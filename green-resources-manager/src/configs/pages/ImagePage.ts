import { BasePage } from './base/BasePage.ts'
import type { SortOption } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig, FilterItem } from '../../types/filter'
import { Manga as MangaClass } from '@resources/manga.ts'

// Manga 类型就是 MangaClass 的实例类型
type Manga = InstanceType<typeof MangaClass>

export class ImagePage extends BasePage {
	readonly id: string = 'images'
	readonly name: string = '漫画'
	readonly icon: string = '🖼️'
	readonly description: string = '可以管理图片文件夹，暂不支持单一图片的管理'

	// 接受的资源类型（可以多个）
	resourceTypes: string[] = ['Image', 'Manga']

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
			icon: '🖼️',
			title: '你的图片库是空的',
			description: '点击"添加图片"按钮来添加你的第一个图片文件夹',
			buttonText: '添加第一个图片',
			buttonAction: 'showAddAlbumDialog'
		}
	}
	
	/**
	 * 获取工具栏配置
	 */
	getToolbarConfig() {
		return {
			addButtonText: '添加漫画',
			searchPlaceholder: '搜索漫画...'
		}
	}

	/**
	 * 排序配置
	 * 每个配置项定义了一个排序选项，包含字段访问器和排序方向
	 * 用户可以根据需要自由定义排序方式
	 */
	private sortConfigs: Record<string, SortConfig<Manga> & { label: string }> = {
		'name-asc': {
			label: '按名称排序',
			fieldAccessor: (manga: Manga) => {
				return (manga as any).name?.value || null
			},
			order: 'asc'
		},
		'name-desc': {
			label: '按名称排序（降序）',
			fieldAccessor: (manga: Manga) => {
				return (manga as any).name?.value || null
			},
			order: 'desc'
		},
		'count-asc': {
			label: '按页数（升序）',
			fieldAccessor: (manga: Manga) => {
				const value = (manga as any).pagesCount?.value
				return value != null ? value : null
			},
			order: 'asc'
		},
		'count-desc': {
			label: '按页数（降序）',
			fieldAccessor: (manga: Manga) => {
				const value = (manga as any).pagesCount?.value
				return value != null ? value : null
			},
			order: 'desc'
		},
		'added-asc': {
			label: '按添加时间（升序）',
			fieldAccessor: (manga: Manga) => {
				const addedDate = (manga as any).addedDate?.value || (manga as any).addedDate
				return addedDate ? new Date(addedDate).getTime() : null
			},
			order: 'asc'
		},
		'added-desc': {
			label: '按添加时间（降序）',
			fieldAccessor: (manga: Manga) => {
				const addedDate = (manga as any).addedDate?.value || (manga as any).addedDate
				return addedDate ? new Date(addedDate).getTime() : null
			},
			order: 'desc'
		},
		'lastViewed-asc': {
			label: '按最后查看（升序）',
			fieldAccessor: (manga: Manga) => {
				const lastViewed = (manga as any).lastViewed?.value
				return lastViewed ? new Date(lastViewed).getTime() : null
			},
			order: 'asc'
		},
		'lastViewed-desc': {
			label: '按最后查看（降序）',
			fieldAccessor: (manga: Manga) => {
				const lastViewed = (manga as any).lastViewed?.value
				return lastViewed ? new Date(lastViewed).getTime() : null
			},
			order: 'desc'
		},
		'author-asc': {
			label: '按作者排序',
			fieldAccessor: (manga: Manga) => {
				return (manga as any).author?.value || null
			},
			order: 'asc'
		},
		'author-desc': {
			label: '按作者排序（降序）',
			fieldAccessor: (manga: Manga) => {
				return (manga as any).author?.value || null
			},
			order: 'desc'
		},
		'viewCount-asc': {
			label: '按查看次数（升序）',
			fieldAccessor: (manga: Manga) => {
				const value = (manga as any).viewCount?.value
				return value != null ? value : null
			},
			order: 'asc'
		},
		'viewCount-desc': {
			label: '按查看次数（降序）',
			fieldAccessor: (manga: Manga) => {
				const value = (manga as any).viewCount?.value
				return value != null ? value : null
			},
			order: 'desc'
		}
	}

	/**
	 * 获取排序选项配置（用于工具栏显示）
	 * 直接返回配置中定义的排序选项
	 */
	getSortOptions(): SortOption[] {
		return Object.entries(this.sortConfigs).map(([value, config]) => ({
			value,
			label: config.label
		}))
	}

	/**
	 * 根据排序值获取排序配置
	 * @param sortValue 排序值，如 'name-asc' 或 'name-desc'
	 * @returns 排序配置，可直接用于 sortBy 工具函数
	 */
	getSortConfig(sortValue: string): SortConfig<Manga> | null {
		const config = this.sortConfigs[sortValue]
		if (!config) {
			return null
		}
		
		// 返回排序配置（不包含 label）
		return {
			fieldAccessor: config.fieldAccessor,
			order: config.order,
			compareFn: config.compareFn
		}
	}

	/**
	 * 获取筛选配置
	 * 定义图片页面支持的所有筛选器
	 * 合并基类的"丢失的资源"筛选和图片特有的筛选器
	 */
	getFilterConfig<T = Manga>(): FilterConfig<T>[] {
		// 获取基类的筛选配置（包含"丢失的资源"）
		const baseFilters = super.getFilterConfig<T>()
		
		// 图片特有的筛选器
		const imageFilters: FilterConfig<T>[] = [
			{
				key: 'tags',
				title: '标签筛选',
				fieldAccessor: (manga: any) => {
					return (manga as any).tags?.value || []
				},
				isArray: true
			},
			{
				key: 'authors',
				title: '作者筛选',
				fieldAccessor: (manga: any) => {
					return (manga as any).author?.value || ''
				},
				isArray: false
			}
		] as FilterConfig<T>[]
		
		// 合并基类配置和图片特有配置
		return [...baseFilters, ...imageFilters]
	}
}
