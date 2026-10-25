/**
 * 资源大小计算服务
 * 负责计算和更新资源的大小信息（如文件夹大小、文件大小等）
 * 与资源类解耦，资源类只负责配置和存储
 */

import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import { ResourceField } from '@resources/base/ResourceField.ts'
import { isArchiveFile } from '../composables/useArchive'
import notify from './NotificationService.ts'

/**
 * 一次导入里同一个文件夹只算一次大小。
 * key 是规范化后的文件夹路径，value 是正在进行或已经完成的扫描。
 */
export type FolderSizeCache = Map<string, Promise<number | null>>

/**
 * 文件夹路径的比较键。忽略斜杠方向和大小写。
 * @param folderPath 文件夹路径
 * @returns 比较用的键
 */
function folderSizeCacheKey(folderPath: string): string {
  return folderPath.replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase()
}

/**
 * 是不是盘符根目录。整个磁盘扫大小没有意义，也会把导入卡死。
 * @param folderPath 文件夹路径
 * @returns 是否盘符根目录
 */
function isDriveRoot(folderPath: string): boolean {
  return /^[a-zA-Z]:[\\/]?$/.test(folderPath) || folderPath === '/' || folderPath === '\\'
}

/**
 * 取文件夹大小，同一个批次里复用结果。扫描失败时返回 null。
 * @param folderPath 文件夹路径
 * @param cache 批次缓存
 * @returns 字节数
 */
async function getFolderSize(folderPath: string, cache?: FolderSizeCache): Promise<number | null> {
  if (!window.electronAPI?.getFolderSize) {
    return null
  }
  const cacheKey = folderSizeCacheKey(folderPath)
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey)!
  }
  const promise = (async () => {
    try {
      const result = await window.electronAPI!.getFolderSize(folderPath)
      return result.success && typeof result.size === 'number' ? result.size : null
    } catch (error) {
      console.error('[ResourceSizeService] 获取文件夹大小失败:', folderPath, error)
      return null
    }
  })()
  cache?.set(cacheKey, promise)
  return promise
}

/**
 * 计算资源大小
 * @param resource - 资源实例
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @param calculateFolderSize - 是否计算文件所在文件夹的大小（如果资源是文件）
 * @param folderSizeCache - 批次内共享的文件夹大小缓存
 * @returns 计算得到的大小（字节），如果计算失败返回 null
 */
export async function calculateResourceSize(
  resource: any,
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false,
  folderSizeCache?: FolderSizeCache
): Promise<number | null> {
  if (!isElectronEnvironment || !window.electronAPI) {
    return null
  }

  // 获取资源路径
  const resourcePath = BaseResources.extractPrimitiveValue(
    resource.resourcePath?.value || resource.resourcePath || resource.executablePath?.value || resource.executablePath
  )

  if (!resourcePath || typeof resourcePath !== 'string') {
    return null
  }

  const filePath = resourcePath.trim()
  const isArchive = isArchiveFile(filePath)

  try {
    // 如果是压缩包，使用 getFileStats
    if (isArchive && window.electronAPI.getFileStats) {
      const result = await window.electronAPI.getFileStats(filePath)
      if (result.success && result.size) {
        return result.size
      }
    }
    // 如果是文件夹，使用 getFolderSize
    else if (window.electronAPI.getFolderSize && window.electronAPI.getFileStats) {
      // 先判断是否为文件夹
      const stats = await window.electronAPI.getFileStats(filePath)

      if (stats.success) {
        // 处理文件夹
        if (stats.isDirectory === true) {
          const size = await getFolderSize(filePath, folderSizeCache)
          if (size !== null) {
            return size
          }
        }
        // 处理文件（包括可执行文件）
        else if (stats.size !== undefined) {
          // 如果配置了计算文件夹大小，则计算文件所在文件夹的大小
          if (calculateFolderSize) {
            const separatorIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
            const folderPath = separatorIndex > 0 ? filePath.slice(0, separatorIndex) : ''
            // 文件就放在盘符根目录时不扫整块盘，退回文件自身大小。
            if (folderPath && folderPath !== filePath && !isDriveRoot(folderPath)) {
              const size = await getFolderSize(folderPath, folderSizeCache)
              if (size !== null) {
                return size
              }
              return stats.size
            }
          }
          return stats.size
        }
      }
    }
  } catch (error) {
    console.error('[ResourceSizeService] 计算资源大小失败:', error)
    return null
  }

  return null
}

/**
 * 更新资源的大小字段
 * @param resource - 资源实例
 * @param size - 大小（字节）
 */
export function updateResourceSize(resource: any, size: number | null): void {
  if (size === null) {
    return
  }

  // 尝试更新 ResourceField
  if (resource.folderSize instanceof ResourceField) {
    resource.folderSize.value = size
  } else if (resource.folderSize && typeof resource.folderSize === 'object' && 'value' in resource.folderSize) {
    resource.folderSize.value = size
  } else {
    // 降级：直接设置属性
    resource.folderSize = size
  }
}

/**
 * 计算并更新资源大小
 * @param resource - 资源实例
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @param calculateFolderSize - 是否计算文件所在文件夹的大小（如果资源是文件）
 * @param folderSizeCache - 批次内共享的文件夹大小缓存
 * @returns 是否成功更新
 */
export async function calculateAndUpdateResourceSize(
  resource: any,
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false,
  folderSizeCache?: FolderSizeCache
): Promise<boolean> {
  const size = await calculateResourceSize(resource, isElectronEnvironment, calculateFolderSize, folderSizeCache)
  if (size !== null) {
    updateResourceSize(resource, size)
    return true
  }
  return false
}

/**
 * 批量计算资源大小
 * @param resources - 资源实例数组
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @param calculateFolderSize - 是否计算文件所在文件夹的大小（如果资源是文件）
 * @param onProgress - 进度回调 (current, total)
 * @param folderSizeCache - 批次内共享的文件夹大小缓存
 * @returns 成功更新的数量
 */
export async function calculateResourceSizesBatch(
  resources: any[],
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false,
  onProgress?: (current: number, total: number) => void,
  folderSizeCache: FolderSizeCache = new Map()
): Promise<number> {
  if (!isElectronEnvironment || !window.electronAPI) {
    return 0
  }

  let successCount = 0
  const total = resources.length

  // 文件夹大小要递归扫盘，并发开太大会互相拖慢；两条一起走就够用了
  let nextIndex = 0
  let completed = 0
  const worker = async () => {
    while (nextIndex < total) {
      const index = nextIndex++
      const resource = resources[index]
      const size = await calculateResourceSize(resource, isElectronEnvironment, calculateFolderSize, folderSizeCache)
      if (size !== null) {
        updateResourceSize(resource, size)
        successCount++
      }
      completed++
      onProgress?.(completed, total)
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, total) }, () => worker()))
  return successCount
}
