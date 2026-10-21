import { createApp } from 'vue'
import HelpView from './pages/HelpView.vue'
import './main.scss'
import FunUI from './fun-ui'
import i18n from './locales'
import { lt } from './locales/lt'

/**
 * 启动独立的帮助站点。
 * 侧栏用 $t，正文用 $lt。这里不注册的话，帮助页一打开就会中断。
 */
function initHelpApp() {
  const app = createApp(HelpView)

  app.use(i18n)
  app.config.globalProperties.$lt = lt
  app.use(FunUI)
  app.mount('#help-app')
}

initHelpApp()