<template>
  <select
    ref="selectRef"
    class="fun-select"
    :value="modelValue"
    @change="handleChange"
    @blur="handleBlur"
    @focus="handleFocus"
    :disabled="disabled"
    :class="{
      'fun-select--disabled': disabled,
      'fun-select--error': error
    }"
    :style="selectStyle"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  /** 选择器的值（v-model） */
  modelValue: string | number
  /** 选项列表 */
  options: SelectOption[]
  /** 占位符文本（会作为第一个禁用选项显示） */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义样式 */
  selectStyle?: Record<string, string | number>
  /** 是否显示错误状态 */
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  options: () => [],
  placeholder: '',
  disabled: false,
  selectStyle: () => ({}),
  error: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [value: string | number, event: Event]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
}>()

const selectRef = ref<HTMLSelectElement | null>(null)

// 处理变化事件
const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value
  emit('update:modelValue', value)
  emit('change', value, event)
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
  /** 聚焦选择器 */
  focus: () => {
    selectRef.value?.focus()
  },
  /** 失焦选择器 */
  blur: () => {
    selectRef.value?.blur()
  },
  /** 获取选择器元素 */
  getSelectElement: () => selectRef.value
})
</script>

<style scoped lang="scss">
.fun-select {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-secondary, #ffffff);
  color: var(--text-primary, #333333);
  font-size: var(--font-size-base, 0.9rem);
  min-width: 200px;
  transition: all var(--transition-base, 0.3s ease);
  outline: none;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-md, 12px) center;
  background-size: 12px;
  padding-right: calc(var(--spacing-md, 12px) * 2 + 12px);

  &:focus {
    border-color: var(--accent-color, #66c0f4);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background-color: var(--bg-tertiary, #f5f5f5);
    color: var(--text-secondary, #666666);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  }

  &--error {
    border-color: var(--error-color, #ef4444);
    background-color: var(--error-bg, #fef2f2);
    
    &:focus {
      border-color: var(--error-color, #ef4444);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }

  option {
    padding: var(--spacing-sm, 8px);
    background: var(--bg-secondary, #ffffff);
    color: var(--text-primary, #333333);
    
    &:disabled {
      color: var(--text-tertiary, #999999);
    }
  }

  // 兼容深色模式
  @media (prefers-color-scheme: dark) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    
    &--disabled {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    }
  }
}
</style>
