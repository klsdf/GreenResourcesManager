<template>
  <input
    ref="inputRef"
    class="fun-input"
    :type="type"
    :value="modelValue"
    @input="handleInput"
    @blur="handleBlur"
    @focus="handleFocus"
    @keydown="handleKeyDown"
    @keyup="handleKeyUp"
    @keypress="handleKeyPress"
    @paste="handlePaste"
    @copy="handleCopy"
    @cut="handleCut"
    :placeholder="placeholder"
    :readonly="readonly"
    :disabled="disabled"
    :maxlength="maxLength"
    :autofocus="autofocus"
    :autocomplete="autocomplete"
    :spellcheck="spellcheck"
    :class="{
      'fun-input--readonly': readonly,
      'fun-input--disabled': disabled,
      'fun-input--error': error
    }"
    :style="inputStyle"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  /** 输入框的值（v-model） */
  modelValue: string
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
  /** 占位符文本 */
  placeholder?: string
  /** 是否只读 */
  readonly?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义样式 */
  inputStyle?: Record<string, string | number>
  /** 最大长度 */
  maxLength?: number
  /** 是否自动聚焦 */
  autofocus?: boolean
  /** 自动完成属性 */
  autocomplete?: string
  /** 是否检查拼写 */
  spellcheck?: boolean
  /** 是否显示错误状态 */
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  readonly: false,
  disabled: false,
  inputStyle: () => ({}),
  maxLength: undefined,
  autofocus: false,
  autocomplete: 'off',
  spellcheck: false,
  error: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
  'keydown': [event: KeyboardEvent]
  'keyup': [event: KeyboardEvent]
  'keypress': [event: KeyboardEvent]
  'paste': [event: ClipboardEvent]
  'copy': [event: ClipboardEvent]
  'cut': [event: ClipboardEvent]
  // 便捷的按键事件
  'enter': [event: KeyboardEvent]
  'escape': [event: KeyboardEvent]
  'comma': [event: KeyboardEvent]
  'tab': [event: KeyboardEvent]
  'arrow-up': [event: KeyboardEvent]
  'arrow-down': [event: KeyboardEvent]
  'arrow-left': [event: KeyboardEvent]
  'arrow-right': [event: KeyboardEvent]
  // 快捷键事件
  'ctrl-c': [event: KeyboardEvent]
  'ctrl-v': [event: KeyboardEvent]
  'ctrl-x': [event: KeyboardEvent]
  'ctrl-a': [event: KeyboardEvent]
  'ctrl-z': [event: KeyboardEvent]
  'ctrl-y': [event: KeyboardEvent]
  // 清空事件
  'clear': []
}>()

const inputRef = ref<HTMLInputElement | null>(null)

// 处理输入事件
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

// 处理失焦事件
const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

// 处理聚焦事件
const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

// 处理键盘按下事件
const handleKeyDown = (event: KeyboardEvent) => {
  emit('keydown', event)
  
  // 提供便捷的常用按键事件
  if (event.key === 'Enter') {
    emit('enter', event)
  } else if (event.key === 'Escape') {
    emit('escape', event)
  } else if (event.key === ',' || event.key === 'Comma') {
    // 逗号键（支持不同键盘布局）
    emit('comma', event)
  } else if (event.key === 'Tab') {
    emit('tab', event)
  } else if (event.key === 'ArrowUp') {
    emit('arrow-up', event)
  } else if (event.key === 'ArrowDown') {
    emit('arrow-down', event)
  } else if (event.key === 'ArrowLeft') {
    emit('arrow-left', event)
  } else if (event.key === 'ArrowRight') {
    emit('arrow-right', event)
  }
  
  // 支持 Ctrl+A 全选后按 Delete/Backspace 清空
  if ((event.key === 'Delete' || event.key === 'Backspace') && event.ctrlKey) {
    const target = event.target as HTMLInputElement
    if (target.selectionStart === 0 && target.selectionEnd === target.value.length) {
      emit('clear')
      emit('update:modelValue', '')
      event.preventDefault()
    }
  }
  
  // 支持 Ctrl+C/V/X 快捷键（可以选择性地阻止默认行为）
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'c' || event.key === 'C') {
      emit('ctrl-c', event)
    } else if (event.key === 'v' || event.key === 'V') {
      emit('ctrl-v', event)
    } else if (event.key === 'x' || event.key === 'X') {
      emit('ctrl-x', event)
    } else if (event.key === 'a' || event.key === 'A') {
      emit('ctrl-a', event)
    } else if (event.key === 'z' || event.key === 'Z') {
      emit('ctrl-z', event)
    } else if (event.key === 'y' || event.key === 'Y') {
      emit('ctrl-y', event)
    }
  }
}

// 处理键盘释放事件
const handleKeyUp = (event: KeyboardEvent) => {
  emit('keyup', event)
}

// 处理键盘按下（字符输入）事件
const handleKeyPress = (event: KeyboardEvent) => {
  emit('keypress', event)
}

// 处理粘贴事件
const handlePaste = (event: ClipboardEvent) => {
  emit('paste', event)
}

// 处理复制事件
const handleCopy = (event: ClipboardEvent) => {
  emit('copy', event)
}

// 处理剪切事件
const handleCut = (event: ClipboardEvent) => {
  emit('cut', event)
}

// 暴露方法供父组件调用
defineExpose({
  /** 聚焦输入框 */
  focus: () => {
    inputRef.value?.focus()
  },
  /** 失焦输入框 */
  blur: () => {
    inputRef.value?.blur()
  },
  /** 选中所有文本 */
  select: () => {
    inputRef.value?.select()
  },
  /** 选中指定范围的文本 */
  setSelectionRange: (start: number, end: number) => {
    inputRef.value?.setSelectionRange(start, end)
  },
  /** 获取输入框元素 */
  getInputElement: () => inputRef.value
})

// 监听 autofocus 属性变化
watch(() => props.autofocus, (newVal) => {
  if (newVal && inputRef.value) {
    inputRef.value.focus()
  }
})

// 组件挂载后处理 autofocus
onMounted(() => {
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<style scoped lang="scss">
.fun-input {
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

  &:hover:not(:disabled):not(:read-only):not(.fun-input--error) {
    border-color: var(--border-color-hover, #b0b0b0);
  }

  // 数字输入框的样式调整
  &[type="number"] {
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      opacity: 1;
      cursor: pointer;
    }
  }

  // 搜索输入框的样式调整
  &[type="search"] {
    &::-webkit-search-cancel-button {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity var(--transition-base, 0.3s ease);
      
      &:hover {
        opacity: 1;
      }
    }
  }
}
</style>