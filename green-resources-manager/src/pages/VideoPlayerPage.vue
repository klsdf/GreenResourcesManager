<template>
  <div
    class="player"
    :class="{ 'player--idle': !controlsVisible }"
    @mousemove="revealControls"
    @mouseleave="scheduleHideControls"
  >
    <div class="player__stage" ref="stage" @dblclick="toggleFullscreen">
      <video
        ref="videoEl"
        class="player__video"
        :class="`player__video--${fit}`"
        :src="directUrl"
        @click="togglePlay"
        @play="onPlay"
        @pause="onPause"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onEnded"
        @error="onVideoError"
        @waiting="loadingMedia = true"
        @playing="onPlaying"
      />

      <div v-if="loading" class="player__overlay">
        <p>{{ statusText }}</p>
      </div>

      <div v-else-if="errorMessage" class="player__overlay player__overlay--error">
        <h2>无法播放</h2>
        <p>{{ errorMessage }}</p>
        <p v-if="codecLine" class="player__codec">{{ codecLine }}</p>
        <div class="player__overlay-actions">
          <button type="button" @click="openExternal">用外部播放器打开</button>
          <button type="button" @click="closeTab">关闭</button>
        </div>
      </div>
    </div>

    <aside v-if="playlistOpen && playlist.length > 1" class="player__playlist">
      <h3>播放列表</h3>
      <button
        v-for="item in playlist"
        :key="item.path"
        type="button"
        class="player__episode"
        :class="{ 'player__episode--current': item.path === filePath }"
        @click="playFile(item.path, item.name)"
      >
        {{ item.name }}
      </button>
    </aside>

    <div class="player__bar">
      <input
        class="player__seek"
        type="range"
        min="0"
        :max="duration || 0"
        step="0.1"
        :value="currentSeconds"
        :style="seekStyle"
        @input="previewSeek"
        @change="commitSeek"
      />
      <div class="player__controls">
        <div class="player__controls-side">
          <span class="player__time">{{ formatTime(currentSeconds) }} / {{ formatTime(duration) }}</span>
          <span v-if="modeLabel" class="player__mode">{{ modeLabel }}</span>
          <span v-if="notice" class="player__notice">{{ notice }}</span>
        </div>
        <div class="player__transport">
          <button type="button" class="player__icon" title="上一集" :disabled="!hasPrevious" @click="playRelative(-1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6V6zm12 12-8.5-6L18 6v12z"/></svg>
          </button>
          <button type="button" class="player__icon player__icon--play" :title="playing ? '暂停' : '播放'" @click="togglePlay">
            <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>
          </button>
          <button type="button" class="player__icon" title="下一集" :disabled="!hasNext" @click="playRelative(1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2V6z"/></svg>
          </button>
        </div>
        <div class="player__controls-side player__controls-side--end">
          <div class="player__volume">
            <button type="button" class="player__icon" :title="soundOff ? '恢复音量' : '静音'" @click="toggleMute">
              <svg v-if="soundOff" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06A6.99 6.99 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.96 8.96 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06A6.99 6.99 0 0 1 19 12a6.99 6.99 0 0 1-5 6.71v2.06C18.01 19.86 21 16.28 21 12s-2.99-7.86-7-8.77z"/></svg>
            </button>
            <input type="range" min="0" max="1" step="0.01" :value="soundOff ? 0 : volume" :style="volumeStyle" @input="changeVolume" />
          </div>
          <button type="button" class="player__icon player__rate" title="播放速度" @click="cycleRate">{{ rate }}×</button>
          <button type="button" class="player__icon" :title="fitLabel" @click="cycleFit">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 4h-4v2h6v-6h-2v4z"/></svg>
          </button>
          <button type="button" class="player__icon" title="截图" @click="takeScreenshot">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
          </button>
          <button v-if="playlist.length > 1" type="button" class="player__icon" :class="{ 'player__icon--on': playlistOpen }" title="选集" @click="playlistOpen = !playlistOpen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>
          </button>
          <button type="button" class="player__icon" title="全屏" @click="toggleFullscreen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Hls from 'hls.js'
import saveManager from '../utils/SaveManager'
import {
  flushWatchPosition,
  loadWatchPosition,
  queueWatchPosition,
  resumeSeconds,
  watchPercent,
  type WatchPosition
} from '../utils/watchProgress'

/** 播放器记住的音量、倍速和画面适应。跟这台电脑走，不写进每条视频。 */
const PREFS_KEY = 'grm-video-player-prefs'

/** 画面适应的三种方式，按这个顺序循环。 */
const FIT_ORDER = ['contain', 'cover', 'original'] as const

/**
 * 应用内视频播放器。
 * 浏览器能播的文件直接播放。容器或编码不行时，主进程用 ffmpeg 输出 HLS，这一页只负责控件和进度。
 */
export default {
  name: 'VideoPlayerPage',
  data() {
    return {
      /** 当前文件的绝对路径。 */
      filePath: '',
      /** 标签和窗口标题。 */
      title: '',
      /** 同一目录的视频，用来上一集和下一集。 */
      playlist: [] as Array<{ name: string, path: string }>,
      /** 主进程会话编号。关闭标签时用它停掉 ffmpeg。 */
      sessionId: '',
      /** direct 是原文件，remux 是换容器，audio 是只转音频，transcode 是转画面。 */
      mode: '' as '' | 'direct' | 'remux' | 'audio' | 'transcode',
      /** 直接播放时写给 video 标签的地址。转码时留空，改由 hls.js 喂数据。 */
      directUrl: '',
      /** 转码流从片中开始时，video 的 currentTime 要加上这段偏移才是片内时间。 */
      offset: 0,
      /** 片长，秒。优先用探测结果。 */
      duration: 0,
      /** 片内当前秒数，给进度条用。 */
      currentSeconds: 0,
      /** 是否正在播放。 */
      playing: false,
      /** 音量，0 到 1。 */
      volume: 1,
      /** 静音前记住的音量。再点喇叭时恢复到这里，避免从 0 解不开。 */
      volumeBeforeMute: 1,
      /** 是否静音。 */
      muted: false,
      /** 播放速度。 */
      rate: 1,
      /** 可选速度。 */
      rates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      /** 画面适应：包含、铺满、原始尺寸。 */
      fit: 'contain' as 'contain' | 'cover' | 'original',
      /** 控件是否显示。播放一会儿后会藏起来。 */
      controlsVisible: true,
      /** 正在打开文件或等待转码出第一段。 */
      loading: true,
      /** 转码流缓冲时的转圈。和整页加载分开，避免把控件也盖住。 */
      loadingMedia: false,
      /** 失败原因。空字符串表示没有失败。 */
      errorMessage: '',
      /** 探测到的编码，失败时展示给用户。 */
      videoCodec: '',
      /** 探测到的音频编码。 */
      audioCodec: '',
      /** 容器。 */
      container: '',
      /** 转码档位，来自设置。 */
      quality: 'standard',
      /** 选集栏是否打开。 */
      playlistOpen: true,
      /** 这一次直接播放已经因为黑屏降级过，避免来回切换。 */
      escalated: false,
      /** 暂停后 ffmpeg 已停。继续播放时要从当前秒数重新开。 */
      encoderStopped: false,
      /** 正在换播放地址，忽略由此触发的播放事件。 */
      restarting: false,
      /** hls.js 实例。直接播放时是 null。 */
      hls: null as Hls | null,
      /** 藏控件的计时器。 */
      hideTimer: 0 as unknown as ReturnType<typeof setTimeout>,
      /** 截图等短暂提示。不打断播放。 */
      notice: ''
    }
  },
  computed: {
    /**
     * 打开时显示的状态。转码需要等第一段切片。
     */
    statusText(): string {
      if (this.mode === 'transcode') return '正在转码，马上开始播放'
      if (this.mode === 'remux' || this.mode === 'audio') return '正在准备播放'
      return '正在打开视频'
    },
    /**
     * 进度条旁边的方式说明。
     */
    modeLabel(): string {
      if (this.mode === 'remux') return '重封装'
      if (this.mode === 'audio') return '转音频'
      if (this.mode === 'transcode') return '转码'
      return ''
    },
    /**
     * 画面按钮的提示。按钮本身只画框线，文字放在悬停上。
     */
    fitLabel(): string {
      if (this.fit === 'cover') return '铺满画面'
      if (this.fit === 'original') return '原始尺寸'
      return '适应画面'
    },
    /**
     * 喇叭该画成划掉的样子。静音或音量被拖到 0 都算没声。
     */
    soundOff(): boolean {
      return this.muted || this.volume === 0
    },
    /**
     * 进度条已播放部分用白色填上，剩下保持半透明。
     */
    seekStyle(): Record<string, string> {
      const ratio = this.duration > 0 ? Math.min(1, this.currentSeconds / this.duration) : 0
      return this.sliderStyle(ratio)
    },
    /**
     * 音量条同样用已填充的比例着色。静音时整条都空着。
     */
    volumeStyle(): Record<string, string> {
      return this.sliderStyle(this.soundOff ? 0 : this.volume)
    },
    /**
     * 失败时附带的编码说明。
     */
    codecLine(): string {
      if (!this.videoCodec && !this.container) return ''
      return `容器 ${this.container || '未知'}，视频 ${this.videoCodec || '无'}，音频 ${this.audioCodec || '无'}`
    },
    /**
     * 当前文件在列表中的位置。
     */
    playlistIndex(): number {
      return this.playlist.findIndex((item) => this.samePath(item.path, this.filePath))
    },
    /** 还有上一集。 */
    hasPrevious(): boolean {
      return this.playlistIndex > 0
    },
    /** 还有下一集。 */
    hasNext(): boolean {
      return this.playlistIndex >= 0 && this.playlistIndex < this.playlist.length - 1
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    this.filePath = params.get('path') || ''
    this.title = params.get('title') || '视频播放器'
    document.title = this.title
    this.restorePrefs()
    await this.loadQuality()
    window.addEventListener('keydown', this.onKeydown)
    window.addEventListener('beforeunload', this.onLeave)
    if (!this.filePath) {
      this.fail('没有提供视频路径')
      return
    }
    await this.loadPlaylist()
    await this.playFile(this.filePath, this.title, false)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown)
    window.removeEventListener('beforeunload', this.onLeave)
    this.onLeave()
  },
  methods: {
    /**
     * 路径比较时忽略斜杠和大小写。
     * @param left 一条路径
     * @param right 另一条路径
     */
    samePath(left: string, right: string) {
      return left.replace(/\//g, '\\').toLowerCase() === right.replace(/\//g, '\\').toLowerCase()
    },
    /**
     * 读出上次的音量、倍速和画面适应。
     */
    restorePrefs() {
      try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
        if (typeof saved.volume === 'number') this.volume = Math.min(1, Math.max(0, saved.volume))
        if (typeof saved.muted === 'boolean') this.muted = saved.muted
        if (this.rates.includes(saved.rate)) this.rate = saved.rate
        if (FIT_ORDER.includes(saved.fit)) this.fit = saved.fit
      } catch {
        // 本地记录坏了就用默认值。
      }
    },
    /**
     * 把音量、倍速和画面适应留在这台电脑上。
     */
    savePrefs() {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        volume: this.volume,
        muted: this.muted,
        rate: this.rate,
        fit: this.fit
      }))
    },
    /**
     * 读取设置里的转码档位。没配过就用标准档。
     */
    async loadQuality() {
      try {
        const settings = await saveManager.loadSettings()
        this.quality = settings?.videoTranscodeQuality === 'fast' ? 'fast' : 'standard'
      } catch {
        this.quality = 'standard'
      }
    },
    /**
     * 列出同一目录的视频，供选集使用。
     */
    async loadPlaylist() {
      const api = window.electronAPI
      if (!api?.videoListSiblings) return
      const result = await api.videoListSiblings(this.filePath)
      if (result?.success && Array.isArray(result.files)) this.playlist = result.files
    },
    /**
     * 打开一个视频文件。
     * 先记下上一个文件的位置，再按上次看到的秒数向主进程要播放地址。
     * @param filePath 要播的文件
     * @param title 标题
     * @param rememberCurrent 换集前是否先写下当前文件
     */
    async playFile(filePath: string, title: string, rememberCurrent = true) {
      if (rememberCurrent && this.filePath) await this.remember(true)
      await this.releaseSession()
      this.filePath = filePath
      this.title = title || this.title
      document.title = this.title
      this.loading = true
      this.errorMessage = ''
      this.escalated = false
      this.encoderStopped = false
      this.offset = 0
      this.currentSeconds = 0
      this.directUrl = ''
      const saved = await loadWatchPosition(filePath)
      const startAt = resumeSeconds(saved)
      const api = window.electronAPI
      if (!api?.videoOpenSession) {
        this.fail('播放器接口不可用')
        return
      }
      const result = await api.videoOpenSession({
        filePath,
        startSeconds: startAt,
        quality: this.quality
      })
      this.rememberProbe(result)
      if (!result?.success || !result.url) {
        this.fail(result?.error || '无法打开视频')
        return
      }
      this.sessionId = result.sessionId || ''
      this.mode = result.mode || 'direct'
      this.duration = Number(result.duration) || saved.duration || 0
      this.offset = this.mode === 'direct' ? 0 : (Number(result.startSeconds) || 0)
      this.currentSeconds = this.offset
      this.loading = false
      if (this.mode === 'direct') {
        this.directUrl = result.url
        this.$nextTick(() => this.applyPlaybackPrefs(startAt))
      } else {
        this.attachHls(result.url)
      }
    },
    /**
     * 记下探测到的编码，失败页要用。
     * @param result 主进程返回的会话
     */
    rememberProbe(result: { videoCodec?: string, audioCodec?: string, container?: string, duration?: number } | undefined) {
      this.videoCodec = result?.videoCodec || ''
      this.audioCodec = result?.audioCodec || ''
      this.container = result?.container || ''
      if (result?.duration) this.duration = Number(result.duration) || this.duration
    },
    /**
     * 把转码地址交给 hls.js。
     * 浏览器自己的 video 标签不会播 HLS，所以这一路不写 video.src。
     * @param url 本机播放列表地址
     */
    async attachHls(url: string) {
      this.destroyHls()
      this.directUrl = ''
      await this.$nextTick()
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video) return
      video.removeAttribute('src')
      video.load()
      if (!Hls.isSupported()) {
        this.fail('当前环境不能播放转码后的视频')
        return
      }
      const hls = new Hls()
      this.hls = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.applyPlaybackPrefs(0)
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return
        this.fail(data.details || '转码播放中断')
      })
    },
    /**
     * 关掉 hls.js，避免换集后还有一条旧的请求。
     */
    destroyHls() {
      if (this.hls) {
        this.hls.destroy()
        this.hls = null
      }
    },
    /**
     * 把音量、倍速套到视频上。直接播放时还可以跳到上次的位置。
     * @param startAt 直接播放要跳到的秒数。转码流已经从这段时间开始，这里传 0
     */
    applyPlaybackPrefs(startAt: number) {
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video) return
      video.volume = this.volume
      video.muted = this.muted
      video.playbackRate = this.rate
      if (startAt > 0 && this.mode === 'direct') {
        const jump = () => {
          video.currentTime = startAt
          video.removeEventListener('loadedmetadata', jump)
        }
        if (video.readyState >= 1) video.currentTime = startAt
        else video.addEventListener('loadedmetadata', jump)
      }
    },
    /**
     * 元数据到了之后，用视频自己的时长补上探测没有给的片长。
     */
    onLoadedMetadata() {
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video) return
      if (!this.duration && Number.isFinite(video.duration)) {
        this.duration = this.offset + video.duration
      }
    },
    /**
     * 播放事件。暂停后继续时，如果 ffmpeg 已经停了，就从当前秒数重新转。
     */
    onPlay() {
      this.playing = true
      this.revealControls()
      if (this.restarting || !this.encoderStopped || this.mode === 'direct') return
      this.resumeEncoding()
    },
    /**
     * 暂停时停掉转码进程。直接播放没有 ffmpeg，不用通知主进程。
     */
    async onPause() {
      this.playing = false
      this.controlsVisible = true
      if (this.restarting || this.mode === 'direct' || !this.sessionId) return
      this.encoderStopped = true
      await window.electronAPI?.videoPauseSession?.({ sessionId: this.sessionId })
    },
    /**
     * 从当前秒数重新开始转码。
     */
    async resumeEncoding() {
      this.encoderStopped = false
      this.restarting = true
      await this.seekAbsolute(this.currentSeconds)
      this.restarting = false
    },
    /**
     * 画面真正画出来之后，检查是不是黑屏只有声音。
     * 只对直接播放做一次降级，转码后的画面不应再被送去转码。
     */
    onPlaying() {
      this.loadingMedia = false
      if (this.mode !== 'direct' || this.escalated) return
      window.setTimeout(() => {
        const video = this.$refs.videoEl as HTMLVideoElement | undefined
        if (!video || video.paused || this.mode !== 'direct' || this.escalated) return
        if (video.videoWidth > 0) return
        this.escalate()
      }, 1200)
    },
    /**
     * 直接播放解不出画面时，改请主进程转码。
     */
    async escalate() {
      if (!this.sessionId || this.escalated) return
      this.escalated = true
      this.loading = true
      const result = await window.electronAPI?.videoEscalateSession?.({
        sessionId: this.sessionId,
        seconds: this.currentSeconds
      })
      if (!result?.success || !result.url) {
        this.fail(result?.error || '转码失败')
        return
      }
      this.mode = 'transcode'
      this.offset = Number(result.startSeconds) || this.currentSeconds
      this.loading = false
      this.attachHls(result.url)
    },
    /**
     * 直接播放解不出时降级到转码。
     * 地址还没设上时，空的 video 标签也会报错，那种情况要忽略。
     */
    onVideoError() {
      if (this.mode !== 'direct' || !this.directUrl) return
      if (!this.escalated && this.sessionId) {
        this.escalate()
        return
      }
      this.fail('视频解码失败')
    },
    /**
     * 进度变化时记下片内时间，并攒到几秒后写存档。
     */
    onTimeUpdate() {
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video) return
      this.currentSeconds = this.offset + (Number.isFinite(video.currentTime) ? video.currentTime : 0)
      if (video.duration && Number.isFinite(video.duration)) {
        const total = this.offset + video.duration
        if (!this.duration || total > this.duration) this.duration = total
      }
      this.remember(false)
    },
    /**
     * 这一集结束时写下进度，并自动播下一集。
     */
    async onEnded() {
      this.currentSeconds = this.duration || this.currentSeconds
      await this.remember(true)
      if (this.hasNext) this.playRelative(1)
    },
    /**
     * 把当前位置放进待写入队列。关闭或换集时立刻写。
     * @param immediate 是否马上写数据库
     */
    async remember(immediate: boolean) {
      if (!this.filePath) return
      const position: WatchPosition = {
        seconds: this.currentSeconds,
        progress: watchPercent(this.currentSeconds, this.duration),
        duration: this.duration
      }
      if (immediate) {
        await flushWatchPosition(this.filePath)
        queueWatchPosition(this.filePath, position, 0)
        await flushWatchPosition(this.filePath)
        return
      }
      queueWatchPosition(this.filePath, position)
    },
    /**
     * 播放或暂停。
     */
    togglePlay() {
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video || this.errorMessage) return
      if (video.paused) video.play().catch(() => {})
      else video.pause()
    },
    /**
     * 拖动进度条时只改数字，松手后再真正跳转。
     * @param event 输入事件
     */
    previewSeek(event: Event) {
      this.currentSeconds = Number((event.target as HTMLInputElement).value) || 0
    },
    /**
     * 松手后跳到进度条的位置。
     * @param event 输入事件
     */
    commitSeek(event: Event) {
      this.seekAbsolute(Number((event.target as HTMLInputElement).value) || 0)
    },
    /**
     * 跳到片内的某一秒。
     * 直接播放改 currentTime。转码要停掉旧的 ffmpeg，从这一秒重新出切片。
     * @param seconds 目标秒数
     */
    async seekAbsolute(seconds: number) {
      const target = Math.max(0, this.duration > 0 ? Math.min(seconds, this.duration) : seconds)
      this.currentSeconds = target
      const video = this.$refs.videoEl as HTMLVideoElement | undefined
      if (!video) return
      if (this.mode === 'direct') {
        video.currentTime = target
        return
      }
      if (!this.sessionId) return
      this.loading = true
      const result = await window.electronAPI?.videoSeekSession?.({ sessionId: this.sessionId, seconds: target })
      if (!result?.success || !result.url) {
        this.fail(result?.error || '跳转失败')
        return
      }
      this.offset = Number(result.startSeconds) || target
      this.encoderStopped = false
      this.loading = false
      this.attachHls(result.url)
    },
    /**
     * 相对当前集切换。
     * @param step -1 是上一集，1 是下一集
     */
    playRelative(step: number) {
      const next = this.playlist[this.playlistIndex + step]
      if (!next) return
      this.playFile(next.path, next.name)
    },
    /**
     * 调整音量。
     * @param event 输入事件
     */
    changeVolume(event: Event) {
      this.volume = Number((event.target as HTMLInputElement).value) || 0
      this.muted = this.volume === 0
      if (this.volume > 0) this.volumeBeforeMute = this.volume
      this.applyPlaybackPrefs(0)
      this.savePrefs()
    },
    /**
     * 静音开关。
     */
    toggleMute() {
      if (this.soundOff) {
        this.muted = false
        if (this.volume === 0) this.volume = this.volumeBeforeMute || 0.8
      } else {
        this.volumeBeforeMute = this.volume || 0.8
        this.muted = true
      }
      this.applyPlaybackPrefs(0)
      this.savePrefs()
    },
    /**
     * 按预设档位循环倍速。下拉框会把文字摊在控件上，点一下图标更干净。
     */
    cycleRate() {
      const index = this.rates.indexOf(this.rate)
      this.rate = this.rates[(index + 1) % this.rates.length] || 1
      this.applyPlaybackPrefs(0)
      this.savePrefs()
    },
    /**
     * 在适应、铺满、原始尺寸之间切换。
     */
    cycleFit() {
      const index = FIT_ORDER.indexOf(this.fit)
      this.fit = FIT_ORDER[(index + 1) % FIT_ORDER.length]
      this.savePrefs()
    },
    /**
     * 截取当前画面，存到存档的视频截图目录。
     */
    async takeScreenshot() {
      if (!this.sessionId) return
      const result = await window.electronAPI?.videoScreenshot?.({
        sessionId: this.sessionId,
        seconds: this.currentSeconds
      })
      this.notice = result?.success ? '截图已保存到存档的视频截图目录' : (result?.error || '截图失败')
      window.setTimeout(() => {
        this.notice = ''
      }, 3000)
    },
    /**
     * 全屏切换。双击画面和按钮都走这里。
     */
    async toggleFullscreen() {
      const stage = this.$refs.stage as HTMLElement | undefined
      if (!stage) return
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stage.requestFullscreen()
    },
    /**
     * 鼠标移动时把控件叫出来，播放中过一会儿再藏。
     */
    revealControls() {
      this.controlsVisible = true
      this.scheduleHideControls()
    },
    /**
     * 播放时延迟隐藏控件。暂停时一直留着。
     */
    scheduleHideControls() {
      if (this.hideTimer) clearTimeout(this.hideTimer)
      if (!this.playing) return
      this.hideTimer = setTimeout(() => {
        this.controlsVisible = false
      }, 2500)
    },
    /**
     * 键盘：空格暂停，左右 5 秒，上下音量，M 静音，F 全屏，N 下一集。
     * @param event 键盘事件
     */
    onKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return
      if (event.code === 'Space') {
        event.preventDefault()
        this.togglePlay()
      } else if (event.code === 'ArrowLeft') {
        this.seekAbsolute(this.currentSeconds - 5)
      } else if (event.code === 'ArrowRight') {
        this.seekAbsolute(this.currentSeconds + 5)
      } else if (event.code === 'ArrowUp') {
        event.preventDefault()
        this.volume = Math.min(1, this.volume + 0.05)
        this.muted = false
        this.applyPlaybackPrefs(0)
        this.savePrefs()
      } else if (event.code === 'ArrowDown') {
        event.preventDefault()
        this.volume = Math.max(0, this.volume - 0.05)
        this.applyPlaybackPrefs(0)
        this.savePrefs()
      } else if (event.code === 'KeyM') {
        this.toggleMute()
      } else if (event.code === 'KeyF') {
        this.toggleFullscreen()
      } else if (event.code === 'KeyN') {
        this.playRelative(1)
      } else if (event.code === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen()
      }
    },
    /**
     * 把 0 到 1 的比例画成白到半透明的滑条。进度和音量共用，避免原生滑条只有一条灰线。
     * @param ratio 已填充的比例
     */
    sliderStyle(ratio: number): Record<string, string> {
      const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
      return {
        background: `linear-gradient(90deg, #fff ${percent}%, rgba(255, 255, 255, 0.28) ${percent}%)`
      }
    },
    /**
     * 秒数显示成 分:秒，超过一小时带上小时。
     * @param totalSeconds 秒数
     */
    formatTime(totalSeconds: number) {
      const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0))
      const hours = Math.floor(safe / 3600)
      const minutes = Math.floor((safe % 3600) / 60)
      const seconds = safe % 60
      const pad = (value: number) => String(value).padStart(2, '0')
      if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
      return `${minutes}:${pad(seconds)}`
    },
    /**
     * 进入失败状态。
     * @param message 给用户看的原因
     */
    fail(message: string) {
      this.loading = false
      this.errorMessage = message
    },
    /**
     * 交给系统默认播放器，然后关掉这个标签。
     */
    openExternal() {
      window.electronAPI?.openExternal?.(this.filePath)
      this.closeTab()
    },
    /**
     * 关掉当前标签。主页标签不能关。
     */
    async closeTab() {
      await this.onLeave()
      const api = window.electronAPI
      if (!api?.tabGetAll || !api?.tabClose) {
        window.close()
        return
      }
      const result = await api.tabGetAll()
      if (result?.activeTabId && result.activeTabId !== 'home-tab') {
        await api.tabClose(result.activeTabId)
      }
    },
    /**
     * 离开页面前写下进度，并停掉 ffmpeg。
     */
    async onLeave() {
      await this.remember(true)
      await this.releaseSession()
    },
    /**
     * 结束主进程会话和 hls.js。
     */
    async releaseSession() {
      this.destroyHls()
      if (!this.sessionId) return
      const sessionId = this.sessionId
      this.sessionId = ''
      await window.electronAPI?.videoCloseSession?.({ sessionId })
    }
  }
}
</script>

<style scoped>
.player {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: #000;
  color: #fff;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.player__stage {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
}

.player__video {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: 100%;
  background: #000;
}

.player__video--contain {
  object-fit: contain;
}

.player__video--cover {
  object-fit: cover;
}

.player__video--original {
  object-fit: none;
}

.player__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.72);
  text-align: center;
  padding: 24px;
}

.player__codec {
  color: #bbb;
  font-size: 13px;
}

.player__overlay-actions {
  display: flex;
  gap: 8px;
}

.player__playlist {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 92px;
  z-index: 3;
  width: 280px;
  overflow: auto;
  background: rgba(16, 16, 16, 0.92);
  padding: 12px;
  pointer-events: auto;
}

.player__episode {
  display: block;
  width: 100%;
  margin-top: 6px;
  text-align: left;
  background: transparent;
  color: #ddd;
  border: 0;
  padding: 8px;
  cursor: pointer;
}

.player__episode--current {
  background: #2a2a2a;
  color: #fff;
}

.player__bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  padding: 8px 16px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
}

.player--idle .player__bar,
.player--idle .player__playlist {
  opacity: 0;
  pointer-events: none;
}

.player__seek,
.player__volume input {
  width: 100%;
  height: 4px;
  margin: 0;
  appearance: none;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

.player__seek::-webkit-slider-thumb,
.player__volume input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25);
}

.player__volume input {
  width: 72px;
}

.player__controls {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  margin-top: 8px;
}

.player__controls-side,
.player__transport {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.player__controls-side--end {
  justify-content: flex-end;
  margin-left: auto;
  flex-wrap: wrap;
}

.player__transport {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.player__volume input {
  width: 88px;
}

.player__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: rgba(255, 255, 255, 0.92);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.player__icon svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.player__icon:hover,
.player__icon--on {
  background: rgba(255, 255, 255, 0.14);
}

.player__icon--play {
  width: 46px;
  height: 46px;
}

.player__icon--play svg {
  width: 30px;
  height: 30px;
}

.player__icon:disabled {
  opacity: 0.28;
  cursor: default;
  background: transparent;
}

.player__rate {
  width: auto;
  min-width: 36px;
  padding: 0 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.player__overlay button {
  background: #2b2b2b;
  color: #fff;
  border: 0;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
}

.player__time,
.player__mode {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.player__mode {
  color: #9ad;
}

.player__notice {
  color: #bdb;
  font-size: 13px;
}

.player__volume {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
