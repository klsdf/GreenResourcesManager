---
name: workshop-plugin
description: 为 GreenResourcesManager 编写创意工坊插件。在 mods 目录、侧边栏入口、插件页面、便笺或日期管理示例时使用。
---

# 自定义插件

插件放在应用根目录的 `mods` 文件夹。每个插件是一个子文件夹，里面至少有 `manifest.json` 和入口脚本，默认是 `index.js`。放好后在创意工坊点「刷新」。新插件默认关闭，打开开关才加载。关掉开关会卸载插件，并拿掉它注册的侧边栏入口。

在线工坊安装的插件也进 `mods`，默认不启用。有新版本时在「已安装」里更新或卸载。

## 入口

`index.js` 使用 `export default`。加载时调用 `onLoad(api)`，卸载时调用 `onUnload(api)`。脚本里不要写 `import`。

- `api.storage.get`、`set`、`remove`：数据写在本机，键名会自动加上插件编号
- `api.navigation.register({ id, name, icon, onClick })`：加侧边栏入口。卸掉时调用 `api.navigation.unregister`
- `api.ui.showNotification(标题, 类型, { message })`：类型是 `success`、`info` 或 `error`
- `api.ui.showCustomView({ title, content, onMount })`：`content` 是 HTML。`onMount` 拿到页面容器，用来给按钮绑定点击

发布到公共工坊时，在插件自己的 GitHub 仓库发 Release，上传 `manifest.json`、入口脚本和可选的 `styles.css`，再把仓库写进 `workshop/community-mods.json`。

## 便笺

最少的例子是 `mods/hello-note`。`manifest.json` 写 `id`、`name`、`version`、`description`、`author`、`entry`、`icon`。`index.js` 在 `onLoad` 里注册侧边栏，点击后用 `showCustomView` 打开一段 HTML，`onUnload` 里取消注册。

## 日期管理

`mods/calendar-manager` 是带月历和本地记录的例子。`onLoad` 用 `api.storage.get` 读出日程，注册「日期管理」。点进去用 `showCustomView` 打开月历，在 `onMount` 里绑定上个月、下个月和添加。改完调用 `api.storage.set`。`onUnload` 再保存一次，并取消侧边栏入口。
