# 创意工坊公共目录

这个目录是 GreenResourcesManager 的公共插件索引，做法参考 Obsidian 社区插件：

- `community-mods.json` 只记录「有哪些插件、插件在哪个 GitHub 仓库」。
- 插件本体不放在这个仓库里。作者在自己的仓库发布 Release，客户端按需下载。
- 客户端不调用 GitHub API，而是直接访问 `releases/latest/download/<文件名>`，所以没有匿名 60 次/小时的限制。

## 索引格式

`community-mods.json` 是一个数组：

```json
[
  {
    "id": "calendar-manager",
    "name": "日期管理",
    "author": "HatMan",
    "description": "在侧边栏添加一个简单的日程表。",
    "repo": "HatMan/grm-calendar-manager",
    "icon": "📅",
    "tags": ["日期", "日程"]
  }
]
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 插件唯一 id，小写字母、数字、下划线、连字符，最长 64 位，不能带点 |
| `name` | 是 | 显示名称 |
| `author` | 否 | 作者名 |
| `description` | 否 | 一句话介绍 |
| `repo` | 是 | `owner/repo`，插件自己的 GitHub 仓库 |
| `icon` | 否 | 一个 emoji |
| `tags` | 否 | 最多 8 个标签 |

`id` 必须和插件目录名、`manifest.json` 里的 `id` 完全一致。

## 作者如何提交插件

### 1. 准备插件仓库

仓库里至少有：

```text
manifest.json
index.js          # 入口文件，也可以在 manifest.entry 里改名
styles.css        # 可选
README.md         # 可选，安装后会一起放进插件目录
```

`manifest.json` 示例：

```json
{
  "id": "calendar-manager",
  "name": "日期管理",
  "version": "1.0.0",
  "description": "在侧边栏添加一个简单的日程表。",
  "author": "HatMan",
  "entry": "index.js",
  "minAppVersion": "0.8.0",
  "icon": "📅",
  "tags": ["日期", "日程"]
}
```

- `version` 必须是 `x.y.z`。
- `entry` 只能是插件目录里的文件名，不能带路径。
- `minAppVersion` 可选；低于这个版本的应用会拒绝安装。
- `id` 一旦发布不要改，否则用户会装出第二份插件。

### 2. 发布 Release

在插件仓库创建一个 Release：

- Tag 建议直接使用版本号，例如 `1.0.0`。
- 把 `manifest.json`、`index.js`、`styles.css` 作为 Release 资源上传。
- Release 资源文件名必须和 `manifest.entry`、`styles.css` 完全一致。
- 这个 Release 必须是仓库的 **latest release**，客户端只读 `releases/latest/download/`。

发布新版本时只需要再发一个 Release，不需要改公共目录。客户端会通过最新 Release 里的 `manifest.json` 发现新版本。

### 3. 提交索引

1. Fork 本仓库。
2. 在 `workshop/community-mods.json` 里加一条记录。
3. 提 PR。CI 会检查 JSON 格式、id 是否重复、Release 资源是否存在。
4. 维护者会看一遍插件代码，合并后客户端就能搜到。

一个 GitHub 仓库只能收录一个插件（因为 latest Release 的固定文件名会被占用）。

## 审核约定

插件代码会在应用渲染进程里执行，权限和页面脚本相同。提交前请确认：

- 不读取、上传与插件功能无关的本地文件。
- 不静默修改用户的资源数据。
- 不包含混淆代码、挖矿、自动更新器或远程执行逻辑。
- 联网行为要在 README 里写清楚。
- 卸载时能移除自己注册的导航项和事件监听。

维护者可以拒绝或下架任何无法说明用途的插件。

## 本地调试

应用会从下面两个地址读取索引，按顺序回退：

1. `https://raw.githubusercontent.com/klsdf/GreenResourcesManager/main/green-resources-manager/workshop/community-mods.json`
2. `https://cdn.jsdelivr.net/gh/klsdf/GreenResourcesManager@main/green-resources-manager/workshop/community-mods.json`

没有发布 Release 时，可以直接把插件文件夹放进应用的 `mods/` 目录，在「创意工坊 → 已安装」里使用。

## 校验

```bash
# 只检查索引 JSON 格式，不联网
node scripts/validate-workshop-registry.mjs --offline

# 同时检查每个仓库的 latest Release 和资源文件
node scripts/validate-workshop-registry.mjs
```
