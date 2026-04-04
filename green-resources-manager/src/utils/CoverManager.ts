/**
 * CoverManager - 封面图片管理工具
 * 统一处理封面图片的保存和解析
 */
import saveManager from './SaveManager.ts'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'

/**
 * 封面字段列表，所有可能包含封面路径的字段
 */
const COVER_FIELDS = ['coverPath', 'cover', 'thumbnail', 'thumbnailPath']

/**
 * 资源类型到保存目录的映射
 */
const RESOURCE_TYPE_TO_DIR_MAP: Record<string, string> = {
  Game: 'games',
  Software: 'software',
  Image: 'images',
  Manga: 'images',
  SingleImage: 'singleImage',
  Video: 'videos',
  Anime: 'videos',
  Novel: 'novels',
  Website: 'websites',
  Audio: 'audios',
  Other: 'other'
}

/**
 * 获取资源类型对应的目录名
 */
function getResourceTypeDir(resourceType: string): string {
  return RESOURCE_TYPE_TO_DIR_MAP[resourceType] || 'other'
}

/**
 * 检查封面路径是否需要处理（不是相对路径且不是特殊协议）
 */
function shouldProcessCover(coverPath: string): boolean {
  if (!coverPath || typeof coverPath !== 'string') return false
  
  // 如果是相对路径（相对于 SaveData 目录），不需要处理
  if (!coverPath.includes(':') && !coverPath.startsWith('file://') && !coverPath.startsWith('archive://') && !coverPath.startsWith('http://') && !coverPath.startsWith('https://') && !coverPath.startsWith('data:')) {
    return false
  }
  
  return true
}

/**
 * 检查封面路径是否是 dataURL 格式
 */
function isDataUrl(coverPath: string): boolean {
  return coverPath.startsWith('data:')
}

/**
 * 从资源数据中提取封面字段
 */
function extractCoverFromResource(resource: any): { field: string; value: string } | null {
  for (const field of COVER_FIELDS) {
    const value = BaseResources.extractPrimitiveValue(resource[field])
    if (value && typeof value === 'string' && value.trim() !== '') {
      return { field, value }
    }
  }
  return null
}

/**
 * 处理单个资源的封面，保存到 cover 文件夹
 * @param resource - 资源对象
 * @param resourceType - 资源类型（Game, Image, Video 等）
 * @param resourceId - 资源 ID
 * @returns Promise<处理后的资源对象>
 */
export async function processCoverForResource(
  resource: any, 
  resourceType: string, 
  resourceId: string
): Promise<any> {
  try {
    if (!window.electronAPI) {
      console.warn('[CoverManager] Electron API 不可用，跳过封面处理')
      return resource
    }
    
    // 提取封面信息
    const coverInfo = extractCoverFromResource(resource)
    if (!coverInfo) {
      console.log('[CoverManager] 资源没有封面信息，跳过处理')
      return resource
    }
    
    const { field, value: coverPath } = coverInfo
    
    // 检查是否需要处理
    if (!shouldProcessCover(coverPath)) {
      console.log('[CoverManager] 封面路径不需要处理:', coverPath)
      return resource
    }
    
    // 获取 SaveData 目录
    const saveDataDir = saveManager.dataDirectory
    const typeDir = getResourceTypeDir(resourceType)
    
    let result: any
    
    if (isDataUrl(coverPath)) {
      // 处理 dataURL
      console.log('[CoverManager] 保存 dataURL 封面到文件夹:', { resourceType, resourceId })
      result = await window.electronAPI.saveCoverFromDataUrl(coverPath, saveDataDir, typeDir, resourceId)
    } else {
      // 处理文件路径
      console.log('[CoverManager] 复制封面到文件夹:', { coverPath, resourceType, resourceId })
      result = await window.electronAPI.saveCoverToFolder(coverPath, saveDataDir, typeDir, resourceId)
    }
    
    if (result?.success && result?.coverPath) {
      console.log('[CoverManager] 封面处理成功:', result.coverPath)
      
      // 更新资源对象中的封面字段
      const newResource = { ...resource }
      
      // 更新找到的封面字段
      if (newResource[field] && typeof newResource[field] === 'object' && 'value' in newResource[field]) {
        newResource[field].value = result.coverPath
      } else {
        newResource[field] = result.coverPath
      }
      
      return newResource
    } else {
      console.warn('[CoverManager] 封面处理失败:', result?.error)
      return resource
    }
  } catch (error) {
    console.error('[CoverManager] 处理封面时出错:', error)
    return resource
  }
}

/**
 * 获取封面的完整 URL 用于显示
 * @param coverPath - 封面路径（可以是相对路径或绝对路径）
 * @returns Promise<string> - 完整的 URL 路径
 */
export async function getCoverUrl(coverPath: string): Promise<string> {
  try {
    if (!coverPath || typeof coverPath !== 'string') {
      return ''
    }
    
    // 如果是特殊协议，直接返回
    if (coverPath.startsWith('file://') || 
        coverPath.startsWith('archive://') || 
        coverPath.startsWith('http://') || 
        coverPath.startsWith('https://') || 
        coverPath.startsWith('data:')) {
      return coverPath
    }
    
    // 检查 Electron API 是否可用
    if (!window.electronAPI || !window.electronAPI.getCoverFullPath) {
      // 如果没有 API，尝试直接返回
      return coverPath
    }
    
    // 获取完整路径
    const result = await window.electronAPI.getCoverFullPath(coverPath, saveManager.dataDirectory)
    if (result?.success && result?.fullPath) {
      return result.fullPath
    }
    
    return coverPath
  } catch (error) {
    console.error('[CoverManager] 获取封面 URL 失败:', error)
    return coverPath
  }
}

export default {
  processCoverForResource,
  getCoverUrl,
  extractCoverFromResource,
  shouldProcessCover,
  getResourceTypeDir
}
