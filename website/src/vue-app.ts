import type { App } from 'vue'

export default (app: App) => {
  app.config.globalProperties.$lt = (text: string) => text
}
