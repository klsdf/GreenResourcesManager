import { BasePage, type DialogConfig } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Game as GameClass } from '@resources/game.ts'

// Game 类型就是 GameClass 的实例类型
type Game = InstanceType<typeof GameClass>

/**
 * 游戏排序方式类型
 * 定义在 GamePage 类所在的文件中
 */
export type GameSortBy =
	| 'name-asc'
	| 'name-desc'
	| 'lastPlayed-asc'
	| 'lastPlayed-desc'
	| 'playTime-asc'
	| 'playTime-desc'
	| 'added-asc'
	| 'added-desc'

export class GamePage extends BasePage {
	readonly id: string = 'games'
	readonly name: string = '游戏'
	readonly icon: string = '🎮'
	readonly description: string = '可以管理游戏、应用等exe文件'

	// 接受的资源类型（可以多个）
	resourceTypes: string[] = ['Game']

	// 页面布局配置
	displayLayoutConfig = {
		minWidth: 80,
		maxWidth: 400
	}

	sortOptions: SortOptionConfig[] = [
		{ id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
		{ id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
		{ id: 'lastPlayed-asc', label: '按最后游玩时间', field: 'lastPlayed', order: 'asc' },
		{ id: 'lastPlayed-desc', label: '按最后游玩时间（降序）', field: 'lastPlayed', order: 'desc' },
		{ id: 'playTime-asc', label: '按游戏时长（升序）', field: 'playTime', order: 'asc' },
		{ id: 'playTime-desc', label: '按游戏时长（降序）', field: 'playTime', order: 'desc' },
		{ id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
		{ id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' }
	]

	/**
	 * 获取空状态配置
	 */
	getEmptyStateConfig() {
		return {
			icon: '🎮',
			title: '你的游戏库是空的',
			description: '点击"添加游戏"按钮来添加你的第一个游戏，或直接拖拽游戏文件到此处',
			buttonText: '添加第一个游戏',
			buttonAction: 'showAddGameDialog'
		}
	}

	/**
	 * 获取工具栏配置
	 */
	getToolbarConfig() {
		return {
			items: [
				{
					type: 'button',
					label: '添加游戏',
					action: 'showAddGameDialog',
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
					placeholder: '搜索游戏...',
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

	/**
	 * 获取对话框配置
	 */
	getDialogConfig(): DialogConfig {
		return {
			addTitle: '添加游戏',
			editTitle: '编辑游戏',
			addButtonText: '添加游戏',
			editButtonText: '保存修改',
			enableEngineAutoDetect: true,
			enableScreenshotCover: true
		}
	}

	getFilterConfig<T = Game>(): FilterConfig<T>[] {
		// 获取基类的筛选配置（包含"丢失的资源"）
		const baseFilters = super.getFilterConfig<T>()

		// 游戏特有的筛选器
		const gameFilters: FilterConfig<T>[] = [
			{
				key: 'tags',
				title: '标签筛选',
				fieldAccessor: (game: any) => {
					return (game as any).tags?.value || []
				},
				isArray: true
			},
			{
				key: 'developers',
				title: '开发商筛选',
				fieldAccessor: (game: any) => {
					return (game as any).developers?.value || []
				},
				isArray: true
			},
			{
				key: 'publishers',
				title: '发行商筛选',
				fieldAccessor: (game: any) => {
					return (game as any).publisher?.value || ''
				},
				isArray: false
			},
			{
				key: 'engines',
				title: '引擎筛选',
				fieldAccessor: (game: any) => {
					return (game as any).engine?.value || ''
				},
				isArray: false
			},
			{
				key: 'others',
				title: '其他筛选',
				fieldAccessor: (game: any) => {
					// 这个字段访问器不会被使用，因为使用了 extractFn
					return null
				},
				isArray: false,
				// 自定义提取函数：提取"正在游玩"（"丢失的资源"已由基类提供）
				extractFn: (games: any[], additionalData?: any): FilterItem[] => {
					const items: FilterItem[] = []
					let runningGamesCount = 0

					games.forEach((game: any) => {
						// 统计正在游玩的游戏
						if (additionalData?.isGameRunning && additionalData.isGameRunning(game)) {
							runningGamesCount++
						}
					})

					// "正在游玩"始终显示，即使数量为0
					items.push({
						name: '正在游玩',
						count: runningGamesCount
					})

					return items
				},
				// 自定义匹配函数：处理"正在游玩"（"丢失的资源"已由基类处理）
				matchFn: (game: any, selected: string[], excluded: string[], additionalData?: any): boolean => {
					// 检查排除条件
					if (excluded.length > 0) {
						if (excluded.includes('正在游玩') && additionalData?.isGameRunning && additionalData.isGameRunning(game)) {
							return false
						}
					}

					// 检查选中条件
					if (selected.length > 0) {
						const isRunning = additionalData?.isGameRunning ? additionalData.isGameRunning(game) : false

						return selected.some(sel => {
							if (sel === '正在游玩') {
								return isRunning
							}
							return false
						})
					}

					return true
				}
			}
		] as FilterConfig<T>[]

		// 合并基类配置和游戏特有配置
		return [...baseFilters, ...gameFilters]
	}
}
