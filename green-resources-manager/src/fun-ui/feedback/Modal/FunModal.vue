<template>
  <div
    v-if="modelValue"
    class="fun-modal__overlay"
    @mousedown.self="close"
  >
    <div
      class="fun-modal__content"
      :class="contentClass"
      :style="contentStyle"
      @mousedown.stop
    >
      <div class="fun-modal__header">
        <h3 class="fun-modal__title">{{ title }}</h3>
        <button type="button" class="fun-modal__close" aria-label="关闭" @click="close">✕</button>
      </div>
      <div class="fun-modal__body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="fun-modal__footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 是否显示（v-model） */
  modelValue: boolean
  /** 标题 */
  title?: string
  /** 内容区额外 class（如用于限制宽度） */
  contentClass?: string
  /** 内容区最大宽度，如 '520px'、'90%' */
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  contentClass: '',
  maxWidth: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const contentStyle = computed(() =>
  props.maxWidth ? { maxWidth: props.maxWidth } : undefined
)

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.fun-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.fun-modal__content {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px var(--shadow-dark, rgba(0, 0, 0, 0.2));
}

.fun-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.fun-modal__title {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.fun-modal__close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  line-height: 1;
}

.fun-modal__close:hover {
  color: var(--text-primary);
}

.fun-modal__body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.fun-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
</style>
