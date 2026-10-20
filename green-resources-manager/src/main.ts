import { createApp } from 'vue'
import App from './App.vue'
import './main.scss'
import { createAppRouter } from './router'
import { pinia } from './stores'
import FunUI from './fun-ui'
import i18n from './locales'
import { lf, lt } from './locales/lt'

async function initApp() {
  const router = await createAppRouter()
  const app = createApp(App)
  
  app.use(pinia)
  app.use(router)
  app.use(FunUI) // 注册 Fun UI 组件库
  app.use(i18n) // 注册国际化插件
  // 模板里用 $lt / $lf 翻译仍写在代码和页面配置里的简体原文
  app.config.globalProperties.$lt = lt
  app.config.globalProperties.$lf = lf
  app.mount('#app')
}

initApp()
