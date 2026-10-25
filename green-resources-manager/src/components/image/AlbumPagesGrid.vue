<template>
  <div class="pages-section" v-if="pages.length > 0">
    <!-- 分页导航 - 使用 FunPagination 组件 -->
    <FunPagination
      v-if="totalPages > 1"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :pageSize="pageSize"
      :totalItems="pages.length"
      itemType="张"
      @page-change="handlePageChange"
    />
    
    <!-- 图片网格 - 使用 FunGrid 组件 -->
    <FunGrid
      :mode="gridMode"
      :columns="gridColumns"
      :minWidth="150"
      gap="var(--spacing-md, 16px)"
      padding="16px 0"
      :singleColumnOnMobile="thumbnailShape !== 'landscape'"
    >
      <div 
        v-for="(page, idx) in paginatedPages" 
        :key="page" 
        class="page-item"
        :class="{ 'page-item--landscape': thumbnailShape === 'landscape' }"
        @click="handlePageClick(idx)"
      >
        <img 
          :src="resolveImage(page)" 
          :alt="'Page ' + (currentPageStartIndex + idx + 1)" 
          @error="handleImageError"
          loading="lazy"
          decoding="async"
          class="preview-thumbnail"
        >
        <div class="page-index">{{ currentPageStartIndex + idx + 1 }}</div>
      </div>
    </FunGrid>
  </div>
</template>

<script lang="ts">
import { computed, type PropType } from 'vue'
import FunPagination from '../../fun-ui/navigation/Pagination/FunPagination.vue'
import FunGrid from '../../fun-ui/layout/Grid/FunGrid.vue'

export default {
  name: 'AlbumPagesGrid',
  components: {
    FunPagination,
    FunGrid
  },
  props: {
    pages: {
      type: Array as PropType<string[]>,
      required: true
    },
    currentPage: {
      type: Number,
      required: true
    },
    pageSize: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    resolveImage: {
      type: Function as PropType<(path: string) => string>,
      required: true
    },
    handleImageError: {
      type: Function as PropType<(event: Event) => void>,
      required: true
    },
    /**
     * 缩略图框的形状。
     * 漫画页是竖图，继续用 2:3。游戏截图一般是 16:9，用竖框会被裁掉左右，看起来又窄又高。
     */
    thumbnailShape: {
      type: String as PropType<'portrait' | 'landscape'>,
      default: 'portrait'
    }
  },
  emits: ['page-click', 'page-change'],
  setup(props, { emit }) {
    const currentPageStartIndex = computed(() => {
      return (props.currentPage - 1) * props.pageSize
    })

    const paginatedPages = computed(() => {
      if (!props.pages || props.pages.length === 0) return []
      const start = currentPageStartIndex.value
      const end = start + props.pageSize
      return props.pages.slice(start, end)
    })

    const handlePageClick = (index: number) => {
      emit('page-click', index)
    }

    const handlePageChange = (page: number) => {
      emit('page-change', page)
    }

    /**
     * 截图固定 5 列。列宽按容器均分，不够 5 张时也不会把单张拉满整行。
     * 漫画页继续按最小宽度自动换行。
     */
    const gridMode = computed(() => (props.thumbnailShape === 'landscape' ? 'fixed' : 'auto-fill'))

    /** 横图一行最多 5 张。竖图不使用固定列数。 */
    const gridColumns = computed(() => (props.thumbnailShape === 'landscape' ? 5 : undefined))

    return {
      currentPageStartIndex,
      paginatedPages,
      handlePageClick,
      handlePageChange,
      gridMode,
      gridColumns
    }
  }
}
</script>

<style scoped>
.pages-section {
  margin-top: 20px;
}

.page-item {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: var(--bg-secondary, #f5f5f5);
}

.page-item:hover {
  border-color: var(--primary-color, #007bff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 游戏截图按 16:9 横图显示，不再套用漫画页的 2:3 竖框 */
.page-item--landscape {
  aspect-ratio: 16 / 9;
}

.preview-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-index {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}
</style>

