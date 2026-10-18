/**
 * @module AppMenu
 * @description 管理 Electron 应用程序的菜单栏，包括文件、编辑、视图和窗口菜单。
 *
 * 主要功能:
 * 1. 创建应用程序的菜单栏模板，包括文件、编辑、视图和窗口菜单。
 * 2. 提供标准的菜单项，如新建、打开、退出、撤销、复制、粘贴等。
 * 3. 支持平台特定的快捷键（macOS 和 Windows/Linux）。
 * 4. 集成 Electron 的内置菜单角色（如 reload、toggleDevTools 等）。
 * 5. 构建并设置应用程序菜单。
 *
 * 导出的函数:
 * - `createMenu()`: 创建并设置应用程序菜单栏。
 *
 * 菜单结构:
 * - 文件菜单: 新建、打开、退出
 * - 编辑菜单: 撤销、重做、剪切、复制、粘贴
 * - 视图菜单: 重新加载、强制重新加载、开发者工具、缩放、全屏
 * - 窗口菜单: 最小化、关闭
 *
 * 快捷键说明:
 * - 新建: CmdOrCtrl+N
 * - 打开: CmdOrCtrl+O
 * - 退出: Cmd+Q (macOS) 或 Ctrl+Q (Windows/Linux)
 * - 重新加载: CmdOrCtrl+R 或 F5
 * - 其他菜单项使用 Electron 内置角色的默认快捷键
 */

const { Menu, app } = require('electron')
const { setMainWindowZoom } = require('../window/main-window')

/**
 * 创建并设置应用程序菜单栏。
 * @param {Function} getMainWindow - 获取主窗口的函数，用于缩放时向渲染进程发送当前缩放比例
 */
function createMenu(getMainWindow) {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // 处理新建逻辑
          }
        },
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // 处理打开逻辑
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        {
          role: 'reload',
          label: '重新加载',
          accelerator: 'F5',
          visible: false,
        },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        {
          label: '实际大小',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            // 走统一入口，这样会记住 100%，并弹出和滚轮相同的缩放提示
            setMainWindowZoom(0)
          }
        },
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            const win = getMainWindow && getMainWindow()
            if (win && !win.isDestroyed() && win.webContents) {
              // 键盘用 0.1 微调；滚轮用更大的步长，两者最后都进 setMainWindowZoom
              setMainWindowZoom(win.webContents.getZoomLevel() + 0.1)
            }
          }
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const win = getMainWindow && getMainWindow()
            if (win && !win.isDestroyed() && win.webContents) {
              setMainWindowZoom(win.webContents.getZoomLevel() - 0.1)
            }
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

module.exports = {
  createMenu
}

