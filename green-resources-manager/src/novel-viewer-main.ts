/**
 * 小说阅读器标签页的独立 Vue 应用入口
 * 根据 URL 的 fileType 参数加载 TextReader / PdfReader / EbookReader
 */

import { createApp } from 'vue'
import NovelViewerPage from './pages/NovelViewerPage.vue'
import './main.scss'
import FunUI from './fun-ui'

const app = createApp(NovelViewerPage)
app.use(FunUI)
app.mount('#app')

console.log('[novel-viewer] 小说阅读器 Vue 应用已加载')
