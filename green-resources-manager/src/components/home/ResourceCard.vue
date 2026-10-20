<template>
  <div class="resource-card" @click="$emit('click', resource)">
    <div class="resource-thumbnail">
      <img 
        :src="thumbnailUrl" 
        :alt="resource.name"
        @error="handleImageError"
      >
      <!-- 徽章 -->
      <div v-if="resource.badge" class="resource-badge">
        {{ resource.badge }}
      </div>
      <!-- 文件丢失标识 -->
      <div v-if="showFileError" class="file-error-indicator" :title="$lt('本地文件不存在')">
        ⚠️
      </div>
    </div>
    <div class="resource-info">
      <h3 class="resource-title">{{ resource.name }}</h3>
      <p class="resource-category">{{ resource.category || getDefaultCategory() }}</p>
      <p class="resource-status">{{ getStatusText() }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import type { UnifiedResourceType } from '../../types/page'

interface UnifiedResource {
  id: string
  type: UnifiedResourceType
  name: string
  category?: string
  description?: string
  thumbnail?: string
  image?: string
  cover?: string
  lastAccessed?: string | null
  badge?: string
  metadata?: {
    [key: string]: any
  }
}

export default {
  name: 'ResourceCard',
  props: {
    resource: {
      type: Object as () => UnifiedResource,
      required: true
    }
  },
  emits: ['click'],
  data() {
    return {
      imageError: false,
      resolvedImageUrl: null as string | null,
      isElectronEnvironment: typeof window !== 'undefined' && window.electronAPI !== undefined,
      isMounted: false
    }
  },
  computed: {
    thumbnailUrl(): string {
      if (this.imageError) {
        return this.getDefaultImage()
      }
      
      // 如果已经解析过，直接返回
      if (this.resolvedImageUrl) {
        return this.resolvedImageUrl
      }
      
      const img = this.resource.thumbnail || (this.resource as any).coverPath || this.resource.image || this.resource.cover
      if (!img) {
        return this.getDefaultImage()
      }
      
      // 如果是网络URL，直接返回
      if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
        return img
      }
      
      // 如果是 data: 或 file:，直接返回
      if (typeof img === 'string' && (img.startsWith('data:') || img.startsWith('file:'))) {
        return img
      }
      
      // 其他情况，尝试转换为 file:// URL（异步解析在 mounted 中进行）
      if (typeof img === 'string') {
        const normalizedPath = img.replace(/\\/g, '/')
        return `file:///${normalizedPath}`
      }
      
      return this.getDefaultImage()
    },
    showFileError(): boolean {
      // 检查资源是否有 fileExists 字段且为 false
      return this.resource.metadata?.fileExists === false
    }
  },
  methods: {
    async resolveImagePath(imagePath: string) {
      if (!this.isElectronEnvironment || !window.electronAPI) {
        return
      }
      
      try {
        // 优先使用 readFileAsDataUrl
        if (window.electronAPI.readFileAsDataUrl) {
          const dataUrl = await window.electronAPI.readFileAsDataUrl(imagePath)
          if (dataUrl && this.isMounted) {
            this.resolvedImageUrl = dataUrl
            return
          }
        }
        
        // 降级到 getFileUrl
        if (window.electronAPI.getFileUrl) {
          const result = await window.electronAPI.getFileUrl(imagePath)
          if (result && result.success && result.url && this.isMounted) {
            this.resolvedImageUrl = result.url
            return
          }
        }
      } catch (error) {
        console.error('解析图片路径失败:', error)
        // 不设置 resolvedImageUrl，让 computed 返回默认图片
      }
    },
    handleResourceChange() {
      // 重置状态
      this.imageError = false
      this.resolvedImageUrl = null
      
      // 解析图片路径
      const img = this.resource.thumbnail || (this.resource as any).coverPath || this.resource.image || this.resource.cover
      if (img && this.isElectronEnvironment && typeof img === 'string' && 
          !img.startsWith('http://') && !img.startsWith('https://') && 
          !img.startsWith('data:') && !img.startsWith('file:')) {
        this.resolveImagePath(img)
      }
    },
    handleImageError() {
      this.imageError = true
    },
    getDefaultImage(): string {
      const defaultImages: { [key: string]: string } = {
        game: './default-game.png',
        image: './default-image.png',
        video: './default-video.png',
        anime: './default-video.png',
        audio: './default-audio.png',
        novel: './default-novel.png',
        website: './default-web.png'
      }
      return defaultImages[this.resource.type] || './default-image.png'
    },
    getDefaultCategory(): string {
      const categories: { [key: string]: string } = {
        game: '游戏',
        image: '图片',
        video: '视频',
        anime: '番剧',
        audio: '音频',
        novel: '小说',
        website: '网站'
      }
      return categories[this.resource.type] || '资源'
    },
    getStatusText(): string {
      const metadata = this.resource.metadata || {}
      
      switch (this.resource.type) {
        case 'game':
          if (metadata.playTime) {
            return this.formatPlayTime(metadata.playTime)
          }
          return '未通关'
        case 'image':
          if (metadata.viewCount) {
            return `已浏览 ${metadata.viewCount} 次`
          }
          return '未浏览'
        case 'video':
        case 'anime':
          if (metadata.watchCount) {
            return `观看 ${metadata.watchCount} 次`
          }
          if (metadata.duration) {
            return this.formatDuration(metadata.duration)
          }
          return '未观看'
        case 'novel':
          if (metadata.readProgress !== undefined) {
            return `${metadata.readProgress}% 已读`
          }
          return '未阅读'
        case 'audio':
          if (metadata.playCount) {
            return `播放 ${metadata.playCount} 次`
          }
          if (metadata.fileSize) {
            return this.formatSize(metadata.fileSize)
          }
          return '未播放'
        case 'website':
          if (metadata.visitCount) {
            return `访问 ${metadata.visitCount} 次`
          }
          return '未访问'
        default:
          return ''
      }
    },
    formatPlayTime(seconds: number): string {
      if (!seconds) return '未游玩'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours}小时${minutes}分钟`
      }
      return `${minutes}分钟`
    },
    formatDuration(seconds: number): string {
      if (!seconds) return ''
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    },
    formatSize(bytes: number): string {
      if (!bytes || bytes === 0) return ''
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }
  },
  watch: {
    'resource.thumbnail'() {
      this.handleResourceChange()
    },
    'resource.image'() {
      this.handleResourceChange()
    },
    'resource.cover'() {
      this.handleResourceChange()
    }
  },
  mounted() {
    // 标记组件已挂载
    this.isMounted = true
    // 组件挂载时解析图片路径
    this.handleResourceChange()
  },
  beforeUnmount() {
    // 标记组件已卸载
    this.isMounted = false
    // 组件卸载前清理
    this.resolvedImageUrl = null
    this.imageError = false
  }
}
</script>

<style scoped>
.resource-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.resource-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 宽高比 */
  background: #f0f0f0;
  overflow: hidden;
}

.resource-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resource-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  z-index: 2;
  backdrop-filter: blur(4px);
}

.file-error-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(220, 38, 38, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  z-index: 2;
}

.resource-info {
  padding: 1rem;
}

.resource-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-category {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-status {
  font-size: 0.875rem;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
