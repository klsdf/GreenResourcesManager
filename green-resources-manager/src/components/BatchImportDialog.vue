<template>
  <div 
    v-if="internalVisible" 
    class="batch-import-overlay" 
    @mousedown="handleOverlayMouseDown"
  >
    <div class="batch-import-content" @mousedown.stop>
      <div class="batch-import__header">
        <div class="batch-import__icon">
          <span>📥</span>
        </div>
        <h3 class="batch-import__title">批量导入本地资源</h3>
      </div>
      <div class="batch-import__body">
        <div v-if="files.length === 0" class="batch-import__empty">
          没有找到匹配的文件
        </div>
        <div v-else class="batch-import__file-list">
          <label 
            v-for="(file, index) in files" 
            :key="index"
            class="batch-import__file-item"
          >
            <input 
              type="checkbox" 
              v-model="selectedFiles" 
              :value="file"
              class="batch-import__checkbox"
            />
            <span class="batch-import__filename">{{ file }}</span>
          </label>
        </div>
      </div>
      <div class="batch-import__footer">
        <fun-button 
          class="batch-import__button batch-import__button--cancel" 
          @click="handleCancel"
        >
          取消
        </fun-button>
        <fun-button 
          class="batch-import__button batch-import__button--confirm" 
          @click="handleConfirm"
        >
          确认
        </fun-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import FunButton from '../fun-ui/basic/Button/FunButton.vue'

interface Props {
  visible?: boolean
  files?: string[]
  folderPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  files: () => [],
  folderPath: ''
})

const emit = defineEmits<{
  close: []
  confirm: [files: string[], folderPath: string]
}>()

const internalVisible = ref(false)
const selectedFiles = ref<string[]>([])

watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    internalVisible.value = true
    selectedFiles.value = []
    document.addEventListener('keydown', handleKeydown)
  } else {
    internalVisible.value = false
    document.removeEventListener('keydown', handleKeydown)
  }
})

function showDialog(files: string[], folderPath: string) {
  internalVisible.value = true
  selectedFiles.value = []
  document.addEventListener('keydown', handleKeydown)
}

function handleCancel() {
  internalVisible.value = false
  emit('close')
  document.removeEventListener('keydown', handleKeydown)
}

function handleConfirm() {
  internalVisible.value = false
  emit('confirm', selectedFiles.value, props.folderPath)
  document.removeEventListener('keydown', handleKeydown)
}

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

defineExpose({
  showDialog
})
</script>

<style scoped lang="scss">
.batch-import-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  backdrop-filter: blur(4px);
}

.batch-import-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: batch-import-slide-in var(--transition-slow) ease-out;
  border: 1px solid var(--border-color);
}

@keyframes batch-import-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.batch-import__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.batch-import__icon {
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

.batch-import__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.batch-import__body {
  padding: var(--spacing-2xl);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.batch-import__empty {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-2xl);
}

.batch-import__file-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.batch-import__file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.batch-import__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.batch-import__filename {
  flex: 1;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  word-break: break-all;
}

.batch-import__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.batch-import__button {
  min-width: 80px;
  
  // 取消按钮
  &--cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--accent-color);
    }
  }
  
  // 确认按钮
  &--confirm {
    background: var(--accent-color);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
}
</style>
