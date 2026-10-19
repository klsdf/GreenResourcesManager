<template>
  <div 
    v-if="internalVisible" 
    class="fun-confirm-overlay" 
    @mousedown="handleOverlayMouseDown"
  >
    <div class="fun-confirm-content" @mousedown.stop>
      <div class="fun-confirm__header">
        <div class="fun-confirm__icon">
          <span>❓</span>
        </div>
        <h3 class="fun-confirm__title">{{ internalTitle }}</h3>
      </div>
      <div class="fun-confirm__body">
        <p class="fun-confirm__message">{{ internalMessage }}</p>
      </div>
      <div class="fun-confirm__footer">
        <fun-button 
          class="fun-confirm__button fun-confirm__button--confirm" 
          @click="handleConfirm" 
          ref="confirmButtonRef"
        >
          确定
        </fun-button>
        <fun-button 
          class="fun-confirm__button fun-confirm__button--cancel" 
          @click="handleCancel" 
          ref="cancelButtonRef"
        >
          取消
        </fun-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import FunButton from '../../basic/Button/FunButton.vue'

interface Props {
  /** 是否显示 */
  visible?: boolean
  /** 标题 */
  title?: string
  /** 消息内容 */
  message?: string
  /** 是否默认取消（true: 默认焦点在取消按钮，false: 默认焦点在确定按钮） */
  defaultCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '确认',
  message: '',
  defaultCancel: true
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const internalVisible = ref(false)
const internalTitle = ref('确认')
const internalMessage = ref('')
const internalDefaultCancel = ref(true)
const resolveCallback = ref<((value: boolean) => void) | null>(null)
const confirmButtonRef = ref<InstanceType<typeof FunButton> | null>(null)
const cancelButtonRef = ref<InstanceType<typeof FunButton> | null>(null)

// 支持通过 props 控制
watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    internalVisible.value = true
    internalTitle.value = props.title
    internalMessage.value = props.message
    internalDefaultCancel.value = props.defaultCancel
    document.addEventListener('keydown', handleKeydown)
    // 在下一个 tick 让指定按钮获得焦点
    nextTick(() => {
      focusDefaultButton()
    })
  } else {
    internalVisible.value = false
    document.removeEventListener('keydown', handleKeydown)
  }
})

// 供 ConfirmService 调用的方法
function showConfirm(
  title: string, 
  message: string, 
  resolve?: (value: boolean) => void,
  defaultCancel: boolean = true
) {
  internalTitle.value = title
  internalMessage.value = message
  internalDefaultCancel.value = defaultCancel
  internalVisible.value = true
  resolveCallback.value = resolve || null
  document.addEventListener('keydown', handleKeydown)
  // 在下一个 tick 让指定按钮获得焦点
  nextTick(() => {
    focusDefaultButton()
  })
}

// 聚焦默认按钮
function focusDefaultButton() {
  if (internalDefaultCancel.value) {
    // 默认取消：焦点在取消按钮
    const cancelButton = cancelButtonRef.value?.$el as HTMLButtonElement
    if (cancelButton) {
      cancelButton.focus()
    }
  } else {
    // 默认确定：焦点在确定按钮
    const confirmButton = confirmButtonRef.value?.$el as HTMLButtonElement
    if (confirmButton) {
      confirmButton.focus()
    }
  }
}

function handleConfirm() {
  internalVisible.value = false
  document.removeEventListener('keydown', handleKeydown)
  emit('confirm')
  emit('close')
  // 调用 resolve 回调（如果存在）
  if (resolveCallback.value) {
    resolveCallback.value(true)
    resolveCallback.value = null
  }
}

function handleCancel() {
  internalVisible.value = false
  document.removeEventListener('keydown', handleKeydown)
  emit('cancel')
  emit('close')
  // 调用 resolve 回调（如果存在）
  if (resolveCallback.value) {
    resolveCallback.value(false)
    resolveCallback.value = null
  }
}

/**
 * 处理 overlay 区域的 mousedown 事件
 * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
 */
function handleOverlayMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleCancel()
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 暴露方法供外部调用
defineExpose({
  showConfirm
})
</script>

<style scoped lang="scss">
.fun-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.fun-confirm-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 450px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fun-confirm-slide-in var(--transition-slow) ease-out;
  border: 1px solid var(--border-color);
}

@keyframes fun-confirm-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fun-confirm__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.fun-confirm__icon {
  font-size: var(--font-size-2xl);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  
  span {
    display: block;
  }
}

.fun-confirm__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.fun-confirm__body {
  padding: var(--spacing-2xl);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.fun-confirm__message {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-line;
}

.fun-confirm__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.fun-confirm__button {
  min-width: 80px;
  
  // 确定按钮（次要按钮，在左边）
  &--confirm {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--accent-color);
    }
    
    &:focus-visible {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px var(--accent-color-20);
    }
  }
  
  // 取消按钮（主要按钮，在右边，默认高亮）
  &--cancel {
    background: var(--accent-color);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    &:focus-visible {
      outline: none;
      background: var(--accent-hover);
      box-shadow: 0 0 0 3px var(--accent-color-20), 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fun-confirm-content {
    width: 95%;
    margin: var(--spacing-xl);
  }

  .fun-confirm__header {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  .fun-confirm__body {
    padding: var(--spacing-xl);
  }

  .fun-confirm__footer {
    padding: var(--spacing-md) var(--spacing-xl);
  }
}
</style>
