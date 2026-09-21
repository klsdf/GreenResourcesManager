/**
 * 漫画阅读器标签页的独立 Vue 应用入口
 * 仅加载 ComicViewerPage 及其所需依赖，避免加载完整应用外壳
 */

import { createApp } from 'vue'
import ComicViewerPage from './pages/ComicViewerPage.vue'
import './main.scss'
import FunUI from './fun-ui'

const app = createApp(ComicViewerPage)
app.use(FunUI) // 注册 Fun UI 组件库（ComicViewer 内部使用 fun-button）
app.mount('#app')

console.log('[comic-viewer] 漫画阅读器 Vue 应用已加载')
