import { ref, computed, watch, nextTick, type Ref } from 'vue'
import type { FilterItem } from '../types/filter'
import type { FilterConfig } from '../types/filter'
import type { SortOptionConfig } from '../types/sort'
import { ResourceField } from '@resources/base/ResourceField.ts'
import { sortBy as sortByUtil } from '../utils/sortBy'
import type { SortConfig } from '../utils/sortBy'
import { getFilterFunctions } from '../configs/filters/filterLibrary.ts'
import { pageConfigLoader } from '../configs/pages/PageConfigLoader.ts'
import { FIELD_LABEL_MAP } from '../configs/tagFields'
import saveManager from '../utils/SaveManager'
import { useTagIndex } from './useTagIndex'

const DATE_FIELDS = ['addedDate', 'lastRead', 'lastPlayed', 'lastViewed']

function buildSortConfig(config: SortOptionConfig): SortConfig<any> {
  return {
    fieldAccessor: (item: any) => {
      const value = item[config.field]?.value
      if (DATE_FIELDS.includes(config.field)) {
        return value ? new Date(value).getTime() : null
      }
      // 数组型字段（如多作者、多发行商）排序时拼接为字符串比较
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(',') : null
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
 * 将数组型筛选字段的值规范化为字符串数组
 * 兼容旧存档：字段已改为标签数组（如游戏发行商 publisher），但历史数据中可能存的是单个字符串
 */
function normalizeStringArray(fieldValue: any): string[] {
  if (Array.isArray(fieldValue)) {
    return fieldValue.map(v => String(v))
  }
  if (fieldValue != null && fieldValue !== '') {
    return [String(fieldValue)]
  }
  return []
}

/**
 * 页面配置里沿用的旧资源名，对应标签索引实际使用的逻辑类型。
 * 番剧页配置写的是 anime，索引和标签管理登记的是 videoFolder，不对齐时侧边栏会查空。
 */
const TAG_RESOURCE_ALIASES: Record<string, string> = {
  anime: 'videoFolder',
  animation: 'videoFolder',
  'anime-series': 'videoFolder',
  'video-folder': 'videoFolder',
  image: 'manga',
  images: 'manga',
  movie: 'video',
  videos: 'video',
  games: 'game',
  soft: 'software'
}

/**
 * 把页面筛选配置里的资源名换成标签索引认识的逻辑类型。
 * @param resource 页面 filterConfig.params.resource
 */
function resolveTagResourceType(resource: string): string {
  return TAG_RESOURCE_ALIASES[resource] || resource
}

/**
 * 判断这个筛选字段是否真的登记在标签索引里。
 * 系列名、作者这类普通文本不在索引中，必须改从当前页面的资源里统计，否则侧边栏会一直显示暂无。
 * @param resource 页面配置中的资源名
 * @param field 资源字段名
 */
function isRegisteredTagField(resource: string, field: string): boolean {
  const resourceType = resolveTagResourceType(resource)
  return FIELD_LABEL_MAP[`${resourceType}:${field}`] != null
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

  // 星级写在所有资源上，和「丢失的资源」一样每个页面都提供。
  // 页面配置里已经声明过时沿用配置，避免和自动补上的筛选项重复。
  const hasRatingFilter = filterConfigs.some(config => config.key === 'rating')

  if (!hasRatingFilter) {
    const ratingFunctions = getFilterFunctions('rating', {})
    /** 未在页面配置里声明时使用的默认星级筛选。 */
    const ratingFilter: FilterConfig<T> = {
      key: 'rating',
      title: '星级筛选',
      filterType: 'rating',
      params: {},
      extractFn: ratingFunctions.extractFn,
      matchFn: ratingFunctions.matchFn
    }
    const missingIndex = filterConfigs.findIndex(config => config.key === 'missing-resources')
    if (missingIndex >= 0) {
      filterConfigs = [
        ...filterConfigs.slice(0, missingIndex + 1),
        ratingFilter,
        ...filterConfigs.slice(missingIndex + 1)
      ]
    } else {
      filterConfigs = [ratingFilter, ...filterConfigs]
    }
  }
  
  // ========== 标签索引接入 ==========
  // 已登记的标签字段从主进程 SQLite 标签索引读取；系列名等普通文本仍遍历当前页资源
  const tagIndex = useTagIndex()
  const tagIndexAvailable = tagIndex.isAvailable()
  /** 由标签索引支撑的筛选器 key 集合（这些字段 extractAllFilters 不再扫描） */
  const tagBackedKeys = new Set<string>()
  /** 供标签索引按页加载用的查询列表 */
  const tagQueries: Array<{ key: string; resourceType: string; field: string }> = []

  // 动态创建筛选状态：为每个筛选配置创建 selected 和 excluded 数组
  const filterStates = filterConfigs.reduce((acc, config) => {
    const params = (config as any).params
    /** 只有登记过的标签字段才走索引；普通文本改由 extractAllFilters 从当前页资源统计 */
    const tagResourceType = params && typeof params.resource === 'string'
      ? resolveTagResourceType(params.resource)
      : ''
    const isTagBacked = tagIndexAvailable
      && (config as any).filterType === 'resourceField'
      && params && typeof params.resource === 'string' && typeof params.field === 'string'
      && isRegisteredTagField(params.resource, params.field)

    let itemsRef: Ref<FilterItem[]>
    if (isTagBacked) {
      // 候选项来自标签索引（同一 resourceType+field 全局共享一份响应式数据）
      itemsRef = tagIndex.register(tagResourceType, params.field) as Ref<FilterItem[]>
      tagBackedKeys.add(config.key)
      tagQueries.push({ key: config.key, resourceType: tagResourceType, field: params.field })
    } else {
      itemsRef = ref<FilterItem[]>([])
    }

    acc[config.key] = {
      selected: ref<string[]>([]),
      excluded: ref<string[]>([]),
      items: itemsRef
    }
    return acc
  }, {} as Record<string, {
    selected: Ref<string[]>
    excluded: Ref<string[]>
    items: Ref<FilterItem[]>
  }>)

  // 首次进入页面时异步从索引加载候选（Electron 环境；无环境时静默回退遍历）
  if (tagIndexAvailable && tagQueries.length > 0) {
    tagIndex.ensurePageLoaded(pageId, tagQueries)
  }

  // ========== 标签筛选配置持久化 ==========
  /**
   * 将当前所有筛选器的选中/排除状态收集为可序列化对象
   */
  function collectFilterStates(): Record<string, { selected: string[]; excluded: string[] }> {
    const result: Record<string, { selected: string[]; excluded: string[] }> = {}
    filterConfigs.forEach(config => {
      const state = filterStates[config.key]
      if (!state) return
      result[config.key] = {
        selected: [...state.selected.value],
        excluded: [...state.excluded.value]
      }
    })
    return result
  }

  // 保存防抖：避免频繁写入
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isRestoring = false // 标记是否正在恢复已保存的配置，避免触发保存
  function scheduleSaveFilterStates() {
    if (isRestoring) return
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      const data = collectFilterStates()
      saveManager.saveFilterSetting(pageId, data).catch(err => {
        console.warn('[useResourceFilter] 保存筛选设置失败:', err)
      })
    }, 300)
  }

  // 监听每个筛选器的 selected / excluded 变化，自动保存
  filterConfigs.forEach(config => {
    const state = filterStates[config.key]
    if (!state) return
    watch(
      () => [state.selected.value, state.excluded.value],
      () => {
        scheduleSaveFilterStates()
      },
      { deep: true }
    )
  })

  // 异步加载已保存的筛选配置并应用
  ;(async () => {
    try {
      const saved = await saveManager.getFilterSetting(pageId)
      if (saved && typeof saved === 'object') {
        isRestoring = true
        filterConfigs.forEach(config => {
          const state = filterStates[config.key]
          if (!state) return
          const savedFilter = saved[config.key]
          if (savedFilter) {
            if (Array.isArray(savedFilter.selected)) {
              state.selected.value = savedFilter.selected
            }
            if (Array.isArray(savedFilter.excluded)) {
              state.excluded.value = savedFilter.excluded
            }
          }
        })
        // 等待 Vue 响应式更新完成后再解除标记
        await nextTick()
        isRestoring = false
        console.log(`[useResourceFilter] 已加载 ${pageId} 页面的标签筛选配置`)
      }
    } catch (error) {
      console.warn('[useResourceFilter] 加载筛选配置失败:', error)
      isRestoring = false
    }
  })()
  // ========== 标签筛选配置持久化结束 ==========

  /**
   * 从所有资源中提取筛选数据
   */
  function extractAllFilters() {
    filterConfigs.forEach(config => {
      const state = filterStates[config.key]
      if (!state) return

      // 标签索引支撑的字段：候选由主进程索引提供，禁止遍历资源统计
      if (tagBackedKeys.has(config.key)) return

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
          // 数组类型：遍历数组中的每个值（兼容旧存档中的单个字符串）
          const values = normalizeStringArray(fieldValue)
          values.forEach((value: string) => {
            if (value !== '') {
              const key = value
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
        const values = normalizeStringArray(fieldValue)
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
        const values = normalizeStringArray(fieldValue)
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
            const values = normalizeStringArray(fieldValue).map(v => v.toLowerCase())
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
