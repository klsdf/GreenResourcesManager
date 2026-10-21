/**
 * 封面管理 Composable
 * 处理专辑封面的选择、设置等操作
 */
import { ref, type Ref } from 'vue'
import notify from '../../utils/NotificationService'

export interface ImageCoverOptions {
  /**
   * 封面路径的 ref（用于新专辑）
   */
  coverRef: Ref<string>
  
  /**
   * 文件夹路径的 ref（用于验证）
   */
  folderPathRef: Ref<string>
}

/**
 * 封面管理 composable
 */
export function useImageCover(options: ImageCoverOptions) {
  const { coverRef, folderPathRef } = options

  /**
   * 浏览选择自定义封面
   */
  async function browseForImage(): Promise<void> {
    try {
      if (window.electronAPI && (window.electronAPI as any).selectImageFile) {
        const filePath = await (window.electronAPI as any).selectImageFile()
        if (filePath) {
          coverRef.value = filePath
        }
      }
    } catch (e) {
      console.error('选择封面失败:', e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      alert('选择封面失败: ' + errorMessage)
    }
  }

  /**
   * 使用第一张图片作为封面
   */
  async function useFirstImageAsCover(): Promise<void> {
    try {
      if (!folderPathRef.value) {
        notify.toast('error', '设置失败', '请先选择漫画文件夹')
        return
      }
      
      // 获取文件夹中的图片文件
      let files: string[] = []
      if (window.electronAPI && (window.electronAPI as any).listImageFiles) {
        const resp = await (window.electronAPI as any).listImageFiles(folderPathRef.value)
        if (resp.success) {
          files = resp.files || []
        }
      }
      
      if (files.length > 0) {
        // 使用第一张图片作为封面
        coverRef.value = files[0]
      } else {
        notify.toast('error', '设置失败', '文件夹中没有找到图片文件')
      }
    } catch (e) {
      console.error('设置第一张图片为封面失败:', e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      notify.toast('error', '设置失败', `设置封面失败: ${errorMessage}`)
    }
  }

  /**
   * 从文件夹中选择封面
   */
  async function selectImageFromFolder(): Promise<void> {
    try {
      if (!folderPathRef.value) {
        notify.toast('error', '设置失败', '请先选择漫画文件夹')
        return
      }
      
      console.log('从文件夹选择封面，目标目录:', folderPathRef.value)
      
      if (window.electronAPI && (window.electronAPI as any).selectScreenshotImage) {
        // 使用专门的截图图片选择器（可以用于任何文件夹）
        const filePath = await (window.electronAPI as any).selectScreenshotImage(folderPathRef.value)
        if (filePath) {
          coverRef.value = filePath
        }
      } else if (window.electronAPI && (window.electronAPI as any).selectImageFile) {
        // 降级到普通图片选择器
        const filePath = await (window.electronAPI as any).selectImageFile(folderPathRef.value)
        if (filePath) {
          coverRef.value = filePath
        }
      } else {
        alert('当前环境不支持从文件夹选择图片功能')
      }
    } catch (error) {
      console.error('从文件夹选择封面失败:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`从文件夹选择封面失败: ${errorMessage}`)
    }
  }

  /**
   * 清除封面
   */
  function clearCover(): void {
    coverRef.value = ''
  }

  return {
    browseForImage,
    useFirstImageAsCover,
    selectImageFromFolder,
    clearCover
  }
}

