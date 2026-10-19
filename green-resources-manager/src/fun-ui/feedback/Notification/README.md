# FunNotification 通知组件

全局通知组件，支持 Toast 通知和消息中心功能。

## 基本用法

```vue
<template>
  <fun-notification ref="notification" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ComponentPublicInstance } from 'vue'

const notification = ref<ComponentPublicInstance>()

onMounted(() => {
  // 通过 ref 调用方法
  notification.value?.success('操作成功', '数据已保存')
})
</script>
```

## API

### 方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `showToast(options)` | `NotificationOptions` | `number` | 显示通知，返回通知 ID |
| `success(title, message, options?)` | `string, string, Partial<NotificationOptions>?` | `number` | 显示成功通知 |
| `error(title, message, options?)` | `string, string, Partial<NotificationOptions>?` | `number` | 显示错误通知 |
| `warning(title, message, options?)` | `string, string, Partial<NotificationOptions>?` | `number` | 显示警告通知 |
| `info(title, message, options?)` | `string, string, Partial<NotificationOptions>?` | `number` | 显示信息通知 |
| `removeToast(id)` | `number` | `void` | 移除指定 ID 的通知 |

### 属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `messages` | `Message[]` | 消息中心的所有消息（只读） |

### NotificationOptions

```typescript
interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info'  // 通知类型
  title?: string                                    // 标题
  message?: string                                  // 消息内容
  duration?: number                                 // 显示时长（毫秒），默认 3000
  persistent?: boolean                              // 是否持久化（不自动关闭），默认 false
}
```

## 示例

### 基础用法

```vue
<template>
  <fun-notification ref="notification" />
  <button @click="showSuccess">显示成功通知</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const notification = ref()

const showSuccess = () => {
  notification.value?.success('操作成功', '数据已保存')
}
</script>
```

### 使用 NotificationService

```typescript
import notificationService from '@/utils/NotificationService'

// 在 App.vue 中初始化
onMounted(() => {
  notificationService.init(this.$refs.toastNotification)
})

// 在其他地方使用
notificationService.success('操作成功', '数据已保存')
notificationService.error('操作失败', '请检查网络连接')
notificationService.warning('警告', '数据可能不完整')
notificationService.info('提示', '新功能已上线')
```

### 持久化通知

```typescript
// 显示一个不会自动关闭的通知
notification.value?.showToast({
  type: 'error',
  title: '重要错误',
  message: '请立即处理',
  persistent: true
})
```

### 自定义时长

```typescript
// 显示 5 秒的通知
notification.value?.showToast({
  type: 'success',
  title: '操作完成',
  message: '处理可能需要一些时间',
  duration: 5000
})
```

## 消息中心

点击 Toast 通知可以打开消息中心，查看所有历史消息。消息中心支持：

- 按类型筛选（全部、成功、错误、警告、信息）
- 查看消息详情和时间
- 删除单个消息
- 清空所有消息
- 按 ESC 键关闭

## 样式变量

组件使用以下 CSS 变量，可以通过全局样式覆盖：

- `--bg-secondary`: 背景色
- `--bg-tertiary`: 次要背景色
- `--border-color`: 边框颜色
- `--text-primary`: 主要文本颜色
- `--text-secondary`: 次要文本颜色
- `--text-tertiary`: 第三级文本颜色
- `--accent-color`: 强调色
- `--transition-base`: 过渡动画时间

## 设计说明

### 与原 ToastNotification 的区别

1. **更规范**：使用 Composition API 和 TypeScript，类型安全
2. **更统一**：遵循 Fun UI 组件库的命名规范和样式系统
3. **更灵活**：使用 CSS 变量，支持主题切换
4. **API 兼容**：保持与原组件相同的 API，无需修改调用代码

### 迁移指南

从 `ToastNotification` 迁移到 `FunNotification`：

1. 在模板中替换组件：
   ```vue
   <!-- 旧 -->
   <ToastNotification ref="toastNotification" />
   
   <!-- 新 -->
   <fun-notification ref="toastNotification" />
   ```

2. 移除导入：
   ```typescript
   // 移除
   import ToastNotification from './components/ToastNotification.vue'
   ```

3. 其他代码无需修改，API 完全兼容。

## 注意事项

- 组件需要全局注册（通过 `fun-ui` 组件库）
- 通过 `ref` 访问组件实例调用方法
- 建议使用 `NotificationService` 统一管理通知
- 消息中心的消息会一直保存，直到手动删除或清空