<template>
  <div 
    v-if="internalVisible" 
    class="bookmark-import-overlay" 
    @mousedown="handleOverlayMouseDown"
  >
    <div class="bookmark-import-content" @mousedown.stop>
      <div class="bookmark-import__header">
        <div class="bookmark-import__icon">
          <span>🔖</span>
        </div>
        <h3 class="bookmark-import__title">导入书签</h3>
      </div>
      <div class="bookmark-import__body">
        <div v-if="!fileSelected" class="bookmark-import__upload">
          <div class="bookmark-import__upload-area" @click="triggerFileInput">
            <input 
              ref="fileInput" 
              type="file" 
              accept=".html"
              class="bookmark-import__file-input"
              @change="handleFileSelect"
            />
            <div class="bookmark-import__upload-icon">📁</div>
            <h4 class="bookmark-import__upload-title">选择书签文件</h4>
            <p class="bookmark-import__upload-description">
              从浏览器导出的HTML格式书签文件
            </p>
          </div>
        </div>
        <div v-else-if="isLoading" class="bookmark-import__loading">
          <div class="bookmark-import__loading-spinner"></div>
          <p class="bookmark-import__loading-text">正在解析书签文件...</p>
        </div>
        <div v-else-if="error" class="bookmark-import__error">
          <div class="bookmark-import__error-icon">❌</div>
          <p class="bookmark-import__error-text">{{ error }}</p>
          <button class="bookmark-import__retry-button" @click="reset">重试</button>
        </div>
        <div v-else-if="bookmarks.length === 0" class="bookmark-import__empty">
          <div class="bookmark-import__empty-icon">📭</div>
          <p class="bookmark-import__empty-text">未找到书签</p>
        </div>
        <div v-else>
          <div class="bookmark-import__header-row">
            <label class="bookmark-import__select-all">
              <input 
                type="checkbox" 
                v-model="isAllSelected"
                class="bookmark-import__checkbox"
              />
              <span class="bookmark-import__select-all-text">全选</span>
            </label>
            <span class="bookmark-import__count">{{ selectedBookmarks.length }}/{{ bookmarks.length }}</span>
          </div>
          <div class="bookmark-import__bookmark-list">
            <label 
              v-for="(bookmark, index) in bookmarks" 
              :key="index"
              class="bookmark-import__bookmark-item"
            >
              <input 
                type="checkbox" 
                v-model="selectedBookmarks" 
                :value="bookmark"
                class="bookmark-import__checkbox"
              />
              <div class="bookmark-import__bookmark-info">
                <div class="bookmark-import__bookmark-name">{{ bookmark.name }}</div>
                <div class="bookmark-import__bookmark-url">{{ bookmark.url }}</div>
                <div v-if="bookmark.tags && bookmark.tags.length > 0" class="bookmark-import__bookmark-tags">
                  <span v-for="(tag, tagIndex) in bookmark.tags" :key="tagIndex" class="bookmark-import__tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div class="bookmark-import__footer">
        <fun-button 
          class="bookmark-import__button bookmark-import__button--cancel" 
          @click="handleCancel"
        >
          取消
        </fun-button>
        <fun-button 
          class="bookmark-import__button bookmark-import__button--confirm" 
          @click="handleConfirm"
          :disabled="selectedBookmarks.length === 0"
        >
          导入 ({{ selectedBookmarks.length }})
        </fun-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import FunButton from '../fun-ui/basic/Button/FunButton.vue'
import { parseBookmarkFromFile, deduplicateBookmarks, type ParsedBookmark } from '../utils/BookmarkParser.ts'

interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

const emit = defineEmits<{
  close: []
  confirm: [bookmarks: ParsedBookmark[]]
}>()

const internalVisible = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const fileSelected = ref(false)
const isLoading = ref(false)
const error = ref('')
const bookmarks = ref<ParsedBookmark[]>([])
const selectedBookmarks = ref<ParsedBookmark[]>([])

const isAllSelected = computed({
  get: () => {
    return bookmarks.value.length > 0 && selectedBookmarks.value.length === bookmarks.value.length
  },
  set: (value) => {
    if (value) {
      selectedBookmarks.value = [...bookmarks.value]
    } else {
      selectedBookmarks.value = []
    }
  }
})

watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    internalVisible.value = true
    document.addEventListener('keydown', handleKeydown)
  } else {
    internalVisible.value = false
    document.removeEventListener('keydown', handleKeydown)
  }
}, { immediate: true })

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    return
  }
  
  const file = files[0]
  fileSelected.value = true
  isLoading.value = true
  error.value = ''
  
  try {
    const parsedBookmarks = await parseBookmarkFromFile(file)
    const uniqueBookmarks = deduplicateBookmarks(parsedBookmarks)
    bookmarks.value = uniqueBookmarks
    selectedBookmarks.value = []
  } catch (err) {
    error.value = err instanceof Error ? err.message : '解析书签文件失败'
    bookmarks.value = []
    selectedBookmarks.value = []
  } finally {
    isLoading.value = false
  }
}

function handleCancel() {
  reset()
  internalVisible.value = false
  emit('close')
  document.removeEventListener('keydown', handleKeydown)
}

function handleConfirm() {
  internalVisible.value = false
  emit('confirm', selectedBookmarks.value)
  document.removeEventListener('keydown', handleKeydown)
  reset()
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

function reset() {
  fileSelected.value = false
  isLoading.value = false
  error.value = ''
  bookmarks.value = []
  selectedBookmarks.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose({
  reset
})
</script>

<style scoped lang="scss">
.bookmark-import-overlay {
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

.bookmark-import-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: bookmark-import-slide-in var(--transition-slow) ease-out;
  border: 1px solid var(--border-color);
}

@keyframes bookmark-import-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.bookmark-import__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.bookmark-import__icon {
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

.bookmark-import__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.bookmark-import__body {
  padding: var(--spacing-2xl);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.bookmark-import__upload {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-2xl);
}

.bookmark-import__upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3xl);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 100%;
  
  &:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }
}

.bookmark-import__file-input {
  display: none;
}

.bookmark-import__upload-icon {
  font-size: var(--font-size-4xl);
  margin-bottom: var(--spacing-md);
}

.bookmark-import__upload-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.bookmark-import__upload-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

.bookmark-import__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
}

.bookmark-import__loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-tertiary);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.bookmark-import__loading-text {
  color: var(--text-primary);
  font-size: var(--font-size-base);
}

.bookmark-import__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
}

.bookmark-import__error-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--spacing-md);
}

.bookmark-import__error-text {
  color: var(--text-danger);
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-md);
  line-height: 1.5;
}

.bookmark-import__retry-button {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
  
  &:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-color);
  }
}

.bookmark-import__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
}

.bookmark-import__empty-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.bookmark-import__empty-text {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

.bookmark-import__header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.bookmark-import__select-all {
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

.bookmark-import__select-all-text {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 500;
}

.bookmark-import__count {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  background: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
}

.bookmark-import__bookmark-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 400px;
  overflow-y: auto;
}

.bookmark-import__bookmark-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.bookmark-import__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}

.bookmark-import__bookmark-info {
  flex: 1;
  min-width: 0;
}

.bookmark-import__bookmark-name {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  word-break: break-all;
}

.bookmark-import__bookmark-url {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
  word-break: break-all;
  line-height: 1.4;
}

.bookmark-import__bookmark-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.bookmark-import__tag {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
}

.bookmark-import__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.bookmark-import__button {
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
    
    &:disabled {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      cursor: not-allowed;
      
      &:hover {
        transform: none;
        box-shadow: none;
      }
    }
  }
}
</style>