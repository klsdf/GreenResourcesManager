<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>编辑页面</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      <div class="modal-body">
        <h4 class="section-title">基础设置</h4>
        <div class="form-group">
          <label>页面名称</label>
          <fun-input
            type="text"
            v-model="editingPage.name"
            placeholder="例如：我的收藏"
          />
        </div>
        <div class="form-group">
          <label>图标</label>
          <fun-input
            type="text"
            v-model="editingPage.icon"
            placeholder="输入 emoji"
          />
        </div>
        <div class="form-group">
          <label>页面描述</label>
          <fun-input
            type="text"
            v-model="editingPage.description"
            placeholder="例如：管理我喜欢的资源"
          />
        </div>
        <div class="form-group">
          <label>默认每页显示数量</label>
          <fun-input
            type="number"
            v-model.number="editingPage.defaultPageSize"
            placeholder="例如：12"
          />
        </div>
        
        <h4 class="section-title">布局设置</h4>
        <div class="form-group">
          <label>最小卡片宽度</label>
          <fun-input
            type="number"
            v-model.number="editingPage.displayLayoutConfig.minWidth"
            placeholder="例如：150"
          />
        </div>
        <div class="form-group">
          <label>最大卡片宽度</label>
          <fun-input
            type="number"
            v-model.number="editingPage.displayLayoutConfig.maxWidth"
            placeholder="例如：400"
          />
        </div>
        
        <h4 class="section-title">空状态设置</h4>
        <div class="form-group">
          <label>空状态图标</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.icon"
            placeholder="例如：📚"
          />
        </div>
        <div class="form-group">
          <label>空状态标题</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.title"
            placeholder="例如：你的资源库是空的"
          />
        </div>
        <div class="form-group">
          <label>空状态描述</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.description"
            placeholder="例如：点击按钮来添加你的第一个资源"
          />
        </div>
        <div class="form-group">
          <label>空状态按钮文字</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.buttonText"
            placeholder="例如：添加第一个资源"
          />
        </div>
        <div class="form-group">
          <label>空状态按钮动作</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.buttonAction"
            placeholder="例如：showAddDialog"
          />
        </div>
        
        <h4 class="section-title">对话框设置</h4>
        <div class="form-group">
          <label>添加对话框标题</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.addTitle"
            placeholder="例如：添加资源"
          />
        </div>
        <div class="form-group">
          <label>编辑对话框标题</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.editTitle"
            placeholder="例如：编辑资源"
          />
        </div>
        <div class="form-group">
          <label>添加对话框按钮文字</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.addButtonText"
            placeholder="例如：添加资源"
          />
        </div>
        <div class="form-group">
          <label>编辑对话框按钮文字</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.editButtonText"
            placeholder="例如：保存修改"
          />
        </div>
        
        <h4 class="section-title">排序选项</h4>
        <div class="sort-options-list">
          <div
            v-for="(sortOption, index) in editingPage.sortOptions"
            :key="sortOption.id"
            class="sort-option-item"
          >
            <div class="sort-option-header">
              <span class="sort-option-index">{{ index + 1 }}</span>
              <button
                class="btn-icon delete"
                title="删除排序选项"
                @click="removeSortOption(index)"
              >
                🗑️
              </button>
            </div>
            <div class="sort-option-fields">
              <div class="form-group">
                <label>显示标签</label>
                <fun-input
                  type="text"
                  v-model="sortOption.label"
                  placeholder="例如：按名称排序"
                />
              </div>
              <div class="form-group">
                <label>排序字段</label>
                <fun-input
                  type="text"
                  v-model="sortOption.field"
                  placeholder="例如：name"
                />
              </div>
              <div class="form-group">
                <label>排序顺序</label>
                <fun-select
                  v-model="sortOption.order"
                  :options="[
                    { value: 'asc', label: '升序' },
                    { value: 'desc', label: '降序' }
                  ]"
                />
              </div>
            </div>
          </div>
        </div>
        <button class="btn-secondary add-sort-btn" @click="addSortOption">
          ➕ 添加排序选项
        </button>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose">取消</button>
        <button class="btn-primary" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import alertService from '../utils/AlertService.ts'
import { pageConfigLoader } from '../configs/pages/PageConfigLoader'

interface DisplayLayoutConfig {
  minWidth: number
  maxWidth: number
}

interface EmptyStateConfig {
  icon: string
  title: string
  description: string
  buttonText: string
  buttonAction: string
}

interface DialogConfig {
  addTitle: string
  editTitle: string
  addButtonText: string
  editButtonText: string
  enableEngineAutoDetect?: boolean
  enableScreenshotCover?: boolean
}

interface SortOption {
  id: string
  label: string
  field: string
  order: string
}

interface EditingPage {
  name: string
  icon: string
  description: string
  defaultPageSize: number
  displayLayoutConfig: DisplayLayoutConfig
  emptyStateConfig: EmptyStateConfig
  dialogConfig: DialogConfig
  sortOptions: SortOption[]
}

export default defineComponent({
  name: 'PageConfigEditor',
  components: {},
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    pageId: {
      type: String,
      default: ''
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const editingPage = ref<EditingPage>({
      name: '',
      icon: '',
      description: '',
      defaultPageSize: 12,
      displayLayoutConfig: {
        minWidth: 150,
        maxWidth: 400
      },
      emptyStateConfig: {
        icon: '',
        title: '',
        description: '',
        buttonText: '',
        buttonAction: ''
      },
      dialogConfig: {
        addTitle: '',
        editTitle: '',
        addButtonText: '',
        editButtonText: ''
      },
      sortOptions: []
    })

    const originalConfig = ref<any>(null)
    const currentFileName = ref<string>('')

    const loadPageConfig = async (pageId: string) => {
      try {
        const fileName = pageConfigLoader.getFileNameByPageId(pageId)
        if (!fileName) {
          await alertService.error('找不到配置文件名', '错误')
          return
        }
        currentFileName.value = fileName

        const configResult = await window.electronAPI?.readJsonFile(`configs/pages/${fileName}`)
        if (configResult?.success && configResult.data) {
          const config = JSON.parse(JSON.stringify(configResult.data))
          originalConfig.value = config
          editingPage.value = {
            name: config.name || '',
            icon: config.icon || '',
            description: config.description || '',
            defaultPageSize: config.defaultPageSize || 12,
            displayLayoutConfig: config.displayLayoutConfig || {
              minWidth: 150,
              maxWidth: 400
            },
            emptyStateConfig: config.emptyStateConfig || {
              icon: config.icon || '',
              title: '',
              description: '',
              buttonText: '',
              buttonAction: ''
            },
            dialogConfig: config.dialogConfig || {
              addTitle: '',
              editTitle: '',
              addButtonText: '',
              editButtonText: ''
            },
            sortOptions: config.sortOptions || []
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error)
        await alertService.error('加载配置失败', '错误')
      }
    }

    const handleClose = () => {
      emit('close')
    }

    const handleSave = async () => {
      try {
        if (!currentFileName.value || !originalConfig.value) {
          await alertService.error('保存失败，缺少配置信息', '错误')
          return
        }

        // 转换为普通对象，避免Vue响应式对象无法克隆的问题
        const updatedConfig = JSON.parse(JSON.stringify({
          ...originalConfig.value,
          name: editingPage.value.name,
          icon: editingPage.value.icon,
          description: editingPage.value.description,
          defaultPageSize: editingPage.value.defaultPageSize,
          displayLayoutConfig: editingPage.value.displayLayoutConfig,
          emptyStateConfig: editingPage.value.emptyStateConfig,
          dialogConfig: {
            ...originalConfig.value.dialogConfig,
            ...editingPage.value.dialogConfig
          },
          sortOptions: editingPage.value.sortOptions
        }))

        const writeResult = await window.electronAPI?.writeJsonFile(`configs/pages/${currentFileName.value}`, updatedConfig)
        if (!writeResult?.success) {
          await alertService.error('保存配置失败', '错误')
          return
        }

        (pageConfigLoader as any).readyPromise = (pageConfigLoader as any).loadConfigs()
        await (pageConfigLoader as any).readyPromise

        emit('save')
        await alertService.success('保存成功', '提示')
      } catch (error) {
        console.error('保存配置失败:', error)
        await alertService.error('保存配置失败', '错误')
      }
    }

    watch(() => props.visible, async (newVal) => {
      if (newVal && props.pageId) {
        await loadPageConfig(props.pageId)
      }
    })

    const addSortOption = () => {
      const newSortOption: SortOption = {
        id: `custom-sort-${Date.now()}`,
        label: '新排序',
        field: 'name',
        order: 'asc'
      }
      editingPage.value.sortOptions.push(newSortOption)
    }

    const removeSortOption = (index: number) => {
      editingPage.value.sortOptions.splice(index, 1)
    }

    watch(() => props.visible, async (newVal) => {
      if (newVal && props.pageId) {
        await loadPageConfig(props.pageId)
      }
    })

    watch(() => props.pageId, async (newVal) => {
      if (props.visible && newVal) {
        await loadPageConfig(newVal)
      }
    })

    return {
      editingPage,
      handleClose,
      handleSave,
      addSortOption,
      removeSortOption
    }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.section-title:first-of-type {
  margin-top: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-primary {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
}

.sort-options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.sort-option-item {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.sort-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sort-option-index {
  background: var(--accent-color);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
}

.sort-option-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sort-option-fields .form-group {
  margin-bottom: 0;
}

.add-sort-btn {
  width: 100%;
  justify-content: center;
  gap: 6px;
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
</style>
