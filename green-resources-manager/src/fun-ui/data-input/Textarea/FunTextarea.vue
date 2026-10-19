<template>
  <textarea
    ref="textareaRef"
    class="fun-textarea"
    :value="modelValue"
    @input="handleInput"
    @blur="handleBlur"
    @focus="handleFocus"
    :placeholder="placeholder"
    :readonly="readonly"
    :disabled="disabled"
    :rows="rows"
    :maxlength="maxLength"
    :autofocus="autofocus"
    :spellcheck="spellcheck"
    :class="{
      'fun-textarea--readonly': readonly,
      'fun-textarea--disabled': disabled,
      'fun-textarea--error': error
    }"
    :style="textareaStyle"
  ></textarea>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  /** 文本域的值（v-model） */
  modelValue: string
  /** 占位符文本 */
  placeholder?: string
  /** 是否只读 */
  readonly?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 行数 */
  rows?: number
  /** 自定义样式 */
  textareaStyle?: Record<string, string | number>
  /** 最大长度 */
  maxLength?: number
  /** 是否自动聚焦 */
  autofocus?: boolean
  /** 是否检查拼写 */
  spellcheck?: boolean
  /** 是否显示错误状态 */
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  readonly: false,
  disabled: false,
  rows: 3,
  textareaStyle: () => ({}),
  maxLength: undefined,
  autofocus: false,
  spellcheck: false,
  error: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
  'input': [event: Event]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 处理输入事件
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

// 处理失焦事件
const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

// 处理聚焦事件
const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

// 暴露方法供父组件调用
defineExpose({
  /** 聚焦文本域 */
  focus: () => {
    textareaRef.value?.focus()
  },
  /** 失焦文本域 */
  blur: () => {
    textareaRef.value?.blur()
  },
  /** 选中所有文本 */
  select: () => {
    textareaRef.value?.select()
  },
  /** 获取文本域元素 */
  getTextareaElement: () => textareaRef.value
})

// 监听 autofocus 属性变化
watch(() => props.autofocus, (newVal) => {
  if (newVal && textareaRef.value) {
    textareaRef.value.focus()
  }
})

// 组件挂载后处理 autofocus
onMounted(() => {
  if (props.autofocus && textareaRef.value) {
    textareaRef.value.focus()
  }
})
</script>

<style scoped lang="scss">
.fun-textarea {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-secondary, #ffffff);
  color: var(--text-primary, #333333);
  font-size: var(--font-size-base, 0.9rem);
  font-family: inherit;
  line-height: 1.5;
  transition: all var(--transition-base, 0.3s ease);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;

  &:focus {
    border-color: var(--accent-color, #66c0f4);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }

  &::placeholder {
    color: var(--text-tertiary, #999999);
    opacity: 0.7;
  }

  &--readonly {
    cursor: default;
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-secondary, #666666);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-secondary, #666666);
  }

  &--error {
    border-color: var(--error-color, #ef4444);
    background: var(--error-bg, #fef2f2);
    
    &:focus {
      border-color: var(--error-color, #ef4444);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }
}
</style>
