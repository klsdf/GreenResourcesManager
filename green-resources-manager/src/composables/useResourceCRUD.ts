/**
 * 通用资源CRUD操作 Composable
 * 抽象所有资源页面的CRUD操作模式
 */
import { ref, type Ref } from 'vue'
import notify from '../utils/NotificationService'
import confirmService from '../utils/ConfirmService'

export interface ResourceCRUDConfig<T> {
  items: Ref<T[]>
  onAdd: (itemData: Partial<T>) => Promise<T | null>
  onUpdate: (id: string, updates: Partial<T>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onLoad: () => Promise<void>
  onSave?: () => Promise<void>
  getItemName: (item: T) => string
  itemType: string
}

/**
 * 通用资源CRUD操作
 */
export function useResourceCRUD<T>(config: ResourceCRUDConfig<T>) {
  const {
    items,
    onAdd,
    onUpdate,
    onDelete,
    onLoad,
    onSave,
    getItemName,
    itemType
  } = config

  // 对话框状态
  const showAddDialog = ref(false)
  const showEditDialog = ref(false)
  const showDetailDialog = ref(false)
  const selectedItem = ref<T | null>(null)
  const editForm = ref<Partial<T> | null>(null)

  /**
   * 显示添加对话框
   */
  const showAddDialogHandler = () => {
    showAddDialog.value = true
  }

  /**
   * 关闭添加对话框
   */
  const closeAddDialog = () => {
    showAddDialog.value = false
  }

  /**
   * 处理添加确认
   */
  const handleAddConfirm = async (itemData: Partial<T>) => {
    try {
      const newItem = await onAdd(itemData)
      if (onLoad) {
        await onLoad()
      }
      closeAddDialog()
      if (newItem) {
        notify.toast('success', '添加成功', `${itemType} "${getItemName(newItem)}" 已成功添加`)
      }
    } catch (error: any) {
      console.error(`添加${itemType}失败:`, error)
      notify.toast('error', '添加失败', `添加${itemType}失败: ${error.message}`)
    }
  }

  /**
   * 显示详情
   */
  const showDetail = (item: T) => {
    selectedItem.value = item
    showDetailDialog.value = true
  }

  /**
   * 关闭详情
   */
  const closeDetail = () => {
    showDetailDialog.value = false
    selectedItem.value = null
  }

  /**
   * 显示编辑对话框
   */
  const showEdit = (item: T) => {
    editForm.value = { ...item } as Partial<T>
    showEditDialog.value = true
    closeDetail()
  }

  /**
   * 关闭编辑对话框
   */
  const closeEdit = () => {
    showEditDialog.value = false
    editForm.value = null
  }

  /**
   * 处理编辑确认
   */
  const handleEditConfirm = async (updatedData: Partial<T> & { id: string }) => {
    try {
      console.log('[handleEditConfirm] 准备更新资源:', {
        updatedData,
        id: updatedData.id,
        idType: typeof updatedData.id,
        idString: String(updatedData.id)
      })
      await onUpdate(updatedData.id, updatedData)
      if (onLoad) {
        await onLoad()
      }
      closeEdit()
      notify.toast('success', '保存成功', `${itemType}信息已更新`)
    } catch (error: any) {
      console.error(`保存编辑失败:`, error)
      notify.toast('error', '保存失败', `保存编辑失败: ${error.message}`)
    }
  }

  /**
   * 删除资源
   */
  const deleteItem = async (item: T) => {
    const itemName = getItemName(item)
    const confirmed = await confirmService.confirm(`确定要删除${itemType} "${itemName}" 吗？`, '确认删除')
    if (!confirmed) return

    try {
      // 支持 ResourceField（id 为 { value }）或普通 id
      const rawId = (item as any).id
      const itemId = rawId != null && typeof rawId === 'object' && 'value' in rawId ? rawId.value : rawId
      if (itemId === undefined || itemId === null || itemId === '') {
        throw new Error('资源ID不存在')
      }

      await onDelete(String(itemId))
      if (onLoad) {
        await onLoad()
      }

      notify.toast('success', '删除成功', `已成功删除${itemType} "${itemName}"`)
      closeDetail()
    } catch (error: any) {
      console.error(`删除${itemType}失败:`, error)
      notify.toast('error', '删除失败', `无法删除${itemType} "${itemName}": ${error.message}`)
    }
  }

  /**
   * 统一的资源更新函数（用于DetailPanel）
   */
  const updateResource = async (id: string, updates: { rating?: number; comment?: string; isFavorite?: boolean; finished?: boolean; finishedAt?: string }) => {
    await onUpdate(id, updates as Partial<T>)
  }

  return {
    // 对话框状态
    showAddDialog,
    showEditDialog,
    showDetailDialog,
    selectedItem,
    editForm,

    // 方法
    showAddDialogHandler,
    closeAddDialog,
    handleAddConfirm,
    showDetail,
    closeDetail,
    showEdit,
    closeEdit,
    handleEditConfirm,
    deleteItem,
    updateResource
  }
}
