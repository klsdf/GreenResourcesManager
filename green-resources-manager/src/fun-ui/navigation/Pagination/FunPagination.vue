<template>
  <div
    class="fun-pagination"
    :class="{ 'fun-pagination--with-actions': hasActions }"
    v-if="showPagination"
  >
    <span v-if="hasPageInfo" class="fun-pagination__summary">
      {{ $lt('显示第') }} {{ currentPageStartIndex + 1 }} - {{ Math.min(currentPageStartIndex + pageSize, totalItems) }}
      {{ $lt('个，共') }} {{ totalItems }} {{ $lt('个') }}{{ itemType }}
    </span>
    <div v-if="hasPageInfo" class="fun-pagination__controls">
      <fun-button
        class="fun-pagination__button fun-pagination__button--first"
        :disabled="currentPage <= 1"
        @click="handleFirstPage"
      > {{ $lt('回到首页') }} </fun-button>
      <fun-button
        class="fun-pagination__button fun-pagination__button--prev"
        :disabled="currentPage <= 1"
        @click="handlePreviousPage"
      > {{ $lt('◀ 上一页') }} </fun-button>
      <div class="fun-pagination__jump" :title="$lt('输入页码后按回车跳转')">
        <input
          type="number"
          v-model.number="jumpToPageInput"
          :min="1"
          :max="totalPages"
          @keyup.enter="handleJumpToPage"
          @blur="handleJumpToPage"
          class="fun-pagination__jump-input"
          :aria-label="$lt('页码')"
        >
        <span class="fun-pagination__jump-total">{{ $lt('页') }} / {{ totalPages }} {{ $lt('页') }}</span>
      </div>
      <fun-button
        class="fun-pagination__button fun-pagination__button--next"
        :disabled="currentPage >= totalPages"
        @click="handleNextPage"
      > {{ $lt('下一页 ▶') }} </fun-button>
      <fun-button
        class="fun-pagination__button fun-pagination__button--last"
        :disabled="currentPage >= totalPages"
        @click="handleLastPage"
      > {{ $lt('回到尾页') }} </fun-button>
    </div>
    <div v-if="hasActions" class="fun-pagination__actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useSlots } from 'vue'

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

const slots = useSlots()
const hasPageInfo = computed(() => props.totalPages > 0 && props.totalItems > 0)
const hasActions = computed(() => !!slots.actions)
// 没有条目但右侧还有显示方式、排序时，这条也要留着
const showPagination = computed(() => hasPageInfo.value || hasActions.value)

const jumpToPageInput = ref(props.currentPage)

// 当前页的起始索引
const currentPageStartIndex = computed(() => {
  return (props.currentPage - 1) * props.pageSize
})

// 监听当前页变化，同步更新输入框
watch(() => props.currentPage, (newPage) => {
  jumpToPageInput.value = newPage
}, { immediate: true })

/**
 * 回到第一页。
 * 已经在第一页时不再通知外面，避免把同一页再刷一遍。
 */
function handleFirstPage() {
  if (props.currentPage > 1) {
    emit('page-change', 1)
  }
}

/**
 * 往前翻一页。
 */
function handlePreviousPage() {
  if (props.currentPage > 1) {
    emit('page-change', props.currentPage - 1)
  }
}

/**
 * 往后翻一页。
 */
function handleNextPage() {
  if (props.currentPage < props.totalPages) {
    emit('page-change', props.currentPage + 1)
  }
}

/**
 * 回到最后一页。
 * 已经在最后一页时不再通知外面。
 */
function handleLastPage() {
  if (props.currentPage < props.totalPages) {
    emit('page-change', props.totalPages)
  }
}

// 跳转到指定页
function handleJumpToPage() {
  const pageNum = Math.round(Number(jumpToPageInput.value))
  if (pageNum >= 1 && pageNum <= props.totalPages) {
    if (pageNum !== props.currentPage) {
      emit('page-change', pageNum)
    }
    return
  }
  // 输入超出范围或不是数字时回到当前页
  jumpToPageInput.value = props.currentPage
}
</script>

<style scoped lang="scss">
/*
 * 左范围、中间翻页、右显示设置，三栏等宽让翻页停在整条的正中间。
 * 右侧没有内容时中间这一栏依然居中。
 */
.fun-pagination {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding: 8px var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.fun-pagination__summary {
  grid-column: 1;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fun-pagination__controls {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.fun-pagination__actions {
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  min-width: 0;
}

.fun-pagination__button {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  font-weight: 500;
  padding: 6px 14px;
  font-size: var(--font-size-sm);

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
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.fun-pagination__jump-input {
  width: 64px;
  box-sizing: border-box;
  padding: 6px var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-align: center;
  font-size: var(--font-size-sm, 0.875rem);
  line-height: 1.2;
  outline: none;
  transition: border-color var(--transition-base);

  &:focus {
    border-color: var(--accent-color);
  }

  /* 去掉数字输入框右侧的上下箭头，这一行里只保留输入和总页数 */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  -moz-appearance: textfield;
}

.fun-pagination__jump-total {
  white-space: nowrap;
}

/* 窗口变窄时仍保持一行：隐藏范围文字，右侧设置贴着翻页排 */
@media (max-width: 1100px) {
  .fun-pagination__summary {
    display: none;
  }
}

@media (max-width: 1000px) {
  .fun-pagination {
    display: flex;
    justify-content: space-between;
  }

  .fun-pagination:not(.fun-pagination--with-actions) .fun-pagination__controls {
    margin: 0 auto;
  }
}
</style>
