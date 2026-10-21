/**
 * ============================================================================
 * 常量定义模块 (Constants)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块定义了应用中使用的各种常量，包括文件路径、配置选项等。
 * 
 * 主要常量：
 * - 文件扩展名常量
 * - 默认配置值
 * - 路径常量
 * 
 * ============================================================================
 */

// 支持的视频格式
const SUPPORTED_VIDEO_FORMATS = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv']

// 支持的音频格式
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff']

// 支持的图片格式
const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'jpe', 'jfif', 'gif', 'bmp', 'webp', 'svg', 'ico']

// 支持的文本/小说格式
const SUPPORTED_TEXT_FORMATS = ['txt', 'md', 'rtf', 'epub', 'mobi', 'azw', 'azw3', 'pdf']

// MIME 类型映射
const MIME_TYPES = {
  // 视频
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'mkv': 'video/x-matroska',
  'flv': 'video/x-flv',
  'wmv': 'video/x-ms-wmv',
  'm4v': 'video/mp4',
  '3gp': 'video/3gpp',
  'ogv': 'video/ogg',
  // 图片
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'jpe': 'image/jpeg',
  'jfif': 'image/jpeg',
  'gif': 'image/gif',
  'bmp': 'image/bmp',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon'
}

// 默认窗口尺寸
const DEFAULT_WINDOW_SIZE = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600
}

// 默认视频窗口尺寸
const DEFAULT_VIDEO_WINDOW_SIZE = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600
}

// 备份文件保留数量
const MAX_BACKUP_FILES = 3

module.exports = {
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_TEXT_FORMATS,
  MIME_TYPES,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_VIDEO_WINDOW_SIZE,
  MAX_BACKUP_FILES
}

