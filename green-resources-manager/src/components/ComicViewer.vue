<template>
  <!-- 漫画阅读器 -->
  <div
    v-if="visible"
    :class="standalone ? 'comic-viewer-standalone' : 'comic-viewer-overlay'"
    @click="onOverlayClick"
  >
    <div class="comic-viewer-content" :class="{ 'comic-viewer-content--standalone': standalone }" @click.stop>
      <!-- 阅读器头部 -->
      <div class="comic-viewer-header">
        <div class="comic-info">
          <h3 class="comic-title">{{ album?.name || '漫画阅读器' }}</h3>
          <div class="page-nav-group">
            <button
              class="page-nav-btn page-nav-btn-prev"
              @mousedown.prevent
              @click="previousPage"
              :disabled="currentPageIndex <= 0"
              :title="$lt('上一页 (←)')"
            >‹</button>
            <span class="page-info">
              <input
                type="number"
                v-model.number="jumpToPage"
                :min="1"
                :max="pages.length"
                :style="pageJumpInputStyle"
                @keyup.enter="jumpToPageNumber"
                class="page-jump-input"
                :title="$lt('输入页码后回车跳转')"
              >
              <span class="page-separator">/</span>
              <span class="page-total">{{ pages.length }}</span>
            </span>
            <button
              class="page-nav-btn page-nav-btn-next"
              @mousedown.prevent
              @click="nextPage"
              :disabled="currentPageIndex >= pages.length - 1"
              :title="$lt('下一页 (→)')"
            >›</button>
          </div>
        </div>
        <div class="comic-controls">
          <fun-button
            type="secondary"
            icon="🔍-"
            @click="zoomOut"
            :disabled="zoomLevel <= 0.5"
          />
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <fun-button
            type="secondary"
            icon="🔍+"
            @click="zoomIn"
            :disabled="zoomLevel >= 3"
          />
          <div class="quality-controls">
            <select v-model="imageQuality" @change="setImageQuality(imageQuality)" class="quality-select">
              <option value="high">{{ $lt('高质量') }}</option>
              <option value="medium">{{ $lt('中等质量') }}</option>
              <option value="low">{{ $lt('低质量') }}</option>
            </select>
          </div>
          <fun-button
            type="secondary"
            icon="↺"
            :title="$lt('向左旋转 90°（Shift+R）')"
            @click="rotateCounterclockwise"
          />
          <span class="rotation-level" :title="$lt('当前旋转角度，翻页时保持不变')">{{ imageRotation }}°</span>
          <fun-button
            type="secondary"
            icon="↻"
            :title="$lt('向右旋转 90°（R）')"
            @click="rotateClockwise"
          />
          <fun-button
            type="secondary"
            icon="⛶"
            @click="toggleFullscreen"
          > {{ $lt('全屏') }} </fun-button>
          <fun-button
            type="danger"
            icon="✕"
            @click="closeViewer"
          />
        </div>
      </div>
      
      <!-- 阅读器主体 -->
      <div class="comic-viewer-body" ref="comicViewerBody">
        <!-- 左侧预览栏 -->
        <div class="sidebar-preview">
          <div class="sidebar-title">{{ $lt('页面预览') }}</div>
          <div class="thumbnail-list" ref="thumbnailList" @scroll="onThumbnailScroll">
            <div class="thumbnail-track" :style="{ height: thumbnailTrackHeight + 'px' }">
              <div
                v-for="index in visibleThumbnailIndexes"
                :key="index"
                class="thumbnail-item"
                :class="{ active: index === currentPageIndex }"
                :style="{ transform: `translateY(${index * thumbnailSlotHeight}px)` }"
                @click="jumpToThumbnailPage(index)"
              >
                <div class="thumbnail-number">{{ index + 1 }}</div>
                <img
                  :src="getThumbnailUrl(pages[index])"
                  :alt="`第 ${index + 1} 页`"
                  class="thumbnail-image"
                  @error="onThumbnailError"
                >
              </div>
            </div>
          </div>
        </div>
        
        <!-- 主阅读区域 -->
        <div class="main-reading-area">
          <div class="comic-image-container" ref="imageContainer">
            <img 
              v-if="currentPageImage"
              :src="currentPageImage" 
              :alt="`第 ${currentPageIndex + 1} 页`"
              class="comic-image"
              :style="imageViewStyle"
              @load="onImageLoad"
              @error="onImageError"
              @wheel="onImageWheel"
              @mousedown="onImageMouseDown"
              @mousemove="onImageMouseMove"
              @mouseup="onImageMouseUp"
              @mouseleave="onImageMouseUp"
            >
            <div v-else class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>{{ $lt('加载中...') }}</p>
            </div>
          </div>

          <!-- 图片两侧悬浮翻页区：hover 时显示箭头 + 边缘渐变遮罩 -->
          <div
            class="page-nav-zone page-nav-prev"
            :class="{ disabled: currentPageIndex <= 0 }"
            @mousedown.prevent
            @click="currentPageIndex > 0 && previousPage()"
            :title="$lt('上一页 (←)')"
          >
            <div class="page-nav-arrow">‹</div>
          </div>
          <div
            class="page-nav-zone page-nav-next"
            :class="{ disabled: currentPageIndex >= pages.length - 1 }"
            @mousedown.prevent
            @click="currentPageIndex < pages.length - 1 && nextPage()"
            :title="$lt('下一页 (→)')"
          >
            <div class="page-nav-arrow">›</div>
          </div>
        </div>
      </div>
      
      <!-- 图片文件名显示 -->
      <div class="image-filename" v-if="currentPageImage && pages[currentPageIndex]" @selectstart.prevent>
        {{ getImageFileName(pages[currentPageIndex]) }}
        <span class="file-size">({{ fileSizeText }})</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ComicViewer',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    album: {
      type: Object,
      default: null
    },
    pages: {
      type: Array,
      default: () => []
    },
    initialPageIndex: {
      type: Number,
      default: 0
    },
    // 独立模式：在新标签页内以全屏铺满方式展示，不作为模态遮罩层
    standalone: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'page-change', 'view-count-update'],
  computed: {
    /**
     * 页码输入框的宽度。
     * 浏览器自带的上下箭头会占掉大半个框，42 像素里只能看见两位。按总页数留出位数，箭头另在样式里去掉。
     */
    pageJumpInputStyle() {
      /** 至少按三位数留空，短漫画也不会缩成两个字。 */
      const digits = Math.max(String(this.pages?.length || 1).length, 3)
      return { width: `${digits + 2}ch` }
    },
    /**
     * 底部括号里的大小文字。
     * 大小为 0 时不能再写成获取中，否则读失败或空文件会一直转圈。
     */
    fileSizeText() {
      if (this.fileSizeState === 'loading') return '获取中...'
      if (this.fileSizeState === 'failed') return '未知'
      return this.formatFileSize(this.currentFileSize)
    },
    /**
     * 当前页的位移、旋转和缩放。
     * 先缩放再旋转，拖动仍按屏幕方向移动。转到 90° 或 270° 时宽高约束对调，竖图转横后才能铺满阅读区，而不是转完被裁掉。
     */
    imageViewStyle() {
      /** 直角旋转后，图片原来的宽会变成屏幕上的高。 */
      const quarterTurn = this.imageRotation % 180 !== 0
      return {
        transform: `translate3d(${this.imageOffsetX}px, ${this.imageOffsetY}px, 0) rotate(${this.imageRotation}deg) scale(${this.zoomLevel})`,
        maxWidth: quarterTurn ? '100cqh' : '100%',
        maxHeight: quarterTurn ? '100cqw' : '100%'
      }
    },
    /**
     * 左侧预览轨道的总高度。
     * 每条占位高度固定，这样不用把几千个节点都排进文档，滚动条长度仍然对得上整本漫画。
     */
    thumbnailTrackHeight() {
      return (this.pages?.length || 0) * this.thumbnailSlotHeight
    },
    /**
     * 当前该画出来的预览下标。
     * 只取视口里的条目，再向上下各多留几条。滚出视口的原图不会创建 img，避免一次解码几千张。
     */
    visibleThumbnailIndexes() {
      const total = this.pages?.length || 0
      if (total === 0) return []
      const slot = this.thumbnailSlotHeight
      const viewHeight = this.thumbnailViewportHeight || slot * 8
      const start = Math.max(0, Math.floor(this.thumbnailScrollTop / slot) - this.thumbnailOverscan)
      const end = Math.min(total - 1, Math.ceil((this.thumbnailScrollTop + viewHeight) / slot) + this.thumbnailOverscan)
      const indexes = []
      for (let index = start; index <= end; index += 1) {
        indexes.push(index)
      }
      return indexes
    }
  },
  data() {
    return {
      currentPageIndex: 0,
      currentPageImage: null,
      currentFileSize: 0,
      /** loading 还在读，ready 已经有大小，failed 读失败 */
      fileSizeState: 'loading',
      zoomLevel: 1,
      /** 当前阅读角度，0、90、180、270。翻页不重置，同一本竖图不用每页再转一次。 */
      imageRotation: 0,
      jumpToPage: 1,
      isFullscreen: false,
      // 图片拖动相关
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      imageOffsetX: 0,
      imageOffsetY: 0,
      // 图片质量设置
      imageQuality: 'high',
      // 优化的图片缓存系统
      imageCache: new Map(),
      imageCacheSize: 0,
      maxCacheSize: 50 * 1024 * 1024, // 50MB缓存限制
      preloadQueue: [],
      isPreloading: false,
      // 从设置中加载的配置
      jpegQuality: 80,
      thumbnailSize: 200,
      cacheSize: 50,
      preloadCount: 3,
      hardwareAcceleration: true,
      renderQuality: 'high',
      /**
       * 左侧一条预览的占位高度，含条目之间的空隙。
       * 必须和样式里 .thumbnail-item 的高度加间距一致，否则滚动位置会对不齐。
       */
      thumbnailSlotHeight: 162,
      /** 视口上下各多保留的条数，快速拖滚动条时不露空白。 */
      thumbnailOverscan: 6,
      /** 预览列表当前滚过的距离。 */
      thumbnailScrollTop: 0,
      /** 预览列表看得见的高度。为 0 时先按大约八条来算，避免一打开就铺满。 */
      thumbnailViewportHeight: 0
    }
  },
  watch: {
    visible: {
      handler(newVal) {
        if (newVal) {
          this.currentPageIndex = this.initialPageIndex
          this.jumpToPage = this.initialPageIndex + 1
          this.loadCurrentPage()
          // 添加键盘事件监听
          document.addEventListener('keydown', this.handleKeydown)
          this.$nextTick(() => {
            this.updateThumbnailViewport()
            this.scrollThumbnailIntoView(this.currentPageIndex)
          })
        } else {
          // 移除键盘事件监听
          document.removeEventListener('keydown', this.handleKeydown)
        }
      },
      immediate: true
    },
    initialPageIndex(newVal) {
      if (this.visible) {
        this.currentPageIndex = newVal
        this.jumpToPage = newVal + 1
        this.loadCurrentPage()
      }
    },
    pages: {
      handler(newPages, oldPages) {
        // 当pages数组从空变为有内容时，重新加载当前页
        if (this.visible && newPages && newPages.length > 0 && (!oldPages || oldPages.length === 0)) {
          console.log('ComicViewer: pages数组已加载，重新加载当前页')
          this.loadCurrentPage()
          this.$nextTick(() => {
            this.updateThumbnailViewport()
            this.scrollThumbnailIntoView(this.currentPageIndex)
          })
        }
      },
      immediate: false
    },
    currentPageIndex(newVal) {
      if (this.visible) {
        this.$nextTick(() => {
          this.scrollThumbnailIntoView(newVal)
        })
      }
    }
  },
  methods: {
    // 关闭阅读器
    closeViewer() {
      this.$emit('close')
      this.cleanup()
    },

    // 遮罩层点击：仅在模态模式下关闭，独立模式下不处理
    onOverlayClick() {
      if (this.standalone) return
      this.closeViewer()
    },

    // 清理资源
    cleanup() {
      this.currentPageIndex = 0
      this.currentPageImage = null
      this.currentFileSize = 0
      this.zoomLevel = 1
      this.imageRotation = 0
      this.jumpToPage = 1
      
      // 重置拖动状态
      this.endDragging()
      this.imageOffsetX = 0
      this.imageOffsetY = 0
      
      // 清理缓存以释放内存
      this.clearImageCache()
      
      // 退出全屏
      if (this.isFullscreen && document.fullscreenElement) {
        document.exitFullscreen()
        this.isFullscreen = false
      }
    },

    // 加载当前页
    async loadCurrentPage() {
      if (this.pages && this.pages.length > 0 && this.currentPageIndex >= 0 && this.currentPageIndex < this.pages.length) {
        const imagePath = this.pages[this.currentPageIndex]
        console.log('加载当前页，图片路径:', imagePath)
        
        // 使用优化的图片解析
        this.currentPageImage = await this.resolveImageAsync(imagePath)
        this.jumpToPage = this.currentPageIndex + 1
        
        // 翻页后先显示获取中，避免上一页的大小留在这一页
        this.currentFileSize = 0
        this.fileSizeState = 'loading'
        const requestedPath = imagePath
        this.getFileSize(imagePath).then(size => {
          if (this.pages[this.currentPageIndex] !== requestedPath) return
          this.currentFileSize = size
          this.fileSizeState = 'ready'
        }).catch(error => {
          console.error('获取文件大小失败:', error)
          if (this.pages[this.currentPageIndex] !== requestedPath) return
          this.currentFileSize = 0
          this.fileSizeState = 'failed'
        })
        
        // 预加载相邻图片
        this.preloadImages(this.currentPageIndex, 2)
        
        // 通知父组件页面变化
        this.$emit('page-change', this.currentPageIndex)
      }
    },

    /**
     * 清掉鼠标连点留下的文字选区。
     * 连点下一页时，按下和松开之间页面会重绘，浏览器会把底部文件名当成被拖选的文字。
     */
    clearTextSelection() {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges()
      }
    },

    // 下一页
    async nextPage() {
      this.clearTextSelection()
      if (this.currentPageIndex < this.pages.length - 1) {
        this.currentPageIndex++
        // 切换页面时重置拖动偏移
        this.imageOffsetX = 0
        this.imageOffsetY = 0
        await this.loadCurrentPage()
        // 预加载更多图片
        this.preloadImages(this.currentPageIndex, 3)
      }
    },

    // 上一页
    async previousPage() {
      this.clearTextSelection()
      if (this.currentPageIndex > 0) {
        this.currentPageIndex--
        // 切换页面时重置拖动偏移
        this.imageOffsetX = 0
        this.imageOffsetY = 0
        await this.loadCurrentPage()
        // 预加载更多图片
        this.preloadImages(this.currentPageIndex, 3)
      }
    },

    // 跳转到指定页
    async jumpToPageNumber() {
      const pageNum = parseInt(this.jumpToPage)
      if (pageNum >= 1 && pageNum <= this.pages.length) {
        this.currentPageIndex = pageNum - 1
        // 跳转页面时重置拖动偏移
        this.imageOffsetX = 0
        this.imageOffsetY = 0
        await this.loadCurrentPage()
      }
    },

    // 放大
    zoomIn() {
      if (this.zoomLevel < 3) {
        this.zoomLevel = Math.min(3, this.zoomLevel + 0.25)
        // 如果缩放到1倍以下，重置拖动偏移
        if (this.zoomLevel <= 1) {
          this.imageOffsetX = 0
          this.imageOffsetY = 0
        } else {
          // 缩放后重新约束位置
          this.$nextTick(() => {
            this.constrainImagePosition()
          })
        }
      }
    },

    // 缩小
    zoomOut() {
      if (this.zoomLevel > 0.5) {
        this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.25)
        // 如果缩放到1倍以下，重置拖动偏移
        if (this.zoomLevel <= 1) {
          this.imageOffsetX = 0
          this.imageOffsetY = 0
        } else {
          // 缩放后重新约束位置
          this.$nextTick(() => {
            this.constrainImagePosition()
          })
        }
      }
    },

    /**
     * 把当前角度转 90°。
     * 整本漫画通常是同一个方向，所以只改阅读器角度，不跟某一页绑定。
     * @param {number} delta 90 为向右，-90 为向左
     */
    rotateBy(delta) {
      const next = (this.imageRotation + delta) % 360
      this.imageRotation = next < 0 ? next + 360 : next
      this.imageOffsetX = 0
      this.imageOffsetY = 0
      this.$nextTick(() => {
        this.constrainImagePosition()
      })
    },

    /**
     * 向右旋转 90°，把竖图转到横屏阅读区里。
     */
    rotateClockwise() {
      this.rotateBy(90)
    },

    /**
     * 向左旋转 90°。扫描件方向反了时不用连按三次向右。
     */
    rotateCounterclockwise() {
      this.rotateBy(-90)
    },

    // 全屏切换
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        // 让整个漫画阅读器全屏，而不是只有图片部分
        const comicViewerContent = document.querySelector('.comic-viewer-content')
        if (comicViewerContent) {
          comicViewerContent.requestFullscreen()
          this.isFullscreen = true
        }
      } else {
        document.exitFullscreen()
        this.isFullscreen = false
      }
    },

    // 设置图片质量
    setImageQuality(quality) {
      this.imageQuality = quality
      console.log('图片质量设置为:', quality)
      
      // 根据质量调整缓存大小，优先使用设置中的值
      const cacheSizeMB = this.cacheSize || 50
      switch (quality) {
        case 'high':
          this.maxCacheSize = Math.max(cacheSizeMB, 100) * 1024 * 1024
          break
        case 'medium':
          this.maxCacheSize = Math.max(cacheSizeMB, 50) * 1024 * 1024
          break
        case 'low':
          this.maxCacheSize = Math.max(cacheSizeMB, 20) * 1024 * 1024
          break
      }
      
      // 如果当前缓存超过新限制，清理缓存
      if (this.imageCacheSize > this.maxCacheSize) {
        this.clearImageCache()
      }
    },


    // 异步图片解析 - 用于需要DataURL的场景（如封面预览）
    async resolveImageAsync(imagePath) {
      if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
        return './default-image.png'
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('data:') || imagePath.startsWith('file:'))) {
        return imagePath
      }
      // CBZ/压缩包内图片：archive:// 协议 URL 直接返回，由主进程协议提供图片
      if (typeof imagePath === 'string' && imagePath.startsWith('archive://')) {
        return imagePath
      }
      
      // 对于阅读器，强制使用原图，忽略缩略图缓存
      const normalizedPath = String(imagePath).replace(/\\/g, '/')
      const fileUrl = `file:///${normalizedPath}`
      
      // 为阅读器创建专用的原图缓存键
      const fullImageKey = `full_${imagePath}`
      this.addToCache(fullImageKey, fileUrl, 0)
      
      console.log('阅读器加载原图:', imagePath)
      return fileUrl
    },

    // LRU缓存管理方法
    addToCache(imagePath, url, size) {
      // 如果缓存已满，清理最旧的条目
      while (this.imageCacheSize + size > this.maxCacheSize && this.imageCache.size > 0) {
        this.evictOldestCache()
      }
      
      this.imageCache.set(imagePath, {
        url: url,
        size: size,
        lastAccessed: Date.now()
      })
      this.imageCacheSize += size
    },

    evictOldestCache() {
      let oldestKey = null
      let oldestTime = Date.now()
      
      for (const [key, value] of this.imageCache.entries()) {
        if (value.lastAccessed < oldestTime) {
          oldestTime = value.lastAccessed
          oldestKey = key
        }
      }
      
      if (oldestKey) {
        const removed = this.imageCache.get(oldestKey)
        this.imageCacheSize -= removed.size
        this.imageCache.delete(oldestKey)
        console.log('缓存清理:', oldestKey, '释放内存:', removed.size, 'bytes')
      }
    },

    // 预加载图片
    async preloadImages(startIndex, count = null) {
      // 使用设置中的预加载数量，如果没有指定则使用默认值
      const preloadCount = count || this.preloadCount || 3
      if (this.isPreloading || !this.pages || this.pages.length === 0) return
      
      this.isPreloading = true
      const preloadPromises = []
      
      // 预加载当前页前后的图片
      for (let i = Math.max(0, startIndex - 1); i <= Math.min(this.pages.length - 1, startIndex + preloadCount); i++) {
        if (i !== startIndex && !this.imageCache.has(this.pages[i])) {
          preloadPromises.push(this.preloadImage(this.pages[i]))
        }
      }
      
      try {
        await Promise.all(preloadPromises)
      } catch (error) {
        console.error('预加载图片失败:', error)
      } finally {
        this.isPreloading = false
      }
    },

    async preloadImage(imagePath) {
      try {
        const isArchive = typeof imagePath === 'string' && imagePath.startsWith('archive://')
        const srcUrl = isArchive ? imagePath : `file:///${String(imagePath).replace(/\\/g, '/')}`
        if (!isArchive) {
          this.addToCache(imagePath, srcUrl, 0)
        }
        
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = srcUrl
        })
      } catch (error) {
        console.error('预加载单张图片失败:', imagePath, error)
      }
    },

    /**
     * 读取当前页图片的字节数。
     * 接口把大小放在 size 上，不在 stats 里面。以前读错字段，大小一直是 0，界面就停在获取中。
     * @param {string} filePath 图片路径，或压缩包内图片的 archive:// 地址
     * @returns {Promise<number>}
     */
    async getFileSize(filePath) {
      try {
        console.log('尝试获取文件大小:', filePath)
        if (window.electronAPI && window.electronAPI.getFileStats) {
          const result = await window.electronAPI.getFileStats(filePath)
          console.log('文件统计信息:', result)
          if (result && result.success && typeof result.size === 'number') {
            return result.size
          }
          console.error('获取文件统计信息失败:', result?.error || '未知错误')
          throw new Error(result?.error || '未知错误')
        } else {
          console.log('Electron API 不可用，尝试使用 fetch 获取文件大小')
          try {
            const response = await fetch(filePath, { method: 'HEAD' })
            const contentLength = response.headers.get('content-length')
            return contentLength ? parseInt(contentLength) : 0
          } catch (fetchError) {
            console.log('fetch 方法也失败:', fetchError)
            throw fetchError
          }
        }
      } catch (error) {
        console.error('获取文件大小失败:', error)
        throw error
      }
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    },

    // 获取图片文件名
    getImageFileName(imagePath) {
      if (!imagePath) return ''
      // archive:// 协议 URL：取 # 后的条目名作为文件名
      if (typeof imagePath === 'string' && imagePath.startsWith('archive://')) {
        const hashIndex = imagePath.indexOf('#')
        if (hashIndex >= 0) {
          try {
            const entry = decodeURIComponent(imagePath.slice(hashIndex + 1))
            return entry.split(/[/\\]/).pop() || entry
          } catch {
            return imagePath.slice(hashIndex + 1)
          }
        }
      }
      const fileName = imagePath.split(/[\\/]/).pop()
      return fileName || imagePath
    },

    // 图片加载事件
    onImageLoad() {
      // 图片加载完成后的处理
    },

    onImageError() {
      console.error('图片加载失败:', this.pages[this.currentPageIndex])
      this.currentPageImage = './default-image.png'
    },

    /**
     * 漫画图片上的滚轮缩放。
     * 按住 Ctrl/Cmd 时不处理：那一格要留给主窗口做界面缩放，避免图片和整个界面一起被放大两次。
     * @param {WheelEvent} event 滚轮事件
     */
    onImageWheel(event) {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) return
      if (event.deltaY < 0) {
        this.zoomIn()
      } else {
        this.zoomOut()
      }
    },

    // 图片拖动相关方法
    onImageMouseDown(event) {
      // 只有在放大状态下才允许拖动
      if (this.zoomLevel > 1) {
        event.preventDefault()
        this.isDragging = true
        this.dragStartX = event.clientX - this.imageOffsetX
        this.dragStartY = event.clientY - this.imageOffsetY
        
        // 添加全局鼠标事件监听
        document.addEventListener('mousemove', this.onDocumentMouseMove)
        document.addEventListener('mouseup', this.onDocumentMouseUp)
      }
    },

    onImageMouseMove(event) {
      // 这个方法主要用于防止默认行为，实际拖动在 onDocumentMouseMove 中处理
      if (this.isDragging) {
        event.preventDefault()
      }
    },

    onImageMouseUp(event) {
      this.endDragging()
    },

    onDocumentMouseMove(event) {
      if (this.isDragging) {
        event.preventDefault()
        this.imageOffsetX = event.clientX - this.dragStartX
        this.imageOffsetY = event.clientY - this.dragStartY
        
        // 根据图片和容器尺寸动态计算拖动边界
        this.constrainImagePosition()
      }
    },

    onDocumentMouseUp(event) {
      this.endDragging()
    },

    endDragging() {
      if (this.isDragging) {
        this.isDragging = false
        
        // 移除全局鼠标事件监听
        document.removeEventListener('mousemove', this.onDocumentMouseMove)
        document.removeEventListener('mouseup', this.onDocumentMouseUp)
      }
    },

    // 约束图片位置，防止拖出合理范围
    constrainImagePosition() {
      const imageElement = document.querySelector('.comic-image')
      const containerElement = document.querySelector('.comic-image-container')
      
      if (!imageElement || !containerElement) return
      
      // 获取容器尺寸
      const containerRect = containerElement.getBoundingClientRect()
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height
      
      // 获取图片原始尺寸
      const imageWidth = imageElement.naturalWidth
      const imageHeight = imageElement.naturalHeight
      
      if (imageWidth === 0 || imageHeight === 0) return
      
      // 直角旋转后，屏幕上的宽高和图片文件里的宽高是对调的
      const quarterTurn = this.imageRotation % 180 !== 0
      const fittedWidth = quarterTurn ? imageHeight : imageWidth
      const fittedHeight = quarterTurn ? imageWidth : imageHeight
      const fittedScaledWidth = fittedWidth * this.zoomLevel
      const fittedScaledHeight = fittedHeight * this.zoomLevel

      // 计算最大允许的偏移量
      // 当图片放大后超出容器时，允许拖动的距离
      const maxOffsetX = Math.max(0, (fittedScaledWidth - containerWidth) / 2)
      const maxOffsetY = Math.max(0, (fittedScaledHeight - containerHeight) / 2)
      
      // 限制X轴偏移
      if (fittedScaledWidth <= containerWidth) {
        // 图片宽度小于等于容器，不允许水平拖动
        this.imageOffsetX = 0
      } else {
        // 图片宽度大于容器，限制拖动范围
        this.imageOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.imageOffsetX))
      }
      
      // 限制Y轴偏移
      if (fittedScaledHeight <= containerHeight) {
        // 图片高度小于等于容器，不允许垂直拖动
        this.imageOffsetY = 0
      } else {
        // 图片高度大于容器，限制拖动范围
        this.imageOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.imageOffsetY))
      }
    },

    // 清理图片缓存
    clearImageCache() {
      console.log('清理图片缓存，释放内存:', this.imageCacheSize, 'bytes')
      this.imageCache.clear()
      this.imageCacheSize = 0
      this.preloadQueue = []
      this.isPreloading = false
    },

    // 键盘快捷键处理
    handleKeydown(event) {
      if (!this.visible) return

      // 当焦点在输入框/可编辑元素内时，只拦截 Escape（用于关闭阅读器），
      // 其它快捷键（翻页、缩放）让浏览器正常处理，不干扰用户输入
      const tag = (event.target && event.target.tagName) || ''
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (event.target && event.target.isContentEditable)

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          if (isEditable) return
          event.preventDefault()
          if (event.key === 'ArrowLeft') this.previousPage()
          else if (event.key === 'ArrowRight') this.nextPage()
          break
        case 'Escape':
          event.preventDefault()
          this.closeViewer()
          break
        case '+':
        case '=':
          if (isEditable) return
          event.preventDefault()
          this.zoomIn()
          break
        case '-':
          if (isEditable) return
          event.preventDefault()
          this.zoomOut()
          break
        case '0':
          if (isEditable) return
          event.preventDefault()
          this.zoomLevel = 1
          break
        case 'f':
        case 'F':
          if (isEditable) return
          event.preventDefault()
          this.toggleFullscreen()
          break
        case 'r':
        case 'R':
          if (isEditable) return
          event.preventDefault()
          if (event.shiftKey) this.rotateCounterclockwise()
          else this.rotateClockwise()
          break
      }
    },

    // 获取缩略图URL
    getThumbnailUrl(imagePath) {
      if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
        return './default-image.png'
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('data:') || imagePath.startsWith('file:'))) {
        return imagePath
      }
      // CBZ/压缩包内图片：archive:// 协议 URL 直接返回
      if (typeof imagePath === 'string' && imagePath.startsWith('archive://')) {
        return imagePath
      }
      
      const normalizedPath = String(imagePath).replace(/\\/g, '/')
      return `file:///${normalizedPath}`
    },

    // 缩略图加载失败
    onThumbnailError(event) {
      event.target.src = './default-image.png'
    },

    // 点击缩略图跳转到指定页面
    async jumpToThumbnailPage(index) {
      if (index >= 0 && index < this.pages.length) {
        this.currentPageIndex = index
        this.imageOffsetX = 0
        this.imageOffsetY = 0
        await this.loadCurrentPage()
        this.preloadImages(this.currentPageIndex, 3)
        // 确保缩略图在可视区域内
        this.$nextTick(() => {
          this.scrollThumbnailIntoView(index)
        })
      }
    },

    /**
     * 记下预览列表滚过的距离，用来算出该显示哪几条。
     * @param {Event} event 列表的滚动事件
     */
    onThumbnailScroll(event) {
      this.thumbnailScrollTop = event.target?.scrollTop || 0
    },
    /**
     * 量一次预览列表的可视高度。
     * 窗口大小变了、阅读器刚打开时都要重算，否则窗口范围会停在旧高度上。
     */
    updateThumbnailViewport() {
      const list = this.$refs.thumbnailList
      if (!list) return
      this.thumbnailViewportHeight = list.clientHeight
    },
    /**
     * 把当前页的预览滚到列表中间。
     * 列表里只有附近几条真实节点，不能再按子元素下标去找，只能按固定占位高度算滚动距离。
     * @param {number} index 页码下标
     */
    scrollThumbnailIntoView(index) {
      const thumbnailList = this.$refs.thumbnailList
      if (!thumbnailList) return
      const target = index * this.thumbnailSlotHeight - (thumbnailList.clientHeight - this.thumbnailSlotHeight) / 2
      const maxScroll = Math.max(0, thumbnailList.scrollHeight - thumbnailList.clientHeight)
      thumbnailList.scrollTo({
        top: Math.min(Math.max(0, target), maxScroll),
        behavior: 'smooth'
      })
    }
  },

  mounted() {
    window.addEventListener('resize', this.updateThumbnailViewport)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.updateThumbnailViewport)
    // 清理事件监听器
    document.removeEventListener('keydown', this.handleKeydown)
    this.cleanup()
  }
}
</script>

<style scoped>
/* 漫画阅读器样式 */
.comic-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(5px);
}

/* 独立模式：在新标签页内全屏铺满，作为页面内容而非模态遮罩 */
.comic-viewer-standalone {
  position: relative;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}

.comic-viewer-content {
  background: var(--bg-secondary);
  /* 阅读器里连点翻页不是在选字。页码输入框单独恢复可选。 */
  user-select: none;
  border-radius: 12px;
  width: 95vw;
  height: 95vh;
  max-width: 1400px;
  max-height: 900px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: background-color 0.3s ease;
}

/* 独立模式：铺满整个标签页视口 */
.comic-viewer-content--standalone {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border-radius: 0;
  box-shadow: none;
}

.comic-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 12px 12px 0 0;
}

.comic-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.comic-title {
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  transition: color 0.3s ease;
}

/* 翻页组件：‹ 页码 / 总数 › 水平排列 */
.page-nav-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0; /* 防止被标题或右侧 controls 挤压掉 */
}

.page-nav-btn {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
  font-family: inherit;
  line-height: 1;
  padding: 0;
  margin: 0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.page-nav-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}

.page-nav-btn:active:not(:disabled) {
  transform: scale(0.92);
  box-shadow: none;
}

.page-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-nav-btn-prev {
  /* 对齐页码胶囊左边 */
}

.page-nav-btn-next {
  /* 对齐页码胶囊右边 */
}

.page-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  font-variant-numeric: tabular-nums;
}

.page-jump-input {
  width: 6ch;
  min-width: 6ch;
  user-select: text;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  text-align: center;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.2s, background-color 0.2s;
  -moz-appearance: textfield;
  appearance: textfield;
}

.page-jump-input::-webkit-outer-spin-button,
.page-jump-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.page-jump-input:hover {
  border-color: var(--border-color);
}

.page-jump-input:focus {
  outline: none;
  border-color: var(--accent-color);
  background: var(--bg-tertiary);
}

.page-separator {
  color: var(--text-tertiary);
}

.page-total {
  color: var(--text-secondary);
  min-width: 2ch;
}

.comic-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}


.zoom-level {
  color: var(--text-secondary);
  font-size: 0.9rem;
  min-width: 50px;
  text-align: center;
}

.rotation-level {
  color: var(--text-secondary);
  font-size: 0.85rem;
  min-width: 36px;
  text-align: center;
}

.quality-controls {
  display: flex;
  align-items: center;
}

.quality-select {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quality-select:hover {
  border-color: var(--accent-color);
}

.quality-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(102, 192, 244, 0.1);
}

.comic-viewer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  /* GPU硬件加速优化 */
  will-change: transform;
  transform: translateZ(0);
  /* 优化渲染性能 */
  contain: layout style paint;
}

/* 左侧预览栏 */
.sidebar-preview {
  width: 200px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-title {
  padding: 12px 15px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}

.thumbnail-list {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.thumbnail-list::-webkit-scrollbar {
  width: 6px;
}

.thumbnail-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.thumbnail-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.thumbnail-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.thumbnail-track {
  position: relative;
  width: 100%;
}

.thumbnail-item {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 0;
  /* 152 是条目本身，再加 10 的间距，等于脚本里的 thumbnailSlotHeight。 */
  height: 152px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 5px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.thumbnail-item:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.thumbnail-item.active {
  border-color: var(--accent-color);
  background: rgba(102, 192, 244, 0.15);
  box-shadow: 0 0 10px rgba(102, 192, 244, 0.3);
}

.thumbnail-number {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 5px;
  font-weight: 500;
}

.thumbnail-image {
  width: 100%;
  height: 112px;
  object-fit: contain;
  border-radius: 4px;
  background: var(--bg-primary);
}

/* 主阅读区域 */
.main-reading-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
  position: relative;
  /* 画布跟当前主题走，不再固定成白底。 */
  background: var(--bg-primary);
}

/* 图片两侧悬浮翻页区 */
.page-nav-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
  background: transparent;
  transition: background 0.25s ease;
}

.page-nav-zone:hover {
  background: rgba(0, 0, 0, 0.35);
}

.page-nav-prev {
  left: 0;
}

.page-nav-prev:hover {
  background: linear-gradient(to right, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
}

.page-nav-next {
  right: 0;
}

.page-nav-next:hover {
  background: linear-gradient(to left, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
}

.page-nav-zone.disabled {
  cursor: default;
  opacity: 0.4;
}

.page-nav-zone.disabled:hover {
  background: transparent;
}

.page-nav-arrow {
  font-size: 84px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
  opacity: 0;
  transform: scale(0.4);
  transition: opacity 0.25s ease, transform 0.25s ease;
  user-select: none;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.page-nav-zone:hover .page-nav-arrow {
  opacity: 1;
  transform: scale(1);
}

.page-nav-zone.disabled:hover .page-nav-arrow {
  opacity: 0.35;
  transform: scale(0.7);
}

.comic-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  /* 让 100cqh / 100cqw 指向这块阅读区，旋转后才能按对调的宽高适配 */
  container-type: size;
  /* GPU硬件加速优化 */
  will-change: transform;
  transform: translateZ(0);
  /* 优化渲染性能 */
  contain: layout style paint;
}

.comic-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
  cursor: grab;
  user-select: none;
  /* GPU硬件加速优化 */
  will-change: transform;
  transform: translateZ(0); /* 强制启用硬件加速 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* 优化渲染性能 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  /* 减少重绘 */
  contain: layout style paint;
}

.comic-image:active {
  cursor: grabbing;
}

/* 当图片放大时显示拖动光标 */
.comic-image[style*="scale(1.25)"],
.comic-image[style*="scale(1.5)"],
.comic-image[style*="scale(1.75)"],
.comic-image[style*="scale(2)"],
.comic-image[style*="scale(2.25)"],
.comic-image[style*="scale(2.5)"],
.comic-image[style*="scale(2.75)"],
.comic-image[style*="scale(3)"] {
  cursor: grab;
}

.image-filename {
  text-align: center;
  /* 连点翻页时，按下和松开之间文字会换成下一张的名字，浏览器会把这段当成拖选结果。 */
  user-select: none;
  padding: 8px 16px;
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  margin-left: 8px;
  opacity: 0.8;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 15px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 全屏模式 */
.comic-viewer-content:fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  max-width: none;
  max-height: none;
  background: var(--bg-primary);
}

.comic-viewer-content:fullscreen .comic-viewer-header {
  border-radius: 0;
  background: var(--bg-secondary);
  backdrop-filter: blur(10px);
  border: none;
  border-bottom: 1px solid var(--border-color);
}

/* 全屏时隐藏文件名显示，避免遮挡图片 */
.comic-viewer-content:fullscreen .image-filename {
  display: none;
}

/* 响应式 */
@media (max-width: 768px) {
  .comic-viewer-content {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  
  .comic-viewer-header {
    flex-direction: column;
    gap: 10px;
    padding: 10px 15px;
  }
  
  .comic-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-nav-zone {
    width: 80px;
  }

  .page-nav-arrow {
    font-size: 60px;
  }
}
</style>
