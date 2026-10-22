<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ getTitle() }}</h3>
        <button class="btn-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <!-- 调试信息：如果 resourceClass 不可用，显示警告 -->
        <div v-if="mode === 'add' && typeChoices.length > 1" class="form-field-wrapper">
          <label class="form-label">{{ $lt('这种文件是') }}</label>
          <select class="type-choice" :value="selectedType" @change="onTypeChoiceChange">
            <option v-for="choice in typeChoices" :key="choice.id" :value="choice.id">{{ $lt(choice.label) }}</option>
          </select>
        </div>
        <div v-if="!resourceClass || typeof resourceClass !== 'function'" class="form-error-message">
          <p>{{ $lt('⚠️ 资源类未正确加载，请检查 resourceClass prop 是否正确传递') }}</p>
          <p>resourceClass: {{ resourceClass }}</p>
        </div>
        <!-- 根据资源类自动生成表单字段 -->
        <div 
          v-for="(field, key) in formFields" 
          :key="key" 
          class="form-field-wrapper"
        >
          <label :for="key" class="form-label">
            {{ getFieldLabel(key, field) }}
          </label>
          
          <!-- 文本字段 -->
          <fun-input
            v-if="field instanceof FormField_Text"
            :id="key"
            v-model="formData[key]"
            type="text"
            :placeholder="getFieldPlaceholder(key, field)"
          />
          
          <!-- 文本域字段 -->
          <fun-textarea
            v-else-if="field instanceof FormField_Textarea"
            :id="key"
            v-model="formData[key]"
            :placeholder="getFieldPlaceholder(key, field)"
            :rows="3"
          />
          
          <!-- 数字字段 -->
          <fun-input
            v-else-if="field instanceof FormField_Number"
            :id="key"
            v-model.number="formData[key]"
            type="number"
            :placeholder="getFieldPlaceholder(key, field)"
          />

          <!-- 日期字段。发行日期用系统日期选择，存成 YYYY-MM-DD，和侧栏筛选项一致 -->
          <fun-input
            v-else-if="field instanceof FormField_Date"
            :id="key"
            v-model="formData[key]"
            type="date"
          />
          
          <!-- 选择字段（引擎类型，自带检测引擎按钮） -->
          <template v-else-if="field instanceof FormField_SelectEngine">
            <fun-select-slot
              :id="key"
              v-model="formData[key]"
              :placeholder="getFieldPlaceholder(key, field)"
            >
              <fun-option
                v-for="option in getSelectOptions(key, field)"
                :key="option.value"
                :value="option.value"
                :label="option.label"
              >
                <div>
                  <img :src="getOptionIcon(option.icon)" alt="icon" style="width: 16px; height: 16px">&nbsp;
                  <span>{{option.label}}</span>
                </div>
              </fun-option>
            </fun-select-slot>
            <div class="engine-auto-detect">
              <button 
                type="button" 
                class="btn-auto-detect" 
                @click="handleAutoDetectEngine"
                :disabled="!getExecutablePathValue() || !isElectronEnvironment"
                :title="!getExecutablePathValue() ? '请先选择游戏文件' : (isElectronEnvironment ? '根据游戏路径自动识别引擎' : '仅 Electron 环境支持')"
              >
                <span class="btn-icon">🔍</span> {{ $lt('检测引擎') }} </button>
            </div>
          </template>
          







          <!-- 普通选择字段 -->
          <fun-select
            v-else-if="field instanceof FormField_Select"
            :id="key"
            v-model="formData[key]"
            :options="getSelectOptions(key, field)"
            :placeholder="getFieldPlaceholder(key, field)"
          />
          
          <!-- 标签字段 -->
          <fun-tag-input
            v-else-if="field instanceof FormField_Tags"
            :id="key"
            :ref="(el: any) => setTagInputRef(key, el)"
            v-model="formData[key]"
            :placeholder="getFieldPlaceholder(key, field)"
            :allowDuplicate="false"
          />
          
          <!-- 复选框字段 -->
          <label v-else-if="field instanceof FormField_Checkbox" class="checkbox-label">
            <input 
              type="checkbox" 
              :id="key"
              v-model="formData[key]"
            />
            <span class="checkbox-text">{{ $lt(field.fieldName) }}</span>
          </label>
          
          <!-- 单图片文件选择（仅预览 +「选择图片」） -->
          <template v-else-if="field instanceof FormField_SelectSingleImageFile">
            <div class="cover-selection-container">
              <div class="cover-preview" v-if="formData[key]">
                <img :src="getImageUrl(formData[key])" :alt="'图片预览'" @error="handleImageError">
                <div class="cover-preview-info">
                  <span class="cover-filename">{{ getImageFileName(formData[key]) }}</span>
                </div>
              </div>
              <div class="cover-actions">
                <button type="button" class="btn-cover-action" @click="() => handleBrowseFile(key, field)">
                  <span class="btn-icon">📁</span> {{ $lt('选择图片') }} </button>
              </div>
            </div>
          </template>
          
          <!-- 文件选择字段（封面类型，需要特殊处理） -->
          <template v-else-if="isCoverField(field)">
            <div class="cover-selection-container">
              <div class="cover-preview" v-if="formData[key]">
                <img :src="getImageUrl(formData[key])" :alt="'封面预览'" @error="handleImageError">
                <div class="cover-preview-info">
                  <span class="cover-filename">{{ getImageFileName(formData[key]) }}</span>
                </div>
              </div>
              <div class="cover-actions">
                <!-- 游戏封面：使用截图作为封面 -->
                <button 
                  v-if="field instanceof FormField_SelectGameCover && enableScreenshotCover"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleUseScreenshotAsCover(key)"
                  :disabled="isEditMode ? false : !getExecutablePathValue()"
                >
                  <span class="btn-icon">📸</span> {{ $lt('使用截图作为封面') }} </button>
                <!-- 游戏封面：选择第一张封面（自带） -->
                <button 
                  v-if="field instanceof FormField_SelectGameCover"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleUseFirstImageAsGameCover(key)"
                  :disabled="!canGetGameScreenshotFolderPath"
                  :title="$lt('使用该游戏截图文件夹内第一张图片作为封面')"
                >
                  <span class="btn-icon">🖼️</span> {{ $lt('选择第一张封面') }} </button>
                <!-- 游戏和软件：用程序自带图标当封面 -->
                <button
                  v-if="field instanceof FormField_SelectGameCover"
                  type="button"
                  class="btn-cover-action"
                  @click="() => handleUseAppIconAsCover(key)"
                  :disabled="!canUseAppIconCover || appIconCoverLoading"
                  :title="$lt('读取这个程序自带的图标，设为封面')"
                >
                  <span class="btn-icon">🧩</span> {{ $lt(appIconCoverLoading ? '正在读取图标' : '使用应用图标作为封面') }} </button>
                <!-- 漫画封面：使用第一张图片（自带） -->
                <button 
                  v-if="field instanceof FormField_SelectMangaCover"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleUseFirstImageAsCover(key)"
                  :disabled="!getFolderPathValue()"
                  :title="$lt('使用漫画文件夹内第一张图片作为封面')"
                >
                  <span class="btn-icon">🖼️</span> {{ $lt('使用第一张图片') }} </button>
                <!-- 漫画封面：从文件夹选择（自带） -->
                <button 
                  v-if="field instanceof FormField_SelectMangaCover"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleSelectFromFolder(key)"
                  :disabled="!getFolderPathValue()"
                  :title="$lt('从文件夹中挑选一张图片作为封面')"
                >
                  <span class="btn-icon">📂</span> {{ $lt('从文件夹选择') }} </button>
                <!-- 视频缩略图：随机封面 -->
                <button 
                  v-if="field instanceof FormField_SelectVideoThumbnail && enableRandomizeThumbnail"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleRandomizeThumbnail(key)"
                  :disabled="!getFilePathValue()"
                >
                  <span class="btn-icon">🎲</span> {{ $lt('随机封面') }} </button>
                <!-- 视频缩略图：从封面文件夹选择（用于文件夹） -->
                <button 
                  v-if="field instanceof FormField_SelectVideoThumbnail && enableSelectFromFolderCovers"
                  type="button" 
                  class="btn-cover-action" 
                  @click="() => handleSelectFromFolderCovers(key)"
                  :disabled="!getFolderPathValue()"
                >
                  <span class="btn-icon">📂</span> {{ $lt('从封面文件夹选择') }} </button>
                <button type="button" class="btn-cover-action" @click="() => handleBrowseImage(key)">
                  <span class="btn-icon">📁</span> {{ $lt('选择自定义封面') }} </button>
                <button 
                  type="button" 
                  class="btn-cover-action btn-clear" 
                  @click="() => handleClearCover(key)"
                  :disabled="!formData[key]"
                  :title="formData[key] ? '清除当前封面' : '当前无封面'"
                >
                  <span class="btn-icon">🗑️</span> {{ $lt('清除封面') }} </button>
              </div>
            </div>
          </template>
          
          <!-- 文件夹选择字段 -->
          <div v-else-if="field instanceof FormField_SelectFolder" class="file-input-group">
            <fun-input
              :id="key"
              type="text"
              v-model="formData[key]"
              :placeholder="getFieldPlaceholder(key, field)"
              :readonly="true"
            />
            <button 
              type="button" 
              class="btn-browse" 
              @click="() => handleBrowseFolder(key, field)"
              :disabled="!isElectronEnvironment"
            > {{ $lt('浏览') }} </button>
          </div>
          
          <!-- 文件选择字段（普通文件） -->
          <div v-else-if="field instanceof FormField_SelectFile && !isCoverField(field)" class="file-input-group">
            <fun-input
              :id="key"
              type="text"
              v-model="formData[key]"
              :placeholder="getFieldPlaceholder(key, field)"
              :readonly="true"
            />
            <button 
              type="button" 
              class="btn-browse" 
              @click="() => handleBrowseFile(key, field)"
              :disabled="!isElectronEnvironment"
            > {{ $lt('浏览') }} </button>
            <!-- 图片预览 -->
            <div v-if="isImageFile(formData[key]) && formData[key]" class="image-preview">
              <img :src="getImageUrl(formData[key])" :alt="$lt(field.fieldName)" @error="handleImageError" />
            </div>
          </div>
        </div>
        
        <!-- 自定义插槽，用于添加额外的表单字段 -->
        <slot name="extra-fields" :formData="formData" :isEditMode="isEditMode"></slot>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">{{ $lt('取消') }}</button>
        <button class="btn-confirm" @click="() => { console.log('[ResourcesEditDialog] 确认按钮被点击，canConfirm:', canConfirm); handleConfirm() }" :disabled="!canConfirm">
          {{ getConfirmButtonText() }}
        </button>
      </div>
      </div>
      <!-- Tag 选择面板：支持多个 FormField_Tags，每个区块对应一个字段 -->
      <TagSelectionPanel
        :visible="visible"
        :tag-fields="tagFieldsForPanel"
        :available-tags="availableTags"
        @select-tag="handleSelectTag"
      />
    </div>
  </div>
</template>

<script lang="ts">
// setup 里用 computed 抽表单字段，watch 里用 nextTick 等 props 到位。
// 这两个 API 必须从 vue 显式导入，漏导入会让对话框 setup 直接抛错，路由视图随后更新时读到空节点。
import { computed, nextTick } from 'vue'
import { lf, lt } from '../locales/lt'
import TagSelectionPanel from './TagSelectionPanel.vue'
import saveManager from '../utils/SaveManager.ts'
import coverManager from '../utils/CoverManager.ts'
import notify from '../utils/NotificationService.ts'
import alertService from '../utils/AlertService.ts'
import {detectGameEngine} from '../utils/GameEngineDetector.ts'
import {
  FormField as FormFieldType,
  FormField_Checkbox,
  FormField_Number,
  FormField_Select,
  FormField_SelectEngine,
  FormField_SelectFile,
  FormField_SelectFolder,
  FormField_SelectGameCover,
  FormField_SelectMangaCover,
  FormField_SelectSingleImageFile,
  FormField_SelectVideoThumbnail,
  FormField_Tags,
  FormField_Text,
  FormField_Textarea,
  FormField_Date
} from '@resources/base/FormField.ts'
import {ResourceField} from '@resources/base/ResourceField.ts'
import {BaseResources} from '@resources/base/ResourcesDataBase.ts'
import { resolvePageEditType } from '@resources/resourceKindCatalog.ts'
import { defaultValueForEditor, type PageFieldDef } from '../configs/pages/pageFieldSchema.ts'
import {FunInput, FunSelect, FunTagInput, FunTextarea} from "../fun-ui";
import FunOption from "../fun-ui/data-input/Select/FunOption.vue";
import FunSelectSlot from "../fun-ui/data-input/Select/FunSelectSlot.vue";

export default {
  name: 'ResourcesEditDialog',
  components: {
    FunSelectSlot,
    FunOption,
    FunTagInput,
    FunTextarea,
    FunInput,
    FunSelect,
    TagSelectionPanel
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String as () => 'add' | 'edit',
      default: 'add',
      validator: (value: string) => ['add', 'edit'].includes(value)
    },
    // 资源类构造函数（在 JavaScript/TypeScript 中，类构造函数是 Function 类型）
    resourceClass: {
      type: Function,
      required: true
    } as any,
    /** 页面接受的资源种类。多于一种时，添加窗口让用户选 */
    typeChoices: {
      type: Array,
      default: () => []
    },
    /** 当前选中的基本资源类型 */
    selectedType: {
      type: String,
      default: ''
    },
    /** 页面勾选的字段。不传则显示资源类上的全部编辑字段 */
    enabledFieldKeys: {
      type: Array as PropType<string[] | null>,
      default: null
    },
    /**
     * 这一页自己的字段定义。
     * 资源类上没有的字段也要能编辑，名字和编辑框以页面为准。
     */
    pageFieldDefs: {
      type: Array as PropType<PageFieldDef[]>,
      default: () => []
    },
    // 资源数据（编辑模式）
    resourceData: {
      type: Object,
      default: null
    },
    // 标题配置
    title: {
      type: String,
      default: ''
    },
    addTitle: {
      type: String,
      default: ''
    },
    editTitle: {
      type: String,
      default: ''
    },
    // 确认按钮文本配置
    confirmButtonText: {
      type: String,
      default: ''
    },
    addButtonText: {
      type: String,
      default: '添加'
    },
    editButtonText: {
      type: String,
      default: '保存修改'
    },
    // 功能开关
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    enableEngineAutoDetect: {
      type: Boolean,
      default: false
    },
    enableScreenshotCover: {
      type: Boolean,
      default: false
    },
    enableFirstImageCover: {
      type: Boolean,
      default: false
    },
    enableSelectFromFolder: {
      type: Boolean,
      default: false
    },
    enableSelectFromFolderCovers: {
      type: Boolean,
      default: false
    },
    enableRandomizeThumbnail: {
      type: Boolean,
      default: false
    },
    availableTags: {
      type: Array as PropType<(string | { name: string; count?: number })[]>,
      default: () => []
    },
    /** 按字段 key 的候选列表（如 developers / tags），未命中时用 availableTags */
    availableTagsByField: {
      type: Object as PropType<Record<string, (string | { name: string; count?: number })[]>>,
      default: () => ({})
    },
    // 自定义验证函数
    customValidation: {
      type: Function as PropType<(formData: Record<string, any>, isEditMode: boolean) => boolean>,
      default: null
    },
    // 自定义确认处理函数（返回 false 可以阻止默认行为）
    customConfirmHandler: {
      type: Function as PropType<(formData: Record<string, any>, isEditMode: boolean) => Promise<boolean | void>>,
      default: null
    }
  },
  emits: ['close', 'confirm', 'use-first-image-cover', 'select-from-folder-cover', 'select-from-folder-covers', 'randomize-thumbnail', 'video-file-selected', 'change-type'],
  setup(props) {
    // 提取所有 FormField 类型的字段，保持类中定义的顺序
    // 支持两种形式：直接使用 FormField 或使用 ResourceField（从 editType 中提取）
    const formFields = computed(() => {
      // 检查 resourceClass 是否是有效的构造函数
      if (!props.resourceClass || typeof props.resourceClass !== 'function') {
        console.warn('[ResourcesEditDialog] resourceClass is not a constructor:', props.resourceClass)
        return {}
      }
      
      // 创建资源实例用于提取字段定义
      let resourceInstance: any
      try {
        resourceInstance = new props.resourceClass()
      } catch (error) {
        console.error('[ResourcesEditDialog] Failed to create resource instance:', error)
        return {}
      }
      
      const fields: Record<string, FormFieldType> = {}
      const pageKeys = Array.isArray(props.enabledFieldKeys) ? props.enabledFieldKeys : null
      const defs = Array.isArray(props.pageFieldDefs) ? props.pageFieldDefs : []
      // 页面规定了字段时，按页面的顺序画。类上没有的字段也要出现，否则音声页加的声优在游戏类上永远编辑不了。
      if (pageKeys) {
        for (const key of pageKeys) {
          const def = defs.find(item => item.key === key)
          const edit = resolvePageEditType(key, resourceInstance, def)
          if (edit) fields[key] = edit
        }
        return fields
      }
      // 遍历资源实例的所有属性，保持定义顺序
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        if (value instanceof ResourceField) {
          if (value.editType) fields[key] = value.editType
        } else if (value instanceof FormFieldType) {
          fields[key] = value
        }
      }
      return fields
    })
    
    return {
      formFields,
      FormField_Text,
      FormField_Textarea,
      FormField_Date,
      FormField_Number,
      FormField_Select,
      FormField_Tags,
      FormField_Checkbox,
      FormField_SelectEngine,
      FormField_SelectFile,
      FormField_SelectFolder,
      FormField_SelectGameCover,
      FormField_SelectMangaCover,
      FormField_SelectVideoThumbnail,
      FormField_SelectSingleImageFile
    }
  },
  data() {
    // 初始化表单数据的函数（根据字段类型自动生成）
    const initFormData = () => {
      // 检查 resourceClass 是否是有效的构造函数
      if (!this.resourceClass || typeof this.resourceClass !== 'function') {
        console.warn('[ResourcesEditDialog] resourceClass is not a constructor in initFormData:', this.resourceClass)
        return { id: '' }
      }
      
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) {
        return { id: '' }
      }
      
      const data: Record<string, any> = { id: '' }
      
      // 遍历资源实例的所有属性
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (field) {
          // 如果 ResourceField 有 defaultValue，优先使用它
          if (value instanceof ResourceField && value.defaultValue !== undefined) {
            data[key] = value.defaultValue
          } else {
            // 根据字段类型初始化默认值
            if (field instanceof FormField_Tags) {
              data[key] = []
            } else if (field instanceof FormField_Checkbox) {
              data[key] = false
            } else if (field instanceof FormField_Number) {
              data[key] = 0
            } else {
              data[key] = ''
            }
          }
        }
      }
      // 页面新加的字段不在资源类上，这里补上空值，编辑框才有地方写。
      const defs = Array.isArray(this.pageFieldDefs) ? this.pageFieldDefs : []
      for (const def of defs) {
        if (!def?.key || def.key in data) continue
        data[def.key] = defaultValueForEditor(def.editor)
      }
      return data
    }
    
    return {
      formData: initFormData(),
      initFormData,
      tagInputRefs: {} as Record<string, any>, // 存储标签输入框的 refs
      /**
       * 已经读成 data URL 的封面预览。
       * 键是表单里的原始路径。相对路径不能直接当图片地址，读完再写进来，预览才会刷新。
       */
      coverPreviewUrls: {} as Record<string, string>,
      /** 正在读取的封面路径，避免每次渲染都再读一遍文件。 */
      coverPreviewLoading: {} as Record<string, boolean>,
      /** 正在把程序图标写入封面字段。避免连点重复提取。 */
      appIconCoverLoading: false
    }
  },
  computed: {
    isEditMode() {
      return this.mode === 'edit'
    },
    canConfirm() {
      // 如果有自定义验证函数，使用自定义验证
      if (this.customValidation) {
        const result = this.customValidation(this.formData, this.isEditMode)
        console.log('[ResourcesEditDialog] canConfirm (customValidation):', result, 'formData:', this.formData)
        return result
      }
      
      // 默认验证：编辑模式只需要有ID即可，添加模式需要必填字段
      if (this.isEditMode) {
        return true
      }
      
      // 检查必填字段
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return false
      
      for (const key in this.formFields) {
        const field = this.formFields[key]
        if (field && field.required) {
          const formValue = this.formData[key]
          if (!formValue || (typeof formValue === 'string' && formValue.trim() === '') || 
              (Array.isArray(formValue) && formValue.length === 0)) {
            console.log('[ResourcesEditDialog] canConfirm (required field missing):', key, formValue)
            return false
          }
        }
      }
      return true
    },
    // 为 TagSelectionPanel 提供带当前值的标签字段列表（必须是 computed，否则子组件收到的是函数）
    tagFieldsForPanel(): { key: string; label: string; currentTags: string[]; availableTags: (string | { name: string; count?: number })[] }[] {
      return this.getTagsFields().map(({ key, label }) => ({
        key,
        label,
        currentTags: Array.isArray(this.formData[key]) ? this.formData[key] : [],
        availableTags: Array.isArray(this.availableTagsByField?.[key]) ? this.availableTagsByField[key] : (this.availableTags || [])
      }))
    },
    // 当前表单是否可解析出游戏截图文件夹路径（用于游戏封面两个按钮的 disabled）
    canGetGameScreenshotFolderPath(): boolean {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return false
      let hasGameCover = false
      let nameKey = ''
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        if (value instanceof ResourceField) field = value.editType
        else if (value instanceof FormFieldType) field = value
        if (field instanceof FormField_SelectGameCover) hasGameCover = true
        if (field instanceof FormField_Text && !nameKey) nameKey = key
      }
      if (!hasGameCover || !nameKey) return false
      const gameName = (this.formData[nameKey] || '').trim()
      const hasName = gameName !== ''
      const hasPath = this.getExecutablePathValue().trim() !== ''
      if (this.isEditMode) return hasName && !!this.formData.id
      return hasName || hasPath
    },
    /**
     * 当前选中的程序是 exe 或快捷方式时，才能用它的图标当封面。
     */
    canUseAppIconCover(): boolean {
      return /\.(exe|lnk)$/i.test(this.getExecutablePathValue().trim())
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        // 使用 nextTick 确保 props 已经更新
        nextTick(() => {
          // 确保 resourceClass 存在后再执行操作
          if (!this.resourceClass || typeof this.resourceClass !== 'function') {
            console.warn('[ResourcesEditDialog] visible changed but resourceClass is not available yet:', this.resourceClass)
            return
          }
          
          if (this.isEditMode && this.resourceData) {
            this.loadResourceData()
          } else {
            this.resetForm()
          }
        })
      }
    },
    resourceClass() {
      if (this.visible && !this.isEditMode) {
        this.$nextTick(() => this.resetForm())
      }
    },
    resourceData: {
      handler(newVal) {
        if (newVal && this.visible && this.isEditMode) {
          // 确保 resourceClass 存在后再执行操作
          if (!this.resourceClass || typeof this.resourceClass !== 'function') {
            console.warn('[ResourcesEditDialog] resourceData changed but resourceClass is not available yet')
            return
          }
          this.loadResourceData()
        }
      },
      immediate: true
    },
    resourceClass: {
      handler(newVal) {
        // 资源类变化时重新初始化表单
        if (newVal && typeof newVal === 'function') {
          this.formData = this.initFormData()
        } else {
          console.warn('[ResourcesEditDialog] resourceClass changed but is not a valid constructor:', newVal)
        }
      }
    }
  },
  methods: {
    /**
     * 添加时切换资源种类。字段会跟着新的资源类重画，已填内容不保留。
     */
    onTypeChoiceChange(event: Event) {
      const value = (event.target as HTMLSelectElement).value
      this.$emit('change-type', value)
    },
    // 安全地创建资源实例的辅助方法
    createResourceInstance() {
      if (!this.resourceClass || typeof this.resourceClass !== 'function') {
        console.warn('[ResourcesEditDialog] resourceClass is not a constructor:', this.resourceClass)
        return null
      }
      try {
        return new this.resourceClass()
      } catch (error) {
        console.error('[ResourcesEditDialog] Failed to create resource instance:', error)
        return null
      }
    },
    getTitle() {
      const config = (this.resourceClass as any)?.editDialogConfig
      if (this.isEditMode) {
        return lt(config?.editTitle || '编辑资源')
      }
      return lt(config?.addTitle || '添加资源')
    },
    getConfirmButtonText() {
      if (this.confirmButtonText) return lt(this.confirmButtonText)
      return lt(this.isEditMode ? this.editButtonText : this.addButtonText)
    },
    // 判断是否是封面字段
    isCoverField(field: FormFieldType): boolean {
      return field instanceof FormField_SelectGameCover || 
             field instanceof FormField_SelectMangaCover ||
             field instanceof FormField_SelectVideoThumbnail ||
             (field instanceof FormField_SelectFile && 
              'filters' in field && 
              Array.isArray(field.filters) &&
              field.filters.some((f: any) => 
                f.extensions && f.extensions.some((ext: string) => 
                  ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp'].includes(ext.toLowerCase())
                )
              ))
    },
    // 判断是否是可执行文件字段
    isExecutableFileField(field: FormFieldType): boolean {
      return field instanceof FormField_SelectFile && 
             'filters' in field && 
             Array.isArray(field.filters) &&
             field.filters.some((f: any) => 
               f.extensions && f.extensions.some((ext: string) => 
                 ['exe', 'dll', '*'].includes(ext.toLowerCase())
               )
             )
    },
    // 获取可执行文件路径的值（用于引擎自动识别等功能）
    getExecutablePathValue(): string {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return ''
      
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (field instanceof FormField_SelectFile && this.isExecutableFileField(field)) {
          return this.formData[key] || ''
        }
      }
      return ''
    },
    // 获取文件夹路径的值（用于漫画封面选择等功能）
    getFolderPathValue(): string {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return ''
      
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (field instanceof FormField_SelectFolder || 
            (field instanceof FormField_SelectFile && (key === 'folderPath' || key === 'resourcePath'))) {
          return this.formData[key] || ''
        }
      }
      return ''
    },
    // 获取文件路径的值（用于视频缩略图等功能）
    getFilePathValue(): string {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return ''
      
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (field instanceof FormField_SelectFile && (key === 'filePath' || key === 'resourcePath')) {
          return this.formData[key] || ''
        }
      }
      return ''
    },
    // 获取所有 FormField_Tags 字段（用于 TagSelectionPanel 多区块展示）
    getTagsFields(): { key: string; label: string }[] {
      const list: { key: string; label: string }[] = []
      const fields = this.formFields || {}
      for (const key in fields) {
        const field = fields[key]
        if (field instanceof FormField_Tags) {
          list.push({ key, label: lt(field.fieldName) })
        }
      }
      return list
    },
    // 获取字段标签（必填字段加 *，非必填字段不加标识）
    getFieldLabel(key: string, field: FormFieldType | null): string {
      if (!field) {
        return key
      }
      const fieldName = lt(field.fieldName)
      const isRequired = field.required === true
      
      return isRequired ? `${fieldName} *` : fieldName
    },
    // 获取字段占位符
    getFieldPlaceholder(key: string, field: FormFieldType): string {
      if (field instanceof FormField_Select) {
        return lf('请选择{name}', { name: lt(field.fieldName) })
      }
      if (field instanceof FormField_Textarea) {
        return lt('输入简介或描述...')
      }
      if (field instanceof FormField_SelectFile) {
        return lf('选择{name}', { name: lt(field.fieldName) })
      }
      if (field instanceof FormField_SelectFolder) {
        return lf('选择{name}', { name: lt(field.fieldName) })
      }
      return lf('请输入{name}', { name: lt(field.fieldName) })
    },
    // 获取选择字段的选项（用于 SELECT 类型）
    getSelectOptions(key: string, field: FormFieldType): Array<{ value: string; label: string; icon: string | null }> {
      if ('options' in field && Array.isArray((field as any).options)) {
        if ((field as any).options.every((element: any) => typeof element === 'string')) {
          return (field as any).options.map((option: string) => ({
            value: option,
            label: option
          }))
        } else if ((field as any).options.every((element: any) => typeof element === 'object')) {
          return (field as any).options.map((option: any) => ({
            value: option.name,
            label: option.name,
            icon: option.icon
          }))
        }
      }
      return []
    },
    getOptionIcon(icon: string) {
      // 使用public目录下的图标路径，确保打包后仍然有效
      const defaultIcon = './icon/engine/default.png';
      if (!icon) {
        return defaultIcon;
      }

      // todo: 检查文件是否存在
      return './icon/engine/' + icon;
    },
    resetForm() {
      // 确保 resourceClass 存在
      if (!this.resourceClass || typeof this.resourceClass !== 'function') {
        console.warn('[ResourcesEditDialog] Cannot reset form: resourceClass is not available')
        return
      }
      
      const initData = this.initFormData()
      initData.id = this.formData.id || ''
      this.formData = initData
    },
    loadResourceData() {
      if (!this.resourceData) return
      
      // 确保 resourceClass 存在
      if (!this.resourceClass || typeof this.resourceClass !== 'function') {
        console.warn('[ResourcesEditDialog] Cannot load resource data: resourceClass is not available')
        return
      }
      
      const initData = this.initFormData()
      
      // 确保 id 是字符串值，而不是 ResourceField 对象
      const resourceDataId = this.resourceData.id
      initData.id = resourceDataId instanceof ResourceField 
        ? resourceDataId.value 
        : (resourceDataId || '')
      
      console.log('[ResourcesEditDialog] loadResourceData 开始加载:', {
        resourceData: this.resourceData,
        resourceDataKeys: Object.keys(this.resourceData || {}),
        initDataKeys: Object.keys(initData)
      })
      
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return
      
      // 首先加载类中定义的字段
      for (const key in resourceInstance) {
        const value = (resourceInstance as any)[key]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (field) {
          let resourceValue = (this.resourceData as any)[key]
          
          // 如果 resourceValue 是 ResourceField 对象，提取其 value
          if (resourceValue instanceof ResourceField) {
            resourceValue = resourceValue.value
          }
          
          // 向后兼容：如果字段是 coverPath 但没有值，尝试从 image 字段读取（游戏封面字段迁移）
          if (key === 'coverPath' && (!resourceValue || resourceValue === '') && (this.resourceData as any).image) {
            const imageValue = (this.resourceData as any).image
            resourceValue = imageValue instanceof ResourceField ? imageValue.value : imageValue
          }
          
          if (resourceValue !== undefined && resourceValue !== null) {
            if (field instanceof FormField_Tags) {
              if (Array.isArray(resourceValue)) {
                initData[key] = [...resourceValue]
              } else if (typeof resourceValue === 'string' && resourceValue.trim() !== '') {
                // 兼容旧存档：标签字段（如游戏发行商）历史上可能存为单个字符串，包装为单元素数组
                initData[key] = [resourceValue]
              }
            } else if (field instanceof FormField_Checkbox && typeof resourceValue === 'boolean') {
              initData[key] = resourceValue
            } else if (field instanceof FormField_Number && (typeof resourceValue === 'number' || typeof resourceValue === 'string')) {
              initData[key] = typeof resourceValue === 'number' ? resourceValue : Number(resourceValue) || 0
            } else if (typeof resourceValue === 'string' || typeof resourceValue === 'number' || typeof resourceValue === 'boolean') {
              initData[key] = resourceValue
            }
          }
        }
      }
      
      // 页面字段可能不在当前资源类上。类的循环读不到时，从记录或 retainedFields 里补上。
      const defs = Array.isArray(this.pageFieldDefs) ? this.pageFieldDefs : []
      for (const def of defs) {
        if (!def?.key) continue
        let resourceValue = (this.resourceData as any)[def.key]
        if ((resourceValue === undefined || resourceValue === null) && (this.resourceData as any).retainedFields) {
          resourceValue = (this.resourceData as any).retainedFields[def.key]
        }
        if (resourceValue instanceof ResourceField) resourceValue = resourceValue.value
        if (resourceValue === undefined || resourceValue === null) continue
        const field = this.formFields?.[def.key]
        if (field instanceof FormField_Tags) {
          initData[def.key] = Array.isArray(resourceValue)
            ? [...resourceValue]
            : (typeof resourceValue === 'string' && resourceValue.trim() !== '' ? [resourceValue] : [])
        } else if (field instanceof FormField_Checkbox) {
          initData[def.key] = Boolean(resourceValue)
        } else if (field instanceof FormField_Number) {
          initData[def.key] = typeof resourceValue === 'number' ? resourceValue : Number(resourceValue) || 0
        } else if (typeof resourceValue === 'string' || typeof resourceValue === 'number' || typeof resourceValue === 'boolean' || Array.isArray(resourceValue)) {
          initData[def.key] = Array.isArray(resourceValue) ? [...resourceValue] : resourceValue
        }
      }

      // 然后保留其他不在类中定义但在 resourceData 中的字段（如 duration）
      // 这些字段不会显示在表单中，但会在确认时保留
      for (const key in this.resourceData) {
        if (key === 'retainedFields' || BaseResources.ephemeralFieldKeys.has(key)) continue
        if (!(key in initData) && key !== 'id' && key !== 'fileExists') {
          let value = (this.resourceData as any)[key]
          // 如果值是 ResourceField 对象，提取其 value
          if (value instanceof ResourceField) {
            value = value.value
          }
          initData[key] = value
        }
      }
      
      this.formData = initData
    },
    handleClose() {
      this.$emit('close')
    },
    handleOverlayMouseDown(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.handleClose()
      }
    },
    async handleBrowseFile(key: string, field: FormFieldType) {
      try {
        if (!(field instanceof FormField_SelectFile) && !(field instanceof FormField_SelectSingleImageFile)) return
        
        if (!this.isElectronEnvironment || !window.electronAPI) {
          await alertService.warning('当前环境不支持文件选择功能，请在 Electron 环境中使用')
          return
        }

        const electronAPI = window.electronAPI
        const filters = field.filters || []

        if (!electronAPI.selectFileWithExtensions) {
          await alertService.error('当前环境不支持根据扩展名选择文件功能')
          return
        }

        const filePath = await electronAPI.selectFileWithExtensions(filters, null, lf('选择{name}', { name: lt(field.fieldName) }))

        if (filePath) {
          if (filters && filters.length > 0) {
            const fileExt = this.getFileExtension(filePath).toLowerCase()
            const allAllowedExtensions: string[] = []
            let hasWildcard = false
            
            filters.forEach((filter: any) => {
              if (filter.extensions) {
                filter.extensions.forEach((ext: string) => {
                  const normalized = ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase()
                  if (normalized === '*' || normalized === '其他') {
                    hasWildcard = true
                  } else {
                    allAllowedExtensions.push(normalized)
                  }
                })
              }
            })
            
            if (!hasWildcard && !allAllowedExtensions.includes(fileExt)) {
              await alertService.warning(`文件扩展名 .${fileExt} 不在允许的列表中。允许的扩展名: ${allAllowedExtensions.map(e => `.${e}`).join(', ')}`)
              return
            }
          }

          this.formData[key] = filePath
          
          // 如果是可执行文件字段，自动提取名称（如果名称字段为空）
          if (this.isExecutableFileField(field)) {
            const resourceInstance = this.createResourceInstance()
            if (resourceInstance) {
              for (const nameKey in resourceInstance) {
                const value = (resourceInstance as any)[nameKey]
                let nameField: FormFieldType | null = null
                
                // 支持 ResourceField 和 FormField 两种形式
                if (value instanceof ResourceField) {
                  nameField = value.editType
                } else if (value instanceof FormFieldType) {
                  nameField = value
                }
                
                if (nameField instanceof FormField_Text && 
                    (this.formData[nameKey] || '').trim() === '') {
                  this.formData[nameKey] = this.extractGameNameFromPath(filePath)
                  break
                }
              }
            }
          }
          
          // 如果是图片文件字段（单图片模式），自动提取图片名称（如果名称字段为空）
          if (this.isImageFile(filePath) && (key === 'folderPath' || key === 'resourcePath')) {
            const resourceInstance = this.createResourceInstance()
            if (resourceInstance) {
              for (const nameKey in resourceInstance) {
                const value = (resourceInstance as any)[nameKey]
                let nameField: FormFieldType | null = null
                
                // 支持 ResourceField 和 FormField 两种形式
                if (value instanceof ResourceField) {
                  nameField = value.editType
                } else if (value instanceof FormFieldType) {
                  nameField = value
                }
                
                if (nameField instanceof FormField_Text && 
                    (this.formData[nameKey] || '').trim() === '') {
                  // 从文件名提取名称（不含扩展名）
                  const fileName = filePath.split(/[\\/]/).pop() || ''
                  this.formData[nameKey] = fileName.replace(/\.[^/.]+$/, '')
                  break
                }
              }
            }
          }
          
          // 如果是视频文件字段，触发事件让父组件处理（提取名称、获取时长、生成缩略图等）
          if ((key === 'filePath' || key === 'resourcePath') && this.isVideoFile(filePath)) {
            this.$emit('video-file-selected', key, filePath, this.formData)
          }
        }
      } catch (error: any) {
        console.error('选择文件失败:', error)
        await alertService.error(`选择文件失败: ${error.message || '未知错误'}`)
      }
    },
    async handleBrowseFolder(key: string, field: FormFieldType) {
      try {
        if (!(field instanceof FormField_SelectFolder)) return
        
        if (!this.isElectronEnvironment || !window.electronAPI) {
          await alertService.warning('当前环境不支持文件夹选择功能，请在 Electron 环境中使用')
          return
        }

        const electronAPI = window.electronAPI
        if (!electronAPI.selectFolder) {
          await alertService.error('当前环境不支持文件夹选择功能')
          return
        }

        const result = await electronAPI.selectFolder()

        if (result && result.success && result.path) {
          this.formData[key] = result.path
        } else if (result && !result.success) {
          await alertService.warning(result.error || '未选择文件夹')
        }
      } catch (error: any) {
        console.error('选择文件夹失败:', error)
        await alertService.error(`选择文件夹失败: ${error.message || '未知错误'}`)
      }
    },
    getFileExtension(filePath: string): string {
      const lastDot = filePath.lastIndexOf('.')
      if (lastDot === -1 || lastDot === filePath.length - 1) {
        return ''
      }
      return filePath.substring(lastDot + 1)
    },
    isImageFile(filePath: string): boolean {
      if (!filePath) return false
      const imageExtensions = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.bmp', '.webp', '.svg', 'jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'bmp', 'webp', 'svg']
      const fileExt = this.getFileExtension(filePath).toLowerCase()
      return imageExtensions.includes(fileExt) || imageExtensions.includes(`.${fileExt}`)
    },
    isVideoFile(filePath: string): boolean {
      if (!filePath) return false
      const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', 'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v']
      const fileExt = this.getFileExtension(filePath).toLowerCase()
      return videoExtensions.includes(fileExt) || videoExtensions.includes(`.${fileExt}`)
    },
    /**
     * 封面还没读出来时用的小占位图。
     * 用 data URL，这样不会去请求一个不存在的文件，也就不会误触发加载失败。
     * @returns {string}
     */
    coverPlaceholderSrc(): string {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTIwSDgwVjE2MEgxMjBWMTIwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNODAgMTIwTDEwMCAxMDBMMTIwIDEyMEwxMDAgMTQwTDgwIDEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
    },
    /**
     * 编辑框里的封面预览地址。
     * 电影封面常常是 videos/covers 这种相对路径。直接拼 file:// 会指到网页目录，图片加载失败就变成房子占位图。
     * 先把路径拼到存档目录，读成 data URL，再交给 img。
     * @param filePath 表单里的封面路径
     * @returns {string}
     */
    getImageUrl(filePath: string): string {
      if (!filePath || (typeof filePath === 'string' && filePath.trim() === '')) {
        return this.coverPlaceholderSrc()
      }
      if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:') || filePath.startsWith('blob:') || filePath.startsWith('archive:')) {
        return filePath
      }
      const cached = this.coverPreviewUrls[filePath]
      if (cached) return cached
      this.loadCoverPreview(filePath)
      return this.coverPlaceholderSrc()
    },
    /**
     * 把封面文件读进预览缓存。
     * 相对路径先交给封面管理器拼到存档目录。拼完仍读不到时，再试原始路径。
     * @param filePath 表单里的封面路径
     */
    loadCoverPreview(filePath: string) {
      if (!filePath || this.coverPreviewUrls[filePath] || this.coverPreviewLoading[filePath]) return
      this.coverPreviewLoading[filePath] = true
      this.resolveCoverPreview(filePath)
    },
    /**
     * 异步读取封面。读成功后写入缓存，预览图会跟着换成真正的封面。
     * @param filePath 表单里的封面路径
     */
    async resolveCoverPreview(filePath: string) {
      try {
        let fullPath = filePath
        const isRelative = !filePath.includes(':') && !filePath.startsWith('file://')
        if (isRelative) {
          fullPath = await coverManager.getCoverUrl(filePath)
        }
        let dataUrl = ''
        if (window.electronAPI?.readFileAsDataUrl) {
          dataUrl = await window.electronAPI.readFileAsDataUrl(fullPath) || ''
          if (!dataUrl && fullPath !== filePath) {
            dataUrl = await window.electronAPI.readFileAsDataUrl(filePath) || ''
          }
        }
        if (dataUrl) {
          this.coverPreviewUrls[filePath] = dataUrl
        }
      } catch (error) {
        console.warn('[ResourcesEditDialog] 读取封面预览失败:', filePath, error)
      } finally {
        this.coverPreviewLoading[filePath] = false
      }
    },
    extractGameNameFromPath(filePath: string) {
      const fileName = filePath.split(/[\\/]/).pop() || ''
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

      let cleanName = nameWithoutExt
        .replace(/\.exe$/i, '')
        .replace(/\.swf$/i, '')
        .replace(/\.bat$/i, '')
        .replace(/\.zip$/i, '')
        .replace(/\.rar$/i, '')
        .replace(/\.7z$/i, '')
        .replace(/\.tar$/i, '')
        .replace(/\.gz$/i, '')
        .replace(/\.bz2$/i, '')
        .replace(/\.xz$/i, '')
        .replace(/^game[-_\s]*/i, '')
        .replace(/[-_\s]+/g, ' ')
        .trim()

      if (!cleanName) {
        cleanName = nameWithoutExt
      }

      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    },
    async handleBrowseImage(key: string) {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return
      
      for (const fieldKey in resourceInstance) {
        const value = (resourceInstance as any)[fieldKey]
        let field: FormFieldType | null = null
        
        // 支持 ResourceField 和 FormField 两种形式
        if (value instanceof ResourceField) {
          field = value.editType
        } else if (value instanceof FormFieldType) {
          field = value
        }
        
        if (fieldKey === key && (field instanceof FormField_SelectFile || field instanceof FormField_SelectSingleImageFile || this.isCoverField(field))) {
          if (field instanceof FormField_SelectFile || field instanceof FormField_SelectSingleImageFile) {
            await this.handleBrowseFile(key, field)
          } else {
            // 封面字段使用图片文件选择
            const coverField = new FormField_SelectFile('封面', [
              { name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'bmp', 'svg'] }
            ])
            await this.handleBrowseFile(key, coverField)
          }
          break
        }
      }
    },
    async handleUseScreenshotAsCover(key: string) {
      try {
        const resourceInstance = this.createResourceInstance()
        if (!resourceInstance) return
        
        let nameKey = ''
        for (const fieldKey in resourceInstance) {
          const value = (resourceInstance as any)[fieldKey]
          let field: FormFieldType | null = null
          
          // 支持 ResourceField 和 FormField 两种形式
          if (value instanceof ResourceField) {
            field = value.editType
          } else if (value instanceof FormFieldType) {
            field = value
          }
          
          if (field instanceof FormField_Text) {
            nameKey = fieldKey
            break
          }
        }
        const resourceName = nameKey ? (this.formData[nameKey] || '').trim() : ''

        if (this.isEditMode) {
          if (!resourceName) {
            await alertService.warning('请先输入游戏名称', '提示')
            return
          }

          if (!this.formData.id) {
            await alertService.warning('游戏ID不存在，无法打开截图文件夹', '提示')
            return
          }

          const { getGameScreenshotFolderPath } = await import('../composables/game/useGameScreenshot')
          const gameScreenshotPath = await getGameScreenshotFolderPath(
            this.formData.id,
            resourceName,
            this.isElectronEnvironment
          )

          if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.ensureDirectory) {
            try {
              await window.electronAPI.ensureDirectory(gameScreenshotPath)
            } catch (error) {
              console.warn('确保截图文件夹存在时出错:', error)
            }
          }

          if (this.isElectronEnvironment && window.electronAPI) {
            if (window.electronAPI.selectScreenshotImage) {
              const filePath = await window.electronAPI.selectScreenshotImage(gameScreenshotPath)
              if (filePath) {
                this.formData[key] = filePath
              }
            } else if (window.electronAPI.selectImageFile) {
              const filePath = await window.electronAPI.selectImageFile(gameScreenshotPath)
              if (filePath) {
                this.formData[key] = filePath
              }
            }
          } else {
            await alertService.warning('当前环境不支持选择图片功能', '提示')
          }
        } else {
          const executablePath = this.getExecutablePathValue()
          if (!resourceName && !executablePath) {
            await alertService.warning('请先输入游戏名称或选择可执行文件')
            return
          }

          let finalName = resourceName
          if (!finalName && executablePath) {
            finalName = this.extractGameNameFromPath(executablePath)
          }

          if (!finalName) {
            await alertService.error('无法确定游戏名称')
            return
          }

          const settings = await saveManager.loadSettings()

          let baseScreenshotsPath = ''
          if (settings.screenshotLocation === 'default') {
            baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
          } else if (settings.screenshotLocation === 'custom') {
            baseScreenshotsPath = settings.screenshotsPath || ''
          } else {
            baseScreenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
          }

          if (!baseScreenshotsPath || baseScreenshotsPath.trim() === '') {
            baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
          }

          let folderName = 'Screenshots'
          if (finalName && finalName !== 'Screenshot') {
            folderName = finalName.replace(/[<>:"/\\|?*]/g, '_').trim()
            if (!folderName) {
              folderName = 'Screenshots'
            }
          }

          const gameScreenshotPath = `${baseScreenshotsPath}/${folderName}`.replace(/\\/g, '/')

          if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.ensureDirectory) {
            try {
              await window.electronAPI.ensureDirectory(gameScreenshotPath)
            } catch (error) {
              console.warn('确保截图文件夹存在时出错:', error)
            }
          }

          if (this.isElectronEnvironment && window.electronAPI) {
            if (window.electronAPI.selectScreenshotImage) {
              const filePath = await window.electronAPI.selectScreenshotImage(gameScreenshotPath)
              if (filePath) {
                this.formData[key] = filePath
              }
            } else if (window.electronAPI.selectImageFile) {
              const filePath = await window.electronAPI.selectImageFile(gameScreenshotPath)
              if (filePath) {
                this.formData[key] = filePath
              }
            }
          } else {
            await alertService.warning('当前环境不支持选择图片功能')
          }
        }
      } catch (error: any) {
        console.error('选择截图作为封面失败:', error)
        await alertService.error(`选择截图失败: ${error.message}`)
      }
    },
    /** 获取当前表单对应的游戏截图文件夹路径（编辑用 id+name，添加用 name 或可执行路径推导） */
    async getGameScreenshotFolderPathForForm(): Promise<string | null> {
      const resourceInstance = this.createResourceInstance()
      if (!resourceInstance) return null
      let nameKey = ''
      for (const fieldKey in resourceInstance) {
        const value = (resourceInstance as any)[fieldKey]
        let field: FormFieldType | null = null
        if (value instanceof ResourceField) field = value.editType
        else if (value instanceof FormFieldType) field = value
        if (field instanceof FormField_Text) {
          nameKey = fieldKey
          break
        }
      }
      const resourceName = (nameKey ? (this.formData[nameKey] || '') : '').trim()
      if (this.isEditMode) {
        if (!resourceName || !this.formData.id) return null
        const { getGameScreenshotFolderPath } = await import('../composables/game/useGameScreenshot')
        return await getGameScreenshotFolderPath(this.formData.id, resourceName, this.isElectronEnvironment)
      }
      const executablePath = this.getExecutablePathValue().trim()
      if (!resourceName && !executablePath) return null
      let finalName = resourceName || this.extractGameNameFromPath(executablePath)
      if (!finalName) return null
      const settings = await saveManager.loadSettings()
      let base = ''
      if (settings.screenshotLocation === 'default') {
        base = `${saveManager.dataDirectory}/Game/Screenshots`
      } else if (settings.screenshotLocation === 'custom') {
        base = settings.screenshotsPath || ''
      } else {
        base = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
      }
      if (!base?.trim()) base = `${saveManager.dataDirectory}/Game/Screenshots`
      const folderName = finalName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Screenshots'
      return `${base}/${folderName}`.replace(/\\/g, '/')
    },
    async handleUseFirstImageAsGameCover(key: string) {
      if (!this.isElectronEnvironment || !window.electronAPI?.listImageFiles) {
        notify.toast('warning', '设置失败', '当前环境不支持')
        return
      }
      const folderPath = await this.getGameScreenshotFolderPathForForm()
      if (!folderPath) {
        notify.toast('error', '设置失败', this.isEditMode ? '请先输入游戏名称并保存过（需有游戏ID）' : '请先输入游戏名称或选择可执行文件')
        return
      }
      try {
        if (window.electronAPI.ensureDirectory) await window.electronAPI.ensureDirectory(folderPath)
        const resp = await window.electronAPI.listImageFiles(folderPath)
        if (resp?.success && resp.files?.length > 0) {
          this.formData[key] = resp.files[0]
        } else {
          notify.toast('warning', '设置失败', '该游戏截图文件夹中没有找到图片')
        }
      } catch (e: any) {
        console.error('选择第一张封面失败:', e)
        notify.toast('error', '设置失败', e?.message || '操作失败')
      }
    },
    async handleSelectFromGameCoverFolder(key: string) {
      if (!this.isElectronEnvironment || !window.electronAPI) {
        notify.toast('warning', '设置失败', '当前环境不支持')
        return
      }
      const folderPath = await this.getGameScreenshotFolderPathForForm()
      if (!folderPath) {
        notify.toast('error', '设置失败', this.isEditMode ? '请先输入游戏名称并保存过（需有游戏ID）' : '请先输入游戏名称或选择可执行文件')
        return
      }
      try {
        if (window.electronAPI.ensureDirectory) await window.electronAPI.ensureDirectory(folderPath)
        let filePath: string | null = null
        if (window.electronAPI.selectScreenshotImage) {
          filePath = await window.electronAPI.selectScreenshotImage(folderPath)
        } else if (window.electronAPI.selectImageFile) {
          filePath = await window.electronAPI.selectImageFile(folderPath)
        }
        if (filePath) {
          this.formData[key] = filePath
          notify.toast('success', '设置成功', '已从封面文件夹选择')
        }
      } catch (e: any) {
        console.error('从封面文件夹选择失败:', e)
        notify.toast('error', '设置失败', e?.message || '操作失败')
      }
    },
    async handleUseFirstImageAsCover(key: string) {
      const folderPath = this.getFolderPathValue()
      if (!folderPath || !folderPath.trim()) {
        notify.toast('error', '设置失败', '请先选择漫画文件夹')
        return
      }
      if (this.isElectronEnvironment && window.electronAPI?.listImageFiles) {
        try {
          const resp = await window.electronAPI.listImageFiles(folderPath.trim())
          if (resp?.success && resp.files?.length > 0) {
            this.formData[key] = resp.files[0]
            notify.toast('success', '设置成功', '已使用第一张图片作为封面')
          } else {
            notify.toast('warning', '设置失败', '文件夹中没有找到图片文件')
          }
        } catch (e: any) {
          console.error('使用第一张图片作为封面失败:', e)
          notify.toast('error', '设置失败', e?.message || '操作失败')
        }
        return
      }
      this.$emit('use-first-image-cover', key, this.formData, (coverPath: string) => {
        if (coverPath) this.formData[key] = coverPath
      })
    },
    async handleSelectFromFolder(key: string) {
      const folderPath = this.getFolderPathValue()
      if (!folderPath || !folderPath.trim()) {
        notify.toast('error', '设置失败', '请先选择漫画文件夹')
        return
      }
      if (this.isElectronEnvironment && window.electronAPI) {
        try {
          let filePath: string | null = null
          if (window.electronAPI.selectScreenshotImage) {
            filePath = await window.electronAPI.selectScreenshotImage(folderPath.trim())
          } else if (window.electronAPI.selectImageFile) {
            filePath = await window.electronAPI.selectImageFile(folderPath.trim())
          }
          if (filePath) {
            this.formData[key] = filePath
            notify.toast('success', '设置成功', '已从文件夹选择封面')
          }
        } catch (e: any) {
          console.error('从文件夹选择封面失败:', e)
          notify.toast('error', '设置失败', e?.message || '操作失败')
        }
        return
      }
      this.$emit('select-from-folder-cover', key, this.formData, (coverPath: string) => {
        if (coverPath) this.formData[key] = coverPath
      })
    },
    async handleSelectFromFolderCovers(key: string) {
      // 这个功能需要在父组件中实现，通过事件或插槽
      // 父组件应该通过回调或事件更新缩略图（从文件夹的 Covers 子目录选择）
      this.$emit('select-from-folder-covers', key, this.formData, (thumbnailPath: string) => {
        if (thumbnailPath) {
          this.formData[key] = thumbnailPath
        }
      })
    },
    async handleRandomizeThumbnail(key: string) {
      // 这个功能需要在父组件中实现，通过事件或插槽
      // 父组件应该通过回调或事件更新缩略图
      this.$emit('randomize-thumbnail', key, this.formData, (thumbnailPath: string) => {
        if (thumbnailPath) {
          this.formData[key] = thumbnailPath
        }
      })
    },
    handleClearCover(key: string) {
      this.formData[key] = ''
    },
    /**
     * 把程序自带图标填进封面字段。
     * 这里只改表单里的预览。保存时会和其他封面一样复制进存档目录。
     * @param key 封面字段名
     */
    async handleUseAppIconAsCover(key: string) {
      const filePath = this.getExecutablePathValue().trim()
      if (!filePath || this.appIconCoverLoading) return
      if (!this.isElectronEnvironment || !window.electronAPI?.getFileIcon) {
        notify.toast('warning', '无法读取图标', '当前环境不支持读取程序图标')
        return
      }
      this.appIconCoverLoading = true
      try {
        const result = await window.electronAPI.getFileIcon(filePath, 256)
        if (!result?.success || !result.icon) {
          notify.toast('warning', '无法读取图标', result?.error || '没有读到这个程序的图标')
          return
        }
        this.formData[key] = result.icon
      } catch (error) {
        console.error('使用应用图标作为封面失败:', error)
        notify.toast('error', '封面更新失败', '读取程序图标时出错了')
      } finally {
        this.appIconCoverLoading = false
      }
    },
    async handleAutoDetectEngine() {
      const executablePath = this.getExecutablePathValue()
      if (!executablePath) {
        notify.toast('warning', '无法识别', '请先选择游戏文件')
        return
      }

      if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.listFiles) {
        notify.toast('warning', '无法识别', '当前环境不支持自动识别功能')
        return
      }

      try {
        notify.toast('info', '正在识别', '正在分析游戏目录结构...')
        
        const gamePath = executablePath.trim()
        const detectedEngine = await detectGameEngine(gamePath)
        
        if (detectedEngine) {
          const resourceInstance = this.createResourceInstance()
          if (!resourceInstance) return
          
          for (const key in resourceInstance) {
            const value = (resourceInstance as any)[key]
            let field: FormFieldType | null = null
            
            // 支持 ResourceField 和 FormField 两种形式
            if (value instanceof ResourceField) {
              field = value.editType
            } else if (value instanceof FormFieldType) {
              field = value
            }
            
            if (field instanceof FormField_SelectEngine) {
              this.formData[key] = detectedEngine
              notify.toast('success', '识别成功', `已识别为 ${detectedEngine}`)
              break
            }
          }
        } else {
          notify.toast('warning', '识别失败', '无法自动识别游戏引擎，请手动选择')
        }
      } catch (error: any) {
        console.error('自动识别引擎失败:', error)
        notify.toast('error', '识别失败', `识别过程中发生错误: ${error.message}`)
      }
    },
    async handleConfirm() {
      if (!this.canConfirm) {
        console.warn('[ResourcesEditDialog] 确认按钮被禁用，canConfirm:', this.canConfirm)
        return
      }

      try {
        // 如果有自定义确认处理函数，先执行它
        if (this.customConfirmHandler) {
          const result = await this.customConfirmHandler(this.formData, this.isEditMode)
          if (result === false) {
            // 返回 false 表示阻止默认行为
            console.log('[ResourcesEditDialog] customConfirmHandler 返回 false，阻止默认行为')
            return
          }
        }

        const resourceInstance = this.createResourceInstance()
        if (!resourceInstance) {
          console.error('[ResourcesEditDialog] Cannot create resource instance for confirmation')
          return
        }
        
        // 确保 id 是字符串值，而不是 ResourceField 对象
        let resourceId: string
        
        // 首先检查 formData.id，确保它是字符串值
        const formDataId = this.formData.id
        if (formDataId) {
          // 如果 formData.id 是 ResourceField，提取其 value；否则转换为字符串
          resourceId = formDataId instanceof ResourceField 
            ? String(formDataId.value || '')
            : String(formDataId)
        } else if (this.isEditMode && this.resourceData?.id) {
          // 如果 resourceData.id 是 ResourceField，提取其 value；否则直接使用
          const idValue = this.resourceData.id instanceof ResourceField 
            ? this.resourceData.id.value 
            : this.resourceData.id
          resourceId = String(idValue || '')
        } else {
          resourceId = Date.now().toString()
        }
        
        console.log('[ResourcesEditDialog] 构建 resource 对象:', {
          formDataId: this.formData.id,
          formDataIdType: typeof this.formData.id,
          formDataIdIsResourceField: this.formData.id instanceof ResourceField,
          resourceDataId: this.resourceData?.id,
          resourceDataIdType: typeof this.resourceData?.id,
          resourceDataIdIsResourceField: this.resourceData?.id instanceof ResourceField,
          resourceId,
          resourceIdType: typeof resourceId,
          isEditMode: this.isEditMode
        })
        
        const resource: Record<string, any> = {
          id: resourceId,
          fileExists: true
        }

        // 添加 resourceType 字段（从资源实例获取默认值）
        if (resourceInstance && resourceInstance.resourceType) {
          if (resourceInstance.resourceType instanceof ResourceField) {
            resource.resourceType = resourceInstance.resourceType.defaultValue
          }
        }
        
        // 遍历资源类的字段定义，从 formData 中提取对应的值
        for (const key in resourceInstance) {
          const value = (resourceInstance as any)[key]
          let field: FormFieldType | null = null
          
          // 页面正在编辑的键，按这一页的框来写。否则标签框会把改成文本的值收成空数组。
          if (this.formFields?.[key]) {
            field = this.formFields[key]
          } else if (value instanceof ResourceField) {
            field = value.editType
          } else if (value instanceof FormFieldType) {
            field = value
          }
          
          if (field) {
            let formValue = BaseResources.extractPrimitiveValue(this.formData[key])
            
            if (field instanceof FormField_Tags) {
              resource[key] = Array.isArray(formValue) ? [...formValue] : []
            } else if (field instanceof FormField_Checkbox) {
              resource[key] = Boolean(formValue)
            } else if (field instanceof FormField_Number) {
              resource[key] = typeof formValue === 'number' ? formValue : (typeof formValue === 'string' ? Number(formValue) || 0 : 0)
            } else if (typeof formValue === 'string') {
              resource[key] = formValue.trim()
            } else {
              resource[key] = formValue
            }
          }
        }
        
        // 保留不在类中定义但在 formData 中的字段（如 duration 等）
        for (const key in this.formData) {
          if (key === 'retainedFields' || BaseResources.ephemeralFieldKeys.has(key)) continue
          if (!(key in resource) && key !== 'id' && key !== 'fileExists') {
            const value = this.formData[key]
            if (value !== undefined && value !== null) {
              resource[key] = BaseResources.extractPrimitiveValue(value)
            }
          }
        }

        console.log('[ResourcesEditDialog] 准备触发 confirm 事件，resource:', resource)
        console.log('[ResourcesEditDialog] resource 所有字段:', Object.keys(resource))
        console.log('[ResourcesEditDialog] resourceType 字段:', resource.resourceType)
        console.log('[ResourcesEditDialog] id 字段:', resource.id)
        this.$emit('confirm', resource)
      } catch (error) {
        console.error('[ResourcesEditDialog] handleConfirm 执行出错:', error)
        throw error
      }
    },
    /**
     * 预览图加载失败时换成占位图。
     * 已经显示的是读出来的封面时不再改地址，避免失败事件把真正的缩略图盖掉。
     * @param event 图片错误事件
     */
    handleImageError(event: Event) {
      const target = event.target as HTMLImageElement | null
      if (!target?.isConnected) return
      const shown = target.src || ''
      if (shown.startsWith('data:image/jpeg') || shown.startsWith('data:image/png') || shown.startsWith('data:image/webp') || shown.startsWith('data:image/gif')) {
        return
      }
      target.src = this.coverPlaceholderSrc()
    },
    getImageFileName(imagePath: string) {
      if (!imagePath) return ''
      const fileName = imagePath.split(/[\\/]/).pop()
      return fileName || imagePath
    },
    // 设置标签输入框的 ref
    setTagInputRef(key: string, el: any) {
      if (el) {
        this.tagInputRefs[key] = el
      } else {
        delete this.tagInputRefs[key]
      }
    },
    handleSelectTag(payload: string | { fieldKey: string; tag: string }) {
      const fieldKey = typeof payload === 'object' ? payload?.fieldKey : undefined
      const tag = typeof payload === 'object' ? payload?.tag : payload
      if (!tag) return
      const tagsKey = fieldKey
      if (!tagsKey || !Array.isArray(this.formData[tagsKey])) return
      const index = this.formData[tagsKey].indexOf(tag)
      if (index > -1) {
        this.formData[tagsKey].splice(index, 1)
      } else {
        this.formData[tagsKey].push(tag)
      }
    }
  }
}
</script>

<style scoped>
/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.modal-body {
  padding: 20px;
}

.form-field-wrapper {
  margin-bottom: 20px;
}

.type-choice {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.form-label {
  display: block;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

/* 复选框字段样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 8px;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: var(--accent-color);
}

.checkbox-text {
  color: var(--text-primary);
  font-size: 0.875rem;
  user-select: none;
}

/* 文件输入组样式 */
.file-input-group {
  display: flex;
  gap: var(--spacing-md, 12px);
  align-items: flex-start;
  flex-wrap: wrap;
}

.file-input-group .fun-input {
  flex: 1;
  min-width: 200px;
}

.btn-browse {
  padding: var(--spacing-md, 12px) var(--spacing-xl, 20px);
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  border-radius: var(--radius-md, 6px);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base, 0.3s ease);
  white-space: nowrap;
}

.btn-browse:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-browse:disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.image-preview {
  width: 100%;
  margin-top: var(--spacing-md, 12px);
  padding: var(--spacing-md, 12px);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border-color);
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: var(--radius-sm, 4px);
}

/* 封面选择区域样式 */
.cover-selection-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.cover-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.cover-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.cover-preview-info {
  flex: 1;
}

.cover-filename {
  color: var(--text-secondary);
  font-size: 0.9rem;
  word-break: break-all;
  line-height: 1.4;
}

.cover-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-cover-action {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
  font-size: 0.9rem;
}

.btn-cover-action:hover {
  background: var(--accent-hover);
}

.btn-cover-action.btn-clear {
  background: #ef4444;
}

.btn-cover-action.btn-clear:hover {
  background: #dc2626;
}

.btn-cover-action .btn-icon {
  font-size: 1rem;
}

.btn-cover-action:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-cover-action:disabled:hover {
  background: var(--bg-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-confirm {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.engine-auto-detect {
  margin-bottom: 1rem;
}

.btn-auto-detect {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  width: 100%;
  justify-content: center;
}

.btn-auto-detect:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.btn-auto-detect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-auto-detect .btn-icon {
  font-size: 1rem;
}

/* Tag 选择面板样式 */
.tag-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 300px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: all 0.3s ease;
  flex-shrink: 0;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 表单错误消息样式 */
.form-error-message {
  padding: 15px;
  margin-bottom: 20px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
}

.form-error-message p {
  margin: 5px 0;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-wrapper {
    flex-direction: column;
    width: 95vw;
    max-width: 95vw;
  }

  .modal-content {
    width: 100%;
    margin: 20px;
  }

  .tag-panel {
    width: 100%;
    margin: 0 20px 20px 20px;
  }
}
</style>
