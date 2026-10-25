/**
 * 图片缓存管理 Composable
 * 处理图片解析、缩略图生成、缓存管理等
 */
import { ref, type Ref } from 'vue'

export interface ImageCacheOptions {
  /**
   * 是否启用缩略图
   */
  enableThumbnails?: boolean
  
  /**
   * JPEG 压缩质量 (0-100)
   */
  jpegQuality?: number
  
  /**
   * 缩略图尺寸
   */
  thumbnailSize?: number
  
  /**
   * 最大缓存大小（字节）
   */
  maxCacheSize?: number
  
  /**
   * 预加载数量
   */
  preloadCount?: number
  
  /**
   * 是否在阅读器模式（强制使用原图）
   */
  isComicViewer?: Ref<boolean>
  
  /**
   * 是否在详情页模式
   */
  isDetailModal?: Ref<boolean>
  
  /**
   * 图片页面列表（用于预加载）
   */
  pages?: Ref<string[]>
}

interface CacheEntry {
  url: string
  size: number
  lastAccessed: number
}

/**
 * 所有图片网格共用一条缩略图队列。
 * 一页几十张图同时让主进程解码，磁盘和 CPU 会一起抢资源，反而更慢。
 */
const THUMBNAIL_CONCURRENCY = 3
let thumbnailActive = 0
const thumbnailQueue: Array<() => void> = []
const thumbnailPending = new Set<string>()

function runThumbnailTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      thumbnailActive++
      task().then(resolve, reject).finally(() => {
        thumbnailActive--
        const next = thumbnailQueue.shift()
        if (next) next()
      })
    }
    if (thumbnailActive < THUMBNAIL_CONCURRENCY) start()
    else thumbnailQueue.push(start)
  })
}

/**
 * 图片缓存管理 composable
 */
export function useImageCache(options: ImageCacheOptions = {}) {
  const {
    enableThumbnails = true,
    jpegQuality = 80,
    thumbnailSize = 200,
    maxCacheSize = 50 * 1024 * 1024, // 50MB
    preloadCount = 3,
    isComicViewer = ref(false),
    isDetailModal = ref(false),
    pages = ref([])
  } = options

  // 缓存状态
  const imageCache = ref(new Map<string, CacheEntry>())
  const imageCacheSize = ref(0)
  const isPreloading = ref(false)

  /**
   * 规范化图片路径
   */
  function normalizePath(imagePath: string): string {
    return String(imagePath).replace(/\\/g, '/')
  }

  /**
   * 构建文件 URL（正确处理 Windows 路径和中文）
   */
  function buildFileUrl(filePath: string): string {
    try {
      // 将反斜杠转换为正斜杠，并确保路径以 / 开头（Windows 盘符处理）
      const normalized = String(filePath).replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
      
      // 对路径进行编码，处理中文和特殊字符
      const encoded = normalized.split('/').map(seg => {
        if (seg.includes(':')) {
          // 处理 Windows 盘符（如 C:），保持原样
          return seg
        }
        return encodeURIComponent(seg)
      }).join('/')
      
      return `file://${encoded}`
    } catch (error) {
      console.error('构建文件URL失败:', error)
      // 降级处理：简单拼接
      const normalizedPath = String(filePath).replace(/\\/g, '/')
      return `file:///${normalizedPath}`
    }
  }

  /**
   * 检查是否为有效图片路径
   */
  function isValidImagePath(imagePath: string | null | undefined): boolean {
    if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
      return false
    }
    return true
  }

  /**
   * 检查是否为外部 URL
   */
  function isExternalUrl(imagePath: string): boolean {
    return typeof imagePath === 'string' && 
           (imagePath.startsWith('http://') || imagePath.startsWith('https://'))
  }

  /**
   * 检查是否为 Data URL 或 File URL
   */
  function isDataOrFileUrl(imagePath: string): boolean {
    return typeof imagePath === 'string' && 
           (imagePath.startsWith('data:') || imagePath.startsWith('file:'))
  }

  /**
   * 检查是否为 CBZ/压缩包内图片的 archive 协议 URL
   */
  function isArchiveUrl(imagePath: string): boolean {
    return typeof imagePath === 'string' && imagePath.startsWith('archive://')
  }

  /**
   * 添加缓存条目
   */
  function addToCache(imagePath: string, url: string, size: number) {
    // 如果缓存已满，清理最旧的条目
    while (imageCacheSize.value + size > maxCacheSize && imageCache.value.size > 0) {
      evictOldestCache()
    }
    
    imageCache.value.set(imagePath, {
      url: url,
      size: size,
      lastAccessed: Date.now()
    })
    imageCacheSize.value += size
  }

  /**
   * 清理最旧的缓存条目（LRU）
   */
  function evictOldestCache() {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, value] of imageCache.value.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      const removed = imageCache.value.get(oldestKey)!
      imageCacheSize.value -= removed.size
      imageCache.value.delete(oldestKey)
      console.log('缓存清理:', oldestKey, '释放内存:', removed.size, 'bytes')
    }
  }

  /**
   * 使用 Canvas 创建缩略图
   */
  async function createCanvasThumbnail(imagePath: string, maxWidth: number, maxHeight: number): Promise<string> {
    // 优先使用 Electron API 在主进程生成缩略图，并缓存在磁盘上
    if (window.electronAPI?.generateThumbnail) {
      try {
        const result = await window.electronAPI.generateThumbnail(imagePath, maxWidth, maxHeight)
        if (result?.success && result.thumbnailPath) {
          return buildFileUrl(result.thumbnailPath)
        }
      } catch (error) {
        console.warn('Electron 缩略图生成失败，使用 Canvas:', error)
      }
    }
    
    // 降级到 Canvas 方案
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // 计算缩略图尺寸
          let { width, height } = img
          const aspectRatio = width / height
          
          if (width > height) {
            width = Math.min(maxWidth, width)
            height = width / aspectRatio
          } else {
            height = Math.min(maxHeight, height)
            width = height * aspectRatio
          }
          
          // 创建 Canvas
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法获取 Canvas 上下文'))
            return
          }
          
          canvas.width = width
          canvas.height = height
          
          // 绘制缩略图
          ctx.drawImage(img, 0, 0, width, height)
          
          // 转换为 DataURL，使用设置中的 JPEG 质量
          const quality = jpegQuality / 100 // 转换为 0-1 范围
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(dataUrl)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = imagePath
    })
  }

  /**
   * 生成缩略图
   */
  async function generateThumbnail(imagePath: string, normalizedPath: string): Promise<string> {
    // 检查是否已有缩略图缓存
    const thumbnailKey = `thumb_${imagePath}`
    if (imageCache.value.has(thumbnailKey)) {
      const cached = imageCache.value.get(thumbnailKey)!
      cached.lastAccessed = Date.now()
      return cached.url
    }
    
    // 生成缩略图，同一时间只让少量任务碰磁盘
    try {
      const thumbnailUrl = await runThumbnailTask(() =>
        createCanvasThumbnail(normalizedPath, thumbnailSize, thumbnailSize)
      )
      if (thumbnailUrl) {
        addToCache(thumbnailKey, thumbnailUrl, thumbnailUrl.length * 2)
        return thumbnailUrl
      }
    } catch (error) {
      console.warn('生成缩略图失败，使用原图:', error)
    }
    
    // 降级：直接使用原图（使用 buildFileUrl 正确处理路径）
    const fileUrl = buildFileUrl(imagePath)
    addToCache(thumbnailKey, fileUrl, 0)
    return fileUrl
  }

  /**
   * 解析缩略图 - 用于预览和列表显示
   */
  function resolveThumbnailImage(imagePath: string): string {
    if (isArchiveUrl(imagePath)) return imagePath
    const fileUrl = buildFileUrl(imagePath)
    
    // 缓存文件 URL
    addToCache(imagePath, fileUrl, 0)
    
    // 如果启用了缩略图模式，异步生成真正的缩略图
    if (enableThumbnails) {
      const thumbnailKey = `thumb_${imagePath}`
      const cachedThumbnail = imageCache.value.get(thumbnailKey)
      if (cachedThumbnail?.url) {
        cachedThumbnail.lastAccessed = Date.now()
        return cachedThumbnail.url
      }

      // 同一张图在生成完成前会被多次渲染，只排一次队
      if (!thumbnailPending.has(imagePath)) {
        thumbnailPending.add(imagePath)
        const normalizedPath = normalizePath(imagePath)
        generateThumbnail(imagePath, normalizedPath).catch(error => {
          console.warn('缩略图生成失败，继续使用原图:', error)
        }).finally(() => {
          thumbnailPending.delete(imagePath)
        })
      }
    }
    
    return fileUrl
  }

  /**
   * 解析原图 - 用于阅读器
   */
  function resolveFullImage(imagePath: string): string {
    // 使用 buildFileUrl 函数正确处理 Windows 路径和中文
    const fileUrl = buildFileUrl(imagePath)
    
    // 缓存文件 URL
    addToCache(imagePath, fileUrl, 0)
    
    return fileUrl
  }

  /**
   * 解析封面图
   */
  function resolveCoverImage(imagePath: string): string {
    if (!isValidImagePath(imagePath)) {
      return './default-image.png'
    }
    
    if (isExternalUrl(imagePath)) {
      return imagePath
    }
    
    if (isDataOrFileUrl(imagePath)) {
      return imagePath
    }
    
    // 封面图始终使用原图，创建专用的封面缓存键
    const coverKey = `cover_${imagePath}`
    if (imageCache.value.has(coverKey)) {
      const cached = imageCache.value.get(coverKey)!
      cached.lastAccessed = Date.now()
      return cached.url
    }
    
    // 使用正确的路径编码构建 file URL（处理 Windows 路径和中文）
    const fileUrl = buildFileUrl(imagePath)
    
    // 缓存封面图 URL
    addToCache(coverKey, fileUrl, 0)
    
    console.log('封面图加载:', imagePath, 'URL:', fileUrl)
    return fileUrl
  }

  /**
   * 解析图片 - 根据使用场景选择不同的加载策略
   */
  function resolveImage(imagePath: string): string {
    if (!isValidImagePath(imagePath)) {
      return './default-image.png'
    }
    
    if (isExternalUrl(imagePath)) {
      return imagePath
    }
    
    if (isDataOrFileUrl(imagePath)) {
      return imagePath
    }
    
    if (isArchiveUrl(imagePath)) {
      return imagePath
    }
    
    // 对于阅读器，强制使用原图，忽略所有缓存
    if (isComicViewer.value) {
      // 使用 buildFileUrl 函数正确处理 Windows 路径和中文
      const fileUrl = buildFileUrl(imagePath)
      console.log('阅读器加载原图:', imagePath)
      return fileUrl
    }
    
    // 检查缓存（非阅读器场景）
    if (imageCache.value.has(imagePath)) {
      const cached = imageCache.value.get(imagePath)!
      // 更新访问时间（LRU）
      cached.lastAccessed = Date.now()
      return cached.url
    }
    
    // 根据使用场景选择加载策略
    if (isDetailModal.value) {
      // 详情页预览图：使用缩略图或压缩版本
      return resolveThumbnailImage(imagePath)
    } else {
      // 其他场景：使用缩略图
      return resolveThumbnailImage(imagePath)
    }
  }

  /**
   * 异步图片解析 - 用于需要 DataURL 的场景（如封面预览）
   */
  async function resolveImageAsync(imagePath: string): Promise<string> {
    if (!isValidImagePath(imagePath)) {
      return './default-image.png'
    }
    
    if (isExternalUrl(imagePath)) {
      return imagePath
    }
    
    if (isDataOrFileUrl(imagePath)) {
      return imagePath
    }
    
    if (isArchiveUrl(imagePath)) {
      return imagePath
    }
    
    // 对于阅读器，强制使用原图，忽略缩略图缓存
    if (isComicViewer.value) {
      // 使用 buildFileUrl 函数正确处理 Windows 路径和中文
      const fileUrl = buildFileUrl(imagePath)
      
      // 为阅读器创建专用的原图缓存键
      const fullImageKey = `full_${imagePath}`
      addToCache(fullImageKey, fileUrl, 0)
      
      console.log('阅读器加载原图:', imagePath)
      return fileUrl
    }
    
    // 检查普通缓存（非阅读器场景）
    if (imageCache.value.has(imagePath)) {
      const cached = imageCache.value.get(imagePath)!
      cached.lastAccessed = Date.now()
      return cached.url
    }
    
    // 对于小图（如封面），可以使用 DataURL
    if (window.electronAPI && (window.electronAPI as any).readFileAsDataUrl) {
      try {
        const dataUrl = await (window.electronAPI as any).readFileAsDataUrl(imagePath)
        if (dataUrl) {
          // 估算 DataURL 大小
          const estimatedSize = dataUrl.length * 2 // 粗略估算
          addToCache(imagePath, dataUrl, estimatedSize)
          return dataUrl
        } else {
          addToCache(imagePath, './default-image.png', 0)
          return './default-image.png'
        }
      } catch (error) {
        console.error('读取图片文件失败:', error)
        addToCache(imagePath, './default-image.png', 0)
        return './default-image.png'
      }
    } else {
      // 使用 buildFileUrl 函数正确处理 Windows 路径和中文
      const fileUrl = buildFileUrl(imagePath)
      addToCache(imagePath, fileUrl, 0)
      return fileUrl
    }
  }

  /**
   * 预加载单张图片
   */
  async function preloadImage(imagePath: string): Promise<HTMLImageElement | null> {
    try {
      const srcUrl = isArchiveUrl(imagePath) ? imagePath : buildFileUrl(imagePath)
      if (!isArchiveUrl(imagePath)) {
        addToCache(imagePath, srcUrl, 0)
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = srcUrl
      })
    } catch (error) {
      console.error('预加载单张图片失败:', imagePath, error)
      return null
    }
  }

  /**
   * 预加载图片
   */
  async function preloadImages(startIndex: number, count?: number) {
    const actualPreloadCount = count || preloadCount
    if (isPreloading.value || !pages.value || pages.value.length === 0) return
    
    isPreloading.value = true
    const preloadPromises: Promise<HTMLImageElement | null>[] = []
    
    // 预加载当前页前后的图片
    for (let i = Math.max(0, startIndex - 1); i <= Math.min(pages.value.length - 1, startIndex + actualPreloadCount); i++) {
      if (i !== startIndex && !imageCache.value.has(pages.value[i])) {
        preloadPromises.push(preloadImage(pages.value[i]))
      }
    }
    
    try {
      await Promise.all(preloadPromises)
    } catch (error) {
      console.error('预加载图片失败:', error)
    } finally {
      isPreloading.value = false
    }
  }

  /**
   * 获取图片文件名
   */
  function getImageFileName(imagePath: string): string {
    if (!imagePath) return ''
    // archive:// 协议 URL：取 # 后的条目名
    if (isArchiveUrl(imagePath)) {
      const hashIndex = imagePath.indexOf('#')
      if (hashIndex >= 0) {
        try {
          return decodeURIComponent(imagePath.slice(hashIndex + 1)).split(/[/\\]/).pop() || imagePath
        } catch {
          return imagePath.slice(hashIndex + 1)
        }
      }
    }
    const fileName = imagePath.split(/[\\/]/).pop()
    return fileName || imagePath
  }

  /**
   * 处理图片加载错误
   */
  function handleImageError(event: Event) {
    const target = event.target as HTMLImageElement
    if (target) {
      target.src = './default-image.png'
    }
  }

  /**
   * 清除所有缓存
   */
  function clearCache() {
    imageCache.value.clear()
    imageCacheSize.value = 0
  }

  return {
    // 状态
    imageCache,
    imageCacheSize,
    isPreloading,
    
    // 方法
    resolveImage,
    resolveThumbnailImage,
    resolveFullImage,
    resolveCoverImage,
    resolveImageAsync,
    generateThumbnail,
    createCanvasThumbnail,
    addToCache,
    evictOldestCache,
    preloadImages,
    preloadImage,
    getImageFileName,
    handleImageError,
    clearCache
  }
}

