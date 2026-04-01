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

const getSavedLanguage = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app-language') || 'zh-CN'
  }
  return 'zh-CN'
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

export const availableLanguages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
]
