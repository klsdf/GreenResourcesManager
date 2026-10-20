/**
 * 格式化工具函数
 */

import { lf, lt } from '../locales/lt'

/**
 * 格式化日期时间为字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date) {
  // 格式化为：YYYY-MM-DD HH:mm:ss
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化游戏时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 */
export function formatPlayTime(seconds) {
  if (!seconds) return lt('未游玩')
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return lf('{hours}小时 {minutes}分钟 {seconds}秒', { hours, minutes, seconds: remainingSeconds })
  } else if (minutes > 0) {
    return lf('{minutes}分钟 {seconds}秒', { minutes, seconds: remainingSeconds })
  } else {
    return lf('{seconds}秒', { seconds: remainingSeconds })
  }
}

/**
 * 格式化最后游玩时间
 * @param {string} dateString - 日期字符串
 * @param {object} texts - 可选的文本配置，包含 neverAccessed, justAccessed, yesterdayAccessed, accessAction
 * @returns {string} 格式化后的相对时间字符串
 */
export function formatLastPlayed(dateString, texts?: { neverAccessed?: string; justAccessed?: string; yesterdayAccessed?: string; accessAction?: string }) {
  if (!dateString) return lt(texts?.neverAccessed || '从未游玩')
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  
  // 如果是今天（同一天）
  if (diffDays === 0) {
    if (diffMinutes < 1) return lt(texts?.justAccessed || '刚刚')
    if (diffMinutes < 60) return lf('{n}分钟前', { n: diffMinutes })
    if (diffHours < 24) return lf('{n}小时前', { n: diffHours })
  }
  
  // 如果是昨天
  if (diffDays === 1) return lt(texts?.yesterdayAccessed || '昨天')
  if (diffDays < 7) return lf('{n}天前', { n: diffDays })
  if (diffDays < 30) return lf('{n}周前', { n: Math.floor(diffDays / 7) })
  return formatDateTime(date)
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(dateString) {
  if (!dateString) return lt('未知')
  const date = new Date(dateString)
  return formatDateTime(date)
}

/**
 * 格式化第一次游玩时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatFirstPlayed(dateString) {
  if (!dateString) return lt('从未游玩')
  const date = new Date(dateString)
  return formatDateTime(date)
}

/**
 * 格式化音频/视频时长（秒数）
 * 超过1小时显示 HH:MM:SS，否则显示 MM:SS
 * @param {number} seconds - 秒数
 * @param {string} unknownText - 未知时长的显示文本，默认为 '未知时长'
 * @returns {string} 格式化后的时长字符串
 */
export function formatDuration(seconds: number | undefined | null, unknownText: string = '未知时长'): string {
  if (!seconds || seconds === 0 || isNaN(seconds)) return lt(unknownText)
  
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  // 如果超过1小时，显示时分秒格式 (HH:MM:SS)
  // 如果不超过1小时，只显示分秒格式 (MM:SS)
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 格式化视频时长（分钟数）
 * 将分钟转换为秒后格式化
 * @param {number} minutes - 分钟数
 * @param {string} unknownText - 未知时长的显示文本，默认为 '未知时长'
 * @returns {string} 格式化后的时长字符串
 */
export function formatVideoDuration(minutes: number | undefined | null, unknownText: string = '未知时长'): string {
  if (!minutes || minutes === 0 || isNaN(minutes)) return lt(unknownText)
  return formatDuration(minutes * 60, unknownText)
}