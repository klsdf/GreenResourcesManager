<template>
  <span class="fun-tag">
    <span class="fun-tag__text">
      <slot>{{ text }}</slot>
    </span>
    <button
      v-if="closable"
      type="button"
      class="fun-tag__close"
      @click="handleClose"
      :aria-label="`删除标签 ${text || ''}`"
    >
      ×
    </button>
  </span>
</template>

<script setup lang="ts">
interface Props {
  /** 标签文本 */
  text?: string
  /** 是否显示删除按钮 */
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  closable: false
})

const emit = defineEmits<{
  close: []
}>()

function handleClose(event: MouseEvent) {
  event.stopPropagation()
  emit('close')
}
</script>

<style scoped lang="scss">
.fun-tag {
  display: inline-flex;
  align-items: center;
  background: var(--accent-color);
  color: white;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  gap: var(--spacing-xs);
  transition: background var(--transition-base);
  
  &:hover {
    background: var(--accent-hover);
  }
}

.fun-tag__text {
  display: inline-flex;
  align-items: center;
}

.fun-tag__close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: var(--font-size-base);
  line-height: 1;
  padding: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base);
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ef4444;
  }
  
  &:active {
    transform: scale(0.9);
  }
}
</style>
