<template>
  <div class="pdf-reader">
    <!-- PDF 工具栏（仅缩放控制） -->
    <div class="pdf-toolbar">
      <div class="toolbar-right">
        <button class="btn-toolbar" @click="zoomOut" :disabled="scale <= 0.5" :title="$lt('缩小')">
          <span class="btn-icon">−</span>
        </button>
        <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
        <button class="btn-toolbar" @click="zoomIn" :disabled="scale >= 3" :title="$lt('放大')">
          <span class="btn-icon">+</span>
        </button>
        <button class="btn-toolbar" @click="resetZoom" :title="$lt('重置缩放')">
          <span class="btn-icon">⌂</span>
        </button>
      </div>
    </div>

    <!-- PDF 内容区域 -->
    <div class="pdf-content" ref="pdfContainer" @scroll="handleScroll">
      <div v-if="loading" class="loading-content">
        <div class="loading-spinner"></div>
        <p>{{ $lt('正在加载 PDF...') }}</p>
      </div>
      <div v-else-if="error" class="error-content">
        <p>{{ $lt('加载 PDF 失败:') }} {{ error }}</p>
        <button class="btn-retry" @click="loadPdf">{{ $lt('重试') }}</button>
      </div>
      <div v-else class="pdf-pages">
        <canvas
          v-for="pageNum in visiblePages"
          :key="pageNum"
          :ref="el => setPageRef(el as HTMLCanvasElement | null, pageNum)"
          :data-page="pageNum"
          class="pdf-page"
          :style="{ transform: `scale(${scale})`, transformOrigin: 'top left' }"
        ></canvas>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <div class="pdf-navigation">
      <button class="btn-nav" @click="previousPage" :disabled="currentPage <= 1" :title="$lt('上一页')">
        <span class="btn-icon">←</span> {{ $lt('上一页') }} </button>
      <span class="page-info"> {{ $lt('第') }} {{ currentPage }} / {{ totalPages }} {{ $lt('页') }} </span>
      <button class="btn-nav" @click="nextPage" :disabled="currentPage >= totalPages" :title="$lt('下一页')"> {{ $lt('下一页') }} <span class="btn-icon">→</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Polyfill for Promise.try (not available in older environments, required by pdfjs-dist 5.x)
if (typeof (Promise as any).try === 'undefined') {
  (Promise as any).try = function <T>(fn: () => T | PromiseLike<T>) {
    try {
      return Promise.resolve(fn())
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

// 使用 PDF.js 5.x/6.x 的标准导入
// 注意：使用 shallowRef 存储 PDF 文档对象，避免 Vue 3 响应式代理与 PDF.js 私有字段冲突
import * as pdfjsLib from 'pdfjs-dist'
// 使用主包自带的 Worker，确保版本一致
// @ts-expect-error Vite 的 ?url 导入，返回资源 URL 字符串
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Polyfill for Promise.withResolvers (not available in older environments)
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

// 配置 PDF.js Worker：使用主包自带的 Worker，确保版本一致
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Worker 初始化函数（用于确保 worker 已准备好）
const initializeWorker = async () => {
  // Worker 已在模块加载时配置
  await new Promise(resolve => setTimeout(resolve, 100))
}

export default {
  name: 'PdfReader',
  props: {
    filePath: {
      type: String,
      required: true
    },
    initialPage: {
      type: Number,
      default: 1
    },
    initialScale: {
      type: Number,
      default: 1.0
    }
  },
  emits: ['page-changed', 'scale-changed'],
  setup(props, { emit }) {
    const loading = ref(true)
    const error = ref<string | null>(null)
    // 关键：使用 shallowRef 而不是 ref，避免 Vue 3 响应式代理与 PDF.js 私有字段冲突
    // PDF.js 5.x/6.x 使用私有字段，Vue 的深度响应式代理会导致 "Cannot read from private field" 错误
    const pdfDoc = shallowRef<any>(null)
    const currentPage = ref(props.initialPage)
    const totalPages = ref(0)
    const scale = ref(props.initialScale)
    const pageRefs = ref<Map<number, HTMLCanvasElement>>(new Map())
    const pdfContainer = ref<HTMLDivElement | null>(null)
    const visiblePages = ref<number[]>([])

    // 设置页面引用
    const setPageRef = (el: HTMLCanvasElement | null, pageNum: number) => {
      if (el) {
        pageRefs.value.set(pageNum, el)
      } else {
        pageRefs.value.delete(pageNum)
      }
    }

    // 加载 PDF 文档
    const loadPdf = async () => {
      try {
        loading.value = true
        error.value = null

        // 确保 worker 已初始化
        await initializeWorker()
        
        // 等待一小段时间，确保 worker 完全准备好
        await new Promise(resolve => setTimeout(resolve, 50))

        console.log('开始加载 PDF:', props.filePath)

        // 在 Electron 环境中读取 PDF 文件
        let pdfData: ArrayBuffer | string | Uint8Array | null = null

        // 优先使用 Electron API 读取文件为 data URL，然后转换为 ArrayBuffer
        if (window.electronAPI?.readFileAsDataUrl) {
          try {
            console.log('正在读取 PDF 文件:', props.filePath)
            const dataUrl = await window.electronAPI.readFileAsDataUrl(props.filePath)
            
            if (!dataUrl) {
              throw new Error('无法读取文件：readFileAsDataUrl 返回 null 或 undefined')
            }
            
            if (typeof dataUrl !== 'string') {
              throw new Error(`readFileAsDataUrl 返回了意外的类型: ${typeof dataUrl}`)
            }
            
            console.log('文件读取成功，数据 URL 长度:', dataUrl.length)
            console.log('数据 URL 前缀:', dataUrl.substring(0, 50))
            
            // 将 data URL 转换为 ArrayBuffer
            const response = await fetch(dataUrl)
            if (!response.ok) {
              throw new Error(`fetch 失败: ${response.status} ${response.statusText}`)
            }
            
            pdfData = await response.arrayBuffer()
            console.log('PDF 数据转换为 ArrayBuffer 成功，大小:', pdfData.byteLength, 'bytes')
            
            // 验证数据是否有效（PDF 文件应该以 %PDF 开头）
            const uint8Array = new Uint8Array(pdfData)
            const header = String.fromCharCode(...uint8Array.slice(0, 4))
            if (header !== '%PDF') {
              console.warn('警告：文件可能不是有效的 PDF 文件，头部:', header)
            }
          } catch (dataUrlError: any) {
            console.error('使用 data URL 读取 PDF 失败:', dataUrlError)
            throw new Error(`读取 PDF 文件失败: ${dataUrlError.message || dataUrlError}`)
          }
        } else {
          console.warn('Electron API 不可用，使用文件路径')
          // 非 Electron 环境：直接使用文件路径（需要用户选择文件后）
          pdfData = props.filePath
        }

        if (!pdfData) {
          throw new Error('无法获取 PDF 数据')
        }

        console.log('正在使用 PDF.js 加载文档...')
        // 使用 PDF.js 加载文档
        // 关键：必须使用 ArrayBuffer 或 Uint8Array，不要用文件路径字符串
        // PDF.js 5.x/6.x 使用私有字段，必须通过正确的 API 调用
        // 确保 pdfData 是 ArrayBuffer 或 Uint8Array
        const loadingTask = pdfjsLib.getDocument({ 
          data: pdfData, // 必须是 ArrayBuffer、Uint8Array 或 URL，不能是文件路径字符串
          // 添加错误处理选项
          verbosity: 0, // 0 = errors, 1 = warnings, 5 = infos
          // 禁用范围请求（对于本地文件不需要）
          disableAutoFetch: false,
          disableStream: false
        })
        
        // 监听加载进度（可选）
        loadingTask.onProgress = (progress: { loaded: number, total: number }) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100)
            console.log(`PDF 加载进度: ${percent}%`)
          }
        }
        
        const pdf = await loadingTask.promise
        console.log('PDF 文档加载成功，总页数:', pdf.numPages)

        // 验证文档对象是否有效
        if (!pdf || typeof pdf.getPage !== 'function') {
          throw new Error('PDF 文档对象无效：getPage 方法不可用')
        }

        // 测试获取第一页，确保 worker 正常工作
        try {
          const testPage = await pdf.getPage(1)
          if (!testPage) {
            throw new Error('无法获取测试页面')
          }
          console.log('Worker 测试成功，可以正常获取页面')
        } catch (testError: any) {
          console.error('Worker 测试失败:', testError)
          throw new Error(`PDF.js Worker 未正确初始化: ${testError.message || testError}`)
        }

        pdfDoc.value = pdf
        totalPages.value = pdf.numPages
        currentPage.value = Math.min(props.initialPage, pdf.numPages)

        // 初始化可见页面
        updateVisiblePages()

        // 等待 DOM 更新完成
        await nextTick()

        // 渲染当前页面及其附近页面
        await renderVisiblePages()

        loading.value = false
        console.log('PDF 加载完成')
      } catch (err: any) {
        console.error('加载 PDF 失败:', err)
        // 提供更详细的错误信息
        let errorMessage = '加载 PDF 失败'
        if (err.message) {
          errorMessage = err.message
        } else if (err.name) {
          errorMessage = `${err.name}: ${err.message || '未知错误'}`
        }
        // 如果是 PDF.js 特定的错误，提供更多信息
        if (err.name === 'InvalidPDFException' || err.name === 'MissingPDFException') {
          errorMessage = `PDF 文件无效或损坏: ${errorMessage}`
        } else if (err.name === 'UnexpectedResponseException') {
          errorMessage = `无法读取 PDF 文件: ${errorMessage}`
        }
        error.value = errorMessage
        loading.value = false
      }
    }

    // 更新可见页面列表（当前页及前后各一页）
    const updateVisiblePages = () => {
      const pages: number[] = []
      const start = Math.max(1, currentPage.value - 1)
      const end = Math.min(totalPages.value, currentPage.value + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      visiblePages.value = pages
    }

    // 渲染可见页面
    const renderVisiblePages = async () => {
      if (!pdfDoc.value) return

      for (const pageNum of visiblePages.value) {
        await renderPage(pageNum)
      }
    }

    // 渲染单个页面
    const renderPage = async (pageNum: number) => {
      if (!pdfDoc.value) {
        console.warn('PDF 文档未加载，无法渲染页面', pageNum)
        return
      }

      try {
        // 确保文档对象有效
        if (!pdfDoc.value || typeof pdfDoc.value.getPage !== 'function') {
          console.error('PDF 文档对象无效或 getPage 方法不可用')
          return
        }

        const page = await pdfDoc.value.getPage(pageNum)
        
        if (!page) {
          console.error(`无法获取页面 ${pageNum}`)
          return
        }

        const canvas = pageRefs.value.get(pageNum)

        if (!canvas) {
          console.warn(`找不到页面 ${pageNum} 的 canvas 元素`)
          return
        }

        const viewport = page.getViewport({ scale: scale.value })
        const context = canvas.getContext('2d')

        if (!context) {
          console.warn(`无法获取页面 ${pageNum} 的 canvas context`)
          return
        }

        // 支持 HiDPI 屏幕（根据 PDF.js 文档）
        const outputScale = window.devicePixelRatio || 1
        
        // 设置 canvas 的实际尺寸（考虑设备像素比）
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        
        // 设置 canvas 的显示尺寸
        canvas.style.width = Math.floor(viewport.width) + 'px'
        canvas.style.height = Math.floor(viewport.height) + 'px'

        // 构建渲染上下文
        // 根据 PDF.js 文档，如果 outputScale !== 1，需要在 transform 中指定
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport
        }
        
        // 如果 outputScale 不为 1，添加 transform 以支持 HiDPI
        if (outputScale !== 1) {
          renderContext.transform = [outputScale, 0, 0, outputScale, 0, 0]
        }

        await page.render(renderContext).promise
        
        console.log(`页面 ${pageNum} 渲染完成`)
      } catch (err) {
        console.error(`渲染页面 ${pageNum} 失败:`, err)
        // 可以在这里添加错误提示
      }
    }

    // 上一页
    const previousPage = async () => {
      if (currentPage.value > 1) {
        currentPage.value--
        updateVisiblePages()
        await nextTick()
        await renderVisiblePages()
        emit('page-changed', currentPage.value)
        
        // 滚动到当前页
        scrollToPage(currentPage.value)
      }
    }

    // 下一页
    const nextPage = async () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
        updateVisiblePages()
        await nextTick()
        await renderVisiblePages()
        emit('page-changed', currentPage.value)
        
        // 滚动到当前页
        scrollToPage(currentPage.value)
      }
    }

    // 滚动到指定页面
    const scrollToPage = (pageNum: number) => {
      const canvas = pageRefs.value.get(pageNum)
      if (canvas && pdfContainer.value) {
        const containerRect = pdfContainer.value.getBoundingClientRect()
        const canvasRect = canvas.getBoundingClientRect()
        const scrollTop = pdfContainer.value.scrollTop + canvasRect.top - containerRect.top - 20
        pdfContainer.value.scrollTo({ top: scrollTop, behavior: 'smooth' })
      }
    }

    // 放大
    const zoomIn = async () => {
      if (scale.value < 3) {
        scale.value = Math.min(3, scale.value + 0.25)
        emit('scale-changed', scale.value)
        await renderVisiblePages()
      }
    }

    // 缩小
    const zoomOut = async () => {
      if (scale.value > 0.5) {
        scale.value = Math.max(0.5, scale.value - 0.25)
        emit('scale-changed', scale.value)
        await renderVisiblePages()
      }
    }

    // 重置缩放
    const resetZoom = async () => {
      scale.value = 1.0
      emit('scale-changed', scale.value)
      await renderVisiblePages()
    }

    // 处理滚动事件（用于虚拟滚动优化，这里先简化实现）
    const handleScroll = () => {
      // 可以在这里实现虚拟滚动，只渲染可见的页面
      // 目前先渲染当前页及其前后各一页
    }

    // 监听 filePath 变化
    watch(() => props.filePath, () => {
      loadPdf()
    })

    // 监听 currentPage 变化（从外部更新）
    watch(() => props.initialPage, (newPage) => {
      if (newPage !== currentPage.value && pdfDoc.value) {
        currentPage.value = Math.min(newPage, totalPages.value)
        updateVisiblePages()
        nextTick().then(() => {
          renderVisiblePages()
          scrollToPage(currentPage.value)
        })
      }
    })

    onMounted(() => {
      loadPdf()
    })

    onUnmounted(() => {
      // 清理资源
      if (pdfDoc.value) {
        pdfDoc.value.destroy()
      }
    })

    return {
      loading,
      error,
      currentPage,
      totalPages,
      scale,
      pageRefs,
      pdfContainer,
      visiblePages,
      setPageRef,
      loadPdf,
      previousPage,
      nextPage,
      zoomIn,
      zoomOut,
      resetZoom,
      handleScroll
    }
  }
}
</script>

<style scoped>
.pdf-reader {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.pdf-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-toolbar {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
}

.btn-toolbar:hover:not(:disabled) {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.btn-toolbar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  justify-content: center;
  gap: 5px;
  transition: background 0.3s ease;
  font-size: 14px;
  min-width: auto;
  height: auto;
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

.zoom-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  min-width: 80px;
  text-align: center;
}

.pdf-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 20px;
  background: var(--bg-primary);
}

.pdf-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.page-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  flex: 1;
  text-align: center;
}

.pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.pdf-page {
  display: block;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
}

.loading-content,
.error-content {
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

