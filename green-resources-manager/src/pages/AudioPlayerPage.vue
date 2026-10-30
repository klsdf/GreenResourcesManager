<template>
  <div class="music-player">
    <div class="mp-backdrop" :style="backdropStyle"></div>
    <div class="mp-backdrop-tint"></div>

    <div class="mp-layout">
      <!-- 左侧播放列表 -->
      <aside class="mp-sidebar">
        <div class="mp-sidebar-head">
          <div class="mp-sidebar-title">
            <span class="mp-sidebar-mark">♪</span>
            <span>{{ $lt('播放列表') }}</span>
            <em>{{ playlist.length }}</em>
          </div>
          <button class="mp-icon-btn" :title="$lt('关闭标签页')" @click="closeTab">✕</button>
        </div>

        <label class="mp-search">
          <span class="mp-search-icon">⌕</span>
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="$lt('搜索歌曲、艺术家')"
            spellcheck="false"
          />
          <button v-if="searchKeyword" class="mp-search-clear" @click.prevent="searchKeyword = ''">×</button>
        </label>

        <div v-if="filteredPlaylist.length" class="mp-list">
          <div
            v-for="(track, index) in filteredPlaylist"
            :key="track.id + track.path"
            class="mp-list-item"
            :class="{ active: track.id === currentTrack?.id }"
            @click="playFromFiltered(index)"
          >
            <span class="mp-list-index">
              <span v-if="track.id === currentTrack?.id" class="mp-bars" :class="{ paused: !isPlaying }">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="mp-list-thumb" :style="fallbackCoverStyle(track)">♪</span>
            <span class="mp-list-info">
              <span class="mp-list-name">{{ track.name }}</span>
              <span class="mp-list-artist">{{ track.artist }}</span>
            </span>
            <span class="mp-list-duration">{{ formatTime(track.duration) }}</span>
            <button
              type="button"
              class="mp-list-remove"
              :title="$lt('从播放列表移除')"
              @click.stop="removeTrack(track)"
            >×</button>
          </div>
        </div>

        <div v-else class="mp-empty">
          <div class="mp-empty-icon">♪</div>
          <p>{{ searchKeyword ? $lt('没有找到匹配的歌曲') : $lt('播放列表是空的') }}</p>
        </div>

        <div class="mp-sidebar-foot">
          <span>{{ $lf('共 {n} 首', { n: playlist.length }) }}</span>
          <span v-if="totalDuration > 0">{{ $lt('总时长') }} {{ formatTime(totalDuration) }}</span>
        </div>
      </aside>

      <!-- 右侧播放展示 -->
      <main class="mp-main">
        <header class="mp-topbar">
          <div class="mp-topbar-left">
            <span class="mp-pill">{{ $lt('本地音乐') }}</span>
            <span class="mp-topbar-sub">{{ $lt('正在播放') }}</span>
          </div>
          <div class="mp-topbar-right">
            <button
              class="mp-ghost-btn"
              :disabled="!currentTrack"
              :title="$lt('在文件夹中显示')"
              @click="openFolder"
            >📁</button>
            <button class="mp-ghost-btn" :title="$lt('关闭标签页')" @click="closeTab">✕</button>
          </div>
        </header>

        <section class="mp-stage">
          <div class="mp-cover-area">
            <div class="mp-glow" :style="glowStyle"></div>
            <div class="mp-cover" :class="{ 'is-playing': isPlaying }" :style="fallbackCoverStyle(currentTrack)">
              <img v-if="coverUrl" :src="coverUrl" alt="" />
              <div v-else class="mp-cover-fallback">
                <span class="mp-cover-note">♪</span>
                <span class="mp-cover-letter">{{ currentTrack ? currentTrack.name.slice(0, 1) : '♫' }}</span>
              </div>
            </div>
            <div class="mp-cover-shadow"></div>
          </div>

          <div class="mp-info">
            <div class="mp-kicker">
              <span class="mp-kicker-dot" :class="{ playing: isPlaying }"></span>
              {{ $lt('正在播放') }}
            </div>
            <h1 class="mp-title" :title="currentTrack ? currentTrack.name : ''">
              {{ currentTrack ? currentTrack.name : $lt('未选择歌曲') }}
            </h1>
            <p class="mp-artist">
              {{ currentTrack ? currentTrack.artist : $lt('从左侧播放列表选择一首歌') }}
            </p>

            <div v-if="currentTrack" class="mp-chips">
              <span v-if="currentTrack.duration" class="mp-chip">{{ formatTime(currentTrack.duration) }}</span>
              <span v-if="currentTrack.playCount" class="mp-chip">
                {{ $lf('播放 {n} 次', { n: currentTrack.playCount }) }}
              </span>
              <span v-for="tag in currentTrack.tags.slice(0, 4)" :key="tag" class="mp-chip mp-chip-tag">
                # {{ tag }}
              </span>
            </div>

            <p v-if="currentTrack && currentTrack.description && !lyrics.length" class="mp-desc">
              {{ currentTrack.description }}
            </p>

            <div v-if="currentTrack" class="mp-meta-card">
              <div v-if="currentTrack.actors.length" class="mp-meta-row">
                <span class="mp-meta-label">{{ $lt('演员') }}</span>
                <span class="mp-meta-value">{{ currentTrack.actors.join(' / ') }}</span>
              </div>
              <div v-if="currentTrack.addedDate" class="mp-meta-row">
                <span class="mp-meta-label">{{ $lt('添加时间') }}</span>
                <span class="mp-meta-value">{{ formatDate(currentTrack.addedDate) }}</span>
              </div>
              <div class="mp-meta-row">
                <span class="mp-meta-label">{{ $lt('文件位置') }}</span>
                <span class="mp-meta-value mp-path" :title="currentTrack.path">{{ currentTrack.path }}</span>
              </div>
            </div>

            <div v-if="lyrics.length" class="mp-lyrics">
              <div class="mp-lyrics-head">
                <span class="mp-lyrics-title">{{ $lt('歌词') }}</span>
                <span class="mp-lyrics-count">{{ $lf('{n} 行', { n: lyrics.length }) }}</span>
              </div>
              <div ref="lyricsScroll" class="mp-lyrics-scroll">
                <p
                  v-for="(line, index) in lyrics"
                  :key="`${index}-${line.time}`"
                  class="mp-lyric-line"
                  :class="{ active: index === lyricIndex, past: index < lyricIndex }"
                  @click="seekToLyric(line)"
                >{{ line.text || '·' }}</p>
              </div>
            </div>
          </div>
        </section>

        <div v-if="errorMessage" class="mp-error" @click="errorMessage = ''">
          {{ errorMessage }}
        </div>
      </main>
    </div>

    <!-- 底部播放控制栏 -->
    <footer class="mp-bar">
      <div class="mp-bar-track">
        <div class="mp-mini-cover" :style="fallbackCoverStyle(currentTrack)">
          <img v-if="coverUrl" :src="coverUrl" alt="" />
          <span v-else>♪</span>
        </div>
        <div class="mp-mini-info">
          <div class="mp-mini-name">{{ currentTrack ? currentTrack.name : $lt('未选择歌曲') }}</div>
          <div class="mp-mini-artist">{{ currentTrack ? currentTrack.artist : '' }}</div>
        </div>
      </div>

      <div class="mp-bar-center">
        <div class="mp-controls">
          <button
            class="mp-icon-btn mp-mode"
            :class="{ active: mode !== 'loop' }"
            :title="modeTitle"
            @click="cycleMode"
          >{{ modeIcon }}</button>
          <button
            class="mp-icon-btn"
            :disabled="!canPrevious"
            :title="$lt('上一首')"
            @click="playPrevious"
          >⏮</button>
          <button
            class="mp-play-btn"
            :disabled="!currentTrack"
            :title="isPlaying ? $lt('暂停') : $lt('播放')"
            @click="togglePlay"
          >
            <span v-if="isPlaying">⏸</span>
            <span v-else>▶</span>
          </button>
          <button
            class="mp-icon-btn"
            :disabled="!canNext"
            :title="$lt('下一首')"
            @click="playNext()"
          >⏭</button>
          <button
            class="mp-icon-btn"
            :title="isMuted ? $lt('取消静音') : $lt('静音')"
            @click="toggleMute"
          >{{ isMuted ? '🔇' : (volume > 0.5 ? '🔊' : '🔉') }}</button>
        </div>

        <div class="mp-progress-row">
          <span class="mp-time">{{ formatTime(currentTime) }}</span>
          <input
            class="mp-range"
            type="range"
            min="0"
            :max="duration > 0 ? duration : 0"
            step="0.1"
            :value="currentTime"
            :disabled="!duration"
            :style="progressStyle"
            @input="onSeek"
          />
          <span class="mp-time">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="mp-bar-side">
        <div class="mp-volume">
          <span class="mp-volume-icon">🔊</span>
          <input
            class="mp-range mp-volume-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="isMuted ? 0 : volume"
            :style="volumeStyle"
            @input="onVolume"
          />
        </div>
        <button class="mp-ghost-btn" :title="$lt('关闭标签页')" @click="closeTab">✕</button>
      </div>
    </footer>

    <audio
      ref="audio"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onEnded"
      @error="onAudioError"
    ></audio>
  </div>
</template>

<script>
import { formatDuration } from '../utils/formatters'
import { findActiveLyricIndex, parseLrc } from '../utils/lrc'
import { lt } from '../locales/lt'
import { loadAudioPlaylist, resolvePlaybackQueue, saveAudioPlaylist } from '../utils/audioPlaylist.ts'

const VOLUME_STORAGE_KEY = 'grm-music-volume'
const MODE_STORAGE_KEY = 'grm-music-mode'
const PLAY_MODES = ['loop', 'one', 'shuffle']

/**
 * 独立音乐播放器标签页
 * 从页面 URL 接收当前要播的歌。
 * 播放列表只包含已经添加的歌；点播放的那首如果不在列表里，就只播这一首。
 */
export default {
  name: 'AudioPlayerPage',
  data() {
    return {
      playlist: [],
      currentIndex: -1,
      searchKeyword: '',
      isPlaying: false,
      isMuted: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      mode: 'loop',
      coverUrl: '',
      errorMessage: '',
      initialPath: '',
      initialId: '',
      initialTitle: '',
      pageId: 'audio',
      lyrics: [],
      lyricIndex: -1,
      lyricToken: 0,
      coverCache: {},
      /** 快速切歌时用来丢弃已经过期的异步加载结果 */
      loadToken: 0,
      /** 当前列表是读者存下来的播放列表。临时单曲不写回，避免把存好的列表清掉。 */
      usingSavedPlaylist: false,
      removeKeydownListener: null
    }
  },
  computed: {
    currentTrack() {
      return this.playlist[this.currentIndex] || null
    },
    filteredPlaylist() {
      const keyword = this.searchKeyword.trim().toLowerCase()
      if (!keyword) return this.playlist
      return this.playlist.filter((track) => {
        return track.name.toLowerCase().includes(keyword) ||
          track.artist.toLowerCase().includes(keyword)
      })
    },
    canPrevious() {
      return this.playlist.length > 1
    },
    canNext() {
      return this.playlist.length > 1
    },
    totalDuration() {
      return this.playlist.reduce((sum, track) => sum + (Number(track.duration) || 0), 0)
    },
    progressStyle() {
      const percent = this.duration > 0 ? Math.min(100, (this.currentTime / this.duration) * 100) : 0
      return { '--mp-progress': `${percent}%` }
    },
    volumeStyle() {
      const level = this.isMuted ? 0 : this.volume
      return { '--mp-progress': `${Math.min(100, level * 100)}%` }
    },
    modeIcon() {
      if (this.mode === 'one') return '🔂'
      if (this.mode === 'shuffle') return '🔀'
      return '🔁'
    },
    modeTitle() {
      if (this.mode === 'one') return lt('单曲循环')
      if (this.mode === 'shuffle') return lt('随机播放')
      return lt('列表循环')
    },
    palette() {
      return this.colorsFor(this.currentTrack)
    },
    glowStyle() {
      return {
        background: `radial-gradient(circle at 35% 35%, hsl(${this.palette.hueA} 80% 62% / 0.75), transparent 62%), radial-gradient(circle at 70% 70%, hsl(${this.palette.hueB} 75% 50% / 0.55), transparent 60%)`
      }
    },
    backdropStyle() {
      if (this.coverUrl) {
        return {
          backgroundImage: `url("${this.coverUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      }
      return {
        backgroundImage: `linear-gradient(135deg, hsl(${this.palette.hueA} 70% 60%), hsl(${this.palette.hueB} 75% 45%))`
      }
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    this.initialPath = params.get('path') || ''
    this.initialId = params.get('id') || ''
    this.initialTitle = params.get('title') || ''
    this.pageId = params.get('pageId') || 'audio'

    const savedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
      this.volume = savedVolume
    }
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY)
    if (PLAY_MODES.includes(savedMode)) {
      this.mode = savedMode
    }

    this.removeKeydownListener = this.bindKeyboard()
    await this.loadPlaylist()

    if (this.playlist.length > 0) {
      await this.loadCurrent(Boolean(this.initialPath))
    }
  },
  beforeUnmount() {
    if (this.removeKeydownListener) {
      this.removeKeydownListener()
      this.removeKeydownListener = null
    }
    const audio = this.$refs.audio
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  },
  methods: {
    async loadPlaylist() {
      const clicked = await this.findClickedTrack()
      const saved = await loadAudioPlaylist()
      const queue = resolvePlaybackQueue(saved, clicked)
      this.playlist = queue.tracks.map((track) => this.normalizeTrack(track))
      this.currentIndex = queue.startIndex
      this.usingSavedPlaylist = queue.fromSaved && queue.tracks.length > 0
    },

    /**
     * 找出这次点开的那一首，补上资料库里的艺术家和封面。
     * 只取匹配的这一条，不用整页音频充当播放列表。
     * @returns 点开的歌。没有路径时是 null
     */
    async findClickedTrack() {
      if (!this.initialPath && !this.initialId) return null
      const fallback = this.normalizeTrack({
        id: this.initialId,
        name: this.initialTitle || fileNameOf(this.initialPath),
        resourcePath: this.initialPath
      })
      const pageIds = [this.pageId, 'audio'].filter((id, index, list) => id && list.indexOf(id) === index)
      if (window.electronAPI?.sqliteGetPageData) {
        for (const pageId of pageIds) {
          try {
            const result = await window.electronAPI.sqliteGetPageData(pageId)
            if (!result?.ok || !Array.isArray(result.data)) continue
            const match = result.data.find((item) => this.isClickedResource(item))
            if (match) {
              const track = this.normalizeTrack(match)
              if (track.path) return track
            }
          } catch (error) {
            console.warn('[AudioPlayerPage] 读取当前音频失败:', pageId, error)
          }
        }
      }
      return fallback.path ? fallback : null
    },

    /**
     * 页面数据里的这一条是不是这次点开的歌。
     * @param item 资料库里的一条音频
     * @returns 编号或路径对上时为真
     */
    isClickedResource(item) {
      const id = String(item?.id || '')
      if (this.initialId && id === this.initialId) return true
      const path = String(item?.resourcePath || item?.filePath || '').replace(/\\/g, '/').toLowerCase()
      const wanted = this.initialPath.replace(/\\/g, '/').toLowerCase()
      return Boolean(wanted) && path === wanted
    },

    normalizeTrack(item) {
      const path = String(item.resourcePath || item.filePath || item.path || '')
      const fallbackName = path.split(/[\\/]/).pop() || lt('未知音频')
      return {
        id: String(item.id || path || fallbackName),
        name: String(item.name || fallbackName),
        artist: String(item.artist || lt('未知艺术家')),
        path,
        coverPath: String(item.coverPath || ''),
        duration: Number(item.duration) || 0,
        description: String(item.description || ''),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        actors: Array.isArray(item.actors) ? item.actors.map(String) : [],
        playCount: Array.isArray(item.visitedSessions) ? item.visitedSessions.length : 0,
        addedDate: String(item.addedDate || '')
      }
    },

    async loadCurrent(autoplay) {
      const track = this.currentTrack
      const audio = this.$refs.audio
      if (!track || !audio) return

      const token = ++this.loadToken
      this.errorMessage = ''
      this.currentTime = 0
      this.duration = track.duration || 0
      this.coverUrl = ''
      this.resolveCover(track, token)
      this.loadLyrics(track)
      document.title = track.name

      try {
        const source = await this.resolveAudioUrl(track.path)
        if (token !== this.loadToken) return
        if (!source) {
          this.errorMessage = lt('音频文件路径不存在')
          return
        }
        audio.src = source
        audio.volume = this.isMuted ? 0 : this.volume
        audio.load()
        if (autoplay) {
          try {
            await audio.play()
          } catch (error) {
            console.warn('[AudioPlayerPage] 自动播放被拦截或失败:', error)
            this.isPlaying = false
          }
        }
      } catch (error) {
        console.error('[AudioPlayerPage] 加载音频失败:', error)
        if (token === this.loadToken) {
          this.errorMessage = `${lt('无法播放')}：${track.name}`
        }
      }
    },

    async resolveAudioUrl(filePath) {
      if (!filePath) return ''
      if (window.electronAPI?.getFileUrl) {
        const result = await window.electronAPI.getFileUrl(filePath)
        if (result?.success && result.url) return result.url
        if (result && !result.success) return ''
      }
      return toFileUrl(filePath)
    },

    async resolveCover(track, token) {
      if (!track.coverPath) return
      if (this.coverCache[track.coverPath] !== undefined) {
        if (token === this.loadToken) this.coverUrl = this.coverCache[track.coverPath]
        return
      }
      if (!window.electronAPI?.readFileAsDataUrl) return
      try {
        const result = await window.electronAPI.readFileAsDataUrl(track.coverPath)
        const dataUrl = typeof result === 'string' ? result : (result?.dataUrl || result?.data || '')
        this.coverCache[track.coverPath] = dataUrl || ''
        if (token === this.loadToken && dataUrl) {
          this.coverUrl = dataUrl
        }
      } catch (error) {
        console.warn('[AudioPlayerPage] 读取封面失败:', error)
      }
    },

    async loadLyrics(track) {
      const token = ++this.lyricToken
      this.lyrics = []
      this.lyricIndex = -1
      if (!track?.path || !window.electronAPI?.readAudioLyrics) return
      try {
        const result = await window.electronAPI.readAudioLyrics(track.path)
        if (token !== this.lyricToken) return
        if (!result?.success || !result.content) return
        this.lyrics = parseLrc(result.content)
        this.lyricIndex = findActiveLyricIndex(this.lyrics, this.currentTime)
        this.$nextTick(() => this.scrollLyricToActive(false))
      } catch (error) {
        console.warn('[AudioPlayerPage] 读取歌词失败:', error)
      }
    },

    updateLyricIndex() {
      if (this.lyrics.length === 0) return
      const index = findActiveLyricIndex(this.lyrics, this.currentTime)
      if (index === this.lyricIndex) return
      this.lyricIndex = index
      this.$nextTick(() => this.scrollLyricToActive(true))
    },

    scrollLyricToActive(smooth) {
      const box = this.$refs.lyricsScroll
      if (!box) return
      const line = box.querySelector('.mp-lyric-line.active')
      if (!line) return
      const top = line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2
      box.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
    },

    seekToLyric(line) {
      const audio = this.$refs.audio
      if (!audio || !line || !Number.isFinite(line.time)) return
      audio.currentTime = line.time
      this.currentTime = line.time
      this.updateLyricIndex()
    },

    playFromFiltered(filteredIndex) {
      const track = this.filteredPlaylist[filteredIndex]
      if (!track) return
      const realIndex = this.playlist.indexOf(track)
      if (realIndex === -1) return
      if (realIndex === this.currentIndex) {
        this.togglePlay()
        return
      }
      this.currentIndex = realIndex
      this.loadCurrent(true)
    },

    togglePlay() {
      const audio = this.$refs.audio
      if (!audio || !this.currentTrack) return
      if (audio.paused) {
        if (!audio.src) {
          this.loadCurrent(true)
          return
        }
        audio.play().catch((error) => {
          console.error('[AudioPlayerPage] 播放失败:', error)
          this.errorMessage = `${lt('无法播放')}：${this.currentTrack.name}`
        })
      } else {
        audio.pause()
      }
    },

    playNext() {
      if (this.playlist.length === 0) return
      if (this.mode === 'shuffle') {
        this.currentIndex = this.randomIndex()
      } else {
        const nextIndex = this.currentIndex + 1
        this.currentIndex = nextIndex >= this.playlist.length ? 0 : nextIndex
      }
      this.loadCurrent(true)
    },

    playPrevious() {
      if (this.playlist.length === 0) return
      const audio = this.$refs.audio
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0
        this.currentTime = 0
        return
      }
      if (this.mode === 'shuffle') {
        this.currentIndex = this.randomIndex()
      } else {
        this.currentIndex = this.currentIndex - 1 < 0 ? this.playlist.length - 1 : this.currentIndex - 1
      }
      this.loadCurrent(true)
    },

    randomIndex() {
      if (this.playlist.length <= 1) return 0
      let index = this.currentIndex
      while (index === this.currentIndex) {
        index = Math.floor(Math.random() * this.playlist.length)
      }
      return index
    },

    onEnded() {
      if (this.mode === 'one') {
        const audio = this.$refs.audio
        if (audio) {
          audio.currentTime = 0
          audio.play().catch(() => {})
        }
        return
      }
      this.playNext()
    },

    onLoadedMetadata() {
      const audio = this.$refs.audio
      if (!audio) return
      const loadedDuration = Number(audio.duration)
      if (Number.isFinite(loadedDuration) && loadedDuration > 0) {
        this.duration = loadedDuration
      }
    },

    onTimeUpdate() {
      const audio = this.$refs.audio
      if (audio) this.currentTime = audio.currentTime || 0
      this.updateLyricIndex()
    },

    onSeek(event) {
      const audio = this.$refs.audio
      const value = Number(event.target.value)
      if (!audio || !Number.isFinite(value)) return
      audio.currentTime = value
      this.currentTime = value
      this.updateLyricIndex()
    },

    onVolume(event) {
      const value = Number(event.target.value)
      if (!Number.isFinite(value)) return
      this.volume = Math.min(1, Math.max(0, value))
      this.isMuted = this.volume === 0
      this.applyVolume()
      localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume))
    },

    toggleMute() {
      this.isMuted = !this.isMuted
      this.applyVolume()
    },

    applyVolume() {
      const audio = this.$refs.audio
      if (audio) audio.volume = this.isMuted ? 0 : this.volume
    },

    cycleMode() {
      const index = PLAY_MODES.indexOf(this.mode)
      this.mode = PLAY_MODES[(index + 1) % PLAY_MODES.length]
      localStorage.setItem(MODE_STORAGE_KEY, this.mode)
    },

    onAudioError() {
      this.isPlaying = false
      if (this.currentTrack) {
        this.errorMessage = `${lt('无法播放')}：${this.currentTrack.name}`
      }
    },

    /**
     * 从当前列表拿掉一首歌。
     * 这份列表是存下来的播放列表时，删除会写回去。只是临时播放的那一首则不动已保存的列表。
     * @param track 要移除的歌
     */
    async removeTrack(track) {
      const index = this.playlist.findIndex((item) => item.id === track.id && item.path === track.path)
      if (index < 0) return
      const removingCurrent = index === this.currentIndex
      this.playlist.splice(index, 1)
      if (this.usingSavedPlaylist) {
        const saved = await saveAudioPlaylist(this.playlist)
        if (!saved) {
          this.errorMessage = lt('保存播放列表失败')
        }
      }
      if (this.playlist.length === 0) {
        this.currentIndex = -1
        this.usingSavedPlaylist = false
        this.isPlaying = false
        const audio = this.$refs.audio
        if (audio) {
          audio.pause()
          audio.removeAttribute('src')
          audio.load()
        }
        return
      }
      if (index < this.currentIndex) {
        this.currentIndex -= 1
      } else if (removingCurrent) {
        this.currentIndex = Math.min(index, this.playlist.length - 1)
        await this.loadCurrent(true)
      }
    },

    async openFolder() {
      if (!this.currentTrack?.path || !window.electronAPI?.openFileFolder) return
      try {
        const result = await window.electronAPI.openFileFolder(this.currentTrack.path)
        if (!result?.success) {
          this.errorMessage = result?.error || lt('打开文件夹失败')
        }
      } catch (error) {
        this.errorMessage = lt('打开文件夹失败')
      }
    },

    async closeTab() {
      try {
        if (window.electronAPI?.tabGetAll && window.electronAPI?.tabClose) {
          const result = await window.electronAPI.tabGetAll()
          const activeTabId = result?.activeTabId
          if (activeTabId && activeTabId !== 'home-tab') {
            await window.electronAPI.tabClose(activeTabId)
            return
          }
        }
      } catch (error) {
        console.error('[AudioPlayerPage] 关闭标签页失败:', error)
      }
      window.close()
    },

    bindKeyboard() {
      const handler = (event) => {
        const target = event.target
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return
        }
        if (event.code === 'Space') {
          event.preventDefault()
          this.togglePlay()
        } else if (event.code === 'ArrowLeft') {
          const audio = this.$refs.audio
          if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5)
        } else if (event.code === 'ArrowRight') {
          const audio = this.$refs.audio
          if (audio) audio.currentTime = Math.min(this.duration, audio.currentTime + 5)
        } else if (event.code === 'ArrowUp') {
          event.preventDefault()
          this.volume = Math.min(1, this.volume + 0.05)
          this.isMuted = false
          this.applyVolume()
        } else if (event.code === 'ArrowDown') {
          event.preventDefault()
          this.volume = Math.max(0, this.volume - 0.05)
          this.isMuted = this.volume === 0
          this.applyVolume()
        } else if (event.code === 'KeyM') {
          this.toggleMute()
        }
      }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    },

    colorsFor(track) {
      const text = `${track?.name || ''}${track?.artist || ''}` || 'music'
      let hash = 0
      for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0
      }
      return {
        hueA: hash % 360,
        hueB: (hash % 360 + 52 + (hash >> 8) % 70) % 360
      }
    },

    fallbackCoverStyle(track) {
      const colors = this.colorsFor(track || this.currentTrack)
      return {
        background: `linear-gradient(135deg, hsl(${colors.hueA} 72% 60%), hsl(${colors.hueB} 76% 46%))`
      }
    },

    formatTime(seconds) {
      return formatDuration(seconds, '0:00')
    },

    formatDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString()
    }
  }
}

/** 没有查询参数标题时用文件名兜底 */
function fileNameOf(filePath) {
  return String(filePath).split(/[\\/]/).pop() || lt('未知音频')
}

/** 构建 file:// 地址，处理 Windows 反斜杠和中文路径 */
function toFileUrl(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '')
  return `file:///${encodeURI(normalized)}`
}
</script>

<style scoped>
.music-player {
  --mp-panel: rgba(255, 255, 255, 0.62);
  --mp-panel-strong: rgba(255, 255, 255, 0.86);
  --mp-line: rgba(20, 30, 50, 0.08);
  --mp-text: #16202c;
  --mp-muted: #667586;
  --mp-shadow: 0 24px 70px rgba(25, 40, 70, 0.18);

  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  color: var(--mp-text);
  background: var(--bg-primary, #f4f6fb);
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  user-select: none;
}

[data-theme="dark"] .music-player,
[data-theme="night"] .music-player,
[data-theme="night-ink"] .music-player {
  --mp-panel: rgba(20, 32, 45, 0.62);
  --mp-panel-strong: rgba(21, 33, 47, 0.88);
  --mp-line: rgba(255, 255, 255, 0.09);
  --mp-text: #e8eef5;
  --mp-muted: #91a3b5;
  --mp-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
}

.mp-backdrop {
  position: absolute;
  inset: -60px;
  background-size: cover;
  background-position: center;
  filter: blur(70px) saturate(1.35);
  transform: scale(1.08);
  opacity: 0.5;
  transition: background-image 0.5s ease;
}

.mp-backdrop-tint {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.72) 60%, rgba(255, 255, 255, 0.9)),
    radial-gradient(circle at 75% 10%, rgba(255, 255, 255, 0.15), transparent 45%);
}

[data-theme="dark"] .mp-backdrop-tint,
[data-theme="night"] .mp-backdrop-tint,
[data-theme="night-ink"] .mp-backdrop-tint {
  background:
    linear-gradient(180deg, rgba(10, 18, 28, 0.45), rgba(10, 18, 28, 0.82) 62%, rgba(9, 16, 25, 0.94)),
    radial-gradient(circle at 75% 10%, rgba(255, 255, 255, 0.06), transparent 45%);
}

.mp-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}

/* 左侧列表 */
.mp-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 18px 0 14px 18px;
  border: 1px solid var(--mp-line);
  border-radius: 22px;
  background: var(--mp-panel);
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  box-shadow: var(--mp-shadow);
  overflow: hidden;
}

.mp-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 12px;
}

.mp-sidebar-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.mp-sidebar-title em {
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--mp-muted);
  background: var(--mp-line);
  border-radius: 999px;
  padding: 2px 8px;
}

.mp-sidebar-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  color: #fff;
  font-size: 14px;
  background: linear-gradient(135deg, #667eea, #8b5cf6);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.32);
}

.mp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 10px;
  padding: 0 12px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--mp-line);
  background: var(--mp-panel-strong);
  cursor: text;
}

.mp-search-icon {
  font-size: 18px;
  color: var(--mp-muted);
  line-height: 1;
}

.mp-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--mp-text);
  font-size: 13px;
}

.mp-search input::placeholder {
  color: var(--mp-muted);
}

.mp-search-clear {
  border: none;
  background: transparent;
  color: var(--mp-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 0 2px;
}

.mp-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 10px 10px;
  scrollbar-width: thin;
}

.mp-list::-webkit-scrollbar {
  width: 6px;
}

.mp-list::-webkit-scrollbar-thumb {
  background: var(--mp-line);
  border-radius: 99px;
}

.mp-list-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}

.mp-list-item:hover {
  background: var(--mp-panel-strong);
}

.mp-list-remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--mp-muted);
  cursor: pointer;
  opacity: 0;
}

.mp-list-item:hover .mp-list-remove,
.mp-list-item.active .mp-list-remove {
  opacity: 1;
}

.mp-list-remove:hover {
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
}

.mp-list-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.18), rgba(139, 92, 246, 0.14));
}

.mp-list-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 99px;
  background: linear-gradient(180deg, #667eea, #a855f7);
}

.mp-list-index {
  width: 22px;
  flex-shrink: 0;
  text-align: center;
  font-size: 12px;
  color: var(--mp-muted);
  font-variant-numeric: tabular-nums;
}

.mp-list-item.active .mp-list-index {
  color: #667eea;
}

.mp-bars {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 14px;
}

.mp-bars i {
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #667eea, #a855f7);
  animation: mp-bar 0.9s ease-in-out infinite;
}

.mp-bars i:nth-child(1) { height: 7px; animation-delay: -0.2s; }
.mp-bars i:nth-child(2) { height: 13px; animation-delay: -0.5s; }
.mp-bars i:nth-child(3) { height: 9px; animation-delay: -0.8s; }

.mp-bars.paused i {
  animation-play-state: paused;
  opacity: 0.5;
}

@keyframes mp-bar {
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(1); }
}

.mp-list-thumb {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.mp-list-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.mp-list-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mp-list-artist {
  font-size: 11px;
  color: var(--mp-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mp-list-duration {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--mp-muted);
  font-variant-numeric: tabular-nums;
}

.mp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--mp-muted);
  font-size: 13px;
}

.mp-empty-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  font-size: 22px;
  background: var(--mp-panel-strong);
  border: 1px solid var(--mp-line);
}

.mp-sidebar-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--mp-line);
  color: var(--mp-muted);
  font-size: 11px;
}

/* 右侧主区域 */
.mp-main {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 18px 26px 8px;
}

.mp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mp-topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mp-pill {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #a855f7);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.28);
}

.mp-topbar-sub {
  font-size: 12px;
  color: var(--mp-muted);
}

.mp-topbar-right {
  display: flex;
  gap: 8px;
}

.mp-ghost-btn,
.mp-icon-btn {
  display: grid;
  place-items: center;
  border: 1px solid var(--mp-line);
  background: var(--mp-panel);
  color: var(--mp-text);
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.16s ease;
  backdrop-filter: blur(12px);
}

.mp-ghost-btn {
  width: 34px;
  height: 34px;
  font-size: 14px;
}

.mp-icon-btn {
  width: 40px;
  height: 40px;
  font-size: 16px;
  border-color: transparent;
  background: transparent;
}

.mp-ghost-btn:hover,
.mp-icon-btn:hover:not(:disabled) {
  background: var(--mp-panel-strong);
  transform: translateY(-1px);
}

.mp-ghost-btn:disabled,
.mp-icon-btn:disabled {
  opacity: 0.42;
  cursor: default;
}

.mp-icon-btn.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.12);
}

.mp-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 54px;
  min-height: 0;
  padding: 20px 10px 10px;
}

.mp-cover-area {
  position: relative;
  flex-shrink: 0;
  width: min(340px, 30vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.mp-glow {
  position: absolute;
  inset: -18%;
  border-radius: 50%;
  filter: blur(34px);
  opacity: 0.85;
  animation: mp-breathe 6s ease-in-out infinite;
}

@keyframes mp-breathe {
  0%, 100% { transform: scale(0.96); opacity: 0.7; }
  50% { transform: scale(1.04); opacity: 0.95; }
}

.mp-cover {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 26px;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-shadow: 0 34px 80px rgba(15, 25, 45, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.mp-cover.is-playing {
  transform: translateY(-4px) scale(1.012);
}

.mp-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mp-cover-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
}

.mp-cover-note {
  font-size: 64px;
  line-height: 1;
  text-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.mp-cover-letter {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2em;
  opacity: 0.7;
  text-transform: uppercase;
}

.mp-cover-shadow {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -4%;
  height: 40px;
  border-radius: 50%;
  background: rgba(15, 25, 45, 0.28);
  filter: blur(22px);
  z-index: 0;
}

.mp-info {
  flex: 0 1 440px;
  min-width: 260px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mp-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--mp-muted);
}

.mp-kicker-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}

.mp-kicker-dot.playing {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
  animation: mp-pulse 1.8s ease-in-out infinite;
}

@keyframes mp-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.mp-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 50px);
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.025em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.mp-artist {
  margin: 0;
  font-size: 16px;
  color: var(--mp-muted);
}

.mp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.mp-chip {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mp-muted);
  border: 1px solid var(--mp-line);
  background: var(--mp-panel);
}

.mp-chip-tag {
  color: #667eea;
}

.mp-desc {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--mp-muted);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
}

.mp-meta-card {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--mp-line);
  background: var(--mp-panel);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.mp-meta-row {
  display: flex;
  gap: 12px;
  font-size: 12px;
  min-width: 0;
}

.mp-meta-label {
  flex-shrink: 0;
  width: 64px;
  color: var(--mp-muted);
}

.mp-meta-value {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mp-path {
  direction: rtl;
  text-align: left;
}

/* 歌词 */
.mp-lyrics {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  height: clamp(150px, 28vh, 300px);
  border: 1px solid var(--mp-line);
  border-radius: 16px;
  background: var(--mp-panel);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  overflow: hidden;
}

.mp-lyrics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--mp-line);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--mp-muted);
}

.mp-lyrics-count {
  font-weight: 500;
  letter-spacing: 0;
}

.mp-lyrics-scroll {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 16px;
  scroll-behavior: smooth;
}

.mp-lyrics-scroll::-webkit-scrollbar {
  width: 4px;
}

.mp-lyrics-scroll::-webkit-scrollbar-thumb {
  background: var(--mp-line);
  border-radius: 99px;
}

.mp-lyric-line {
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mp-muted);
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.mp-lyric-line:hover {
  color: var(--mp-text);
  background: rgba(102, 126, 234, 0.08);
}

.mp-lyric-line.past {
  opacity: 0.55;
}

.mp-lyric-line.active {
  color: #667eea;
  font-weight: 700;
  background: rgba(102, 126, 234, 0.12);
  transform: translateX(2px);
}

[data-theme="dark"] .mp-lyric-line.active,
[data-theme="night"] .mp-lyric-line.active,
[data-theme="night-ink"] .mp-lyric-line.active {
  color: #a5b4fc;
}

.mp-error {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  max-width: min(560px, 80%);
  padding: 9px 16px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  background: rgba(220, 38, 38, 0.9);
  box-shadow: 0 10px 30px rgba(220, 38, 38, 0.28);
  cursor: pointer;
  z-index: 4;
}

/* 底部控制栏 */
.mp-bar {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(190px, 280px) minmax(0, 1fr) minmax(180px, 260px);
  align-items: center;
  gap: 22px;
  height: 88px;
  padding: 0 26px;
  border-top: 1px solid var(--mp-line);
  background: var(--mp-panel-strong);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  box-shadow: 0 -16px 40px rgba(15, 25, 45, 0.08);
}

.mp-bar-track {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mp-mini-cover {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 13px;
  overflow: hidden;
  color: #fff;
  font-size: 20px;
  box-shadow: 0 10px 24px rgba(15, 25, 45, 0.24);
}

.mp-mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mp-mini-info {
  min-width: 0;
}

.mp-mini-name {
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mp-mini-artist {
  margin-top: 2px;
  font-size: 11px;
  color: var(--mp-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mp-bar-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.mp-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mp-play-btn {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 17px;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea, #a855f7);
  box-shadow: 0 12px 26px rgba(102, 126, 234, 0.38);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.mp-play-btn:hover:not(:disabled) {
  transform: scale(1.06);
  box-shadow: 0 16px 32px rgba(102, 126, 234, 0.46);
}

.mp-play-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.mp-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 620px;
}

.mp-time {
  flex-shrink: 0;
  width: 46px;
  font-size: 11px;
  color: var(--mp-muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.mp-range {
  --mp-progress: 0%;
  flex: 1;
  height: 4px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 99px;
  background: linear-gradient(90deg, #667eea var(--mp-progress), var(--mp-line) var(--mp-progress));
  cursor: pointer;
  outline: none;
}

.mp-range:disabled {
  cursor: default;
  opacity: 0.6;
}

.mp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #667eea;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
  transition: transform 0.12s ease;
}

.mp-range:hover::-webkit-slider-thumb {
  transform: scale(1.18);
}

.mp-bar-side {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.mp-volume {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mp-volume-icon {
  font-size: 13px;
  opacity: 0.7;
}

.mp-volume-range {
  width: 100px;
  flex: 0 0 auto;
}

@media (max-width: 1100px) {
  .mp-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .mp-stage {
    gap: 30px;
  }

  .mp-cover-area {
    width: min(270px, 30vw);
  }

  .mp-info {
    flex: 1 1 240px;
    min-width: 200px;
  }

  .mp-title {
    font-size: clamp(24px, 3.2vw, 38px);
  }

  .mp-meta-card {
    display: none;
  }
}

@media (max-width: 820px) {
  .mp-layout {
    grid-template-columns: 1fr;
  }

  .mp-sidebar {
    display: none;
  }

  .mp-stage {
    flex-direction: column;
    gap: 22px;
    padding: 16px;
  }

  .mp-cover-area {
    width: min(260px, 56vw);
  }

  .mp-info {
    flex: 0 0 auto;
    width: 100%;
    max-width: 440px;
    text-align: center;
    align-items: center;
  }

  .mp-lyrics {
    width: 100%;
    text-align: left;
  }

  .mp-chips {
    justify-content: center;
  }

  .mp-bar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    padding: 0 16px;
  }

  .mp-bar-side {
    display: none;
  }

  .mp-bar-track {
    display: none;
  }
}
</style>
