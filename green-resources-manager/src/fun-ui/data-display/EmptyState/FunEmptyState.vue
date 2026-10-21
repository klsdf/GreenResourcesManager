<template>
  <div class="fun-empty-state">
    <div class="fun-empty-state__icon">
      <slot name="icon">{{ icon }}</slot>
    </div>
    <h3 class="fun-empty-state__title">
      <slot name="title">{{ $lt(title) }}</slot>
    </h3>
    <p class="fun-empty-state__description">
      <slot name="description">{{ $lt(description) }}</slot>
    </p>
    <fun-button
      v-if="showButton"
      class="fun-empty-state__button"
      @click="handleAction"
    >
      {{ $lt(buttonText) }}
    </fun-button>
    <div v-if="$slots.default" class="fun-empty-state__extra">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 图标（支持 emoji 或文本） */
  icon?: string
  /** 标题 */
  title?: string
  /** 描述 */
  description?: string
  /** 是否显示按钮 */
  showButton?: boolean
  /** 按钮文本 */
  buttonText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📦',
  title: '',
  description: '',
  showButton: false,
  buttonText: '添加第一个项目'
})

const emit = defineEmits<{
  action: []
}>()

function handleAction() {
  emit('action')
}
</script>

<style scoped lang="scss">
.fun-empty-state {
  text-align: center;
  padding: var(--spacing-xxl) var(--spacing-lg);
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.fun-empty-state__icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-xl);
  opacity: 0.6;
  line-height: 1;
  display: block;
}

.fun-empty-state__title {
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  margin: 0 0 var(--spacing-sm) 0;
  transition: color var(--transition-base);
  display: block;
  width: 100%;
}

.fun-empty-state__description {
  margin: 0 0 var(--spacing-lg) 0;
  transition: color var(--transition-base);
}

.fun-empty-state__button {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  font-weight: 600;
  
  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }
}

.fun-empty-state__extra {
  margin-top: var(--spacing-md);
}
</style>
