/**
 * 通用资源页面 Composable
 * 抽象所有资源页面的共同逻辑，包括：
 * - 分页管理
 * - 排序管理
 * - 筛选数据更新
 * - 路径更新对话框
 * - 空状态处理
 * - 事件处理
 */
import { ref, computed, type Ref } from 'vue'
import saveManager from '../utils/SaveManager'
import type { BasePage } from '../configs/pages/base/BasePage'

export interface ResourcePageConfig {
  pageType: string
  itemType: string
  defaultPageSize?: number
  defaultSortBy?: string
}

export type ResourcePageConfigOrBase = ResourcePageConfig | BasePage

export interface EmptyStateConfig {
  emptyIcon: string
  emptyTitle: string
  emptyDescription: string
  emptyButtonText: string
  emptyButtonAction: string
  noResultsIcon: string
  noResultsTitle: string
  noResultsDescription: string
  noPageDataIcon: string
  noPageDataTitle: string
  noPageDataDescription: string
}

export interface ToolbarItemBase {
  type: string
}

export interface ToolbarButtonItem extends ToolbarItemBase {
  type: 'button'
  label: string
  action: string
  icon?: string
  buttonType?: 'primary' | 'secondary'
}

export interface ToolbarSearchItem extends ToolbarItemBase {
  type: 'search'
  placeholder: string
  action: string
}

export interface ToolbarSortItem extends ToolbarItemBase {
  type: 'sort'
}

export interface ToolbarLayoutItem extends ToolbarItemBase {
  type: 'layout'
}

export type ToolbarItem = ToolbarButtonItem | ToolbarSearchItem | ToolbarSortItem | ToolbarLayoutItem

export interface FlexibleToolbarConfig {
  items: ToolbarItem[]
  sortOptions?: Array<{ id: string; label: string }>
  pageType?: string
  scale?: number
  showLayoutControl?: boolean
}

export interface LegacyToolbarConfig {
  addButtonText: string
  addFolderButtonText?: string
  importBookmarkButtonText?: string
  searchPlaceholder: string
  sortOptions: Array<{ id: string; label: string }>
  pageType: string
}

export type ToolbarConfig = LegacyToolbarConfig | FlexibleToolbarConfig

export interface PathUpdateInfo {
  existingItem: any | null
  newPath: string
  newFileName: string
}

/**
 * 通用资源页面 Composable
 * @param config - 页面配置对象（可以是 ResourcePageConfig 接口或 BasePage 实例）
 * @param items - 资源列表
 * @param filteredItems - 筛选后的资源列表
 * @param searchQuery - 搜索查询
 * @param sortBy - 排序方式
 */
export function useResourcePage<T>(
  config: ResourcePageConfigOrBase,
  items: Ref<T[]>,
  filteredItems: Ref<T[]>,
  searchQuery: Ref<string>,
  sortBy: Ref<string>
) {
  // 从 config 中提取属性，兼容两种类型
  const pageType = typeof config === 'object' && 'id' in config 
    ? (config as BasePage).id 
    : (config as ResourcePageConfig).pageType
  
  const itemType = typeof config === 'object' && 'name' in config 
    ? (config as BasePage).name 
    : (config as ResourcePageConfig).itemType
  
  const defaultPageSize = typeof config === 'object' && 'defaultPageSize' in config 
    ? (config as BasePage).defaultPageSize 
    : (config as ResourcePageConfig).defaultPageSize || 20
  
  const defaultSortBy = typeof config === 'object' && 'sortOptions' in config 
    ? undefined 
    : (config as ResourcePageConfig).defaultSortBy
  
  const configForInternal: ResourcePageConfig = {
    pageType,
    itemType,
    defaultPageSize,
    defaultSortBy
  }
  
  // 路径更新对话框状态
  const showPathUpdateDialog = ref(false)
  const pathUpdateInfo = ref<PathUpdateInfo>({
    existingItem: null,
    newPath: '',
    newFileName: ''
  })

  /**
   * 处理空状态按钮点击
   * 注意：此函数在 createResourcePage 中已被重新实现，这里保留是为了向后兼容
   * @deprecated 建议使用 createResourcePage 工厂函数中的实现
   */
  const handleEmptyStateAction = (actionName: string, expectedAction: string, handler: () => void) => {
    if (actionName === expectedAction) {
      handler()
    }
  }

  /**
   * 处理搜索查询变化
   */
  const handleSearchQueryChanged = (newValue: string) => {
    searchQuery.value = newValue
  }

  /**
   * 处理排序变化
   */
  const handleSortByChanged = (newValue: string) => {
    sortBy.value = newValue
    console.log(`✅ ${itemType}页面 排序方式已更新:`, newValue)
  }

  /**
   * 保存排序设置
   */
  const handleSortChanged = async ({ pageType: pt, sortBy: sortValue }: { pageType: string; sortBy: string }) => {
    try {
      await saveManager.saveSortSetting(pt, sortValue)
      console.log(`✅ 已保存${pt}页面排序方式:`, sortValue)
    } catch (error) {
      console.warn('保存排序方式失败:', error)
    }
  }

  /**
   * 加载排序设置
   */
  const loadSortSetting = async () => {
    try {
      const savedSortBy = await saveManager.getSortSetting(pageType)
      if (savedSortBy && savedSortBy !== sortBy.value) {
        sortBy.value = savedSortBy
        console.log(`✅ 已加载${itemType}页面排序方式:`, savedSortBy)
      }
    } catch (error) {
      console.warn('加载排序方式失败:', error)
    }
  }

  /**
   * 关闭路径更新对话框
   */
  const closePathUpdateDialog = () => {
    showPathUpdateDialog.value = false
    pathUpdateInfo.value = {
      existingItem: null,
      newPath: '',
      newFileName: ''
    }
  }

  /**
   * 显示路径更新对话框
   */
  const showPathUpdateDialogHandler = (info: PathUpdateInfo) => {
    pathUpdateInfo.value = info
    showPathUpdateDialog.value = true
  }

  return {
    // 路径更新对话框
    showPathUpdateDialog,
    pathUpdateInfo,
    closePathUpdateDialog,
    showPathUpdateDialogHandler,
    
    // 事件处理
    handleEmptyStateAction,
    handleSearchQueryChanged,
    handleSortByChanged,
    handleSortChanged,
    loadSortSetting
  }
}

/**
 * 创建空状态配置的工厂函数
 */
export function createEmptyStateConfig(
  itemType: string,
  emptyIcon: string,
  emptyTitle: string,
  emptyDescription: string,
  emptyButtonText: string,
  emptyButtonAction: string
): EmptyStateConfig {
  return {
    emptyIcon,
    emptyTitle,
    emptyDescription,
    emptyButtonText,
    emptyButtonAction,
    noResultsIcon: '🔍',
    noResultsTitle: `没有找到匹配的${itemType}`,
    noResultsDescription: '尝试使用不同的搜索词',
    noPageDataIcon: '📄',
    noPageDataTitle: `当前页没有${itemType}`,
    noPageDataDescription: '请切换到其他页面查看'
  }
}

/**
 * 创建工具栏配置的工厂函数
 */
export function createToolbarConfig(
  pageType: string,
  itemType: string,
  addButtonText: string,
  searchPlaceholder: string,
  sortOptions: Array<{ id: string; label: string }>,
  options?: {
    addFolderButtonText?: string
    importBookmarkButtonText?: string
  }
): ToolbarConfig {
  return {
    addButtonText,
    searchPlaceholder,
    sortOptions,
    pageType,
    ...options
  }
}
