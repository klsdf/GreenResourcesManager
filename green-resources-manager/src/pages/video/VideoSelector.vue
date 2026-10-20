<template>
  <div class="video-selector">
    <div class="video-selector-header">
      <h4>{{ title }}</h4>
      <div class="selection-info">
        <span class="selected-count">{{ $lt('已选择') }} {{ selectedVideos.length }} {{ $lt('个视频') }}</span>
        <button 
          v-if="selectedVideos.length > 0" 
          @click="clearSelection" 
          class="btn-clear"
        > {{ $lt('清空选择') }} </button>
      </div>
    </div>
    
    <div class="video-grid">
      <div 
        v-for="video in videos" 
        :key="video.id"
        class="video-item"
        :class="{ 'selected': isSelected(video.id) }"
        @click="toggleSelection(video.id)"
      >
        <div class="video-thumbnail">
          <img 
            :src="getThumbnailUrl(video.thumbnail)" 
            :alt="video.name"
            @error="handleImageError"
          >
          <div class="selection-overlay">
            <div class="checkbox" :class="{ 'checked': isSelected(video.id) }">
              <span v-if="isSelected(video.id)" class="checkmark">✓</span>
            </div>
          </div>
        </div>
        <div class="video-info">
          <h5 class="video-title">{{ video.name }}</h5>
          <p v-if="video.series" class="video-series">{{ video.series }}</p>
          <p v-if="video.duration" class="video-duration">{{ formatDuration(video.duration) }}</p>
        </div>
      </div>
    </div>
    
    <div v-if="videos.length === 0" class="empty-state">
      <p>{{ $lt('没有可选择的视频') }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoSelector',
  props: {
    videos: {
      type: Array,
      default: () => []
    },
    selectedVideos: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: '选择视频'
    }
  },
  emits: ['update:selectedVideos'],
  methods: {
    isSelected(videoId) {
      return this.selectedVideos.includes(videoId)
    },
    
    toggleSelection(videoId) {
      const newSelection = [...this.selectedVideos]
      const index = newSelection.indexOf(videoId)
      
      if (index > -1) {
        newSelection.splice(index, 1)
      } else {
        newSelection.push(videoId)
      }
      
      this.$emit('update:selectedVideos', newSelection)
    },
    
    clearSelection() {
      this.$emit('update:selectedVideos', [])
    },
    
    getThumbnailUrl(thumbnail) {
      if (!thumbnail) {
        return './default-video.png'
      }
      
      // 处理不同类型的缩略图路径
      if (thumbnail.startsWith('data:')) {
        return thumbnail
      } else if (thumbnail.startsWith('http')) {
        return thumbnail
      } else {
        // 本地文件路径处理
        try {
          const normalized = thumbnail.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
          const encoded = normalized.split('/').map(seg => {
            if (seg.includes(':')) return seg
            return encodeURIComponent(seg)
          }).join('/')
          return 'file://' + encoded
        } catch (error) {
          console.error('转换缩略图路径失败:', error)
          return './default-video.png'
        }
      }
    },
    
    handleImageError(event) {
      event.target.src = './default-video.png'
    },
    
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return ''
      
      const totalSeconds = Math.floor(minutes * 60)
      const hours = Math.floor(totalSeconds / 3600)
      const mins = Math.floor((totalSeconds % 3600) / 60)
      const secs = totalSeconds % 60
      
      if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
    }
  }
}
</script>

<style scoped>
.video-selector {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  overflow: hidden;
}

.video-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.video-selector-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: var(--text-secondary);
  font-size: 14px;
}

.btn-clear {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-clear:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.video-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-item:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-medium);
}

.video-item.selected {
  border-color: var(--accent-color);
  background: var(--accent-color-10);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-item:hover .video-thumbnail img {
  transform: scale(1.05);
}

.selection-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.checkbox.checked {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.checkmark {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.video-info {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-series {
  margin: 0;
  font-size: 12px;
  color: var(--accent-color);
  font-weight: 500;
}

.video-duration {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 16px;
  }
  
  .video-thumbnail {
    height: 100px;
  }
  
  .video-selector-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
