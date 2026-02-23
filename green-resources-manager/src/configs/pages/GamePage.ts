import { BasePage, type DialogConfig } from './base/BasePage.ts'
import type { SortOption } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig, FilterItem } from '../../types/filter'
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
			sortOptions: this.getSortOptions(),
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

	/**
	 * 获取排序配置（用于 SQL 排序）
	 * 返回排序配置数组，包含 label、dbField、order
	 */
	getSortConfig(): Array<{ label: string, dbField: string, order: 'asc' | 'desc' }> {
		return [
			{
				label: '按名称排序',
				dbField: 'name',
				order: 'asc'
			},
			{
				label: '按名称排序（降序）',
				dbField: 'name',
				order: 'desc'
			},
			{
				label: '按最后游玩时间',
				dbField: 'lastPlayed',
				order: 'asc'
			},
			{
				label: '按最后游玩时间（降序）',
				dbField: 'lastPlayed',
				order: 'desc'
			},
			{
				label: '按游戏时长（升序）',
				dbField: 'playTime',
				order: 'asc'
			},
			{
				label: '按游戏时长（降序）',
				dbField: 'playTime',
				order: 'desc'
			},
			{
				label: '按添加时间（升序）',
				dbField: 'addedDate',
				order: 'asc'
			},
			{
				label: '按添加时间（降序）',
				dbField: 'addedDate',
				order: 'desc'
			}
		]
	}

	/**
	 * 获取排序选项配置（用于工具栏显示）
	 * 从排序配置生成排序选项，格式为 'dbField-order'
	 */
	getSortOptions(): SortOption[] {
		return this.getSortConfig().map(config => ({
			value: `${config.dbField}-${config.order}`,
			label: config.label
		}))
	}

	/**
	 * 根据排序值获取排序配置（用于兼容前端排序，如果 SQL 排序失败时使用）
	 * @param sortValue 排序值，如 'name-asc' 或 'name-desc'
	 * @returns 排序配置，可直接用于 sortBy 工具函数
	 */
	getSortConfigForFrontend(sortValue: string): SortConfig<Game> | null {
		// 解析排序值，格式：'dbField-order'
		const parts = sortValue.split('-')
		if (parts.length !== 2) {
			return null
		}

		const [dbField, order] = parts
		const config = this.getSortConfig().find(c => c.dbField === dbField && c.order === order)
		if (!config) {
			return null
		}

		// 根据数据库字段名创建字段访问器
		const fieldAccessor = (game: Game) => {
			const value = (game as any)[dbField]?.value
			// 如果是日期字段，转换为时间戳
			if (dbField === 'lastPlayed' || dbField === 'addedDate') {
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

	/**
	 * 获取筛选配置
	 * 定义游戏页面支持的所有筛选器
	 * 合并基类的"丢失的资源"筛选和游戏特有的筛选器
	 */
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
