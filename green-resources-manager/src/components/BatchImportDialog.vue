<template>
  <div 
    v-if="internalVisible" 
    class="batch-import-overlay" 
    @mousedown="handleOverlayMouseDown"
  >
    <div class="batch-import-content" @mousedown.stop>
      <div class="batch-import__header">
        <div class="batch-import__icon">
          <span>📥</span>
        </div>
        <h3 class="batch-import__title">{{ $lt('批量导入本地资源') }}</h3>
      </div>
      <div class="batch-import__body">
        <!-- 左边放搜索条件，右边放结果。两栏各自滚动，宽屏时不用来回翻。 -->
        <div class="batch-import__config">
          <div class="batch-import__field">
            <span class="batch-import__label">{{ $lt('搜索路径') }}</span>
            <div class="batch-import__path-row">
              <input
                v-model="folderPathInput"
                class="batch-import__path"
                type="text"
                :placeholder="$lt('选择要搜索的文件夹')"
                @keydown.enter.prevent="startSearch"
              />
              <fun-button class="batch-import__button" @click="pickFolder">{{ $lt('选择文件夹') }}</fun-button>
            </div>
            <fun-button
              class="batch-import__button batch-import__button--confirm batch-import__search-button"
              :disabled="!canStartSearch"
              @click="startSearch"
            >{{ searching ? $lt('正在搜索...') : $lt('开始搜索') }}</fun-button>
          </div>

          <div class="batch-import__field">
            <span class="batch-import__label">{{ $lt('导入模式') }}</span>
            <span class="batch-import__hint">{{ importMode === 'folder' ? $lt('只导入文件夹。某一层直接含有所选内容时，就把这一层收成一条资源，不再进入它的子文件夹。') : $lt('按扩展名导入单个文件。') }}</span>
            <div class="batch-import__type-list">
              <label class="batch-import__type" :class="{ 'batch-import__type--active': importMode === 'file' }">
                <input v-model="importMode" type="radio" value="file" class="batch-import__checkbox batch-import__mode-file" />
                <span>{{ $lt('文件模式') }}</span>
              </label>
              <label class="batch-import__type" :class="{ 'batch-import__type--active': importMode === 'folder' }">
                <input v-model="importMode" type="radio" value="folder" class="batch-import__checkbox batch-import__mode-folder" />
                <span>{{ $lt('文件夹模式') }}</span>
              </label>
            </div>
          </div>

          <label class="batch-import__field">
            <span class="batch-import__label">{{ $lt('搜索深度') }}</span>
            <span class="batch-import__hint">{{ $lt('往下最多进入几层子文件夹。0 表示只看选中的文件夹。') }}</span>
            <span class="batch-import__depth-row">
              <input
                v-model.number="searchDepth"
                class="batch-import__number"
                type="number"
                min="0"
                step="1"
                :disabled="unlimitedDepth"
              />
              <label class="batch-import__unlimited">
                <input v-model="unlimitedDepth" type="checkbox" class="batch-import__checkbox" />
                <span>{{ $lt('不限制层数') }}</span>
              </label>
            </span>
          </label>

          <div v-if="importMode === 'file'" class="batch-import__field">
            <span class="batch-import__label">{{ $lt('搜索方式') }}</span>
            <label class="batch-import__unlimited">
              <input
                v-model="stopAtFirstMatch"
                type="checkbox"
                class="batch-import__checkbox batch-import__stop-on-match"
              />
              <span>{{ $lt('本层找到匹配文件后，不再进入子文件夹') }}</span>
            </label>
            <span class="batch-import__hint">{{ $lt('默认勾选，适合每个游戏只在第一层放启动程序的目录。同一层里的文件仍会全部列出来。') }}</span>
          </div>

          <div v-if="importMode === 'file'" class="batch-import__field">
            <span class="batch-import__label">{{ $lt('搜索的文件类型') }}</span>
            <span class="batch-import__hint">{{ $lt('勾选这次要搜索的扩展名，只搜这些文件。') }}</span>
            <div class="batch-import__type-list">
              <label
                v-for="ext in availableExtensions"
                :key="ext"
                class="batch-import__type"
                :class="{ 'batch-import__type--active': selectedExtensions.includes(ext) }"
              >
                <input
                  v-model="selectedExtensions"
                  type="checkbox"
                  :value="ext"
                  class="batch-import__checkbox"
                />
                <span>{{ formatExtension(ext) }}</span>
              </label>
              <span v-if="availableExtensions.length === 0" class="batch-import__hint">{{ $lt('当前页面没有可搜索的文件类型') }}</span>
            </div>
            <span v-if="availableExtensions.length > 0 && selectedExtensions.length === 0" class="batch-import__hint">{{ $lt('至少选择一种文件类型') }}</span>
          </div>

          <div v-else class="batch-import__field">
            <span class="batch-import__label">{{ $lt('文件夹类型') }}</span>
            <span class="batch-import__hint">{{ $lt('勾选要收的文件夹。合集目录本身没有这些文件时，会继续往下找真正放着内容的那一层。') }}</span>
            <div class="batch-import__type-list">
              <label
                v-for="option in folderOptions"
                :key="option.id"
                class="batch-import__type"
                :class="{ 'batch-import__type--active': selectedFolderKindIds.includes(option.id) }"
              >
                <input
                  v-model="selectedFolderKindIds"
                  type="checkbox"
                  :value="option.id"
                  class="batch-import__checkbox"
                />
                <span>{{ $lt(option.label) }}</span>
              </label>
              <span v-if="folderOptions.length === 0" class="batch-import__hint">{{ $lt('当前页面没有可以按文件夹导入的类型') }}</span>
            </div>
            <span v-if="folderOptions.length > 0 && selectedFolderKindIds.length === 0" class="batch-import__hint">{{ $lt('至少选择一种文件夹类型') }}</span>
          </div>

          <div class="batch-import__field">
            <span class="batch-import__label">{{ $lt('排除的文件') }}</span>
            <span class="batch-import__hint">{{ $lt('勾选要跳过的常见程序分类，下面还可以补充自己的名字。') }}</span>
            <div class="batch-import__exclude-groups">
              <label
                v-for="category in exclusionCategories"
                :key="category.id"
                class="batch-import__exclude-group"
                :class="{ 'batch-import__exclude-group--active': checkedCategoryIds.includes(category.id) }"
                :title="`${$lt(category.hint)}\n${category.patterns.join('、')}`"
              >
                <input
                  v-model="checkedCategoryIds"
                  type="checkbox"
                  :value="category.id"
                  class="batch-import__checkbox"
                />
                <span class="batch-import__exclude-group-body">
                  <span class="batch-import__exclude-group-name">{{ $lt(category.label) }}</span>
                  <span class="batch-import__exclude-group-names">{{ category.patterns.join('、') }}</span>
                </span>
              </label>
            </div>
            <textarea
              v-model="excludeText"
              class="batch-import__exclude"
              :placeholder="$lt('额外排除的名字，每行一个')"
              rows="3"
              spellcheck="false"
            ></textarea>
          </div>
        </div>

        <div ref="resultsRef" class="batch-import__results">
          <div v-if="!hasSearched" class="batch-import__empty">{{ $lt('设置好左边的条件后开始搜索，结果会显示在这里') }}</div>
          <div v-else-if="searching" class="batch-import__empty">{{ $lt('正在搜索...') }}</div>
          <div v-else-if="files.length === 0" class="batch-import__empty">{{ searchedMode === 'folder' ? $lt('没有找到匹配的文件夹') : $lt('没有找到匹配的文件') }}</div>
          <template v-else>
            <div class="batch-import__result-count">{{ searchedMode === 'folder' ? $lf('找到 {n} 个文件夹', { n: files.length }) : $lf('找到 {n} 个文件', { n: files.length }) }}</div>
            <div class="batch-import__file-list">
              <label 
                v-for="(file, index) in files" 
                :key="index"
                class="batch-import__file-item"
                :data-file-path="file"
              >
                <input 
                  type="checkbox" 
                  v-model="selectedFiles" 
                  :value="file"
                  class="batch-import__checkbox"
                />
                <BatchImportFileIcon :file="file" :icon="iconForFile(file)" :folder="searchedMode === 'folder'" />
                <span class="batch-import__filename">{{ displayResultName(file) }}</span>
              </label>
            </div>
          </template>
        </div>
      </div>
      <div v-if="importing" class="batch-import__progress">
        <span class="batch-import__progress-text">
          {{ $lt('正在导入') }} {{ importProgress.current }}/{{ importProgress.total }}<template v-if="importProgress.file">：{{ importProgress.file }}</template>
        </span>
        <div class="batch-import__progress-track">
          <div class="batch-import__progress-bar" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>
      <div class="batch-import__footer">
        <!-- 全选固定在弹窗左下角，不跟文件列表一起滚动。 -->
        <label v-if="files.length > 0 && hasSearched && !searching && !importing" class="batch-import__select-all">
          <input
            type="checkbox"
            v-model="isAllSelected"
            class="batch-import__checkbox"
          />
          <span class="batch-import__select-all-text">{{ $lt('全选') }}</span>
        </label>
        <span v-else class="batch-import__footer-spacer"></span>
        <div class="batch-import__footer-actions">
        <fun-button 
          class="batch-import__button batch-import__button--cancel" 
          :disabled="importing"
          @click="handleCancel"
        > {{ $lt('取消') }} </fun-button>
        <fun-button 
          class="batch-import__button batch-import__button--confirm" 
          :disabled="searching || importing"
          @click="handleConfirm"
        > {{ importing ? `${$lt('正在导入')} ${importProgress.current}/${importProgress.total}` : $lt('确认导入') }} </fun-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onBeforeUnmount } from 'vue'
import FunButton from '../fun-ui/basic/Button/FunButton.vue'
import BatchImportFileIcon from './BatchImportFileIcon.vue'
import notify from '../utils/NotificationService.ts'
import { usesNativeFileIcon } from '../utils/fileIcon'
import {
  EXCLUSION_CATEGORIES,
  buildExcludePatterns,
  getDefaultExcludedCategoryIds
} from '../configs/exclusionPresets'

/** exe 图标按完整路径缓存，关掉窗口再打开同一批文件时不用重新取。 */
const nativeIconCache = new Map<string, string>()
/** 同时取几个程序图标。太多会拖慢主进程。 */
const ICON_LOAD_CONCURRENCY = 4

interface NativeIconJob {
  /** 搜索结果里的相对路径，用来更新对应那一行。 */
  file: string
  /** 这一批搜索的标记，换结果后丢掉回来的旧图标。 */
  token: string
  fullPath: string
  generation: number
}

/** 按引擎分好的常见附属程序。默认勾选的分类打开窗口时自动带上。 */
const exclusionCategories = EXCLUSION_CATEGORIES

interface Props {
  /** 窗口是否打开。 */
  visible?: boolean
  /** 最近一次搜索得到的相对路径。 */
  files?: string[]
  /** 这次结果对应的根目录。确认导入时用它拼完整路径，避免搜索后又改了输入框。 */
  folderPath?: string
  /** 主进程是否还在搜索。搜索中不能再次开始，也不能确认。 */
  searching?: boolean
  /** 正在把勾选的文件写进资源库。期间不关窗、不重复确认。 */
  importing?: boolean
  /** 写入进度。current 是已经处理完的数量。 */
  importProgress?: { current: number; total: number; file?: string }
  /** 当前页面接受、可以搜索的扩展名，例如 ['.exe', '.swf', '.bat']。 */
  availableExtensions?: string[]
  /** 文件夹模式可以勾选的类型。文件模式不用它。 */
  folderOptions?: { id: string; label: string; extensions: string[] }[]
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  files: () => [],
  folderPath: '',
  searching: false,
  importing: false,
  importProgress: () => ({ current: 0, total: 0 }),
  availableExtensions: () => [],
  folderOptions: () => []
})

const emit = defineEmits<{
  close: []
  confirm: [files: string[], folderPath: string]
  search: [options: {
    folderPath: string
    maxDepth: number | null
    excludePatterns: string[]
    extensions: string[]
    stopAtFirstMatch: boolean
    /** file 搜单个文件，folder 只收含有目标内容的文件夹。 */
    mode: 'file' | 'folder'
    /** 文件夹模式勾选的类型。文件模式为空。 */
    folderGroups: { id: string; extensions: string[] }[]
  }]
}>()

/** 遮罩是否显示。和 props.visible 同步，关闭时先收起再通知外面。 */
const internalVisible = ref(false)
/** 勾选了准备导入的相对路径。 */
const selectedFiles = ref<string[]>([])
/** 往下进入的子文件夹层数。0 只看选中的文件夹，默认 3 层。 */
const searchDepth = ref(3)
/** 勾上后不把层数传给搜索，一直往下找。 */
const unlimitedDepth = ref(false)
/** 某个文件夹本层找到匹配后，是否还进入它的子文件夹。默认不再往下。 */
const stopAtFirstMatch = ref(true)
/** 这次要搜索的扩展名。打开窗口时默认全选当前页面支持的类型。 */
const selectedExtensions = ref<string[]>([])
/** 文件模式搜单个文件，文件夹模式只收文件夹。默认仍是原来的文件搜索。 */
const importMode = ref<'file' | 'folder'>('file')
/** 最近一次搜索用的模式。结果文案跟着它，避免搜完又改模式时把文件夹显示成文件。 */
const searchedMode = ref<'file' | 'folder'>('file')
/** 文件夹模式勾选的类型。打开窗口时默认全选当前页面能用的项。 */
const selectedFolderKindIds = ref<string[]>([])
/** 勾选的排除分类。打开窗口时恢复默认勾选。 */
const checkedCategoryIds = ref<string[]>(getDefaultExcludedCategoryIds())
/** 分类之外自己补充的名字。一行一个片段。 */
const excludeText = ref('')
/** 输入框里的搜索路径。和结果对应的 folderPath 分开，改了路径必须重新搜索。 */
const folderPathInput = ref('')
/** 这次打开后是否已经点过搜索。没搜过时下面只显示说明。 */
const hasSearched = ref(false)
/** 结果列表容器，滚到附近时才给 exe 取程序图标。 */
const resultsRef = ref<HTMLElement | null>(null)
/** 相对路径 -> 程序图标 data URL。只有 exe 和 lnk 会出现在这里。 */
const nativeIcons = ref<Record<string, string>>({})
/** 每次换一批搜索结果就加一，旧请求回来时直接丢掉。 */
let iconGeneration = 0
/** 已经排队的图标请求，避免同一行重复取。 */
const pendingIconTokens = new Set<string>()
let iconQueue: NativeIconJob[] = []
let activeIconLoads = 0
/** 只观察结果列表里离屏幕不远的 exe 行。 */
let rowObserver: IntersectionObserver | null = null

/** 结果是否已经全部勾上。点一下在全选和清空之间切换。 */
const isAllSelected = computed({
  get: () => {
    return props.files.length > 0 && selectedFiles.value.length === props.files.length
  },
  set: (value: boolean) => {
    selectedFiles.value = value ? [...props.files] : []
  }
})

/** 路径和类型都齐了才能搜。文件夹模式看文件夹类型，不再要求勾扩展名。 */
const canStartSearch = computed(() => {
  if (props.searching || !folderPathInput.value.trim()) return false
  if (importMode.value === 'folder') return selectedFolderKindIds.value.length > 0
  return selectedExtensions.value.length > 0
})

/** 进度条宽度。总数还没拿到时保持 0。 */
const progressPercent = computed(() => {
  const total = props.importProgress?.total || 0
  const current = props.importProgress?.current || 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((current / total) * 100))
})

watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    resetForm()
    internalVisible.value = true
    document.addEventListener('keydown', handleKeydown)
    nextTick(() => observeVisibleRows())
  } else {
    internalVisible.value = false
    stopObservingRows()
    resetNativeIcons()
    document.removeEventListener('keydown', handleKeydown)
  }
})

watch(() => props.files, (files: string[]) => {
  // 新结果默认全选。人可以再取消不想导入的几项。
  selectedFiles.value = [...files]
  resetNativeIcons()
  observeVisibleRows()
}, { flush: 'post' })

// 搜索结束后结果才真正显示出来，这时再挂观察器，免得行还没渲染就找不到。
watch(() => props.searching, (searching: boolean) => {
  if (!searching) observeVisibleRows()
}, { flush: 'post' })

// 开始写入了就别再抢主进程去取程序图标，把线程留给指纹和文件夹大小。
watch(() => props.importing, (importing: boolean) => {
  if (!importing) return
  stopObservingRows()
  iconGeneration += 1
  pendingIconTokens.clear()
  iconQueue = []
})

/**
 * 把搜索结果拼成主进程能打开的完整路径。
 * 结果里是相对路径，folderPath 是这次搜索的根目录。
 */
function resolveFullPath(file: string): string {
  const root = props.folderPath
  if (!root) return file
  const separator = root.includes('\\') ? '\\' : '/'
  const trimmedRoot = root.replace(/[\\/]+$/, '')
  const relative = file.replace(/^[\\/]+/, '')
  if (!trimmedRoot) return `${separator}${relative}`
  return `${trimmedRoot}${separator}${relative}`
}

/** 取某一行的程序图标，没取到时返回空串，组件会显示内置图标。 */
function iconForFile(file: string): string {
  return nativeIcons.value[file] || ''
}

/** 换一批结果时清掉旧图标和排队，主进程里正在进行的请求会自动作废。 */
function resetNativeIcons() {
  iconGeneration += 1
  nativeIcons.value = {}
  pendingIconTokens.clear()
  iconQueue = []
}

/** 只有 exe 和 lnk 需要向系统取图标，其他类型直接用内置 SVG。 */
function queueNativeIcon(file: string) {
  if (!usesNativeFileIcon(file) || !window.electronAPI?.getFileIcon) return
  if (nativeIcons.value[file]) return

  const token = `${iconGeneration}:${file}`
  if (pendingIconTokens.has(token)) return

  const fullPath = resolveFullPath(file)
  const cached = nativeIconCache.get(fullPath.toLowerCase())
  if (cached) {
    nativeIcons.value = { ...nativeIcons.value, [file]: cached }
    return
  }

  pendingIconTokens.add(token)
  iconQueue.push({ file, token, fullPath, generation: iconGeneration })
  pumpIconQueue()
}

function pumpIconQueue() {
  while (activeIconLoads < ICON_LOAD_CONCURRENCY && iconQueue.length > 0) {
    const job = iconQueue.shift()
    if (!job) break
    activeIconLoads += 1
    void loadNativeIcon(job)
  }
}

async function loadNativeIcon(job: NativeIconJob) {
  try {
    const result = await window.electronAPI?.getFileIcon?.(job.fullPath, 32)
    if (job.generation !== iconGeneration) return
    if (result?.success && result.icon) {
      nativeIconCache.set(job.fullPath.toLowerCase(), result.icon)
      nativeIcons.value = { ...nativeIcons.value, [job.file]: result.icon }
    }
  } catch (error) {
    console.warn('[BatchImportDialog] 读取程序图标失败:', error)
  } finally {
    pendingIconTokens.delete(job.token)
    activeIconLoads -= 1
    pumpIconQueue()
  }
}

function stopObservingRows() {
  rowObserver?.disconnect()
  rowObserver = null
}

/**
 * 结果多的时候不一次把所有 exe 图标都读出来。
 * 只观察离可见区域不远的那几行，滚到附近再取，列表还是能马上显示。
 */
function observeVisibleRows() {
  stopObservingRows()
  const root = resultsRef.value
  if (!root || props.files.length === 0) return

  if (typeof IntersectionObserver === 'undefined') {
    props.files.forEach(queueNativeIcon)
    return
  }

  rowObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const file = (entry.target as HTMLElement).dataset.filePath
      if (file) queueNativeIcon(file)
      rowObserver?.unobserve(entry.target)
    }
  }, { root, rootMargin: '80px 0px' })

  root.querySelectorAll<HTMLElement>('[data-file-path]').forEach(row => {
    const file = row.dataset.filePath
    if (file && usesNativeFileIcon(file)) rowObserver?.observe(row)
  })
}

/**
 * 每次重新打开都回到默认条件。
 * 上一次的路径和结果不留着，避免把别的页面搜到的文件导入到当前页。
 */
function resetForm() {
  searchDepth.value = 3
  unlimitedDepth.value = false
  stopAtFirstMatch.value = true
  importMode.value = 'file'
  searchedMode.value = 'file'
  selectedExtensions.value = [...props.availableExtensions]
  selectedFolderKindIds.value = props.folderOptions.map(option => option.id)
  checkedCategoryIds.value = getDefaultExcludedCategoryIds()
  excludeText.value = ''
  folderPathInput.value = ''
  hasSearched.value = false
  selectedFiles.value = []
  stopObservingRows()
  resetNativeIcons()
}

/**
 * 合并勾选分类里的名字和输入框里的自定义名字。
 * 空行丢掉，重复的名字只留一份。
 * @returns 搜索时按「名字里包含这段」跳过的片段
 */
function readExcludePatterns(): string[] {
  return buildExcludePatterns(checkedCategoryIds.value, excludeText.value)
}

/** 扩展名显示成大写，去掉前面的点。 */
function formatExtension(ext: string): string {
  return ext.replace(/^\./, '').toUpperCase()
}

/**
 * 让系统弹出文件夹选择框，把选中的路径填进输入框。
 * 只填路径，不立刻搜索，方便先改深度和排除名单。
 */
async function pickFolder() {
  if (!window.electronAPI?.selectFolder) {
    notify.toast('error', '操作失败', '当前环境不支持选择文件夹')
    return
  }
  const folderResult = await window.electronAPI.selectFolder()
  if (folderResult.success && folderResult.path) {
    folderPathInput.value = folderResult.path
  }
}

/** 根目录被收成一条资源时，相对路径是点号，列表里改成看得懂的名字。 */
function displayResultName(file: string): string {
  if (searchedMode.value === 'folder' && (file === '.' || file === '')) return '（当前文件夹）'
  return file
}

/**
 * 按当前条件开始搜索。
 * 层数勾了不限制就传 null。没勾时用输入的整数，空的或负数当成 0。
 * 文件夹模式不传扩展名，只传勾选的文件夹类型。
 */
function startSearch() {
  const folderPath = folderPathInput.value.trim()
  if (!canStartSearch.value) return
  /** 传给搜索的层数。null 表示一直往下找。 */
  let maxDepth: number | null = null
  if (!unlimitedDepth.value) {
    const depthNumber = Number(searchDepth.value)
    maxDepth = Number.isFinite(depthNumber) ? Math.max(0, Math.floor(depthNumber)) : 3
  }
  /** 文件夹模式只把勾选的类型交给搜索，不再带文件扩展名。 */
  const folderGroups = importMode.value === 'folder'
    ? props.folderOptions
      .filter(option => selectedFolderKindIds.value.includes(option.id))
      .map(option => ({ id: option.id, extensions: [...option.extensions] }))
    : []
  hasSearched.value = true
  searchedMode.value = importMode.value
  emit('search', {
    folderPath,
    maxDepth,
    excludePatterns: readExcludePatterns(),
    extensions: importMode.value === 'folder' ? [] : [...selectedExtensions.value],
    stopAtFirstMatch: importMode.value === 'folder' ? true : stopAtFirstMatch.value,
    mode: importMode.value,
    folderGroups
  })
}

function handleCancel() {
  // 写入过程中不允许关窗，否则人以为取消了，后台还在往存档里加。
  if (props.importing) return
  internalVisible.value = false
  emit('close')
  document.removeEventListener('keydown', handleKeydown)
}

function handleConfirm() {
  if (props.searching || props.importing) return
  // 一个都没勾时也给个提示，不然点了没反应像卡住。
  if (selectedFiles.value.length === 0) {
    notify.toast('warning', '提示', searchedMode.value === 'folder' ? '请先勾选要导入的文件夹' : '请先勾选要导入的文件')
    return
  }
  // 传副本：写入期间列表里的勾选变化不能影响正在处理的这一批。
  emit('confirm', [...selectedFiles.value], props.folderPath)
}

function handleOverlayMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleCancel()
  }
}

onBeforeUnmount(() => {
  stopObservingRows()
  resetNativeIcons()
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.batch-import-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  backdrop-filter: blur(4px);
}

.batch-import-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 94%;
  max-width: 1120px;
  height: min(86vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: batch-import-slide-in var(--transition-slow) ease-out;
  border: 1px solid var(--border-color);
}

@keyframes batch-import-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.batch-import__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.batch-import__icon {
  font-size: var(--font-size-2xl);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  
  span {
    display: block;
  }
}

.batch-import__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.batch-import__body {
  padding: var(--spacing-xl) var(--spacing-2xl);
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--spacing-xl);
  overflow: hidden;
}

.batch-import__config {
  width: 372px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  overflow-y: auto;
  padding-right: 4px;
}

.batch-import__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.batch-import__label {
  color: var(--text-primary);
  font-weight: 600;
}

.batch-import__hint {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.batch-import__depth-row,
.batch-import__path-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.batch-import__number,
.batch-import__path,
.batch-import__exclude {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-size: var(--font-size-base);
}

.batch-import__number {
  width: 96px;
}

.batch-import__number:disabled,
.batch-import__path:disabled {
  opacity: 0.6;
}

.batch-import__unlimited {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.batch-import__exclude {
  width: 100%;
  resize: vertical;
  min-height: 66px;
  font-family: Consolas, 'Courier New', monospace;
  line-height: 1.45;
}

.batch-import__exclude-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px;
}

.batch-import__type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.batch-import__type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  user-select: none;

  .batch-import__checkbox {
    width: 14px;
    height: 14px;
  }
}

.batch-import__type--active {
  border-color: var(--accent-color);
  background: var(--bg-tertiary);
}

.batch-import__search-button {
  width: 100%;
  margin-top: 2px;
}

.batch-import__exclude-group {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  cursor: pointer;
  user-select: none;
  min-width: 0;

  .batch-import__checkbox {
    margin-top: 2px;
    flex-shrink: 0;
  }
}

.batch-import__exclude-group--active {
  border-color: var(--accent-color);
  background: var(--bg-tertiary);
}

.batch-import__exclude-group-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.batch-import__exclude-group-name {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.batch-import__exclude-group-names {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-import__path {
  flex: 1;
  min-width: 0;
}

.batch-import__results {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--border-color);
  padding-left: var(--spacing-xl);
}

@media (max-width: 900px) {
  .batch-import__body {
    flex-direction: column;
    overflow-y: auto;
  }

  .batch-import__config {
    width: 100%;
    overflow: visible;
  }

  .batch-import__results {
    min-height: 320px;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-left: 0;
    padding-top: var(--spacing-md);
  }
}

.batch-import__result-count {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: var(--spacing-sm);
}

.batch-import__empty {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-2xl) var(--spacing-md);
}

.batch-import__select-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-right: auto;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.batch-import__select-all-text {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 500;
}

.batch-import__file-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.batch-import__file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  
  &:hover {
    background: var(--bg-tertiary);
  }
}

.batch-import__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.batch-import__filename {
  flex: 1;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  word-break: break-all;
}

.batch-import__progress {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-2xl) 0;
  flex-shrink: 0;
}

.batch-import__progress-text {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  word-break: break-all;
}

.batch-import__progress-track {
  height: 6px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.batch-import__progress-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--primary-color);
  transition: width var(--transition-fast);
}

.batch-import__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.batch-import__footer-spacer {
  margin-right: auto;
}

.batch-import__footer-actions {
  display: flex;
  gap: var(--spacing-md);
}

.batch-import__button {
  min-width: 80px;
  flex-shrink: 0;
  
  &--cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--accent-color);
    }
  }
  
  &--confirm {
    background: var(--accent-color);
    color: var(--text-on-accent, #1a1a1a);
    
    &:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
}
</style>
