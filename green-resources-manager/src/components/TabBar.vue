<template>
  <div class="tab-bar">
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click="activateTab(tab.id)"
      >
        <span class="tab-title">{{ tab.title }}</span>
        <button
          v-if="!tab.isHome"
          class="tab-close"
          @click.stop="closeTab(tab.id)"
          :title="'关闭标签页'"
        >
          ×
        </button>
      </div>
    </div>
    <button class="tab-new" @click="createNewTab" :title="$lt('新建标签页')">
      +
    </button>
  </div>
</template>

<script>
export default {
  name: 'TabBar',
  data() {
    return {
      tabs: [],
      activeTabId: null
    }
  },
  mounted() {
    // 检查是否在 Electron 环境中
    if (!window.electronAPI) {
      console.warn('标签页功能需要 Electron 环境')
      // 即使没有 Electron API，也显示一个默认的主页标签
      this.tabs = [{ id: 'home-tab', title: '主页', isHome: true }]
      this.activeTabId = 'home-tab'
      this.$emit('tabs-changed', false, 'home-tab')
      return
    }

    // 初始化：加载所有标签页
    this.$nextTick(() => {
      this.loadTabs()
    })

    // 监听标签页事件
    if (window.electronAPI.onTabLoaded) {
      window.electronAPI.onTabLoaded((data) => {
        console.log('标签页已加载:', data)
        this.loadTabs()
      })
    }

    if (window.electronAPI.onTabClosed) {
      window.electronAPI.onTabClosed((data) => {
        console.log('标签页已关闭:', data)
        this.loadTabs()
      })
    }

    if (window.electronAPI.onTabActivated) {
      window.electronAPI.onTabActivated(async (data) => {
        console.log('标签页已激活:', data)
        this.activeTabId = data.tabId
        // 重新加载标签页列表以确保数据是最新的
        await this.loadTabs()
      })
    }

    if (window.electronAPI.onTabTitleUpdated) {
      window.electronAPI.onTabTitleUpdated((data) => {
        console.log('标签页标题已更新:', data)
        const tab = this.tabs.find(t => t.id === data.tabId)
        if (tab) {
          tab.title = data.title
        }
      })
    }
  },
  methods: {
    async loadTabs() {
      if (!window.electronAPI || !window.electronAPI.tabGetAll) {
        // 即使没有 Electron API，也显示一个默认的主页标签
        this.tabs = [{ id: 'home-tab', title: '主页', isHome: true }]
        this.activeTabId = 'home-tab'
        this.$emit('tabs-changed', false, 'home-tab')
        return
      }

      try {
        const result = await window.electronAPI.tabGetAll()
        if (result.success) {
          this.tabs = result.tabs || []
          // 使用 result.activeTabId，如果不存在则使用当前的 activeTabId
          const newActiveTabId = result.activeTabId || this.activeTabId
          this.activeTabId = newActiveTabId
          // 确保始终有一个主页标签页（无论是否有其他标签页）
          const hasHomeTab = this.tabs.some(tab => tab.isHome)
          if (!hasHomeTab) {
            // 如果没有主页标签页，添加一个（放在最前面）
            this.tabs.unshift({ id: 'home-tab', title: '主页', isHome: true })
            // 如果当前没有活动标签页，激活主页标签页
            if (!this.activeTabId) {
              this.activeTabId = 'home-tab'
            }
          }
          // 计算非主页标签页的数量
          const nonHomeTabsCount = this.tabs.filter(tab => !tab.isHome).length
          // 使用更新后的 activeTabId
          this.$emit('tabs-changed', nonHomeTabsCount > 0, this.activeTabId)
        }
      } catch (error) {
        console.error('加载标签页列表失败:', error)
        // 出错时也显示主页标签
        this.tabs = [{ id: 'home-tab', title: '主页', isHome: true }]
        this.activeTabId = 'home-tab'
        this.$emit('tabs-changed', false, 'home-tab')
      }
    },

    async createNewTab() {
      if (!window.electronAPI || !window.electronAPI.tabCreate) {
        return
      }

      try {
        const result = await window.electronAPI.tabCreate({ title: '新标签页' })
        if (result.success) {
          await this.loadTabs()
        }
      } catch (error) {
        console.error('创建标签页失败:', error)
      }
    },

    async closeTab(tabId) {
      if (!window.electronAPI || !window.electronAPI.tabClose) {
        return
      }

      try {
        const result = await window.electronAPI.tabClose(tabId)
        if (result.success) {
          await this.loadTabs()
        }
      } catch (error) {
        console.error('关闭标签页失败:', error)
      }
    },

    async activateTab(tabId) {
      if (!window.electronAPI || !window.electronAPI.tabActivate) {
        return
      }

      try {
        const result = await window.electronAPI.tabActivate(tabId)
        if (result.success) {
          this.activeTabId = tabId
          // 重新加载标签页列表以确保状态同步
          await this.loadTabs()
        }
      } catch (error) {
        console.error('激活标签页失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding: 0 8px;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 1000;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabs-container {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--bg-tertiary, #e8e8e8);
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  white-space: nowrap;
  min-width: 120px;
  max-width: 200px;
  transition: all 0.2s ease;
  position: relative;
}

.tab-item:hover {
  background: var(--bg-hover, #d8d8d8);
}

.tab-item.active {
  background: var(--bg-primary, #ffffff);
  border-bottom-color: var(--bg-primary, #ffffff);
  z-index: 1;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--text-primary, #333);
  margin-right: 8px;
}

.tab-close {
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tab-close:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.1));
  color: var(--text-primary, #333);
}

.tab-new {
  background: var(--bg-tertiary, #e8e8e8);
  border: 1px solid var(--border-color, #d0d0d0);
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: var(--text-primary, #333);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 4px;
}

.tab-new:hover {
  background: var(--bg-hover, #d8d8d8);
}

/* 暗色主题 */
[data-theme="dark"] .tab-bar,
[data-theme="night"] .tab-bar,
[data-theme="night-ink"] .tab-bar {
  background: #2a2a2a;
  border-bottom-color: #404040;
}

[data-theme="dark"] .tab-item,
[data-theme="night"] .tab-item,
[data-theme="night-ink"] .tab-item {
  background: #353535;
  border-color: #404040;
}

[data-theme="dark"] .tab-item:hover,
[data-theme="night"] .tab-item:hover,
[data-theme="night-ink"] .tab-item:hover {
  background: #404040;
}

[data-theme="dark"] .tab-item.active,
[data-theme="night"] .tab-item.active,
[data-theme="night-ink"] .tab-item.active {
  background: #1e1e1e;
  border-bottom-color: #1e1e1e;
}

[data-theme="dark"] .tab-new,
[data-theme="night"] .tab-new,
[data-theme="night-ink"] .tab-new {
  background: #353535;
  border-color: #404040;
}

[data-theme="dark"] .tab-new:hover,
[data-theme="night"] .tab-new:hover,
[data-theme="night-ink"] .tab-new:hover {
  background: #404040;
}
</style>
