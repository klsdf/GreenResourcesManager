import type { FilterItem } from '../../types/filter'

/**
 * Filter 函数库
 * 提供预定义的筛选逻辑，供页面配置通过 filterType 引用
 */

/**
 * 运行状态筛选器参数
 */
export interface RunningStatusParams {
	/** 运行状态的显示名称 */
	runningLabel: string
}

/**
 * 资源字段筛选器参数
 */
export interface ResourceFieldParams {
	/** 资源类型（如 'manga', 'game' 等） */
	resource: string
	/** 字段名（如 'tags', 'author', 'publisher' 等） */
	field: string
}

/**
 * Filter 函数库定义
 * 每个函数接收参数，返回包含 extractFn 和 matchFn 的对象
 */
export const filterLibrary = {
	/**
	 * 资源字段筛选器
	 * 用于从资源的指定字段中提取和筛选数据
	 * 支持数组字段（如 tags）和单个值字段（如 author）
	 */
	resourceField: (params: ResourceFieldParams) => ({
		/**
		 * 从资源字段中提取筛选数据
		 * 使用默认的提取逻辑（在 useResourceFilter 中处理）
		 */
		extractFn: undefined,

		/**
		 * 使用默认的匹配逻辑（在 useResourceFilter 中处理）
		 */
		matchFn: undefined
	}),

	/**
	 * 运行状态筛选器
	 * 用于筛选"正在运行"的资源（如正在游玩的游戏）
	 */
	runningStatus: (params: RunningStatusParams) => ({
		/**
		 * 提取运行状态的统计信息
		 */
		extractFn: (items: any[], additionalData?: any): FilterItem[] => {
			let runningCount = 0

			items.forEach((item: any) => {
				if (additionalData?.isGameRunning && additionalData.isGameRunning(item)) {
					runningCount++
				}
			})

			// 始终返回，即使数量为0，确保筛选器可以显示
			return [
				{
					name: params.runningLabel,
					count: runningCount
				}
			]
		},

		/**
		 * 匹配运行状态的筛选条件
		 */
		matchFn: (item: any, selected: string[], excluded: string[], additionalData?: any): boolean => {
			const isRunning = additionalData?.isGameRunning ? additionalData.isGameRunning(item) : false

			// 检查排除条件
			if (excluded.length > 0) {
				if (excluded.includes(params.runningLabel) && isRunning) {
					return false
				}
			}

			// 检查选中条件
			if (selected.length > 0) {
				return selected.some(sel => {
					if (sel === params.runningLabel) {
						return isRunning
					}
					return false
				})
			}

			return true
		}
	}),

	/**
	 * 丢失资源筛选器
	 * 用于筛选文件不存在的资源
	 */
	missingResources: (params: { missingLabel: string }) => ({
		/**
		 * 提取丢失资源的统计信息
		 */
		extractFn: (items: any[]): FilterItem[] => {
			let missingCount = 0

			items.forEach((item: any) => {
				const fileExists = item.fileExists?.value
				if (fileExists === false) {
					missingCount++
				}
			})

			return [
				{
					name: params.missingLabel,
					count: missingCount
				}
			]
		},

		/**
		 * 匹配丢失资源的筛选条件
		 */
		matchFn: (item: any, selected: string[], excluded: string[]): boolean => {
			const fileExists = item.fileExists?.value

			// 检查排除条件
			if (excluded.length > 0) {
				if (excluded.includes(params.missingLabel) && fileExists === false) {
					return false
				}
			}

			// 检查选中条件
			if (selected.length > 0) {
				return selected.some(sel => {
					if (sel === params.missingLabel) {
						return fileExists === false
					}
					return false
				})
			}

			return true
		}
	})
}

/**
 * Filter 类型名称
 */
export type FilterType = keyof typeof filterLibrary

/**
 * 根据 filterType 和参数获取对应的 filter 函数
 */
export function getFilterFunctions(filterType: FilterType, params: any) {
	const filterFactory = filterLibrary[filterType]
	if (!filterFactory) {
		throw new Error(`未知的 filterType: ${filterType}`)
	}
	return filterFactory(params)
}
