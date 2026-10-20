<template>
  <div class="global-audio-player" v-if="currentAudio || playlist.length > 0">
    <!-- 播放器主体 -->
    <div class="player-main" v-if="!isHidden">
      <!-- 音频信息 -->
      <div class="audio-info">
        <div class="audio-thumbnail">
          <img v-if="currentAudio && currentAudio.coverPath" 
               :src="getThumbnailUrl(currentAudio.coverPath)" 
               :alt="currentAudio.name" 
               class="thumbnail-img">
          <div v-else class="thumbnail-icon">🎵</div>
        </div>
        <div class="audio-details">
          <h4 class="audio-title">{{ currentAudio ? currentAudio.name : '无音频' }}</h4>
          <p class="audio-artist">{{ currentAudio ? (currentAudio.artist || '未知艺术家') : '' }}</p>
        </div>
      </div>

      <!-- 播放控制 -->
      <div class="player-controls">
        <button class="control-btn" @click="previousTrack" :disabled="!canGoPrevious">
          <span class="btn-icon">⏮️</span>
        </button>
        <button class="control-btn play-btn" @click="togglePlayPause" :disabled="!currentAudio">
          <span class="btn-icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        </button>
        <button class="control-btn" @click="nextTrack" :disabled="!canGoNext">
          <span class="btn-icon">⏭️</span>
        </button>
        <button class="control-btn" @click="toggleShuffle" :class="{ active: isShuffled }">
          <span class="btn-icon">🔀</span>
        </button>
        <button class="control-btn" @click="toggleRepeat" :class="{ active: repeatMode !== 'none' }">
          <span class="btn-icon">{{ repeatIcon }}</span>
        </button>
      </div>

      <!-- 进度条 -->
      <div class="progress-section">
        <span class="time-display">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar" @click="seekTo">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            <div class="progress-handle" :style="{ left: progressPercentage + '%' }"></div>
          </div>
        </div>
        <span class="time-display">{{ formatTime(duration) }}</span>
      </div>

      <!-- 音量控制 -->
      <div class="volume-section">
        <button class="control-btn" @click="toggleMute">
          <span class="btn-icon">{{ isMuted ? '🔇' : '🔊' }}</span>
        </button>
        <div class="volume-bar" @click="setVolume">
          <div class="volume-track">
            <div class="volume-fill" :style="{ width: (isMuted ? 0 : volume) * 100 + '%' }"></div>
            <div class="volume-handle" :style="{ left: (isMuted ? 0 : volume) * 100 + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 播放列表按钮 -->
      <button class="control-btn playlist-btn" @click="togglePlaylist" :class="{ active: showPlaylist }">
        <span class="btn-icon">📋</span>
        <span class="playlist-count" v-if="playlist.length > 0">{{ playlist.length }}</span>
      </button>

      <!-- 隐藏按钮 -->
      <button class="control-btn hide-btn" @click="hidePlayer" :title="$lt('隐藏播放器')">
        <span class="btn-icon">⬇️</span>
      </button>
    </div>

    <!-- 播放列表 -->
    <div class="playlist-panel" v-if="showPlaylist && !isHidden">
      <div class="playlist-header">
        <h4>{{ $lt('播放列表') }}</h4>
        <button class="btn-close-playlist" @click="showPlaylist = false">×</button>
      </div>
      <div class="playlist-content">
        <div class="playlist-item" 
             v-for="(audio, index) in playlist" 
             :key="audio.id"
             :class="{ 
               'current': index === currentIndex,
               'playing': index === currentIndex && isPlaying
             }"
             @click="playTrack(index)">
          <div class="item-thumbnail">
            <img v-if="audio.coverPath" 
                 :src="getThumbnailUrl(audio.coverPath)" 
                 :alt="audio.name" 
                 class="item-thumbnail-img">
            <div v-else class="item-thumbnail-icon">🎵</div>
          </div>
          <div class="item-info">
            <div class="item-title">{{ audio.name }}</div>
            <div class="item-artist">{{ audio.artist || '未知艺术家' }}</div>
          </div>
          <div class="item-duration">{{ formatDuration(audio.duration) }}</div>
          <button class="btn-remove" @click.stop="removeFromPlaylist(index)" :title="$lt('从播放列表移除')">
            ×
          </button>
        </div>
        <div v-if="playlist.length === 0" class="empty-playlist">
          <p>{{ $lt('播放列表为空') }}</p>
        </div>
      </div>
    </div>

    <!-- 隐藏的音频元素 -->
    <audio 
      ref="audioElement"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onTrackEnded"
      @error="onAudioError"
      @canplay="onCanPlay"
      @waiting="onWaiting"
      @playing="onPlaying"
      @pause="onPause"
    ></audio>

    <!-- 显示按钮（当播放器隐藏时显示） -->
    <div class="show-player-btn" v-if="isHidden" @click="showPlayer">
      <div class="show-btn-content">
        <span class="show-btn-icon">🎵</span>
        <span class="show-btn-text" v-if="currentAudio">{{ currentAudio.name }}</span>
        <span class="show-btn-text" v-else>{{ $lt('音频播放器') }}</span>
        <span class="show-btn-arrow">⬆️</span>
      </div>
    </div>
  </div>
</template>

<script>
import { unlockAchievement } from '../pages/user/AchievementView.vue'
import { formatDuration } from '../utils/formatters'

export default {
  name: 'GlobalAudioPlayer',
  data() {
    return {
      // 播放状态
      isPlaying: false,
      isMuted: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      
      // 播放列表
      playlist: [],
      currentIndex: -1,
      
      // 播放模式
      isShuffled: false,
      repeatMode: 'none', // 'none', 'one', 'all'
      
      // UI状态
      showPlaylist: false,
      isHidden: false,
      
      // 当前音频
      currentAudio: null,
      
      // 事件监听器
      listeners: []
    }
  },
  computed: {
    canGoPrevious() {
      return this.playlist.length > 0 && (this.currentIndex > 0 || this.repeatMode === 'all')
    },
    canGoNext() {
      return this.playlist.length > 0 && (this.currentIndex < this.playlist.length - 1 || this.repeatMode === 'all')
    },
    progressPercentage() {
      return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0
    },
    repeatIcon() {
      switch (this.repeatMode) {
        case 'one': return '🔂'
        case 'all': return '🔁'
        default: return '🔁'
      }
    }
  },
  methods: {
    // 播放控制
    async playAudio(audio) {
      try {
        console.log('🎵 开始播放音频:', audio.name)
        
        // 如果音频不在播放列表中，添加到播放列表
        const existingIndex = this.playlist.findIndex(item => item.id === audio.id)
        if (existingIndex === -1) {
          this.addToPlaylist(audio)
          this.currentIndex = this.playlist.length - 1
        } else {
          this.currentIndex = existingIndex
        }
        
        this.currentAudio = audio
        await this.loadAndPlay()
        
        // 发送全局事件
        this.$emit('audio-started', audio)
        
      } catch (error) {
        console.error('播放音频失败:', error)
        this.showNotification('播放失败', `无法播放音频: ${audio.name}`)
      }
    },
    
    async loadAndPlay() {
      if (!this.currentAudio) return
      
      try {
        const audioElement = this.$refs.audioElement
        if (!audioElement) return
        
        // 获取音频URL
        const audioUrl = await this.getAudioUrl(this.currentAudio.filePath)
        audioElement.src = audioUrl
        
        // 设置音量
        audioElement.volume = this.isMuted ? 0 : this.volume
        
        // 等待音频加载
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            audioElement.removeEventListener('canplay', onCanPlay)
            audioElement.removeEventListener('error', onError)
            resolve()
          }
          
          const onError = (error) => {
            audioElement.removeEventListener('canplay', onCanPlay)
            audioElement.removeEventListener('error', onError)
            reject(error)
          }
          
          audioElement.addEventListener('canplay', onCanPlay)
          audioElement.addEventListener('error', onError)
          
          // 超时处理
          setTimeout(() => {
            audioElement.removeEventListener('canplay', onCanPlay)
            audioElement.removeEventListener('error', onError)
            reject(new Error('音频加载超时'))
          }, 10000)
        })
        
        // 开始播放
        await audioElement.play()
        this.isPlaying = true
        
        console.log('✅ 音频播放成功:', this.currentAudio.name)
        
        // 检查是否在半夜1点之后播放音乐，解锁"夜曲"成就
        this.checkNocturneAchievement()
        
      } catch (error) {
        console.error('加载或播放音频失败:', error)
        this.isPlaying = false
        throw error
      }
    },
    
    async togglePlayPause() {
      if (!this.currentAudio) return
      
      const audioElement = this.$refs.audioElement
      if (!audioElement) return
      
      try {
        if (this.isPlaying) {
          audioElement.pause()
        } else {
          if (audioElement.src) {
            await audioElement.play()
          } else {
            await this.loadAndPlay()
          }
        }
      } catch (error) {
        console.error('播放/暂停失败:', error)
      }
    },
    
    async previousTrack() {
      if (!this.canGoPrevious) return
      
      let newIndex = this.currentIndex - 1
      if (newIndex < 0 && this.repeatMode === 'all') {
        newIndex = this.playlist.length - 1
      }
      
      if (newIndex >= 0) {
        this.currentIndex = newIndex
        this.currentAudio = this.playlist[this.currentIndex]
        await this.loadAndPlay()
      }
    },
    
    async nextTrack() {
      if (!this.canGoNext) return
      
      let newIndex = this.currentIndex + 1
      if (newIndex >= this.playlist.length && this.repeatMode === 'all') {
        newIndex = 0
      }
      
      if (newIndex < this.playlist.length) {
        this.currentIndex = newIndex
        this.currentAudio = this.playlist[this.currentIndex]
        await this.loadAndPlay()
      }
    },
    
    async playTrack(index) {
      if (index < 0 || index >= this.playlist.length) return
      
      this.currentIndex = index
      this.currentAudio = this.playlist[index]
      await this.loadAndPlay()
    },
    
    // 播放列表管理
    addToPlaylist(audio) {
      // 检查是否已存在
      const exists = this.playlist.some(item => item.id === audio.id)
      if (!exists) {
        this.playlist.push(audio)
        console.log('📋 添加到播放列表:', audio.name)
      }
    },
    
    removeFromPlaylist(index) {
      if (index < 0 || index >= this.playlist.length) return
      
      const removedAudio = this.playlist[index]
      this.playlist.splice(index, 1)
      
      // 调整当前索引
      if (index < this.currentIndex) {
        this.currentIndex--
      } else if (index === this.currentIndex) {
        // 如果移除的是当前播放的音频
        if (this.playlist.length > 0) {
          this.currentIndex = Math.min(this.currentIndex, this.playlist.length - 1)
          this.currentAudio = this.playlist[this.currentIndex]
          this.loadAndPlay()
        } else {
          this.currentIndex = -1
          this.currentAudio = null
          this.isPlaying = false
          const audioElement = this.$refs.audioElement
          if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
          }
        }
      }
      
      console.log('🗑️ 从播放列表移除:', removedAudio.name)
    },
    
    clearPlaylist() {
      this.playlist = []
      this.currentIndex = -1
      this.currentAudio = null
      this.isPlaying = false
      const audioElement = this.$refs.audioElement
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
      console.log('🧹 清空播放列表')
    },
    
    // 播放模式
    toggleShuffle() {
      this.isShuffled = !this.isShuffled
      if (this.isShuffled) {
        this.shufflePlaylist()
      }
    },
    
    shufflePlaylist() {
      const currentAudio = this.currentAudio
      const shuffled = [...this.playlist]
      
      // Fisher-Yates 洗牌算法
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      
      // 保持当前播放的音频在第一位
      const currentIndex = shuffled.findIndex(item => item.id === currentAudio.id)
      if (currentIndex > 0) {
        [shuffled[0], shuffled[currentIndex]] = [shuffled[currentIndex], shuffled[0]]
        this.currentIndex = 0
      }
      
      this.playlist = shuffled
      console.log('🔀 播放列表已随机排序')
    },
    
    toggleRepeat() {
      const modes = ['none', 'one', 'all']
      const currentModeIndex = modes.indexOf(this.repeatMode)
      this.repeatMode = modes[(currentModeIndex + 1) % modes.length]
      console.log('🔁 重复模式:', this.repeatMode)
    },
    
    // 进度控制
    seekTo(event) {
      const audioElement = this.$refs.audioElement
      if (!audioElement || this.duration === 0) return
      
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * this.duration
      
      audioElement.currentTime = newTime
      this.currentTime = newTime
    },
    
    setVolume(event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      
      this.volume = percentage
      this.isMuted = false
      
      const audioElement = this.$refs.audioElement
      if (audioElement) {
        audioElement.volume = this.volume
      }
    },
    
    toggleMute() {
      this.isMuted = !this.isMuted
      const audioElement = this.$refs.audioElement
      if (audioElement) {
        audioElement.volume = this.isMuted ? 0 : this.volume
      }
    },
    
    // UI控制
    togglePlaylist() {
      this.showPlaylist = !this.showPlaylist
    },
    
    hidePlayer() {
      this.isHidden = true
      this.showPlaylist = false
      console.log('🎵 播放器已隐藏')
    },
    
    showPlayer() {
      this.isHidden = false
      console.log('🎵 播放器已显示')
    },
    
    // 音频事件处理
    onLoadedMetadata() {
      const audioElement = this.$refs.audioElement
      if (audioElement) {
        this.duration = audioElement.duration || 0
        console.log('📊 音频元数据加载完成，时长:', this.formatTime(this.duration))
      }
    },
    
    onTimeUpdate() {
      const audioElement = this.$refs.audioElement
      if (audioElement) {
        this.currentTime = audioElement.currentTime || 0
      }
    },
    
    async onTrackEnded() {
      console.log('🏁 音频播放结束')
      
      if (this.repeatMode === 'one') {
        // 单曲循环
        const audioElement = this.$refs.audioElement
        if (audioElement) {
          audioElement.currentTime = 0
          await audioElement.play()
        }
      } else if (this.repeatMode === 'all' || this.currentIndex < this.playlist.length - 1) {
        // 列表循环或还有下一首
        await this.nextTrack()
      } else {
        // 播放结束
        this.isPlaying = false
        this.$emit('playlist-ended')
      }
    },
    
    onAudioError(event) {
      console.error('❌ 音频播放错误:', event)
      this.isPlaying = false
      this.showNotification('播放错误', `无法播放音频: ${this.currentAudio ? this.currentAudio.name : '未知'}`)
    },
    
    onCanPlay() {
      console.log('✅ 音频可以播放')
    },
    
    onWaiting() {
      console.log('⏳ 音频缓冲中...')
    },
    
    onPlaying() {
      this.isPlaying = true
      console.log('▶️ 音频开始播放')
    },
    
    onPause() {
      this.isPlaying = false
      console.log('⏸️ 音频暂停')
    },
    
    // 工具方法
    async getAudioUrl(filePath) {
      if (!filePath) return ''
      
      try {
        // 优先尝试使用 readFileAsDataUrl 方法
        if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          const result = await window.electronAPI.readFileAsDataUrl(filePath)
          if (result.success) {
            return result.dataUrl
          }
        }
        
        // 降级到 getFileUrl 方法
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          const result = await window.electronAPI.getFileUrl(filePath)
          if (result.success) {
            return result.url
          }
        }
        
        // 最后的降级处理
        return filePath.startsWith('file://') ? filePath : `file://${filePath}`
        
      } catch (error) {
        console.error('获取音频URL失败:', error)
        return filePath.startsWith('file://') ? filePath : `file://${filePath}`
      }
    },
    
    getThumbnailUrl(thumbnailPath) {
      if (!thumbnailPath) return ''
      if (window.electronAPI && window.electronAPI.getFileUrl) {
        return window.electronAPI.getFileUrl(thumbnailPath)
      }
      return thumbnailPath.startsWith('file://') ? thumbnailPath : `file://${thumbnailPath}`
    },
    
    formatTime(seconds) {
      return formatDuration(seconds, '0:00')
    },
    
    formatDuration(seconds) {
      return this.formatTime(seconds)
    },
    
    showNotification(title, message) {
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(title, message)
      } else if (Notification.permission === 'granted') {
        new Notification(title, { body: message })
      }
    },
    
    // 检查并解锁"夜曲"成就
    async checkNocturneAchievement() {
      try {
        const now = new Date()
        const currentHour = now.getHours()
        
        // 检查是否在半夜1点之后（1:00-23:59，即凌晨1点到晚上11点59分）
        // 通常"半夜1点之后"指的是凌晨1点到早上某个时间，这里理解为1:00-6:00
        // 但用户说"半夜1点之后"，更可能是1:00-5:59（凌晨1点到早上6点前）
        if (currentHour >= 1 && currentHour < 6) {
          console.log('🌙 检测到在半夜1点之后播放音乐，尝试解锁"夜曲"成就')
          await unlockAchievement('nocturne')
        }
      } catch (error) {
        console.error('检查夜曲成就失败:', error)
      }
    }
  },
  
  mounted() {
    // 设置初始音量
    const audioElement = this.$refs.audioElement
    if (audioElement) {
      audioElement.volume = this.volume
    }
    
    // 监听全局事件
    this.listeners = [
      { event: 'global-play-audio', handler: (event) => this.playAudio(event.detail) },
      { event: 'global-add-to-playlist', handler: (event) => this.addToPlaylist(event.detail) },
      { event: 'global-clear-playlist', handler: () => this.clearPlaylist() }
    ]
    
    this.listeners.forEach(({ event, handler }) => {
      window.addEventListener(event, handler)
    })
    
    console.log('🎵 全局音频播放器已初始化')
  },
  
  beforeUnmount() {
    // 清理事件监听器
    this.listeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler)
    })
    
    // 停止播放
    const audioElement = this.$refs.audioElement
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
    }
    
    console.log('🎵 全局音频播放器已销毁')
  }
}
</script>

<style scoped>
/* 全局音频播放器样式已移至全局样式文件 */

.player-main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 音频信息 */
.audio-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  flex-shrink: 0;
}

.audio-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-icon {
  font-size: 1.2rem;
  color: white;
}

.audio-details {
  min-width: 0;
  flex: 1;
}

.audio-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 播放控制 */
.player-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.control-btn {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-primary);
  position: relative;
}

.control-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.active {
  background: var(--accent-color);
  color: white;
}

.play-btn {
  background: var(--accent-color);
  color: white;
  padding: 10px;
}

.play-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-icon {
  font-size: 1rem;
  line-height: 1;
}

/* 进度条 */
.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 200px;
}

.time-display {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  min-width: 40px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.progress-bar:hover .progress-handle {
  opacity: 1;
}

/* 音量控制 */
.volume-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  flex-shrink: 0;
}

.volume-bar {
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.volume-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.volume-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.volume-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.volume-bar:hover .volume-handle {
  opacity: 1;
}

/* 播放列表按钮 */
.playlist-btn {
  position: relative;
}

.playlist-count {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--accent-color);
  color: white;
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
  line-height: 1;
}

/* 隐藏按钮 */
.hide-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hide-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

/* 显示播放器按钮 */
.show-player-btn {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1001;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.show-player-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-50%) scale(1.05);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
}

.show-btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.show-btn-icon {
  font-size: 1.2rem;
}

.show-btn-text {
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.show-btn-arrow {
  font-size: 1rem;
  opacity: 0.7;
}

/* 暗色主题下的显示按钮 */
[data-theme="dark"] .show-player-btn,
[data-theme="night"] .show-player-btn,
[data-theme="night-ink"] .show-player-btn {
  background: rgba(42, 71, 94, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .show-player-btn:hover,
[data-theme="night"] .show-player-btn:hover,
[data-theme="night-ink"] .show-player-btn:hover {
  background: rgba(42, 71, 94, 0.5);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

/* 浮世绘主题下的显示按钮 */
[data-theme="ukiyoe"] .show-player-btn {
  background: rgba(255, 248, 240, 0.2);
  border: 1px solid rgba(211, 47, 47, 0.3);
  box-shadow: 0 4px 20px rgba(211, 47, 47, 0.2);
}

[data-theme="ukiyoe"] .show-player-btn:hover {
  background: rgba(255, 248, 240, 0.3);
  box-shadow: 0 6px 25px rgba(211, 47, 47, 0.3);
}

/* 中国古风主题下的显示按钮 */
[data-theme="chinese"] .show-player-btn {
  background: rgba(231, 226, 220, 0.2);
  border: 1px solid rgba(198, 73, 58, 0.3);
  box-shadow: 0 4px 20px rgba(198, 73, 58, 0.2);
}

[data-theme="chinese"] .show-player-btn:hover {
  background: rgba(231, 226, 220, 0.3);
  box-shadow: 0 6px 25px rgba(198, 73, 58, 0.3);
}

/* 森林主题下的显示按钮 */
[data-theme="forest"] .show-player-btn {
  background: rgba(232, 245, 232, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.2);
}

[data-theme="forest"] .show-player-btn:hover {
  background: rgba(232, 245, 232, 0.3);
  box-shadow: 0 6px 25px rgba(76, 175, 80, 0.3);
}

/* 海洋主题下的显示按钮 */
[data-theme="ocean"] .show-player-btn {
  background: rgba(225, 245, 254, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.3);
  box-shadow: 0 4px 20px rgba(33, 150, 243, 0.2);
}

[data-theme="ocean"] .show-player-btn:hover {
  background: rgba(225, 245, 254, 0.3);
  box-shadow: 0 6px 25px rgba(33, 150, 243, 0.3);
}

/* 播放列表面板 */
.playlist-panel {
  position: absolute;
  bottom: 100%;
  right: 20px;
  width: 350px;
  max-height: 400px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -4px 20px var(--shadow-medium);
  overflow: hidden;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.playlist-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.btn-close-playlist {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close-playlist:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.playlist-content {
  max-height: 300px;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.playlist-item:hover {
  background: var(--bg-tertiary);
}

.playlist-item.current {
  background: var(--accent-color);
  color: white;
}

.playlist-item.playing {
  background: var(--accent-hover);
  color: white;
}

.item-thumbnail {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumbnail-icon {
  font-size: 0.9rem;
  color: white;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-artist {
  font-size: 0.75rem;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-duration {
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  opacity: 0.8;
  flex-shrink: 0;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1;
  transition: all 0.2s ease;
  opacity: 0;
}

.playlist-item:hover .btn-remove {
  opacity: 1;
}

.btn-remove:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.playlist-item.current .btn-remove,
.playlist-item.playing .btn-remove {
  color: white;
  opacity: 0.8;
}

.playlist-item.current .btn-remove:hover,
.playlist-item.playing .btn-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

.empty-playlist {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-playlist p {
  margin: 0;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .player-main {
    padding: 10px 15px;
    gap: 15px;
  }
  
  .audio-info {
    min-width: 150px;
  }
  
  .audio-thumbnail {
    width: 32px;
    height: 32px;
  }
  
  .audio-title {
    font-size: 0.8rem;
  }
  
  .audio-artist {
    font-size: 0.75rem;
  }
  
  .progress-section {
    min-width: 120px;
  }
  
  .volume-section {
    min-width: 80px;
  }
  
  .playlist-panel {
    right: 10px;
    width: calc(100vw - 20px);
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .player-main {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .audio-info {
    order: 1;
    flex: 1;
    min-width: 0;
  }
  
  .player-controls {
    order: 2;
  }
  
  .progress-section {
    order: 3;
    flex: 1;
    min-width: 0;
  }
  
  .volume-section {
    order: 4;
    min-width: 60px;
  }
  
  .playlist-btn {
    order: 5;
  }
  
  .show-player-btn {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    width: auto;
  }
  
  .show-btn-text {
    max-width: 150px;
  }
}
</style>
