<template>
  <div class="page-management-settings">
    <div class="settings-section">
      <h3>页面管理</h3>
      <p class="section-desc">管理侧边栏显示的页面，可以排序或隐藏不需要的页面。</p>

      <div class="actions-bar">
        <!-- 注释掉添加新页面按钮 -->
        <!-- <button class="btn-primary" @click="showAddPageDialog">
          <span class="icon">➕</span> 添加新页面
        </button> -->
        <button class="btn-primary" @click="openConfigDirectory">
          <span class="icon">📁</span> 打开配置目录
        </button>
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
            title="拖拽排序"
            @dragstart.stop="onDragStart($event, index)"
            @dragend.stop="onDragEnd"
          >
            ⋮⋮
          </div>
          <div class="page-icon">{{ page.icon }}</div>
          <div class="page-info">
            <div class="page-name">
              {{ page.name }}
              <span v-if="page.isDefault" class="badge system">系统</span>
              <span v-if="page.isHidden" class="badge hidden">已隐藏</span>
            </div>
            <div class="page-type">{{ getTypeName(page.type) }}</div>
          </div>

          <div class="page-actions">
            <button
              class="btn-icon"
              title="上移"
              @click="moveUp(getActualIndex(page.id))"
              :disabled="getActualIndex(page.id) === 0"
            >
              ▲
            </button>
            <button
              class="btn-icon"
              title="下移"
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
            <button class="btn-icon" title="编辑" @click="editPage(page)">
              ✏️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑页面对话框 -->
    <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑页面</h3>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
        <div class="modal-body">
          <FormField
            label="页面名称"
            type="text"
            v-model="editingPage.name"
            placeholder="例如：我的收藏"
          />
          <FormField
            label="图标"
            type="text"
            v-model="editingPage.icon"
            placeholder="输入 emoji"
          />
          <FormField
            label="页面描述"
            type="text"
            v-model="editingPage.description"
            placeholder="例如：管理我喜欢的资源"
          />
          <FormField
            label="默认每页显示数量"
            type="number"
            v-model.number="editingPage.defaultPageSize"
            placeholder="例如：12"
          />
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDialog">取消</button>
          <button class="btn-primary" @click="savePage">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import pageConfigManager from '../../utils/PageConfigManager'
import alertService from '../../utils/AlertService.ts'
import { PageConfig } from '../../types/page'
import FormField from '../FormField.vue'
import { pageConfigLoader } from '../../configs/pages/PageConfigLoader'

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

interface EditingPage {
  name: string
  icon: string
  description: string
  defaultPageSize: number
}

export default defineComponent({
  name: 'PageManagementSettings',
  components: { FormField },
  emits: ['pages-updated'],
  setup(_, { emit }) {
    const pages = ref<PageConfig[]>([])
    const isDragging = ref(false)
    const draggedIndex = ref<number | null>(null)
    const dragTargetIndex = ref<number | null>(null)
    const draggingId = ref<string | null>(null)
    const showDialog = ref(false)
    const editingPageId = ref<string>('')
    const editingPage = ref<EditingPage>({
      name: '',
      icon: '',
      description: '',
      defaultPageSize: 12
    })

    const loadPages = async () => {
      pages.value = await pageConfigManager.getPages()
    }

    onMounted(loadPages)

    const getTypeName = (type: string) => TYPE_NAME_MAP[type] || type

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
        // 调用新的 API 来保存排序和可见性
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
        // 切换可见性
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
          // 打开配置目录
          await window.electronAPI.openFolder('configs/pages')
        } else {
          await alertService.warning('无法打开配置目录，请手动导航到 configs/pages 文件夹', '提示')
        }
      } catch (error) {
        console.error('打开配置目录失败:', error)
        await alertService.error('打开配置目录失败', '错误')
      }
    }

    const closeDialog = () => {
      showDialog.value = false
      editingPageId.value = ''
    }

    const editPage = async (page: PageConfig) => {
      try {
        editingPageId.value = page.id
        
        // 获取配置文件的文件名
        const fileName = pageConfigLoader.getFileNameByPageId(page.id)
        if (!fileName) {
          await alertService.error('找不到配置文件名', '错误')
          return
        }

        const configResult = await window.electronAPI?.readJsonFile(`configs/pages/${fileName}`)
        if (configResult?.success && configResult.data) {
          const config = configResult.data
          editingPage.value = {
            name: config.name || page.name,
            icon: config.icon || page.icon,
            description: config.description || page.description || '',
            defaultPageSize: config.defaultPageSize || 12
          }
        } else {
          // 如果读取失败，使用页面配置中的数据
          editingPage.value = {
            name: page.name,
            icon: page.icon,
            description: page.description || '',
            defaultPageSize: 12
          }
        }
        
        showDialog.value = true
      } catch (error) {
        console.error('打开编辑对话框失败:', error)
        await alertService.error('打开编辑对话框失败', '错误')
      }
    }

    const savePage = async () => {
      try {
        // 获取配置文件的文件名
        const fileName = pageConfigLoader.getFileNameByPageId(editingPageId.value)
        if (!fileName) {
          await alertService.error('找不到配置文件名', '错误')
          return
        }

        // 读取原有的配置
        const readResult = await window.electronAPI?.readJsonFile(`configs/pages/${fileName}`)
        if (!readResult?.success || !readResult.data) {
          await alertService.error('读取配置失败', '错误')
          return
        }

        // 更新配置
        const updatedConfig = {
          ...readResult.data,
          name: editingPage.value.name,
          icon: editingPage.value.icon,
          description: editingPage.value.description,
          defaultPageSize: editingPage.value.defaultPageSize
        }

        // 保存配置
        const writeResult = await window.electronAPI?.writeJsonFile(`configs/pages/${fileName}`, updatedConfig)
        if (!writeResult?.success) {
          await alertService.error('保存配置失败', '错误')
          return
        }

        // 重新加载配置
        (pageConfigLoader as any).readyPromise = (pageConfigLoader as any).loadConfigs()
        await (pageConfigLoader as any).readyPromise
        await pageConfigManager.reloadAsync()
        
        // 刷新页面列表
        await loadPages()
        emit('pages-updated')
        
        // 关闭对话框
        closeDialog()
        await alertService.success('保存成功', '提示')
      } catch (error) {
        console.error('保存配置失败:', error)
        await alertService.error('保存配置失败', '错误')
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
      showDialog,
      editingPage,
      editPage,
      savePage,
      closeDialog
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
  color: white;
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
</style>
