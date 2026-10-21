/**
 * ============================================================================
 * 路径处理工具模块 (Path Utilities)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块提供了路径处理相关的工具函数，用于处理文件路径、目录路径等。
 * 
 * 主要功能：
 * 1. 规范化路径
 * 2. 路径解析和组合
 * 3. 路径验证
 * 4. 相对路径转换
 * 
 * 导出的函数：
 * - normalizePath()        规范化路径（处理分隔符）
 * - joinPath()             安全地组合路径
 * - getAppRootPath()       获取应用根目录路径
 * - getFileUrl()           获取文件的 file:// URL（用于渲染进程）
 * 
 * ============================================================================
 */

const path = require('path')
const { app } = require('electron')

/**
 * 规范化路径
 * @param {string} filePath - 文件路径
 * @returns {string} 规范化后的路径
 */
function normalizePath(filePath) {
  if (!filePath) return ''
  return path.normalize(filePath)
}

/**
 * 安全地组合路径
 * @param {...string} segments - 路径片段
 * @returns {string} 组合后的路径
 */
function joinPath(...segments) {
  return path.join(...segments)
}

/**
 * 获取应用根目录路径
 * @returns {string} 应用根目录路径
 */
function getAppRootPath() {
  return process.cwd()
}

/**
 * 获取文件的 file:// URL（用于在渲染进程中加载本地文件）
 * @param {string} filePath - 文件路径
 * @returns {string} file:// URL
 */
function getFileUrl(filePath) {
  if (!filePath) return ''
  
  try {
    // 将反斜杠转换为正斜杠，并确保路径以 / 开头
    const normalized = filePath.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
    
    // 对路径进行编码，处理中文和特殊字符
    const encoded = normalized.split('/').map(seg => {
      if (seg.includes(':')) {
        // 处理 Windows 盘符（如 C:）
        return seg
      }
      return encodeURIComponent(seg)
    }).join('/')
    
    return 'file://' + encoded
  } catch (error) {
    console.error('构建文件URL失败:', error)
    return filePath
  }
}

/**
 * 将本地图片转为 data:URL（用于 http(s) 环境下避免 file:// 被拦截）
 * @param {string} filePath - 图片文件路径
 * @returns {string|null} data:URL 或 null
 */
function readFileAsDataUrl(filePath) {
  try {
    const fs = require('fs')
    if (!filePath || filePath.trim() === '') return null
    if (!fs.existsSync(filePath)) return null
    
    const ext = path.extname(filePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' :
                 ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                 ext === '.gif' ? 'image/gif' :
                 ext === '.webp' ? 'image/webp' :
                 ext === '.bmp' ? 'image/bmp' :
                 ext === '.svg' ? 'image/svg+xml' :
                 ext === '.avif' ? 'image/avif' :
                 ext === '.ico' ? 'image/x-icon' :
                 ext === '.pdf' ? 'application/pdf' :
                 ext === '.mp3' ? 'audio/mpeg' :
                 ext === '.wav' ? 'audio/wav' :
                 ext === '.flac' ? 'audio/flac' :
                 ext === '.aac' ? 'audio/aac' :
                 ext === '.ogg' ? 'audio/ogg' :
                 ext === '.m4a' ? 'audio/mp4' :
                 ext === '.wma' ? 'audio/x-ms-wma' :
                 ext === '.opus' ? 'audio/opus' :
                 ext === '.webm' ? 'audio/webm' :
                 'application/octet-stream'
    
    const buf = fs.readFileSync(filePath)
    const base64 = buf.toString('base64')
    return `data:${mime};base64,${base64}`
  } catch (error) {
    console.error('read-file-as-data-url 失败:', error)
    return null
  }
}

module.exports = {
  normalizePath,
  joinPath,
  getAppRootPath,
  getFileUrl,
  readFileAsDataUrl
}

