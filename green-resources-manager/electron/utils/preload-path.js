/**
 * ============================================================================
 * 渲染进程 preload 路径
 * ============================================================================
 *
 * 主窗口、标签页、桌宠和视频窗口都要加载同一份 electron/preload.js，
 * 页面里才能拿到 window.electronAPI。
 *
 * 设计原因：
 * 窗口文件都在 electron/window/ 下。各自用 __dirname 拼路径时，写成
 * ../../preload.js 会落到应用根目录，而 preload 实际在 electron/ 里。
 * 加载失败时 Electron 只往 stderr 写一行，调用处又都先判断
 * window.electronAPI 是否存在，所以桌宠拖不动、视频窗口打不开外部播放器，
 * 界面上没有任何报错。
 *
 * 解析放在 electron/utils/：相对路径只相对于本文件，调用方在哪一层目录无关。
 * 开发模式和打进 asar 之后，electron/utils/../preload.js 都指向
 * electron/preload.js，因此不再按环境维护候选列表。
 * public/preload.js、应用根目录的 preload.js 是过期副本，不在候选里。
 */

const path = require('path')
const fs = require('fs')

/**
 * 解析各渲染窗口共用的 preload.js 绝对路径。
 * @returns {string} electron/preload.js 的绝对路径
 */
function resolveMainPreloadPath() {
  /** 本文件位于 electron/utils/，上一级就是 electron/preload.js */
  const preloadPath = path.join(__dirname, '../preload.js')
  if (!fs.existsSync(preloadPath)) {
    console.warn('找不到 preload.js，这个窗口将没有 window.electronAPI:', preloadPath)
  }
  return preloadPath
}

module.exports = {
  resolveMainPreloadPath
}
