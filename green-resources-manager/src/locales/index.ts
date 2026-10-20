import { createI18n } from 'vue-i18n'
import type { I18n } from 'vue-i18n'
import zhCN from './zh-CN'
import zhTW from './zh-TW'
import en from './en'
import ja from './ja'

const messages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en,
  'ja': ja
}

export type MessageSchema = typeof zhCN

const detectSystemLanguage = (): string => {
  if (typeof navigator === 'undefined') {
    return 'zh-CN'
  }
  
  const systemLang = navigator.language || (navigator as any).userLanguage || 'zh-CN'
  
  if (systemLang.startsWith('zh-CN') || systemLang.startsWith('zh')) {
    return 'zh-CN'
  }
  if (systemLang.startsWith('zh-TW')) {
    return 'zh-TW'
  }
  if (systemLang.startsWith('ja')) {
    return 'ja'
  }
  if (systemLang.startsWith('en')) {
    return 'en'
  }
  
  return 'zh-CN'
}

const getSavedLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app-language') || detectSystemLanguage()
  }
  return detectSystemLanguage()
}

const i18n: I18n<{ messages: typeof messages }, {}, {}, string, false> = createI18n<{ messages: typeof messages }, string, false>({
  legacy: false,
  locale: getSavedLanguage(),
  fallbackLocale: 'zh-CN',
  messages,
  globalInjection: true
})

export default i18n

export const setLanguage = (lang: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-language', lang)
  }
  i18n.global.locale.value = lang as any
}

export const getCurrentLanguage = (): string => {
  return i18n.global.locale.value as string
}

/**
 * 一种可选的界面语言。
 * prompt 必须用这种语言自己来写，不能放进翻译文件。
 */
export interface AppLanguageOption {
  /** vue-i18n 使用的语言代码 */
  value: string
  /** 这种语言的自称，只给代码里辨认用 */
  label: string
  /**
   * 语言页按钮上的句子，意思固定是「如果你能看懂这句话，就点这个」。
   * 看不懂当前界面的人，是靠认出自己的语言来切换的，所以这里不能本地化。
   */
  prompt: string
}

/**
 * 应用支持的界面语言。
 * 语言页直接渲染 prompt，不经过 $t。
 */
export const availableLanguages: AppLanguageOption[] = [
  { value: 'zh-CN', label: '简体中文', prompt: '如果你能看懂这句话，就点这个' },
  { value: 'zh-TW', label: '繁體中文', prompt: '如果你能看懂這句話，就點這個' },
  { value: 'en', label: 'English', prompt: 'If you can understand this sentence, click this' },
  { value: 'ja', label: '日本語', prompt: 'この文が読めるなら、これをクリックしてください' }
]
