/**
 * 音乐播放器标签页的独立 Vue 应用入口
 * 只加载播放器页面本身，不加载主应用的侧边栏和路由外壳
 */

import { createApp } from 'vue'
import AudioPlayerPage from './pages/AudioPlayerPage.vue'
import './main.scss'
import FunUI from './fun-ui'
import i18n from './locales'
import { lf, lt } from './locales/lt'

const app = createApp(AudioPlayerPage)
app.use(FunUI)
app.use(i18n)
app.config.globalProperties.$lt = lt
app.config.globalProperties.$lf = lf
app.mount('#app')

console.log('[audio-player] 音乐播放器 Vue 应用已加载')
