# FunDropZone 拖拽上传区域

一个支持拖拽和点击上传的文件选择组件。

## 基础用法

```vue
<template>
  <fun-drop-zone @drop="handleFileDrop" />
</template>

<script setup>
const handleFileDrop = (files) => {
  console.log('上传的文件:', files)
}
</script>
```

## 限制文件类型

```vue
<template>
  <!-- 只接受图片 -->
  <fun-drop-zone 
    :accept="['.jpg', '.jpeg', '.png', '.gif']"
    @drop="handleImageDrop"
  />
  
  <!-- 只接受视频 -->
  <fun-drop-zone 
    :accept="['.mp4', '.avi', '.mov']"
    @drop="handleVideoDrop"
  />
</template>
```

## 单文件上传

```vue
<template>
  <fun-drop-zone 
    :multiple="false"
    @drop="handleSingleFile"
  />
</template>
```

## 限制文件大小

```vue
<template>
  <!-- 限制最大 10MB -->
  <fun-drop-zone 
    :max-size="10 * 1024 * 1024"
    @drop="handleFileDrop"
    @error="handleError"
  />
</template>

<script setup>
const handleError = (error) => {
  console.error('文件验证失败:', error.message)
}
</script>
```

## 限制文件数量

```vue
<template>
  <!-- 最多上传 5 个文件 -->
  <fun-drop-zone 
    :max-files="5"
    @drop="handleFileDrop"
  />
</template>
```

## 自定义文本

```vue
<template>
  <fun-drop-zone 
    title="拖拽游戏文件到这里"
    hint="支持 .exe、.swf、.bat 等格式"
    drag-text="松开添加游戏"
    @drop="handleGameDrop"
  />
</template>
```

## 禁用状态

```vue
<template>
  <fun-drop-zone 
    disabled
    @drop="handleFileDrop"
  />
</template>
```

## 禁用点击上传

```vue
<template>
  <!-- 只支持拖拽，不支持点击 -->
  <fun-drop-zone 
    :clickable="false"
    @drop="handleFileDrop"
  />
</template>
```

## 自定义内容

```vue
<template>
  <fun-drop-zone @drop="handleFileDrop">
    <template #default="{ isDragging }">
      <div class="custom-content">
        <img src="./upload-icon.svg" alt="上传" />
        <p v-if="!isDragging">点击或拖拽文件到这里</p>
        <p v-else>松开鼠标添加文件</p>
      </div>
    </template>
  </fun-drop-zone>
</template>
```

## 自定义拖拽提示

```vue
<template>
  <fun-drop-zone @drop="handleFileDrop">
    <template #dragging>
      <div class="custom-dragging">
        <span class="icon">🎮</span>
        <p>松开添加游戏文件</p>
      </div>
    </template>
  </fun-drop-zone>
</template>
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| disabled | 是否禁用 | `boolean` | `false` |
| accept | 允许的文件扩展名 | `string[]` | `[]`（接受所有） |
| multiple | 是否支持多文件 | `boolean` | `true` |
| clickable | 是否可点击上传 | `boolean` | `true` |
| title | 标题文本 | `string` | `'拖拽文件到这里或点击上传'` |
| hint | 提示文本 | `string` | `'支持拖拽多个文件'` |
| dragText | 拖拽时显示的文本 | `string` | `'松开鼠标添加文件'` |
| maxSize | 最大文件大小（字节） | `number` | `0`（不限制） |
| maxFiles | 最大文件数量 | `number` | `0`（不限制） |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| drop | 文件拖放或选择后触发 | `(files: File[]) => void` |
| error | 文件验证失败时触发 | `(error: { type: 'size' \| 'count' \| 'type', message: string }) => void` |

## Slots

| 插槽名 | 说明 | 作用域参数 |
|--------|------|-----------|
| default | 自定义默认内容 | `{ isDragging: boolean }` |
| dragging | 自定义拖拽时的提示内容 | - |

## 示例场景

### 游戏文件上传

```vue
<template>
  <fun-drop-zone 
    :accept="['.exe', '.swf', '.bat', '.zip', '.rar', '.7z']"
    title="添加游戏"
    hint="支持拖拽游戏可执行文件或压缩包"
    drag-text="松开添加游戏到库中"
    :max-size="5 * 1024 * 1024 * 1024"
    @drop="handleGameDrop"
    @error="handleError"
  >
    <template #default="{ isDragging }">
      <div class="game-upload">
        <div class="icon">🎮</div>
        <h3>{{ isDragging ? '松开添加游戏' : '拖拽游戏文件到这里' }}</h3>
        <p>或点击选择文件</p>
      </div>
    </template>
  </fun-drop-zone>
</template>
```

### 图片上传

```vue
<template>
  <fun-drop-zone 
    :accept="['.jpg', '.jpeg', '.png', '.gif', '.webp']"
    title="上传图片"
    hint="支持 JPG、PNG、GIF 格式"
    :max-size="5 * 1024 * 1024"
    :max-files="10"
    @drop="handleImageDrop"
  />
</template>
```

### 文档上传

```vue
<template>
  <fun-drop-zone 
    :accept="['.pdf', '.doc', '.docx', '.xls', '.xlsx']"
    title="上传文档"
    hint="支持 PDF、Word、Excel 格式"
    @drop="handleDocumentDrop"
  />
</template>
```
