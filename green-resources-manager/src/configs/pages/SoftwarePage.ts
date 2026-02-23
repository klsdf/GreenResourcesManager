import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { Software as SoftwareClass } from '@resources/soft.ts'

type Software = InstanceType<typeof SoftwareClass>

export class SoftwarePage extends BasePage {
	readonly id: string = 'software'
	readonly name: string = '软件'
	readonly icon: string = '💾'
	readonly description: string = '可以管理软件、应用等exe文件'

	resourceTypes: string[] = ['Software']

	displayLayoutConfig = {
		minWidth: 80,
		maxWidth: 400
	}

	sortOptions: SortOptionConfig[] = [
		{ id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
		{ id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
		{ id: 'lastPlayed-asc', label: '按最后运行时间', field: 'lastPlayed', order: 'asc' },
		{ id: 'lastPlayed-desc', label: '按最后运行时间（降序）', field: 'lastPlayed', order: 'desc' },
		{ id: 'playTime-asc', label: '按运行时长（升序）', field: 'playTime', order: 'asc' },
		{ id: 'playTime-desc', label: '按运行时长（降序）', field: 'playTime', order: 'desc' },
		{ id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
		{ id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' }
	]
	
	getEmptyStateConfig() {
		return {
			icon: '💾',
			title: '你的软件库是空的',
			description: '点击"添加软件"按钮来添加你的第一个软件，或直接拖拽软件文件（.exe、.swf、.bat）或压缩包（.zip、.rar、.7z 等）到此处',
			buttonText: '添加第一个软件',
			buttonAction: 'showAddDialog'
		}
	}
	
	getToolbarConfig() {
		return {
			addButtonText: '添加软件',
			searchPlaceholder: '搜索软件...'
		}
	}

	getSortConfig(sortValue: string): SortConfig<Software> | null {
		const config = this.sortOptions.find(opt => opt.id === sortValue)
		if (!config) {
			return null
		}
		
		const fieldAccessor = (software: Software) => {
			const value = (software as any)[config.field]?.value
			if (config.field === 'lastPlayed' || config.field === 'addedDate') {
				return value ? new Date(value).getTime() : null
			}
			return value != null ? value : null
		}
		
		return {
			fieldAccessor,
			order: config.order,
			compareFn: undefined
		}
	}

	getFilterConfig<T = Software>(): FilterConfig<T>[] {
		const baseFilters = super.getFilterConfig<T>()
		
		const softwareFilters: FilterConfig<T>[] = [
			{
				key: 'tags',
				title: '标签筛选',
				fieldAccessor: (software: any) => {
					return (software as any).tags?.value || []
				},
				isArray: true
			},
			{
				key: 'developers',
				title: '开发商筛选',
				fieldAccessor: (software: any) => {
					return (software as any).developers?.value || []
				},
				isArray: true
			}
		] as FilterConfig<T>[]
		
		return [...baseFilters, ...softwareFilters]
	}
}
