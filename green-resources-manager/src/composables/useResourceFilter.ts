import { ref, computed, type Ref } from 'vue'
import type { FilterItem } from '../types/filter'
import type { FilterConfig } from '../types/filter'
import type { SortOptionConfig } from '../types/sort'
import { ResourceField } from '@resources/base/ResourceField.ts'
import { sortBy as sortByUtil } from '../utils/sortBy'
import type { SortConfig } from '../utils/sortBy'
import { getFilterFunctions } from '../configs/filters/filterLibrary.ts'
import { pageConfigLoader } from '../configs/pages/PageConfigLoader.ts'

const DATE_FIELDS = ['addedDate', 'lastRead', 'lastPlayed', 'lastViewed']

function buildSortConfig(config: SortOptionConfig): SortConfig<any> {
  return {
    fieldAccessor: (item: any) => {
      const value = item[config.field]?.value
      if (DATE_FIELDS.includes(config.field)) {
        return value ? new Date(value).getTime() : null
      }
      return value != null ? value : null
    },
    order: config.order,
    compareFn: undefined
  }
}

/**
 * 安全获取资源属性值的辅助函数
 * 如果属性是 ResourceField，返回其 value；否则直接返回属性值
 */
function getFieldValue<T>(field: any): T | undefined {
  if (field instanceof ResourceField) {
    return field.value as T
  }
  if (field && typeof field === 'object' && 'value' in field) {
    return field.value as T
  }
  return field as T
}

/**
 * 解析 filterType 配置，将 filterType 转换为实际的函数
 * @param filterConfigs 原始筛选配置数组
 * @returns 解析后的筛选配置数组
 */
function resolveFilterConfigs<T = any>(filterConfigs: FilterConfig<T>[]): FilterConfig<T>[] {
  return filterConfigs.map(config => {
    // 处理 filterType
    if (config.filterType && config.params) {
      // 特殊处理 resourceField 类型
      if (config.filterType === 'resourceField') {
        const { resource, field } = config.params
        return {
          ...config,
          fieldAccessor: (item: any) => {
            const fieldValue = item[field]
            return getFieldValue(fieldValue)
          }
        }
      }
      
      // 其他 filterType 使用 filterLibrary
      const functions = getFilterFunctions(config.filterType, config.params)
      return {
        ...config,
        extractFn: functions.extractFn,
        matchFn: functions.matchFn
      }
    }
    
    // 处理 fieldAccessor 字符串
    if (typeof config.fieldAccessor === 'string') {
      const fieldName = config.fieldAccessor
      return {
        ...config,
        fieldAccessor: (item: any) => {
          const field = item[fieldName]
          return getFieldValue(field)
        }
      }
    }
    
    return config
  })
}

/**
 * 通用资源筛选和排序的 composable
 * 根据页面配置动态生成筛选器，支持所有资源类型
 * 
 * @template T 资源类型
 * @param items 资源列表的响应式引用
 * @param searchQuery 搜索查询的响应式引用
 * @param sortBy 排序方式的响应式引用
 * @param pageId 页面 ID（如 'games', 'software' 等）
 * @param additionalData 额外的数据（如 isGameRunning 函数等），可选
 * @returns 筛选器相关的状态和方法
 */
export function useResourceFilter<T = any>(
  items: Ref<T[]>, 
  searchQuery: Ref<string>, 
  sortBy: Ref<string>,
  pageId: string,
  additionalData?: any
) {
  // 从 PageConfigLoader 获取页面配置
  const pageConfig = pageConfigLoader.getPageConfig(pageId)
  
  if (!pageConfig) {
    console.error(`[useResourceFilter] 未找到页面配置: ${pageId}`)
    return {
      filteredItems: ref([]),
      filteredGames: ref([]),
      extractAllFilters: () => {},
      getFilterData: () => ({ filters: [] }),
      filterStates: {}
    }
  }

  // 获取筛选配置
  let filterConfigs = pageConfig.filterConfig || []
  
  // 解析 filterType 配置，将 filterType 转换为实际的函数
  filterConfigs = resolveFilterConfigs(filterConfigs)
  
  // 保护机制：确保"丢失的资源"筛选始终存在
  // 检查是否已经有 missing-resources 筛选器
  const hasMissingResourcesFilter = filterConfigs.some(config => config.key === 'missing-resources')
  
  if (!hasMissingResourcesFilter) {
    // 如果没有，创建一个默认的"丢失的资源"筛选配置
    const missingResourcesFilter: FilterConfig<T> = {
      key: 'missing-resources',
      title: '丢失的资源',
      fieldAccessor: (item: any) => null,
      isArray: false,
      extractFn: (items: any[]): FilterItem[] => {
        const result: FilterItem[] = []
        let missingResourcesCount = 0

        items.forEach((item: any) => {
          // 统计丢失的资源
          const fileExists = getFieldValue<boolean>(item.fileExists)
          if (fileExists === false) {
            missingResourcesCount++
          }
        })

        // 始终返回，即使数量为0，确保筛选器可以显示
        result.push({
          name: '丢失的资源',
          count: missingResourcesCount
        })

        return result
      },
      matchFn: (item: any, selected: string[], excluded: string[]): boolean => {
        // 检查排除条件
        if (excluded.length > 0) {
          const fileExists = getFieldValue<boolean>(item.fileExists)
          if (excluded.includes('丢失的资源') && fileExists === false) {
            return false
          }
        }

        // 检查选中条件
        if (selected.length > 0) {
          const fileExists = getFieldValue<boolean>(item.fileExists)
          
          return selected.some(sel => {
            if (sel === '丢失的资源') {
              return fileExists === false
            }
            return false
          })
        }

        return true
      }
    }
    
    // 将"丢失的资源"筛选添加到配置的开头
    filterConfigs = [missingResourcesFilter, ...filterConfigs]
  }
  
  // 动态创建筛选状态：为每个筛选配置创建 selected 和 excluded 数组
  const filterStates = filterConfigs.reduce((acc, config) => {
    acc[config.key] = {
      selected: ref<string[]>([]),
      excluded: ref<string[]>([]),
      items: ref<FilterItem[]>([])
    }
    return acc
  }, {} as Record<string, {
    selected: Ref<string[]>
    excluded: Ref<string[]>
    items: Ref<FilterItem[]>
  }>)

  /**
   * 从所有资源中提取筛选数据
   */
  function extractAllFilters() {
    filterConfigs.forEach(config => {
      const state = filterStates[config.key]
      if (!state) return

      // 如果提供了自定义提取函数，使用它
      if (config.extractFn) {
        state.items.value = config.extractFn(items.value, additionalData)
        return
      }

      // 如果没有 fieldAccessor，说明使用了 filterType，应该跳过默认处理
      if (!config.fieldAccessor) {
        return
      }

      // 否则使用默认提取逻辑
      const countMap: Record<string, number> = {}
      
      items.value.forEach(item => {
        const fieldValue = config.fieldAccessor(item)
        
        if (config.isArray) {
          // 数组类型：遍历数组中的每个值
          const values = Array.isArray(fieldValue) ? fieldValue : []
          values.forEach((value: any) => {
            if (value != null && value !== '') {
              const key = String(value)
              countMap[key] = (countMap[key] || 0) + 1
            }
          })
        } else {
          // 单个值类型
          if (fieldValue != null && fieldValue !== '') {
            const key = String(fieldValue)
            countMap[key] = (countMap[key] || 0) + 1
          }
        }
      })

      // 转换为数组并按名称排序
      state.items.value = Object.entries(countMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  /**
   * 默认匹配函数：根据字段类型和配置进行匹配
   */
  function defaultMatchFn(
    item: T,
    config: FilterConfig<T>,
    selected: string[],
    excluded: string[]
  ): boolean {
    // 如果没有 fieldAccessor，说明使用了 filterType，应该返回 true（由 matchFn 处理）
    if (!config.fieldAccessor) {
      return true
    }

    const fieldValue = config.fieldAccessor(item)
    
    // 检查排除条件
    if (excluded.length > 0) {
      if (config.isArray) {
        const values = Array.isArray(fieldValue) ? fieldValue.map(v => String(v)) : []
        if (values.some(v => excluded.includes(v))) {
          return false
        }
      } else {
        if (excluded.includes(String(fieldValue))) {
          return false
        }
      }
    }

    // 检查选中条件
    if (selected.length > 0) {
      if (config.isArray) {
        // 数组类型：必须包含所有选中的值（AND逻辑）
        const values = Array.isArray(fieldValue) ? fieldValue.map(v => String(v)) : []
        return selected.every(sel => values.includes(sel))
      } else {
        // 单个值类型：必须匹配选中的值（OR逻辑）
        return selected.includes(String(fieldValue))
      }
    }

    return true
  }

  /**
   * 筛选后的资源列表
   */
  const filteredItems = computed(() => {
    let filtered = items.value.filter(item => {
      // 获取资源名称用于搜索
      const name = getFieldValue<string>((item as any).name) || ''
      
      // 搜索筛选
      const searchLower = searchQuery.value.toLowerCase()
      const matchesSearch = name.toLowerCase().includes(searchLower) ||
        // 可以扩展搜索范围，从筛选配置中提取可搜索字段
        filterConfigs.some(config => {
          // 如果没有 fieldAccessor，跳过这个配置
          if (!config.fieldAccessor) {
            return false
          }
          const fieldValue = config.fieldAccessor(item)
          if (config.isArray) {
            const values = Array.isArray(fieldValue) ? fieldValue.map(v => String(v).toLowerCase()) : []
            return values.some(v => v.includes(searchLower))
          } else {
            return String(fieldValue).toLowerCase().includes(searchLower)
          }
        })

      if (!matchesSearch) return false

      // 对每个筛选配置进行匹配
      for (const config of filterConfigs) {
        const state = filterStates[config.key]
        if (!state) continue

        const selected = state.selected.value
        const excluded = state.excluded.value

        // 使用自定义匹配函数或默认匹配函数
        const matches = config.matchFn
          ? config.matchFn(item, selected, excluded, additionalData)
          : defaultMatchFn(item, config, selected, excluded)

        if (!matches) {
          return false
        }
      }

      return true
    })

    const sortConfig = pageConfig.sortOptions.find(opt => opt.id === sortBy.value)
    if (sortConfig) {
      return sortByUtil(filtered, buildSortConfig(sortConfig))
    }
    
    return filtered
  })

  /**
   * 动态生成筛选方法
   */
  function createFilterMethods() {
    const methods: Record<string, any> = {}

    filterConfigs.forEach(config => {
      const state = filterStates[config.key]
      if (!state) return

      const key = config.key

      // 筛选方法：选中/取消选中/排除切换
      methods[`filterBy${key.charAt(0).toUpperCase() + key.slice(1)}`] = (itemName: string) => {
        if (state.selected.value.includes(itemName)) {
          // 如果当前是选中状态，则取消选择
          state.selected.value = state.selected.value.filter(item => item !== itemName)
        } else if (state.excluded.value.includes(itemName)) {
          // 如果当前是排除状态，则切换为选中状态
          state.excluded.value = state.excluded.value.filter(item => item !== itemName)
          state.selected.value = [...state.selected.value, itemName]
        } else {
          // 否则直接设置为选中状态
          state.selected.value = [...state.selected.value, itemName]
        }
      }

      // 排除方法
      methods[`excludeBy${key.charAt(0).toUpperCase() + key.slice(1)}`] = (itemName: string) => {
        if (state.excluded.value.includes(itemName)) {
          // 如果已经是排除状态，则取消排除
          state.excluded.value = state.excluded.value.filter(item => item !== itemName)
        } else if (state.selected.value.includes(itemName)) {
          // 如果当前是选中状态，则切换为排除状态
          state.selected.value = state.selected.value.filter(item => item !== itemName)
          state.excluded.value = [...state.excluded.value, itemName]
        } else {
          // 否则直接设置为排除状态
          state.excluded.value = [...state.excluded.value, itemName]
        }
      }

      // 清除筛选方法
      methods[`clear${key.charAt(0).toUpperCase() + key.slice(1)}Filter`] = () => {
        state.selected.value = []
        state.excluded.value = []
      }
    })

    return methods
  }

  /**
   * 获取筛选器数据（用于 FilterSidebar）
   */
  function getFilterData() {
    return {
      filters: filterConfigs.map(config => {
        const state = filterStates[config.key]
        // 确保返回的是普通数组，而不是 Proxy（使用展开运算符创建新数组）
        return {
          key: config.key,
          title: config.title,
          items: state ? [...state.items.value] : [],
          selected: state ? [...state.selected.value] : [],
          excluded: state ? [...state.excluded.value] : []
        }
      })
    }
  }

  // 生成动态方法
  const filterMethods = createFilterMethods()

  return {
    // 计算属性
    filteredItems, // 通用名称，替代 filteredGames
    filteredGames: filteredItems, // 保持向后兼容
    
    // 方法
    extractAllFilters,
    getFilterData,
    
    // 动态生成的筛选方法
    ...filterMethods,
    
    // 暴露筛选状态（用于访问特定筛选器的状态）
    filterStates
  }
}
