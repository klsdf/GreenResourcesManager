/**
 * 文本小说的挂页窗口。
 *
 * 分页模式一次只画一页。无极模式要能一直往下滚，滚到这段的末尾再把后一页接上。
 * 一本小说按每页一千字切，可能有几万页。如果把切出来的页全部放进页面，节点会越积越多，滚动会卡住。
 * 所以无极模式只保留一个固定长度的窗口：向后接页时，把已经滚出屏幕上方的页丢掉；向上回翻时反过来。
 * 全文仍然在内存里，这里只决定「现在画哪几页」。
 */

/** 文本阅读器的两种读法。paged 是一页一页点，infinite 是无极连续滚动。 */
export type TextReadMode = 'paged' | 'infinite'

/**
 * 当前挂在页面上的页码区间，两端都包含。
 * 页码从 1 开始，和底部「第 N 页」一致。
 */
export interface TextPageWindow {
  /** 窗口里的第一页。 */
  start: number
  /** 窗口里的最后一页。 */
  end: number
}

/**
 * 无极模式同时挂在页面上的页数上限。
 * 八页正文已经够往下滚一段，再多也不会让几万页的书把页面撑满。
 */
export const MAX_MOUNTED_TEXT_PAGES = 8

/**
 * 离滚动区域边缘多少像素时提前接页。
 * 留出这一小段，是为了在真正滚到底之前把下一页放好，避免闪一下空白。
 */
export const TEXT_PAGE_EDGE_PX = 160

/**
 * 把设置里的阅读方式收成两种合法值。
 * 旧存档没有这一项，或者写了别的字，都按分页处理，避免升级后阅读习惯忽然变掉。
 * @param value 存档或界面传来的值
 * @returns 分页或无极
 */
export function normalizeTextReadMode(value: unknown): TextReadMode {
  return value === 'infinite' ? 'infinite' : 'paged'
}

/**
 * 按页码从全文里切出这一页的原文。
 * 页码和每页字数都先收成正整数，避免出现负数切片或空步长。
 * @param content 整篇正文
 * @param page 页码，从 1 开始
 * @param wordsPerPage 每页字数
 * @returns 这一页的原文。超出全文时是空字符串
 */
export function sliceTextPage(content: string, page: number, wordsPerPage: number): string {
  const size = Math.max(1, Math.floor(wordsPerPage) || 1)
  const index = Math.max(1, Math.floor(page) || 1)
  const start = (index - 1) * size
  return content.slice(start, start + size)
}

/**
 * 把一页原文里的换行换成 HTML 换行。
 * 替换顺序和原来的分页阅读器相同，这样两种模式的段落间距保持一致。
 * @param text 这一页的原文
 * @returns 可放进页面的 HTML
 */
export function formatTextPageHtml(text: string): string {
  return text.replace(/\n/g, '<br>').replace(/\r\n/g, '<br>').replace(/\r/g, '<br>')
}

/**
 * 从指定页向后取出一段窗口，长度不超过上限。
 * 打开第几万页时窗口从那一页开始，而不是从第一页铺到那里。
 * @param page 想从哪一页开始看，从 1 开始
 * @param totalPages 全书总页数
 * @param maxMounted 最多挂多少页
 * @returns 从该页起、向后最多 maxMounted 页的区间
 */
export function seedWindowDown(
  page: number,
  totalPages: number,
  maxMounted: number = MAX_MOUNTED_TEXT_PAGES
): TextPageWindow {
  const total = Math.max(1, Math.floor(totalPages) || 1)
  const max = Math.max(1, Math.floor(maxMounted) || 1)
  const start = Math.min(Math.max(1, Math.floor(page) || 1), total)
  const end = Math.min(total, start + max - 1)
  return { start, end }
}

/**
 * 在窗口末尾再接一页。已经达到上限时，丢掉最前面的一页，让窗口长度保持不变。
 * 后面没有页时原样返回。
 * @param current 现在挂着的区间
 * @param totalPages 全书总页数
 * @param maxMounted 最多挂多少页
 * @returns 接上后一页之后的区间
 */
export function extendWindowDown(
  current: TextPageWindow,
  totalPages: number,
  maxMounted: number = MAX_MOUNTED_TEXT_PAGES
): TextPageWindow {
  const total = Math.max(1, Math.floor(totalPages) || 1)
  const max = Math.max(1, Math.floor(maxMounted) || 1)
  let start = Math.min(Math.max(1, Math.floor(current.start) || 1), total)
  let end = Math.min(Math.max(start, Math.floor(current.end) || start), total)
  if (end >= total) return { start, end }
  end += 1
  if (end - start + 1 > max) start = end - max + 1
  return { start, end }
}

/**
 * 在窗口开头再接一页。已经达到上限时，丢掉最后面的一页。
 * 已经是第一页时原样返回。
 * @param current 现在挂着的区间
 * @param totalPages 全书总页数
 * @param maxMounted 最多挂多少页
 * @returns 接上前一页之后的区间
 */
export function extendWindowUp(
  current: TextPageWindow,
  totalPages: number,
  maxMounted: number = MAX_MOUNTED_TEXT_PAGES
): TextPageWindow {
  const total = Math.max(1, Math.floor(totalPages) || 1)
  const max = Math.max(1, Math.floor(maxMounted) || 1)
  let start = Math.min(Math.max(1, Math.floor(current.start) || 1), total)
  let end = Math.min(Math.max(start, Math.floor(current.end) || start), total)
  if (start <= 1) return { start, end }
  start -= 1
  if (end - start + 1 > max) end = start + max - 1
  return { start, end }
}
