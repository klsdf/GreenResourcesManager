<template>
  <div class="recent-view">
    <div class="recent-content">
      <div class="page-header">
        <h2 class="page-title">{{ $t('recent.title') }}</h2>
        <p class="page-description">{{ $t('recent.description') }}</p>
      </div>

      <div class="resources-container">
        <FunLoading v-if="isLoading" :text="$t('app.loading')" />
        <div v-else-if="recentResources.length > 0" class="resources-grid">
          <ResourceCard
            v-for="resource in recentResources"
            :key="`${resource.type}-${resource.id}`"
            :resource="resource"
            @click="handleResourceClick(resource)"
          />
        </div>
        <div v-else class="empty-state">
          <p>{{ $t('recent.noRecent') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../utils/SaveManager.ts'
import ResourceCard from '../components/home/ResourceCard.vue'
import FunLoading from '../fun-ui/feedback/Loading/FunLoading.vue'

interface UnifiedResource {
  id: string
  type: 'game' | 'image' | 'video' | 'novel' | 'website' | 'audio'
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
  name: 'RecentView',
  components: {
    ResourceCard,
    FunLoading
  },
  data() {
    return {
      recentResources: [] as UnifiedResource[],
      isLoading: false
    }
  },
  methods: {
    navigateTo(viewId: string) {
      this.$router.push({ name: viewId }).catch(err => {
        if (err.name !== 'NavigationDuplicated') {
          console.error('导航失败:', err)
        }
      })
    },
    async loadRecentResources() {
      try {
        this.isLoading = true
        const api = (window as any).electronAPI
        if (!api?.sqliteGetPageData) {
          this.isLoading = false
          return
        }
        const pageIds = ['games', 'images', 'videos', 'anime-series', 'novels', 'websites', 'audio'] as const
        const results = await Promise.all(pageIds.map((id) => api.sqliteGetPageData(id)))
        const [games, images, videos, animeFolders, novels, websites, audios] = results.map((r: any) => (r?.ok ? (r.data ?? []) : []))

        const allResources: UnifiedResource[] = [
          ...games.map((g: any) => this.normalizeGame(g)),
          ...images.map((img: any) => this.normalizeImage(img)),
          ...videos.map((v: any) => this.normalizeVideo(v)),
          ...animeFolders.map((a: any) => this.normalizeAnime(a)),
          ...novels.map((n: any) => this.normalizeNovel(n)),
          ...websites.map((w: any) => this.normalizeWebsite(w)),
          ...audios.map((a: any) => this.normalizeAudio(a))
        ]

        // 获取最近访问的资源（最多50个）
        this.recentResources = this.getRecentResources(allResources, 50)
        
        this.isLoading = false
      } catch (error) {
        console.error('加载最近浏览失败:', error)
        this.isLoading = false
      }
    },
    normalizeGame(game: any): UnifiedResource {
      return {
        id: game.id,
        type: 'game',
        name: game.name,
        category: game.developer || '游戏',
        description: game.description,
        thumbnail: game.coverPath || (game as any).image,
        lastAccessed: game.lastPlayed,
        badge: game.playTime ? undefined : '未通关',
        metadata: {
          developer: game.developer,
          publisher: game.publisher,
          tags: game.tags,
          playTime: game.playTime,
          playCount: game.playCount
        }
      }
    },
    normalizeImage(album: any): UnifiedResource {
      const size = album.folderSize || (album.pagesCount ? album.pagesCount * 1024 * 1024 : 0)
      let badge = undefined
      if (size > 0) {
        const sizeGB = size / (1024 * 1024 * 1024)
        if (sizeGB >= 4) {
          badge = '4K'
        } else {
          badge = this.formatSize(size)
        }
      }
      
      return {
        id: album.id,
        type: 'image',
        name: album.name,
        category: album.author || '高清壁纸',
        description: album.description,
        thumbnail: album.cover,
        lastAccessed: album.lastViewed,
        badge: badge,
        metadata: {
          author: album.author,
          pagesCount: album.pagesCount,
          viewCount: album.viewCount,
          tags: album.tags,
          folderSize: size
        }
      }
    },
    normalizeVideo(video: any): UnifiedResource {
      let badge = undefined
      if (video.fileSize) {
        const sizeGB = video.fileSize / (1024 * 1024 * 1024)
        if (sizeGB >= 4) {
          badge = '4K'
        } else if (sizeGB >= 1) {
          badge = 'HD'
        }
      } else if (video.duration) {
        badge = this.formatDuration(video.duration)
      }
      
      return {
        id: video.id,
        type: 'video',
        name: video.name,
        category: video.series || '冒险视频',
        description: video.description,
        thumbnail: video.thumbnail,
        lastAccessed: video.lastWatched,
        badge: badge,
        metadata: {
          series: video.series,
          duration: video.duration,
          watchCount: video.watchCount,
          tags: video.tags,
          actors: video.actors,
          fileSize: video.fileSize
        }
      }
    },
    normalizeAnime(anime: any): UnifiedResource {
      return {
        id: anime.id,
        type: 'anime',
        name: anime.name,
        category: anime.series || '番剧',
        description: anime.description,
        thumbnail: anime.thumbnail,
        lastAccessed: anime.lastWatched,
        badge: anime.videoCount ? `${anime.videoCount}集` : undefined,
        metadata: {
          series: anime.series,
          tags: anime.tags,
          actors: anime.actors,
          voiceActors: anime.voiceActors
        }
      }
    },
    normalizeNovel(novel: any): UnifiedResource {
      let badge = undefined
      if (novel.volume) {
        badge = novel.volume
      } else if (novel.fileSize) {
        badge = this.formatSize(novel.fileSize)
      }
      
      return {
        id: novel.id,
        type: 'novel',
        name: novel.name,
        category: novel.author || '轻小说',
        description: novel.description,
        thumbnail: novel.coverImage,
        lastAccessed: novel.lastRead,
        badge: badge,
        metadata: {
          author: novel.author,
          genre: novel.genre,
          readProgress: novel.readProgress,
          status: novel.status,
          tags: novel.tags,
          volume: novel.volume,
          fileSize: novel.fileSize
        }
      }
    },
    normalizeWebsite(website: any): UnifiedResource {
      return {
        id: website.id,
        type: 'website',
        name: website.name,
        category: website.tags && website.tags.length > 0 ? website.tags[0] : '网站',
        description: website.description,
        thumbnail: website.favicon || website.icon,
        lastAccessed: website.lastVisited,
        badge: website.isBookmark ? '已收藏' : undefined,
        metadata: {
          url: website.url,
          visitCount: website.visitCount,
          tags: website.tags
        }
      }
    },
    normalizeAudio(audio: any): UnifiedResource {
      const fileSize = audio.fileSize || 0
      return {
        id: audio.id,
        type: 'audio',
        name: audio.name,
        category: audio.album || 'OST音乐',
        description: audio.notes,
        thumbnail: audio.coverPath,
        lastAccessed: audio.lastPlayed,
        badge: fileSize > 0 ? this.formatSize(fileSize) : undefined,
        metadata: {
          artist: audio.artist,
          album: audio.album,
          genre: audio.genre,
          playCount: audio.playCount,
          duration: audio.duration,
          tags: audio.tags,
          fileSize: fileSize
        }
      }
    },
    getRecentResources(resources: UnifiedResource[], count: number): UnifiedResource[] {
      // 过滤出有访问时间的资源并按时间排序
      const withAccessTime = resources
        .filter(r => r.lastAccessed)
        .sort((a, b) => {
          const timeA = new Date(a.lastAccessed!).getTime()
          const timeB = new Date(b.lastAccessed!).getTime()
          return timeB - timeA // 降序，最新的在前
        })
      
      return withAccessTime.slice(0, count)
    },
    handleResourceClick(resource: UnifiedResource) {
      // 导航到对应的资源类型页面
      const viewMap: { [key: string]: string } = {
        'game': 'games',
        'image': 'images',
        'video': 'videos',
        'novel': 'novels',
        'website': 'websites',
        'audio': 'audio'
      }
      
      const viewId = viewMap[resource.type]
      if (viewId) {
        this.navigateTo(viewId)
      }
    },
    formatSize(bytes: number): string {
      if (!bytes || bytes === 0) return ''
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    },
    formatDuration(seconds?: number): string {
      if (!seconds) return ''
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  },
  async mounted() {
    await this.loadRecentResources()
  }
}
</script>

<style scoped>
.recent-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 2rem;
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.page-description {
  font-size: 0.95rem;
  color: #666;
  margin: 0;
}

.resources-container {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .resources-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .resources-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .recent-content {
    padding: 1rem;
  }
}
</style>

