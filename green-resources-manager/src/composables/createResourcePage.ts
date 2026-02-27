/**
 * 资源页面工厂函数
 * 创建一个完整的资源页面配置，包括所有通用逻辑
 */
import { ref, computed, type Ref } from 'vue'
import { useResourcePage, createEmptyStateConfig, createToolbarConfig, type ResourcePageConfig, type ResourcePageConfigOrBase } from './useResourcePage'
import { useResourceCRUD, type ResourceCRUDConfig } from './useResourceCRUD'
import { useResourceContextMenu, type ContextMenuItem } from './useResourceContextMenu'
import { usePagination } from './usePagination'
import { useDisplayLayout } from './useDisplayLayout'

export interface ResourcePageOptions<T> {
  // 页面配置（可以是 ResourcePageConfig 接口或 BasePage 实例）
  pageConfig: ResourcePageConfigOrBase
  
  // 数据源
  items: Ref<T[]>
  filteredItems: Ref<T[]>
  searchQuery: Ref<string>
  sortBy: Ref<string>
  
  // CRUD操作
  crudConfig: ResourceCRUDConfig<T>
  
  // 右键菜单
  contextMenuItems: ContextMenuItem[]
  contextMenuHandlers: Record<string, (item: T) => void | Promise<void>>
  
  // 空状态配置
  emptyState: {
    icon: string
    title: string
    description: string
    buttonText: string
    buttonAction: string
  }
  
  // 工具栏配置
  toolbar: {
    addButtonText: string
    searchPlaceholder: string
    sortOptions: Array<{ id: string; label: string }>
    addFolderButtonText?: string
    importBookmarkButtonText?: string
  }
  
  // 其他选项
  displayLayout?: {
    minWidth?: number
    maxWidth?: number
  }
  
  // 详情页统计信息生成器
  getStats?: (item: T) => Array<{ label: string; value: string }>
  
  // 详情页操作按钮生成器
  getActions?: (item: T) => Array<{ key: string; icon: string; label: string; class?: string }>
}

/**
 * 创建资源页面配置
 */
export function createResourcePage<T>(options: ResourcePageOptions<T>) {
  const {
    pageConfig,
    items,
    filteredItems,
    searchQuery,
    sortBy,
    crudConfig,
    contextMenuItems,
    contextMenuHandlers,
    emptyState,
    toolbar,
    displayLayout = { minWidth: 80, maxWidth: 350 },
    getStats,
    getActions
  } = options

  // 从 pageConfig 中提取属性
  const pageType = (pageConfig as any).pageType || (pageConfig as any).id
  const itemType = (pageConfig as any).itemType || (pageConfig as any).name

  // ========== 通用页面逻辑 ==========
  const resourcePage = useResourcePage(pageConfig, items, filteredItems, searchQuery, sortBy)
  
  // ========== 分页 ==========
  const pagination = usePagination(filteredItems, pageConfig, itemType)
  
  // ========== CRUD操作 ==========
  const crud = useResourceCRUD(crudConfig)
  
  // ========== 右键菜单 ==========
  const contextMenu = useResourceContextMenu(contextMenuHandlers)
  
  // ========== 显示布局 ==========
  // 使用默认值确保类型安全，避免非空断言
  const minWidth = displayLayout.minWidth ?? 80
  const maxWidth = displayLayout.maxWidth ?? 350
  const displayLayoutComposable = useDisplayLayout(minWidth, maxWidth)

  // ========== 配置 ==========
  const emptyStateConfig = createEmptyStateConfig(
    itemType,
    emptyState.icon,
    emptyState.title,
    emptyState.description,
    emptyState.buttonText,
    emptyState.buttonAction
  )

  // 检查是否是灵活工具栏配置（包含 items 字段）
  let toolbarConfig: any
  if (toolbar && 'items' in toolbar) {
    // 使用灵活工具栏配置
    toolbarConfig = {
      ...toolbar
    }
  } else {
    // 使用旧版工具栏配置
    toolbarConfig = createToolbarConfig(
      pageType,
      itemType,
      toolbar.addButtonText,
      toolbar.searchPlaceholder,
      toolbar.sortOptions,
      {
        addFolderButtonText: toolbar.addFolderButtonText,
        importBookmarkButtonText: toolbar.importBookmarkButtonText
      }
    )
  }

  // ========== 计算属性 ==========
  const itemStats = computed(() => {
    if (!crud.selectedItem.value || !getStats) return []
    return getStats(crud.selectedItem.value)
  })

  const itemActions = computed(() => {
    if (!crud.selectedItem.value || !getActions) return []
    return getActions(crud.selectedItem.value)
  })

  // ========== 方法 ==========
  /**
   * 处理空状态按钮点击
   * 支持单个 action，如果将来需要多个 action，可以扩展为 Record<string, () => void>
   */
  const handleEmptyStateAction = (actionName: string) => {
    if (actionName === emptyState.buttonAction) {
      crud.showAddDialogHandler()
    }
  }

  return {
    // 核心数据
    items,
    filteredItems,
    searchQuery,
    sortBy,
    
    // 通用页面逻辑（包含：路径更新对话框、搜索/排序处理、加载设置等）
    ...resourcePage,
    
    // 分页（包含：currentPage、pageSize、totalPages、paginatedItems、updatePagination、handlePageChange、resetToFirstPage、loadPaginationSettings）
    ...pagination,
    
    // CRUD（包含：对话框状态、添加/编辑/删除/详情方法）
    ...crud,
    
    // 右键菜单（包含：handleContextMenuClick）
    ...contextMenu,
    
    // 显示布局（包含：scale、layoutStyles、updateScale）
    ...displayLayoutComposable,
    
    // 配置
    emptyStateConfig,
    toolbarConfig,
    contextMenuItems,
    
    // 计算属性
    itemStats,
    itemActions,
    
    // 方法（覆盖或新增的方法）
    handleEmptyStateAction
    // 注意：以下方法已通过展开操作符包含，无需重复声明：
    // - handlePageChange (来自 pagination)
    // - handleSearchQueryChanged (来自 resourcePage)
    // - handleSortByChanged (来自 resourcePage)
    // - handleSortChanged (来自 resourcePage)
    // - handleContextMenuClick (来自 contextMenu)
    // - loadSortSetting (来自 resourcePage)
    // - loadPaginationSettings (来自 pagination)
    // - resetToFirstPage (来自 pagination)
  }
}
