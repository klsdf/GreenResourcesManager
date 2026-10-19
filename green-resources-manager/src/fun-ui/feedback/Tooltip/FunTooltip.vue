<template>
  <Transition name="tooltip-fade">
    <div v-if="visible" :class="tooltipClasses" :style="tooltipStyle">
      <div class="fun-tooltip__arrow" :style="arrowStyle"></div>
      <div class="fun-tooltip__content">
        <slot>{{ text }}</slot>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TooltipTheme = 'dark' | 'light' | 'primary' | 'danger'

interface Props {
  text?: string
  visible?: boolean
  placement?: TooltipPlacement
  theme?: TooltipTheme
  offset?: number
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  visible: false,
  placement: 'bottom',
  theme: 'dark',
  offset: 8
})

const tooltipClasses = computed(() => [
  'fun-tooltip',
  `fun-tooltip--${props.placement}`,
  `fun-tooltip--${props.theme}`
])

const tooltipStyle = computed(() => {
  const styles: Record<string, string> = {}
  
  switch (props.placement) {
    case 'top':
      styles.bottom = '100%'
      styles.marginBottom = `${props.offset}px`
      break
    case 'bottom':
      styles.top = '100%'
      styles.marginTop = `${props.offset}px`
      break
    case 'left':
      styles.right = '100%'
      styles.marginRight = `${props.offset}px`
      break
    case 'right':
      styles.left = '100%'
      styles.marginLeft = `${props.offset}px`
      break
  }
  
  return styles
})

const arrowStyle = computed(() => {
  const styles: Record<string, string> = {}
  
  switch (props.placement) {
    case 'top':
      styles.bottom = '-18px'
      styles.left = '50%'
      styles.transform = 'translateX(-50%)'
      styles.borderTopColor = getArrowColor()
      break
    case 'bottom':
      styles.top = '-18px'
      styles.left = '50%'
      styles.transform = 'translateX(-50%)'
      styles.borderBottomColor = getArrowColor()
      break
    case 'left':
      styles.right = '-18px'    
      styles.top = '50%'
      styles.transform = 'translateY(-50%)'
      styles.borderLeftColor = getArrowColor()
      break
    case 'right':
      styles.left = '-18px'
      styles.top = '50%'
      styles.transform = 'translateY(-50%)'
      styles.borderRightColor = getArrowColor()
      break
  }
  
  return styles
})

function getArrowColor(): string {
  switch (props.theme) {
    case 'light':
      return 'var(--bg-secondary, #ffffff)'
    case 'primary':
      return 'var(--accent-color, #66c0f4)'
    case 'danger':
      return '#ef4444'
    default:
      return 'rgba(0, 0, 0, 0.8)'
  }
}
</script>

<style scoped lang="scss">
.fun-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  max-width: 200px;
  word-break: break-word;
  
  &--top {
    transform: translateX(-50%);
  }
  
  &--bottom {
    transform: translateX(-50%);
  }
  
  &--left {
    left: auto;
    right: 100%;
    transform: translateY(-50%);
  }
  
  &--right {
    left: 100%;
    transform: translateY(-50%);
  }
  
  &--dark {
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
  }
  
  &--light {
    background: var(--bg-secondary, #ffffff);
    color: var(--text-primary, #333333);
    border: 1px solid var(--border-color, #e0e0e0);
  }
  
  &--primary {
    background: var(--accent-color, #66c0f4);
    color: #fff;
  }
  
  &--danger {
    background: rgba(239, 68, 68, 0.9);
    color: #fff;
    border: 1px solid rgba(255, 100, 100, 0.5);
  }
}

.fun-tooltip__arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 10px solid transparent;
  z-index: 1;
}

.fun-tooltip__content {
  line-height: 1.4;
  position: relative;
  z-index: 2;
}

/* 动画效果 */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: all 0.2s ease;
}

.tooltip-fade-enter-from {
  opacity: 0;
}

.tooltip-fade-enter-from.fun-tooltip--top {
  transform: translateX(-50%) translateY(-5px);
}

.tooltip-fade-enter-from.fun-tooltip--bottom {
  transform: translateX(-50%) translateY(5px);
}

.tooltip-fade-enter-from.fun-tooltip--left {
  transform: translateY(-50%) translateX(-5px);
}

.tooltip-fade-enter-from.fun-tooltip--right {
  transform: translateY(-50%) translateX(5px);
}

.tooltip-fade-leave-to {
  opacity: 0;
}

.tooltip-fade-leave-to.fun-tooltip--top {
  transform: translateX(-50%) translateY(-5px);
}

.tooltip-fade-leave-to.fun-tooltip--bottom {
  transform: translateX(-50%) translateY(5px);
}

.tooltip-fade-leave-to.fun-tooltip--left {
  transform: translateY(-50%) translateX(-5px);
}

.tooltip-fade-leave-to.fun-tooltip--right {
  transform: translateY(-50%) translateX(5px);
}
</style>
