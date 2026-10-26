<template>
  <div class="game-toolbar">
    <div class="toolbar-left">
      <template v-for="item in leftItems" :key="getItemKey(item)">
        <!-- 按钮 -->
        <fun-button
          v-if="item.type === 'button'"
          :type="item.buttonType || 'primary'"
          :icon="item.icon"
          @click="handleButtonClick(item)"
        >
          {{ $lt(item.label) }}
        </fun-button>

        <!-- 搜索框 -->
        <div v-else-if="item.type === 'search'" class="search-box">
          <input 
            type="text" 
            :value="searchQuery" 
            @input="handleSearchInput($event, item)"
            :placeholder="$lt(item.placeholder)"
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
      </template>
    </div>
    
    <div class="toolbar-right">
      <template v-for="item in rightItems" :key="getItemKey(item)">
        <!-- 多选时，先给当前页和全部结果的勾选，再放退出。顺序从左到右。 -->
        <template v-if="item.type === 'multi-select'">
          <fun-button
            v-if="isMultiSelectMode"
            type="secondary"
            @click="handleSelectCurrentPage"
          >
            {{ $lt('选择当前页全部') }}
          </fun-button>
          <fun-button
            v-if="isMultiSelectMode"
            type="secondary"
            @click="handleSelectAll"
          >
            {{ $lt('选择全部') }}
          </fun-button>
          <fun-button
            :type="isMultiSelectMode ? 'secondary' : 'primary'"
            @click="handleToggleMultiSelect"
          >
            {{ isMultiSelectMode ? $lt('退出多选') : $lt('多选模式') }}
          </fun-button>
        </template>

        <!-- 布局控制 -->
        <LayoutControl
          v-else-if="item.type === 'layout' && displayMode !== 'list'"
          :scale="scale"
          @update:scale="handleScaleUpdate"
          @scale-changed="handleScaleChanged"
        />
      </template>
    </div>
  </div>
</template>

<script>
import LayoutControl from './LayoutControl.vue'
import saveManager from '../utils/SaveManager.ts'

export default {
  name: 'Toolbar',
  components: {
    LayoutControl
  },
  props: {
    searchQuery: {
      type: String,
      default: ''
    },
    items: {
      type: Array,
      default: () => []
    },
    scale: {
      type: Number,
      default: 100
    },
    showLayoutControl: {
      type: Boolean,
      default: false
    },
    pageType: {
      type: String,
      default: ''
    },
    addButtonText: {
      type: String,
      default: ''
    },
    addFolderButtonText: {
      type: String,
      default: ''
    },
    importBookmarkButtonText: {
      type: String,
      default: ''
    },
    searchPlaceholder: {
      type: String,
      default: ''
    },
    isMultiSelectMode: {
      type: Boolean,
      default: false
    },
    /** 当前显示方式：grid 是网格，list 是列表 */
    displayMode: {
      type: String,
      default: 'grid'
    }
  },
  emits: [
    'add-item',
    'add-folder',
    'import-bookmark',
    'update:searchQuery',
    'update:scale',
    'layout-changed',
    'button-click',
    'search',
    'toggle-multi-select',
    'select-current-page',
    'select-all'
  ],
  computed: {
    leftItems() {
      if (this.items && this.items.length > 0) {
        return this.items.filter(item => {
          return item.type === 'button' || item.type === 'search'
        })
      }
      
      const result = []
      if (this.addButtonText) {
        result.push({
          type: 'button',
          label: this.addButtonText,
          action: 'add-item',
          icon: '➕',
          buttonType: 'primary'
        })
      }
      if (this.addFolderButtonText) {
        result.push({
          type: 'button',
          label: this.addFolderButtonText,
          action: 'add-folder',
          icon: '📁',
          buttonType: 'secondary'
        })
      }
      if (this.importBookmarkButtonText) {
        result.push({
          type: 'button',
          label: this.importBookmarkButtonText,
          action: 'import-bookmark',
          icon: '📑',
          buttonType: 'secondary'
        })
      }
      if (this.searchPlaceholder) {
        result.push({
          type: 'search',
          placeholder: this.searchPlaceholder,
          action: 'search'
        })
      }
      return result
    },
    rightItems() {
      // 排序和网格 / 列表切换已经移到分页条右侧
      if (this.items && this.items.length > 0) {
        return this.items.filter(item => item.type === 'multi-select' || item.type === 'layout')
      }

      const result = [{ type: 'multi-select' }]
      if (this.showLayoutControl) {
        result.push({ type: 'layout' })
      }
      return result
    }
  },
  data() {
    return {
      isInitializing: true
    }
  },
  methods: {
    getItemKey(item) {
      if (item.type === 'button') {
        return `button-${item.action}`
      }
      if (item.type === 'search') {
        return `search-${item.action}`
      }
      return item.type
    },
    handleButtonClick(item) {
      console.log(`🔘 Toolbar 按钮被点击: ${item.label}, action: ${item.action}`)
      this.$emit('button-click', item)
      
      if (item.action === 'add-item') {
        this.$emit('add-item')
      } else if (item.action === 'add-folder') {
        this.$emit('add-folder')
      } else if (item.action === 'import-bookmark') {
        this.$emit('import-bookmark')
      }
    },
    handleToggleMultiSelect() {
      this.$emit('toggle-multi-select')
    },
    /**
     * 通知页面勾选当前这一页。
     */
    handleSelectCurrentPage() {
      this.$emit('select-current-page')
    },
    /**
     * 通知页面勾选当前名单里的全部资源。
     */
    handleSelectAll() {
      this.$emit('select-all')
    },
    handleSearchInput(event, item) {
      this.$emit('update:searchQuery', event.target.value)
      this.$emit('search', { value: event.target.value, item })
    },
    handleScaleUpdate(newScale) {
      this.$emit('update:scale', newScale)
    },
    async handleScaleChanged(newScale) {
      if (!this.isInitializing && this.pageType) {
        try {
          await saveManager.saveLayoutSetting(this.pageType, newScale)
          console.log(`✅ 已保存${this.pageType}页面布局缩放:`, newScale)
          this.$emit('layout-changed', { pageType: this.pageType, scale: newScale })
        } catch (error) {
          console.warn('保存布局缩放失败:', error)
        }
      }
    },
    async loadLayoutSetting() {
      if (!this.pageType) {
        this.isInitializing = false
        return
      }
      
      try {
        this.isInitializing = true
        const savedScale = await saveManager.getLayoutSetting(this.pageType)
        if (savedScale !== undefined && savedScale !== null && savedScale !== this.scale) {
          console.log(`✅ 已加载${this.pageType}页面布局缩放:`, savedScale)
          this.$emit('update:scale', savedScale)
        }
      } catch (error) {
        console.warn('加载布局缩放失败:', error)
      } finally {
        await this.$nextTick()
        this.isInitializing = false
      }
    }
  },
  async mounted() {
    if (this.showLayoutControl && this.pageType) {
      await this.loadLayoutSetting()
    } else {
      this.isInitializing = false
    }
  }
}
</script>

<style scoped>
/* 工具栏样式 */
.game-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 15px;
}


.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 14px 35px 14px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  width: 250px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.search-icon {
  position: absolute;
  right: 10px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar-left {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>
