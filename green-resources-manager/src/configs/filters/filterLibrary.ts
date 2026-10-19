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
 * 星级筛选器参数。
 * 显示名称是固定的，调用方不用再传文案。
 */
export interface RatingFilterParams {}

/**
 * 星级筛选器里每一档的显示名称。
 * 下标 0 是未评分，1 到 5 是对应星级。名称同时作为筛选状态的保存值。
 */
const RATING_LABELS = ['未评分', '1 星', '2 星', '3 星', '4 星', '5 星']

/**
 * 读取资源评分，并收成 0 到 5 的整数。
 * 评分存在 ResourceField 上，旧数据也可能是普通数字。0、空值和超出 1 到 5 的值都算未评分。
 */
function readRating(item: any): number {
	/** 评分字段。可能是带 value 的字段对象，也可能是直接存的数字。 */
	const raw = item?.rating
	/** 从字段对象或原始值里取出的评分。 */
	const value = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
	/** 转成数字后的评分。无法转换时视为未评分。 */
	const rating = Number(value)
	if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
		return 0
	}
	return Math.round(rating)
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
	 * 星级筛选器。
	 * 评分写在所有资源的基类上，所以每个页面都能用同一套星级，不必按资源类型各写一份。
	 * 星级是固定的 1 到 5，外加未评分。候选项始终列全，数量为 0 也保留，避免某一档暂时没有资源时筛选项消失。
	 */
	rating: (_params?: RatingFilterParams) => ({
		/**
		 * 按星级统计当前列表里的资源数量。
		 * 从高到低排列，未评分放在最后，方便先看到高分资源。
		 */
		extractFn: (items: any[]): FilterItem[] => {
			/** 各星级的数量。下标 0 表示未评分，1 到 5 表示对应星级。 */
			const counts = [0, 0, 0, 0, 0, 0]

			items.forEach((item: any) => {
				const rating = readRating(item)
				counts[rating] += 1
			})

			return [5, 4, 3, 2, 1, 0].map(rating => ({
				name: RATING_LABELS[rating],
				count: counts[rating]
			}))
		},

		/**
		 * 按选中的星级保留资源，按排除的星级去掉资源。
		 * 多选是「或」：同时选 4 星和 5 星时，这两档都会留下。
		 */
		matchFn: (item: any, selected: string[], excluded: string[]): boolean => {
			/** 这条资源对应的星级名称，用来和侧栏里点中的项比较。 */
			const label = RATING_LABELS[readRating(item)]

			if (excluded.includes(label)) {
				return false
			}

			if (selected.length > 0) {
				return selected.includes(label)
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
