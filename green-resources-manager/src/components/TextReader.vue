<template>
  <div class="text-reader">
    <!-- 文本内容区域 -->
    <div class="text-content" :style="contentStyle">
      <div v-if="loading" class="loading-content">
        <div class="loading-spinner"></div>
        <p>{{ $lt('正在加载小说内容...') }}</p>
      </div>
      <div v-else-if="error" class="error-content">
        <p>{{ $lt('加载小说内容失败:') }} {{ error }}</p>
        <button class="btn-retry" @click="loadContent">{{ $lt('重试') }}</button>
      </div>
      <div v-else-if="formattedContent" class="novel-text" :style="textStyle" v-html="formattedContent"></div>
      <div v-else class="no-content">
        <p>{{ $lt('无法加载小说内容') }}</p>
        <button class="btn-retry" @click="loadContent">{{ $lt('重试') }}</button>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <div class="text-navigation">
      <button class="btn-nav" @click="previousPage" :disabled="!canGoPrevious" :title="$lt('上一页')">
        <span class="btn-icon">←</span> {{ $lt('上一页') }} </button>
      <span class="page-info"> {{ $lt('第') }} {{ currentPage }} / {{ totalPages }} {{ $lt('页') }} </span>
      <button class="btn-nav" @click="nextPage" :disabled="!canGoNext" :title="$lt('下一页')"> {{ $lt('下一页') }} <span class="btn-icon">→</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import saveManager from '../utils/SaveManager.ts'

export default {
  name: 'TextReader',
  props: {
    filePath: {
      type: String,
      required: true
    },
    initialPage: {
      type: Number,
      default: 1
    },
    wordsPerPage: {
      type: Number,
      default: 1000
    },
    readerSettings: {
      type: Object,
      default: () => ({
        fontSize: 16,
        lineHeight: 1.6,
        fontFamily: 'Microsoft YaHei, sans-serif',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      })
    }
  },
  emits: ['page-changed', 'progress-changed'],
  setup(props, { emit }) {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const novelContent = ref('')
    const currentPage = ref(props.initialPage)
    const totalPages = ref(1)
    const wordsPerPage = ref(props.wordsPerPage)
    const readerSettings = ref(props.readerSettings)

    // 加载全局设置
    const loadGlobalSettings = async () => {
      try {
        const settings = await saveManager.loadSettings()
        if (settings?.novel?.readerSettings) {
          readerSettings.value = {
            fontSize: settings.novel.readerSettings.fontSize || 16,
            lineHeight: settings.novel.readerSettings.lineHeight || 1.6,
            fontFamily: settings.novel.readerSettings.fontFamily || 'Microsoft YaHei, sans-serif',
            backgroundColor: settings.novel.readerSettings.backgroundColor || '#ffffff',
            textColor: settings.novel.readerSettings.textColor || '#333333'
          }
          wordsPerPage.value = settings.novel.readerSettings.wordsPerPage || 1000
        }
      } catch (error) {
        console.error('加载全局设置失败:', error)
      }
    }

    // 监听外部传入的 readerSettings 实时变化（左侧设置面板调整时即时生效）
    watch(() => props.readerSettings, (newSettings) => {
      if (newSettings && typeof newSettings === 'object') {
        readerSettings.value = { ...readerSettings.value, ...newSettings }
      }
    }, { deep: true })

    // 加载文本内容
    const loadContent = async () => {
      if (!props.filePath) {
        error.value = '文件路径不存在'
        return
      }

      try {
        loading.value = true
        error.value = null
        console.log('正在加载文本内容:', props.filePath)

        if (window.electronAPI && window.electronAPI.readTextFile) {
          const result = await window.electronAPI.readTextFile(props.filePath)
          if (result.success && result.content) {
            novelContent.value = result.content
            totalPages.value = Math.ceil(novelContent.value.length / wordsPerPage.value)
            console.log('文本内容加载成功，总页数:', totalPages.value)
            
            // 确保当前页不超过总页数
            if (currentPage.value > totalPages.value) {
              currentPage.value = totalPages.value || 1
            }
            
            // 触发进度更新
            updateReadingProgress()
          } else {
            error.value = result.error || '加载失败'
            novelContent.value = ''
          }
        } else {
          error.value = 'readTextFile API 不可用'
          novelContent.value = ''
        }
      } catch (err: any) {
        console.error('加载文本内容失败:', err)
        error.value = err.message || '加载失败'
        novelContent.value = ''
      } finally {
        loading.value = false
      }
    }

    // 格式化内容（分页处理）
    const formattedContent = computed(() => {
      if (!novelContent.value) return ''
      
      const startIndex = (currentPage.value - 1) * wordsPerPage.value
      const endIndex = startIndex + wordsPerPage.value
      const pageContent = novelContent.value.slice(startIndex, endIndex)
      
      // 格式化文本，保持换行和段落
      return pageContent
        .replace(/\n/g, '<br>')
        .replace(/\r\n/g, '<br>')
        .replace(/\r/g, '<br>')
    })

    // 阅读进度
    const readingProgress = computed(() => {
      if (totalPages.value === 0) return 0
      return Math.round((currentPage.value / totalPages.value) * 100)
    })

    // 是否可以上一页
    const canGoPrevious = computed(() => {
      return currentPage.value > 1
    })

    // 是否可以下一页
    const canGoNext = computed(() => {
      return currentPage.value < totalPages.value
    })

    // 文本样式
    const textStyle = computed(() => {
      return {
        color: readerSettings.value.textColor,
        fontSize: readerSettings.value.fontSize + 'px',
        lineHeight: readerSettings.value.lineHeight,
        fontFamily: readerSettings.value.fontFamily
      }
    })

    // 内容区域样式
    const contentStyle = computed(() => {
      return {
        backgroundColor: readerSettings.value.backgroundColor
      }
    })

    // 上一页
    const previousPage = () => {
      if (canGoPrevious.value) {
        currentPage.value--
        updateReadingProgress()
        emit('page-changed', currentPage.value)
      }
    }

    // 下一页
    const nextPage = () => {
      if (canGoNext.value) {
        currentPage.value++
        updateReadingProgress()
        emit('page-changed', currentPage.value)
      }
    }

    // 更新阅读进度
    const updateReadingProgress = () => {
      const progress = readingProgress.value
      emit('progress-changed', progress)
    }

    // 监听 filePath 变化
    watch(() => props.filePath, () => {
      currentPage.value = props.initialPage
      loadContent()
    })

    // 监听 initialPage 变化
    watch(() => props.initialPage, (newPage) => {
      if (newPage !== currentPage.value && novelContent.value) {
        currentPage.value = Math.min(newPage, totalPages.value)
        updateReadingProgress()
      }
    })

    // 监听 wordsPerPage 变化
    watch(() => props.wordsPerPage, (newValue) => {
      if (newValue !== wordsPerPage.value) {
        wordsPerPage.value = newValue
        if (novelContent.value) {
          totalPages.value = Math.ceil(novelContent.value.length / wordsPerPage.value)
          if (currentPage.value > totalPages.value) {
            currentPage.value = totalPages.value || 1
          }
          updateReadingProgress()
        }
      }
    })

    onMounted(async () => {
      await loadGlobalSettings()
      await loadContent()
    })

    return {
      loading,
      error,
      novelContent,
      currentPage,
      totalPages,
      formattedContent,
      readingProgress,
      canGoPrevious,
      canGoNext,
      textStyle,
      contentStyle,
      loadContent,
      previousPage,
      nextPage,
      updateReadingProgress
    }
  }
}
</script>

<style scoped>
.text-reader {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.text-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: var(--bg-primary);
}

.text-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.btn-nav {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.3s ease;
  font-size: 0.9rem;
}

.btn-nav:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-nav:disabled {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.6;
}

.page-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  flex: 1;
  text-align: center;
}

.novel-text {
  line-height: 1.8;
  text-align: justify;
  word-break: break-word;
}

.loading-content,
.error-content,
.no-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-retry {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.3s ease;
}

.btn-retry:hover {
  background: var(--accent-hover);
}
</style>

