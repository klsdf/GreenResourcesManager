<template>
  <div class="page-management-settings">
    <div class="settings-section">
      <h3>{{ $lt('页面管理') }}</h3>
      <p class="section-desc">{{ $lt('管理侧边栏显示的页面，可以新增、编辑、排序、隐藏或删除。') }}</p>

      <div class="actions-bar">
        <button class="btn-primary" @click="openAddDialog">
          <span class="icon">➕</span> {{ $lt('添加新页面') }} </button>
        <button class="btn-secondary" @click="openConfigDirectory">
          <span class="icon">📁</span> {{ $lt('打开配置目录') }} </button>
      </div>

      <div class="pages-list" :class="{ 'is-dragging': isDragging }">
        <div
          v-for="(page, index) in previewPages"
          :key="page.id"
          class="page-item"
          :class="{ 'is-hidden': page.isHidden, dragging: draggingId === page.id }"
          @dragover.prevent="onDragOver($event, index)"
          @drop.prevent="onDrop($event, index)"
        >
          <div
            class="page-drag-handle"
            draggable="true"
            :title="$lt('拖拽排序')"
            @dragstart.stop="onDragStart($event, index)"
            @dragend.stop="onDragEnd"
          >
            ⋮⋮
          </div>
          <div class="page-icon">{{ page.icon }}</div>
          <div class="page-info">
            <div class="page-name">
              {{ $lt(page.name) }}
              <span v-if="page.isDefault" class="badge system">{{ $lt('系统') }}</span>
              <span v-if="page.isHidden" class="badge hidden">{{ $lt('已隐藏') }}</span>
            </div>
            <div class="page-type">{{ formatPageTypes(page) }}</div>
          </div>

          <div class="page-actions">
            <button
              class="btn-icon"
              :title="$lt('上移')"
              @click="moveUp(getActualIndex(page.id))"
              :disabled="getActualIndex(page.id) === 0"
            >
              ▲
            </button>
            <button
              class="btn-icon"
              :title="$lt('下移')"
              @click="moveDown(getActualIndex(page.id))"
              :disabled="getActualIndex(page.id) === pages.length - 1"
            >
              ▼
            </button>
            <button
              class="btn-icon"
              :title="page.isHidden ? '显示页面' : '隐藏页面'"
              @click="toggleVisibility(page)"
            >
              {{ page.isHidden ? '🚫' : '👁️' }}
            </button>
            <button class="btn-icon" :title="$lt('编辑')" @click="editPage(page)">
              ✏️
            </button>
            <button class="btn-icon delete" :title="$lt('删除页面')" @click="openDeleteDialog(page)">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <fun-modal v-model="showAddDialog" :title="$lt('添加新页面')" max-width="720px">
      <p class="dialog-desc">{{ $lt('先选一种内容模板，新页面会按这个类型来管理资源。') }}</p>
      <div class="template-grid">
        <button
          v-for="template in pageTemplates"
          :key="template.id"
          type="button"
          class="template-card"
          :class="{ selected: selectedTemplateId === template.id }"
          @click="selectTemplate(template.id)"
        >
          <span class="template-icon">{{ template.icon }}</span>
          <span class="template-label">{{ $lt(template.label) }}</span>
          <span class="template-desc">{{ $lt(template.description) }}</span>
        </button>
      </div>
      <div class="form-group">
        <label>{{ $lt('页面名称') }}</label>
        <fun-input v-model="newPageName" type="text" :placeholder="$lt('例如：我的电影')" />
      </div>
      <template #footer>
        <button class="btn-secondary" type="button" @click="closeAddDialog">{{ $lt('取消') }}</button>
        <button class="btn-primary" type="button" :disabled="!canCreatePage || isCreating" @click="confirmCreatePage">
          {{ isCreating ? '正在添加...' : '添加' }}
        </button>
      </template>
    </fun-modal>

    <fun-modal v-model="showDeleteDialog" :title="$lt('删除页面')" max-width="520px">
      <p class="dialog-desc danger-text"> {{ $lt('将从侧边栏去掉「') }}{{ deletingPageName }}{{ $lt('」。这一页的名单会清掉，资源本身还留着，之后拖进别的页面会接回原来的记录。') }} </p>
      <p class="dialog-desc">{{ $lt('请输入「') }}{{ deleteConfirmText }}{{ $lt('」后再确认。') }}</p>
      <div class="form-group">
        <fun-input v-model="deleteConfirmInput" type="text" :placeholder="deleteConfirmText" />
      </div>
      <template #footer>
        <button class="btn-secondary" type="button" @click="closeDeleteDialog">{{ $lt('取消') }}</button>
        <button class="btn-danger" type="button" :disabled="!canDeletePage || isDeleting" @click="confirmDeletePage">
          {{ isDeleting ? '正在删除...' : '确认删除' }}
        </button>
      </template>
    </fun-modal>

    <PageConfigEditor
      :visible="showEditor"
      :page-id="editingPageId"
      @close="handleEditorClose"
      @save="handleEditorSave"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import pageConfigManager from '../../utils/PageConfigManager'
import alertService from '../../utils/AlertService.ts'
import { PageConfig } from '../../types/page'
import PageConfigEditor from '../PageConfigEditor.vue'
import { pageConfigLoader } from '../../configs/pages/PageConfigLoader'
import { DELETE_PAGE_CONFIRM_TEXT, PAGE_TEMPLATES } from '../../configs/pages/pageTemplates'
import { defaultAcceptedKindIds, findBasicKind } from '../../configs/resources/resourceKindCatalog'
import { lt } from '../../locales/lt'

const TYPE_NAME_MAP: Record<string, string> = {
  Game: '游戏',
  Software: '软件',
  Image: '图片',
  SingleImage: '单图',
  Video: '电影',
  Anime: '番剧',
  Novel: '小说',
  Audio: '音频',
  Website: '网站',
  Other: '其它'
}

export default defineComponent({
  name: 'PageManagementSettings',
  components: { PageConfigEditor },
  emits: ['pages-updated'],
  setup(_, { emit }) {
    const pages = ref<PageConfig[]>([])
    const isDragging = ref(false)
    const draggedIndex = ref<number | null>(null)
    const dragTargetIndex = ref<number | null>(null)
    const draggingId = ref<string | null>(null)
    const showEditor = ref(false)
    const editingPageId = ref<string>('')
    /** 预设模板列表，供新增页面时选择 */
    const pageTemplates = PAGE_TEMPLATES
    /** 删除确认时必须输入的原句 */
    const deleteConfirmText = DELETE_PAGE_CONFIRM_TEXT
    /** 是否显示新增页面窗口 */
    const showAddDialog = ref(false)
    /** 当前选中的模板 ID */
    const selectedTemplateId = ref('')
    /** 新页面名称 */
    const newPageName = ref('')
    /** 正在创建页面，避免重复提交 */
    const isCreating = ref(false)
    /** 是否显示删除确认窗口 */
    const showDeleteDialog = ref(false)
    /** 准备删除的页面 */
    const deletingPage = ref<PageConfig | null>(null)
    /** 用户输入的删除确认文字 */
    const deleteConfirmInput = ref('')
    /** 正在删除页面，避免重复提交 */
    const isDeleting = ref(false)

    /** 删除窗口里展示的页面名称 */
    const deletingPageName = computed(() => deletingPage.value?.name || '这个页面')
    /** 选了模板并且写了名称后才允许创建 */
    const canCreatePage = computed(() => !!selectedTemplateId.value && newPageName.value.trim().length > 0)
    /** 确认文字完全一致后才允许删除 */
    const canDeletePage = computed(() => deleteConfirmInput.value.trim() === deleteConfirmText)

    const loadPages = async () => {
      pages.value = await pageConfigManager.getPages()
    }

    onMounted(loadPages)

    const getTypeName = (type: string) => TYPE_NAME_MAP[type] || type

    /** 页面接受的基本资源类型 */
    const formatPageTypes = (page: PageConfig) => {
      const legacyTypes = page.resourceTypes?.length ? page.resourceTypes : [page.type]
      const kindIds = page.acceptedKinds?.length ? page.acceptedKinds : defaultAcceptedKindIds(legacyTypes)
      return kindIds.map(kindId => lt(findBasicKind(kindId)?.label || kindId)).join('、')
    }

    const previewPages = computed(() => {
      if (draggedIndex.value === null) {
        return pages.value
      }
      const clone = [...pages.value]
      const [draggedItem] = clone.splice(draggedIndex.value, 1)
      const targetIndex = Math.max(0, Math.min(clone.length, dragTargetIndex.value ?? clone.length))
      clone.splice(targetIndex, 0, draggedItem)
      return clone
    })

    const getActualIndex = (pageId: string) => pages.value.findIndex(p => p.id === pageId)

    const persistOrder = async (newPages: PageConfig[]) => {
      pages.value = newPages
      try {
        const success = await pageConfigManager.savePageOrder(newPages)
        if (success) {
          emit('pages-updated')
        } else {
          throw new Error('保存失败')
        }
      } catch (error) {
        console.error('排序失败:', error)
        await loadPages()
      }
    }

    const moveUp = async (index: number) => {
      if (index <= 0) return
      const newPages = [...pages.value]
      const [item] = newPages.splice(index, 1)
      newPages.splice(index - 1, 0, item)
      await persistOrder(newPages)
    }

    const moveDown = async (index: number) => {
      if (index >= pages.value.length - 1) return
      const newPages = [...pages.value]
      const [item] = newPages.splice(index, 1)
      newPages.splice(index + 1, 0, item)
      await persistOrder(newPages)
    }

    const toggleVisibility = async (page: PageConfig) => {
      try {
        const newPages = pages.value.map(p => 
          p.id === page.id ? { ...p, isHidden: !p.isHidden } : p
        )
        await persistOrder(newPages)
      } catch (error) {
        console.error('更新状态失败:', error)
      }
    }

    const openConfigDirectory = async () => {
      try {
        if (window.electronAPI?.openFolder) {
          await window.electronAPI.openFolder('configs/pages')
        } else {
          await alertService.warning('无法打开配置目录，请手动导航到 configs/pages 文件夹', '提示')
        }
      } catch (error) {
        console.error('打开配置目录失败:', error)
        await alertService.error('打开配置目录失败', '错误')
      }
    }

    const editPage = (page: PageConfig) => {
      editingPageId.value = page.id
      showEditor.value = true
    }

    const handleEditorClose = () => {
      showEditor.value = false
      editingPageId.value = ''
    }

    const handleEditorSave = async () => {
      await pageConfigManager.reloadAsync()
      await loadPages()
      emit('pages-updated')
    }

    /**
     * 给新页面挑一个不重名的默认名称。
     * 已经有同名页面时，在后面加上数字。
     */
    const suggestPageName = (label: string) => {
      const usedNames = new Set(pages.value.map(page => page.name))
      if (!usedNames.has(label)) return label
      let suffix = 2
      while (usedNames.has(`${label} ${suffix}`)) suffix += 1
      return `${label} ${suffix}`
    }

    /** 打开新增窗口，并默认选中第一个模板。 */
    const openAddDialog = () => {
      const firstTemplate = pageTemplates[0]
      selectedTemplateId.value = firstTemplate?.id || ''
      newPageName.value = firstTemplate ? suggestPageName(firstTemplate.label) : ''
      showAddDialog.value = true
    }

    /** 关闭新增窗口。 */
    const closeAddDialog = () => {
      showAddDialog.value = false
    }

    /**
     * 切换模板时，把名称改成这个模板的建议名。
     * 用户已经改过的名称不覆盖，避免把正在输入的字清掉。
     */
    const selectTemplate = (templateId: string) => {
      const previous = pageTemplates.find(template => template.id === selectedTemplateId.value)
      const next = pageTemplates.find(template => template.id === templateId)
      if (!next) return
      const previousSuggestion = previous ? suggestPageName(previous.label) : ''
      const stillUsingSuggestion = !newPageName.value.trim() || newPageName.value === previousSuggestion || newPageName.value === previous?.label
      selectedTemplateId.value = templateId
      if (stillUsingSuggestion) {
        newPageName.value = suggestPageName(next.label)
      }
    }

    /** 按选中的模板创建页面，并刷新侧边栏。 */
    const confirmCreatePage = async () => {
      if (!canCreatePage.value || isCreating.value) return
      isCreating.value = true
      try {
        const result = await pageConfigLoader.createPageFromTemplate(selectedTemplateId.value, newPageName.value)
        if (!result.success) {
          await alertService.error(result.error || '添加页面失败', '错误')
          return
        }
        await pageConfigManager.reloadAsync()
        await loadPages()
        showAddDialog.value = false
        emit('pages-updated')
      } catch (error) {
        console.error('添加页面失败:', error)
        await alertService.error('添加页面失败', '错误')
      } finally {
        isCreating.value = false
      }
    }

    /** 打开删除确认窗口，要求用户手动输入风险提示。 */
    const openDeleteDialog = (page: PageConfig) => {
      deletingPage.value = page
      deleteConfirmInput.value = ''
      showDeleteDialog.value = true
    }

    /** 关闭删除确认窗口。 */
    const closeDeleteDialog = () => {
      if (isDeleting.value) return
      showDeleteDialog.value = false
      deletingPage.value = null
      deleteConfirmInput.value = ''
    }

    /**
     * 先清掉页面里的资源，再从页面列表移除。
     * 数据没删掉时不移除页面，避免列表里没了、内容还在。
     */
    const confirmDeletePage = async () => {
      const page = deletingPage.value
      if (!page || !canDeletePage.value || isDeleting.value) return
      isDeleting.value = true
      try {
        const dataResult = await window.electronAPI?.sqliteDeletePageData(page.id)
        if (!dataResult?.ok) {
          await alertService.error(dataResult?.message || '删除页面数据失败', '错误')
          return
        }
        const removeResult = await pageConfigLoader.removePage(page.id)
        if (!removeResult.success) {
          await alertService.error(removeResult.error || '页面数据已删除，但页面配置移除失败', '错误')
          return
        }
        await pageConfigManager.reloadAsync()
        await loadPages()
        showDeleteDialog.value = false
        deletingPage.value = null
        deleteConfirmInput.value = ''
        emit('pages-updated')
      } catch (error) {
        console.error('删除页面失败:', error)
        await alertService.error('删除页面失败', '错误')
      } finally {
        isDeleting.value = false
      }
    }

    const resetDragState = () => {
      draggedIndex.value = null
      dragTargetIndex.value = null
      draggingId.value = null
      isDragging.value = false
    }

    const onDragStart = (event: DragEvent, index: number) => {
      draggedIndex.value = index
      dragTargetIndex.value = index
      draggingId.value = pages.value[index]?.id ?? null
      isDragging.value = true
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.dropEffect = 'move'
        event.dataTransfer.setDragImage(new Image(), 0, 0)
      }
    }

    const onDragEnd = () => {
      resetDragState()
    }

    const onDragOver = (_event: DragEvent, index: number) => {
      if (draggedIndex.value === null) return
      dragTargetIndex.value = index
    }

    const onDrop = async (_event: DragEvent, index: number) => {
      if (draggedIndex.value === null) {
        resetDragState()
        return
      }
      const newPages = [...pages.value]
      const [item] = newPages.splice(draggedIndex.value, 1)
      newPages.splice(index, 0, item)
      await persistOrder(newPages)
      resetDragState()
    }

    return {
      pages,
      getTypeName,
      formatPageTypes,
      previewPages,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      moveUp,
      moveDown,
      draggingId,
      getActualIndex,
      isDragging,
      toggleVisibility,
      openConfigDirectory,
      showEditor,
      editingPageId,
      editPage,
      handleEditorClose,
      handleEditorSave,
      pageTemplates,
      deleteConfirmText,
      showAddDialog,
      selectedTemplateId,
      newPageName,
      isCreating,
      canCreatePage,
      openAddDialog,
      closeAddDialog,
      selectTemplate,
      confirmCreatePage,
      showDeleteDialog,
      deletingPageName,
      deleteConfirmInput,
      isDeleting,
      canDeletePage,
      openDeleteDialog,
      closeDeleteDialog,
      confirmDeletePage
    }
  }
})
</script>

<style scoped>
.page-management-settings {
  padding: 20px;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.actions-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.page-item:hover {
  border-color: var(--accent-color);
}

.page-item.is-hidden {
  opacity: 0.6;
  background: var(--bg-primary);
}

.page-drag-handle {
  cursor: move;
  padding: 0 10px;
  color: var(--text-secondary);
  font-size: 1.2rem;
  user-select: none;
}

.page-icon {
  font-size: 1.5rem;
  margin-right: 15px;
  width: 40px;
  text-align: center;
}

.page-info {
  flex: 1;
}

.page-name {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-type {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge.system {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.badge.hidden {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  font-size: 1.1rem;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-desc {
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.danger-text {
  color: #b91c1c;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.template-card.selected {
  border-color: var(--accent-color);
  box-shadow: inset 0 0 0 1px var(--accent-color);
}

.template-icon {
  font-size: 1.4rem;
}

.template-label {
  font-weight: bold;
}

.template-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.9rem;
}
</style>
