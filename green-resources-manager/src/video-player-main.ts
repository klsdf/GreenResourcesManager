/**
 * 视频播放器标签页的独立入口。
 * 只加载播放器，不带主界面的侧边栏和路由。
 */

import { createApp } from 'vue'
import VideoPlayerPage from './pages/VideoPlayerPage.vue'
import './main.scss'
import FunUI from './fun-ui'
import i18n from './locales'
import { lf, lt } from './locales/lt'

const app = createApp(VideoPlayerPage)
app.use(FunUI)
app.use(i18n)
app.config.globalProperties.$lt = lt
app.config.globalProperties.$lf = lf
app.mount('#app')
