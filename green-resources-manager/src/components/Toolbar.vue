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
          {{ item.label }}
        </fun-button>

        <!-- 搜索框 -->
        <div v-else-if="item.type === 'search'" class="search-box">
          <input 
            type="text" 
            :value="searchQuery" 
            @input="handleSearchInput($event, item)"
            :placeholder="item.placeholder"
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
      </template>
    </div>
    
    <div class="toolbar-right">
      <template v-for="item in rightItems" :key="getItemKey(item)">
        <!-- 多选模式按钮 -->
        <fun-button
          v-if="item.type === 'multi-select'"
          :type="isMultiSelectMode ? 'secondary' : 'primary'"
          @click="handleToggleMultiSelect"
        >
          {{ isMultiSelectMode ? '退出多选' : '多选模式' }}
        </fun-button>

        <!-- 布局控制 -->
        <LayoutControl
          v-else-if="item.type === 'layout'"
          :scale="scale"
          @update:scale="handleScaleUpdate"
          @scale-changed="handleScaleChanged"
        />

        <!-- 排序选择器 -->
        <select v-else-if="item.type === 'sort'" :value="sortBy" @change="handleSortChange" class="sort-select">
          <option 
            v-for="option in sortOptions" 
            :key="option.id" 
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
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
    sortBy: {
      type: String,
      default: 'name-asc'
    },
    items: {
      type: Array,
      default: () => []
    },
    sortOptions: {
      type: Array,
      default: () => [
        { id: 'name-asc', label: '按名称排序（升序）' },
        { id: 'name-desc', label: '按名称排序（降序）' },
        { id: 'lastPlayed-asc', label: '按最后游玩时间（升序）' },
        { id: 'lastPlayed-desc', label: '按最后游玩时间（降序）' },
        { id: 'playTime-asc', label: '按游戏时长（升序）' },
        { id: 'playTime-desc', label: '按游戏时长（降序）' },
        { id: 'added-asc', label: '按添加时间（升序）' },
        { id: 'added-desc', label: '按添加时间（降序）' }
      ]
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
    }
  },
  emits: [
    'add-item',
    'add-folder',
    'import-bookmark',
    'update:searchQuery',
    'update:sortBy',
    'sort-changed',
    'update:scale',
    'layout-changed',
    'button-click',
    'search',
    'toggle-multi-select'
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
      if (this.items && this.items.length > 0) {
        return this.items.filter(item => {
          return item.type === 'multi-select' || item.type === 'layout' || item.type === 'sort'
        })
      }
      
      const result = []
      result.push({ type: 'multi-select' })
      if (this.showLayoutControl) {
        result.push({ type: 'layout' })
      }
      if (this.sortOptions && this.sortOptions.length > 0) {
        result.push({ type: 'sort' })
      }
      return result
    }
  },
  data() {
    return {
      isInitializing: true
    }
  },
  watch: {
    sortBy(newValue, oldValue) {
      console.log('🔍 Toolbar sortBy 变化:', oldValue, '→', newValue)
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
    handleSearchInput(event, item) {
      this.$emit('update:searchQuery', event.target.value)
      this.$emit('search', { value: event.target.value, item })
    },
    handleSortChange(event) {
      const newSortBy = event.target.value
      console.log('🔍 Toolbar 用户选择排序:', newSortBy)
      this.$emit('update:sortBy', newSortBy)
      this.$emit('sort-changed', { pageType: this.pageType, sortBy: newSortBy })
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
    console.log('🔍 Toolbar mounted, 初始 sortBy:', this.sortBy)
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

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-select:focus {
  outline: none;
  border-color: var(--accent-color);
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
