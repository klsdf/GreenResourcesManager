import i18n from './index'
import en from './phrases/en.json'
import ja from './phrases/ja.json'
import zhTW from './phrases/zh-TW.json'

/**
 * 各语言的界面原文对照表。
 * 键是简体中文原文。简体界面不查表，直接显示原文。
 */
const phraseBooks: Record<string, Record<string, string>> = {
  en,
  ja,
  'zh-TW': zhTW
}

/**
 * 把界面上的简体中文原文换成当前语言。
 *
 * 资源名、标签、用户自己写的句子不在对照表里，会原样返回。
 * 这样切语言时只改应用自己的文案，不会改用户的收藏内容。
 *
 * @param text 简体中文原文。空字符串保持为空。
 * @returns 当前语言的译文；没有译文时返回原文。
 */
export function lt(text: string | null | undefined): string {
  if (text == null || text === '') {
    return ''
  }
  const locale = String(i18n.global.locale.value)
  if (locale === 'zh-CN') {
    return text
  }
  const book = phraseBooks[locale]
  return book?.[text] ?? text
}

/**
 * 用带占位符的简体模板拼一句带数字或名称的文案。
 *
 * 模板本身也走 {@link lt}，所以 `{n}分钟前` 可以译成 `{n} min ago`。
 * 占位符名字必须和 vars 的键一致，翻译时不能改名。
 *
 * @param template 简体模板，占位符写成 {name}
 * @param vars 要填进占位符的值
 * @returns 填好数字后的当前语言句子
 */
export function lf(template: string, vars: Record<string, string | number>): string {
  const translated = lt(template)
  return translated.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}
