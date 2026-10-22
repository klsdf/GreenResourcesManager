<template>
  <div
    v-if="visible"
    class="tag-selection-panel"
    @mousedown.stop
  >
    <div class="tag-panel-header">
      <h4>{{ title || '标签选择' }}</h4>
    </div>
    <div class="tag-panel-body">
      <!-- 搜索框（可选） -->
      <div v-if="showSearch" class="tag-search">
        <input
          type="text"
          v-model="searchQuery"
          :placeholder="searchPlaceholder || '搜索标签...'"
          class="tag-search-input"
        />
      </div>

      <!-- 多区块：每个 FormField_Tags 一个区块，用各自 availableTags 数据源，点击填入对应字段 -->
      <template v-if="tagFields && tagFields.length > 0">
        <div
          v-for="field in tagFields"
          :key="field.key"
          class="tag-list-section"
        >
          <div class="tag-list-title">
            <span>{{ $lt(field.label) }}</span>
            <span class="tag-count-badge">{{ getFilteredAvailableTagsForField(field).length }}</span>
          </div>
          <div v-if="getFilteredAvailableTagsForField(field).length > 0" class="tag-list">
            <button
              v-for="tagItem in getFilteredAvailableTagsForField(field)"
              :key="field.key + '-' + getTagName(tagItem)"
              class="tag-item-btn"
              :class="{ 'tag-item-selected': isTagSelectedInField(tagItem, field.currentTags) }"
              @click="handleTagClickForField(tagItem, field.key)"
            >
              <span class="tag-name">{{ getTagName(tagItem) }}</span>
              <span v-if="getTagCount(tagItem)" class="tag-count">{{ getTagCount(tagItem) }}</span>
              <span v-if="isTagSelectedInField(tagItem, field.currentTags)" class="tag-check">✓</span>
            </button>
          </div>
          <div v-else class="tag-empty-state tag-empty-inline">
            <p>{{ emptyMessage || '暂无可用标签' }}</p>
          </div>
        </div>
      </template>

      <!-- 单区块（兼容旧用法：只传 currentTags + availableTags） -->
      <template v-else>
        <div v-if="filteredAvailableTags && filteredAvailableTags.length > 0" class="tag-list-section">
          <div class="tag-list-title">
            <span>{{ title || '标签选择' }}</span>
            <span class="tag-count-badge">{{ filteredAvailableTags.length }}</span>
          </div>
          <div class="tag-list">
            <button
              v-for="tagItem in filteredAvailableTags"
              :key="getTagName(tagItem)"
              class="tag-item-btn"
              :class="{ 'tag-item-selected': isTagSelected(tagItem) }"
              @click="handleTagClick(tagItem)"
            >
              <span class="tag-name">{{ getTagName(tagItem) }}</span>
              <span v-if="getTagCount(tagItem)" class="tag-count">{{ getTagCount(tagItem) }}</span>
              <span v-if="isTagSelected(tagItem)" class="tag-check">✓</span>
            </button>
          </div>
        </div>

        <div v-else class="tag-empty-state">
          <p>{{ emptyMessage || '暂无可用标签' }}</p>
          <p v-if="availableTags && availableTags.length === 0" class="debug-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px;"> {{ $lt('调试：availableTags 为空数组') }} </p>
          <p v-else-if="!availableTags" class="debug-info" style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px;"> {{ $lt('调试：availableTags 未定义') }} </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref } from 'vue'

export default {
  name: 'TagSelectionPanel',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '标签选择'
    },
    /** 多区块模式：每个 FormField_Tags 一个区块，点击填入对应 key 的字段；每项可带 availableTags 使用各自数据源 */
    tagFields: {
      type: Array as () => { key: string; label: string; currentTags: string[]; availableTags?: (string | { name: string; count?: number })[] }[],
      default: () => []
    },
    /** 单区块模式（与 tagFields 二选一） */
    currentTags: {
      type: Array as () => string[],
      default: () => []
    },
    availableTags: {
      type: Array as () => (string | { name: string; count?: number })[],
      default: () => []
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    searchPlaceholder: {
      type: String,
      default: '搜索标签...'
    },
    emptyMessage: {
      type: String,
      default: '暂无可用标签'
    }
  },
  emits: ['select-tag'],
  setup(props, { emit }) {
    const searchQuery = ref('')

    // 过滤可用标签
    const filteredAvailableTags = computed(() => {
      if (!props.availableTags || props.availableTags.length === 0) {
        return []
      }
      if (!searchQuery.value.trim()) {
        return props.availableTags
      }
      const query = searchQuery.value.toLowerCase().trim()
      return props.availableTags.filter((tag: string | { name: string; count?: number }) => {
        const tagName = typeof tag === 'string' ? tag : tag.name
        return tagName.toLowerCase().includes(query)
      })
    })

    // 获取标签名称
    const getTagName = (tag: string | { name: string; count?: number }): string => {
      return typeof tag === 'string' ? tag : tag.name
    }

    // 获取标签数量
    const getTagCount = (tag: string | { name: string; count?: number }): number | null => {
      return typeof tag === 'object' && tag.count !== undefined ? tag.count : null
    }

    // 检查标签是否已选中（单区块）
    const isTagSelected = (tag: string | { name: string; count?: number }): boolean => {
      const tagName = getTagName(tag)
      return props.currentTags.includes(tagName)
    }

    // 检查标签在指定字段的 currentTags 中是否已选中（多区块）
    const isTagSelectedInField = (tag: string | { name: string; count?: number }, currentTags: string[]): boolean => {
      const tagName = getTagName(tag)
      return Array.isArray(currentTags) && currentTags.includes(tagName)
    }

    // 处理标签点击（单区块）
    const handleTagClick = (tag: string | { name: string; count?: number }) => {
      emit('select-tag', getTagName(tag))
    }

    // 处理标签点击（多区块）：带上 fieldKey，填入对应区域
    const handleTagClickForField = (tag: string | { name: string; count?: number }, fieldKey: string) => {
      emit('select-tag', { fieldKey, tag: getTagName(tag) })
    }

    // 多区块时每个区块用各自数据源，再按搜索过滤
    const getFilteredAvailableTagsForField = (field: { availableTags?: (string | { name: string; count?: number })[] }) => {
      const source = (field.availableTags != null && Array.isArray(field.availableTags)) ? field.availableTags : props.availableTags
      if (!source || source.length === 0) return []
      if (!searchQuery.value.trim()) return source
      const query = searchQuery.value.toLowerCase().trim()
      return source.filter((tag: string | { name: string; count?: number }) => {
        const tagName = typeof tag === 'string' ? tag : tag.name
        return tagName.toLowerCase().includes(query)
      })
    }

    return {
      searchQuery,
      filteredAvailableTags,
      getFilteredAvailableTagsForField,
      getTagName,
      getTagCount,
      isTagSelected,
      isTagSelectedInField,
      handleTagClick,
      handleTagClickForField
    }
  }
}
</script>

<style scoped>
.tag-selection-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: all 0.3s ease;
  flex-shrink: 0;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.tag-panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 1;
}

.tag-panel-header h4 {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  transition: color 0.3s ease;
}

.tag-panel-body {
  padding: 20px;
}

.tag-search {
  margin-bottom: 16px;
}

.tag-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.tag-search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
}

.tag-list-section {
  margin-bottom: 16px;
}

.tag-list-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  font-weight: 500;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-list-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-count-badge {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.tag-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-name {
  flex: 1;
}

.tag-item-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.tag-item-selected {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-color: var(--accent-color);
}

.tag-item-selected:hover {
  background: var(--accent-hover);
}

.tag-count {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.tag-item-selected .tag-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.tag-check {
  font-size: 0.75rem;
  font-weight: bold;
  margin-left: 4px;
}

.tag-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.tag-empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.tag-empty-inline {
  padding: 12px 0;
}
.tag-empty-inline p {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tag-selection-panel {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }
}
</style>

