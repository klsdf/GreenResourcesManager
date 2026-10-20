<!-- 右键菜单 -->
<template>
  <div 
    v-if="visible" 
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div 
      v-for="item in menuItems" 
      :key="item.key"
      class="context-item-wrapper"
      @mouseenter="handleItemHover(item, $event)"
      @mouseleave="handleItemLeave(item)"
    >
      <div 
        class="context-item" 
        :class="{ 'has-submenu': item.children && item.children.length > 0 }"
        @click="handleItemClick(item)"
      >
        <span class="context-icon">{{ item.icon }}</span>
        <span class="context-label">{{ $lt(item.label) }}</span>
        <span v-if="item.children && item.children.length > 0" class="context-arrow">▶</span>
      </div>
      <!-- 二级菜单 -->
      <div 
        v-if="item.children && item.children.length > 0 && hoveredSubmenu === item.key"
        class="context-submenu"
        :style="getSubmenuStyle()"
        @mouseenter="keepSubmenuOpen(item.key)"
        @mouseleave="handleSubmenuLeave(item.key)"
        @click.stop
      >
        <div 
          v-for="subItem in item.children"
          :key="subItem.key"
          class="context-item"
          @click="handleItemClick(subItem)"
        >
          <span class="context-icon">{{ subItem.icon }}</span>
          <span class="context-label">{{ $lt(subItem.label) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    menuItems: {
      type: Array,
      default: () => []
    }
  },
  emits: ['item-click'],
  data() {
    return {
      hoveredSubmenu: null,
      submenuPosition: { x: 0, y: 0 },
      submenuTimeout: null
    }
  },
  methods: {
    handleItemClick(item) {
      // 如果有子菜单，不触发点击事件
      if (item.children && item.children.length > 0) {
        return
      }
      this.$emit('item-click', item)
    },
    handleItemHover(item, event) {
      if (item.children && item.children.length > 0) {
        // 清除之前的延迟关闭
        if (this.submenuTimeout) {
          clearTimeout(this.submenuTimeout)
          this.submenuTimeout = null
        }
        
        this.hoveredSubmenu = item.key
        // 计算子菜单位置（在右侧显示）
        const rect = event.currentTarget.getBoundingClientRect()
        this.submenuPosition = {
          x: rect.right + 4,
          y: rect.top
        }
      }
    },
    handleItemLeave(item) {
      // 延迟隐藏，避免鼠标移动到子菜单时立即关闭
      if (item.children && item.children.length > 0) {
        this.submenuTimeout = setTimeout(() => {
          // 检查鼠标是否在子菜单上
          if (this.hoveredSubmenu === item.key) {
            this.hoveredSubmenu = null
          }
        }, 150)
      }
    },
    keepSubmenuOpen(key) {
      // 鼠标进入子菜单时，保持打开状态
      if (this.submenuTimeout) {
        clearTimeout(this.submenuTimeout)
        this.submenuTimeout = null
      }
      this.hoveredSubmenu = key
    },
    handleSubmenuLeave(key) {
      // 鼠标离开子菜单时，延迟关闭
      this.submenuTimeout = setTimeout(() => {
        if (this.hoveredSubmenu === key) {
          this.hoveredSubmenu = null
        }
      }, 150)
    },
    getSubmenuStyle() {
      return {
        left: this.submenuPosition.x + 'px',
        top: this.submenuPosition.y + 'px'
      }
    }
  },
  watch: {
    // 监听 visible 变化，当菜单关闭时重置二级菜单状态
    visible(newVal) {
      if (!newVal) {
        // 菜单关闭时，重置二级菜单状态
        this.hoveredSubmenu = null
        // 清理定时器
        if (this.submenuTimeout) {
          clearTimeout(this.submenuTimeout)
          this.submenuTimeout = null
        }
      }
    }
  },
  beforeUnmount() {
    // 清理定时器
    if (this.submenuTimeout) {
      clearTimeout(this.submenuTimeout)
    }
  }
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-medium);
  z-index: 1001;
  min-width: 150px;
  overflow: visible;
  transition: background-color 0.3s ease;
}

.context-item-wrapper {
  position: relative;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
  position: relative;
}

.context-item.has-submenu {
  padding-right: 24px;
}

.context-item:hover {
  background: var(--bg-tertiary);
}

.context-label {
  flex: 1;
}

.context-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.context-arrow {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: auto;
  flex-shrink: 0;
}

.context-submenu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow-medium);
  z-index: 1002;
  min-width: 150px;
  overflow: hidden;
  transition: background-color 0.3s ease;
  margin-left: 4px;
}
</style>
