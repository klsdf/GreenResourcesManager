<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ $lt('编辑页面') }}</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      <div class="modal-body">
        <h4 class="section-title">{{ $lt('基础设置') }}</h4>
        <div class="form-group">
          <label>{{ $lt('页面名称') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.name"
            :placeholder="$lt('例如：我的收藏')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('图标') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.icon"
            :placeholder="$lt('输入 emoji')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('页面描述') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.description"
            :placeholder="$lt('例如：管理我喜欢的资源')"
          />
        </div>
        <h4 class="section-title">{{ $lt('接受的资源') }}</h4>
        <p class="field-hint">{{ $lt('只按文件本身来分，比如可执行文件、图片、视频。和这个页面有没有发行商、标签无关。改这里不会改动已经保存的内容。同一种文件会归到列表里靠前的那一种。') }}</p>
        <div class="type-list">
          <div
            v-for="(kindId, index) in editingPage.acceptedKinds"
            :key="kindId"
            class="type-row"
          >
            <div class="type-text">
              <span class="type-label">{{ kindLabel(kindId) }}</span>
              <span class="type-desc">{{ kindDescription(kindId) }}</span>
            </div>
            <div class="type-actions">
              <button class="btn-icon" type="button" :title="$lt('上移')" :disabled="index === 0" @click="moveKind(index, -1)">▲</button>
              <button class="btn-icon" type="button" :title="$lt('下移')" :disabled="index === editingPage.acceptedKinds.length - 1" @click="moveKind(index, 1)">▼</button>
              <button class="btn-icon delete" type="button" :title="$lt('移除')" @click="removeKind(index)">✕</button>
            </div>
          </div>
        </div>
        <div v-if="kindsToAdd.length" class="kind-picker">
          <div class="check-grid">
            <label v-for="kind in kindsToAdd" :key="kind.id" class="check-item">
              <input type="checkbox" :checked="pendingKinds.includes(kind.id)" @change="togglePendingKind(kind.id)" />
              <span>{{ kind.label }}</span>
            </label>
          </div>
          <div class="add-type-row">
            <button class="btn-secondary" type="button" @click="selectAllPendingKinds">{{ $lt('全选') }}</button>
            <button class="btn-secondary" type="button" :disabled="!pendingKinds.length" @click="addSelectedKinds">{{ $lt('添加') }}</button>
          </div>
        </div>

        <h4 class="section-title">{{ $lt('页面字段') }}</h4>
        <p class="field-hint">{{ $lt('这个页面编辑资源时能看到哪些字段。取消勾选不会删掉已经保存的内容，只是这个页面不再显示它。') }}</p>
        <div class="check-grid">
          <label v-for="field in fieldCatalog" :key="field.key" class="check-item">
            <input type="checkbox" :checked="editingPage.pageFields.includes(field.key)" @change="togglePageField(field.key)" />
            <span>{{ field.label }}</span>
          </label>
        </div>

        <h4 class="section-title">{{ $lt('筛选器') }}</h4>
        <p class="field-hint">{{ $lt('侧边栏用哪些条件筛选。这里同样只改页面，不改资源数据。') }}</p>
        <div class="type-list">
          <div v-for="(filter, index) in editingPage.filterConfig" :key="filter.key" class="type-row">
            <span class="type-label">{{ filter.title || filter.key }}</span>
            <button class="btn-icon delete" type="button" :title="$lt('移除')" @click="removeFilter(index)">✕</button>
          </div>
        </div>
        <div class="add-type-row">
          <select v-model="filterToAdd" class="type-select">
            <option value="">{{ $lt('选择要添加的筛选器') }}</option>
            <option v-for="preset in filterPresetsToAdd" :key="preset.id" :value="preset.id">{{ preset.title }}</option>
          </select>
          <button class="btn-secondary" type="button" :disabled="!filterToAdd" @click="addFilter">{{ $lt('添加筛选器') }}</button>
        </div>

        <div class="form-group">
          <label>{{ $lt('默认每页显示数量') }}</label>
          <fun-input
            type="number"
            v-model.number="editingPage.defaultPageSize"
            :placeholder="$lt('例如：12')"
          />
        </div>
        
        <h4 class="section-title">{{ $lt('布局设置') }}</h4>
        <div class="form-group">
          <label>{{ $lt('最小卡片宽度') }}</label>
          <fun-input
            type="number"
            v-model.number="editingPage.displayLayoutConfig.minWidth"
            :placeholder="$lt('例如：150')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('最大卡片宽度') }}</label>
          <fun-input
            type="number"
            v-model.number="editingPage.displayLayoutConfig.maxWidth"
            :placeholder="$lt('例如：400')"
          />
        </div>
        
        <h4 class="section-title">{{ $lt('空状态设置') }}</h4>
        <div class="form-group">
          <label>{{ $lt('空状态图标') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.icon"
            :placeholder="$lt('例如：📚')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('空状态标题') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.title"
            :placeholder="$lt('例如：你的资源库是空的')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('空状态描述') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.description"
            :placeholder="$lt('例如：点击按钮来添加你的第一个资源')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('空状态按钮文字') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.buttonText"
            :placeholder="$lt('例如：添加第一个资源')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('空状态按钮动作') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.emptyStateConfig.buttonAction"
            :placeholder="$lt('例如：showAddDialog')"
          />
        </div>
        
        <h4 class="section-title">{{ $lt('对话框设置') }}</h4>
        <div class="form-group">
          <label>{{ $lt('添加对话框标题') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.addTitle"
            :placeholder="$lt('例如：添加资源')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('编辑对话框标题') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.editTitle"
            :placeholder="$lt('例如：编辑资源')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('添加对话框按钮文字') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.addButtonText"
            :placeholder="$lt('例如：添加资源')"
          />
        </div>
        <div class="form-group">
          <label>{{ $lt('编辑对话框按钮文字') }}</label>
          <fun-input
            type="text"
            v-model="editingPage.dialogConfig.editButtonText"
            :placeholder="$lt('例如：保存修改')"
          />
        </div>
        
        <h4 class="section-title">{{ $lt('排序选项') }}</h4>
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
                :title="$lt('删除排序选项')"
                @click="removeSortOption(index)"
              >
                🗑️
              </button>
            </div>
            <div class="sort-option-fields">
              <div class="form-group">
                <label>{{ $lt('显示标签') }}</label>
                <fun-input
                  type="text"
                  v-model="sortOption.label"
                  :placeholder="$lt('例如：按名称排序')"
                />
              </div>
              <div class="form-group">
                <label>{{ $lt('排序字段') }}</label>
                <fun-input
                  type="text"
                  v-model="sortOption.field"
                  :placeholder="$lt('例如：name')"
                />
              </div>
              <div class="form-group">
                <label>{{ $lt('排序顺序') }}</label>
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
        <button class="btn-secondary add-sort-btn" @click="addSortOption"> {{ $lt('➕ 添加排序选项') }} </button>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose">{{ $lt('取消') }}</button>
        <button class="btn-primary" @click="handleSave">{{ $lt('保存') }}</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import { BASIC_RESOURCE_KINDS, collectFieldCatalog, defaultAcceptedKindIds, defaultFieldKeys, findBasicKind, makeFieldFilter } from '../configs/resources/resourceKindCatalog'
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
  /** 页面接受的基本资源类型 */
  acceptedKinds: string[]
  /** 这个页面编辑时显示的字段 */
  pageFields: string[]
  /** 侧边栏筛选器 */
  filterConfig: any[]
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
      acceptedKinds: [],
      pageFields: [],
      filterConfig: [],
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
    /** 勾选后准备一次性加进页面的资源类型 */
    const pendingKinds = ref<string[]>([])
    /** 准备添加的筛选器 */
    const filterToAdd = ref('')
    /** 全部可勾选字段 */
    const fieldCatalog = collectFieldCatalog()
    /** 还没放进这个页面的基本资源类型 */
    const kindsToAdd = computed(() => {
      const selected = new Set(editingPage.value.acceptedKinds)
      return BASIC_RESOURCE_KINDS.filter(kind => !selected.has(kind.id))
    })
    /** 还没放进这个页面的筛选器 */
    const filterPresetsToAdd = computed(() => {
      const used = new Set(editingPage.value.filterConfig.map((item: any) => item.key))
      const presets = [
        { id: 'missing-resources', title: '丢失的资源' },
        { id: 'rating', title: '星级' },
        { id: 'running-status', title: '正在使用' }
      ]
      const fieldPresets = fieldCatalog
        .filter(field => field.filterable && editingPage.value.pageFields.includes(field.key))
        .map(field => ({ id: `field:${field.key}`, title: `${field.label}筛选` }))
      return [...presets, ...fieldPresets].filter(preset => !used.has(preset.id.startsWith('field:') ? preset.id.slice(6) : preset.id))
    })

    /** 基本资源类型的显示名 */
    const kindLabel = (kindId: string) => findBasicKind(kindId)?.label || kindId
    /** 基本资源类型的说明 */
    const kindDescription = (kindId: string) => findBasicKind(kindId)?.description || ''

    /**
     * 调整接受顺序。
     * 扩展名重叠时，靠前的类型会先匹配到文件。
     */
    const moveKind = (index: number, offset: number) => {
      const nextIndex = index + offset
      const list = editingPage.value.acceptedKinds
      if (nextIndex < 0 || nextIndex >= list.length) return
      const [item] = list.splice(index, 1)
      list.splice(nextIndex, 0, item)
    }

    /** 从页面接受列表里拿掉一种资源。至少留一种。 */
    const removeKind = async (index: number) => {
      if (editingPage.value.acceptedKinds.length <= 1) {
        await alertService.warning('页面至少要接受一种资源', '提示')
        return
      }
      editingPage.value.acceptedKinds.splice(index, 1)
    }

    /**
     * 勾选或取消一种还没接受的资源。
     * 类型数量不多，一次可以勾好几种再添加。
     */
    const togglePendingKind = (kindId: string) => {
      const index = pendingKinds.value.indexOf(kindId)
      if (index >= 0) pendingKinds.value.splice(index, 1)
      else pendingKinds.value.push(kindId)
    }

    /** 把还没接受的资源全部勾上。 */
    const selectAllPendingKinds = () => {
      pendingKinds.value = kindsToAdd.value.map(kind => kind.id)
    }

    /**
     * 把勾选的资源加进页面。
     * 按类型目录的顺序追加，扩展名重叠时仍是列表里靠前的先匹配。
     */
    const addSelectedKinds = () => {
      const selected = new Set(pendingKinds.value)
      for (const kind of kindsToAdd.value) {
        if (!selected.has(kind.id) || editingPage.value.acceptedKinds.includes(kind.id)) continue
        editingPage.value.acceptedKinds.push(kind.id)
      }
      pendingKinds.value = []
    }

    /** 勾选或取消一个页面字段。不改已经保存的资源。 */
    const togglePageField = (fieldKey: string) => {
      const fields = editingPage.value.pageFields
      const index = fields.indexOf(fieldKey)
      if (index >= 0) fields.splice(index, 1)
      else fields.push(fieldKey)
    }

    /** 去掉一个筛选器。 */
    const removeFilter = (index: number) => {
      editingPage.value.filterConfig.splice(index, 1)
    }

    /** 按预设加上一个筛选器。 */
    const addFilter = () => {
      const presetId = filterToAdd.value
      if (!presetId) return
      if (presetId === 'missing-resources') {
        editingPage.value.filterConfig.push({
          key: 'missing-resources',
          title: '丢失的资源',
          filterType: 'missingResources',
          params: { missingLabel: '丢失的资源' }
        })
      } else if (presetId === 'rating') {
        editingPage.value.filterConfig.push({
          key: 'rating',
          title: '星级筛选',
          filterType: 'rating',
          params: {}
        })
      } else if (presetId === 'running-status') {
        editingPage.value.filterConfig.push({
          key: 'running-status',
          title: '正在使用',
          filterType: 'runningStatus',
          params: { runningLabel: '正在使用' }
        })
      } else if (presetId.startsWith('field:')) {
        const field = fieldCatalog.find(item => item.key === presetId.slice(6))
        if (field) editingPage.value.filterConfig.push(makeFieldFilter(field))
      }
      filterToAdd.value = ''
    }

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
          const legacyTypes = Array.isArray(config.resourceTypes) ? config.resourceTypes : []
          editingPage.value = {
            name: config.name || '',
            icon: config.icon || '',
            description: config.description || '',
            acceptedKinds: Array.isArray(config.acceptedKinds) && config.acceptedKinds.length
              ? [...config.acceptedKinds]
              : defaultAcceptedKindIds(legacyTypes),
            pageFields: Array.isArray(config.pageFields)
              ? [...config.pageFields]
              : defaultFieldKeys(legacyTypes),
            filterConfig: Array.isArray(config.filterConfig) ? JSON.parse(JSON.stringify(config.filterConfig)) : [],
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
        if (!editingPage.value.acceptedKinds.length) {
          await alertService.warning('页面至少要接受一种资源', '提示')
          return
        }

        // 只写页面配置。接受的资源、字段和筛选器都不改已经保存的资源记录。
        // resourceTypes 保持原样，旧数据仍按原来的结构读取。
        const updatedConfig = JSON.parse(JSON.stringify({
          ...originalConfig.value,
          name: editingPage.value.name,
          icon: editingPage.value.icon,
          description: editingPage.value.description,
          acceptedKinds: editingPage.value.acceptedKinds,
          pageFields: editingPage.value.pageFields,
          filterConfig: editingPage.value.filterConfig,
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
      removeSortOption,
      pendingKinds,
      filterToAdd,
      fieldCatalog,
      kindsToAdd,
      filterPresetsToAdd,
      kindLabel,
      kindDescription,
      moveKind,
      removeKind,
      togglePendingKind,
      selectAllPendingKinds,
      addSelectedKinds,
      togglePageField,
      removeFilter,
      addFilter
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

.field-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0 0 12px;
}

.kind-picker .check-grid {
  margin-bottom: 12px;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 20px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.type-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.type-label {
  font-weight: 600;
}

.type-desc {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.type-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.add-type-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.type-select {
  flex: 1;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
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
