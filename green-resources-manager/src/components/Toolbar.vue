<template>
  <div class="game-toolbar">
    <div class="toolbar-left">
      <fun-button
        v-if="addButtonText"
        type="primary"
        icon="➕"
        @click="$emit('add-item')"
      >
        {{ addButtonText }}
      </fun-button>
      <fun-button
        v-if="addFolderButtonText"
        type="secondary"
        icon="📁"
        @click="handleAddFolderClick"
      >
        {{ addFolderButtonText }}
      </fun-button>
      <fun-button
        v-if="importFolderButtonText"
        type="secondary"
        icon="📥"
        @click="$emit('import-folder')"
      >
        {{ importFolderButtonText }}
      </fun-button>
      <fun-button
        v-if="importBookmarkButtonText"
        type="secondary"
        icon="📑"
        @click="handleImportBookmarkClick"
      >
        {{ importBookmarkButtonText }}
      </fun-button>
      <div class="search-box">
        <input 
          type="text" 
          :value="searchQuery" 
          @input="$emit('update:searchQuery', $event.target.value)"
          :placeholder="searchPlaceholder"
          class="search-input"
        >
        <span class="search-icon">🔍</span>
      </div>
    </div>
    
    <div class="toolbar-right">
      <LayoutControl
        v-if="showLayoutControl"
        :scale="scale"
        @update:scale="handleScaleUpdate"
        @scale-changed="handleScaleChanged"
      />
      <select :value="sortBy" @change="handleSortChange" class="sort-select">
        <option 
          v-for="option in sortOptions" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
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
    addButtonText: {
      type: String,
      default: '添加游戏'
    },
    addFolderButtonText: {
      type: String,
      default: ''
    },
    importFolderButtonText: {
      type: String,
      default: ''
    },
    importBookmarkButtonText: {
      type: String,
      default: ''
    },
    searchPlaceholder: {
      type: String,
      default: '搜索游戏...'
    },
    sortOptions: {
      type: Array,
      default: () => [
        { value: 'name-asc', label: '按名称排序（升序）' },
        { value: 'name-desc', label: '按名称排序（降序）' },
        { value: 'lastPlayed-asc', label: '按最后游玩时间（升序）' },
        { value: 'lastPlayed-desc', label: '按最后游玩时间（降序）' },
        { value: 'playTime-asc', label: '按游戏时长（升序）' },
        { value: 'playTime-desc', label: '按游戏时长（降序）' },
        { value: 'added-asc', label: '按添加时间（升序）' },
        { value: 'added-desc', label: '按添加时间（降序）' }
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
    }
  },
  emits: [
    'add-item',
    'add-folder',
    'import-folder',
    'import-bookmark',
    'update:searchQuery',
    'update:sortBy',
    'sort-changed',
    'update:scale',
    'layout-changed'
  ],
  async mounted() {
    console.log('🔍 Toolbar mounted, 初始 sortBy:', this.sortBy)
    // 加载保存的布局设置
    if (this.showLayoutControl && this.pageType) {
      await this.loadLayoutSetting()
    } else {
      // 如果没有布局控制，直接解除初始化标记
      this.isInitializing = false
    }
  },
  watch: {
    sortBy(newValue, oldValue) {
      console.log('🔍 Toolbar sortBy 变化:', oldValue, '→', newValue)
    }
  },
  data() {
    return {
      isInitializing: true // 标记是否正在初始化
    }
  },
  methods: {
    handleSortChange(event) {
      const newSortBy = event.target.value
      console.log('🔍 Toolbar 用户选择排序:', newSortBy)
      this.$emit('update:sortBy', newSortBy)
      this.$emit('sort-changed', { pageType: this.pageType, sortBy: newSortBy })
    },
    handleScaleUpdate(newScale) {
      // 拖动过程中只更新 UI，不保存
      this.$emit('update:scale', newScale)
    },
    async handleScaleChanged(newScale) {
      // 拖动结束时才保存布局设置
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
          // 通过事件更新父组件的 scale（不触发保存）
          this.$emit('update:scale', savedScale)
        }
      } catch (error) {
        console.warn('加载布局缩放失败:', error)
      } finally {
        // 确保在加载完成后解除初始化标记
        await this.$nextTick()
        this.isInitializing = false
      }
    },
    handleAddFolderClick() {
      console.log('📁 添加文件夹按钮被点击')
      this.$emit('add-folder')
    },
    handleImportBookmarkClick() {
      console.log('📑 导入书签按钮被点击')
      this.$emit('import-bookmark')
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
