/**
 * 通用筛选配置类型定义
 */

import type { FilterType } from '../configs/filters/filterLibrary'

/**
 * 筛选项接口
 */
export interface FilterItem {
  name: string
  count: number
}

/**
 * 筛选配置接口
 * 定义如何从资源项中提取和匹配筛选数据
 */
export interface FilterConfig<T = any> {
  /**
   * 筛选器的唯一标识（如 'tags', 'developers' 等）
   */
  key: string
  
  /**
   * 筛选器的显示标题（如 '标签筛选', '开发商筛选'）
   */
  title: string
  
  /**
   * 从资源项中提取字段值的函数或字段名字符串
   * 如果是函数：返回单个值或数组，用于统计和匹配
   * 如果是字符串：字段名，自动从资源项中提取该字段的值
   */
  fieldAccessor?: ((item: T) => any) | string
  
  /**
   * 字段是否为数组类型
   * 如果为 true，fieldAccessor 应返回数组；如果为 false，返回单个值
   */
  isArray?: boolean
  
  /**
   * 自定义匹配函数（可选）
   * 如果不提供，将使用默认的匹配逻辑
   * @param item 资源项
   * @param selected 已选中的值列表
   * @param excluded 已排除的值列表
   * @param additionalData 额外的数据（如 isGameRunning 函数等）
   * @returns 是否匹配
   */
  matchFn?: (item: T, selected: string[], excluded: string[], additionalData?: any) => boolean
  
  /**
   * 自定义提取函数（可选）
   * 用于特殊逻辑，如动态计算"正在游玩"等
   * 如果不提供，将使用默认的提取逻辑（从 fieldAccessor 提取）
   * @param items 所有资源项
   * @param additionalData 额外的数据（如 isGameRunning 函数等）
   * @returns 筛选项列表
   */
  extractFn?: (items: T[], additionalData?: any) => FilterItem[]
  
  /**
   * 预定义 filter 类型（可选）
   * 用于从 filterLibrary 中获取对应的 extractFn 和 matchFn
   * 当提供此字段时，fieldAccessor 可以为空
   */
  filterType?: FilterType
  
  /**
   * 传递给 filterType 对应函数的参数
   */
  params?: Record<string, any>
}
