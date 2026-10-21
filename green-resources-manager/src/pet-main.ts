/**
 * 桌宠窗口的独立 Vue 应用入口
 * 这个文件用于创建桌宠窗口的 Vue 应用实例
 */

import { createApp } from 'vue'
import PetPage from './pages/PetPage.vue'
import './pet-styles.scss'
import { lf, lt } from './locales/lt'

// 创建独立的 Vue 应用实例用于桌宠窗口
const app = createApp(PetPage)

// 桌宠页面不经过 main.ts，模板里的 $lt/$lf 必须在这里注册，否则渲染直接抛错、窗口一片空白
app.config.globalProperties.$lt = lt
app.config.globalProperties.$lf = lf

// 挂载到 #app 元素
app.mount('#app')

console.log('桌宠 Vue 应用已加载')

