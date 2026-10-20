<template>
  <div class="folder-videos-section">
    <h4>{{ $lt('文件夹中的视频 (') }}{{ videos.length }} {{ $lt('个)') }}</h4>
    <div class="folder-videos-grid" v-if="videos.length > 0">
      <div 
        v-for="(video, index) in videos" 
        :key="index"
        class="folder-video-card"
      >
        <div class="folder-video-thumbnail-wrapper">
          <div class="folder-video-thumbnail" v-if="video.thumbnail">
            <img 
              :src="getThumbnailUrl(video.thumbnail)" 
              :alt="video.name" 
              @error="(event: Event) => handleThumbnailError(event)"
            >
          </div>
          <div class="folder-video-thumbnail placeholder" v-else>
            <span>🎬</span>
          </div>
          <div class="video-overlay">
            <button 
              class="overlay-action-button play-btn" 
              @click.stop="handlePlayVideo(video)"
              :title="$lt('播放视频')"
            >
              ▶️
            </button>
          </div>
        </div>
        <div class="folder-video-info">
          <div class="video-name" :title="video.name">{{ video.name }}</div>
          <div class="video-actions">
            <button 
              class="action-button generate-thumbnail-btn" 
              @click.stop="handleGenerateThumbnail(video, index)"
              :disabled="video.isGeneratingThumbnail"
              :title="video.thumbnail ? '重新生成缩略图' : '生成缩略图'"
            >
              {{ video.isGeneratingThumbnail ? '⏳' : '📷' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-videos">
      <p>{{ $lt('该文件夹中没有找到视频文件') }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import type { FolderVideo } from '../../types/video'

export default {
  name: 'FolderVideosGrid',
  props: {
    videos: {
      type: Array as () => FolderVideo[],
      required: true
    },
    getThumbnailUrl: {
      type: Function,
      required: true
    },
    handleThumbnailError: {
      type: Function,
      required: true
    }
  },
  emits: ['play-video', 'generate-thumbnail'],
  methods: {
    handlePlayVideo(video: FolderVideo) {
      this.$emit('play-video', video)
    },
    handleGenerateThumbnail(video: FolderVideo, index: number) {
      this.$emit('generate-thumbnail', video, index)
    }
  }
}
</script>

<style scoped>
.folder-videos-section {
  margin-top: 20px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.folder-videos-section h4 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.folder-videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.folder-video-card {
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  cursor: pointer;
}

.folder-video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px var(--shadow-medium);
  border-color: var(--accent-color);
}

.folder-video-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
  background: var(--bg-secondary);
}

.folder-video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.folder-video-thumbnail.placeholder {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 48px;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.folder-video-card:hover .video-overlay {
  opacity: 1;
}

.overlay-action-button {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;
}

.overlay-action-button:hover {
  background: white;
  transform: scale(1.1);
}

.folder-video-info {
  padding: 12px;
}

.video-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-videos {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary);
}

.no-videos p {
  margin: 0;
  font-size: 14px;
}
</style>

