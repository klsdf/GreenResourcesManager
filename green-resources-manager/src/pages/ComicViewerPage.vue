<template>
  <!-- 漫画阅读器独立标签页宿主 -->
  <div class="comic-viewer-page">
    <!-- 加载中提示 -->
    <div v-if="loading" class="comic-viewer-loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingText }}</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="errorMessage" class="comic-viewer-error">
      <p>{{ errorMessage }}</p>
    </div>

    <!-- 漫画阅读器（独立模式） -->
    <ComicViewer
      v-else
      :visible="true"
      :standalone="true"
      :album="album"
      :pages="pages"
      :initial-page-index="0"
      @close="closeTab"
    />
  </div>
</template>

<script>
import ComicViewer from '../components/ComicViewer.vue'

/**
 * 漫画阅读器独立标签页
 * 通过 URL 查询参数接收 path（资源路径）与 title（资源名称）
 * 在挂载时自行加载图片列表，与主应用解耦，每个标签页展示一个独立的漫画
 */
export default {
  name: 'ComicViewerPage',
  components: { ComicViewer },
  data() {
    return {
      album: null,
      pages: [],
      loading: true,
      loadingText: '正在加载漫画...',
      errorMessage: ''
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    const resourcePath = params.get('path') || ''
    const title = params.get('title') || '漫画阅读器'

    if (!resourcePath) {
      this.loading = false
      this.errorMessage = '未提供漫画路径'
      return
    }

    this.album = { name: title, resourcePath }
    document.title = title

    try {
      await this.loadAlbumPages(resourcePath)
    } catch (error) {
      console.error('[ComicViewerPage] 加载漫画失败:', error)
      this.errorMessage = `加载漫画失败: ${error.message || '未知错误'}`
    } finally {
      this.loading = false
    }
  },
  methods: {
    // 加载专辑的图片文件列表（与 GenericResourceView.loadAlbumPages 保持一致）
    async loadAlbumPages(resourcePath) {
      const trimmed = (resourcePath || '').trim()
      if (!trimmed) {
        this.pages = []
        return
      }

      // 单图：路径为单个图片文件时直接作为一页
      const singleImageExt = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|heic|heif)$/i
      if (singleImageExt.test(trimmed)) {
        this.pages = [trimmed]
        return
      }

      // CBZ/ZIP 漫画包：列出压缩包内图片
      const cbzExt = /\.(cbz|zip)$/i
      if (cbzExt.test(trimmed) && window.electronAPI?.listImageFilesInArchive) {
        try {
          const resp = await window.electronAPI.listImageFilesInArchive(trimmed)
          if (resp.success && Array.isArray(resp.files) && resp.files.length > 0) {
            const base = `archive:///${trimmed.replace(/\\/g, '/')}`
            this.pages = resp.files.map((entry) => `${base}#${encodeURIComponent(entry)}`)
          } else {
            this.pages = []
            if (!resp.success) console.error('[ComicViewerPage] CBZ 加载失败:', resp.error)
          }
        } catch (err) {
          console.error('[ComicViewerPage] 加载 CBZ 页面失败:', err)
          this.pages = []
        }
        return
      }

      // 文件夹模式：列出目录下的图片文件
      if (window.electronAPI?.listImageFiles) {
        const resp = await window.electronAPI.listImageFiles(trimmed)
        if (resp.success) {
          this.pages = resp.files || []
        } else {
          console.error('[ComicViewerPage] 加载图片文件失败:', resp.error)
          this.pages = []
        }
      } else {
        console.warn('[ComicViewerPage] Electron API 不可用，无法加载图片文件')
        this.pages = []
      }
    },

    // 关闭当前标签页
    async closeTab() {
      if (!window.electronAPI?.tabClose || !window.electronAPI?.tabGetAll) return
      try {
        const result = await window.electronAPI.tabGetAll()
        const activeTabId = result?.activeTabId
        if (activeTabId && activeTabId !== 'home-tab') {
          await window.electronAPI.tabClose(activeTabId)
        }
      } catch (error) {
        console.error('[ComicViewerPage] 关闭标签页失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.comic-viewer-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.95);
}

.comic-viewer-loading,
.comic-viewer-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  gap: 15px;
  font-size: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #444;
  border-top: 3px solid var(--accent-color, #66c0f4);
  border-radius: 50%;
  animation: comic-viewer-spin 1s linear infinite;
}

@keyframes comic-viewer-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
