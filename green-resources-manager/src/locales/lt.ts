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
 * 一句话里连续出现的数字，按顺序填进这些占位符。
 * 词条里写成「检测到 {n} 个文件不存在」，才能把已经存下来的「检测到 12 个文件不存在」对上。
 */
const numberSlots = ['n', 'm', 'k', 'a', 'b', 'c']

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
  if (!book) {
    return text
  }
  if (Object.prototype.hasOwnProperty.call(book, text)) {
    return book[text]
  }
  return translateCountedSentence(text, book) ?? text
}

/**
 * 把句子里的数字换成 {n}、{m} 再查词条。
 * 通知经常带着个数，整句对不上，但去掉数字后的模板是固定的。
 *
 * @param text 已经填好数字的简体句子
 * @param book 当前语言的词条
 * @returns 译好的句子；模板不存在时返回 null
 */
function translateCountedSentence(text: string, book: Record<string, string>): string | null {
  if (!/\d/.test(text)) {
    return null
  }
  /** 按出现顺序记下原来的数字，译完再填回去。 */
  const values: string[] = []
  const template = text.replace(/\d+(?:\.\d+)?/g, (num) => {
    const slot = numberSlots[values.length] || `x${values.length}`
    values.push(num)
    return `{${slot}}`
  })
  if (!Object.prototype.hasOwnProperty.call(book, template)) {
    return null
  }
  return book[template].replace(/\{(\w+)\}/g, (_match, key: string) => {
    const index = numberSlots.indexOf(key)
    if (index >= 0) {
      return values[index] ?? ''
    }
    const extra = /^x(\d+)$/.exec(key)
    return extra ? values[Number(extra[1])] ?? '' : ''
  })
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
