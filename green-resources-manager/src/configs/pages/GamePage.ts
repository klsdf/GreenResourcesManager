import { BasePage, type DialogConfig } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Game as GameClass } from '@resources/game.ts'

// Game 类型就是 GameClass 的实例类型
type Game = InstanceType<typeof GameClass>



export class GamePage extends BasePage {
	/**
	 * "正在游玩"筛选器的显示文本
	 * 用户可以通过修改此值来自定义显示文本
	 */
	readonly id: string = 'games'
	readonly name: string = '游戏'
	readonly icon: string = '🎮'
	readonly description: string = '可以管理游戏、应用等exe文件'
	
	// 分页设置键名（用于从设置中读取分页配置）
	readonly settingsKey: string = 'game'
	
	// 默认每页显示数量
	readonly defaultPageSize: number = 7

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
				filterType: 'resourceField',
				params: {
					resource: 'game',
					field: 'tags'
				},
				isArray: true
			},
			{
				key: 'developers',
				title: '开发商筛选',
				filterType: 'resourceField',
				params: {
					resource: 'game',
					field: 'developers'
				},
				isArray: true
			},
			{
				key: 'publishers',
				title: '发行商筛选',
				filterType: 'resourceField',
				params: {
					resource: 'game',
					field: 'publisher'
				},
				isArray: false
			},
			{
				key: 'engines',
				title: '引擎筛选',
				filterType: 'resourceField',
				params: {
					resource: 'game',
					field: 'engine'
				},
				isArray: false
			},
			{
				key: 'others',
				title: '其他筛选',
				filterType: 'runningStatus',
				params: {
					runningLabel: '正在游玩'
				}
			}
		] as FilterConfig<T>[]

		// 合并基类配置和游戏特有配置
		return [...baseFilters, ...gameFilters]
	}
}
