<!-- 页面左侧的筛选栏，支持任意数量的筛选器 -->
<template>
  <div class="filter-sidebar">
    <!-- 搜索和筛选都是在找东西，搜索固定在这一栏最上面，不跟着下面的条件滚动。 -->
    <div class="filter-search">
      <input
        type="text"
        class="filter-search__input"
        :value="searchQuery"
        :placeholder="$lt(placeholder)"
        @input="onSearchInput"
      >
      <span class="filter-search__icon" aria-hidden="true">🔍</span>
    </div>

    <div class="filter-sidebar__body">
    <!-- 加载状态 -->
    <FunLoading v-if="isLoading" :text="$lt('正在加载筛选器...')" />
    
    <!-- 动态筛选器列表 -->
    <div 
      v-else-if="filters.length > 0"
      v-for="filter in filters" 
      :key="filter.key"
      class="filter-section"
    >
      <div class="filter-header">
        <h3>{{ $lt(filter.title) }}</h3>
        <button 
          class="btn-clear-filter" 
          @click="clearFilter(filter)" 
          v-if="(filter.selected && filter.selected.length > 0) || (filter.excluded && filter.excluded.length > 0)"
        >
          ✕ {{ $lt('清除筛选') }}
        </button>
      </div>
      <div class="filter-list">
        <div 
          v-for="item in filter.items" 
          :key="(item.filterKey || filter.key) + ':' + item.name"
          class="filter-item"
          :class="{ 
            active: filter.selected && filter.selected.includes(item.name),
            excluded: filter.excluded && filter.excluded.includes(item.name)
          }"
          @click="selectFilter(item.filterKey || filter.key, item.name)"
          @contextmenu.prevent="excludeFilter(item.filterKey || filter.key, item.name)"
        >
          <span v-if="filter.selected && filter.selected.includes(item.name)" class="include-indicator">✓</span>
          <span v-if="filter.excluded && filter.excluded.includes(item.name)" class="exclude-indicator">∅</span>
          <span class="filter-name">{{ getDisplayName(item.name) }}</span>
          <span class="filter-count">({{ item.count }})</span>
        </div>
        <div v-if="filter.items.length === 0" class="no-filters">
          {{ $lf('暂无{name}', { name: $lt(filter.title) }) }}
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔍</div>
      <p class="empty-text">{{ $lt('暂无筛选器数据') }}</p>
    </div>
    </div>
  </div>
</template>

<script>
import disguiseManager from '../utils/DisguiseManager'
import { isDisguiseModeEnabled } from '../utils/disguiseMode'
import FunLoading from '../fun-ui/feedback/Loading/FunLoading.vue'

export default {
  name: 'FilterSidebar',
  components: {
    FunLoading
  },
  props: {
    filters: {
      type: Array,
      default: () => [],
      validator: (filters) => {
        // 验证筛选器数组的格式
        return filters.every(filter => 
          filter.key && 
          filter.title && 
          Array.isArray(filter.items) &&
          (Array.isArray(filter.selected) || filter.selected === null) &&
          (Array.isArray(filter.excluded) || filter.excluded === null)
        )
      }
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    /** 当前搜索词。和资源页用的是同一个词，改这里就会收窄下面的卡片。 */
    searchQuery: {
      type: String,
      default: ''
    },
    /** 搜索框里的提示，例如「搜索游戏...」。 */
    placeholder: {
      type: String,
      default: '搜索...'
    }
  },
  emits: ['filter-select', 'filter-exclude', 'filter-clear', 'search'],
  data() {
    return {
      disguiseModeState: false, // 伪装模式状态
      disguiseNameCache: {} // 伪装名称缓存
    }
  },
  methods: {
    /**
     * 把搜索词交给外面的资源页。
     * 筛选栏只负责输入，真正拿词去对名字和标签的仍是原来的搜索。
     * @param {Event} event 输入框的 input 事件
     */
    onSearchInput(event) {
      const value = event?.target?.value ?? ''
      this.$emit('search', value)
    },
    selectFilter(filterKey, itemName) {
      console.log('FilterSidebar selectFilter:', filterKey, itemName)
      this.$emit('filter-select', { filterKey, itemName })
    },
    excludeFilter(filterKey, itemName) {
      console.log('FilterSidebar excludeFilter:', filterKey, itemName)
      this.$emit('filter-exclude', { filterKey, itemName })
    },
    /**
     * 清掉这一组里勾过的条件。
     * 其他筛选里可能同时放着正在使用和丢失的资源，它们各自记状态，要一起清。
     * @param {object} filter 当前这一组
     */
    clearFilter(filter) {
      const keys = Array.isArray(filter.clearKeys) && filter.clearKeys.length > 0
        ? filter.clearKeys
        : [filter.key || filter]
      keys.forEach((key) => this.$emit('filter-clear', key))
    },
    /**
     * 获取显示名称（支持伪装模式）
     */
    getDisplayName(originalName) {
      if (this.disguiseModeState) {
        // 检查缓存
        if (this.disguiseNameCache && this.disguiseNameCache[originalName]) {
          return this.disguiseNameCache[originalName]
        }
        
        // 异步加载（不阻塞渲染）
        this.loadDisguiseName(originalName)
        return originalName // 先返回原始名称，等异步加载完成后再更新
      }
      // 星级和「未评分」是筛选器自己生成的，不是用户标签，可以跟着界面语言变。
      if (/^[1-5] 星$/.test(originalName) || originalName === '未评分' || originalName === '已看完' || originalName === '未看完' || originalName === '未访问') {
        return this.$lt(originalName)
      }
      return originalName
    },
    
    /**
     * 异步加载名称伪装
     * @param {string} originalName - 原始名称
     */
    async loadDisguiseName(originalName) {
      try {
        const disguiseName = await disguiseManager.getDisguiseTag(originalName)
        // 初始化缓存对象（如果不存在）
        if (!this.disguiseNameCache) {
          this.disguiseNameCache = {}
        }
        // 使用Vue的响应式更新
        this.$set ? this.$set(this.disguiseNameCache, originalName, disguiseName) : (this.disguiseNameCache[originalName] = disguiseName)
        // 强制更新组件
        this.$forceUpdate()
        console.log(`[FilterSidebar] 标签伪装已加载: "${originalName}" -> "${disguiseName}"`)
      } catch (error) {
        console.error('[FilterSidebar] 加载名称伪装失败:', error)
      }
    },
    /**
     * 更新伪装模式状态
     */
    updateDisguiseModeState(event) {
      const newState = typeof event?.detail?.enabled === 'boolean'
        ? event.detail.enabled
        : isDisguiseModeEnabled()
      if (this.disguiseModeState !== newState) {
        console.log('[FilterSidebar] 伪装模式状态变化:', this.disguiseModeState, '->', newState)
        this.disguiseModeState = newState
        // 强制组件重新渲染
        this.$forceUpdate()
      }
    },
    /**
     * 监听 localStorage 变化
     */
    handleStorageChange(event) {
      if (event.key === 'butter-manager-settings') {
        console.log('[FilterSidebar] 检测到设置变化，更新伪装模式状态')
        this.updateDisguiseModeState()
      }
    }
  },
  mounted() {
    // 初始化伪装模式状态
    this.disguiseModeState = isDisguiseModeEnabled()
    console.log('[FilterSidebar] mounted: 初始伪装模式状态:', this.disguiseModeState)
    
    // 监听 storage 事件以响应设置变化
    window.addEventListener('storage', this.handleStorageChange)
    
    // 监听自定义事件
    window.addEventListener('disguise-mode-changed', this.updateDisguiseModeState)
  },
  beforeUnmount() {
    // 清理事件监听器
    window.removeEventListener('storage', this.handleStorageChange)
    window.removeEventListener('disguise-mode-changed', this.updateDisguiseModeState)
  }
}
</script>

<style scoped>
.filter-sidebar {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.filter-search {
  position: relative;
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.filter-search__input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 32px 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.filter-search__input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.filter-search__icon {
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.filter-sidebar__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 筛选器样式 */
.filter-section {
  border-top: 1px solid var(--border-color);
  margin-top: 10px;
  padding: 20px 0 0 0;
}

.filter-section:first-child {
  border-top: none;
  margin-top: 0;
  padding-top: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px 10px 20px;
}

.filter-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  transition: color 0.3s ease;
}

.btn-clear-filter {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-clear-filter:hover {
  background: var(--accent-hover);
}

.filter-list {
  padding: 0;
  overflow: visible;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.filter-item:hover {
  background: var(--bg-tertiary);
}

.filter-item.active {
  background: #4caf50;
  color: white;
  border-left-color: #45a049;
}

.filter-item.active .filter-count {
  color: rgba(255, 255, 255, 0.8);
}

.filter-item.excluded {
  background: #ff6b6b;
  color: white;
  border-left-color: #ff5252;
}

.filter-item.excluded .filter-count {
  color: rgba(255, 255, 255, 0.8);
}

/* 确保文字不居中 */
.filter-item {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.include-indicator {
  margin-right: 8px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
}

.exclude-indicator {
  margin-right: 8px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
}

.filter-name {
  font-weight: 500;
  transition: color 0.3s ease;
}

.filter-count {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}

.no-filters {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-style: italic;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0;
  transition: color 0.3s ease;
}
</style>
