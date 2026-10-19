<template>
  <div class="fun-pagination" v-if="totalPages > 0 && totalItems > 0">
    <div class="fun-pagination__info">
      <span class="fun-pagination__info-text">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      <span class="fun-pagination__info-range">
        显示第 {{ currentPageStartIndex + 1 }} - {{ Math.min(currentPageStartIndex + pageSize, totalItems) }} 个，共 {{ totalItems }} 个{{ itemType }}
      </span>
    </div>
    <div class="fun-pagination__controls">
      <fun-button 
        class="fun-pagination__button fun-pagination__button--prev"
        :disabled="currentPage <= 1"
        @click="handlePreviousPage"
      >
        ◀ 上一页
      </fun-button>
      <div class="fun-pagination__jump">
        <input 
          type="number" 
          v-model.number="jumpToPageInput" 
          :min="1" 
          :max="totalPages"
          @keyup.enter="handleJumpToPage"
          class="fun-pagination__jump-input"
          placeholder="页码"
        >
        <fun-button 
          class="fun-pagination__jump-button"
          @click="handleJumpToPage"
        >
          跳转
        </fun-button>
      </div>
      <fun-button 
        class="fun-pagination__button fun-pagination__button--next"
        :disabled="currentPage >= totalPages"
        @click="handleNextPage"
      >
        下一页 ▶
      </fun-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  /** 当前页码 */
  currentPage: number
  /** 总页数 */
  totalPages: number
  /** 每页显示数量 */
  pageSize: number
  /** 总项目数 */
  totalItems: number
  /** 项目类型（用于显示文本，如"漫画"、"视频"等） */
  itemType?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemType: '项目'
})

const emit = defineEmits<{
  'page-change': [page: number]
}>()

const jumpToPageInput = ref(props.currentPage)

// 当前页的起始索引
const currentPageStartIndex = computed(() => {
  return (props.currentPage - 1) * props.pageSize
})

// 监听当前页变化，同步更新输入框
watch(() => props.currentPage, (newPage) => {
  jumpToPageInput.value = newPage
}, { immediate: true })

// 上一页
function handlePreviousPage() {
  if (props.currentPage > 1) {
    emit('page-change', props.currentPage - 1)
  }
}

// 下一页
function handleNextPage() {
  if (props.currentPage < props.totalPages) {
    emit('page-change', props.currentPage + 1)
  }
}

// 跳转到指定页
function handleJumpToPage() {
  const pageNum = jumpToPageInput.value
  if (pageNum >= 1 && pageNum <= props.totalPages) {
    emit('page-change', pageNum)
  }
}
</script>

<style scoped lang="scss">
.fun-pagination {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.fun-pagination__info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.fun-pagination__info-text {
  display: inline-block;
}

.fun-pagination__info-range {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.fun-pagination__controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-md);
}

.fun-pagination__button {
  background: var(--accent-color);
  color: white;
  font-weight: 500;
  
  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  
  &:disabled {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
}

.fun-pagination__jump {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.fun-pagination__jump-input {
  width: 80px;
  box-sizing: border-box;
  padding: 10px var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-align: center;
  font-size: var(--font-size-base, 1rem);
  line-height: 1.2;
  outline: none;
  transition: border-color var(--transition-base);
  
  &:focus {
    border-color: var(--accent-color);
  }
}

.fun-pagination__jump-button {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

  
  &:hover {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .fun-pagination__info {
    flex-direction: column;
    gap: var(--spacing-xs);
    text-align: center;
  }
  
  .fun-pagination__controls {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  
  .fun-pagination__jump {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}
</style>
