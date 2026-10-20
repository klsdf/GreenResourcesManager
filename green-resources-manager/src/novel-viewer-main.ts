/**
 * 小说阅读器标签页的独立 Vue 应用入口
 * 根据 URL 的 fileType 参数加载 TextReader / PdfReader / EbookReader
 */

import { createApp } from 'vue'
import NovelViewerPage from './pages/NovelViewerPage.vue'
import './main.scss'
import FunUI from './fun-ui'
import i18n from './locales'
import { lf, lt } from './locales/lt'

const app = createApp(NovelViewerPage)
app.use(FunUI)
app.use(i18n)
// 阅读器按钮和提示走 $lt。这里不注册的话，页面一渲染就会中断，标签页只剩白屏。
app.config.globalProperties.$lt = lt
app.config.globalProperties.$lf = lf
app.mount('#app')

console.log('[novel-viewer] 小说阅读器 Vue 应用已加载')
