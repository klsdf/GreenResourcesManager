# FunMenu 菜单组件

通用的导航菜单组件，支持一级菜单、可展开的二级菜单、激活状态等功能。

## 功能特性

- ✅ 支持一级菜单项
- ✅ 支持可展开/折叠的二级菜单
- ✅ 支持三级嵌套菜单
- ✅ 自动激活状态管理
- ✅ 自定义激活判断函数
- ✅ 缩起模式（只显示图标）
- ✅ 响应式设计
- ✅ TypeScript 类型支持

## 基本用法

```vue
<template>
  <FunMenu
    :items="menuItems"
    :active-key="activeKey"
    @item-click="handleMenuClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FunMenu from '@/fun-ui/navigation/Menu/FunMenu.vue'
import type { MenuItem } from '@/fun-ui/navigation/Menu/FunMenu.vue'

const activeKey = ref('home')

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: '主页',
    icon: '🏠'
  },
  {
    id: 'search',
    label: '搜索',
    icon: '🔍'
  },
  {
    id: 'api',
    label: 'API 手册',
    icon: '🔌',
    children: [
      {
        id: 'api-games',
        label: '游戏',
        icon: '🎮'
      }
    ]
  }
]

const handleMenuClick = (item: MenuItem) => {
  activeKey.value = item.id || ''
  console.log('点击了菜单项:', item)
}
</script>
```

## Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `items` | `MenuItem[]` | `[]` | 菜单项数组 |
| `activeKey` | `string` | - | 当前激活的菜单项 key |
| `activeId` | `string` | - | 当前激活的菜单项 id（与 activeKey 作用相同） |
| `defaultExpandedKeys` | `string[]` | `[]` | 默认展开的菜单项 keys |
| `isItemActiveFn` | `(item: MenuItem) => boolean` | - | 自定义激活判断函数 |
| `collapsed` | `boolean` | `false` | 是否缩起（只显示图标） |

## MenuItem 接口

```typescript
interface MenuItem {
  id?: string          // 菜单项唯一标识
  key?: string         // 菜单项唯一标识（与 id 作用相同）
  label?: string       // 显示文本
  text?: string        // 显示文本（与 label 作用相同）
  name?: string        // 显示文本（与 label 作用相同）
  icon?: string        // 图标（emoji 或图标类名）
  children?: MenuItem[] // 子菜单项
  isActive?: (item: MenuItem) => boolean // 自定义激活判断函数
  [key: string]: any   // 其他自定义属性
}
```

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `item-click` | `item: MenuItem` | 菜单项被点击时触发 |
| `update:expandedKeys` | `keys: string[]` | 展开的菜单项 keys 更新时触发 |

## 自定义激活判断

### 方式一：使用 isItemActiveFn

```vue
<FunMenu
  :items="menuItems"
  :is-item-active-fn="(item) => $route.name === item.id"
  @item-click="handleMenuClick"
/>
```

### 方式二：在 MenuItem 中使用 isActive

```typescript
const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: '主页',
    icon: '🏠',
    isActive: (item) => {
      return $route.name === 'home' || isResourcePageActive
    }
  }
]
```

## 样式定制

组件使用 CSS 变量，可以通过以下变量定制样式：

- `--accent-color`: 激活状态背景色
- `--accent-hover`: 激活状态边框色
- `--bg-tertiary`: 悬停状态背景色
- `--text-primary`: 主文本颜色
- `--text-secondary`: 次要文本颜色

## 缩起模式

组件支持缩起模式，缩起后只显示图标，隐藏文本和子菜单：

```vue
<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <button @click="isCollapsed = !isCollapsed">
      {{ isCollapsed ? '展开' : '收起' }}
    </button>
    <FunMenu
      :items="menuItems"
      :collapsed="isCollapsed"
      @item-click="handleMenuClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FunMenu from '@/fun-ui/navigation/Menu/FunMenu.vue'

const isCollapsed = ref(false)
// ...
</script>
```

缩起时：
- 只显示图标
- 隐藏菜单文本
- 隐藏所有子菜单
- 鼠标悬停时显示提示文本（通过 title 属性）

## 使用场景

- 侧边栏导航菜单
- 帮助页面导航
- 应用主菜单
- 需要节省空间的导航场景
- 任何需要层级菜单的场景
