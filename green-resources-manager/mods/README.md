# 创意工坊插件目录

这个目录用于存放创意工坊插件（Mods）。

## 目录结构

```
mods/
├── README.md                    # 本文件
├── calendar-manager/              # 示例插件
│   ├── manifest.json           # 插件元信息
│   ├── index.js                # 主脚本
│   └── README.md               # 插件说明
└── [your-plugin-name]/         # 你的插件
    ├── manifest.json
    ├── index.js
    └── README.md
```

## 安装插件

1. 打开应用的「创意工坊 → 在线工坊」，搜索并安装公共目录里的插件；或把插件文件夹复制到 `mods` 目录
2. 在应用的"创意工坊"页面中启用插件
3. 重启应用使插件生效

## 开发插件

请参考 `calendar-manager` 目录下的示例代码。

### 必需文件

- `manifest.json`: 插件元信息（必需）
- `index.js`: 插件主脚本（必需）

### 可选文件

- `README.md`: 插件说明文档
- `styles.css`: 自定义样式
- `assets/`: 资源文件目录

## 插件规范

### 命名规范

- 插件文件夹名称应该使用小写字母、数字和连字符（kebab-case）
- 例如：`my-awesome-plugin`, `game-tag-manager`

### manifest.json 格式

```json
{
  "id": "plugin-id",
  "name": "插件名称",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名",
  "entry": "index.js"
}
```
