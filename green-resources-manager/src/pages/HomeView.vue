<template>
  <div class="home-view">
    <div class="home-content">
      <div class="recommended-section">
        <div class="section-header">
          <h2 class="section-title">{{ $t('home.recommended') }}</h2>
          <button class="refresh-btn" @click="refreshRecommendations">{{ $t('home.refreshBatch') }}</button>
        </div>
        <div class="resources-grid" v-if="recommendedResources.length > 0">
          <ResourceCard
            v-for="resource in recommendedResources"
            :key="`${resource.type}-${resource.id}`"
            :resource="resource"
            @click="handleResourceClick(resource)"
          />
        </div>
        <div v-else class="empty-state">
          <p>{{ $t('home.noRecommendations') }}</p>
        </div>
      </div>

      <div class="recent-section">
        <div class="section-header">
          <h2 class="section-title">{{ $t('home.recentBrowsing') }}</h2>
          <a href="#" class="view-more-link" @click.prevent="navigateToRecent">{{ $t('home.viewAll') }}</a>
        </div>
        <div class="resources-grid" v-if="recentResources.length > 0">
          <ResourceCard
            v-for="resource in recentResources"
            :key="`${resource.type}-${resource.id}`"
            :resource="resource"
            @click="handleResourceClick(resource)"
          />
        </div>
        <div v-else class="empty-state">
          <p>{{ $t('home.noRecentBrowsing') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../utils/SaveManager.ts'
import customPageManager from '../utils/CustomPageManager.ts'
import ResourceCard from '../components/home/ResourceCard.vue'
import type { UnifiedResourceType } from '../types/page.ts'

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
  name: 'HomeView',
  components: {
    ResourceCard
  },
  data() {
    return {
      recommendedResources: [] as UnifiedResource[],
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
    async refreshRecommendations() {
      // 刷新推荐内容（统一从 SQLite 加载）
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

        // 生成新的随机推荐（只显示6个）
        this.recommendedResources = this.generateRandomRecommendations(allResources, 6)
        
        this.isLoading = false
      } catch (error) {
        console.error('刷新推荐失败:', error)
        this.isLoading = false
      }
    },
    navigateToRecent() {
      // 导航到最近浏览页面
      this.navigateTo('recent')
    },
    async loadAllResources() {
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

        // 生成随机推荐（只显示6个）
        this.recommendedResources = this.generateRandomRecommendations(allResources, 6)
        
        // 获取最近访问的资源（至少6个）
        this.recentResources = this.getRecentResources(allResources, 6)
        
        this.isLoading = false
      } catch (error) {
        console.error('加载资源失败:', error)
        this.isLoading = false
      }
    },
    getLastAccessedFromItem(item: any, ...fields: string[]): string | null | undefined {
      for (const f of fields) {
        if (item && item[f]) return item[f]
      }
      const arr = item?.visitedSessions
      if (Array.isArray(arr) && arr.length > 0) return arr[arr.length - 1]
      return undefined
    },
    normalizeGame(game: any): UnifiedResource {
      return {
        id: game.id,
        type: 'game',
        name: game.name,
        category: game.developer || '游戏',
        description: game.description,
        thumbnail: game.coverPath || (game as any).image,
        lastAccessed: this.getLastAccessedFromItem(game, 'lastPlayed'),
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
      // 尝试从 metadata 或其他字段获取大小信息
      const size = album.folderSize || (album.pagesCount ? album.pagesCount * 1024 * 1024 : 0)
      // 根据大小判断是否为高清
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
        lastAccessed: this.getLastAccessedFromItem(album, 'lastViewed'),
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
      // 根据视频大小或质量添加徽章
      let badge = undefined
      if (video.fileSize) {
        const sizeGB = video.fileSize / (1024 * 1024 * 1024)
        if (sizeGB >= 4) {
          badge = '4K'
        } else if (sizeGB >= 1) {
          badge = 'HD'
        }
      } else if (video.duration) {
        // 如果没有大小信息，使用时长作为徽章
        badge = this.formatDuration(video.duration)
      }
      
      return {
        id: video.id,
        type: 'video',
        name: video.name,
        category: video.series || '冒险视频',
        description: video.description,
        thumbnail: video.thumbnail,
        lastAccessed: this.getLastAccessedFromItem(video, 'lastWatched'),
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
    normalizeAnime(video: any): UnifiedResource {
      // 番剧使用和视频相同的数据结构，但类型不同
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
        type: 'anime',
        name: video.name,
        category: video.series || '番剧',
        description: video.description,
        thumbnail: video.thumbnail,
        lastAccessed: this.getLastAccessedFromItem(video, 'lastWatched'),
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
    normalizeNovel(novel: any): UnifiedResource {
      // 小说可以使用卷数或文件大小作为徽章
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
        lastAccessed: this.getLastAccessedFromItem(novel, 'lastRead', 'lastViewed'),
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
        lastAccessed: this.getLastAccessedFromItem(website, 'lastVisited'),
        badge: website.isBookmark ? '已收藏' : undefined,
        metadata: {
          url: website.url,
          visitCount: website.visitCount,
          tags: website.tags
        }
      }
    },
    normalizeAudio(audio: any): UnifiedResource {
      // 音频使用文件大小作为徽章
      const fileSize = audio.fileSize || 0
      return {
        id: audio.id,
        type: 'audio',
        name: audio.name,
        category: audio.album || 'OST音乐',
        description: audio.notes,
        thumbnail: audio.coverPath,
        lastAccessed: this.getLastAccessedFromItem(audio, 'lastPlayed'),
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
    generateRandomRecommendations(resources: UnifiedResource[], count: number): UnifiedResource[] {
      if (resources.length === 0) return []
      if (resources.length <= count) return [...resources].sort(() => Math.random() - 0.5)
      
      // 随机选择资源
      const shuffled = [...resources].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count)
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
    async handleResourceClick(resource: UnifiedResource) {
      // 导航到对应的资源类型页面
      if (resource.type === 'anime') {
        // 番剧类型需要异步获取页面ID
        const animePageId = await this.getAnimePageId()
        this.navigateTo(animePageId)
        return
      }
      
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
    // 获取番剧页面的 ID（从页面配置中查找）
    async getAnimePageId(): Promise<string> {
      try {
        await customPageManager.init()
        const pages = customPageManager.getPages()
        const animePage = pages.find(p => p.type === 'Anime' && !p.isHidden)
        if (animePage) {
          return animePage.id
        }
      } catch (error) {
        console.warn('获取番剧页面ID失败:', error)
      }
      // 如果找不到，返回默认值（用户需要先创建番剧页面）
      return 'anime-series'
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
    await this.loadAllResources()
  }
}
</script>

<style scoped>
.home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: #f5f5f5;
}

/* 推荐区域和最近浏览区域 */
.recommended-section,
.recent-section {
  margin-bottom: 3rem;
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.view-more-link {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.view-more-link:hover {
  color: #dc2626;
}

.refresh-btn {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #b91c1c;
}

.refresh-btn:active {
  background: #991b1b;
}

/* 资源网格 */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  overflow-x: auto;
}

/* 为您推荐区域 - 只显示一行 */
.recommended-section .resources-grid {
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: 1fr;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .recommended-section .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .home-content {
    padding: 1rem;
  }
}
</style>