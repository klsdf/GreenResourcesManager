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
 * 计算资源大小
 * @param resource - 资源实例
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @param calculateFolderSize - 是否计算文件所在文件夹的大小（如果资源是文件）
 * @returns 计算得到的大小（字节），如果计算失败返回 null
 */
export async function calculateResourceSize(
  resource: any,
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false
): Promise<number | null> {
  if (!isElectronEnvironment || !window.electronAPI) {
    console.log('[ResourceSizeService] 不支持的环境:', { isElectronEnvironment, hasElectronAPI: !!window.electronAPI })
    return null
  }

  // 获取资源路径
  const resourcePath = BaseResources.extractPrimitiveValue(
    resource.resourcePath?.value || resource.resourcePath || resource.executablePath?.value || resource.executablePath
  )

  if (!resourcePath || typeof resourcePath !== 'string') {
    console.log('[ResourceSizeService] 无效的资源路径:', { resourcePath, resourceType: resource.constructor?.name })
    return null
  }

  const filePath = resourcePath.trim()
  const isArchive = isArchiveFile(filePath)
  const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name) || '未知'
  
  console.log('[ResourceSizeService] 开始计算资源大小:', {
    resourceName,
    filePath,
    isArchive,
    resourceType: resource.constructor?.name
  })

  try {
    // 如果是压缩包，使用 getFileStats
    if (isArchive && window.electronAPI.getFileStats) {
      console.log('[ResourceSizeService] 处理压缩包文件:', filePath)
      const result = await window.electronAPI.getFileStats(filePath)
      console.log('[ResourceSizeService] 压缩包文件统计结果:', { success: result.success, size: result.size })
      if (result.success && result.size) {
        return result.size
      }

    }
    // 如果是文件夹，使用 getFolderSize
    else if (window.electronAPI.getFolderSize) {
      // 先判断是否为文件夹
      if (window.electronAPI.getFileStats) {
          const stats = await window.electronAPI.getFileStats(filePath)
          console.log('[ResourceSizeService] 文件统计结果:', { success: stats.success, isDirectory: stats.isDirectory, size: stats.size })
          
          if (stats.success) {
            // 处理文件夹
            if (stats.isDirectory === true) {
              console.log('[ResourceSizeService] 开始计算文件夹大小:', filePath)
              const result = await window.electronAPI.getFolderSize(filePath)
              console.log('[ResourceSizeService] 文件夹大小计算结果:', { success: result.success, size: result.size })
              
              if (result.success) {
                return result.size
              } else {
                console.log('[ResourceSizeService] 文件夹大小计算失败:', result.error || '未知错误')
              }
            }
            // 处理文件（包括可执行文件）
            else if (stats.size !== undefined) {
              // 如果配置了计算文件夹大小，则计算文件所在文件夹的大小
              if (calculateFolderSize && window.electronAPI.getFolderSize) {
                const folderPath = filePath.substring(0, filePath.lastIndexOf('/')) || filePath.substring(0, filePath.lastIndexOf('\\'))
                if (folderPath && folderPath !== filePath) {
                  console.log('[ResourceSizeService] 开始计算文件所在文件夹大小:', folderPath)
                  const result = await window.electronAPI.getFolderSize(folderPath)
                  console.log('[ResourceSizeService] 文件夹大小计算结果:', { success: result.success, size: result.size })
                  
                  if (result.success) {
                    return result.size
                  } else {
                    console.log('[ResourceSizeService] 文件夹大小计算失败，返回文件本身大小:', stats.size)
                    return stats.size
                  }
                }
              }
              console.log('[ResourceSizeService] 直接返回文件大小:', stats.size)
              return stats.size
            }
            // 未知类型
            else {
              console.log('[ResourceSizeService] 无法确定文件类型或获取大小:', filePath)
            }
          } else {
            console.log('[ResourceSizeService] 文件不存在或无法访问:', filePath)
          }
        }
    } else {
      console.log('[ResourceSizeService] 缺少必要的Electron API: getFolderSize')
    }
  } catch (error) {
    console.error('[ResourceSizeService] 计算资源大小失败:', error)
    return null
  }

  console.log('[ResourceSizeService] 无法计算资源大小:', filePath)
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
  
  console.log('[ResourceSizeService] 更新资源大小:', {
    resourceId: BaseResources.extractPrimitiveValue(resource.id?.value || resource.id),
    size,
    folderSizeType: resource.folderSize?.constructor?.name,
    folderSizeValue: resource.folderSize?.value || resource.folderSize
  })
}

/**
 * 计算并更新资源大小
 * @param resource - 资源实例
 * @param isElectronEnvironment - 是否为 Electron 环境
 * @param calculateFolderSize - 是否计算文件所在文件夹的大小（如果资源是文件）
 * @returns 是否成功更新
 */
export async function calculateAndUpdateResourceSize(
  resource: any,
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false
): Promise<boolean> {
  const size = await calculateResourceSize(resource, isElectronEnvironment, calculateFolderSize)
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
 * @returns 成功更新的数量
 */
export async function calculateResourceSizesBatch(
  resources: any[],
  isElectronEnvironment: boolean,
  calculateFolderSize: boolean = false,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  if (!isElectronEnvironment || !window.electronAPI) {
    return 0
  }

  let successCount = 0
  const total = resources.length

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i]
    const size = await calculateResourceSize(resource, isElectronEnvironment, calculateFolderSize)
    if (size !== null) {
      updateResourceSize(resource, size)
      successCount++
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }

    // 添加小延迟，避免过于频繁的 IO 操作
    if (i < resources.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  return successCount
}
