/**
 * 整理要打开的网址，并保住用户写上的协议。
 * 已经是 https 的原样返回，不会改成 http。
 * 没写协议的补上 https，避免裸域名被系统当成 http。
 * @param raw 用户保存的网址
 * @returns 可打开的 http 或 https 地址。不是网页地址时返回空字符串
 */
export function normalizeWebUrl(raw: string | null | undefined): string {
  /** 去掉首尾空白后的原文。协议大小写保持原样。 */
  const text = String(raw ?? '').trim()
  if (!text) {
    return ''
  }
  if (/^https:\/\//i.test(text) || /^http:\/\//i.test(text)) {
    return text
  }
  // javascript:、file: 这类地址不能当网站打开
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    return ''
  }
  if (text.startsWith('//')) {
    return `https:${text}`
  }
  return `https://${text}`
}
