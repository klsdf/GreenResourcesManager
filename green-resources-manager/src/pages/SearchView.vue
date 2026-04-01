<template>
  <div class="search-view">
    <div class="search-content">
      <div class="search-header">
        <h2>{{ $t('search.title') }}</h2>
        <p>{{ $t('search.description') }}</p>
      </div>
      
      <div class="search-box-container">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            @input="handleSearch"
            @keyup.enter="performSearch"
            :placeholder="$t('search.placeholder')"
            class="search-input"
            ref="searchInput"
          >
          <span class="search-icon">🔍</span>
          <button 
            v-if="searchQuery" 
            class="clear-btn" 
            @click="clearSearch"
            :title="$t('search.clearSearch')"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="search-results" v-if="hasSearched">
        <div class="results-header">
          <h3>{{ $t('search.results') }}</h3>
          <span class="results-count">{{ $t('search.foundResults', { count: totalResults }) }}</span>
        </div>
        
        <div v-if="searchResults.length === 0" class="no-results">
          <p>{{ $t('search.noResults') }}</p>
        </div>
        
        <div v-else class="results-list">
          <div 
            v-for="(results, type) in groupedResults" 
            :key="type"
            class="result-group"
          >
            <h4 class="result-group-title">
              {{ getResourceTypeName(type) }}
              <span class="result-count">({{ results.length }})</span>
            </h4>
            <div class="result-items">
              <div 
                v-for="result in results" 
                :key="`${type}-${result.id}`"
                class="result-item"
                @click="handleResultClick(result, type)"
              >
                <span class="result-icon">{{ getResourceIcon(type) }}</span>
                <div class="result-content">
                  <div class="result-name" v-html="highlightKeyword(result.name, searchQueryTrimmed)"></div>
                  <div class="result-description" v-if="result.description" v-html="highlightKeyword(result.description, searchQueryTrimmed)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="search-placeholder">
        <p>{{ $t('search.startSearch') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../utils/SaveManager.ts'

interface SearchResult {
  id: string
  name: string
  description?: string
  type: string
  [key: string]: any
}

export default {
  name: 'SearchView',
  data() {
    return {
      searchQuery: '',
      searchResults: [] as SearchResult[],
      hasSearched: false,
      searchTimeout: null as NodeJS.Timeout | null
    }
  },
  computed: {
    searchQueryTrimmed(): string {
      return (this.searchQuery || '').trim()
    },
    totalResults() {
      return this.searchResults.length
    },
    groupedResults() {
      const grouped: Record<string, SearchResult[]> = {}
      this.searchResults.forEach(result => {
        if (!grouped[result.type]) {
          grouped[result.type] = []
        }
        grouped[result.type].push(result)
      })
      return grouped
    }
  },
  methods: {
    handleSearch() {
      // 实时搜索，延迟执行
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout)
      }
      this.searchTimeout = setTimeout(() => {
        this.performSearch()
      }, 300)
    },
    async performSearch() {
      if (!this.searchQuery.trim()) {
        this.searchResults = []
        this.hasSearched = false
        return
      }
      
      this.hasSearched = true
      const query = this.searchQuery.toLowerCase().trim()
      const results: SearchResult[] = []
      
      try {
        // 统一从 SQLite 读取
        const api = (window as any).electronAPI
        if (!api?.sqliteGetPageData) {
          this.hasSearched = true
          return
        }
        const pageIds = ['games', 'images', 'videos', 'anime-series', 'novels', 'websites', 'audio'] as const
        const sqlResults = await Promise.all(pageIds.map((id) => api.sqliteGetPageData(id)))
        const games = sqlResults[0]?.ok ? (sqlResults[0].data ?? []) : []
        const images = sqlResults[1]?.ok ? (sqlResults[1].data ?? []) : []
        const videos = sqlResults[2]?.ok ? (sqlResults[2].data ?? []) : []
        const animeFolders = sqlResults[3]?.ok ? (sqlResults[3].data ?? []) : []
        const novels = sqlResults[4]?.ok ? (sqlResults[4].data ?? []) : []
        const websites = sqlResults[5]?.ok ? (sqlResults[5].data ?? []) : []
        const audios = sqlResults[6]?.ok ? (sqlResults[6].data ?? []) : []
        
        // 搜索游戏（developer 为旧 JSON 字段，developers 为 SQL 表字段）
        games.forEach((game: any) => {
          if (this.matchesQuery(game, query, ['name', 'description', 'developer', 'developers', 'publisher'])) {
            results.push({
              id: game.id,
              name: game.name,
              description: game.description,
              type: 'game',
              ...game
            })
          }
        })
        
        // 搜索图片
        images.forEach((image: any) => {
          if (this.matchesQuery(image, query, ['name', 'description', 'author'])) {
            results.push({
              id: image.id,
              name: image.name,
              description: image.description,
              type: 'image',
              ...image
            })
          }
        })
        
        // 搜索视频
        videos.forEach((video: any) => {
          if (this.matchesQuery(video, query, ['name', 'description', 'series', 'actors'])) {
            results.push({
              id: video.id,
              name: video.name,
              description: video.description,
              type: 'video',
              ...video
            })
          }
        })
        
        // 搜索番剧
        animeFolders.forEach((anime: any) => {
          if (this.matchesQuery(anime, query, ['name', 'description', 'series', 'actors', 'voiceActors'])) {
            results.push({
              id: anime.id,
              name: anime.name,
              description: anime.description,
              type: 'anime',
              ...anime
            })
          }
        })
        
        // 搜索小说
        novels.forEach((novel: any) => {
          if (this.matchesQuery(novel, query, ['name', 'description', 'author', 'genre'])) {
            results.push({
              id: novel.id,
              name: novel.name,
              description: novel.description,
              type: 'novel',
              ...novel
            })
          }
        })
        
        // 搜索网站
        websites.forEach((website: any) => {
          if (this.matchesQuery(website, query, ['name', 'description', 'url'])) {
            results.push({
              id: website.id,
              name: website.name,
              description: website.description,
              type: 'website',
              ...website
            })
          }
        })
        
        // 搜索音频
        audios.forEach((audio: any) => {
          if (this.matchesQuery(audio, query, ['name', 'notes', 'artist', 'album', 'genre'])) {
            results.push({
              id: audio.id,
              name: audio.name,
              description: audio.notes,
              type: 'audio',
              ...audio
            })
          }
        })
        
        this.searchResults = results
      } catch (error) {
        console.error('搜索失败:', error)
        this.searchResults = []
      }
    },
    matchesQuery(item: any, query: string, fields: string[]): boolean {
      return fields.some(field => {
        const value = item[field]
        if (Array.isArray(value)) {
          return value.some((v: any) => String(v).toLowerCase().includes(query))
        }
        return value && String(value).toLowerCase().includes(query)
      })
    },
    /** 将文本中的搜索关键词高亮，返回安全转义后的 HTML（用于 v-html） */
    highlightKeyword(text: string | undefined | null, query: string): string {
      if (text == null || text === '') return ''
      const escapeHtml = (s: string) =>
        String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      const escaped = escapeHtml(text)
      if (!query || !query.trim()) return escaped
      const q = query.trim()
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapeRegExp(escapeHtml(q)), 'gi')
      return escaped.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`)
    },
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = []
      this.hasSearched = false
      if (this.$refs.searchInput) {
        (this.$refs.searchInput as HTMLInputElement).focus()
      }
    },
    getResourceTypeName(type: string): string {
      const typeMap: Record<string, string> = {
        'game': '游戏',
        'image': '图片',
        'video': '视频',
        'anime': '番剧',
        'novel': '小说',
        'website': '网站',
        'audio': '音频'
      }
      return typeMap[type] || type
    },
    getResourceIcon(type: string): string {
      const iconMap: Record<string, string> = {
        'game': '🎮',
        'image': '🖼️',
        'video': '🎬',
        'anime': '📺',
        'novel': '📚',
        'website': '🌐',
        'audio': '🎵'
      }
      return iconMap[type] || '📄'
    },
    handleResultClick(result: SearchResult, type: string) {
      // 导航到对应的资源类型页面
      const viewMap: Record<string, string> = {
        'game': 'games',
        'image': 'images',
        'video': 'videos',
        'anime': 'anime-series',
        'novel': 'novels',
        'website': 'websites',
        'audio': 'audio'
      }
      
      const viewId = viewMap[type]
      if (viewId) {
        this.$router.push({ name: viewId }).then(() => {
          // 可以在这里添加高亮显示选中项的逻辑
        })
      }
    }
  },
  mounted() {
    // 自动聚焦搜索框
    this.$nextTick(() => {
      if (this.$refs.searchInput) {
        (this.$refs.searchInput as HTMLInputElement).focus()
      }
    })
  },
  beforeUnmount() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
  }
}
</script>

<style scoped>
.search-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.search-header {
  margin-bottom: 2rem;
  text-align: center;
}

.search-header h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary, #333);
}

.search-header p {
  font-size: 1rem;
  color: var(--text-secondary, #666);
}

.search-box-container {
  max-width: 600px;
  margin: 0 auto 2rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 12px 50px 12px 20px;
  font-size: 1.1rem;
  border: 2px solid var(--border-color, #ddd);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: var(--accent-color, #667eea);
}

.search-icon {
  position: absolute;
  right: 15px;
  font-size: 1.2rem;
  pointer-events: none;
}

.clear-btn {
  position: absolute;
  right: 45px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-secondary, #999);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-primary, #333);
}

.search-results {
  max-width: 900px;
  margin: 0 auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color, #eee);
}

.results-header h3 {
  font-size: 1.5rem;
  color: var(--text-primary, #333);
  margin: 0;
}

.results-count {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary, #999);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.result-group {
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 8px;
  padding: 1.5rem;
}

.result-group-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary, #333);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.result-count {
  font-size: 0.9rem;
  font-weight: normal;
  color: var(--text-secondary, #666);
}

.result-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.result-item:hover {
  background: var(--bg-hover, #f0f0f0);
  border-color: var(--accent-color, #667eea);
  transform: translateX(4px);
}

.result-icon {
  font-size: 1.5rem;
  margin-right: 12px;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-description {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-highlight {
  background: var(--accent-color, #667eea);
  color: #fff;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}

.search-placeholder {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary, #999);
}
</style>

