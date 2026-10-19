<template>
  <div 
    class="fun-drop-zone"
    :class="{
      'fun-drop-zone--dragging': isDragOver,
      'fun-drop-zone--disabled': disabled
    }"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @click="handleClick"
  >
    <!-- 自定义内容插槽 -->
    <slot v-if="$slots.default" :is-dragging="isDragOver" />
    
    <!-- 默认内容 -->
    <div v-else class="fun-drop-zone__content">
      <div class="fun-drop-zone__icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 8V32M24 32L16 24M24 32L32 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 40H40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="fun-drop-zone__text">
        <p class="fun-drop-zone__title">{{ title }}</p>
        <p class="fun-drop-zone__hint">{{ hint }}</p>
      </div>
    </div>
    
    <!-- 拖拽时的遮罩层 -->
    <div v-if="isDragOver" class="fun-drop-zone__overlay">
      <div class="fun-drop-zone__overlay-content">
        <slot name="dragging">
          <div class="fun-drop-zone__overlay-icon">📁</div>
          <p class="fun-drop-zone__overlay-text">{{ dragText }}</p>
        </slot>
      </div>
    </div>
    
    <!-- 隐藏的文件输入框（用于点击上传） -->
    <input
      v-if="clickable"
      ref="fileInputRef"
      type="file"
      :accept="acceptString"
      :multiple="multiple"
      :disabled="disabled"
      class="fun-drop-zone__input"
      @change="handleFileInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDragAndDrop } from '../../../composables/useDragAndDrop'

interface Props {
  /** 是否禁用 */
  disabled?: boolean
  /** 允许的文件扩展名（如 ['.jpg', '.png', '.pdf']，空数组表示接受所有文件） */
  accept?: string[]
  /** 是否支持多文件上传 */
  multiple?: boolean
  /** 是否可点击上传 */
  clickable?: boolean
  /** 标题文本 */
  title?: string
  /** 提示文本 */
  hint?: string
  /** 拖拽时显示的文本 */
  dragText?: string
  /** 最大文件大小（字节），0 表示不限制 */
  maxSize?: number
  /** 最大文件数量，0 表示不限制 */
  maxFiles?: number
}

interface Emits {
  /** 文件拖放或选择后触发 */
  (e: 'drop', files: File[]): void
  /** 文件验证失败时触发 */
  (e: 'error', error: { type: 'size' | 'count' | 'type', message: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  accept: () => [],
  multiple: true,
  clickable: true,
  title: '拖拽文件到这里或点击上传',
  hint: '支持拖拽多个文件',
  dragText: '松开鼠标添加文件',
  maxSize: 0,
  maxFiles: 0
})

const emit = defineEmits<Emits>()

// 文件输入框引用
const fileInputRef = ref<HTMLInputElement | null>(null)

// 计算 accept 属性字符串
const acceptString = computed(() => {
  if (props.accept.length === 0) return '*'
  return props.accept.join(',')
})

// 验证文件
const validateFile = (file: File): { valid: boolean; error?: { type: 'size' | 'type', message: string } } => {
  // 检查文件大小
  if (props.maxSize > 0 && file.size > props.maxSize) {
    const sizeMB = (props.maxSize / 1024 / 1024).toFixed(2)
    return {
      valid: false,
      error: {
        type: 'size',
        message: `文件 "${file.name}" 超过最大大小限制 (${sizeMB}MB)`
      }
    }
  }
  
  // 检查文件类型
  if (props.accept.length > 0) {
    const fileName = file.name.toLowerCase()
    const isAccepted = props.accept.some(ext => fileName.endsWith(ext.toLowerCase()))
    if (!isAccepted) {
      return {
        valid: false,
        error: {
          type: 'type',
          message: `文件 "${file.name}" 类型不支持，仅支持: ${props.accept.join(', ')}`
        }
      }
    }
  }
  
  return { valid: true }
}

// 处理文件
const handleFiles = async (files: File[]) => {
  if (props.disabled) return
  
  let validFiles: File[] = []
  
  // 验证每个文件
  for (const file of files) {
    const validation = validateFile(file)
    if (validation.valid) {
      validFiles.push(file)
    } else if (validation.error) {
      emit('error', validation.error)
    }
  }
  
  // 检查文件数量限制
  if (props.maxFiles > 0 && validFiles.length > props.maxFiles) {
    emit('error', {
      type: 'count',
      message: `最多只能上传 ${props.maxFiles} 个文件`
    })
    validFiles = validFiles.slice(0, props.maxFiles)
  }
  
  // 如果不支持多文件，只取第一个
  if (!props.multiple && validFiles.length > 1) {
    validFiles = [validFiles[0]]
  }
  
  // 触发事件
  if (validFiles.length > 0) {
    emit('drop', validFiles)
  }
}

// 使用拖拽 composable
const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop: handleDragDrop } = useDragAndDrop({
  acceptedExtensions: props.accept,
  enabled: !props.disabled,
  onDrop: handleFiles
})

// 处理点击事件
const handleClick = () => {
  if (props.disabled || !props.clickable) return
  fileInputRef.value?.click()
}

// 处理文件输入框变化
const handleFileInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  
  const files = Array.from(input.files)
  handleFiles(files)
  
  // 清空输入框，允许重复选择相同文件
  input.value = ''
}

// 手动触发拖拽事件（供父组件调用）
const handleDrop = handleDragDrop
</script>

<style scoped lang="scss">
.fun-drop-zone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: var(--spacing-xl);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-xl);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover:not(&--disabled) {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }
  
  // 拖拽状态
  &--dragging {
    border-color: var(--accent-color);
    background: rgba(59, 130, 246, 0.1);
    border-width: 2px;
  }
  
  // 禁用状态
  &--disabled {
    cursor: not-allowed;
    opacity: 0.5;
    
    &:hover {
      border-color: var(--border-color);
      background: var(--bg-secondary);
    }
  }
  
  // 内容区域
  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
    text-align: center;
    pointer-events: none;
  }
  
  &__icon {
    color: var(--accent-color);
    opacity: 0.6;
    transition: all var(--transition-base);
    
    .fun-drop-zone:hover:not(.fun-drop-zone--disabled) & {
      opacity: 1;
      transform: translateY(-4px);
    }
  }
  
  &__text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  &__hint {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  // 拖拽遮罩层
  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.35);
    border-radius: var(--radius-xl);
    z-index: 10;
    pointer-events: none;
  }
  
  &__overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }
  
  &__overlay-icon {
    font-size: 48px;
    animation: bounce 0.6s ease-in-out infinite;
  }
  
  &__overlay-text {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  // 隐藏的文件输入框
  &__input {
    display: none;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
