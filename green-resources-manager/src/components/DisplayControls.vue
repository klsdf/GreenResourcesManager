<template>
  <div class="display-controls">
    <!-- 显示方式：网格 / 列表 -->
    <div v-if="showViewMode" class="view-mode-switch" role="group" :aria-label="$lt('显示方式')">
      <button
        type="button"
        class="view-mode-switch__button"
        :class="{ 'is-active': displayMode !== 'list' }"
        :title="$lt('网格样式')"
        @click="handleDisplayModeChange('grid')"
      >
        <span class="view-mode-switch__icon">▦</span>
        <span class="view-mode-switch__label">{{ $lt('网格') }}</span>
      </button>
      <button
        type="button"
        class="view-mode-switch__button"
        :class="{ 'is-active': displayMode === 'list' }"
        :title="$lt('列表样式')"
        @click="handleDisplayModeChange('list')"
      >
        <span class="view-mode-switch__icon">☰</span>
        <span class="view-mode-switch__label">{{ $lt('列表') }}</span>
      </button>
    </div>

    <!-- 排序：下拉只选字段，右侧按钮切换升序和降序 -->
    <div v-if="showSort" class="sort-control">
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
  </div>
</template>

<script>
import saveManager from '../utils/SaveManager.ts'

export default {
  name: 'DisplayControls',
  props: {
    /** 当前显示方式：grid 是网格，list 是列表 */
    displayMode: {
      type: String,
      default: 'grid'
    },
    /** 是否显示网格 / 列表切换按钮 */
    showViewMode: {
      type: Boolean,
      default: true
    },
    sortBy: {
      type: String,
      default: 'name-asc'
    },
    sortOptions: {
      type: Array,
      default: () => []
    },
    pageType: {
      type: String,
      default: ''
    }
  },
  emits: [
    'update:displayMode',
    'display-mode-changed',
    'update:sortBy',
    'sort-changed'
  ],
  computed: {
    showSort() {
      return this.sortOptions.length > 0
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
    }
  },
  methods: {
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
    /**
     * 切换网格 / 列表。切完记到这一页的设置里，下次进来还是这个样式。
     * @param {'grid'|'list'} mode 显示方式
     */
    async handleDisplayModeChange(mode) {
      if (mode === this.displayMode) return
      this.$emit('update:displayMode', mode)
      if (!this.pageType) return
      try {
        await saveManager.saveDisplayModeSetting(this.pageType, mode)
        this.$emit('display-mode-changed', { pageType: this.pageType, displayMode: mode })
      } catch (error) {
        console.warn('保存显示方式失败:', error)
      }
    },
    async loadDisplayModeSetting() {
      if (!this.pageType) return
      try {
        const savedMode = await saveManager.getDisplayModeSetting(this.pageType)
        if (savedMode !== this.displayMode) {
          this.$emit('update:displayMode', savedMode)
        }
      } catch (error) {
        console.warn('加载显示方式失败:', error)
      }
    }
  },
  async mounted() {
    if (this.showViewMode) {
      await this.loadDisplayModeSetting()
    }
  }
}
</script>

<style scoped>
.display-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

/* 网格 / 列表切换：两段式按钮，当前样式亮起 */
.view-mode-switch {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.view-mode-switch__button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.view-mode-switch__button + .view-mode-switch__button {
  border-left: 1px solid var(--border-color);
}

.view-mode-switch__button:hover {
  color: var(--accent-color);
}

.view-mode-switch__button.is-active {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
}

.view-mode-switch__icon {
  font-size: 1rem;
  line-height: 1;
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-select {
  padding: 7px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: var(--font-size-sm, 0.875rem);
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-order-btn {
  width: 34px;
  height: 34px;
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
</style>
