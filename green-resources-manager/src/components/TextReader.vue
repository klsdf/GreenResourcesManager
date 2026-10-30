<template>
  <div class="text-reader">
    <!-- 没接到外层左侧栏时，编码放在正文左边。外层已经有阅读设置时由那边显示。 -->
    <aside v-if="showEncodingPanel" class="encoding-side">
      <label class="encoding-side-label" for="text-encoding">{{ $lt('文本编码') }}</label>
      <select
        id="text-encoding"
        class="encoding-select"
        :value="textEncoding"
        :title="$lt('选择文本编码。乱码时可以改成 GBK（ANSI）')"
        @change="onEncodingChange"
      >
        <option
          v-for="option in encodingOptions"
          :key="option.value"
          :value="option.value"
        >{{ option.value === 'auto' && detectedEncoding ? $lt('自动') + ' · ' + encodingName(detectedEncoding) : $lt(option.label) }}</option>
      </select>
      <p class="encoding-side-hint">{{ $lt('乱码时改成 GBK（ANSI）。这个选择只对当前这本小说生效。') }}</p>
    </aside>

    <div class="text-reader-main">
    <!-- 文本内容区域。无极模式也在这个容器里滚动，这样父级页面不会跟着正文一起被撑高。 -->
    <div class="text-content" ref="contentEl" :style="contentStyle" @scroll="onContentScroll">
      <div v-if="loading" class="loading-content">
        <div class="loading-spinner"></div>
        <p>{{ $lt('正在加载小说内容...') }}</p>
      </div>
      <div v-else-if="error" class="error-content">
        <p>{{ $lt('加载小说内容失败:') }} {{ error }}</p>
        <button class="btn-retry" @click="loadContent">{{ $lt('重试') }}</button>
      </div>
      <div v-else-if="!novelContent" class="no-content">
        <p>{{ $lt('无法加载小说内容') }}</p>
        <button class="btn-retry" @click="loadContent">{{ $lt('重试') }}</button>
      </div>
      <!-- 无极模式：只挂窗口里的几页，滚到边缘再接上一页。 -->
      <div v-else-if="readMode === 'infinite'" class="infinite-flow">
        <article
          v-for="page in visiblePages"
          :key="page.number"
          class="novel-page"
          :data-page="page.number"
        >
          <div class="page-marker">{{ $lt('第') }} {{ page.number }} {{ $lt('页') }}</div>
          <div class="novel-text" :style="textStyle" v-html="page.html"></div>
        </article>
      </div>
      <div v-else class="novel-text" :style="textStyle" v-html="formattedContent"></div>
    </div>

    <!-- 底部导航栏 -->
    <div class="text-navigation">
      <button class="btn-nav" @click="previousPage" :disabled="!canGoPrevious" :title="$lt('上一页')">
        <span class="btn-icon">←</span> {{ $lt('上一页') }} </button>
      <div class="nav-center">
        <span class="page-info"> {{ $lt('第') }} {{ currentPage }} / {{ totalPages }} {{ $lt('页') }} </span>
      </div>
      <button class="btn-nav" @click="nextPage" :disabled="!canGoNext" :title="$lt('下一页')"> {{ $lt('下一页') }} <span class="btn-icon">→</span>
      </button>
    </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import saveManager from '../utils/SaveManager.ts'
import {
  MAX_MOUNTED_TEXT_PAGES,
  TEXT_PAGE_EDGE_PX,
  extendWindowDown,
  extendWindowUp,
  formatTextPageHtml,
  normalizeTextReadMode,
  seedWindowDown,
  sliceTextPage,
  type TextPageWindow,
  type TextReadMode
} from '../utils/textReaderWindow.ts'

/**
 * 文本小说阅读器。
 * 分页模式一次只显示一页，要用下一页才能继续。
 * 无极模式在同一个区域里连续向下滚动，滚近页尾就接后一页，滚回页首就接前一页，
 * 同时只保留附近固定页数，避免长篇把几万页全部画出来。
 */
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
    },
    /**
     * 外层左侧栏选中的编码。
     * 空字符串表示外层还没指定，阅读器自己用这本书上次记住的编码。
     */
    encoding: {
      type: String,
      default: ''
    },
    /**
     * 为真时在正文左边显示编码。
     * 独立阅读页的左侧已经有阅读设置，这时关掉，避免左右各出现一次。
     */
    showEncodingPanel: {
      type: Boolean,
      default: true
    }
  },
  emits: ['page-changed', 'progress-changed', 'read-mode-changed', 'encoding-state'],
  setup(props, { emit }) {
    /** 正在读文件时为真，用来挡住空白正文。 */
    const loading = ref(false)
    /** 读文件失败时的说明。没有错误时是 null。 */
    const error = ref<string | null>(null)
    /** 整篇正文。切页只取其中一段来画，不会按页再存一份。 */
    const novelContent = ref('')
    /** 当前读到的页，从 1 开始。无极模式里它跟着视口顶部的那一页走。 */
    const currentPage = ref(props.initialPage)
    /** 按每页字数切出来的总页数。 */
    const totalPages = ref(1)
    /** 每页字数。和设置面板共用，改了之后页边界会重算。 */
    const wordsPerPage = ref(props.wordsPerPage)
    /** 字体、行高和颜色。阅读区域直接用它。 */
    const readerSettings = ref(props.readerSettings)
    /**
     * 阅读方式。默认分页，和原来必须点下一页的行为一致。
     * 外层如果已经带了方式，以它为准，避免和侧边栏各记各的。
     */
    const readMode = ref<TextReadMode>(normalizeTextReadMode(props.readerSettings?.readMode))
    /**
     * 这本小说用哪种编码来读。
     * 自动会识别 UTF-8 和 GBK。乱码时可以改成 GBK（ANSI）。
     */
    const textEncoding = ref('auto')
    /** 这次实际解出来的编码。自动识别时显示在「自动」后面。 */
    const detectedEncoding = ref('')
    /**
     * 阅读器里可以选的编码。
     * GBK 用 gb18030 解，简体 Windows 的 ANSI 属于这一类。
     */
    const encodingOptions = [
      { value: 'auto', label: '自动' },
      { value: 'utf-8', label: 'UTF-8' },
      { value: 'gb18030', label: 'GBK（ANSI）' },
      { value: 'big5', label: 'Big5' },
      { value: 'utf-16le', label: 'UTF-16' }
    ]
    /** 避免慢的上一次读取盖住刚换的编码。 */
    let loadToken = 0
    /** 无极模式窗口的第一页。 */
    const mountedStart = ref(1)
    /** 无极模式窗口的最后一页。 */
    const mountedEnd = ref(1)
    /** 滚动容器。无极模式的接页和位置保持都看它。 */
    const contentEl = ref<HTMLElement | null>(null)
    /**
     * 大于 0 时忽略滚动事件。
     * 接页后会改 scrollTop 来保住眼前的文字，这次滚动不是用户发出的，不能再触发接页。
     */
    let suspendScroll = 0
    /** 正在接页时为真，避免同一次滚动里把窗口连续挪很多页。 */
    let sliding = false
    /**
     * 是否已经离开过窗口顶部。
     * 刚打开或刚跳到某一页时，滚动位置本来就是 0，这不是在向上要前一页。
     * 只有用户先往下读过，再滚回顶部，才把前面的页接回来。
     */
    let extendUpArmed = false
    /** 滚动事件合成到下一帧再处理，避免每个像素都重排。 */
    let scrollRaf = 0

    /**
     * 外层有没有明确指定阅读方式。
     * 指定了就不要再用存档里的值盖掉，否则侧边栏和底部开关会抢。
     * @returns 外层指定的方式。没指定时是 null
     */
    const readModeFromProps = (): TextReadMode | null => {
      const value = props.readerSettings?.readMode
      if (value == null || value === '') return null
      return normalizeTextReadMode(value)
    }

    /**
     * 读取全局阅读设置。
     * 字号这些仍从存档补齐；阅读方式只有外层没指定时才用存档里的。
     */
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
          if (readModeFromProps() == null) {
            readMode.value = normalizeTextReadMode(settings.novel.readerSettings.readMode)
          }
        }
      } catch (loadError) {
        console.error('加载全局设置失败:', loadError)
      }
    }

    // 监听外部传入的 readerSettings 实时变化（左侧设置面板调整时即时生效）
    watch(() => props.readerSettings, (newSettings) => {
      if (newSettings && typeof newSettings === 'object') {
        readerSettings.value = { ...readerSettings.value, ...newSettings }
      }
    }, { deep: true })

    /**
     * 侧边栏改了阅读方式时同步过来。
     * 值和现在一样就不动，避免把正在看的窗口重新跳回页首。
     */
    watch(() => props.readerSettings?.readMode, (mode) => {
      if (mode == null || mode === '') return
      const next = normalizeTextReadMode(mode)
      if (next !== readMode.value) readMode.value = next
    })

    /**
     * 把这本书的编码选择收成阅读器认识的值。
     * 旧记录里的 GBK、ANSI 都当成 gb18030。
     * @param value 存下来或界面传来的编码
     * @returns 合法编码。认不出时用自动
     */
    const normalizeEncoding = (value: unknown) => {
      const text = String(value || 'auto').trim().toLowerCase()
      if (text === 'gbk' || text === 'gb2312' || text === 'ansi') return 'gb18030'
      if (text === 'utf8') return 'utf-8'
      return encodingOptions.some((option) => option.value === text) ? text : 'auto'
    }

    /**
     * 把实际编码显示成读者能看懂的名字。
     * @param encoding 解码时用的编码
     * @returns 界面上的短名字
     */
    const encodingName = (encoding: string) => {
      if (encoding === 'gb18030') return 'GBK'
      if (encoding === 'big5') return 'Big5'
      if (encoding === 'utf-16le' || encoding === 'utf-16be') return 'UTF-16'
      return 'UTF-8'
    }

    /**
     * 这本书在本地记住的编码键。
     * 按路径记，是因为一本是 GBK、另一本是 UTF-8，不能所有小说共用一个编码。
     * @param filePath 小说文件路径
     * @returns localStorage 键
     */
    const encodingStorageKey = (filePath: string) => {
      return 'grm-novel-encoding:' + filePath.trim().replace(/\//g, '\\').toLowerCase()
    }

    /**
     * 读出这本书上次选的编码。没有记录时用自动识别。
     */
    const loadSavedEncoding = () => {
      try {
        textEncoding.value = normalizeEncoding(localStorage.getItem(encodingStorageKey(props.filePath)))
      } catch (storageError) {
        console.warn('读取小说编码失败:', storageError)
        textEncoding.value = 'auto'
      }
    }

    /**
     * 记住这本书的编码，下次打开不用再选。
     * @param encoding 读者选的编码
     */
    const saveEncoding = (encoding: string) => {
      try {
        localStorage.setItem(encodingStorageKey(props.filePath), encoding)
      } catch (storageError) {
        console.warn('保存小说编码失败:', storageError)
      }
    }

    /**
     * 把当前编码和识别结果交给外层左侧栏。
     * 自动识别出 GBK 时，左侧才能写成「自动 · GBK」。
     */
    const publishEncoding = () => {
      emit('encoding-state', {
        encoding: textEncoding.value,
        detected: detectedEncoding.value,
        detectedLabel: detectedEncoding.value ? encodingName(detectedEncoding.value) : ''
      })
    }

    /**
     * 换成另一种编码并重读。值和现在一样时不重新加载。
     * @param value 界面传来的编码
     */
    const applyEncoding = (value: unknown) => {
      const next = normalizeEncoding(value)
      if (next === textEncoding.value) return
      textEncoding.value = next
      saveEncoding(next)
      publishEncoding()
      if (props.filePath) void loadContent()
    }

    /**
     * 读者换了编码后按新编码重读这本书。
     * 页码先留着，读完再按新的总页数收一收。
     * @param event 下拉框的变更事件
     */
    const onEncodingChange = (event: Event) => {
      applyEncoding((event.target as HTMLSelectElement | null)?.value)
    }

    /**
     * 左侧阅读设置里改了编码时，跟底部原来的下拉框走同一条路。
     */
    watch(() => props.encoding, (value) => {
      if (value == null || value === '') return
      applyEncoding(value)
    })

    /**
     * 加载文本内容。
     * 全文读入后只按当前页或当前窗口切片显示。编码用当前选择，默认自动识别 GBK 和 UTF-8。
     */
    const loadContent = async () => {
      if (!props.filePath) {
        error.value = '文件路径不存在'
        return
      }

      const token = ++loadToken
      try {
        loading.value = true
        error.value = null
        console.log('正在加载文本内容:', props.filePath, textEncoding.value)

        if (window.electronAPI && window.electronAPI.readTextFile) {
          const result = await window.electronAPI.readTextFile(props.filePath, textEncoding.value)
          if (token !== loadToken) return
          if (result.success && result.content) {
            detectedEncoding.value = result.encoding || ''
            novelContent.value = result.content
            totalPages.value = Math.max(1, Math.ceil(novelContent.value.length / wordsPerPage.value))
            console.log('文本内容加载成功，总页数:', totalPages.value)

            if (currentPage.value > totalPages.value) {
              currentPage.value = totalPages.value || 1
            }
            if (currentPage.value < 1) currentPage.value = 1

            // 先把窗口定好再结束加载。若在加载中去滚到页首，正文还没画出来，打开时会多等一帧。
            if (readMode.value === 'infinite') {
              const seeded = seedWindowDown(currentPage.value, totalPages.value, MAX_MOUNTED_TEXT_PAGES)
              mountedStart.value = seeded.start
              mountedEnd.value = seeded.end
            }
            updateReadingProgress()
          } else {
            detectedEncoding.value = ''
            error.value = result.error || '加载失败'
            novelContent.value = ''
          }
        } else {
          error.value = 'readTextFile API 不可用'
          novelContent.value = ''
        }
      } catch (err: any) {
        if (token !== loadToken) return
        console.error('加载文本内容失败:', err)
        error.value = err.message || '加载失败'
        novelContent.value = ''
      } finally {
        if (token === loadToken) {
          loading.value = false
          publishEncoding()
        }
      }
    }

    /** 分页模式当前这一页的 HTML。 */
    const formattedContent = computed(() => {
      if (!novelContent.value) return ''
      return formatTextPageHtml(sliceTextPage(novelContent.value, currentPage.value, wordsPerPage.value))
    })

    /**
     * 无极模式实际画出来的页。
     * 只包含窗口里的页码，所以总页数即使有几万，这里也只有固定的几项。
     */
    const visiblePages = computed(() => {
      const pages: { number: number, html: string }[] = []
      if (!novelContent.value) return pages
      const last = Math.min(mountedEnd.value, totalPages.value)
      for (let number = Math.max(1, mountedStart.value); number <= last; number += 1) {
        pages.push({
          number,
          html: formatTextPageHtml(sliceTextPage(novelContent.value, number, wordsPerPage.value))
        })
      }
      return pages
    })

    /** 读完的百分比，按当前页除以总页数。 */
    const readingProgress = computed(() => {
      if (totalPages.value === 0) return 0
      return Math.round((currentPage.value / totalPages.value) * 100)
    })

    /** 还能不能往前一页。第一页没有上一页。 */
    const canGoPrevious = computed(() => {
      return currentPage.value > 1
    })

    /** 还能不能往后一页。最后一页没有下一页。 */
    const canGoNext = computed(() => {
      return currentPage.value < totalPages.value
    })

    /** 正文字号、行高、字体和颜色。 */
    const textStyle = computed(() => {
      return {
        color: readerSettings.value.textColor,
        fontSize: readerSettings.value.fontSize + 'px',
        lineHeight: readerSettings.value.lineHeight,
        fontFamily: readerSettings.value.fontFamily
      }
    })

    /** 阅读区域背景色。 */
    const contentStyle = computed(() => {
      return {
        backgroundColor: readerSettings.value.backgroundColor
      }
    })

    /**
     * 记下视口顶部那一页，接页之后用它把文字拉回原来的位置。
     * 用视口坐标而不是 scrollTop，是因为页与页之间有分隔，单看某一页的高度会把分隔算漏。
     * @param el 滚动容器
     * @returns 锚点页和它距离容器顶部的像素。没有页时是 null
     */
    const captureAnchor = (el: HTMLElement): { page: number, offset: number } | null => {
      const top = el.getBoundingClientRect().top
      const nodes = el.querySelectorAll<HTMLElement>('[data-page]')
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        if (rect.bottom > top + 8) {
          return { page: Number(node.dataset.page), offset: rect.top - top }
        }
      }
      return null
    }

    /**
     * 把锚点页放回接页前的相对位置。
     * 上方插入或删除页之后，不修正的话眼前的句子会跳。
     * @param el 滚动容器
     * @param anchor 接页前记下的页和偏移
     */
    const restoreAnchor = (el: HTMLElement, anchor: { page: number, offset: number }) => {
      const node = el.querySelector<HTMLElement>(`[data-page="${anchor.page}"]`)
      if (!node) return
      const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.offset
      if (Math.abs(delta) > 0.5) el.scrollTop += delta
    }

    /**
     * 等两帧，让赋值 scrollTop 引发的滚动事件先过去。
     * @param count 要等的帧数
     */
    const waitFrames = (count: number) => {
      return new Promise<void>((resolve) => {
        const step = (left: number) => {
          if (left <= 0) resolve()
          else requestAnimationFrame(() => step(left - 1))
        }
        step(count)
      })
    }

    /**
     * 换成新的挂页窗口。
     * scrollToTop 用于点上一页、下一页或刚打开：从那一页的开头看。
     * 滚动中接页则保留锚点，避免文字突然挪走。
     * @param next 新窗口
     * @param scrollToTop 为真时滚到窗口开头
     */
    const showWindow = async (next: TextPageWindow, scrollToTop: boolean) => {
      suspendScroll += 1
      const el = contentEl.value
      const anchor = !scrollToTop && el ? captureAnchor(el) : null
      mountedStart.value = next.start
      mountedEnd.value = next.end
      await nextTick()
      const scroller = contentEl.value
      if (scroller) {
        if (scrollToTop) scroller.scrollTop = 0
        else if (anchor) restoreAnchor(scroller, anchor)
      }
      await waitFrames(2)
      suspendScroll = Math.max(0, suspendScroll - 1)
    }

    /**
     * 从某一页重新铺无极窗口，并滚到这一页开头。
     * 点翻页、切换模式、改每页字数都走这里，保证窗口从当前页向后取，而不是把前面的页都挂上。
     * @param page 要开始阅读的页
     */
    const showFromPage = async (page: number) => {
      const total = Math.max(totalPages.value, 1)
      const target = Math.min(Math.max(1, Math.floor(page) || 1), total)
      currentPage.value = target
      extendUpArmed = false
      await showWindow(seedWindowDown(target, total, MAX_MOUNTED_TEXT_PAGES), true)
      updateReadingProgress()
    }

    /**
     * 这一页是否已经完全滚到容器上方。
     * 还露在屏幕里时不能丢掉它，否则正在看的内容会消失。
     * @param el 滚动容器
     * @param page 要检查的页码
     * @returns 完全在可视区域上方时为真
     */
    const isPageOffscreenAbove = (el: HTMLElement, page: number) => {
      const node = el.querySelector<HTMLElement>(`[data-page="${page}"]`)
      if (!node) return true
      return node.getBoundingClientRect().bottom <= el.getBoundingClientRect().top + 1
    }

    /**
     * 这一页是否已经完全滚到容器下方。
     * @param el 滚动容器
     * @param page 要检查的页码
     * @returns 完全在可视区域下方时为真
     */
    const isPageOffscreenBelow = (el: HTMLElement, page: number) => {
      const node = el.querySelector<HTMLElement>(`[data-page="${page}"]`)
      if (!node) return true
      return node.getBoundingClientRect().top >= el.getBoundingClientRect().bottom - 1
    }

    /**
     * 用视口顶部附近的页作为当前页，并通知外层记进度。
     * 无极模式没有「翻到下一页」的点击，进度只能跟着滚动位置走。
     * @param el 滚动容器
     */
    const syncCurrentPageFromScroll = (el: HTMLElement) => {
      const top = el.getBoundingClientRect().top
      const nodes = el.querySelectorAll<HTMLElement>('[data-page]')
      let page = mountedStart.value
      for (const node of nodes) {
        if (node.getBoundingClientRect().bottom > top + 8) {
          page = Number(node.dataset.page) || page
          break
        }
      }
      if (page !== currentPage.value) {
        currentPage.value = page
        updateReadingProgress()
      }
    }

    /**
     * 滚到边缘时接上一页。
     * 每次滚动最多接一页。窗口已经满了，而且要丢掉的那一页还在屏幕里时，这次先不接，
     * 避免短内容把正在看的页抽走，也避免一帧里滑过很多页。
     */
    const handleInfiniteScroll = async () => {
      if (sliding || readMode.value !== 'infinite') return
      const el = contentEl.value
      if (!el || el.clientHeight <= 0) return
      syncCurrentPageFromScroll(el)
      if (el.scrollTop > TEXT_PAGE_EDGE_PX) extendUpArmed = true
      const distanceBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const nearBottom = distanceBottom <= TEXT_PAGE_EDGE_PX && mountedEnd.value < totalPages.value
      const nearTop = extendUpArmed && el.scrollTop <= TEXT_PAGE_EDGE_PX && mountedStart.value > 1
      const currentWindow = { start: mountedStart.value, end: mountedEnd.value }
      const mountedCount = mountedEnd.value - mountedStart.value + 1
      if (nearBottom) {
        if (mountedCount >= MAX_MOUNTED_TEXT_PAGES && !isPageOffscreenAbove(el, mountedStart.value)) return
        const next = extendWindowDown(currentWindow, totalPages.value, MAX_MOUNTED_TEXT_PAGES)
        if (next.start === currentWindow.start && next.end === currentWindow.end) return
        sliding = true
        try {
          await showWindow(next, false)
        } finally {
          sliding = false
        }
        return
      }
      if (!nearTop) return
      if (mountedCount >= MAX_MOUNTED_TEXT_PAGES && !isPageOffscreenBelow(el, mountedEnd.value)) return
      const next = extendWindowUp(currentWindow, totalPages.value, MAX_MOUNTED_TEXT_PAGES)
      if (next.start === currentWindow.start && next.end === currentWindow.end) return
      sliding = true
      try {
        await showWindow(next, false)
      } finally {
        sliding = false
      }
    }

    /**
     * 滚动时延到下一帧再决定要不要接页。
     * 程序自己改滚动位置时直接跳过。
     */
    const onContentScroll = () => {
      if (suspendScroll > 0 || sliding || readMode.value !== 'infinite') return
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        void handleInfiniteScroll()
      })
    }

    /**
     * 方式变了之后重铺内容。
     * 正文还没读出来时先只记下方式，等加载完再铺。
     */
    watch(readMode, async (mode, previous) => {
      if (mode === previous || !novelContent.value || loading.value) return
      if (mode === 'infinite') {
        await showFromPage(currentPage.value)
        return
      }
      await nextTick()
      if (contentEl.value) contentEl.value.scrollTop = 0
    })

    /**
     * 上一页。
     * 无极模式不是只滚一点，而是把窗口改到前一页的开头，和分页的「上一页」含义相同。
     */
    const previousPage = () => {
      if (!canGoPrevious.value) return
      if (readMode.value === 'infinite') {
        void showFromPage(currentPage.value - 1)
        return
      }
      currentPage.value--
      updateReadingProgress()
    }

    /**
     * 下一页。无极模式把窗口改到后一页的开头。
     */
    const nextPage = () => {
      if (!canGoNext.value) return
      if (readMode.value === 'infinite') {
        void showFromPage(currentPage.value + 1)
        return
      }
      currentPage.value++
      updateReadingProgress()
    }

    /**
     * 把当前页和百分比一起交给外层。
     * 先报页码再报进度，外层才能把「第几页」和百分比写成同一次记录。
     */
    const updateReadingProgress = () => {
      emit('page-changed', currentPage.value)
      emit('progress-changed', readingProgress.value)
    }

    // 监听 filePath 变化
    watch(() => props.filePath, () => {
      currentPage.value = props.initialPage
      loadSavedEncoding()
      loadContent()
    })

    // 监听 initialPage 变化
    watch(() => props.initialPage, (newPage) => {
      if (!novelContent.value || newPage === currentPage.value) return
      if (readMode.value === 'infinite') {
        void showFromPage(newPage)
        return
      }
      currentPage.value = Math.min(newPage, totalPages.value)
      updateReadingProgress()
    })

    // 监听 wordsPerPage 变化
    watch(() => props.wordsPerPage, (newValue) => {
      if (newValue !== wordsPerPage.value) {
        wordsPerPage.value = newValue
        if (novelContent.value) {
          totalPages.value = Math.max(1, Math.ceil(novelContent.value.length / wordsPerPage.value))
          if (currentPage.value > totalPages.value) {
            currentPage.value = totalPages.value || 1
          }
          if (readMode.value === 'infinite') {
            void showFromPage(currentPage.value)
          } else {
            updateReadingProgress()
          }
        }
      }
    })

    onMounted(async () => {
      await loadGlobalSettings()
      loadSavedEncoding()
      await loadContent()
    })

    onBeforeUnmount(() => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
    })

    return {
      loading,
      error,
      novelContent,
      currentPage,
      totalPages,
      formattedContent,
      visiblePages,
      readingProgress,
      canGoPrevious,
      canGoNext,
      textStyle,
      contentStyle,
      readMode,
      textEncoding,
      detectedEncoding,
      encodingOptions,
      encodingName,
      contentEl,
      loadContent,
      onEncodingChange,
      previousPage,
      nextPage,
      updateReadingProgress,
      onContentScroll
    }
  }
}
</script>

<style scoped>
.text-reader {
  display: flex;
  flex-direction: row;
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-primary);
}

.encoding-side {
  width: 168px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 12px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.encoding-side-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.encoding-side-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.text-reader-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.text-content {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow-y: auto;
  background: var(--bg-primary);
  /* 关掉浏览器自己的滚动锚定。接页时由阅读器按锚点修正，两边一起调会跳。 */
  overflow-anchor: none;
}

.text-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.nav-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.encoding-select {
  width: 100%;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0 8px;
  font-size: 12px;
  cursor: pointer;
}

.btn-nav {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.3s ease;
  font-size: 0.9rem;
  flex-shrink: 0;
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
  text-align: center;
}

.infinite-flow {
  display: flex;
  flex-direction: column;
}

.novel-page + .novel-page {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
}

.page-marker {
  margin-bottom: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary, var(--text-secondary));
  user-select: none;
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
  color: var(--text-on-accent, #1a1a1a);
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
