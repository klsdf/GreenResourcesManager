/**
 * 图片专辑拖拽处理 Composable
 * 处理文件夹拖拽添加逻辑，支持批量添加和压缩包文件
 */
import { ref, type Ref } from 'vue'
import { useDragAndDrop } from '../useDragAndDrop'
import notify from '../../utils/NotificationService'
import { Manga } from '@resources/manga.ts'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import type { FolderInfo, ProcessResult } from '../../types/image'

export interface PathUpdateInfo {
  existingAlbum: Manga | null
  newPath: string
  newFolderName: string
}

/**
 * 压缩包文件扩展名列表
 */
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz']

/**
 * 检查文件是否为压缩包
 * @param filePath - 文件路径或文件名
 * @returns 是否为压缩包
 */
export function isArchiveFile(filePath: string): boolean {
  const fileName = filePath.toLowerCase()
  return ARCHIVE_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

export interface ImageDragDropOptions {
  /**
   * 专辑列表（响应式）
   */
  albums: Ref<Manga[]>
  
  /**
   * 添加专辑的回调函数
   */
  onAddAlbum: (albumData: Partial<Manga> | any) => Promise<Manga>
  
  /**
   * 显示路径更新对话框的回调函数
   */
  onShowPathUpdateDialog: (info: PathUpdateInfo) => void
  
  /**
   * 提取标签和作者的回调函数（用于更新筛选器）
   */
  onExtractAllTags?: () => void
  
  /**
   * 检查成就的回调函数
   */
  onCheckAchievements?: () => Promise<void>
  
  /**
   * 保存专辑的回调函数
   */
  onSaveAlbums?: () => Promise<void>
  
  /**
   * 是否只接受单个图片文件（不接受文件夹）
   */
  singleImageOnly?: boolean
}

/**
 * 图片专辑拖拽处理 composable
 */
export function useImageDragDrop(options: ImageDragDropOptions) {
  const {
    albums,
    onAddAlbum,
    onShowPathUpdateDialog,
    onExtractAllTags,
    onCheckAchievements,
    onSaveAlbums,
    singleImageOnly = false
  } = options

  // 获取当前专辑列表
  const getAlbums = () => {
    return 'value' in albums ? albums.value : albums
  }

  // 使用通用拖拽 composable
  const dragDrop = useDragAndDrop({
    enabled: true,
    onDrop: handleImageDrop
  })

  /**
   * 检查文件是否为图片文件
   */
  function isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.bmp', '.webp', '.svg']
    const lowerPath = filePath.toLowerCase()
    return imageExtensions.some(ext => lowerPath.endsWith(ext))
  }

  /**
   * 处理图片文件夹拖拽
   */
  async function handleImageDrop(files: File[]) {
    try {
      console.log('=== 拖拽事件开始 ===')
      console.log('拖拽文件数量:', files.length)
      console.log('单图模式:', singleImageOnly)
      
      if (files.length === 0) {
        console.log('没有拖拽文件，显示错误通知')
        notify.native('拖拽失败', singleImageOnly ? '请拖拽图片文件到此处' : '请拖拽文件夹到此处')
        return
      }
      
      // 如果只接受单个图片文件，过滤出图片文件
      if (singleImageOnly) {
        const imageFiles = files.filter(file => {
          const filePath = (file as any).path || file.name || ''
          return isImageFile(filePath)
        })
        
        if (imageFiles.length === 0) {
          console.log('未检测到图片文件，显示错误通知')
          notify.native('拖拽失败', '请拖拽图片文件到此处（支持 .jpg、.jpeg、.jpe、.jfif、.png、.gif、.bmp、.webp、.svg 格式）')
          return
        }
        
        // 将图片文件转换为文件夹格式
        const detectedFolders: FolderInfo[] = imageFiles.map(file => {
          const filePath = (file as any).path || file.name || ''
          const fileName = file.name || ''
          const imageName = fileName.replace(/\.[^/.]+$/, '') || filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名图片'
          
          return {
            path: filePath,
            name: imageName,
            files: [file]
          }
        })
        
        console.log('检测到的图片文件:', detectedFolders.length)
        console.log('开始批量处理图片文件...')
        const results = await processMultipleFolders(detectedFolders)
        console.log('批量处理完成，结果:', results)
        
        // 显示结果通知
        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length
        
        if (successCount > 0) {
          console.log('显示批量操作结果通知')
          notify.toast('success', '批量添加完成', '', results)
        } else {
          console.log('所有图片添加失败，显示失败通知')
          const failureReasons = results
            .filter(r => !r.success)
            .map((r, index) => `${index + 1}. "${r.folderName}": ${r.error || '未知错误'}`)
            .join('\n')
          
          notify.toast('error', '添加失败', `所有图片添加失败:\n${failureReasons}`, results)
        }
        
        console.log('=== 拖拽事件完成 ===')
        return
      }
      
      // 检测多个文件夹
      console.log('开始检测多个文件夹...')
      const detectedFolders = detectMultipleFolders(files)
      console.log('检测到的文件夹:', detectedFolders)
      
      if (detectedFolders.length === 0) {
        console.log('未检测到有效文件夹，显示错误通知')
        notify.native('拖拽失败', '未检测到有效的文件夹，请拖拽包含图片的文件夹')
        return
      }
      
      console.log('开始批量处理文件夹...')
      // 批量处理文件夹
      const results = await processMultipleFolders(detectedFolders)
      console.log('批量处理完成，结果:', results)
      
      // 显示结果通知
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      if (successCount > 0) {
        console.log('显示批量操作结果通知')
        notify.toast('success', '批量添加完成', '', results)
      } else {
        console.log('所有文件夹添加失败，显示失败通知')
        const failureReasons = results
          .filter(r => !r.success)
          .map((r, index) => `${index + 1}. "${r.folderName}": ${r.error || '未知错误'}`)
          .join('\n')
        
        notify.toast('error', '添加失败', `所有文件夹添加失败:\n${failureReasons}`, results)
      }
      
      console.log('=== 拖拽事件完成 ===')
      
    } catch (error) {
      console.error('拖拽添加漫画失败:', error)
      console.error('错误堆栈:', (error as Error).stack)
      notify.toast('error', '添加失败', `添加漫画失败: ${(error as Error).message}`)
    }
  }

  /**
   * 检测多个文件夹
   */
  function detectMultipleFolders(files: File[]): FolderInfo[] {
    console.log('=== 开始检测多个文件夹 ===')
    console.log('输入文件数量:', files.length)
    
    const folders = new Map<string, FolderInfo>()
    
    // 方法1: 通过 webkitRelativePath 检测多个文件夹
    const folderFiles = files.filter(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'))
    console.log('方法1 - webkitRelativePath 文件数量:', folderFiles.length)
    
    if (folderFiles.length > 0) {
      console.log('使用方法1检测文件夹')
      folderFiles.forEach((file) => {
        const relativeFolderPath = file.webkitRelativePath.split('/')[0]
        
        if ((file as any).path) {
          const fileDir = (file as any).path.substring(0, (file as any).path.lastIndexOf('/'))
          const relativePath = file.webkitRelativePath.substring(0, file.webkitRelativePath.indexOf('/'))
          const fullPath = fileDir + '/' + relativePath
          
          if (!folders.has(fullPath)) {
            folders.set(fullPath, {
              path: fullPath,
              name: relativeFolderPath,
              files: []
            })
          }
          folders.get(fullPath)!.files.push(file)
        }
      })
    } else {
      console.log('方法1失败，尝试方法2')
      // 方法2: 通过文件路径分析检测多个文件夹
      const filePaths = files.filter(f => (f as any).path).map(f => (f as any).path)
      
      if (filePaths.length > 0) {
        // 按目录分组文件
        const dirGroups = new Map<string, string[]>()
        
        filePaths.forEach(filePath => {
          // 检查路径是否看起来像文件夹（没有文件扩展名）
          const hasImageExtension = /\.(jpg|jpeg|jpe|jfif|png|gif|bmp|webp|svg)$/i.test(filePath)
          
          if (!hasImageExtension) {
            // 没有图片扩展名，可能是文件夹路径
            const folderName = filePath.split(/[/\\]/).pop() || '未命名漫画'
            folders.set(filePath, {
              path: filePath,
              name: folderName,
              files: files.filter(f => (f as any).path === filePath)
            })
          } else {
            // 有图片扩展名，按目录分组
            const dir = filePath.substring(0, filePath.lastIndexOf('/'))
            if (dir && dir !== filePath) {
              if (!dirGroups.has(dir)) {
                dirGroups.set(dir, [])
              }
              dirGroups.get(dir)!.push(filePath)
            }
          }
        })
        
        // 检查每个目录是否包含足够的文件（可能是文件夹）
        dirGroups.forEach((fileList, dir) => {
          if (fileList.length >= 1) {
            const folderName = dir.split(/[/\\]/).pop() || '未命名漫画'
            const folderFiles = files.filter(f => (f as any).path && (f as any).path.startsWith(dir))
            
            folders.set(dir, {
              path: dir,
              name: folderName,
              files: folderFiles
            })
          }
        })
      }
      
      // 方法3: 处理单个文件拖拽的特殊情况（包括压缩包文件和单个图片文件）
      if (folders.size === 0 && files.length === 1) {
        console.log('方法2失败，尝试方法3 - 单文件特殊情况')
        const singleFile = files[0]
        
        if ((singleFile as any).path) {
          const filePath = (singleFile as any).path
          const fileName = singleFile.name || ''
          const hasImageExtension = /\.(jpg|jpeg|jpe|jfif|png|gif|bmp|webp|svg)$/i.test(fileName)
          const isArchive = isArchiveFile(filePath)
          
          if (isArchive) {
            // 压缩包文件，直接作为文件夹处理
            console.log('检测到压缩包文件:', filePath)
            const folderName = fileName || filePath.split(/[/\\]/).pop() || '未命名漫画'
            
            folders.set(filePath, {
              path: filePath,
              name: folderName,
              files: [singleFile]
            })
          } else if (hasImageExtension) {
            // 单个图片文件，直接作为专辑处理（单页专辑）
            console.log('检测到单个图片文件:', filePath)
            const imageName = fileName.replace(/\.[^/.]+$/, '') || filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名图片'
            
            folders.set(filePath, {
              path: filePath,
              name: imageName,
              files: [singleFile]
            })
          } else {
            // 没有图片扩展名，可能是文件夹
            const folderPath = filePath
            const folderName = fileName || folderPath.split(/[/\\]/).pop() || '未命名漫画'
            
            folders.set(folderPath, {
              path: folderPath,
              name: folderName,
              files: [singleFile]
            })
          }
        }
      }
      
      // 方法4: 检测多个压缩包文件或图片文件拖拽
      if (folders.size === 0 && files.length > 1) {
        console.log('方法3失败，尝试方法4 - 多文件检测')
        const archiveFiles = files.filter(file => {
          if ((file as any).path) {
            return isArchiveFile((file as any).path)
          }
          return false
        })
        
        const imageFiles = files.filter(file => {
          if ((file as any).path) {
            const fileName = file.name || ''
            return /\.(jpg|jpeg|jpe|jfif|png|gif|bmp|webp|svg)$/i.test(fileName)
          }
          return false
        })
        
        if (archiveFiles.length > 0) {
          console.log('检测到多个压缩包文件:', archiveFiles.length)
          archiveFiles.forEach(file => {
            const filePath = (file as any).path
            const fileName = file.name || filePath.split(/[/\\]/).pop() || '未命名漫画'
            
            folders.set(filePath, {
              path: filePath,
              name: fileName,
              files: [file]
            })
          })
        } else if (imageFiles.length > 0) {
          // 检测到多个图片文件，每个图片文件作为单独的专辑
          console.log('检测到多个图片文件:', imageFiles.length)
          imageFiles.forEach(file => {
            const filePath = (file as any).path
            const fileName = file.name || ''
            const imageName = fileName.replace(/\.[^/.]+$/, '') || filePath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名图片'
            
            folders.set(filePath, {
              path: filePath,
              name: imageName,
              files: [file]
            })
          })
        }
      }
    }
    
    const result = Array.from(folders.values())
    console.log('=== 文件夹检测完成 ===')
    console.log('检测到的文件夹数量:', result.length)
    
    return result
  }

  /**
   * 批量处理多个文件夹
   */
  async function processMultipleFolders(folders: FolderInfo[]): Promise<ProcessResult[]> {
    console.log('=== 开始批量处理文件夹 ===')
    console.log('待处理文件夹数量:', folders.length)
    
    const results: ProcessResult[] = []
    const currentAlbums = getAlbums()
    
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]
      console.log(`\n--- 处理文件夹 ${i + 1}/${folders.length} ---`)
      console.log('文件夹信息:', {
        name: folder.name,
        path: folder.path,
        fileCount: folder.files.length
      })
      
      try {
        // 检查是否已经存在相同的文件夹路径
        const existingAlbumByPath = currentAlbums.find(album => {
          const resourcePath = BaseResources.extractPrimitiveValue(album.resourcePath?.value || album.resourcePath)
          return resourcePath === folder.path
        })
        if (existingAlbumByPath) {
          console.log('文件夹已存在，跳过:', folder.name)
          const albumId = BaseResources.extractPrimitiveValue(existingAlbumByPath.id?.value || existingAlbumByPath.id)
          results.push({
            success: false,
            folderName: folder.name,
            error: `文件夹 "${folder.name}" 已经存在`,
            folderPath: folder.path,
            existingAlbumId: albumId
          })
          continue
        }
        
        // 检查是否存在同名但路径不同的丢失文件夹
        const existingAlbumByName = currentAlbums.find(album => {
          const resourcePath = BaseResources.extractPrimitiveValue(album.resourcePath?.value || album.resourcePath)
          const albumFolderName = resourcePath.split(/[\\/]/).pop()?.toLowerCase() || ''
          const newFolderName = folder.name.toLowerCase()
          const isSameName = albumFolderName === newFolderName
          const fileExists = BaseResources.extractPrimitiveValue(album.fileExists?.value ?? album.fileExists)
          const isFolderMissing = fileExists === false
          
          return isSameName && isFolderMissing
        })
        
        if (existingAlbumByName) {
          console.log(`发现同名丢失文件夹: ${folder.name}`)
          // 显示路径更新确认对话框
          onShowPathUpdateDialog({
            existingAlbum: existingAlbumByName,
            newPath: folder.path,
            newFolderName: folder.name
          })
          // 暂停处理，等待用户确认
          return results
        }
        
        // 验证文件夹路径
        if (!folder.path || folder.path.trim() === '') {
          console.log('文件夹路径为空，跳过:', folder.name)
          results.push({
            success: false,
            folderName: folder.name,
            error: '文件夹路径为空',
            folderPath: folder.path
          })
          continue
        }
        
        // 检查是否为压缩包文件
        const isArchive = isArchiveFile(folder.path)
        
        // 使用回调函数添加专辑
        const createdAlbum = await onAddAlbum({
          name: folder.name,
          author: '',
          description: '',
          tags: [],
          resourcePath: folder.path,
          coverPath: '',
          isArchive: isArchive
        })
        
        console.log('专辑已添加到列表，当前专辑总数:', currentAlbums.length)
        
        results.push({
          success: true,
          folderName: folder.name,
          album: createdAlbum,
          folderPath: folder.path
        })
        
        console.log('文件夹处理成功:', folder.name)
        
      } catch (error) {
        console.error(`处理文件夹 "${folder.name}" 失败:`, error)
        
        // 根据错误类型提供更具体的错误信息
        let errorMessage = (error as Error).message
        if (errorMessage.includes('ENOENT')) {
          errorMessage = '文件夹不存在或无法访问'
        } else if (errorMessage.includes('EACCES')) {
          errorMessage = '没有访问权限'
        } else if (errorMessage.includes('EMFILE') || errorMessage.includes('ENFILE')) {
          errorMessage = '打开文件过多，请稍后重试'
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '操作超时'
        } else if (errorMessage.includes('Invalid path')) {
          errorMessage = '无效的文件夹路径'
        } else if (errorMessage.includes('No image files found')) {
          errorMessage = '文件夹中没有找到图片文件'
        }
        
        results.push({
          success: false,
          folderName: folder.name,
          error: errorMessage,
          folderPath: folder.path,
          originalError: (error as Error).message
        })
      }
    }
    
    console.log('\n=== 批量处理完成 ===')
    console.log('处理结果统计:', {
      总数: results.length,
      成功: results.filter(r => r.success).length,
      失败: results.filter(r => !r.success).length
    })
    
    // 批量保存
    const successCount = results.filter(r => r.success).length
    if (successCount > 0) {
      console.log('开始批量保存，成功数量:', successCount)
      if (onSaveAlbums) {
        await onSaveAlbums()
      }
      
      // 重新提取标签和作者信息，更新筛选器
      if (onExtractAllTags) {
        onExtractAllTags()
      }
      
      // 检查成就
      if (onCheckAchievements) {
        await onCheckAchievements()
      }
    }
    
    return results
  }

  return {
    // 拖拽状态和事件处理函数（从通用 composable 导出）
    isDragOver: dragDrop.isDragOver,
    handleDragOver: dragDrop.handleDragOver,
    handleDragEnter: dragDrop.handleDragEnter,
    handleDragLeave: dragDrop.handleDragLeave,
    handleDrop: dragDrop.handleDrop
  }
}

