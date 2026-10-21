/**
 * 图片专辑管理 Composable
 * 负责专辑的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import { Manga } from '@resources/manga.ts'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'

const IMAGE_COLLECTION_ACHIEVEMENTS = [
  { threshold: 50, id: 'image_collector_50' },
  { threshold: 100, id: 'image_collector_100' },
  { threshold: 500, id: 'image_collector_500' },
  { threshold: 1000, id: 'image_collector_1000' }
]

export function useImageAlbum(pageId: string = 'images') {
  const albums = ref<Manga[]>([])
  const currentAlbum = ref<Manga | null>(null)
  const isLoading = ref(false)

  /**
   * 加载所有专辑
   * 将 JSON 对象转换为 Manga 类实例
   */
  const loadAlbums = async () => {
    try {
      isLoading.value = true
      const jsonData = await saveManager.loadPageData(pageId)
      albums.value = jsonData.map((data: any) => Manga.fromJSON(data))
      
      // 修复单图的封面：单图模式下，封面应该直接使用 resourcePath（图片文件本身）
      // 同时确保 fileExists 属性存在（默认为 true）
      albums.value.forEach(album => {
        // 单图模式：封面就是图片文件本身
        const resourcePath = BaseResources.extractPrimitiveValue(album.resourcePath?.value || album.resourcePath)
        if (isImageFile(resourcePath)) {
          album.coverPath.value = resourcePath
        }
        // 确保 fileExists 属性存在（如果没有则默认为 true）
        if (album.fileExists?.value === undefined) {
          album.fileExists.value = true
        }
      })
    } catch (error) {
      console.error('加载专辑失败:', error)
      notify.toast('error', '加载失败', '无法加载漫画列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有专辑
   * 使用 getSaveData 过滤数据，只保存定义的字段
   */
  const saveAlbums = async (): Promise<void> => {
    try {
      // 使用 getSaveData 提取需要保存的字段
      const saveableAlbums = albums.value.map(album =>
        BaseResources.composeSaveData(album, album.getSaveData())
      )
      await saveManager.savePageData(pageId, saveableAlbums)
    } catch (error) {
      console.error('保存专辑失败:', error)
      throw error
    }
  }

  /**
   * 检查图片收藏成就
   */
  const checkImageCollectionAchievements = async () => {
    if (!Array.isArray(albums.value)) return

    const totalAlbums = albums.value.length
    const unlockPromises = IMAGE_COLLECTION_ACHIEVEMENTS
      .filter(config => totalAlbums >= config.threshold)
      .map(config => {
        // 动态导入避免循环依赖
        return import('../../pages/user/AchievementView.vue').then(module => 
          module.unlockAchievement(config.id)
        )
      })

    if (unlockPromises.length === 0) return

    try {
      await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('触发图片收藏成就时出错:', error)
    }
  }

  /**
   * 从路径提取文件夹名
   */
  const extractFolderName = (path: string): string => {
    const parts = String(path || '').replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || '未命名'
  }

  /**
   * 检查路径是否为单个图片文件
   */
  const isImageFile = (path: string | null | undefined): boolean => {
    if (!path || typeof path !== 'string') {
      return false
    }
    const imageExtensions = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.bmp', '.webp', '.svg']
    const lowerPath = path.toLowerCase()
    return imageExtensions.some(ext => lowerPath.endsWith(ext))
  }

  /**
   * 添加新专辑
   * 如果传入的是普通对象，会转换为 Manga 实例
   */
  const addAlbum = async (albumData: Partial<Manga> | any): Promise<Manga> => {
    const resourcePath = BaseResources.extractPrimitiveValue(albumData.resourcePath?.value || albumData.resourcePath) || 
                         BaseResources.extractPrimitiveValue(albumData.folderPath) || 
                         ''
    
    if (!resourcePath.trim()) {
      throw new Error('文件夹路径不能为空')
    }

    const path = resourcePath.trim()
    const isSingleImage = isImageFile(path)

    // 检查是否已存在相同路径的专辑
    const existingAlbum = albums.value.find(
      a => BaseResources.extractPrimitiveValue(a.resourcePath?.value || a.resourcePath) === path
    )
    if (existingAlbum) {
      throw new Error(`路径 "${path}" 已经存在`)
    }

    // 检查是否为压缩包
    const isArchive = BaseResources.extractPrimitiveValue(albumData.isArchive?.value ?? albumData.isArchive) || false
    
    // 扫描图片文件
    let pages: string[] = []
    if (isSingleImage) {
      // 单个图片文件，直接使用该文件路径
      pages = [path]
    } else if (!isArchive && window.electronAPI?.listImageFiles) {
      // 文件夹，扫描其中的图片文件
      const resp = await window.electronAPI.listImageFiles(path)
      if (resp.success) {
        pages = resp.files || []
      } else {
        throw new Error(resp.error || '扫描图片文件失败')
      }
    }

    // 提取名称
    let albumName = BaseResources.extractPrimitiveValue(albumData.name?.value || albumData.name)?.trim()
    if (!albumName) {
      if (isSingleImage) {
        // 单个图片：使用文件名（不含扩展名）
        const fileName = extractFolderName(path)
        albumName = fileName.replace(/\.[^/.]+$/, '')
      } else {
        // 文件夹：使用文件夹名
        albumName = extractFolderName(path)
      }
    }

    // 单图模式：封面就是图片文件本身
    const coverPath = isSingleImage 
      ? (BaseResources.extractPrimitiveValue(albumData.coverPath?.value || albumData.coverPath) || 
         BaseResources.extractPrimitiveValue(albumData.cover) || path)  // 单图：使用 resourcePath 作为封面
      : (BaseResources.extractPrimitiveValue(albumData.coverPath?.value || albumData.coverPath) || 
         BaseResources.extractPrimitiveValue(albumData.cover) || pages[0] || '')  // 多图：使用第一张图片或提供的封面

    // 创建 Manga 数据对象
    const mangaData: any = {
      name: albumName,
      author: BaseResources.extractPrimitiveValue(albumData.author?.value || albumData.author)?.trim() || '',
      description: BaseResources.extractPrimitiveValue(albumData.description?.value || albumData.description)?.trim() || '',
      tags: BaseResources.extractPrimitiveValue(albumData.tags?.value || albumData.tags) || [],
      resourcePath: path,
      coverPath: coverPath,
      pagesCount: pages.length,
      addedDate: new Date().toISOString(),
      visitedSessions: [],
      fileExists: true,
      isArchive: isArchive
    }

    // 使用 fromJSON 创建 Manga 实例（会自动生成 id）
    const manga = Manga.fromJSON(mangaData)
    albums.value.push(manga)
    await saveAlbums()
    
    return manga
  }

  /**
   * 更新专辑
   */
  const updateAlbum = async (id: string, updates: Partial<Manga> | any): Promise<void> => {
    const resourceId = BaseResources.extractPrimitiveValue(id)
    const index = albums.value.findIndex(a => BaseResources.extractPrimitiveValue(a.id?.value || a.id) === resourceId)
    if (index === -1) {
      throw new Error('未找到要编辑的漫画')
    }

    const target = albums.value[index]
    const oldResourcePath = BaseResources.extractPrimitiveValue(target.resourcePath?.value || target.resourcePath)
    const isSingleImage = isImageFile(oldResourcePath)
    
    // 更新字段（支持 ResourceField 和普通值）
    if (updates.name !== undefined) {
      const nameValue = BaseResources.extractPrimitiveValue(updates.name?.value || updates.name)
      target.name.value = nameValue?.trim() || target.name.value
    }
    if (updates.author !== undefined) {
      const authorValue = BaseResources.extractPrimitiveValue(updates.author?.value || updates.author)
      target.author.value = authorValue?.trim() || ''
    }
    if (updates.description !== undefined) {
      const descValue = BaseResources.extractPrimitiveValue(updates.description?.value || updates.description)
      target.description.value = descValue?.trim() || ''
    }
    if (updates.tags !== undefined) {
      const tagsValue = BaseResources.extractPrimitiveValue(updates.tags?.value || updates.tags)
      target.tags.value = Array.isArray(tagsValue) ? [...tagsValue] : []
    }
    if (updates.resourcePath !== undefined || updates.folderPath !== undefined) {
      const pathValue = BaseResources.extractPrimitiveValue(
        updates.resourcePath?.value || updates.resourcePath ||
        updates.folderPath?.value || updates.folderPath
      )
      target.resourcePath.value = pathValue?.trim() || target.resourcePath.value
      // 单图模式：如果更新了 resourcePath，封面也应该更新为新的 resourcePath
      const newResourcePath = BaseResources.extractPrimitiveValue(target.resourcePath?.value || target.resourcePath)
      const newIsSingleImage = isImageFile(newResourcePath)
      if (newIsSingleImage && (!updates.coverPath || BaseResources.extractPrimitiveValue(updates.coverPath?.value || updates.coverPath) === oldResourcePath)) {
        target.coverPath.value = newResourcePath
      }
    }
    if (updates.coverPath !== undefined || updates.cover !== undefined) {
      // 单图模式：如果明确设置了封面，使用设置的封面；否则使用 resourcePath
      const coverValue = BaseResources.extractPrimitiveValue(
        updates.coverPath?.value || updates.coverPath ||
        updates.cover?.value || updates.cover
      )
      const newResourcePath = BaseResources.extractPrimitiveValue(target.resourcePath?.value || target.resourcePath)
      const newIsSingleImage = isImageFile(newResourcePath)
      target.coverPath.value = newIsSingleImage && !coverValue?.trim() 
        ? newResourcePath 
        : (coverValue?.trim() || '')
    }
    if (updates.rating !== undefined) {
      const ratingValue = BaseResources.extractPrimitiveValue(updates.rating?.value ?? updates.rating)
      target.rating.value = ratingValue
    }
    if (updates.comment !== undefined) {
      const commentValue = BaseResources.extractPrimitiveValue(updates.comment?.value || updates.comment)
      target.comment.value = commentValue || ''
    }
    if (updates.isFavorite !== undefined) {
      const favoriteValue = BaseResources.extractPrimitiveValue(updates.isFavorite?.value ?? updates.isFavorite)
      target.isFavorite.value = Boolean(favoriteValue)
    }
    
    // 如果更换了文件夹，重新扫描图片
    const newResourcePath = BaseResources.extractPrimitiveValue(
      updates.resourcePath?.value || updates.resourcePath ||
      updates.folderPath?.value || updates.folderPath
    )
    if (newResourcePath && newResourcePath.trim() && newResourcePath !== oldResourcePath) {
      await refreshAlbumPages(target)
      // 单图模式：更新封面为新的 resourcePath
      const currentResourcePath = BaseResources.extractPrimitiveValue(target.resourcePath?.value || target.resourcePath)
      if (isImageFile(currentResourcePath)) {
        target.coverPath.value = currentResourcePath
      }
    }

    await saveAlbums()
  }

  /**
   * 删除专辑
   */
  const removeAlbum = async (id: string): Promise<void> => {
    const resourceId = BaseResources.extractPrimitiveValue(id)
    const index = albums.value.findIndex(a => BaseResources.extractPrimitiveValue(a.id?.value || a.id) === resourceId)
    if (index === -1) {
      throw new Error('漫画不存在')
    }

    const album = albums.value[index]
    const albumName = BaseResources.extractPrimitiveValue(album.name?.value || album.name)
    albums.value.splice(index, 1)
    await saveAlbums()
    
    notify.toast('success', '删除成功', `已成功删除漫画 "${albumName}"`)
  }

  /**
   * 刷新专辑的页面信息
   */
  const refreshAlbumPages = async (album: Manga): Promise<void> => {
    const resourcePath = BaseResources.extractPrimitiveValue(album.resourcePath?.value || album.resourcePath)
    const isSingleImage = isImageFile(resourcePath)
    
    if (isSingleImage) {
      // 单个图片文件，直接使用该文件
      album.pagesCount.value = 1
      const coverPath = BaseResources.extractPrimitiveValue(album.coverPath?.value || album.coverPath)
      if (!coverPath) {
        album.coverPath.value = resourcePath
      }
      return
    }
    
    if (!window.electronAPI?.listImageFiles) return

    try {
      const resp = await window.electronAPI.listImageFiles(resourcePath)
      if (resp.success) {
        const files = resp.files || []
        album.pagesCount.value = files.length
        const coverPath = BaseResources.extractPrimitiveValue(album.coverPath?.value || album.coverPath)
        if (!coverPath && files.length > 0) {
          album.coverPath.value = files[0]
        }
      }
    } catch (error) {
      console.error('重新扫描图片文件失败:', error)
    }
  }

  /**
   * 更新专辑的查看信息
   */
  const updateViewInfo = async (album: Manga): Promise<void> => {
    const sessions = Array.isArray(album.visitedSessions.value) ? album.visitedSessions.value : []
    album.visitedSessions.value = [...sessions, new Date().toISOString()]
    await saveAlbums()
  }

  /**
   * 检查文件存在性
   */
  const checkFileExistence = async (): Promise<void> => {
    console.log('[useImageAlbum] checkFileExistence 开始执行')
    console.log('[useImageAlbum] 检查 window.electronAPI.checkFileExists 是否存在:', !!window.electronAPI?.checkFileExists)
    if (!window.electronAPI?.checkFileExists) {
      console.log('[useImageAlbum] ❌ window.electronAPI.checkFileExists 不可用，设置所有文件为存在')
      console.log('[useImageAlbum] window.electronAPI 对象:', window.electronAPI)
      albums.value.forEach(album => {
        album.fileExists = true
      })
      return
    }
    
    console.log('[useImageAlbum] ✅ window.electronAPI.checkFileExists API 可用，开始检测文件')

    const missingFiles: Array<{ name: string; path: string }> = []
    console.log(`[useImageAlbum] 开始检测 ${albums.value.length} 个图片项的存在性（单图模式：检测单个图片文件）`)

    for (const album of albums.value) {
      const albumName = BaseResources.extractPrimitiveValue(album.name?.value || album.name)
      const resourcePath = BaseResources.extractPrimitiveValue(album.resourcePath?.value || album.resourcePath)
      
      if (!resourcePath) {
        album.fileExists.value = false
        missingFiles.push({ name: albumName || '未知', path: '未设置路径' })
        continue
      }

      // 判断是否为单图文件
      const isSingleImage = isImageFile(resourcePath)
      const fileType = isSingleImage ? '单图文件' : '文件夹'
      
      try {
        console.log(`[useImageAlbum] 🔍 [checkFileExists] 准备调用 API，类型: ${fileType}，图片名称: ${albumName}, 文件路径: ${resourcePath}`)
        const result = await window.electronAPI.checkFileExists(resourcePath)
        console.log(`[useImageAlbum] ✅ [checkFileExists] API 调用成功，${fileType}，返回结果:`, JSON.stringify(result))
        album.fileExists.value = result.exists
        console.log(`[useImageAlbum] 🔍 检测${fileType}存在性完成: ${albumName} - fileExists=${result.exists}, path=${resourcePath}`)
        if (!result.exists) {
          missingFiles.push({ name: albumName || '未知', path: resourcePath })
        }
      } catch (error) {
        console.error(`[useImageAlbum] ❌ [checkFileExists] API 调用失败，${fileType}，图片: ${albumName}, 路径: ${resourcePath}`, error)
        album.fileExists.value = false
        missingFiles.push({ name: albumName || '未知', path: resourcePath || '路径检测失败' })
      }
    }

    console.log(`[useImageAlbum] 文件存在性检测完成，发现 ${missingFiles.length} 个文件不存在`)
    
    if (missingFiles.length > 0) {
      const fileList = missingFiles
        .map(file => `• ${file.name}${file.path !== '未设置路径' && file.path !== '路径检测失败' ? ` (${file.path})` : ''}`)
        .join('\n')
      
      notify.toast(
        'warning',
        '文件丢失提醒',
        `发现 ${missingFiles.length} 个图片文件丢失：\n${fileList}\n\n请检查文件路径或重新添加这些图片。`
      )
    }
  }

  return {
    // 状态
    albums,
    currentAlbum,
    isLoading,

    // 方法
    loadAlbums,
    saveAlbums,
    addAlbum,
    updateAlbum,
    removeAlbum,
    checkFileExistence,
    checkImageCollectionAchievements,
    refreshAlbumPages,
    updateViewInfo,
    extractFolderName
  }
}

