<template>
  <div class="fun-tag-input">
    <div class="fun-tag-input__display">
      <fun-tag
        v-for="(tag, index) in modelValue"
        :key="`tag-${index}`"
        :text="tag"
        :closable="!disabled"
        @close="handleRemoveTag(index)"
      />
    </div>
    <fun-input
      v-if="!disabled && (!maxTags || modelValue.length < maxTags)"
      ref="inputRef"
      v-model="tagInput"
      type="text"
      :placeholder="placeholder"
      :autofocus="autofocus"
      :disabled="disabled"
      @enter.prevent="handleAddTag"
      @comma.prevent="handleAddTag"
      @blur="handleBlur"
      :inputStyle="inputStyle"
    />
    <div v-if="maxTags && modelValue.length >= maxTags" class="fun-tag-input__max-hint">
      <span class="fun-tag-input__max-text">已达到最大标签数 ({{ maxTags }})</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

interface Props {
  /** 标签数组（v-model） */
  modelValue: string[]
  /** 占位符文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 最大标签数量 */
  maxTags?: number
  /** 是否自动聚焦 */
  autofocus?: boolean
  /** 是否允许重复标签 */
  allowDuplicate?: boolean
  /** 自定义输入框样式 */
  inputStyle?: Record<string, string | number>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  placeholder: '输入标签后按回车或逗号添加',
  disabled: false,
  maxTags: undefined,
  autofocus: false,
  allowDuplicate: false,
  inputStyle: () => ({
    border: 'none',
    background: 'transparent',
    padding: 'var(--spacing-xs, 4px) 0',
    boxShadow: 'none',
    minWidth: 'auto'
  })
})

const emit = defineEmits<{
  'update:modelValue': [tags: string[]]
  'add': [tag: string]
  'remove': [tag: string, index: number]
  'change': [tags: string[]]
  'blur': [event: FocusEvent]
}>()

const tagInput = ref('')
const inputRef = ref<any>(null)

// 添加标签
function handleAddTag() {
  const tag = tagInput.value.trim()
  
  // 验证标签
  if (!tag) {
    return
  }
  
  // 检查是否达到最大标签数
  if (props.maxTags && props.modelValue.length >= props.maxTags) {
    tagInput.value = ''
    return
  }
  
  // 检查是否允许重复
  if (!props.allowDuplicate && props.modelValue.includes(tag)) {
    tagInput.value = ''
    return
  }
  
  // 添加标签
  const newTags = [...props.modelValue, tag]
  emit('update:modelValue', newTags)
  emit('add', tag)
  emit('change', newTags)
  tagInput.value = ''
}

// 删除标签
function handleRemoveTag(index: number) {
  if (props.disabled) return
  
  if (index >= 0 && index < props.modelValue.length) {
    const removedTag = props.modelValue[index]
    const newTags = props.modelValue.filter((_, i) => i !== index)
    emit('update:modelValue', newTags)
    emit('remove', removedTag, index)
    emit('change', newTags)
  }
}

// 处理失焦事件
function handleBlur(event: FocusEvent) {
  emit('blur', event)
  // 失焦时尝试添加当前输入的标签
  if (tagInput.value.trim()) {
    handleAddTag()
  }
}

// 设置输入框的值（用于外部调用，如从标签选择面板填充）
async function setInputValue(value: string) {
  console.log('[FunTagInput] setInputValue 被调用，value:', value, '当前 tagInput.value:', tagInput.value)
  
  // 更新 tagInput ref（这会触发 v-model 更新）
  tagInput.value = value
  
  // 使用 nextTick 确保 DOM 已更新
  await nextTick()
  
  // 如果 fun-input 组件暴露了方法，也可以直接调用
  // 但通常 v-model 应该已经同步了
  if (inputRef.value) {
    const inputElement = inputRef.value.getInputElement?.()
    if (inputElement && inputElement instanceof HTMLInputElement) {
      // 确保 DOM 元素的值也更新（作为备选方案）
      inputElement.value = value
      // 触发 input 事件，确保 Vue 的响应式系统知道值已更新
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
  
  console.log('[FunTagInput] setInputValue 执行后，tagInput.value:', tagInput.value)
}

// 暴露方法供外部调用
defineExpose({
  setInputValue,
  inputRef // 也暴露 inputRef，以便外部可以直接访问
})
</script>

<style scoped lang="scss">
.fun-tag-input {
  padding: var(--spacing-md, 12px);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-tertiary, #f5f5f5);
  transition: all var(--transition-base, 0.3s ease);
  min-height: 44px;
  
  &:focus-within {
    outline: none;
    border-color: var(--accent-color, #66c0f4);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }
}

.fun-tag-input__display {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs, 4px);
  margin-bottom: var(--spacing-sm, 8px);
  min-height: 24px;
}

.fun-tag-input__max-hint {
  padding: var(--spacing-xs, 4px) 0;
}

.fun-tag-input__max-text {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-tertiary, #999999);
  font-style: italic;
}
</style>
