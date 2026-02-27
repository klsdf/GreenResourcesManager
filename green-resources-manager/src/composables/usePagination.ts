import { ref, computed, watch, type Ref } from 'vue'
import saveManager from '../utils/SaveManager'

export interface PaginationConfig {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  itemType: string
}

export interface PageConfigForPagination {
  defaultPageSize: number
}

/**
 * 通用分页逻辑 composable
 * @param filteredItems - 筛选后的项目列表
 * @param pageConfig - 页面配置对象（包含 defaultPageSize）
 * @param itemType - 项目类型（用于配置显示）
 */
export function usePagination<T>(
  filteredItems: Ref<T[]>,
  pageConfig: PageConfigForPagination,
  itemType = '项目'
) {
  const defaultPageSize = pageConfig.defaultPageSize || 20
  
  // 分页状态
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)
  const totalPages = ref(0)

  /**
   * 分页显示的项目列表
   */
  const paginatedItems = computed(() => {
    if (!filteredItems.value || filteredItems.value.length === 0) return []
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredItems.value.slice(start, end)
  })

  /**
   * 当前页的起始索引
   */
  const currentPageStartIndex = computed(() => {
    return (currentPage.value - 1) * pageSize.value
  })

  /**
   * 分页配置（用于 PaginationNav 组件）
   */
  const paginationConfig = computed<PaginationConfig>(() => {
    return {
      currentPage: currentPage.value,
      totalPages: totalPages.value,
      pageSize: pageSize.value,
      totalItems: filteredItems.value.length,
      itemType
    }
  })

  /**
   * 更新分页信息
   */
  function updatePagination() {
    totalPages.value = Math.ceil(filteredItems.value.length / pageSize.value)
    // 确保当前页不超过总页数
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value
    }
    // 如果当前页为0且没有数据，重置为1
    if (currentPage.value === 0 && filteredItems.value.length > 0) {
      currentPage.value = 1
    }
  }

  /**
   * 处理分页变化
   */
  function handlePageChange(pageNum: number) {
    currentPage.value = pageNum
  }

  /**
   * 重置到第一页
   */
  function resetToFirstPage() {
    currentPage.value = 1
  }

  /**
   * 从页面配置加载分页配置
   * 注意：现在只从页面配置读取，不再从设置页读取
   * @param pageId - 页面 ID（如 'games', 'images'）
   */
  async function loadPaginationSettings(pageId: string) {
    console.log(`[loadPaginationSettings] 开始加载分页设置（仅从页面配置）`, {
      pageId,
      itemType,
      defaultPageSize,
      currentPageSize: pageSize.value,
      pageConfigDefaultPageSize: pageConfig.defaultPageSize
    })
    
    try {
      // 只使用页面配置中的 defaultPageSize
      const newPageSize = pageConfig.defaultPageSize || defaultPageSize
      
      console.log(`[loadPaginationSettings] 从页面配置读取的分页大小`, {
        newPageSize,
        pageConfigDefaultPageSize: pageConfig.defaultPageSize,
        fallbackDefaultPageSize: defaultPageSize
      })

      // 更新分页大小
      if (pageSize.value !== newPageSize) {
        console.log(`[loadPaginationSettings] 分页大小需要更新`, {
          oldPageSize: pageSize.value,
          newPageSize
        })
        
        pageSize.value = newPageSize

        // 重新计算分页
        updatePagination()

        console.log(`${itemType}列表分页设置已更新:`, {
          listPageSize: pageSize.value,
          totalPages: totalPages.value,
          currentPage: currentPage.value
        })
      } else {
        console.log(`[loadPaginationSettings] 分页大小无需更新`, {
          currentPageSize: pageSize.value,
          newPageSize
        })
      }
    } catch (error) {
      console.error(`[loadPaginationSettings] 加载${itemType}分页设置失败:`, error)
      // 使用默认值
      pageSize.value = defaultPageSize
    }
    
    console.log(`[loadPaginationSettings] 最终分页大小`, {
      pageId,
      itemType,
      finalPageSize: pageSize.value
    })
  }

  // 监听筛选结果变化，更新分页信息
  watch(
    filteredItems,
    () => {
      updatePagination()
    },
    { immediate: false }
  )

  // 初始化时更新分页
  updatePagination()

  return {
    // 状态
    currentPage,
    pageSize,
    totalPages,
    
    // 计算属性
    paginatedItems,
    currentPageStartIndex,
    paginationConfig,
    
    // 方法
    updatePagination,
    handlePageChange,
    resetToFirstPage,
    loadPaginationSettings
  }
}

