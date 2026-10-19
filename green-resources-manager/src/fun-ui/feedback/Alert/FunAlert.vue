<template>
  <div 
    v-if="internalVisible" 
    class="fun-alert-overlay" 
    @mousedown="handleOverlayMouseDown"
  >
    <div class="fun-alert-content" @mousedown.stop>
      <div class="fun-alert__header">
        <div class="fun-alert__icon">
          <span v-if="internalType === 'error'">❌</span>
          <span v-else-if="internalType === 'warning'">⚠️</span>
          <span v-else-if="internalType === 'success'">✅</span>
          <span v-else>ℹ️</span>
        </div>
        <h3 class="fun-alert__title">{{ internalTitle }}</h3>
      </div>
      <div class="fun-alert__body">
        <p class="fun-alert__message">{{ internalMessage }}</p>
      </div>
      <div class="fun-alert__footer">
        <fun-button @click="handleConfirm">确定</fun-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import FunButton from '../../basic/Button/FunButton.vue'

type AlertType = 'info' | 'success' | 'warning' | 'error'

interface Props {
  /** 是否显示 */
  visible?: boolean
  /** 标题 */
  title?: string
  /** 消息内容 */
  message?: string
  /** 类型 */
  type?: AlertType
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '提示',
  message: '',
  type: 'info'
})

const emit = defineEmits<{
  confirm: []
  close: []
}>()

const internalVisible = ref(false)
const internalTitle = ref('提示')
const internalMessage = ref('')
const internalType = ref<AlertType>('info')
const resolveCallback = ref<((value?: void) => void) | null>(null)

// 支持通过 props 控制
watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    internalVisible.value = true
    internalTitle.value = props.title
    internalMessage.value = props.message
    internalType.value = props.type
    document.addEventListener('keydown', handleKeydown)
  } else {
    internalVisible.value = false
    document.removeEventListener('keydown', handleKeydown)
  }
})

// 供 AlertService 调用的方法
function showAlert(title: string, message: string, type: AlertType, resolve?: (value?: void) => void) {
  internalTitle.value = title
  internalMessage.value = message
  internalType.value = type
  internalVisible.value = true
  resolveCallback.value = resolve || null
  document.addEventListener('keydown', handleKeydown)
}

function handleConfirm() {
  internalVisible.value = false
  document.removeEventListener('keydown', handleKeydown)
  emit('confirm')
  emit('close')
  // 调用 resolve 回调（如果存在）
  if (resolveCallback.value) {
    resolveCallback.value()
    resolveCallback.value = null
  }
}

/**
 * 处理 overlay 区域的 mousedown 事件
 * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
 */
function handleOverlayMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleConfirm()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleConfirm()
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 暴露方法供外部调用
defineExpose({
  showAlert
})
</script>

<style scoped lang="scss">
.fun-alert-overlay {
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

.fun-alert-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  animation: fun-alert-slide-in var(--transition-slow) ease-out;
  border: 1px solid var(--border-color);
}

@keyframes fun-alert-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fun-alert__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
}

.fun-alert__icon {
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

.fun-alert__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.fun-alert__body {
  padding: var(--spacing-2xl);
}

.fun-alert__message {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-line;
}

.fun-alert__footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-top: 1px solid var(--border-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fun-alert-content {
    width: 95%;
    margin: var(--spacing-xl);
  }

  .fun-alert__header {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  .fun-alert__body {
    padding: var(--spacing-xl);
  }

  .fun-alert__footer {
    padding: var(--spacing-md) var(--spacing-xl);
  }
}
</style>
