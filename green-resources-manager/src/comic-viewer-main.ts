/**
 * 漫画阅读器标签页的独立 Vue 应用入口
 * 仅加载 ComicViewerPage 及其所需依赖，避免加载完整应用外壳
 */

import { createApp } from 'vue'
import ComicViewerPage from './pages/ComicViewerPage.vue'
import './main.scss'
import FunUI from './fun-ui'
import i18n from './locales'
import { lf, lt } from './locales/lt'

const app = createApp(ComicViewerPage)
app.use(FunUI) // 注册 Fun UI 组件库（ComicViewer 内部使用 fun-button）
app.use(i18n)
// 阅读器按钮上的文字走 $lt。这里不注册的话，页面一渲染就会中断，标签页只剩黑屏。
app.config.globalProperties.$lt = lt
app.config.globalProperties.$lf = lf
app.mount('#app')

console.log('[comic-viewer] 漫画阅读器 Vue 应用已加载')
