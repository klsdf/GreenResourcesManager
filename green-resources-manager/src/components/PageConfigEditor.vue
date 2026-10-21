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
        <div class="form-group">
          <label>{{ $lt('默认每页显示数量') }}</label>
          <fun-input
            type="number"
            v-model.number="editingPage.defaultPageSize"
            :placeholder="$lt('例如：12')"
          />
        </div>
        <h4 class="section-title">{{ $lt('接受的资源') }}</h4>
        <p class="field-hint">{{ $lt('只按文件本身来分，比如可执行文件、图片、视频。和这个页面有没有发行商、标签无关。改这里不会改动已经保存的内容。至少留一种。同一种文件会按下面从左到右的顺序归类。') }}</p>
        <div class="check-grid">
          <label v-for="kind in basicResourceKinds" :key="kind.id" class="check-item">
            <input type="checkbox" :checked="editingPage.acceptedKinds.includes(kind.id)" @change="toggleAcceptedKind(kind.id, $event)" />
            <span>{{ kind.label }}</span>
          </label>
        </div>
        <div class="add-type-row">
          <button class="btn-secondary" type="button" @click="selectAllAcceptedKinds">{{ $lt('全选') }}</button>
        </div>

        <h4 class="section-title">{{ $lt('官方字段') }}</h4>
        <p class="field-hint">{{ $lt('引擎检测、选封面、选文件这类组件。勾选后出现在这一页的编辑框里。取消勾选不会删掉已经保存的内容。') }}</p>
        <div class="check-grid">
          <label v-for="field in officialFields" :key="field.key" class="check-item">
            <input type="checkbox" :checked="isOfficialEnabled(field.key)" @change="toggleOfficialField(field.key)" />
            <span>{{ field.label }}</span>
          </label>
        </div>

        <h4 class="section-title">{{ $lt('自定义字段') }}</h4>
        <p class="field-hint">{{ $lt('可以自己增加、改名字和类型，也可以删掉。删掉只是这一页不再显示，资源里已经写下的内容还留着。') }}</p>
        <div class="type-list">
          <div v-for="(field, index) in customFieldDefs" :key="field.key" class="field-row">
            <fun-input
              type="text"
              v-model="field.label"
              :placeholder="$lt('字段名称')"
            />
            <select v-model="field.editor" class="type-select">
              <option v-for="editor in simpleFieldEditors" :key="editor.id" :value="editor.id">{{ $lt(editor.label) }}</option>
            </select>
            <button class="btn-icon" type="button" :title="$lt('上移')" :disabled="index === 0" @click="moveCustomField(index, -1)">↑</button>
            <button class="btn-icon" type="button" :title="$lt('下移')" :disabled="index === customFieldDefs.length - 1" @click="moveCustomField(index, 1)">↓</button>
            <button class="btn-icon delete" type="button" :title="$lt('从这一页拿掉')" @click="removeCustomField(index)">✕</button>
          </div>
        </div>
        <div class="add-type-row">
          <select v-model="knownFieldToAdd" class="type-select">
            <option value="">{{ $lt('选择已有字段') }}</option>
            <option v-for="field in knownFieldsToAdd" :key="field.key" :value="field.key">{{ field.label }}</option>
          </select>
          <button class="btn-secondary" type="button" :disabled="!knownFieldToAdd" @click="addKnownField">{{ $lt('添加已有字段') }}</button>
        </div>
        <div class="add-type-row">
          <fun-input
            type="text"
            v-model="newFieldLabel"
            :placeholder="$lt('新字段的名称，例如声优')"
          />
          <select v-model="newFieldEditor" class="type-select">
            <option v-for="editor in simpleFieldEditors" :key="editor.id" :value="editor.id">{{ $lt(editor.label) }}</option>
          </select>
          <button class="btn-secondary" type="button" @click="addCustomField">{{ $lt('添加新字段') }}</button>
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
        <p class="field-hint">{{ $lt('从这一页的字段，以及添加时间、使用时长这些记录上本来就有的项里选。每种排序都会同时有升序和降序。') }}</p>
        <div class="sort-options-list">
          <div
            v-for="(sortChoice, index) in editingPage.sortChoices"
            :key="sortChoice.field"
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
                  v-model="sortChoice.label"
                  :placeholder="$lt('例如：按名称排序')"
                />
              </div>
              <div class="form-group">
                <label>{{ $lt('排序字段') }}</label>
                <select class="type-select" :value="sortChoice.field" @change="changeSortField(sortChoice, $event)">
                  <option v-for="option in sortFieldOptionsFor(sortChoice.field)" :key="option.field" :value="option.field">{{ option.label }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <button class="btn-secondary add-sort-btn" type="button" :disabled="!canAddSort" @click="addSortOption"> {{ $lt('➕ 添加排序选项') }} </button>
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
import { BASIC_RESOURCE_KINDS, collectFieldCatalog, defaultAcceptedKindIds, defaultFieldKeys, makeFieldFilter, type PageFieldOption } from '../configs/resources/resourceKindCatalog'
import { BUILTIN_SORT_FIELDS, SIMPLE_PAGE_FIELD_EDITORS, collapseSortOptions, createCustomFieldKey, defsForPage, expandSortOptions, isSimpleEditor, type PageFieldDef, type PageFieldEditor, type SortChoice } from '../configs/pages/pageFieldSchema'
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

interface EditingPage {
  name: string
  icon: string
  description: string
  /** 页面接受的基本资源类型 */
  acceptedKinds: string[]
  /** 这个页面编辑时显示的字段，顺序和定义都由页面自己保存 */
  pageFieldDefs: PageFieldDef[]
  /** 每种排序一条。保存时再展开成升序和降序 */
  sortChoices: SortChoice[]
  /** 侧边栏筛选器 */
  filterConfig: any[]
  defaultPageSize: number
  displayLayoutConfig: DisplayLayoutConfig
  emptyStateConfig: EmptyStateConfig
  dialogConfig: DialogConfig
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
      pageFieldDefs: [],
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
      sortChoices: []
    })

    const originalConfig = ref<any>(null)
    const currentFileName = ref<string>('')
    /** 准备添加的筛选器 */
    const filterToAdd = ref('')
    /** 准备加进这一页的已有字段 */
    const knownFieldToAdd = ref('')
    /** 新建字段时用户填的名字 */
    const newFieldLabel = ref('')
    /** 新建字段的编辑框种类 */
    const newFieldEditor = ref<PageFieldEditor>('text')
    /** 新建字段可以选的普通编辑框 */
    const simpleFieldEditors = SIMPLE_PAGE_FIELD_EDITORS
    /** 全部可勾选字段 */
    const fieldCatalog = collectFieldCatalog()
    /** 页面可以接受的全部基本资源类型，勾选框按这个顺序排 */
    const basicResourceKinds = BASIC_RESOURCE_KINDS
    /** 还没放进这个页面的筛选器 */
    const filterPresetsToAdd = computed(() => {
      const used = new Set(editingPage.value.filterConfig.map((item: any) => item.key))
      const presets = [
        { id: 'missing-resources', title: '丢失的资源' },
        { id: 'rating', title: '星级' },
        { id: 'running-status', title: '正在使用' }
      ]
      const fieldPresets = editingPage.value.pageFieldDefs
        .map(def => filterOptionForDef(def))
        .filter((field): field is PageFieldOption => !!field && field.filterable)
        .map(field => ({ id: `field:${field.key}`, title: `${field.label}筛选` }))
      return [...presets, ...fieldPresets].filter(preset => !used.has(preset.id.startsWith('field:') ? preset.id.slice(6) : preset.id))
    })

    /**
     * 按勾选框的从左到右顺序重排已接受的类型。
     * 扩展名重叠时，靠前的类型会先匹配到文件。
     */
    const sortAcceptedKinds = () => {
      const selected = new Set(editingPage.value.acceptedKinds)
      editingPage.value.acceptedKinds = basicResourceKinds
        .filter(kind => selected.has(kind.id))
        .map(kind => kind.id)
    }

    /**
     * 勾选或取消一种资源。
     * 页面至少要接受一种，所以最后一项不能取消。
     */
    const toggleAcceptedKind = async (kindId: string, event: Event) => {
      const input = event.target as HTMLInputElement
      const kinds = editingPage.value.acceptedKinds
      const index = kinds.indexOf(kindId)
      if (index >= 0) {
        if (kinds.length <= 1) {
          input.checked = true
          await alertService.warning('页面至少要接受一种资源', '提示')
          return
        }
        kinds.splice(index, 1)
      } else {
        kinds.push(kindId)
      }
      sortAcceptedKinds()
    }

    /** 接受全部基本资源类型。 */
    const selectAllAcceptedKinds = () => {
      editingPage.value.acceptedKinds = basicResourceKinds.map(kind => kind.id)
    }

    /**
     * 这一页的字段能不能进侧边栏。
     * 已有字段沿用目录里的筛选能力。页面新加的文本、标签和日期也可以筛选。
     * @param def 页面字段定义
     */
    const filterOptionForDef = (def: PageFieldDef): PageFieldOption | null => {
      const known = fieldCatalog.find(item => item.key === def.key)
      if (known && !isSimpleEditor(def.editor)) {
        return known.filterable ? { ...known, label: def.label } : null
      }
      if (def.editor !== 'text' && def.editor !== 'tags' && def.editor !== 'date') return null
      return {
        key: def.key,
        label: def.label,
        filterable: true,
        isArray: def.editor === 'tags',
        dateFilter: def.editor === 'date',
        editor: def.editor
      }
    }

    /** 引擎、封面、文件选择这类官方组件。用勾选，不放进可删改的自定义列表。 */
    const officialFields = computed(() => fieldCatalog.filter(field => !isSimpleEditor(field.editor)))

    /** 这一页可以改名、改类型、删除的字段。 */
    const customFieldDefs = computed(() => editingPage.value.pageFieldDefs.filter(def => isSimpleEditor(def.editor)))

    /** 还没放进这一页的普通字段。官方组件走上面的勾选，不出现在这里。 */
    const knownFieldsToAdd = computed(() => {
      const used = new Set(editingPage.value.pageFieldDefs.map(def => def.key))
      return fieldCatalog.filter(field => isSimpleEditor(field.editor) && !used.has(field.key))
    })

    /** 这个官方组件是否已经出现在这一页。 */
    const isOfficialEnabled = (key: string) => editingPage.value.pageFieldDefs.some(def => def.key === key)

    /**
     * 勾选或取消一个官方组件。
     * 取消只是这一页不再显示，记录里的值还在。
     * @param key 字段键
     */
    const toggleOfficialField = (key: string) => {
      const defs = editingPage.value.pageFieldDefs
      const index = defs.findIndex(def => def.key === key)
      if (index >= 0) {
        defs.splice(index, 1)
        return
      }
      const field = fieldCatalog.find(item => item.key === key)
      if (!field) return
      defs.push({ key: field.key, label: field.label, editor: field.editor })
    }

    /**
     * 调整自定义字段的先后。官方组件留在原来的位置。
     * @param index 自定义列表里的位置
     * @param delta 往上是 -1，往下是 1
     */
    const moveCustomField = (index: number, delta: number) => {
      const custom = editingPage.value.pageFieldDefs.filter(def => isSimpleEditor(def.editor))
      const next = index + delta
      if (next < 0 || next >= custom.length) return
      const defs = editingPage.value.pageFieldDefs
      const from = defs.indexOf(custom[index])
      const to = defs.indexOf(custom[next])
      if (from < 0 || to < 0) return
      const current = defs[from]
      defs[from] = defs[to]
      defs[to] = current
    }

    /**
     * 从这一页拿掉一个自定义字段。
     * 只改页面配置，资源记录上的值还在。
     * @param index 自定义列表里的位置
     */
    const removeCustomField = (index: number) => {
      const custom = editingPage.value.pageFieldDefs.filter(def => isSimpleEditor(def.editor))
      const target = custom[index]
      const at = editingPage.value.pageFieldDefs.indexOf(target)
      if (at >= 0) editingPage.value.pageFieldDefs.splice(at, 1)
    }

    /** 把资源类上已经有的字段加到这一页。键沿用原来的，已经写过的值才能对上。 */
    const addKnownField = () => {
      const field = fieldCatalog.find(item => item.key === knownFieldToAdd.value)
      if (!field) return
      if (editingPage.value.pageFieldDefs.some(def => def.key === field.key)) return
      editingPage.value.pageFieldDefs.push({ key: field.key, label: field.label, editor: field.editor })
      knownFieldToAdd.value = ''
    }

    /**
     * 排序选项上的短名字。
     * 已经写成「按添加时间排序」的，下拉里只留「添加时间」，避免再套一层「按」。
     * @param label 显示名
     * @param field 对不上名字时用的键
     */
    const shortSortName = (label: string, field: string) => {
      const text = String(label || '').replace(/^按/, '').replace(/排序/g, '').trim()
      return text || field
    }

    /**
     * 排序下拉里能选的字段。
     * 这一页的字段用页面上的名字。添加时间这类记录字段用固定名字。当前这条如果选的是旧键，也留在列表里。
     * @param currentField 这一条正在用的字段，即使别的条目没用它，也要出现在自己的下拉里
     */
    const sortFieldOptionsFor = (currentField: string) => {
      const pageOptions = editingPage.value.pageFieldDefs.map(def => ({ field: def.key, label: def.label || def.key }))
      const known = new Set(pageOptions.map(item => item.field))
      const builtins = BUILTIN_SORT_FIELDS.filter(item => !known.has(item.field))
      const extras = editingPage.value.sortChoices
        .filter(item => item.field && !known.has(item.field) && !builtins.some(builtin => builtin.field === item.field))
        .map(item => ({ field: item.field, label: shortSortName(item.label, item.field) }))
      const used = new Set(editingPage.value.sortChoices.map(item => item.field))
      return [...pageOptions, ...builtins, ...extras].filter(item => item.field === currentField || !used.has(item.field))
    }

    /** 还有没有没被占用的字段，可以再加一种排序。 */
    const canAddSort = computed(() => sortFieldOptionsFor('').length > 0)

    /**
     * 换排序字段时，显示名跟着字段名走。
     * @param choice 正在编辑的那一条排序
     * @param event 下拉框的 change 事件
     */
    const changeSortField = (choice: SortChoice, event: Event) => {
      const field = (event.target as HTMLSelectElement).value
      const option = sortFieldOptionsFor(choice.field).find(item => item.field === field)
      choice.field = field
      if (option) choice.label = `按${option.label}排序`
    }

    /** 给这一页新建一个字段。键是新的，不会覆盖别的页已经用过的键。 */
    const addCustomField = async () => {
      const label = newFieldLabel.value.trim()
      if (!label) {
        await alertService.warning('请先填写字段名称', '提示')
        return
      }
      editingPage.value.pageFieldDefs.push({
        key: createCustomFieldKey(),
        label,
        editor: newFieldEditor.value
      })
      newFieldLabel.value = ''
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
        const def = editingPage.value.pageFieldDefs.find(item => item.key === presetId.slice(6))
        const field = def ? filterOptionForDef(def) : null
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
            pageFieldDefs: defsForPage(
              Array.isArray(config.pageFields) ? [...config.pageFields] : defaultFieldKeys(legacyTypes),
              config.pageFieldDefs,
              fieldCatalog
            ),
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
            sortChoices: collapseSortOptions(config.sortOptions || [])
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
          pageFields: editingPage.value.pageFieldDefs.map(def => def.key),
          pageFieldDefs: editingPage.value.pageFieldDefs.map(def => ({
            key: def.key,
            label: def.label.trim() || def.key,
            editor: def.editor
          })),
          filterConfig: editingPage.value.filterConfig,
          defaultPageSize: editingPage.value.defaultPageSize,
          displayLayoutConfig: editingPage.value.displayLayoutConfig,
          emptyStateConfig: editingPage.value.emptyStateConfig,
          dialogConfig: {
            ...originalConfig.value.dialogConfig,
            ...editingPage.value.dialogConfig
          },
          sortOptions: expandSortOptions(editingPage.value.sortChoices)
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

    /** 加一种排序。字段从还没占用的项里取第一项，方向保存时自动补上升序和降序。 */
    const addSortOption = () => {
      const next = sortFieldOptionsFor('').find(item => item.field)
      if (!next) return
      editingPage.value.sortChoices.push({
        field: next.field,
        label: `按${next.label}排序`
      })
    }

    /**
     * 删掉一种排序。升序和降序会一起去掉。
     * @param index 列表位置
     */
    const removeSortOption = (index: number) => {
      editingPage.value.sortChoices.splice(index, 1)
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
      filterToAdd,
      fieldCatalog,
      basicResourceKinds,
      filterPresetsToAdd,
      toggleAcceptedKind,
      selectAllAcceptedKinds,
      newFieldLabel,
      newFieldEditor,
      simpleFieldEditors,
      officialFields,
      customFieldDefs,
      knownFieldsToAdd,
      isOfficialEnabled,
      toggleOfficialField,
      moveCustomField,
      removeCustomField,
      sortFieldOptionsFor,
      canAddSort,
      changeSortField,
      addKnownField,
      addCustomField,
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
  color: var(--text-on-accent, #1a1a1a);
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

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
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
  align-items: center;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-row :deep(.fun-input),
.field-row > :first-child {
  flex: 1;
  min-width: 0;
}

.field-editor-label {
  flex: 0 0 72px;
  color: var(--text-secondary);
  font-size: 0.85rem;
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
  color: var(--text-on-accent, #1a1a1a);
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
