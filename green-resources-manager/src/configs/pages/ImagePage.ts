import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig, FilterItem } from '../../types/filter'
import { Manga as MangaClass } from '@resources/manga.ts'

type Manga = InstanceType<typeof MangaClass>

export class ImagePage extends BasePage {
	readonly id: string = 'images'
	readonly name: string = '漫画'
	readonly icon: string = '🖼️'
	readonly description: string = '可以管理图片文件夹，暂不支持单一图片的管理'
	
	// 分页设置键名（用于从设置中读取分页配置）
	readonly settingsKey: string = 'image'
	
	// 默认每页显示数量
	readonly defaultPageSize: number = 8

	resourceTypes: string[] = ['Image', 'Manga']

	displayLayoutConfig = {
		minWidth: 150,
		maxWidth: 400
	}

	sortOptions: SortOptionConfig[] = [
		{ id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
		{ id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
		{ id: 'pagesCount-asc', label: '按页数（升序）', field: 'pagesCount', order: 'asc' },
		{ id: 'pagesCount-desc', label: '按页数（降序）', field: 'pagesCount', order: 'desc' },
		{ id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
		{ id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' },
		{ id: 'lastViewed-asc', label: '按最后查看（升序）', field: 'lastViewed', order: 'asc' },
		{ id: 'lastViewed-desc', label: '按最后查看（降序）', field: 'lastViewed', order: 'desc' },
		{ id: 'author-asc', label: '按作者排序', field: 'author', order: 'asc' },
		{ id: 'author-desc', label: '按作者排序（降序）', field: 'author', order: 'desc' },
		{ id: 'viewCount-asc', label: '按查看次数（升序）', field: 'viewCount', order: 'asc' },
		{ id: 'viewCount-desc', label: '按查看次数（降序）', field: 'viewCount', order: 'desc' }
	]
	
	getEmptyStateConfig() {
		return {
			icon: '🖼️',
			title: '你的图片库是空的',
			description: '点击"添加图片"按钮来添加你的第一个图片文件夹',
			buttonText: '添加第一个图片',
			buttonAction: 'showAddAlbumDialog'
		}
	}
	
	getToolbarConfig() {
		return {
			items: [
				{
					type: 'button',
					label: '添加漫画',
					action: 'showAddAlbumDialog',
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
					placeholder: '搜索漫画...',
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

	getFilterConfig<T = Manga>(): FilterConfig<T>[] {
		const baseFilters = super.getFilterConfig<T>()
		
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
		
		return [...baseFilters, ...imageFilters]
	}
}
