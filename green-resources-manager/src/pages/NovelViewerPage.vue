<template>
  <div class="novel-viewer-page" :class="{ 'has-sidebar': showSidebar && fileType === 'txt' }">
    <!-- 左侧设置面板（仅 TXT 类型显示） -->
    <aside v-if="showSidebar && fileType === 'txt'" class="settings-sidebar">
      <div class="sidebar-header">
        <h3>{{ $lt('阅读设置') }}</h3>
        <button class="btn-toggle" @click="showSidebar = false" :title="$lt('收起')">‹</button>
      </div>

      <div class="sidebar-body">
        <!-- 字号 -->
        <div class="setting-group">
          <label>{{ $lt('字号') }} <span class="value">{{ settings.fontSize }}px</span></label>
          <input
            type="range"
            min="12"
            max="32"
            step="1"
            v-model.number="settings.fontSize"
            @change="persistSettings"
          >
        </div>

        <!-- 行高 -->
        <div class="setting-group">
          <label>{{ $lt('行高') }} <span class="value">{{ settings.lineHeight }}</span></label>
          <input
            type="range"
            min="1.2"
            max="2.4"
            step="0.1"
            v-model.number="settings.lineHeight"
            @change="persistSettings"
          >
        </div>

        <!-- 阅读方式：分页一次一页，无极连续向下滚，并且只保留附近几页 -->
        <div class="setting-group">
          <label>{{ $lt('阅读方式') }}</label>
          <div class="read-mode-switch">
            <button
              type="button"
              :class="{ active: settings.readMode !== 'infinite' }"
              @click="setReadMode('paged')"
            >{{ $lt('分页模式') }}</button>
            <button
              type="button"
              :class="{ active: settings.readMode === 'infinite' }"
              @click="setReadMode('infinite')"
            >{{ $lt('无极模式') }}</button>
          </div>
          <p class="setting-hint">{{ $lt('无极模式会连续向下滚动，并只显示附近几页。') }}</p>
        </div>

        <!-- 每页字数 -->
        <div class="setting-group">
          <label>{{ $lt('每页字数') }} <span class="value">{{ settings.wordsPerPage }}</span></label>
          <input
            type="range"
            min="500"
            max="3000"
            step="100"
            v-model.number="settings.wordsPerPage"
            @change="persistSettings"
          >
        </div>

        <!-- 字体 -->
        <div class="setting-group">
          <label>{{ $lt('字体') }}</label>
          <select v-model="settings.fontFamily" @change="persistSettings">
            <option v-for="opt in fontOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- 主题（背景色 + 文字色预设组合） -->
        <div class="setting-group">
          <label>{{ $lt('主题') }}</label>
          <div class="theme-presets">
            <button
              v-for="(preset, idx) in themePresets"
              :key="idx"
              class="theme-preset"
              :class="{ active: activeThemeIndex === idx }"
              :style="{ background: preset.backgroundColor, color: preset.textColor }"
              @click="applyTheme(idx)"
            >{{ preset.name }}</button>
          </div>
        </div>

        <!-- 自定义颜色 -->
        <div class="setting-group">
          <label>{{ $lt('背景色') }}</label>
          <input type="color" v-model="settings.backgroundColor" @change="persistSettings">
        </div>
        <div class="setting-group">
          <label>{{ $lt('文字色') }}</label>
          <input type="color" v-model="settings.textColor" @change="persistSettings">
        </div>

        <!-- 快捷预览 -->
        <div class="preview-block" :style="previewStyle"> {{ $lt('观沧海 — 东临碣石，以观沧海。') }} </div>
      </div>
    </aside>

    <!-- 收起状态下的展开按钮 -->
    <button
      v-if="!showSidebar && fileType === 'txt'"
      class="sidebar-toggle-collapsed"
      @click="showSidebar = true"
      :title="$lt('展开设置')"
    >›</button>

    <!-- 主内容区 -->
    <div class="novel-viewer-main">
      <!-- 加载中 -->
      <div v-if="loading" class="novel-viewer-loading">
        <div class="loading-spinner"></div>
        <p>{{ $lt('正在加载小说...') }}</p>
      </div>

      <!-- 错误 -->
      <div v-else-if="errorMessage" class="novel-viewer-error">
        <p>{{ errorMessage }}</p>
        <button class="btn-close" @click="closeTab">{{ $lt('关闭') }}</button>
      </div>

      <!-- TXT 文本阅读器 -->
      <TextReader
        v-else-if="fileType === 'txt'"
        :file-path="filePath"
        :initial-page="initialPage"
        :reader-settings="settings"
        :words-per-page="settings.wordsPerPage"
        @page-changed="onPageChanged"
        @progress-changed="onProgressChanged"
        @read-mode-changed="onReadModeChanged"
      />

      <!-- PDF 阅读器 -->
      <PdfReader
        v-else-if="fileType === 'pdf'"
        :file-path="filePath"
        :initial-page="initialPage"
        @page-changed="onPageChanged"
        @progress-changed="onProgressChanged"
      />

      <!-- EPUB 阅读器 -->
      <EbookReader
        v-else-if="fileType === 'epub'"
        :file-path="filePath"
        :initial-cfi="initialCfi"
        @ready="markEpubReady"
        @location-changed="onLocationChanged"
        @progress-changed="onProgressChanged"
        @close="closeTab"
      />

      <!-- 不支持的类型 -->
      <div v-else class="novel-viewer-error">
        <p>{{ $lt('不支持的文件类型:') }} {{ fileType || '未知' }}</p>
        <button class="btn-close" @click="closeTab">{{ $lt('关闭') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import TextReader from '../components/TextReader.vue'
import PdfReader from '../components/PdfReader.vue'
import EbookReader from '../components/epub-reader-v2/EbookReader.vue'
import { loadReadingPosition, queueReadingPosition, flushReadingPosition } from '../utils/readingProgress.ts'

/**
 * 小说阅读器独立标签页
 * 通过 URL 查询参数接收 path（文件路径）、title（资源名称）、fileType（txt/pdf/epub）
 * TXT 类型支持左侧侧边栏实时调整字体/字号/行高/颜色/每页字数，以及分页或无极阅读方式
 */
export default {
  name: 'NovelViewerPage',
  components: { TextReader, PdfReader, EbookReader },
  data() {
    return {
      filePath: '',
      fileType: 'txt',
      title: '小说阅读器',
      /** 文本和 PDF 打开时要跳到的页，从 1 开始。 */
      initialPage: 1,
      /** 这次阅读里最新的页码，进度事件里一起写回。 */
      latestPage: 1,
      /** EPUB 上次的内部位置。 */
      initialCfi: '',
      /** EPUB 目录生成并跳回原位之后才允许记进度，避免开头把上次的位置盖掉。 */
      epubCanSave: false,
      loading: true,
      errorMessage: '',
      showSidebar: true,
      settings: {
        fontSize: 16,
        lineHeight: 1.6,
        fontFamily: 'Microsoft YaHei, sans-serif',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        wordsPerPage: 1000,
        /** 分页一次一页；无极可以连续向下滚。默认分页，避免老习惯被改掉。 */
        readMode: 'paged'
      },
      fontOptions: [
        { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
        { label: '宋体', value: 'SimSun, serif' },
        { label: '黑体', value: 'SimHei, sans-serif' },
        { label: '楷体', value: 'KaiTi, serif' },
        { label: '仿宋', value: 'FangSong, serif' },
        { label: '等线', value: 'DengXian, sans-serif' }
      ],
      themePresets: [
        { name: '白', backgroundColor: '#ffffff', textColor: '#333333' },
        { name: '护眼', backgroundColor: '#ceeaba', textColor: '#333333' },
        { name: '米黄', backgroundColor: '#f5e6c8', textColor: '#333333' },
        { name: '夜间', backgroundColor: '#1a1a1a', textColor: '#d4d4d4' },
        { name: '深蓝', backgroundColor: '#0d1b2a', textColor: '#c9d1d9' }
      ],
      persistTimer: null
    }
  },
  computed: {
    activeThemeIndex() {
      return this.themePresets.findIndex(
        (p) =>
          p.backgroundColor.toLowerCase() === (this.settings.backgroundColor || '').toLowerCase() &&
          p.textColor.toLowerCase() === (this.settings.textColor || '').toLowerCase()
      )
    },
    previewStyle() {
      return {
        fontSize: this.settings.fontSize + 'px',
        lineHeight: this.settings.lineHeight,
        fontFamily: this.settings.fontFamily,
        backgroundColor: this.settings.backgroundColor,
        color: this.settings.textColor
      }
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    const rawPath = params.get('path') || ''
    const title = params.get('title') || '小说阅读器'
    const fileType = (params.get('fileType') || 'txt').toLowerCase()

    if (!rawPath) {
      this.loading = false
      this.errorMessage = '未提供小说文件路径'
      return
    }

    this.filePath = rawPath
    this.fileType = fileType
    this.title = title
    document.title = title

    // 先取出上次的位置，再让阅读器挂载。挂载后再改初始页，阅读器不会回头。
    const position = await loadReadingPosition(rawPath)
    this.initialPage = position.currentPage || 1
    this.latestPage = this.initialPage
    this.initialCfi = position.epubCfi || ''

    // 加载已保存的阅读设置
    await this.loadSettings()

    window.addEventListener('beforeunload', this.flushProgress)
    this.loading = false
    console.log('[NovelViewerPage] 加载小说:', { filePath: this.filePath, fileType, title, initialPage: this.initialPage })
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.flushProgress)
    this.flushProgress()
  },
  methods: {
    async loadSettings() {
      try {
        const saveManager = (await import('../utils/SaveManager.ts')).default
        const settings = await saveManager.loadSettings()
        if (settings?.novel?.readerSettings) {
          const rs = settings.novel.readerSettings
          this.settings = {
            fontSize: rs.fontSize || 16,
            lineHeight: rs.lineHeight || 1.6,
            fontFamily: rs.fontFamily || 'Microsoft YaHei, sans-serif',
            backgroundColor: rs.backgroundColor || '#ffffff',
            textColor: rs.textColor || '#333333',
            wordsPerPage: rs.wordsPerPage || 1000,
            readMode: rs.readMode === 'infinite' ? 'infinite' : 'paged'
          }
        }
      } catch (error) {
        console.warn('[NovelViewerPage] 加载阅读设置失败，使用默认值:', error)
      }
    },
    async persistSettings() {
      // 防抖保存
      if (this.persistTimer) clearTimeout(this.persistTimer)
      this.persistTimer = setTimeout(async () => {
        try {
          const saveManager = (await import('../utils/SaveManager.ts')).default
          const settings = await saveManager.loadSettings()
          if (!settings.novel) settings.novel = {}
          settings.novel.readerSettings = { ...this.settings }
          await saveManager.saveSettings(settings)
          console.log('[NovelViewerPage] 阅读设置已保存')
        } catch (error) {
          console.warn('[NovelViewerPage] 保存阅读设置失败:', error)
        }
      }, 300)
    },
    /**
     * 切换文本小说的阅读方式，并写入阅读设置。
     * 阅读器底部的开关也会走这里，两边保持同一个值。
     * @param mode paged 为分页，infinite 为无极
     */
    setReadMode(mode) {
      const next = mode === 'infinite' ? 'infinite' : 'paged'
      if (this.settings.readMode === next) return
      this.settings.readMode = next
      this.persistSettings()
    },
    /**
     * 阅读器底部切换了方式。侧边栏跟着亮起，并一起记住。
     * @param mode 阅读器报上来的方式
     */
    onReadModeChanged(mode) {
      this.setReadMode(mode)
    },
    applyTheme(idx) {
      const preset = this.themePresets[idx]
      this.settings.backgroundColor = preset.backgroundColor
      this.settings.textColor = preset.textColor
      this.persistSettings()
    },
    /**
     * EPUB 已经跳回上次的位置，之后的翻页才写入存档。
     */
    markEpubReady() {
      this.epubCanSave = true
    },
    /**
     * 记下文本或 PDF 的页码。EPUB 不靠页码恢复。
     * @param page 阅读器当前页，从 1 开始
     */
    onPageChanged(page) {
      this.latestPage = page
      if (this.fileType === 'epub') return
      queueReadingPosition(this.filePath, { currentPage: page })
    },
    /**
     * 记下读完的百分比。文本和 PDF 同时带上当前页。
     * @param progress 0 到 100
     */
    onProgressChanged(progress) {
      if (this.fileType === 'epub' && !this.epubCanSave) return
      const position = { readProgress: progress }
      if (this.fileType !== 'epub') position.currentPage = this.latestPage || this.initialPage
      queueReadingPosition(this.filePath, position)
    },
    /**
     * 记下 EPUB 内部位置，下次打开用它跳回原处。
     * @param cfi 阅读器给出的位置
     */
    onLocationChanged(cfi) {
      if (!this.epubCanSave || !cfi) return
      queueReadingPosition(this.filePath, { epubCfi: cfi })
    },
    /**
     * 马上把还没写完的进度落盘。关闭标签页时不能再等那一下停顿。
     */
    flushProgress() {
      flushReadingPosition(this.filePath)
    },
    async closeTab() {
      await this.flushProgress()
      if (!window.electronAPI?.tabClose || !window.electronAPI?.tabGetAll) return
      try {
        const result = await window.electronAPI.tabGetAll()
        const activeTabId = result?.activeTabId
        if (activeTabId && activeTabId !== 'home-tab') {
          await window.electronAPI.tabClose(activeTabId)
        }
      } catch (error) {
        console.error('[NovelViewerPage] 关闭标签页失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.novel-viewer-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: #ffffff;
}

/* === 左侧设置侧边栏 === */
.settings-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color, #ddd);
  background: var(--bg-secondary, #f5f5f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color, #ddd);
  background: var(--bg-tertiary, #ececec);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.btn-toggle {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--text-primary, #333);
  font-size: 16px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-group label {
  font-size: 12px;
  color: var(--text-secondary, #666);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-group label .value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.setting-group input[type='range'] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color, #ddd);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.setting-group input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-color, #66c0f4);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.read-mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.read-mode-switch button {
  height: 32px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  font-size: 12px;
  cursor: pointer;
}

.read-mode-switch button.active {
  border-color: var(--accent-color, #66c0f4);
  box-shadow: 0 0 0 2px var(--accent-color, #66c0f4);
}

.setting-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-secondary, #666);
}

.setting-group select {
  padding: 6px 8px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.setting-group input[type='color'] {
  width: 100%;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.theme-presets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.theme-preset {
  height: 32px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
}

.theme-preset:hover {
  transform: scale(1.05);
}

.theme-preset.active {
  border-color: var(--accent-color, #66c0f4);
  box-shadow: 0 0 0 2px var(--accent-color, #66c0f4);
}

.preview-block {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px dashed var(--border-color, #ddd);
  text-align: justify;
  word-break: break-word;
}

/* 收起时的展开按钮 */
.sidebar-toggle-collapsed {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 20;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle-collapsed:hover {
  background: var(--bg-tertiary, #ececec);
}

/* === 主内容区 === */
.novel-viewer-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.novel-viewer-loading,
.novel-viewer-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  font-size: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #ddd;
  border-top: 3px solid var(--accent-color, #66c0f4);
  border-radius: 50%;
  animation: novel-spin 1s linear infinite;
}

@keyframes novel-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-close {
  padding: 6px 20px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  cursor: pointer;
}

.btn-close:hover {
  background: var(--bg-tertiary, #e8e8e8);
}

/* 响应式：窄屏收起侧边栏 */
@media (max-width: 900px) {
  .settings-sidebar {
    width: 220px;
  }
}

@media (max-width: 700px) {
  .settings-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 30;
    width: 240px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }
}
</style>
