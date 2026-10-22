<template>
  <div class="fun-notification-container">
    <!-- Toast 通知 -->
    <TransitionGroup name="toast" tag="div" class="fun-notification-list">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['fun-notification-toast', `fun-notification-toast--${toast.type}`, { 'fun-notification-toast--clickable': !!toast.onClick }]"
        @click="handleToastClick(toast)"
      >
        <div class="fun-notification-toast__icon">
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">❌</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else-if="toast.type === 'info'">ℹ️</span>
          <span v-else>📢</span>
        </div>
        <div class="fun-notification-toast__content">
          <div class="fun-notification-toast__title">{{ $lt(toast.title) }}</div>
          <img
            v-if="toast.image"
            class="fun-notification-toast__preview"
            :src="toast.image"
            :alt="$lt('截图预览')"
          />
          <div class="fun-notification-toast__message" v-if="toast.message">{{ $lt(toast.message) }}</div>
        </div>
        <button class="fun-notification-toast__close" @click.stop="removeToast(toast.id)">×</button>
        <div class="fun-notification-toast__progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 导出类型定义
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationOptions {
  type?: NotificationType
  title?: string
  message?: string
  /** 可选的预览图地址。截图成功时用来直接展示刚保存的图片。 */
  image?: string
  duration?: number
  persistent?: boolean
  /** 点击通知正文时执行。关闭按钮不触发，避免点叉时误打开链接。 */
  onClick?: () => void
}

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  /** 预览图地址。没有时不显示图片。 */
  image: string
  duration: number
  timestamp: number
  persistent: boolean
  /** 点击通知正文时执行。没有时点击只停留在界面上。 */
  onClick?: () => void
}

// 数据
const toasts = ref<Notification[]>([])
const nextId = ref(1)

// 显示 Toast 通知
const showToast = (options: NotificationOptions = {}): number => {
  const toast: Notification = {
    id: nextId.value++,
    type: options.type || 'info',
    title: options.title || '通知',
    message: options.message || '',
    image: options.image || '',
    duration: options.duration || 3000,
    timestamp: Date.now(),
    persistent: options.persistent || false,
    onClick: options.onClick
  }

  toasts.value.push(toast)

  // 自动移除（除非是持久化消息）
  if (!toast.persistent) {
    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  return toast.id
}

/**
 * 点击通知正文。
 * 关闭按钮单独处理，这里只负责打开调用方交给通知的动作，例如打开下载页。
 * @param toast 被点击的那条通知
 */
const handleToastClick = (toast: Notification): void => {
  if (typeof toast.onClick === 'function') {
    toast.onClick()
  }
}

// 移除 Toast
const removeToast = (id: number): void => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 便捷方法
const success = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'success', title, message, ...options })
}

const error = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'error', title, message, ...options })
}

const warning = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'warning', title, message, ...options })
}

const info = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'info', title, message, ...options })
}

// 暴露方法给外部调用
defineExpose({
  showToast,
  removeToast,
  success,
  error,
  warning,
  info
})
</script>

<style scoped lang="scss">
.fun-notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;
}

.fun-notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fun-notification-toast--clickable {
  cursor: pointer;
}

.fun-notification-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color, #e0e0e0);
  min-width: 320px;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  transition: all var(--transition-base, 0.3s ease);

  &:hover {
    transform: translateX(-5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }

  &--success {
    border-left: 4px solid #10b981;
  }

  &--error {
    border-left: 4px solid #ef4444;
  }

  &--warning {
    border-left: 4px solid #f59e0b;
  }

  &--info {
    border-left: 4px solid #3b82f6;
  }
}

.fun-notification-toast__icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.fun-notification-toast__content {
  flex: 1;
  min-width: 0;
}

.fun-notification-toast__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #333333);
  margin-bottom: 4px;
  line-height: 1.4;
}

.fun-notification-toast__preview {
  display: block;
  width: 100%;
  max-height: 160px;
  margin: 8px 0;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-tertiary, #f3f3f3);
}

.fun-notification-toast__message {
  font-size: 13px;
  color: var(--text-secondary, #666666);
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-line;
}

.fun-notification-toast__close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-tertiary, #999999);
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base, 0.2s ease);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-primary, #333333);
  }
}

.fun-notification-toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--accent-color, #66c0f4);
  animation: fun-notification-progress linear;
}

@keyframes fun-notification-progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* Toast 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-base, 0.3s ease);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition-base, 0.3s ease);
}

/* 响应式 */
@media (max-width: 768px) {
  .fun-notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .fun-notification-toast {
    min-width: auto;
    max-width: none;
  }
}
</style>
