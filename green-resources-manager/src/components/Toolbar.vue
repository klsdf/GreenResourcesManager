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
        <!-- 多选模式按钮 -->
        <fun-button
          v-if="item.type === 'multi-select'"
          :type="isMultiSelectMode ? 'secondary' : 'primary'"
          @click="handleToggleMultiSelect"
        >
          {{ isMultiSelectMode ? $lt('退出多选') : $lt('多选模式') }}
        </fun-button>

        <!-- 布局控制 -->
        <LayoutControl
          v-else-if="item.type === 'layout'"
          :scale="scale"
          @update:scale="handleScaleUpdate"
          @scale-changed="handleScaleChanged"
        />

        <!-- 排序：下拉只选字段，右侧按钮切换升序和降序 -->
        <div v-else-if="item.type === 'sort'" class="sort-control">
          <select :value="currentSortField" @change="handleSortFieldChange" class="sort-select">
            <option
              v-for="group in sortFieldGroups"
              :key="group.field"
              :value="group.field"
            >
              {{ $lt(group.label) }}
            </option>
          </select>
          <button
            type="button"
            class="sort-order-btn"
            :title="currentSortOrder === 'asc' ? $lt('当前升序，点击改为降序') : $lt('当前降序，点击改为升序')"
            @click="handleSortOrderToggle"
          >
            {{ currentSortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
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
    /**
     * 把「名称升序 / 名称降序」收成一组。
     * 下拉只展示字段名，方向交给旁边的按钮，避免列表里每一项都出现两次。
     */
    sortFieldGroups() {
      const groups = []
      const indexByField = new Map()
      this.sortOptions.forEach(option => {
        const matched = String(option.id).match(/^(.*)-(asc|desc)$/)
        const field = matched ? matched[1] : option.id
        const order = matched ? matched[2] : 'asc'
        if (!indexByField.has(field)) {
          indexByField.set(field, groups.length)
          groups.push({
            field,
            label: this.stripSortOrderLabel(option.label),
            orders: {}
          })
        }
        const group = groups[indexByField.get(field)]
        group.orders[order] = option.id
        if (!/升序|降序/.test(option.label)) {
          group.label = option.label
        }
      })
      return groups
    },
    /** 当前排序字段，例如 name-desc 里的 name。 */
    currentSortField() {
      const matched = String(this.sortBy).match(/^(.*)-(asc|desc)$/)
      return matched ? matched[1] : this.sortBy
    },
    /** 当前方向。没有写明降序时按升序显示。 */
    currentSortOrder() {
      return String(this.sortBy).endsWith('-desc') ? 'desc' : 'asc'
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
    /**
     * 去掉标签里的升序、降序字样，下拉里只留「按名称排序」这种字段名。
     * @param {string} label 原始排序标签
     * @returns {string}
     */
    stripSortOrderLabel(label) {
      return String(label || '').replace(/（(升序|降序)）/g, '').trim()
    },
    /**
     * 按字段和方向找出原来的排序 id，例如 name + desc = name-desc。
     * 这个 id 仍交给原来的排序逻辑，页面配置不用改。
     * @param {string} field 排序字段
     * @param {'asc'|'desc'} order 升序或降序
     * @returns {string|null}
     */
    resolveSortId(field, order) {
      const group = this.sortFieldGroups.find(item => item.field === field)
      if (!group) return null
      return group.orders[order] || group.orders.asc || group.orders.desc || null
    },
    /**
     * 把选中的排序 id 传给页面，并记到该页的排序设置里。
     * @param {string} newSortBy 形如 name-asc 的排序 id
     */
    emitSortBy(newSortBy) {
      if (!newSortBy || newSortBy === this.sortBy) return
      this.$emit('update:sortBy', newSortBy)
      this.$emit('sort-changed', { pageType: this.pageType, sortBy: newSortBy })
    },
    /**
     * 切换排序字段时保留当前升降序。原来是降序，换到页数后仍然是降序。
     * @param {Event} event 下拉框的 change 事件
     */
    handleSortFieldChange(event) {
      const nextId = this.resolveSortId(event.target.value, this.currentSortOrder)
      this.emitSortBy(nextId)
    },
    /**
     * 点击右侧箭头，在升序和降序之间切换。
     */
    handleSortOrderToggle() {
      const nextOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc'
      const nextId = this.resolveSortId(this.currentSortField, nextOrder)
      this.emitSortBy(nextId)
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

.sort-control {
  display: flex;
  align-items: center;
  gap: 6px;
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

.sort-order-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.sort-order-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
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
