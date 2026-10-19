# FunGrid 网格布局组件

通用的网格布局组件，支持自动填充、自动适应和固定列数三种模式。**支持动态缩放控制**，可以根据用户缩放比例实时调整列宽。

## 基本用法

### 自动填充模式（auto-fill）

```vue
<template>
  <fun-grid mode="auto-fill" :minWidth="200" gap="16px">
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </fun-grid>
</template>
```

### 自动适应模式（auto-fit）

```vue
<template>
  <fun-grid mode="auto-fit" :minWidth="150" gap="var(--spacing-md)">
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </fun-grid>
</template>
```

### 固定列数模式（fixed）

```vue
<template>
  <fun-grid mode="fixed" :columns="3" gap="20px">
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </fun-grid>
</template>
```

### 动态缩放模式（推荐）

```vue
<template>
  <fun-grid 
    mode="auto-fill" 
    :scale="scale" 
    :baseWidth="400"
    :minScaledWidth="100"
    gap="20px"
  >
    <div v-for="item in items" :key="item.id">
      {{ item.name }}
    </div>
  </fun-grid>
</template>

<script setup>
import { ref } from 'vue'

const scale = ref(80) // 缩放比例 0-100

// 当用户调整缩放时，minWidth 会自动计算：
// minWidth = baseWidth * (scale / 100)
// 例如：400 * (80 / 100) = 320px
</script>
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| `columns` | 列数（固定列数模式） | `number` | - |
| `minWidth` | 最小列宽（px），在 auto-fill/auto-fit 模式下使用。如果同时提供了 `scale` 和 `baseWidth`，则会被动态计算的值覆盖 | `number \| string` | `200` |
| `maxWidth` | 最大列宽，在 auto-fill/auto-fit 模式下使用 | `string` | `'1fr'` |
| `mode` | 布局模式：`'auto-fill'`（填充）、`'auto-fit'`（适应）、`'fixed'`（固定列数） | `'auto-fill' \| 'auto-fit' \| 'fixed'` | `'auto-fill'` |
| `gap` | 间距（支持 CSS 值，如 `'16px'`, `'1rem'`, `'var(--spacing-md)'`） | `string \| number` | `'var(--spacing-md, 16px)'` |
| `rowGap` | 行间距（支持 CSS 值），如果未指定则使用 gap | `string \| number` | - |
| `columnGap` | 列间距（支持 CSS 值），如果未指定则使用 gap | `string \| number` | - |
| `padding` | 内边距（支持 CSS 值） | `string \| number` | - |
| `singleColumnOnMobile` | 是否在移动端自动变为单列 | `boolean` | `true` |
| **`scale`** | **缩放比例（0-100 或更大范围）。当提供了 `scale` 和 `baseWidth` 时，`minWidth` 会根据公式动态计算：`minWidth = baseWidth * (scale / 100)`** | `number` | `undefined` |
| **`baseWidth`** | **基础宽度（px），用于缩放计算。当提供了 `scale` 和 `baseWidth` 时，`minWidth` 会根据公式动态计算** | `number` | `undefined` |
| **`minScaledWidth`** | **缩放后的最小宽度限制（px），防止缩放后宽度过小** | `number` | `100` |
| **`maxScaledWidth`** | **缩放后的最大宽度限制（px），防止缩放后宽度过大** | `number` | `undefined` |
| **`justifyItems`** | **水平对齐方式** | `'start' \| 'end' \| 'center' \| 'stretch'` | `'stretch'` |
| **`alignItems`** | **垂直对齐方式** | `'start' \| 'end' \| 'center' \| 'stretch'` | `'stretch'` |
| **`customStyle`** | **自定义样式对象，会合并到计算后的样式中** | `Record<string, string>` | `undefined` |

## 使用场景

### 图片网格

```vue
<fun-grid mode="auto-fill" :minWidth="150" gap="16px">
  <div v-for="image in images" :key="image.id" class="image-item">
    <img :src="image.url" :alt="image.name" />
  </div>
</fun-grid>
```

### 卡片列表

```vue
<fun-grid mode="auto-fill" :minWidth="300" gap="20px">
  <fun-card v-for="card in cards" :key="card.id">
    <h3>{{ card.title }}</h3>
    <p>{{ card.description }}</p>
  </fun-card>
</fun-grid>
```

### 固定列数布局

```vue
<fun-grid mode="fixed" :columns="4" gap="var(--spacing-lg)">
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</fun-grid>
```

### 带缩放控制的游戏/资源网格（推荐）

```vue
<template>
  <fun-grid 
    mode="auto-fill"
    :scale="scale"
    :baseWidth="400"
    :minScaledWidth="100"
    gap="20px"
    padding="10px 20px"
    :customStyle="{ justifyContent: 'stretch' }"
  >
    <MediaCard 
      v-for="item in items" 
      :key="item.id"
      :item="item"
      :scale="scale"
    />
  </fun-grid>
</template>

<script setup>
import { ref } from 'vue'

const scale = ref(80) // 用户可以通过滑块控制，范围 0-100

// 当 scale = 80, baseWidth = 400 时：
// 实际 minWidth = 400 * (80 / 100) = 320px
// 如果设置了 minScaledWidth = 100，则最小不会小于 100px
</script>
```

## 缩放控制详解

### 工作原理

当同时提供 `scale` 和 `baseWidth` 时，组件会自动计算动态的 `minWidth`：

```
实际 minWidth = baseWidth * (scale / 100)
```

### 示例

```vue
<!-- scale = 50, baseWidth = 400 -->
<!-- 实际 minWidth = 400 * (50 / 100) = 200px -->

<!-- scale = 100, baseWidth = 400 -->
<!-- 实际 minWidth = 400 * (100 / 100) = 400px -->

<!-- scale = 120, baseWidth = 400, maxScaledWidth = 500 -->
<!-- 计算值 = 400 * (120 / 100) = 480px -->
<!-- 实际 minWidth = min(480, 500) = 480px -->
```

### 与 useDisplayLayout 集成

如果你使用了 `useDisplayLayout` composable，可以直接传递 scale：

```vue
<script setup>
import { useDisplayLayout } from '@/composables/useDisplayLayout'

const { scale, updateScale } = useDisplayLayout(80, 400)
</script>

<template>
  <fun-grid 
    :scale="scale"
    :baseWidth="400"
    :minScaledWidth="100"
  >
    <!-- 内容 -->
  </fun-grid>
</template>
```

## 响应式

组件默认在移动端（宽度 < 768px）自动变为单列布局。可以通过设置 `singleColumnOnMobile="false"` 来禁用此行为。

## 设计说明

- 使用 CSS Grid 实现，性能优秀
- 支持 CSS 变量，与设计系统集成
- 自动响应式，移动端友好
- **支持动态缩放控制，实时调整布局**
- 灵活的配置选项，满足各种布局需求
- 支持自定义样式，满足特殊需求
