<template>
  <!-- 标题行在应用外壳里，这些按钮属于当前页。传到标题同一行，避免再占一整条工具栏。 -->
  <Teleport to="#content-header-actions">
    <div class="header-page-actions">
      <template v-for="item in leftItems" :key="getItemKey(item)">
        <fun-button
          v-if="item.type === 'button'"
          :type="item.buttonType || 'primary'"
          :icon="item.icon"
          @click="handleButtonClick(item)"
        >
          {{ $lt(item.label) }}
        </fun-button>
      </template>
      <template v-for="item in rightItems" :key="getItemKey(item)">
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
      </template>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'Toolbar',
  components: {},
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
        return this.items.filter(item => item.type === 'button')
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
      // 一行几张写在页面配置里。排序和网格 / 列表切换在分页条右侧。
      if (this.items && this.items.length > 0) {
        return this.items.filter(item => item.type === 'multi-select')
      }

      return [{ type: 'multi-select' }]
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
    }
  }
}
</script>

<style scoped>
/* 跟标题、页面配置排在同一行。按钮样式沿用原来的，只是不再单独占一条。 */
.header-page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
