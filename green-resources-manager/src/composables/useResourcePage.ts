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
import { pageConfigLoader } from '../configs/pages/PageConfigLoader.ts'

export interface ResourcePageConfig {
  pageType: string
  itemType: string
  defaultPageSize?: number
  defaultSortBy?: string
}

export type ResourcePageConfigOrBase = ResourcePageConfig

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
 * @param config - 页面配置对象（ResourcePageConfig 接口）
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
  // 从 config 中提取属性
  const pageType = (config as ResourcePageConfig).pageType
  const itemType = (config as ResourcePageConfig).itemType
  const defaultPageSize = (config as ResourcePageConfig).defaultPageSize || 20
  const defaultSortBy = (config as ResourcePageConfig).defaultSortBy
  
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
   * 把存档里的排序对上当前页面的选项。
   * 旧存档和默认设置只记了字段名（例如 name），现在的选项 id 是 name-asc、name-desc。
   * 直接写回 name 时，下拉看起来像按名称，列表却匹配不到任何选项，等于没排序。
   * 对不上就保持页面自己的默认值。
   * @param settingPageType 页面 id，和保存时用的是同一个
   * @param savedSortBy 存档里的排序
   * @returns 能用的排序 id；对不上时为 null
   */
  const resolveSavedSortId = (settingPageType: string, savedSortBy: string): string | null => {
    /** 这一页现在可选的排序。没有配置时无法核对，不套用存档。 */
    const options = pageConfigLoader.getPageConfig(settingPageType)?.sortOptions || []
    if (options.length === 0) return null
    const exact = options.find(option => option.id === savedSortBy)
    if (exact) return exact.id
    /** 旧值 name 对应现在的 name-asc；没有升序项时用这个字段的第一项。 */
    const legacyAsc = options.find(option => option.id === `${savedSortBy}-asc` || (option.field === savedSortBy && option.order === 'asc'))
    if (legacyAsc) return legacyAsc.id
    const sameField = options.find(option => option.field === savedSortBy)
    return sameField?.id || null
  }

  /**
   * 进入页面时恢复上次的排序。
   * @param targetPageType 当前页面 id。不传则用创建页面时记下的 id。
   */
  const loadSortSetting = async (targetPageType?: string) => {
    /** 和工具栏保存时用同一个页面 id，避免读到别的页面的排序。 */
    const settingPageType = targetPageType || pageType
    try {
      const savedSortBy = await saveManager.getSortSetting(settingPageType)
      const resolvedSortBy = savedSortBy ? resolveSavedSortId(settingPageType, savedSortBy) : null
      if (resolvedSortBy && resolvedSortBy !== sortBy.value) {
        sortBy.value = resolvedSortBy
        console.log(`✅ 已加载${itemType}页面排序方式:`, resolvedSortBy)
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
