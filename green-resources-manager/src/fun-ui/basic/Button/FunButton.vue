<template>
  <button
    class="fun-button"
    :class="[
      `fun-button--${type}`,
      { 'fun-button--icon-only': icon && !$slots.default }
    ]"
    :disabled="disabled"
    :type="nativeType"
    @click="handleClick"
  >
    <span v-if="icon" class="fun-button__icon">{{ icon }}</span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
interface Props {
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'danger'
  /** 图标（emoji 或文本） */
  icon?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 原生 button 类型 */
  nativeType?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  icon: '',
  disabled: false,
  nativeType: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped lang="scss">
.fun-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: var(--font-size-base, 1rem);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base, 0.3s ease);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  outline: none;
  
  &__icon {
    font-size: 1.2rem;
    line-height: 1;
  }
  
  // 默认样式
  background: var(--bg-tertiary, #f5f5f5);
  color: var(--text-primary, #333333);
  
  &:hover:not(:disabled) {
    background: var(--bg-secondary, #ffffff);
  }
  
  // Primary 类型（主要按钮）
  &--primary {
    background: var(--accent-color, #66c0f4);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--accent-hover, #4da8d4);
    }
  }
  
  // Secondary 类型（次要按钮）
  &--secondary {
    background: var(--bg-secondary, #ffffff);
    color: var(--text-primary, #333333);
    border: 1px solid var(--border-color, #e0e0e0);
    
    &:hover:not(:disabled) {
      background: var(--bg-tertiary, #f5f5f5);
      border-color: var(--accent-color, #66c0f4);
    }
  }
  
  // Info 类型（信息按钮）
  &--info {
    background: var(--info-color, #3b82f6);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--info-hover, #2563eb);
    }
  }
  
  // Success 类型（成功按钮）
  &--success {
    background: var(--success-color, #10b981);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--success-hover, #059669);
    }
  }
  
  // Warning 类型（警告按钮）
  &--warning {
    background: var(--warning-color, #f59e0b);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--warning-hover, #d97706);
    }
  }
  
  // Danger 类型（危险按钮）
  &--danger {
    background: var(--danger-color, #ef4444);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--danger-hover, #dc2626);
    }
  }
  
  // 仅图标按钮
  &--icon-only {
    padding: 10px;
    aspect-ratio: 1;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:focus-visible {
    outline: 2px solid var(--accent-color, #66c0f4);
    outline-offset: 2px;
  }
}
</style>
