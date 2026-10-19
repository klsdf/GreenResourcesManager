<template>
  <div class="fun-card" :class="cardClass" @click="handleClick">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 是否显示阴影 */
  shadow?: boolean
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否可点击 */
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  shadow: true,
  bordered: true,
  clickable: false
})

const cardClass = computed(() => {
  return {
    'fun-card--no-shadow': !props.shadow,
    'fun-card--no-border': !props.bordered,
    'fun-card--clickable': props.clickable
  }
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped lang="scss">
.fun-card {
  background: var(--bg-secondary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  transition: all var(--transition-base);
}

.fun-card--no-shadow {
  box-shadow: none;
}

.fun-card--no-border {
  border: none;
}

.fun-card--clickable {
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--shadow-medium);
    border-color: var(--accent-color);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.fun-card:not(.fun-card--clickable):hover {
  box-shadow: 0 2px 8px var(--shadow-small);
}
</style>
