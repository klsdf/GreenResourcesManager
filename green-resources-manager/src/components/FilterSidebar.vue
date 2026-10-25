<!-- 页面左侧的筛选栏，支持任意数量的筛选器 -->
<template>
  <div class="filter-sidebar">
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
    }
  },
  emits: ['filter-select', 'filter-exclude', 'filter-clear'],
  data() {
    return {
      disguiseModeState: false, // 伪装模式状态
      disguiseNameCache: {} // 伪装名称缓存
    }
  },
  methods: {
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
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  overflow: visible;
  transition: background-color 0.3s ease;
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
