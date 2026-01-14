<template>
    <div class="base-view">
        <!-- 基础视图内容 -->
        <div class="base-view-content">
            <!-- 工具栏 -->
            <GameToolbar ref="toolbar" 
                :search-query="searchQuery" 
                :sort-by="sortBy"
                :add-button-text="toolbarConfig.addButtonText" 
                :add-folder-button-text="toolbarConfig.addFolderButtonText"
                :import-folder-button-text="toolbarConfig.importFolderButtonText"
                :import-bookmark-button-text="toolbarConfig.importBookmarkButtonText"
                :search-placeholder="toolbarConfig.searchPlaceholder"
                :sort-options="toolbarConfig.sortOptions" 
                :page-type="toolbarConfig.pageType"
                :scale="scale"
                :show-layout-control="showLayoutControl"
                @add-item="handleAddItem"
                @add-folder="handleAddFolder"
                @import-folder="$emit('import-folder')"
                @import-bookmark="handleImportBookmark"
                @update:searchQuery="handleSearchQueryUpdate"
                @update:sortBy="handleSortByUpdate"
                @sort-changed="handleSortChanged"
                @update:scale="$emit('update:scale', $event)" />

            <!-- 分页导航 -->
            <fun-pagination 
                :current-page="paginationConfig.currentPage" 
                :total-pages="paginationConfig.totalPages"
                :page-size="paginationConfig.pageSize" 
                :total-items="paginationConfig.totalItems"
                :item-type="paginationConfig.itemType" 
                @page-change="handlePageChange" 
            />

            <!-- 内容区域包装器，确保空状态始终在内容区域内 -->
            <div class="content-wrapper">
            <slot></slot>

            <!-- 空状态组件 -->
                <fun-empty-state 
                    v-if="currentEmptyState" 
                    :icon="currentEmptyState.icon" 
                    :title="currentEmptyState.title"
                    :description="currentEmptyState.description" 
                    :show-button="currentEmptyState.showButton"
                    :button-text="currentEmptyState.buttonText" 
                    @action="handleEmptyStateAction" 
                />
            </div>
        </div>

        <!-- 右键菜单 -->
        <ContextMenu :visible="showContextMenu" :position="contextMenuPos" :menu-items="contextMenuItems"
            @item-click="handleContextMenuClick" />
    </div>
</template>

<script>
import GameToolbar from './Toolbar.vue'
import ContextMenu from './ContextMenu.vue'

export default {
    name: 'BaseView',
    components: {
        GameToolbar,
        ContextMenu
    },
    props: {
        // 空状态相关属性
        items: {
            type: Array,
            default: () => []
        },
        filteredItems: {
            type: Array,
            default: () => []
        },
        emptyStateConfig: {
            type: Object,
            default: () => ({
                emptyIcon: '',
                emptyTitle: '',
                emptyDescription: '',
                emptyButtonText: '',
                emptyButtonAction: null,
                noResultsIcon: '🔍',
                noResultsTitle: '没有找到匹配的内容',
                noResultsDescription: '尝试使用不同的搜索词',
                noPageDataIcon: '📄',
                noPageDataTitle: '当前页没有内容',
                noPageDataDescription: '请切换到其他页面查看'
            })
        },
        // 工具栏相关属性
        toolbarConfig: {
            type: Object,
            default: () => ({
                addButtonText: '添加项目',
                searchPlaceholder: '搜索...',
                sortOptions: [],
                pageType: ''
            })
        },
        // 右键菜单相关属性
        contextMenuItems: {
            type: Array,
            default: () => []
        },
        // 分页相关属性
        paginationConfig: {
            type: Object,
            default: () => ({
                currentPage: 1,
                totalPages: 0,
                pageSize: 20,
                totalItems: 0,
                itemType: '项目'
            })
        },
        // 工具栏状态属性
        sortBy: {
            type: String,
            default: 'name'
        },
        searchQuery: {
            type: String,
            default: ''
        },
        // 布局控制相关属性
        scale: {
            type: Number,
            default: 100
        },
        showLayoutControl: {
            type: Boolean,
            default: false
        }
    },
    emits: [
        'empty-state-action',
        'add-item',
        'add-folder',
        'import-folder',
        'import-bookmark',
        'sort-changed',
        'search-query-changed',
        'sort-by-changed',
        'context-menu-click',
        'page-change',
        'update:scale'
    ],
    computed: {
        currentEmptyState() {
            // 如果没有任何数据
            if (this.items.length === 0) {
                return {
                    icon: this.emptyStateConfig.emptyIcon,
                    title: this.emptyStateConfig.emptyTitle,
                    description: this.emptyStateConfig.emptyDescription,
                    showButton: !!this.emptyStateConfig.emptyButtonText,
                    buttonText: this.emptyStateConfig.emptyButtonText,
                    onAction: this.emptyStateConfig.emptyButtonAction
                }
            }

            // 如果有数据但没有搜索结果
            if (this.filteredItems.length === 0) {
                return {
                    icon: this.emptyStateConfig.noResultsIcon,
                    title: this.emptyStateConfig.noResultsTitle,
                    description: this.emptyStateConfig.noResultsDescription,
                    showButton: false,
                    buttonText: '',
                    onAction: null
                }
            }

            // 没有空状态需要显示
            return null
        }
    },
    data() {
        return {
            // 右键菜单相关数据
            showContextMenu: false,
            contextMenuPos: { x: 0, y: 0 },
            selectedItem: null
        }
    },
    mounted() {
        console.log('🔍 BaseView mounted, 初始 sortBy:', this.sortBy)
    },
    // 移除了 watch 监听器，因为现在通过事件直接传递
    methods: {
        // 处理空状态按钮点击
        handleEmptyStateAction() {
            if (this.currentEmptyState && this.currentEmptyState.onAction) {
                // 触发父组件的事件
                this.$emit('empty-state-action', this.currentEmptyState.onAction)
            }
        },

        // 处理添加项目按钮点击
        handleAddItem() {
            this.$emit('add-item')
        },

        // 处理添加文件夹按钮点击
        handleAddFolder() {
            this.$emit('add-folder')
        },

        // 处理导入书签按钮点击
        handleImportBookmark() {
            this.$emit('import-bookmark')
        },

        // 处理搜索查询更新（避免直接转发 v-model 事件导致递归）
        handleSearchQueryUpdate(newValue) {
            // 使用 nextTick 延迟发出事件，避免在响应式更新周期中触发递归
            this.$nextTick(() => {
                this.$emit('search-query-changed', newValue)
            })
        },

        // 处理排序方式更新（避免直接转发 v-model 事件导致递归）
        handleSortByUpdate(newValue) {
            // 使用 nextTick 延迟发出事件，避免在响应式更新周期中触发递归
            this.$nextTick(() => {
                this.$emit('sort-by-changed', newValue)
            })
        },

        // 处理排序变化
        handleSortChanged(data) {
            this.$emit('sort-changed', data)
        },

        // 显示右键菜单
        showContextMenuHandler(event, item) {
            event.preventDefault()
            this.selectedItem = item
            this.contextMenuPos = { x: event.clientX, y: event.clientY }
            this.showContextMenu = true
        },

        // 处理右键菜单点击
        handleContextMenuClick(item) {
            this.showContextMenu = false
            this.$emit('context-menu-click', {
                item: item,
                selectedItem: this.selectedItem
            })
        },

        // 关闭右键菜单
        closeContextMenu() {
            this.showContextMenu = false
        },

        // 处理分页变化
        handlePageChange(pageNum) {
            this.$emit('page-change', pageNum)
        }
    },
    mounted() {
        // 点击其他地方关闭右键菜单
        document.addEventListener('click', this.closeContextMenu)
    },
    beforeUnmount() {
        // 清理事件监听器
        document.removeEventListener('click', this.closeContextMenu)
    },
    // 暴露方法给父组件
    expose: ['showContextMenuHandler']
}
</script>

<style scoped>
.base-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.base-view-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    min-height: 0; /* 确保 flex 子元素可以缩小 */
}

/* 内容区域包装器：占据剩余空间，使用 flexbox 布局 */
.content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0; /* 确保可以缩小 */
    overflow: hidden;
}

/* slot 内容（第一个子元素，通常是 game-content、audio-content 等）正常显示 */
.content-wrapper > *:first-child {
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
}

/* 空状态：使用绝对定位覆盖在内容区域上，始终居中显示 */
.content-wrapper .fun-empty-state {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none; /* 允许点击穿透到下层内容 */
}

/* 空状态内容可以接收点击事件 */
.content-wrapper .fun-empty-state > * {
    pointer-events: auto;
}
</style>
