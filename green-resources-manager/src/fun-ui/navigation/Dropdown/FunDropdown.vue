<template>
  <div 
    class="fun-dropdown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="fun-dropdown-trigger" @click="handleTriggerClick">
      <slot name="trigger">
        <button type="button" class="fun-dropdown-trigger-btn">
          {{ triggerText }}
        </button>
      </slot>
    </div>
    <Transition name="fun-dropdown">
      <div
        v-if="isOpen"
        class="fun-dropdown-menu"
        :class="menuClass"
        @click="handleMenuClick"
      >
        <slot>
          <button
            v-for="item in items"
            :key="item.value || item.key || item.id"
            class="fun-dropdown-item"
            :class="{ 'is-selected': isItemSelected(item) }"
            @click="handleItemClick(item)"
          >
            <span v-if="item.icon" class="fun-dropdown-item-icon">{{ item.icon }}</span>
            <span class="fun-dropdown-item-label">{{ item.label || item.text || item.name }}</span>
          </button>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface DropdownItem {
  value?: string | number
  key?: string | number
  id?: string | number
  label?: string
  text?: string
  name?: string
  icon?: string
  disabled?: boolean
  [key: string]: any
}

interface Props {
  items?: DropdownItem[]
  modelValue?: string | number
  triggerText?: string
  placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end'
  trigger?: 'hover' | 'click'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  triggerText: 'Select',
  placement: 'bottom',
  trigger: 'hover',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [item: DropdownItem]
  'open': []
  'close': []
}>()

const isOpen = ref(false)
let closeTimeout: number | null = null

const menuClass = computed(() => {
  return [
    `fun-dropdown-menu--${props.placement}`
  ]
})

function isItemSelected(item: DropdownItem): boolean {
  const value = item.value || item.key || item.id
  return value === props.modelValue
}

function handleTriggerClick() {
  if (props.disabled) return
  
  if (props.trigger === 'click') {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      emit('open')
    } else {
      emit('close')
    }
  }
}

function handleMenuClick(e: MouseEvent) {
  e.stopPropagation()
}

function handleMouseEnter() {
  if (props.disabled) return
  if (props.trigger === 'hover') {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      closeTimeout = null
    }
    openDropdown()
  }
}

function handleMouseLeave() {
  if (props.trigger === 'hover') {
    closeTimeout = window.setTimeout(() => {
      closeDropdown()
      closeTimeout = null
    }, 100)
  }
}

function handleItemClick(item: DropdownItem) {
  if (item.disabled) return
  
  const value = item.value || item.key || item.id
  if (value !== undefined) {
    emit('update:modelValue', value)
  }
  emit('change', item)
  
  isOpen.value = false
  emit('close')
}

function openDropdown() {
  if (props.disabled) return
  isOpen.value = true
  emit('open')
}

function closeDropdown() {
  isOpen.value = false
  emit('close')
}

defineExpose({
  open: openDropdown,
  close: closeDropdown,
  toggle: () => {
    if (isOpen.value) {
      closeDropdown()
    } else {
      openDropdown()
    }
  }
})
</script>

<style scoped lang="scss">
.fun-dropdown {
  position: relative;
  display: inline-flex;
}

.fun-dropdown::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 20px;
  pointer-events: none;
}

.fun-dropdown-trigger {
  display: inline-flex;
}

.fun-dropdown-trigger-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.88);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  font-family: inherit;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
}

.fun-dropdown-menu {
  position: absolute;
  margin-top: 6px;
  min-width: 120px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 10002;
  border: 1px solid #e2e8f0;
}

.fun-dropdown-menu--bottom {
  top: 100%;
  left: 50%;
}

.fun-dropdown-menu--bottom-start {
  top: 100%;
  left: 0;
}

.fun-dropdown-menu--bottom-end {
  top: 100%;
  right: 0;
}

.fun-dropdown-menu--top {
  bottom: 100%;
  left: 50%;
  margin-bottom: 6px;
  margin-top: 0;
}

.fun-dropdown-menu--top-start {
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  margin-top: 0;
}

.fun-dropdown-menu--top-end {
  bottom: 100%;
  right: 0;
  margin-bottom: 6px;
  margin-top: 0;
}

.fun-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  font-size: 0.95rem;
  color: #334155;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #f1f5f9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.is-selected {
    background: rgba(242, 144, 255, 0.1);
    color: #f290ff;
  }
}

.fun-dropdown-item-icon {
  font-size: 1rem;
}

.fun-dropdown-item-label {
  flex: 1;
}

.fun-dropdown-enter-active,
.fun-dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fun-dropdown-menu--bottom {
  transform: translateX(-50%);
}

.fun-dropdown-menu--bottom.fun-dropdown-enter-from,
.fun-dropdown-menu--bottom.fun-dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.fun-dropdown-menu--top {
  transform: translateX(-50%);
}

.fun-dropdown-menu--top.fun-dropdown-enter-from,
.fun-dropdown-menu--top.fun-dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.fun-dropdown-menu--bottom-start.fun-dropdown-enter-from,
.fun-dropdown-menu--bottom-start.fun-dropdown-leave-to,
.fun-dropdown-menu--bottom-end.fun-dropdown-enter-from,
.fun-dropdown-menu--bottom-end.fun-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fun-dropdown-menu--top-start.fun-dropdown-enter-from,
.fun-dropdown-menu--top-start.fun-dropdown-leave-to,
.fun-dropdown-menu--top-end.fun-dropdown-enter-from,
.fun-dropdown-menu--top-end.fun-dropdown-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
