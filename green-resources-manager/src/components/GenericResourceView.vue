<template>
  <div class="generic-resource-view">
    <BaseView 
      ref="baseView" 
      :items="items" 
      :filtered-items="filteredItems" 
      :empty-state-config="emptyStateConfig"
      :toolbar-config="toolbarConfig" 
      :context-menu-items="contextMenuItems"
      :pagination-config="paginationConfig" 
      :sort-by="sortBy" 
      :search-query="searchQuery"
      :scale="scale" 
      :show-layout-control="true"
      :is-multi-select-mode="isMultiSelectMode"
      @update:scale="updateScale"
      @empty-state-action="handleEmptyStateAction" 
      @add-item="showAddDialogHandler" 
      @button-click="handleButtonClick"
      @sort-changed="handleSortChanged"
      @search-query-changed="handleSearchQueryChanged" 
      @sort-by-changed="handleSortByChanged"
      @context-menu-click="handleContextMenuClick" 
      @page-change="handlePageChange"
      @toggle-multi-select="toggleMultiSelectMode">
      
    <!-- 主内容区域 -->
    <!-- 直接使用 div + useDragAndDrop，避免 FunDropZone 组件的性能问题 -->
    <div 
      class="resource-content"
      :class="{ 'drag-over': isDragOver }"
      @drop="handleDragDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <!-- 使用 FunGrid 组件进行布局 -->
      <FunGrid
        v-if="paginatedItems.length > 0"
        mode="auto-fill"
        :scale="scale"
        :baseWidth="displayLayoutBaseWidth"
        :minScaledWidth="displayLayoutMinWidth"
        :maxScaledWidth="displayLayoutMaxWidth"
        gap="20px"
        padding="10px 20px"
        :singleColumnOnMobile="true"
        :customStyle="customLayoutStyle"
        :class="{ 'is-dragging': isDragOver }"
      >
        <MediaCard
          v-for="item in paginatedItems"
          :key="item.id?.value || item.id"
          :item="item"
          :type="(resourceType || 'game').toLowerCase()"
          :is-electron-environment="isElectronEnvironment"
          :file-exists="getFileExists(item)"
          :scale="scale"
          :is-running="isResourceRunning(item)"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isItemSelected(item)"
          @click="() => (this as any).showDetail(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
          @action="handleResourceAction"
          @toggle-select="() => toggleSelectItem(item)"
        />
      </FunGrid>
      <div v-else class="empty-grid" :class="{ 'is-dragging': isDragOver }"></div>
    </div>
    </BaseView>
    
    <!-- 详情面板 -->
    <DetailPanel
      :visible="showDetailDialog && !!selectedItem"
      :item="selectedItem"
      :type="detailPanelType"
      :is-running="selectedItem ? isResourceRunning(selectedItem) : false"
      :on-update-resource="updateResource"
      @close="closeDetail"
      @action="handleDetailAction"
    >
      <!-- 图片/漫画预览（Image/Manga 类型） -->
      <template #extra>
        <AlbumPagesGrid
          v-if="shouldShowPreview"
          :pages="detailPages"
          :currentPage="detailCurrentPage"
          :pageSize="detailPageSize"
          :totalPages="detailTotalPages"
          :resolveImage="resolveImage"
          :handleImageError="handleImageError"
          @page-click="handleDetailPageClick"
          @page-change="handleDetailPageChange"
        />
        <!-- 番剧/文件夹视频列表（Anime 类型，用于替换视频页） -->
        <FolderVideosGrid
          v-else-if="isAnimeWithFolderVideos"
          :videos="selectedItem?.folderVideos || []"
          :get-thumbnail-url="getThumbnailUrlForFolderVideo"
          :handle-thumbnail-error="handleFolderVideoThumbnailError"
          @play-video="playFolderVideo"
          @generate-thumbnail="generateFolderVideoThumbnail"
        />
      </template>
    </DetailPanel>
    
    <!-- 添加资源对话框 -->
    <ResourcesEditDialog
      :visible="showAddDialog"
      mode="add"
      :resource-class="ResourceClass"
      :is-electron-environment="isElectronEnvironment"
      :available-tags="allTags"
      :available-tags-by-field="availableTagsByField"
      :enable-engine-auto-detect="dialogConfig.enableEngineAutoDetect"
      :enable-screenshot-cover="dialogConfig.enableScreenshotCover"
      :add-title="dialogConfig.addTitle"
      :edit-title="dialogConfig.editTitle"
      :add-button-text="dialogConfig.addButtonText"
      :edit-button-text="dialogConfig.editButtonText"
      @close="closeAddDialog"
      @confirm="handleAddConfirm"
    />
    
    <!-- 编辑资源对话框 -->
    <ResourcesEditDialog
      :visible="showEditDialog"
      mode="edit"
      :resource-class="ResourceClass"
      :resource-data="editForm"
      :is-electron-environment="isElectronEnvironment"
      :available-tags="allTags"
      :available-tags-by-field="availableTagsByField"
      :enable-engine-auto-detect="dialogConfig.enableEngineAutoDetect"
      :enable-screenshot-cover="dialogConfig.enableScreenshotCover"
      :add-title="dialogConfig.addTitle"
      :edit-title="dialogConfig.editTitle"
      :add-button-text="dialogConfig.addButtonText"
      :edit-button-text="dialogConfig.editButtonText"
      @close="closeEdit"
      @confirm="handleEditConfirm"
    />
    
    <!-- 漫画/图片查看器（用于 Image/Manga 资源类型） -->
    <ComicViewer
      :visible="showComicViewer"
      :album="currentAlbum"
      :pages="pages"
      :initial-page-index="currentPageIndex"
      @close="closeComicViewer"
      @page-change="handleComicViewerPageChange"
    />
    
    <!-- 小说阅读器（用于 Novel 资源类型） -->
    <div v-if="showNovelReader && currentReadingNovel" class="novel-reader-overlay" @click="closeNovelReader">
      <div class="novel-reader-content" @click.stop>
        <div class="reader-header">
          <div class="reader-title">
            <h3>{{ getNovelName(currentReadingNovel) }}</h3>
            <p class="reader-author">{{ getNovelAuthor(currentReadingNovel) }}</p>
          </div>
          <div class="reader-controls">
            <button class="btn-close-reader" @click="closeNovelReader" title="关闭阅读器">
              <span class="btn-icon">✕</span>
            </button>
          </div>
        </div>
        <div class="reader-content" ref="readerContent">
          <!-- PDF 文件使用 PDF 阅读器 -->
          <PdfReader
            v-if="getNovelFileType(currentReadingNovel) === 'pdf'"
            :file-path="getNovelFilePath(currentReadingNovel)"
            :initial-page="getNovelCurrentPage(currentReadingNovel) || 1"
            @page-changed="handlePdfPageChanged"
          />
          <!-- TXT 文件使用文本阅读器 -->
          <TextReader
            v-else-if="getNovelFileType(currentReadingNovel) === 'txt'"
            :file-path="getNovelFilePath(currentReadingNovel)"
            :initial-page="getNovelCurrentPage(currentReadingNovel) || 1"
            @page-changed="handleTextPageChanged"
            @progress-changed="handleTextProgressChanged"
          />
        </div>
      </div>
    </div>
    
    <!-- EPUB阅读器V2（用于 Novel 资源类型） -->
    <div v-if="showEbookReaderV2" class="novel-reader-overlay" @click="closeEbookReaderV2">
      <div class="novel-reader-content" @click.stop>
        <div class="reader-header">
          <div class="reader-title">
            <h3>{{ getNovelNameByPath(ebookReaderV2FilePath) }}</h3>
          </div>
          <div class="reader-controls">
            <button class="btn-close-reader" @click="closeEbookReaderV2" title="关闭阅读器">
              <span class="btn-icon">✕</span>
            </button>
          </div>
        </div>
        <div class="reader-content-wrapper ebook-reader-v2-content">
          <!-- 左侧章节导航栏 -->
          <div class="chapter-navigation-sidebar">
            <div class="chapter-nav-header">
              <h4>章节列表</h4>
            </div>
            <ContentView
              :ifShowContent="true"
              :navigation="ebookNavigation"
              :bookAvailable="ebookBookAvailable"
              @jumpTo="handleEbookJumpTo"
            />
          </div>
          <!-- 右侧阅读器 -->
          <div class="reader-content-main">
            <EbookReader
              ref="ebookReaderRef"
              :file-path="ebookReaderV2FilePath"
              @close="closeEbookReaderV2"
              @navigation-updated="handleNavigationUpdated"
              @rendition-ready="handleRenditionReady"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 路径更新确认对话框 -->
    <PathUpdateDialog
      :visible="showPathUpdateDialog"
      :title="pathUpdateDialogTitle"
      :description="pathUpdateDialogDescription"
      :item-name-label="pathUpdateItemNameLabel"
      :item-name="pathUpdateItemName"
      :old-path="pathUpdateOldPath"
      :new-path="pathUpdateNewPath"
      :missing-label="pathUpdateMissingLabel"
      :found-label="pathUpdateFoundLabel"
      :question="pathUpdateQuestion"
      @confirm="confirmPathUpdate"
      @cancel="closePathUpdateDialog"
    />

    <!-- 刮削补全对话框 -->
    <ScraperUpdateDialog
      :visible="showScraperDialog"
      :matches="scraperMatches"
      :current-item="scraperCurrentItem"
      @confirm="confirmScraperUpdate"
      @cancel="closeScraperDialog"
    />

    <!-- 批量增加tag对话框 -->
    <BatchAddTagDialog
      :visible="showBatchAddTagDialog"
      @close="closeBatchAddTagDialog"
      @confirm="handleBatchAddTagConfirm"
    />

    <!-- 批量删除tag对话框 -->
    <BatchDeleteTagDialog
      :visible="showBatchDeleteTagDialog"
      @close="closeBatchDeleteTagDialog"
      @confirm="handleBatchDeleteTagConfirm"
    />

    <!-- 批量删除确认对话框 -->
    <BatchDeleteConfirmDialog
      :visible="showBatchDeleteConfirmDialog"
      :count="selectedItems.size"
      @close="closeBatchDeleteConfirmDialog"
      @confirm="handleBatchDeleteConfirm"
    />
    
    <!-- 强制结束程序确认对话框 -->
    <div v-if="showTerminateConfirmDialog" class="modal-overlay" @click="closeTerminateConfirmDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>强制结束程序</h3>
          <button class="btn-close" @click="closeTerminateConfirmDialog">✕</button>
        </div>
        <div class="modal-body">
          <p>确定要强制结束程序 <strong>{{ terminateResourceName }}</strong> 吗？</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
            此操作将立即终止程序进程，未保存的数据可能会丢失。
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeTerminateConfirmDialog">取消</button>
          <button class="btn-confirm" @click="confirmTerminateGame" style="background: #ef4444;">确认结束</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 批量导入对话框 -->
  <BatchImportDialog
    ref="batchImportDialogRef"
    :visible="showBatchImportDialog"
    :files="batchImportFiles"
    :folder-path="batchImportFolderPath"
    @close="closeBatchImportDialog"
    @confirm="handleBatchImportConfirm"
  />
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, watch, toRefs } from 'vue'
import BaseView from './BaseView.vue'
import MediaCard from './MediaCard.vue'
import DetailPanel from './DetailPanel.vue'
import AlbumPagesGrid from './image/AlbumPagesGrid.vue'
import ComicViewer from './ComicViewer.vue'
import PdfReader from './PdfReader.vue'
import TextReader from './TextReader.vue'
import EbookReader from './epub-reader-v2/EbookReader.vue'
import ContentView from './epub-reader-v2/ContentView.vue'
import PathUpdateDialog from './PathUpdateDialog.vue'
import BatchImportDialog from './BatchImportDialog.vue'
import BatchAddTagDialog from './BatchAddTagDialog.vue'
import BatchDeleteTagDialog from './BatchDeleteTagDialog.vue'
import BatchDeleteConfirmDialog from './BatchDeleteConfirmDialog.vue'
import { createResourcePage } from '../composables/createResourcePage'
// // import { FunDropZone } from '../fun-ui'  // 临时移除，避免性能问题  // 临时移除，避免性能问题
import FunGrid from '../fun-ui/layout/Grid/FunGrid.vue'
import { useDragAndDrop } from '../composables/useDragAndDrop'
// 资源类导入
import { Game } from '@resources/game.ts'
import { Software } from '@resources/soft.ts'
import { Manga } from '@resources/manga.ts'
import { SingleImage } from '@resources/singleImage.ts'
import { Video } from '@resources/video.ts'
import { VideoFolder } from '@resources/videoFolder.ts'
import { Novel } from '@resources/novel.ts'
import { Website } from '@resources/website.ts'
import { Audio } from '@resources/audio.ts'
import { Other } from '@resources/other.ts'
// 页面配置类导入
import { GamePage } from '../configs/pages/GamePage.ts'
import { SoftwarePage } from '../configs/pages/SoftwarePage.ts'
import { ImagePage } from '../configs/pages/ImagePage.ts'
import { SingleImagePage } from '../configs/pages/SingleImagePage.ts'
import { VideoPage } from '../configs/pages/VideoPage.ts'
import { AnimePage } from '../configs/pages/AnimePage.ts'
import { NovelPage } from '../configs/pages/NovelPage.ts'
import { WebsitePage } from '../configs/pages/WebsitePage.ts'
import { AudioPage } from '../configs/pages/AudioPage.ts'
import { OtherPage } from '../configs/pages/OtherPage.ts'
import { executeActionHandler, getActionHandler, type ActionHandlerContext } from '../utils/ResourceActionHandlers'
import { useGameRunningStore } from '../stores/game-running'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import notify from '../utils/NotificationService.ts'
import saveManager from '../utils/SaveManager.ts'
import { calculateAndUpdateResourceSize, calculateResourceSizesBatch } from '../utils/ResourceSizeService.ts'
import { getGameScreenshotFolderPath, useGameScreenshot } from '../composables/game/useGameScreenshot'
import { useResourceFilter } from '../composables/useResourceFilter'
import { useImagePages } from '../composables/image/useImagePages'
import { useImageCache } from '../composables/image/useImageCache'
import { useVideoDuration } from '../composables/video/useVideoDuration'
import { useAudioDuration } from '../composables/audio/useAudioDuration'
import { useVideoFolder } from '../composables/video/useVideoFolder'
import { useVideoPlayback } from '../composables/video/useVideoPlayback'
import { useVideoThumbnail } from '../composables/video/useVideoThumbnail'
import FolderVideosGrid from './video/FolderVideosGrid.vue'
import ResourcesEditDialog from './ResourcesEditDialog.vue'
import ScraperUpdateDialog from './ScraperUpdateDialog.vue'
import type { FilterItem } from '../types/filter'

// 刮削数据专有字段，不写入主存档
const SCRAPER_ONLY_KEYS = ['resourceFileName', 'resourceFolderName']

// 资源类型 -> 刮削库表名
const RESOURCE_TYPE_TO_SCRAPER_TABLE: Record<string, string> = {
  Game: 'games',
  Software: 'software',
  Image: 'manga',
  Manga: 'manga',
  SingleImage: 'singleImage',
  Video: 'video',
  Anime: 'videoFolder',
  Novel: 'novel',
  Website: 'website',
  Audio: 'audio',
  Other: 'other'
}

// 资源类型到资源类和页面配置的映射
const resourceClassMap: Record<string, { resourceClass: any; pageClass: any }> = {
  Game: {
    resourceClass: Game,
    pageClass: GamePage
  },
  Software: {
    resourceClass: Software,
    pageClass: SoftwarePage
  },
  Image: {
    resourceClass: Manga,
    pageClass: ImagePage
  },
  Manga: {
    resourceClass: Manga,
    pageClass: ImagePage
  },
  SingleImage: {
    resourceClass: SingleImage,
    pageClass: SingleImagePage
  },
  Video: {
    resourceClass: Video,
    pageClass: VideoPage
  },
  Anime: {
    resourceClass: VideoFolder, // 番剧使用文件夹结构
    pageClass: AnimePage
  },
  Novel: {
    resourceClass: Novel,
    pageClass: NovelPage
  },
  Website: {
    resourceClass: Website,
    pageClass: WebsitePage
  },
  Audio: {
    resourceClass: Audio,
    pageClass: AudioPage
  },
  Other: {
    resourceClass: Other, // Other 类型使用独立的 Other 资源类
    pageClass: OtherPage
  }
}

export default defineComponent({
  name: 'GenericResourceView',
  components: {
    BaseView,
    MediaCard,
    DetailPanel,
    AlbumPagesGrid,
    ComicViewer,
    PdfReader,
    TextReader,
    EbookReader,
    ContentView,
    ResourcesEditDialog,
    PathUpdateDialog,
    ScraperUpdateDialog,
    FolderVideosGrid,
    BatchImportDialog,
    BatchAddTagDialog,
    BatchDeleteTagDialog,
    BatchDeleteConfirmDialog,
    // FunDropZone,  // 临时移除，避免性能问题
    FunGrid
  },
  emits: ['filter-data-updated'],
  props: {
    pageConfig: {
      type: Object,
      required: false,
      default: null
    },
    resourceType: {
      type: String,
      required: false,
      default: null
    },
    items: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { emit }) {
    // 从 pageConfig 或 resourceType prop 获取资源类型
    const resourceType = computed(() => {
      return props.pageConfig?.type || props.resourceType || 'Game'
    })
    
    // 获取资源类和页面配置类
    const resourceConfig = resourceClassMap[resourceType.value]
    if (!resourceConfig) {
      console.error(`未找到资源类型 ${resourceType.value} 的配置`)
      return {
        items: ref([]),
        filteredItems: ref([]),
        searchQuery: ref(''),
        sortBy: ref('name-asc'),
        scale: ref(100),
        paginatedItems: ref([]),
        emptyStateConfig: {},
        toolbarConfig: {},
        contextMenuItems: [],
        paginationConfig: {},
        isElectronEnvironment: ref(false)
      }
    }

    const ResourceClass = resourceConfig.resourceClass
    const pageConfig = new resourceConfig.pageClass()

    // 获取对话框配置
    const dialogConfig = pageConfig.getDialogConfig?.() || {
      addTitle: '添加资源',
      editTitle: '编辑资源',
      addButtonText: '添加',
      editButtonText: '保存修改'
    }

    // 当前资源类型是否使用 launchExecutable（游戏、软件等可执行程序），用于运行状态与时长追踪
    const supportsRunningTracking = computed(() =>
      ResourceClass?.actionConfig?.handlerName === 'launchExecutable'
    )

    // 响应式数据
    const items = ref<any[]>([])
    const isElectronEnvironment = ref(!!(typeof window !== 'undefined' && (window as any).electronAPI))
    const searchQuery = ref('')
    const sortBy = ref('name-asc')
    
    // 多选模式相关
    const isMultiSelectMode = ref(false)
    const selectedItems = ref<Set<string>>(new Set())
    
    // 数据加载状态
    const isLoadingData = ref(false)
    
    // 批量导入对话框相关
    const showBatchImportDialog = ref(false)
    const batchImportFiles = ref<string[]>([])
    const batchImportFolderPath = ref<string>('')
    const batchImportDialogRef = ref<any>(null)

    // 批量增加tag对话框相关
    const showBatchAddTagDialog = ref(false)

    // 批量删除tag对话框相关
    const showBatchDeleteTagDialog = ref(false)

    // 批量删除确认对话框相关
    const showBatchDeleteConfirmDialog = ref(false)

    const { getVideoDuration } = useVideoDuration()
    const { getAudioDuration } = useAudioDuration()

    // 番剧页面：文件夹视频列表、播放、缩略图（用于替换视频页时展示集数列表）
    const videoFolderComposable = useVideoFolder(props.pageConfig?.id)
    const videoPlaybackComposable = useVideoPlayback()
    const videoThumbnailComposable = useVideoThumbnail()
    
    /**
     * 从文件路径提取资源名称
     */
    const extractNameFromPath = (filePath: string): string => {
      if (!filePath) return '未知资源'
      const fileName = filePath.split(/[\\/]/).pop() || ''
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
      
      let cleanName = nameWithoutExt
        .replace(/[-_\s]+/g, ' ')
        .trim()
      
      if (!cleanName) {
        cleanName = nameWithoutExt
      }
      
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    }
    
    /**
     * 处理拖拽文件
     */
    const handleFileDrop = async (files: File[]) => {
      try {
        console.log('[GenericResourceView] 拖拽文件数量:', files.length)
        
        if (files.length === 0) {
          notify.toast('error', '拖拽失败', '请拖拽文件到此处')
          return
        }
        
        let addedCount = 0
        let failedCount = 0
        let typeMismatchCount = 0
        
        for (const file of files) {
          const filePath = (file as any).path || file.name
            const fileName = file.name.toLowerCase()
            
            // 获取文件扩展名
            const fileExt = fileName.includes('.') 
              ? '.' + fileName.split('.').pop() 
              : ''
            
            // 检测是否为文件夹
            const isFolder = (() => {
              // 方法1: 检查 webkitGetAsEntry
              const entry = typeof (file as any).webkitGetAsEntry === 'function'
                ? (file as any).webkitGetAsEntry()
                : null
              if (entry && entry.isDirectory) {
                return true
              }
              
              // 方法2: 检查文件类型和扩展名
              // 文件夹通常没有文件类型，且没有扩展名（或扩展名不在常见文件扩展名列表中）
              const hasExtension = /\.\w+$/.test(fileName)
              const isLikelyDirectory = (!file.type || file.type === '') && !hasExtension
              
              return isLikelyDirectory
            })()
            
            console.log(`[GenericResourceView] 处理文件: ${file.name}, 扩展名: ${fileExt}, 是否为文件夹: ${isFolder}`)
            
            // 检查是否已存在相同路径
            const existingItem = items.value.find((item: any) => {
              const itemPath = BaseResources.extractPrimitiveValue(
                item.resourcePath?.value || item.resourcePath
              )
              return itemPath === filePath
            })
            
            if (existingItem) {
              console.log(`[GenericResourceView] 资源已存在: ${file.name}`)
              failedCount++
              continue
            }
            
            // 根据页面配置的 resourceTypes 自动匹配资源类型
            const pageResourceTypes = props.pageConfig?.resourceTypes || [resourceType.value]
            console.log('[GenericResourceView] 页面支持的资源类型:', pageResourceTypes)
            
            let matchedResourceType: string | null = null
            let MatchedResourceClass: any = null
            
            // 遍历页面支持的资源类型，找到第一个匹配的
            for (const resType of pageResourceTypes) {
              const config = resourceClassMap[resType]
              if (!config) {
                console.warn(`[GenericResourceView] 未找到资源类型配置: ${resType}`)
                continue
              }
              
              const ResourceClassToCheck = config.resourceClass
              const acceptedExtensions = ResourceClassToCheck.acceptedExtensions || []
              
              console.log(`[GenericResourceView] 检查资源类型 ${resType}, 接受的扩展名:`, acceptedExtensions)
              
              // 检查是否接受所有文件类型
              if (acceptedExtensions.includes('*')) {
                matchedResourceType = resType
                MatchedResourceClass = ResourceClassToCheck
                console.log(`[GenericResourceView] 匹配成功（接受所有类型）: ${resType}`)
                break
              }
              
              // 如果是文件夹，检查是否接受文件夹
              if (isFolder && acceptedExtensions.includes('<folder>')) {
                matchedResourceType = resType
                MatchedResourceClass = ResourceClassToCheck
                console.log(`[GenericResourceView] 匹配成功（文件夹）: ${resType}`)
                break
              }
              
              // 检查文件扩展名是否匹配（非文件夹情况）
              if (!isFolder && acceptedExtensions.some((ext: string) => ext.toLowerCase() === fileExt)) {
                matchedResourceType = resType
                MatchedResourceClass = ResourceClassToCheck
                console.log(`[GenericResourceView] 匹配成功: ${resType}`)
                break
              }
            }
            
            // 如果没有匹配的资源类型
            if (!matchedResourceType || !MatchedResourceClass) {
              console.warn(`[GenericResourceView] 文件 ${file.name} 不匹配页面的资源类型配置`)
              typeMismatchCount++
              continue
            }
            
            // 创建匹配到的资源类型
            const resourceData: any = {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              resourceType: matchedResourceType === 'Anime' ? 'videoFolder' : (matchedResourceType === 'Video' ? 'video' : matchedResourceType.toLowerCase()),
              name: extractNameFromPath(file.name),
              description: '',
              tags: [],
              resourcePath: filePath,
              coverPath: '',
              folderSize: 0,
              playTime: 0,
              playCount: 0,
              visitedSessions: [],
              addedDate: new Date().toISOString(),
              fileExists: true
            }
            
            // 获取文件大小（失败则抛出，不静默吞错）
            if (isElectronEnvironment.value && window.electronAPI) {
              if (window.electronAPI.getFileStats) {
                const result = await window.electronAPI.getFileStats(filePath)
                if (result.success && result.size) {
                  resourceData.folderSize = result.size
                }
              } else if (window.electronAPI.getFolderSize) {
                const result = await window.electronAPI.getFolderSize(filePath)
                if (result.success) {
                  resourceData.folderSize = result.size
                }
              }
            }
            
            // 使用匹配到的资源类创建实例
            const resource = MatchedResourceClass.fromJSON(resourceData)
            console.log(`[GenericResourceView] 创建资源对象 (类型: ${matchedResourceType}):`, resource)
            
            // 添加到列表
          items.value.push(resource)
          addedCount++
        }
        
        if (addedCount > 0) {
          await saveData()
          notify.toast(
            'success',
            '添加成功',
            `成功添加 ${addedCount} 个资源${failedCount > 0 ? `，${failedCount} 个失败` : ''}${typeMismatchCount > 0 ? `，${typeMismatchCount} 个类型不匹配` : ''}`
          )
        } else if (typeMismatchCount > 0) {
          notify.toast(
            'error',
            '资源类型不匹配',
            `${typeMismatchCount} 个文件的类型不匹配当前页面的配置`
          )
        } else if (failedCount > 0) {
          notify.toast(
            'error',
            '添加失败',
            `${failedCount} 个文件添加失败（可能已存在）`
          )
        }
      } catch (error: any) {
        console.error('[GenericResourceView] 处理拖拽失败:', error)
        notify.toast('error', '处理失败', `处理拖拽文件失败: ${error.message}`)
        throw error
      }
    }
    
    /**
     * 处理拖拽错误
     */
    const handleDropError = (error: { type: 'size' | 'count' | 'type', message: string }) => {
      const title = error.type === 'size' ? '文件过大' : 
                    error.type === 'count' ? '文件数量超限' : 
                    '文件类型不支持'
      notify.toast('error', title, error.message)
    }
    
    // 使用拖拽 composable（直接使用，避免 FunDropZone 组件的性能问题）
    const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop: handleDragDrop } = useDragAndDrop({
      acceptedExtensions: [],
      enabled: true,
      onDrop: handleFileDrop
    })
    
    /**
     * 保存页面数据到文件
     */
    const saveData = async () => {
      const pageId = props.pageConfig?.id
      if (!pageId) {
        throw new Error('无法保存数据：pageId 不存在')
      }
      
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.sqliteSavePageResources) {
        throw new Error('不在 Electron 环境或数据库 API 不可用，无法保存')
      }
      const saveableData = items.value.map(item => (item as any).getSaveData())
      console.log(`[GenericResourceView] 保存页面 ${pageId} 数据到数据库，共 ${saveableData.length} 条记录`)
      console.log('[GenericResourceView] saveableData 完整内容:', saveableData)
      saveableData.forEach((item, index) => {
        console.log(`[GenericResourceView] 第 ${index} 条记录 - id: ${item.id}, resourceType: ${item.resourceType}`)
        console.log(`[GenericResourceView] 第 ${index} 条记录 所有字段:`, Object.keys(item))
      })
      const result = await window.electronAPI.sqliteSavePageResources(pageId, saveableData)
      if (!result || !result.ok) {
        throw new Error((result && result.message) ? result.message : '保存页面数据到数据库失败')
      }
      console.log(`[GenericResourceView] 页面 ${pageId} 数据保存成功`)
      return true
    }

    // 游戏截图功能（仅 Game 类型且 Electron 环境）
    const gameScreenshotComposable =
      resourceType.value === 'Game' && isElectronEnvironment.value
        ? useGameScreenshot(
            isElectronEnvironment,
            () => gameRunningStore.getRunningGamesMap(),
            async (result: { gameId?: string; filepath: string }) => {
              if (!result?.gameId || !result?.filepath) return
              const item = items.value.find((i: any) => (i.id?.value || i.id) === result.gameId)
              if (!item) return
              // 当封面为空（未设置、已清除或仅空白）时，将本次截图设为封面
              const currentCover = item.coverPath?.value ?? item.coverPath ?? (item as any).image
              const isCoverEmpty = currentCover == null || String(currentCover).trim() === ''
              if (!isCoverEmpty) return
              if (item.coverPath && typeof item.coverPath === 'object' && 'value' in item.coverPath) {
                item.coverPath.value = result.filepath
              } else {
                (item as any).coverPath = result.filepath
              }
              await saveData()
              const name = item.name?.value ?? item.name
              notify.toast('success', '封面已更新', `已自动将截图设置为 "${name}" 的封面图`)
            }
          )
        : null

    // 图片/漫画查看器相关状态（用于 Image/Manga 资源类型）
    const currentAlbum = ref<any>(null)
    const currentPageIndex = ref(0)
    const pages = ref<string[]>([])
    const showComicViewer = ref(false)
    
    // 详情页图片预览相关状态（用于 Image/Manga 资源类型）
    const detailPages = ref<string[]>([])
    const showDetailModal = ref(false) // 用于 imageCacheComposable（完全复刻 ImageView.vue）
    
    // 使用详情页图片分页 composable（完全复刻 ImageView.vue）
    const imagePagesComposable = useImagePages({
      pages: detailPages,
      defaultPageSize: 50
    })

    // 小说阅读器相关状态（用于 Novel 资源类型）
    const currentReadingNovel = ref<any>(null)
    const showNovelReader = ref(false)
    const showEbookReaderV2 = ref(false)
    const ebookReaderV2FilePath = ref<string>('')

    // 检查 Electron 环境
    isElectronEnvironment.value = !!(window as any).electronAPI

    // 获取排序选项
    const sortOptions = pageConfig.getSortOptions()

    // 游戏运行状态管理（使用 store）
    const gameRunningStore = useGameRunningStore()
    
    // 存储游戏启动时的初始 playTime（Map<resourceId, initialPlayTime>）
    const gameInitialPlayTimes = ref<Map<string, number>>(new Map())
    
    // 定时器引用（用于定期更新总时长）
    let playtimeUpdateTimer: ReturnType<typeof setInterval> | null = null
    
    // 强制结束程序确认对话框状态
    const showTerminateConfirmDialog = ref(false)
    const showScraperDialog = ref(false)
    const scraperMatches = ref<any[]>([])
    const scraperCurrentItem = ref<any>(null)
    const resourceToTerminate = ref<any>(null)

    // 检查资源是否正在运行（凡使用 launchExecutable 的资源都会登记到 store，按 id 查询即可）
    const isResourceRunning = (resource: any): boolean => {
      const resourceId = resource.id?.value || resource.id
      if (!resourceId) return false
      return gameRunningStore.isGameRunning(resourceId)
    }

    // 创建用于筛选的“运行中”函数（游戏/软件等可执行程序共用同一 store）
    const isGameRunningForFilter = (item: any) => {
      return gameRunningStore.isGameRunning(item.id?.value || item.id)
    }

    // 多选模式相关方法
    const toggleMultiSelectMode = () => {
      isMultiSelectMode.value = !isMultiSelectMode.value
      if (!isMultiSelectMode.value) {
        selectedItems.value.clear()
      }
    }
    
    const isItemSelected = (item: any): boolean => {
      const itemId = item.id?.value || item.id
      return selectedItems.value.has(itemId)
    }
    
    const toggleSelectItem = (item: any) => {
      const itemId = item.id?.value || item.id
      if (selectedItems.value.has(itemId)) {
        selectedItems.value.delete(itemId)
      } else {
        selectedItems.value.add(itemId)
      }
    }

    const handleBatchAddTag = () => {
      if (selectedItems.value.size === 0) {
        notify.toast('warning', '批量增加tag', '请先选择要操作的项目')
        return
      }
      showBatchAddTagDialog.value = true
    }

    const closeBatchAddTagDialog = () => {
      showBatchAddTagDialog.value = false
    }

    const handleBatchAddTagConfirm = async (tags: string[]) => {
      if (tags.length === 0) {
        notify.toast('warning', '批量增加tag', '请至少输入一个标签')
        return
      }

      let successCount = 0
      let failCount = 0

      for (const itemId of selectedItems.value) {
        const item = items.value.find((i: any) => (i.id?.value || i.id) === itemId)
        if (item) {
          try {
            const currentTags = BaseResources.extractPrimitiveValue(item.tags?.value ?? item.tags) || []
            const newTags = [...new Set([...currentTags, ...tags])]
            
            if (item.tags && typeof item.tags === 'object' && 'value' in item.tags) {
              item.tags.value = newTags
            } else {
              item.tags = newTags
            }
            successCount++
          } catch (error) {
            console.error(`[GenericResourceView] 批量增加tag失败: ${itemId}`, error)
            failCount++
          }
        }
      }

      if (successCount > 0) {
        await saveData()
        notify.toast('success', '批量增加tag', `成功为 ${successCount} 个项目添加标签${failCount > 0 ? `，${failCount} 个失败` : ''}`)
      } else {
        notify.toast('error', '批量增加tag', '添加失败')
      }

      closeBatchAddTagDialog()
    }

    const handleBatchDeleteTag = () => {
      if (selectedItems.value.size === 0) {
        notify.toast('warning', '批量删除tag', '请先选择要操作的项目')
        return
      }
      showBatchDeleteTagDialog.value = true
    }

    const closeBatchDeleteTagDialog = () => {
      showBatchDeleteTagDialog.value = false
    }

    const handleBatchDeleteTagConfirm = async (tags: string[]) => {
      if (tags.length === 0) {
        notify.toast('warning', '批量删除tag', '请至少输入一个标签')
        return
      }

      let successCount = 0
      let failCount = 0

      for (const itemId of selectedItems.value) {
        const item = items.value.find((i: any) => (i.id?.value || i.id) === itemId)
        if (item) {
          try {
            const currentTags = BaseResources.extractPrimitiveValue(item.tags?.value ?? item.tags) || []
            const newTags = currentTags.filter((tag: string) => !tags.includes(tag))
            
            if (item.tags && typeof item.tags === 'object' && 'value' in item.tags) {
              item.tags.value = newTags
            } else {
              item.tags = newTags
            }
            successCount++
          } catch (error) {
            console.error(`[GenericResourceView] 批量删除tag失败: ${itemId}`, error)
            failCount++
          }
        }
      }

      if (successCount > 0) {
        await saveData()
        notify.toast('success', '批量删除tag', `成功从 ${successCount} 个项目删除标签${failCount > 0 ? `，${failCount} 个失败` : ''}`)
      } else {
        notify.toast('error', '批量删除tag', '删除失败')
      }

      closeBatchDeleteTagDialog()
    }

    const handleBatchDelete = () => {
      if (selectedItems.value.size === 0) {
        notify.toast('warning', '批量删除文件', '请先选择要操作的项目')
        return
      }
      showBatchDeleteConfirmDialog.value = true
    }

    const closeBatchDeleteConfirmDialog = () => {
      showBatchDeleteConfirmDialog.value = false
    }

    const handleBatchDeleteConfirm = async () => {
      const deleteCount = selectedItems.value.size

      try {
        for (const itemId of selectedItems.value) {
          const index = items.value.findIndex((i: any) => (i.id?.value || i.id) === itemId)
          if (index > -1) {
            items.value.splice(index, 1)
          }
        }

        await saveData()
        notify.toast('success', '批量删除文件', `成功删除 ${deleteCount} 个项目`)

        selectedItems.value.clear()
        isMultiSelectMode.value = false
      } catch (error) {
        console.error('[GenericResourceView] 批量删除文件失败:', error)
        notify.toast('error', '批量删除文件', '删除失败')
      }

      closeBatchDeleteConfirmDialog()
    }

    const contextMenuItems = computed(() => {
      if (isMultiSelectMode.value) {
        return [
          { key: 'batchAddTag', icon: '🏷️', label: '批量增加tag' },
          { key: 'batchDeleteTag', icon: '🏷️', label: '批量删除tag' },
          { key: 'batchDelete', icon: '🗑️', label: '批量删除文件' }
        ]
      } else {
        return [...(ResourceClass.contextMenuItems || []), { key: 'scraper', icon: '📥', label: '刮削' }]
      }
    })

    
    // 使用通用筛选 composable（传入页面配置实例和额外数据）
    const filterComposable = useResourceFilter(
      items, 
      searchQuery, 
      sortBy, 
      pageConfig, 
      { isGameRunning: isGameRunningForFilter }
    )
    
    // 从筛选器状态中获取所有标签（用于编辑对话框，兼容单一口径）
    const allTags = computed<FilterItem[]>(() => {
      const tagsState = filterComposable.filterStates?.tags
      return tagsState?.items?.value || []
    })

    // 按字段 key 提供各自的候选列表（开发商用 developers 数据，标签用 tags 数据）
    const availableTagsByField = computed<Record<string, FilterItem[]>>(() => {
      const states = filterComposable.filterStates
      if (!states || typeof states !== 'object') return {}
      const map: Record<string, FilterItem[]> = {}
      for (const key of Object.keys(states)) {
        const items = (states as any)[key]?.items?.value
        map[key] = Array.isArray(items) ? items : []
      }
      return map
    })

    // 终止游戏方法
    const terminateGame = async (resource: any) => {
      try {
        const resourceName = BaseResources.extractPrimitiveValue(resource.name?.value || resource.name)
        const executablePath = BaseResources.extractPrimitiveValue(
          resource.resourcePath?.value || resource.executablePath?.value || resource.resourcePath || resource.executablePath
        )
        const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
        
        if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.terminateGame) {
          notify.toast('error', '操作失败', '当前环境不支持强制结束程序功能')
          return
        }

        const result = await window.electronAPI.terminateGame(executablePath)
        
        if (result.success) {
          // 从运行列表中移除（游戏/软件等可执行程序统一登记，统一移除）
          gameRunningStore.removeRunningGame(resourceId)
          
          // 更新运行时长（使用初始时长逻辑）
          if (result.playTime && result.playTime > 0) {
            const currentPlayTime = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0
            const initialPlayTime = gameInitialPlayTimes.value.get(resourceId) || currentPlayTime
            // 计算最终总时长（使用 store 中的会话时长，如果 store 中还有数据）
            let totalPlayTime = currentPlayTime
            if (gameRunningStore.isGameRunning(resourceId)) {
              // 如果还在运行列表中，使用 store 计算
              totalPlayTime = gameRunningStore.getCurrentPlayTime(resourceId, initialPlayTime)
            } else {
              // 否则直接累加
              totalPlayTime = currentPlayTime + result.playTime
            }
            
            // 更新资源数据
            const item = items.value.find((i: any) => (i.id?.value || i.id) === resourceId)
            if (item) {
              if (item.playTime && typeof item.playTime === 'object' && 'value' in item.playTime) {
                item.playTime.value = totalPlayTime
              } else {
                item.playTime = totalPlayTime
              }
            }
            
            // 清除保存的初始值
            gameInitialPlayTimes.value.delete(resourceId)
          }
          
          notify.toast('success', '程序已结束', `${resourceName} 已强制结束`)
        } else {
          console.warn('[GenericResourceView] ⚠️ 强制结束程序失败:', result.error)
          notify.toast('error', '结束失败', `结束失败: ${result.error || '未知错误'}`)
        }
      } catch (error) {
        console.error('[GenericResourceView] ❌ 终止程序失败:', error)
        notify.toast('error', '结束失败', `结束失败: ${error.message || '未知错误'}`)
      }
    }

    // 处理可执行程序进程结束事件（游戏/软件等）
    const handleGameProcessEnded = async (data: { executablePath: string; playTime: number; pid: number }) => {
      // 根据 executablePath 找到对应的资源
      const resource = items.value.find((item: any) => {
        const itemPath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.executablePath?.value || item.resourcePath || item.executablePath
        )
        return itemPath === data.executablePath
      })
      
        if (resource) {
        const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id)
        
        // 从运行列表中移除（凡用 launchExecutable 启动的都会在此登记，统一移除）
        gameRunningStore.removeRunningGame(resourceId)
        
        // 更新运行时长（使用最终时长更新逻辑）
        if (data.playTime && data.playTime > 0) {
          // 获取初始 playTime（从保存的初始值获取，如果不存在则使用当前值）
          const currentPlayTime = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0
          const initialPlayTime = gameInitialPlayTimes.value.get(resourceId) || currentPlayTime
          // 计算最终总时长（使用 store 中的会话时长，如果 store 中还有数据）
          let totalPlayTime = currentPlayTime
          if (gameRunningStore.isGameRunning(resourceId)) {
            totalPlayTime = gameRunningStore.getCurrentPlayTime(resourceId, initialPlayTime)
          } else {
            totalPlayTime = currentPlayTime + data.playTime
          }
          
          // 更新资源数据
          if (resource.playTime && typeof resource.playTime === 'object' && 'value' in resource.playTime) {
            resource.playTime.value = totalPlayTime
          } else {
            resource.playTime = totalPlayTime
          }
          // visitedSessions 在启动时已记录，此处仅更新 playTime
          gameInitialPlayTimes.value.delete(resourceId)
          
          // 持久化到数据库
          try {
            await saveData()
          } catch (err: any) {
            console.error('[GenericResourceView] 游戏时长保存到数据库失败:', err)
            notify.toast('error', '保存失败', `游戏时长未能写入数据库: ${err.message}`)
            throw err
          }
        }
      } else {
        console.warn('[GenericResourceView] ⚠️ 未找到对应的资源，executablePath:', data.executablePath)
      }
    }

    // 处理资源操作（根据 actionConfig 启动资源；可选 options.handlerName 指定要执行的 handler，如 'launchWithLocale'）
    const handleResourceAction = async (resource: any, options?: { handlerName?: string }) => {
      // 从资源实例获取实际的资源类型
      const actualResourceType = BaseResources.extractPrimitiveValue(
        resource.resourceType?.value || resource.resourceType
      ) || resource?.constructor?.name || resourceType.value
      
      // 构建 handler 上下文
      const context: ActionHandlerContext = {
        isElectronEnvironment: isElectronEnvironment.value,
        updateResource: async (id: string, updates: any) => {
          const idStr = String(id ?? '')
          const item = items.value.find((i: any) => String(i.id?.value ?? i.id ?? '') === idStr)
          if (item) {
            Object.keys(updates).forEach(key => {
              if (item[key] && typeof item[key] === 'object' && 'value' in item[key]) {
                item[key].value = updates[key]
              } else {
                item[key] = updates[key]
              }
            })
            await saveData()
          }
        },
        isResourceRunning: (resource: any) => {
          return isResourceRunning(resource)
        },
        addRunningResource: (resourceInfo: any) => {
          // 凡配置了 launchExecutable 的资源（游戏、软件等）都登记到运行列表
          if (supportsRunningTracking.value) {
            gameRunningStore.addRunningGame({
              id: resourceInfo.id,
              pid: resourceInfo.pid,
              windowTitles: resourceInfo.windowTitles || [],
              gameName: resourceInfo.gameName || ''
            })
          }
        },
        removeRunningResource: (resourceId: string) => {
          if (supportsRunningTracking.value) {
            gameRunningStore.removeRunningGame(resourceId)
          }
        },
        getInitialPlayTime: (resourceId: string) => {
          // 获取资源启动时的初始 playTime
          const item = items.value.find((i: any) => (i.id?.value || i.id) === resourceId)
          if (item) {
            const playTime = item.playTime?.value ?? item.playTime
            return playTime != null ? playTime : 0
          }
          return 0
        },
        saveInitialPlayTime: (resourceId: string, playTime: number) => {
          // 保存初始运行时长到 Map 中
          gameInitialPlayTimes.value.set(resourceId, playTime)
        },
        closeDetail: () => {
          // 关闭详情页面（如果有的话）
          if ((resourcePage as any).closeDetail) {
            (resourcePage as any).closeDetail()
          }
        },
        showTerminateConfirmDialog: (resource: any) => {
          // 显示终止确认对话框
          showTerminateConfirmDialog.value = true
          resourceToTerminate.value = resource
        },
        // 图片/漫画查看器相关方法（用于 Image/Manga 资源类型）
        setCurrentAlbum: (album: any) => {
          currentAlbum.value = album
        },
        setCurrentPageIndex: (index: number) => {
          currentPageIndex.value = index
        },
        clearPages: () => {
          pages.value = []
        },
        updateViewInfo: async (album: any) => {
          const albumId = BaseResources.extractPrimitiveValue(album.id?.value || album.id)
          const item = items.value.find((i: any) => (i.id?.value || i.id) === albumId)
          if (!item) return
          const now = new Date().toISOString()
          // 兼容 ResourceField 与纯数组两种结构
          if (item.visitedSessions != null && typeof item.visitedSessions === 'object' && 'value' in item.visitedSessions) {
            const sessions = Array.isArray(item.visitedSessions.value) ? item.visitedSessions.value : []
            item.visitedSessions.value = [...sessions, now]
          } else if (Array.isArray(item.visitedSessions)) {
            item.visitedSessions = [...item.visitedSessions, now]
          } else {
            item.visitedSessions = [now]
          }
          await saveData()
        },
        loadAlbumPages: async () => {
          // 加载专辑的图片文件列表（也支持单图：路径为单个图片文件时直接作为一页）
          if (!currentAlbum.value) {
            console.warn('[GenericResourceView] 当前专辑为空，无法加载页面')
            return
          }
          
          const resourcePath = BaseResources.extractPrimitiveValue(
            currentAlbum.value.resourcePath?.value || currentAlbum.value.resourcePath
          )
          
          if (!resourcePath) {
            console.warn('[GenericResourceView] 专辑路径为空，无法加载页面')
            return
          }
          
          // 单图：路径为单个图片文件时，直接作为一页（复用漫画阅读器）
          const singleImageExt = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|heic|heif)$/i
          if (singleImageExt.test(resourcePath.trim())) {
            pages.value = [resourcePath]
            return
          }
          
          // CBZ/ZIP 漫画包：列出压缩包内图片，使用 archive:// URL 供阅读器加载
          const cbzExt = /\.(cbz|zip)$/i
          if (cbzExt.test(resourcePath.trim()) && isElectronEnvironment.value && window.electronAPI?.listImageFilesInArchive) {
            try {
              const resp = await window.electronAPI.listImageFilesInArchive(resourcePath)
              if (resp.success && Array.isArray(resp.files) && resp.files.length > 0) {
                const base = `archive:///${resourcePath.replace(/\\/g, '/')}`
                pages.value = resp.files.map((entry: string) => `${base}#${encodeURIComponent(entry)}`)
              } else {
                pages.value = resp.success ? [] : []
                if (!resp.success) console.error('[GenericResourceView] CBZ 加载失败:', resp.error)
              }
            } catch (err) {
              console.error('[GenericResourceView] 加载 CBZ 页面失败:', err)
              pages.value = []
            }
            return
          }
          
          try {
            if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.listImageFiles) {
              const resp = await window.electronAPI.listImageFiles(resourcePath)
              
              if (resp.success) {
                pages.value = resp.files || []
              } else {
                console.error('[GenericResourceView] 加载图片文件失败:', resp.error)
                pages.value = []
              }
            } else {
              console.warn('[GenericResourceView] Electron API 不可用，无法加载图片文件')
              pages.value = []
            }
          } catch (error) {
            console.error('[GenericResourceView] 加载专辑页面失败:', error)
            pages.value = []
          }
        },
        showComicViewer: (show: boolean) => {
          showComicViewer.value = show
        },
        // 小说阅读器相关方法（用于 Novel 资源类型）
        setCurrentNovel: (novel: any) => {
          currentReadingNovel.value = novel
        },
        showNovelReader: (show: boolean) => {
          showNovelReader.value = show
        },
        showEbookReaderV2: (show: boolean) => {
          showEbookReaderV2.value = show
        },
        setEbookReaderV2FilePath: (filePath: string) => {
          ebookReaderV2FilePath.value = filePath
        },
        getGlobalSettings: async () => {
          // 获取全局设置（用于小说打开模式等）
          try {
            const saveManager = (await import('../utils/SaveManager.ts')).default
            const settings = await saveManager.loadSettings()
            
            // 返回小说相关设置
            return {
              novelDefaultOpenMode: settings.novel?.defaultOpenMode || settings.novelDefaultOpenMode || 'internal',
              novel: settings.novel || {}
            }
          } catch (error) {
            console.warn('[GenericResourceView] 获取全局设置失败:', error)
            return {
              novelDefaultOpenMode: 'internal',
              novel: {}
            }
          }
        },
        getFileType: (filePath: string): string => {
          if (!filePath) return 'txt'
          const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
          if (ext === '.epub') return 'epub'
          if (ext === '.mobi') return 'mobi'
          if (ext === '.pdf') return 'pdf'
          return 'txt'
        },
        updateReadingStats: async (novel: any) => {
          const novelId = String(BaseResources.extractPrimitiveValue(novel.id?.value ?? novel.id) ?? '')
          const item = items.value.find((i: any) => String(i.id?.value ?? i.id ?? '') === novelId)
          if (!item?.visitedSessions || typeof item.visitedSessions !== 'object' || !('value' in item.visitedSessions)) return
          const now = new Date().toISOString()
          const arr = Array.isArray(item.visitedSessions.value) ? [...item.visitedSessions.value] : []
          arr.push(now)
          item.visitedSessions.value = arr
          await saveData()
        }
      }

      // 若指定了 handlerName（如右键「转区启动」），则执行该 handler；否则按资源 actionConfig 执行
      const overrideHandlerName = options?.handlerName
      if (overrideHandlerName) {
        const handler = getActionHandler(overrideHandlerName)
        if (handler) {
          await handler(resource, context)
          return
        }
      }
      await executeActionHandler(resource, context)
    }

    // 关闭漫画查看器
    const closeComicViewer = () => {
      showComicViewer.value = false
      currentPageIndex.value = 0
      
      // 只清空阅读器相关的状态，保留currentAlbum用于详情页显示
      // 如果是从详情页打开的，保持详情页状态
      // 如果是从卡片直接打开的，清空详情页状态
      if (!showDetailModal.value) {
        currentAlbum.value = null
        pages.value = []
      }
    }

    // 处理漫画查看器页面变化
    const handleComicViewerPageChange = (newIndex: number) => {
      currentPageIndex.value = newIndex
    }

    // 小说阅读器相关方法
    const closeNovelReader = () => {
      showNovelReader.value = false
      currentReadingNovel.value = null
    }

    const closeEbookReaderV2 = () => {
      showEbookReaderV2.value = false
      ebookReaderV2FilePath.value = ''
      ebookNavigation.value = null
      ebookBookAvailable.value = false
      ebookRendition.value = null
    }

    // EPUB 阅读器 V2 相关状态
    const ebookNavigation = ref<any>(null)
    const ebookBookAvailable = ref(false)
    const ebookRendition = ref<any>(null)

    const handleNavigationUpdated = (navigation: any) => {
      ebookNavigation.value = navigation
      ebookBookAvailable.value = true
    }

    const handleRenditionReady = (rendition: any) => {
      ebookRendition.value = rendition
    }

    const ebookReaderRef = ref<any>(null)

    const handleEbookJumpTo = (href: string) => {
      if (ebookReaderRef.value && typeof ebookReaderRef.value.jumpTo === 'function') {
        ebookReaderRef.value.jumpTo(href)
      }
    }

    // 小说辅助方法
    const getNovelName = (novel: any): string => {
      return BaseResources.extractPrimitiveValue(novel.name?.value || novel.name) || '未知小说'
    }

    const getNovelAuthor = (novel: any): string => {
      return BaseResources.extractPrimitiveValue(novel.author?.value || novel.author) || ''
    }

    const getNovelFilePath = (novel: any): string => {
      return BaseResources.extractPrimitiveValue(
        novel.resourcePath?.value || novel.filePath?.value || novel.resourcePath || novel.filePath
      ) || ''
    }

    const getNovelFileType = (novel: any): string => {
      const filePath = getNovelFilePath(novel)
      if (!filePath) return 'txt'
      const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
      if (ext === '.epub') return 'epub'
      if (ext === '.mobi') return 'mobi'
      if (ext === '.pdf') return 'pdf'
      return 'txt'
    }

    const getNovelCurrentPage = (novel: any): number => {
      return BaseResources.extractPrimitiveValue(novel.currentPage?.value || novel.currentPage) || 1
    }

    const getNovelNameByPath = (filePath: string): string => {
      if (!filePath) return '未知小说'
      const novel = items.value.find((n: any) => {
        const nPath = BaseResources.extractPrimitiveValue(
          n.resourcePath?.value || n.filePath?.value || n.resourcePath || n.filePath
        )
        return nPath === filePath
      })
      return novel ? getNovelName(novel) : (filePath.split(/[\\/]/).pop() || '未知小说')
    }

    // 处理 PDF 页面变化
    const handlePdfPageChanged = async (pageNum: number) => {
      if (!currentReadingNovel.value) return
      
      const novelId = BaseResources.extractPrimitiveValue(currentReadingNovel.value.id?.value || currentReadingNovel.value.id)
      const item = items.value.find((i: any) => (i.id?.value || i.id) === novelId)
      if (item) {
        if (item.currentPage && typeof item.currentPage === 'object' && 'value' in item.currentPage) {
          item.currentPage.value = pageNum
        } else {
          item.currentPage = pageNum
        }
      }
    }

    // 处理文本阅读器页面变化
    const handleTextPageChanged = async (pageNum: number) => {
      if (!currentReadingNovel.value) return
      
      const novelId = BaseResources.extractPrimitiveValue(currentReadingNovel.value.id?.value || currentReadingNovel.value.id)
      const item = items.value.find((i: any) => (i.id?.value || i.id) === novelId)
      if (item) {
        if (item.currentPage && typeof item.currentPage === 'object' && 'value' in item.currentPage) {
          item.currentPage.value = pageNum
        } else {
          item.currentPage = pageNum
        }
      }
    }

    // 处理文本阅读器进度变化
    const handleTextProgressChanged = async (progress: number) => {
      if (!currentReadingNovel.value) return
      
      const novelId = BaseResources.extractPrimitiveValue(currentReadingNovel.value.id?.value || currentReadingNovel.value.id)
      const item = items.value.find((i: any) => (i.id?.value || i.id) === novelId)
      if (item) {
        if (item.readProgress && typeof item.readProgress === 'object' && 'value' in item.readProgress) {
          item.readProgress.value = progress
        } else {
          item.readProgress = progress
        }
      }
    }

    // 使用筛选 composable 的 filteredItems（已经是响应式的）
    // 直接使用 filterComposable.filteredGames，确保引用正确
    const filteredItems = filterComposable.filteredGames
    

    // 监听 items 变化，自动提取筛选器数据（完全按照 ImageView 的方式）
    // 临时注释掉，测试性能问题
    // watch([items], () => {
    //   if (filterComposable.extractAllFilters && items.value.length > 0) {
    //     filterComposable.extractAllFilters()
    //     // 延迟更新筛选器数据，确保数据已提取
    //     setTimeout(() => {
    //       // 注意：这里不能直接 emit，需要在 methods 中通过 updateFilterData 处理
    //     }, 0)
    //   }
    // }, { immediate: false, deep: true })

    // 创建右键菜单处理器（简化版；launch/folder/terminate/edit/remove 在 handleDetailActionImpl 定义后统一绑定）
    const contextMenuHandlers: Record<string, (item: any) => void | Promise<void>> = {
      detail: (item: any) => {
        // 调用 showDetail 方法（从 resourcePage 获取）
        if ((resourcePage as any).showDetail) {
          (resourcePage as any).showDetail(item)
        }
      },
      edit: (item: any) => {
        // 编辑
      },
      remove: (item: any) => {
        const index = items.value.findIndex((i: any) => (i.id?.value || i.id) === (item.id?.value || item.id))
        if (index > -1) {
          items.value.splice(index, 1)
        }
      },
      scraper: async (item: any) => {
        if (!isElectronEnvironment.value || !window.electronAPI?.scraperDbSearch) {
          notify.toast('error', '刮削', '当前环境不支持刮削功能')
          return
        }
        const rt = resourceType.value
        const scraperTable = RESOURCE_TYPE_TO_SCRAPER_TABLE[rt]
        if (!scraperTable) {
          notify.toast('error', '刮削', `资源类型 ${rt} 暂不支持刮削`)
          return
        }
        const name = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || ''
        const resourcePath = getResourceFilePath(item) || BaseResources.extractPrimitiveValue(item.folderPath?.value ?? item.folderPath) || ''
        try {
          const res = await window.electronAPI.scraperDbSearch(scraperTable, name, resourcePath)
          if (!res?.ok) {
            notify.toast('error', '刮削', res?.message || '搜索刮削库失败')
            return
          }
          const matches = res.matches || []
          if (matches.length === 0) {
            notify.toast('info', '刮削', '未找到匹配的刮削数据（同名或同文件夹）')
            return
          }
          scraperMatches.value = matches
          scraperCurrentItem.value = item
          showScraperDialog.value = true
        } catch (e: any) {
          notify.toast('error', '刮削', e?.message || '搜索失败')
        }
      },
      'update-folder-size': async (item: any) => {
        if (!isElectronEnvironment.value) {
          const errorMsg = '当前环境不支持文件夹大小计算功能'
          console.log('[GenericResourceView] 文件夹大小计算失败:', errorMsg)
          notify.toast('error', '操作失败', errorMsg)
          return
        }
        
        const cardConfig = item.constructor?.cardDisplayConfig || 
                         (typeof item.constructor?.getCardDisplayConfig === 'function' 
                           ? item.constructor.getCardDisplayConfig() 
                           : null)
        
        console.log('[GenericResourceView] 检查资源类型配置:', {
          resourceType: item.constructor?.name,
          cardConfigExists: !!cardConfig,
          badgeField: cardConfig?.badge?.field
        })
        
        if (cardConfig?.badge?.field !== 'folderSize') {
          const errorMsg = `该资源类型(${item.constructor?.name || '未知'})不支持文件夹大小计算，需要配置badge.field为'folderSize'`
          console.log('[GenericResourceView] 文件夹大小计算失败:', errorMsg)
          notify.toast('error', '操作失败', errorMsg)
          return
        }
        
        try {
          const itemName = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || '未知'
          const oldSize = BaseResources.extractPrimitiveValue(item.folderSize?.value || item.folderSize) || 0
          
          console.log('[GenericResourceView] 开始计算文件夹大小:', {
            itemName,
            oldSize,
            resourceType: item.constructor?.name
          })
          
          const success = await calculateAndUpdateResourceSize(item, isElectronEnvironment.value)
          
          console.log('[GenericResourceView] 文件夹大小计算结果:', {
            itemName,
            success,
            newSize: BaseResources.extractPrimitiveValue(item.folderSize?.value || item.folderSize) || 0
          })
          
          if (success) {
            const newSize = BaseResources.extractPrimitiveValue(item.folderSize?.value || item.folderSize) || 0
            const oldSizeMB = (oldSize / 1024 / 1024).toFixed(2)
            const newSizeMB = (newSize / 1024 / 1024).toFixed(2)
            
            console.log('[GenericResourceView] 文件夹大小更新成功:', {
              itemName,
              oldSizeMB,
              newSizeMB
            })
            
            notify.toast(
              'success',
              '更新成功',
              `"${itemName}" 文件夹大小已更新\n旧大小: ${oldSizeMB} MB\n新大小: ${newSizeMB} MB`
            )
          } else {
            const errorMsg = `无法获取 "${itemName}" 的文件夹大小`
            console.log('[GenericResourceView] 文件夹大小计算失败:', errorMsg)
            notify.toast('error', '更新失败', errorMsg)
          }
        } catch (error: any) {
          const itemName = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || '未知'
          const errorMsg = `无法获取 "${itemName}" 的文件夹大小: ${error.message}`
          console.error('[GenericResourceView] 文件夹大小计算异常:', error)
          notify.toast('error', '更新失败', errorMsg)
        }
      }
    }

    // 路径更新对话框相关方法
    const confirmPathUpdate = async () => {
      try {
        const { existingItem, newPath } = resourcePage.pathUpdateInfo.value

        if (!existingItem || !newPath) {
          console.error('[GenericResourceView] 路径更新信息不完整')
          return
        }

        const itemName = BaseResources.extractPrimitiveValue(existingItem.name?.value || existingItem.name)
        const oldPath = BaseResources.extractPrimitiveValue(
          existingItem.resourcePath?.value || existingItem.executablePath?.value || existingItem.resourcePath || existingItem.executablePath
        )
        console.log(`[GenericResourceView] 更新资源 "${itemName}" 的路径:`)
        console.log(`旧路径: ${oldPath}`)
        console.log(`新路径: ${newPath}`)

        // 更新资源路径
        if (existingItem.resourcePath && typeof existingItem.resourcePath === 'object' && 'value' in existingItem.resourcePath) {
          existingItem.resourcePath.value = newPath
        } else if (existingItem.executablePath && typeof existingItem.executablePath === 'object' && 'value' in existingItem.executablePath) {
          existingItem.executablePath.value = newPath
        } else {
          existingItem.resourcePath = newPath
          existingItem.executablePath = newPath
        }
        
        if (existingItem.fileExists && typeof existingItem.fileExists === 'object' && 'value' in existingItem.fileExists) {
          existingItem.fileExists.value = true
        } else {
          existingItem.fileExists = true
        }

        // 重新计算文件夹大小（如果资源类型支持）
        if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.getFolderSize) {
          try {
            const result = await window.electronAPI.getFolderSize(newPath)
            if (result.success) {
              if (existingItem.folderSize && typeof existingItem.folderSize === 'object' && 'value' in existingItem.folderSize) {
                existingItem.folderSize.value = result.size
              } else {
                existingItem.folderSize = result.size
              }
              console.log(`[GenericResourceView] 资源 ${itemName} 文件夹大小: ${result.size} 字节`)
            }
          } catch (error) {
            console.error('[GenericResourceView] 获取文件夹大小失败:', error)
          }
        }

        // 保存更新后的数据
        await saveData()

        // 关闭对话框
        resourcePage.closePathUpdateDialog()

        // 显示成功通知
        notify.toast(
          'success',
          '路径更新成功',
          `资源 "${itemName}" 的路径已更新`
        )

        console.log(`[GenericResourceView] 资源 "${itemName}" 路径更新完成`)

      } catch (error: any) {
        console.error('[GenericResourceView] 更新资源路径失败:', error)
        notify.toast('error', '更新失败', `更新资源路径失败: ${error.message}`)
      }
    }

    // 强制结束程序确认对话框相关方法
    const closeTerminateConfirmDialog = () => {
      showTerminateConfirmDialog.value = false
      resourceToTerminate.value = null
    }

    const confirmTerminateGame = async () => {
      if (resourceToTerminate.value) {
        await terminateGame(resourceToTerminate.value)
        closeTerminateConfirmDialog()
      }
    }

    // 计算属性：获取终止资源的名称
    const terminateResourceName = computed(() => {
      if (!resourceToTerminate.value) return ''
      return BaseResources.extractPrimitiveValue(
        resourceToTerminate.value.name?.value || resourceToTerminate.value.name
      ) || '未知资源'
    })

    // 路径更新对话框的计算属性（根据资源类型动态生成）
    const pathUpdateDialogTitle = computed(() => {
      const itemType = pageConfig.name || '资源'
      return `更新${itemType}路径`
    })

    const pathUpdateDialogDescription = computed(() => {
      const itemType = pageConfig.name || '资源'
      return `发现同名但路径不同的${itemType}文件：`
    })

    const pathUpdateItemNameLabel = computed(() => {
      const itemType = pageConfig.name || '资源'
      return `${itemType}名称`
    })

    const pathUpdateItemName = computed(() => {
      const existingItem = resourcePage.pathUpdateInfo.value.existingItem
      if (!existingItem) return ''
      return BaseResources.extractPrimitiveValue(existingItem.name?.value || existingItem.name) || ''
    })

    const pathUpdateOldPath = computed(() => {
      const existingItem = resourcePage.pathUpdateInfo.value.existingItem
      if (!existingItem) return ''
      return BaseResources.extractPrimitiveValue(
        existingItem.resourcePath?.value || existingItem.executablePath?.value || existingItem.resourcePath || existingItem.executablePath
      ) || ''
    })

    const pathUpdateNewPath = computed(() => {
      return resourcePage.pathUpdateInfo.value.newPath || ''
    })

    const pathUpdateMissingLabel = computed(() => '文件丢失')
    const pathUpdateFoundLabel = computed(() => '文件存在')
    const pathUpdateQuestion = computed(() => '是否要更新路径？')

    // 使用工厂函数创建资源页面（简化版）
    // 使用图片缓存 composable（完全复刻 ImageView.vue，需要在 resourcePage 之前创建）
    const imageCacheComposable = useImageCache({
      enableThumbnails: true,
      jpegQuality: 80,
      thumbnailSize: 200,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      preloadCount: 3,
      isComicViewer: showComicViewer,
      isDetailModal: showDetailModal,
      pages: detailPages
    })
    
    const resourcePage = createResourcePage({
      pageConfig: {
        pageType: (resourceType.value || 'game').toLowerCase() + 's',
        itemType: (pageConfig as any).name || '资源',
        defaultPageSize: 20,
        defaultSortBy: 'name-asc'
      },
      items: items,
      filteredItems: filteredItems,
      searchQuery: searchQuery,
      sortBy: sortBy,
      crudConfig: {
        items: items,
        onAdd: async (data: any) => {
          const newItem = new ResourceClass()
          console.log('[GenericResourceView] onAdd 开始 - data:', data)
          console.log('[GenericResourceView] onAdd 开始 - newItem 初始 id:', newItem.id?.value)
          
          for (const key in data) {
            if (key in newItem) {
              const field = (newItem as any)[key]
              if (field && typeof field === 'object' && 'value' in field) {
                field.value = BaseResources.extractPrimitiveValue(data[key])
              } else {
                (newItem as any)[key] = data[key]
              }
            }
          }
          
          console.log('[GenericResourceView] onAdd 处理后 - newItem.id.value:', newItem.id?.value)
          
          // 如果资源有 folderSize 字段配置，自动计算大小
          const cardConfig = newItem.constructor?.cardDisplayConfig || 
                           (typeof newItem.constructor?.getCardDisplayConfig === 'function' 
                             ? newItem.constructor.getCardDisplayConfig() 
                             : null)
          if (cardConfig?.badge?.field === 'folderSize' && isElectronEnvironment.value) {
            await calculateAndUpdateResourceSize(newItem, isElectronEnvironment.value)
          }
          
          items.value.push(newItem)
          
          // 保存数据
          await saveData()
          
          return newItem
        },
        onUpdate: async (id: string, updates: any) => {
          const item = items.value.find((i: any) => (i.id?.value || i.id) === id)
          if (item) {
            // 更新 ResourceField 的值（而不是直接覆盖对象）
            Object.keys(updates).forEach(key => {
              if (item[key] && typeof item[key] === 'object' && 'value' in item[key]) {
                // 是 ResourceField，更新 value
                item[key].value = BaseResources.extractPrimitiveValue(updates[key])
              } else {
                // 不是 ResourceField，直接赋值（如 folderSize, playTime 等额外字段）
                item[key] = updates[key]
              }
            })
            
            // 仅当更新了 resourcePath、且当前没有 folderSize 数据时才计算大小（不覆盖已有值）
            if (updates.resourcePath && isElectronEnvironment.value) {
              const cardConfig = item.constructor?.cardDisplayConfig || 
                               (typeof item.constructor?.getCardDisplayConfig === 'function' 
                                 ? item.constructor.getCardDisplayConfig() 
                                 : null)
              if (cardConfig?.badge?.field === 'folderSize') {
                const folderSize = BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize)
                if (folderSize === undefined || folderSize === null) {
                  await calculateAndUpdateResourceSize(item, isElectronEnvironment.value)
                }
              }
            }
            
            // 保存数据
            await saveData()
          }
        },
        onDelete: async (id: string) => {
          const index = items.value.findIndex((i: any) => (i.id?.value || i.id) === id)
          if (index > -1) {
            items.value.splice(index, 1)
            
            // 保存数据
            await saveData()
          }
        },
        onLoad: async () => {
          // 数据已在 onMounted 时加载
        },
        onSave: async () => {
          // 调用统一的保存函数
          await saveData()
        },
        getItemName: (item: any) => item.name?.value || item.name,
        itemType: pageConfig.name || '资源'
      },
      contextMenuHandlers: contextMenuHandlers,
      emptyState: pageConfig.getEmptyStateConfig ? pageConfig.getEmptyStateConfig() : {
        icon: '📄',
        title: '暂无数据',
        description: '点击"添加"按钮添加新项目',
        buttonText: '添加',
        buttonAction: 'showAddDialog'
      },
      toolbar: {
        ...pageConfig.getToolbarConfig(),
        sortOptions: sortOptions.map(option => ({
          value: option.value,
          label: option.label
        }))
      },
      displayLayout: pageConfig.displayLayoutConfig,
      // 不提供 getStats，让 DetailPanel 使用配置生成的数据记录
      // getStats: (item: any) => {
      //   // 简化版统计信息
      //   return [
      //     { label: '名称', value: item.name?.value || item.name || '未知' }
      //   ]
      // },
      // 不提供 getActions，让 DetailPanel 使用默认的 actions（会根据 type 自动生成对应的按钮）
      // getActions: (item: any) => {
      //   return [
      //     { key: 'edit', icon: '✏️', label: '编辑', class: 'btn-edit' },
      //     { key: 'remove', icon: '🗑️', label: '删除', class: 'btn-remove' }
      //   ]
      // }
    })

    // 获取文件存在性状态（辅助函数）
    const getFileExists = (item: any): boolean => {
      if (item.fileExists && typeof item.fileExists === 'object' && 'value' in item.fileExists) {
        return item.fileExists.value !== false
      }
      return item.fileExists !== false
    }

    // 设置文件存在性状态（辅助函数）
    const setFileExists = (item: any, exists: boolean): void => {
      if (item.fileExists && typeof item.fileExists === 'object' && 'value' in item.fileExists) {
        item.fileExists.value = exists
      } else {
        item.fileExists = exists
      }
    }

    // 获取资源文件路径（支持多种字段名）
    const getResourceFilePath = (item: any): string | null => {
      // 尝试不同的路径字段名
      const pathFields = ['resourcePath', 'filePath', 'executablePath']
      for (const field of pathFields) {
        const fieldValue = item[field]
        if (fieldValue) {
          const path = BaseResources.extractPrimitiveValue(fieldValue)
          if (path) return path
        }
      }
      return null
    }

    /**
     * 详情面板 / 右键菜单 共用操作：根据 actionKey 执行对应逻辑，便于复用。
     */
    const handleDetailActionImpl = (actionKey: string, item: any) => {
      switch (actionKey) {
        case 'launch':
          handleResourceAction(item)
          break
        case 'launchWithLocale':
          handleResourceAction(item, { handlerName: 'launchWithLocale' })
          break
        case 'terminate':
          showTerminateConfirmDialog.value = true
          resourceToTerminate.value = item
          break
        case 'folder': {
          const filePath = getResourceFilePath(item)
          const folderPath = BaseResources.extractPrimitiveValue(item.folderPath?.value ?? item.folderPath)
          const path = filePath || folderPath
          if (!path || !path.trim()) {
            notify.toast('error', '打开失败', '未找到资源路径')
            break
          }
          if (!isElectronEnvironment.value || !window.electronAPI) {
            notify.toast('error', '打开失败', '当前环境不支持')
            break
          }
          if (filePath && window.electronAPI.openFileFolder) {
            window.electronAPI.openFileFolder(filePath).then((result: { success?: boolean; error?: string }) => {
              if (result.success) {
                notify.toast('success', '已打开', '已打开文件所在文件夹')
              } else {
                notify.toast('error', '打开失败', result.error || '未知错误')
              }
            }).catch((err: Error) => {
              notify.toast('error', '打开失败', err.message || '未知错误')
            })
          } else if (folderPath && window.electronAPI.openFolder) {
            window.electronAPI.openFolder(folderPath).then((result: { success?: boolean; error?: string }) => {
              if (result.success) {
                notify.toast('success', '已打开', '已打开文件夹')
              } else {
                notify.toast('error', '打开失败', result.error || '未知错误')
              }
            }).catch((err: Error) => {
              notify.toast('error', '打开失败', err.message || '未知错误')
            })
          } else {
            notify.toast('error', '打开失败', 'API 不可用')
          }
          break
        }
        case 'edit':
          if ((resourcePage as any).showEdit) {
            (resourcePage as any).showEdit(item)
          }
          break
        case 'remove':
          if ((resourcePage as any).deleteItem) {
            (resourcePage as any).deleteItem(item)
          }
          break
        case 'screenshot-folder': {
          const gameId = BaseResources.extractPrimitiveValue(item.id?.value ?? item.id)
          const gameName = BaseResources.extractPrimitiveValue(item.name?.value ?? item.name) ?? ''
          if (!gameId) {
            notify.toast('error', '打开失败', '游戏ID不存在，无法打开截图文件夹')
            break
          }
          if (!isElectronEnvironment.value || !window.electronAPI?.openFolder) {
            notify.toast('error', '打开失败', '当前环境不支持')
            break
          }
          getGameScreenshotFolderPath(gameId, gameName, isElectronEnvironment.value)
            .then(async (gameScreenshotPath) => {
              try {
                if (window.electronAPI?.ensureDirectory) {
                  await window.electronAPI.ensureDirectory(gameScreenshotPath)
                }
                const result = await window.electronAPI!.openFolder(gameScreenshotPath)
                if (result.success) {
                  notify.toast('success', '已打开', `已打开 ${gameName} 的截图文件夹`)
                } else {
                  notify.toast('error', '打开失败', result.error || '未知错误')
                }
              } catch (err: any) {
                notify.toast('error', '打开失败', err.message || '未知错误')
              }
            })
            .catch((err: any) => {
              notify.toast('error', '打开失败', err.message || '未知错误')
            })
          break
        }
        default:
          break
      }
    }

    const confirmScraperUpdate = async (match: any) => {
      const item = scraperCurrentItem.value
      if (!item || !window.electronAPI?.scraperDbApply || !isElectronEnvironment.value) return
      const rt = resourceType.value
      const scraperTable = RESOURCE_TYPE_TO_SCRAPER_TABLE[rt]
      const mainId = BaseResources.extractPrimitiveValue(item.id?.value ?? item.id)
      if (!mainId || !scraperTable || !match?.jsonData) {
        notify.toast('error', '刮削', '参数不完整')
        closeScraperDialog()
        return
      }
      try {
        const res = await window.electronAPI.scraperDbApply(scraperTable, mainId, match.jsonData)
        if (res?.ok) {
          const scraped = typeof match.jsonData === 'string' ? JSON.parse(match.jsonData) : match.jsonData
          for (const [key, value] of Object.entries(scraped)) {
            if (key === 'id' || SCRAPER_ONLY_KEYS.includes(key)) continue
            const f = item[key]
            const current = f && typeof f === 'object' && 'value' in f ? f.value : item[key]
            const isEmpty = current === null || current === undefined || current === ''
            if (isEmpty && value !== null && value !== undefined && value !== '') {
              if (f && typeof f === 'object' && 'value' in f) {
                f.value = value
              } else {
                item[key] = value
              }
            }
          }
          await saveData()
          notify.toast('success', '刮削', '补全成功')
        } else {
          notify.toast('error', '刮削', res?.message || '更新失败')
        }
      } catch (e: any) {
        notify.toast('error', '刮削', e?.message || '更新失败')
      }
      closeScraperDialog()
    }
    const closeScraperDialog = () => {
      showScraperDialog.value = false
      scraperMatches.value = []
      scraperCurrentItem.value = null
    }

    // 右键菜单与详情面板复用同一套逻辑：按 key 派发到 handleDetailActionImpl
    contextMenuHandlers.launch = (item: any) => handleDetailActionImpl('launch', item)
    contextMenuHandlers.launchWithLocale = (item: any) => handleDetailActionImpl('launchWithLocale', item)
    contextMenuHandlers.folder = (item: any) => handleDetailActionImpl('folder', item)
    contextMenuHandlers['screenshot-folder'] = (item: any) => handleDetailActionImpl('screenshot-folder', item)
    contextMenuHandlers.terminate = (item: any) => handleDetailActionImpl('terminate', item)
    contextMenuHandlers.edit = (item: any) => handleDetailActionImpl('edit', item)
    contextMenuHandlers.remove = (item: any) => handleDetailActionImpl('remove', item)

    contextMenuHandlers.batchAddTag = () => handleBatchAddTag()
    contextMenuHandlers.batchDeleteTag = () => handleBatchDeleteTag()
    contextMenuHandlers.batchDelete = () => handleBatchDelete()

    // 通用的文件存在性检查函数
    const checkFileExistence = async (): Promise<void> => {
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.checkFileExists) {
        // 如果API不可用，默认设置为存在
        items.value.forEach((item: any) => {
          setFileExists(item, true)
        })
        // 更新筛选器数量
        if (filterComposable.extractAllFilters) {
          filterComposable.extractAllFilters()
          setTimeout(() => {
            const filterData = filterComposable.getFilterData()
            emit('filter-data-updated', filterData)
          }, 100)
        }
        return
      }
      
      let checkedCount = 0
      let missingCount = 0
      
      for (const item of items.value) {
        // 获取文件路径
        const filePath = getResourceFilePath(item)
        
        // 如果没有找到路径，标记为不存在
        if (!filePath) {
          setFileExists(item, false)
          missingCount++
          checkedCount++
          continue
        }
        
        try {
          const result = await window.electronAPI.checkFileExists(filePath)
          const exists = result.exists || false
          
          // 更新 fileExists 字段
          setFileExists(item, exists)
          
          if (!exists) {
            missingCount++
          }
        } catch (error) {
          const itemName = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || '未知资源'
          console.error(`[GenericResourceView] ❌ 检测文件存在性失败: ${itemName}`, error)
          
          // 出错时标记为不存在
          setFileExists(item, false)
          missingCount++
        }
        
        checkedCount++
      }
      
      // 如果有丢失的文件，显示提醒
      if (missingCount > 0) {
        notify.toast('warning', '文件检测完成', `检测到 ${missingCount} 个文件不存在`)
      }
      
      // 更新筛选器数量（特别是"丢失的资源"筛选器）
      if (filterComposable.extractAllFilters) {
        filterComposable.extractAllFilters()
        // 延迟更新筛选器数据，确保数据已提取
        setTimeout(() => {
          const filterData = filterComposable.getFilterData()
          emit('filter-data-updated', filterData)
        }, 100)
      }
    }

    // 自动计算资源大小（仅针对配置了 folderSize 且尚未有数据的资源；有值则不覆盖）
    const calculateResourceSizes = async () => {
      if (!isElectronEnvironment.value) {
        return
      }
      
      const cardConfig = ResourceClass.cardDisplayConfig || 
                        (typeof ResourceClass.getCardDisplayConfig === 'function' 
                          ? ResourceClass.getCardDisplayConfig() 
                          : null)
      if (cardConfig?.badge?.field !== 'folderSize') {
        return
      }
      
      // 筛选：有 resourcePath，且 folderSize 为 undefined、null 或 0 才计算
      const resourcesToCalculate = items.value.filter((item: any) => {
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath || item.executablePath?.value || item.executablePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) {
          return false
        }
        const folderSize = BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize)
        return folderSize === undefined || folderSize === null || folderSize === 0
      })
      
      if (resourcesToCalculate.length === 0) {
        return
      }
      
      const updatedCount = await calculateResourceSizesBatch(
        resourcesToCalculate,
        isElectronEnvironment.value
      )
      if (updatedCount > 0) {
        await saveData()
      }
    }

    // 自动计算漫画/图片页数（仅针对配置了 pagesCount 且尚未有数据的资源；有值则不覆盖）
    const calculateMangaPagesCounts = async () => {
      if (!isElectronEnvironment.value || !window.electronAPI) {
        return
      }
      if (!window.electronAPI.listImageFiles && !window.electronAPI.listImageFilesInArchive) {
        return
      }

      const cardConfig = ResourceClass.cardDisplayConfig ||
                        (typeof ResourceClass.getCardDisplayConfig === 'function'
                          ? ResourceClass.getCardDisplayConfig()
                          : null)
      if (cardConfig?.badge?.field !== 'pagesCount') {
        return
      }

      // 筛选：有 resourcePath，且 pagesCount 为空（undefined、null 或 0）才计算
      const resourcesToCalculate = items.value.filter((item: any) => {
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) {
          return false
        }
        const pagesCount = BaseResources.extractPrimitiveValue(item.pagesCount?.value ?? item.pagesCount)
        return pagesCount === undefined || pagesCount === null || pagesCount === 0
      })

      if (resourcesToCalculate.length === 0) {
        return
      }

      for (let i = 0; i < resourcesToCalculate.length; i++) {
        const item = resourcesToCalculate[i]
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) continue
        try {
          let count = 0
          if (/\.(cbz|zip)$/i.test(resourcePath) && window.electronAPI.listImageFilesInArchive) {
            const resp = await window.electronAPI.listImageFilesInArchive(resourcePath)
            count = resp?.success && Array.isArray(resp.files) ? resp.files.length : 0
          } else {
            const resp = await window.electronAPI.listImageFiles(resourcePath)
            count = resp?.success && Array.isArray(resp.files) ? resp.files.length : 0
          }
          if (item.pagesCount && typeof item.pagesCount === 'object' && 'value' in item.pagesCount) {
            item.pagesCount.value = count
          } else if (item.pagesCount !== undefined) {
            item.pagesCount = count
          } else {
            item.pagesCount = count
          }
        } catch (error) {
          console.warn('[GenericResourceView] 获取漫画页数失败:', resourcePath, error)
        }
        if (i < resourcesToCalculate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
    }

    // 自动计算番剧/视频文件夹的视频数量（仅针对配置了 videoCount 且尚未有数据的资源；有值则不覆盖）
    const calculateAnimeVideoCounts = async () => {
      const cardConfig = ResourceClass.cardDisplayConfig ||
                        (typeof ResourceClass.getCardDisplayConfig === 'function'
                          ? ResourceClass.getCardDisplayConfig()
                          : null)
      if (cardConfig?.badge?.field !== 'videoCount') {
        return
      }

      // 筛选：有 resourcePath，且 videoCount 为空（undefined、null 或 0）才计算
      const resourcesToCalculate = items.value.filter((item: any) => {
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) {
          return false
        }
        const videoCount = BaseResources.extractPrimitiveValue(item.videoCount)
        return videoCount === undefined || videoCount === null || videoCount === 0
      })

      if (resourcesToCalculate.length === 0) {
        return
      }

      for (let i = 0; i < resourcesToCalculate.length; i++) {
        const item = resourcesToCalculate[i]
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) continue
        try {
          const folder = { ...item, folderPath: resourcePath }
          const folderVideos = await videoFolderComposable.getFolderVideos(folder)
          const count = folderVideos?.length ?? 0
          item.videoCount = count
        } catch (error) {
          console.warn('[GenericResourceView] 获取番剧视频数量失败:', resourcePath, error)
          item.videoCount = 0
        }
        if (i < resourcesToCalculate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
    }

    /**
     * 刷新未知时长的视频（仅对 duration 为 0 或未设置的项更新，已有时长的不刷新）
     */
    const refreshUnknownVideoDurations = async () => {
      const toUpdate = items.value.filter((item: any) => {
        const duration = BaseResources.extractPrimitiveValue(item.duration?.value ?? item.duration)
        return (duration === undefined || duration === null || duration === 0) && item.resourcePath != null
      })
      if (toUpdate.length === 0) return
      console.log(`[GenericResourceView] 开始刷新 ${toUpdate.length} 个未知时长的视频...`)
      let updatedCount = 0
      for (const item of toUpdate) {
        const path = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        if (!path || typeof path !== 'string' || !path.trim()) continue
        try {
          const duration = await getVideoDuration(path)
          if (duration > 0) {
            if (item.duration && typeof item.duration === 'object' && 'value' in item.duration) {
              item.duration.value = duration
            } else {
              item.duration = duration
            }
            updatedCount++
          }
        } catch (e) {
          console.warn('[GenericResourceView] 获取视频时长失败:', path, e)
        }
      }
      if (updatedCount > 0) {
        await saveData()
        console.log(`[GenericResourceView] 已刷新 ${updatedCount} 个视频时长并保存`)
      }
    }

    /**
     * 刷新未知时长的音频（仅对 duration 为 0 或未设置的项更新，已有时长的不刷新）
     */
    const refreshUnknownAudioDurations = async () => {
      const toUpdate = items.value.filter((item: any) => {
        const duration = BaseResources.extractPrimitiveValue(item.duration?.value ?? item.duration)
        return (duration === undefined || duration === null || duration === 0) && item.resourcePath != null
      })
      if (toUpdate.length === 0) return
      console.log(`[GenericResourceView] 开始刷新 ${toUpdate.length} 个未知时长的音频...`)
      let updatedCount = 0
      for (const item of toUpdate) {
        const path = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        if (!path || typeof path !== 'string' || !path.trim()) continue
        try {
          const duration = await getAudioDuration(path)
          if (duration > 0) {
            if (item.duration && typeof item.duration === 'object' && 'value' in item.duration) {
              item.duration.value = duration
            } else {
              item.duration = duration
            }
            updatedCount++
          }
        } catch (e) {
          console.warn('[GenericResourceView] 获取音频时长失败:', path, e)
        }
      }
      if (updatedCount > 0) {
        await saveData()
        console.log(`[GenericResourceView] 已刷新 ${updatedCount} 个音频时长并保存`)
      }
    }

    // 监听请求更新游戏时长事件（实时更新总时长）
    const handleRequestUpdatePlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const resource = items.value.find((i: any) => (i.id?.value || i.id) === gameId)
      if (resource && gameRunningStore && gameInitialPlayTimes.value) {
        // 如果还没有保存初始值，先保存（第一次更新时）
        if (!gameInitialPlayTimes.value.has(gameId)) {
          const playTimeValue = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0
          gameInitialPlayTimes.value.set(gameId, playTimeValue)
        }
        
        // 获取初始 playTime（启动时的值）
        const initialPlayTime = gameInitialPlayTimes.value.get(gameId) || 0
        // 计算当前总时长 = 初始时长 + 会话时长
        const totalPlayTime = gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新游戏时长（用于显示）
        if (resource.playTime && typeof resource.playTime === 'object' && 'value' in resource.playTime) {
          resource.playTime.value = totalPlayTime
        } else {
          resource.playTime = totalPlayTime
        }
      }
    }
    
    // 监听请求最终游戏时长事件（游戏结束时）
    const handleRequestFinalPlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const resource = items.value.find((i: any) => (i.id?.value || i.id) === gameId)
      if (resource && gameRunningStore && gameInitialPlayTimes.value) {
        // 获取初始 playTime（从保存的初始值获取，如果不存在则使用当前值）
        const currentPlayTime = BaseResources.extractPrimitiveValue(resource.playTime?.value || resource.playTime) || 0
        const initialPlayTime = gameInitialPlayTimes.value.get(gameId) || currentPlayTime
        // 计算最终总时长
        const totalPlayTime = gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新并保存
        if (resource.playTime && typeof resource.playTime === 'object' && 'value' in resource.playTime) {
          resource.playTime.value = totalPlayTime
        } else {
          resource.playTime = totalPlayTime
        }
        // 清除保存的初始值
        gameInitialPlayTimes.value.delete(gameId)
        
        // 注意：这里不调用保存方法，因为 GenericResourceView 是通用组件，保存逻辑由上层管理
        // 如果需要保存，可以通过事件通知上层组件
      }
    }

    // 监听游戏进程结束事件
    onMounted(async () => {
      // 1. 加载页面数据（仅从数据库读取）
      const pageId = props.pageConfig?.id
      if (!pageId) {
        throw new Error('[GenericResourceView] 没有 pageId，无法加载数据')
      }
      isLoadingData.value = true
      try {
        if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.sqliteGetPageData) {
          throw new Error('[GenericResourceView] 不在 Electron 环境或数据库 API 不可用')
        }
        console.log(`[GenericResourceView] ====== 加载数据 ====== pageId="${pageId}", resourceType="${resourceType.value}", ResourceClass=${ResourceClass?.name}`)
        const result = await window.electronAPI.sqliteGetPageData(pageId)
        console.log(`[GenericResourceView] sqliteGetPageData 返回:`, { ok: result?.ok, dataLength: result?.data?.length, message: result?.message })
        if (!result || !result.ok) {
          throw new Error(result?.message || '[GenericResourceView] 获取页面数据失败')
        }
        const loadedData = result.data
        console.log(`[GenericResourceView] loadedData 条数: ${loadedData?.length ?? 0}`, loadedData?.length > 0 ? `首条 keys: ${Object.keys(loadedData[0] || {}).join(',')}` : '')
        if (ResourceClass && ResourceClass.fromJSON) {
          const converted: any[] = []
          for (let i = 0; i < (loadedData?.length || 0); i++) {
            try {
              converted.push(ResourceClass.fromJSON(loadedData[i]))
            } catch (e) {
              console.error(`[GenericResourceView] fromJSON 第 ${i} 条失败:`, loadedData[i], e)
              throw e
            }
          }
          items.value = converted
          console.log(`[GenericResourceView] fromJSON 转换完成，items.length=${items.value.length}`)
        } else {
          items.value = loadedData || []
        }
        if (filterComposable.extractAllFilters) {
          filterComposable.extractAllFilters()
          setTimeout(() => {
            const filterData = filterComposable.getFilterData()
            emit('filter-data-updated', filterData)
          }, 100)
        }
      } catch (error) {
        console.error(`[GenericResourceView] 页面 ${pageId} 数据加载失败:`, error)
        console.error(`[GenericResourceView] 错误堆栈:`, (error as Error)?.stack)
        throw error
      } finally {
        isLoadingData.value = false
      }
      
      // 2. 注册事件监听器
      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.onGameProcessEnded) {
        window.electronAPI.onGameProcessEnded((event: any, data: any) => {
          handleGameProcessEnded(data)
        })
      }

      // 游戏页：注册全局截图快捷键（与 GameView 一致）
      console.log('[GenericResourceView] 截图相关检查:', {
        resourceType: resourceType.value,
        hasTakeScreenshot: !!gameScreenshotComposable?.takeScreenshot,
        isElectron: isElectronEnvironment.value,
        hasOnGlobalScreenshotTrigger: !!(window.electronAPI?.onGlobalScreenshotTrigger),
        hasInitializeGlobalShortcut: !!gameScreenshotComposable?.initializeGlobalShortcut
      })
      if (gameScreenshotComposable?.takeScreenshot && isElectronEnvironment.value && window.electronAPI?.onGlobalScreenshotTrigger) {
        window.electronAPI.onGlobalScreenshotTrigger(() => {
          console.log('[GenericResourceView] 收到 global-screenshot-trigger，执行 takeScreenshot')
          gameScreenshotComposable.takeScreenshot()
        })
        // 向主进程注册截图快捷键（否则按键无反应）
        if (gameScreenshotComposable.initializeGlobalShortcut) {
          gameScreenshotComposable.initializeGlobalShortcut().then(() => {
            console.log('[GenericResourceView] initializeGlobalShortcut 调用完成')
          }).catch((e: any) => {
            console.warn('[GenericResourceView] initializeGlobalShortcut 失败:', e)
          })
          console.log('[GenericResourceView] 已调用 initializeGlobalShortcut')
        } else {
          console.warn('[GenericResourceView] 无 initializeGlobalShortcut，截图键将不会注册')
        }
      } else {
        console.warn('[GenericResourceView] 未注册截图监听，条件不满足')
      }
      
      // 注册游戏时长更新事件监听器（用于实时更新总时长）
      window.addEventListener('game-request-update-playtime', handleRequestUpdatePlaytime as EventListener)
      window.addEventListener('game-request-final-playtime', handleRequestFinalPlaytime as EventListener)
      
      // 启动定时器，定期触发行时长更新（每1秒）（凡使用 launchExecutable 的页面都参与）
      playtimeUpdateTimer = setInterval(() => {
        if (supportsRunningTracking.value) {
          const runningIds = gameRunningStore.runningGameIds
          if (runningIds && runningIds.length > 0) {
            runningIds.forEach((resourceId: string) => {
              const event = new CustomEvent('game-request-update-playtime', {
                detail: { gameId: resourceId }
              })
              window.dispatchEvent(event)
            })
          }
        }
      }, 1000) // 每1秒更新一次
      
      // 组件挂载后自动检查文件存在性
      // 注意：数据加载在前面已经处理了，这里的 items.value 检查是为了处理传入 props.items 的情况
      if (items.value && items.value.length > 0) {
        await checkFileExistence()
        // 自动计算资源大小
        await calculateResourceSizes()
        // 漫画/图片页：首次进入时刷新所有未设置页数的资源的页数
        await calculateMangaPagesCounts()
        // 番剧页：首次进入时刷新所有未设置视频数量的资源的视频数
        await calculateAnimeVideoCounts()
        // 视频页：首次进入时刷新所有未知时长的视频（已有时长的不刷新）
        if (resourceType.value === 'Video') {
          refreshUnknownVideoDurations()
        }
        // 音频页：首次进入时刷新所有未知时长的音频（已有时长的不刷新）
        if (resourceType.value === 'Audio' || props.pageConfig?.id === 'audio') {
          refreshUnknownAudioDurations()
        }
      }
    })
    
    // 组件卸载前清理事件监听器
    onBeforeUnmount(() => {
      window.removeEventListener('game-request-update-playtime', handleRequestUpdatePlaytime as EventListener)
      window.removeEventListener('game-request-final-playtime', handleRequestFinalPlaytime as EventListener)
      // 清理定时器
      if (playtimeUpdateTimer) {
        clearInterval(playtimeUpdateTimer)
        playtimeUpdateTimer = null
      }
      // 游戏页：移除全局截图监听
      if (isElectronEnvironment.value && window.electronAPI?.removeGlobalScreenshotListener) {
        window.electronAPI.removeGlobalScreenshotListener()
      } else if (isElectronEnvironment.value && window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('global-screenshot-trigger')
      }
    })


    // 监听 items 变化，当数据更新时自动检查文件存在性和计算大小
    watch(
      () => items.value.length,
      async (newLength, oldLength) => {
        // 只在数据从空变为有数据，或者数据数量变化时检查
        if (newLength > 0 && (oldLength === 0 || newLength !== oldLength)) {
          // 延迟一点执行，确保数据已经更新完成
          await new Promise(resolve => setTimeout(resolve, 100))
          await checkFileExistence()
          await calculateResourceSizes()
          await calculateMangaPagesCounts()
          await calculateAnimeVideoCounts()
          if (resourceType.value === 'Video') {
            refreshUnknownVideoDurations()
          }
          if (resourceType.value === 'Audio' || props.pageConfig?.id === 'audio') {
            refreshUnknownAudioDurations()
          }
        }
      },
      { immediate: false }
    )
    
    // 详情面板类型（计算属性）- 完全从资源的配置中读取
    const detailPanelType = computed(() => {
      // 从当前选中资源的配置中读取
      if (resourcePage.selectedItem.value) {
        const selectedItem = resourcePage.selectedItem.value
        const ResourceClass = selectedItem.constructor
        const config = ResourceClass?.detailPanelConfig
        
        // 如果配置中有 type 字段，使用配置的 type
        if (config?.type) {
          return config.type
        }
      }
      
      // 如果配置中没有 type，返回默认值（DetailPanel 需要 type prop）
      return 'game'
    })
    
    // 计算是否应该显示预览（从配置的 previewArea 读取：useSelfFolder = 资源自身文件夹，useScreenshotFolder = 游戏截图文件夹）
    const shouldShowPreview = computed(() => {
      if (!resourcePage.selectedItem.value) return false
      const selectedItem = resourcePage.selectedItem.value
      const ResourceClass = selectedItem.constructor
      const config = ResourceClass?.detailPanelConfig
      const area = config?.previewArea
      return area === 'useSelfFolder' || area === 'useScreenshotFolder'
    })

    // 番剧详情页是否显示视频列表（用于替换视频页时展示集数，包含空列表时显示“未找到视频”）
    const isAnimeWithFolderVideos = computed(() => {
      if (resourceType.value !== 'Anime') return false
      const item = resourcePage.selectedItem.value
      return !!item && Array.isArray(item.folderVideos)
    })

    // 播放番剧文件夹中的视频
    const playFolderVideo = async (video: { name: string; path: string }) => {
      try {
        if (window.electronAPI?.checkFileExists) {
          const result = await window.electronAPI.checkFileExists(video.path)
          if (!result?.exists) {
            notify.toast('error', '播放失败', `番剧文件不存在: ${video.name}`)
            return
          }
        }
        const saveManagerModule = await import('../utils/SaveManager.ts')
        const settings = await saveManagerModule.default.loadSettings()
        const playMode = settings?.videoPlayMode === 'internal' ? 'internal' : 'external'
        if (playMode === 'internal') {
          await videoPlaybackComposable.playVideoInternal({ name: video.name, filePath: video.path })
        } else {
          await videoPlaybackComposable.playVideoExternal({ name: video.name, filePath: video.path })
        }
        notify.toast('success', '播放成功', `正在播放: ${video.name}`)
      } catch (error: any) {
        console.error('[GenericResourceView] 播放番剧视频失败:', error)
        notify.toast('error', '播放失败', `播放失败: ${error?.message || '未知错误'}`)
      }
    }

    // 番剧视频缩略图 URL（FolderVideosGrid 使用）
    const getThumbnailUrlForFolderVideo = (thumbnail: string) => {
      return videoThumbnailComposable.getThumbnailUrl(thumbnail)
    }

    const handleFolderVideoThumbnailError = (event: Event) => {
      videoThumbnailComposable.handleThumbnailError(event)
    }

    // 为番剧文件夹中的视频生成缩略图
    const generateFolderVideoThumbnail = async (video: { name: string; path: string; thumbnail?: string; isGeneratingThumbnail?: boolean }, index: number) => {
      const selectedItem = resourcePage.selectedItem.value
      if (!selectedItem) return
      try {
        video.isGeneratingThumbnail = true
        const folderName = BaseResources.extractPrimitiveValue(selectedItem.name?.value || selectedItem.name) || '未知'
        const cleanFolderName = folderName.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        const videoFileName = video.path.split(/[\\/]/).pop() || ''
        const nameWithoutExt = videoFileName.replace(/\.[^/.]+$/, '')
        const cleanVideoName = nameWithoutExt.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        const maxNumber = await videoThumbnailComposable.getMaxFolderVideoThumbnailNumber(cleanFolderName, cleanVideoName)
        const thumbnailFilename = `${cleanFolderName}/${cleanVideoName}_cover_${maxNumber + 1}.jpg`
        if (video.thumbnail?.trim()) {
          await videoThumbnailComposable.deleteOldThumbnail(video.thumbnail)
        }
        const thumbnailPath = await videoThumbnailComposable.generateThumbnailForFolderVideo(video.path, thumbnailFilename)
        if (thumbnailPath) {
          video.thumbnail = thumbnailPath
          const videoInList = selectedItem.folderVideos?.[index]
          if (videoInList) videoInList.thumbnail = thumbnailPath
          const originalItem = items.value.find((i: any) => (i.id?.value || i.id) === (selectedItem.id?.value || selectedItem.id))
          if (originalItem?.folderVideos?.[index]) {
            originalItem.folderVideos[index].thumbnail = thumbnailPath
          }
          try {
            await saveData()
          } catch (e) {
            console.warn('[GenericResourceView] 保存番剧缩略图失败:', e)
          }
          notify.toast('success', '生成成功', `缩略图已生成: ${video.name}`)
        } else {
          notify.toast('error', '生成失败', '无法生成缩略图，请检查视频文件是否有效')
        }
      } catch (error: any) {
        console.error('[GenericResourceView] 生成番剧视频缩略图失败:', error)
        notify.toast('error', '生成失败', `生成缩略图失败: ${error?.message || '未知错误'}`)
      } finally {
        video.isGeneratingThumbnail = false
      }
    }
    
    // 监听详情面板显示，同步 showDetailModal（完全复刻 ImageView.vue）
    watch(
      () => resourcePage.showDetailDialog.value,
      (showDetail) => {
        showDetailModal.value = showDetail
      }
    )
    
    // 监听详情面板显示，加载预览内容（图片列表 或 番剧视频列表）
    watch(
      () => [resourcePage.showDetailDialog.value, resourcePage.selectedItem.value],
      async ([showDetail, selectedItem]) => {
        if (showDetail && selectedItem) {
          const ResourceClass = selectedItem.constructor
          const config = ResourceClass?.detailPanelConfig
          const previewArea = config?.previewArea

          // 番剧类型：加载文件夹内的视频列表（用于替换视频页时展示集数）
          const isAnimeFolder = resourceType.value === 'Anime'
          if (isAnimeFolder) {
            const folderPath = BaseResources.extractPrimitiveValue(
              selectedItem.resourcePath?.value || selectedItem.resourcePath
            )
            if (folderPath && !selectedItem.folderVideos) {
              try {
                const folder = { ...selectedItem, folderPath: folderPath || selectedItem.folderPath }
                const folderVideos = await videoFolderComposable.getFolderVideos(folder)
                selectedItem.folderVideos = folderVideos
                selectedItem.videoCount = folderVideos.length
                const originalItem = items.value.find((i: any) => (i.id?.value || i.id) === (selectedItem.id?.value || selectedItem.id))
                if (originalItem) {
                  originalItem.folderVideos = folderVideos
                  originalItem.videoCount = folderVideos.length
                }
              } catch (error) {
                console.error('[GenericResourceView] 加载番剧视频列表失败:', error)
                selectedItem.folderVideos = []
              }
            }
          }

          // Image/Manga 类型：加载图片列表
          const shouldLoad = previewArea === 'useSelfFolder' || previewArea === 'useScreenshotFolder'
          if (shouldLoad) {
            try {
              detailPages.value = []
              imagePagesComposable.resetPagination()
              
              try {
                if (imagePagesComposable.loadImageSettings && typeof imagePagesComposable.loadImageSettings === 'function') {
                  await imagePagesComposable.loadImageSettings()
                }
              } catch (error) {
                console.warn('[GenericResourceView] 加载图片设置失败:', error)
              }
              
              let files: string[] = []
              if (isElectronEnvironment.value && window.electronAPI) {
                if (previewArea === 'useSelfFolder') {
                  const resourcePath = BaseResources.extractPrimitiveValue(
                    selectedItem.resourcePath?.value || selectedItem.resourcePath
                  )
                  if (resourcePath) {
                    if (/\.(cbz|zip)$/i.test(resourcePath) && window.electronAPI.listImageFilesInArchive) {
                      const resp = await window.electronAPI.listImageFilesInArchive(resourcePath)
                      if (resp.success && Array.isArray(resp.files) && resp.files.length > 0) {
                        const base = `archive:///${resourcePath.replace(/\\/g, '/')}`
                        files = resp.files.map((entry: string) => `${base}#${encodeURIComponent(entry)}`)
                      }
                    } else if (window.electronAPI.listImageFiles) {
                      const resp = await window.electronAPI.listImageFiles(resourcePath)
                      if (resp.success) files = resp.files || []
                    }
                  }
                } else if (previewArea === 'useScreenshotFolder' && window.electronAPI?.listImageFiles) {
                  const gameId = BaseResources.extractPrimitiveValue(selectedItem.id?.value ?? selectedItem.id)
                  const gameName = BaseResources.extractPrimitiveValue(selectedItem.name?.value ?? selectedItem.name) ?? ''
                  if (gameId) {
                    const screenshotFolderPath = await getGameScreenshotFolderPath(gameId, gameName, isElectronEnvironment.value)
                    const resp = await window.electronAPI.listImageFiles(screenshotFolderPath)
                    if (resp.success) files = resp.files || []
                  }
                }
              }
              detailPages.value = files
              imagePagesComposable.updateTotalPages()
              
              if (selectedItem.pagesCount && typeof selectedItem.pagesCount === 'object' && 'value' in selectedItem.pagesCount) {
                selectedItem.pagesCount.value = files.length
              } else if (selectedItem.pagesCount !== undefined) {
                selectedItem.pagesCount = files.length
              }
            } catch (error) {
              console.error('[GenericResourceView] 加载图片列表失败:', error)
            }
          }
        } else if (!showDetail) {
          // 关闭详情时清空图片列表
          detailPages.value = []
        }
      },
      { immediate: false }
    )
    
    // 注意：resolveImage 和 handleImageError 来自 imageCacheComposable（通过 ...imageCacheComposable 展开）
    // 不需要单独定义，完全复刻 ImageView.vue 的方式
    
    // 处理图片点击（打开阅读器，完全复刻 ImageView.vue 的 viewPage 方法）
    const handleDetailPageClick = async (index: number) => {
      // 计算实际索引（考虑分页，使用 composable 的 detailCurrentPageStartIndex）
      const actualIndex = imagePagesComposable.detailCurrentPageStartIndex.value + index
      currentPageIndex.value = actualIndex
      currentAlbum.value = resourcePage.selectedItem.value
      pages.value = detailPages.value
      
      if (currentAlbum.value) {
        try {
          const albumId = BaseResources.extractPrimitiveValue(currentAlbum.value.id?.value || currentAlbum.value.id)
          const item = items.value.find((i: any) => (i.id?.value || i.id) === albumId)
          if (item) {
            const now = new Date().toISOString()
            if (item.visitedSessions != null && typeof item.visitedSessions === 'object' && 'value' in item.visitedSessions) {
              const sessions = Array.isArray(item.visitedSessions.value) ? item.visitedSessions.value : []
              item.visitedSessions.value = [...sessions, now]
            } else if (Array.isArray(item.visitedSessions)) {
              item.visitedSessions = [...item.visitedSessions, now]
            } else {
              item.visitedSessions = [now]
            }
            await saveData()
          }
        } catch (error) {
          console.warn('[GenericResourceView] 更新浏览信息失败:', error)
        }
      }
      
      // 确保pages数组已加载完成后再显示阅读器
      showComicViewer.value = true
    }
    
    // 处理分页变化
    const handleDetailPageChange = (page: number) => {
      imagePagesComposable.jumpToPageGroup(page)
    }

    // FunGrid 布局相关计算属性
    const displayLayoutConfig = pageConfig.displayLayoutConfig || { minWidth: 200, maxWidth: 400 }

    const displayLayoutBaseWidth = computed(() => {
      // 使用 maxWidth 作为基础宽度，如果没有则使用默认值
      return displayLayoutConfig.maxWidth || 400
    })

    const displayLayoutMinWidth = computed(() => {
      // 使用 minWidth 作为最小缩放宽度
      return displayLayoutConfig.minWidth || 100
    })

    const displayLayoutMaxWidth = computed(() => {
      // 使用 maxWidth 作为最大缩放宽度
      return displayLayoutConfig.maxWidth || undefined
    })

    // 从 layoutStyles 中提取额外的样式（如 justifyContent）
    const customLayoutStyle = computed(() => {
      const layoutStyles = (resourcePage as any).layoutStyles
      if (!layoutStyles) return undefined
      
      const custom: Record<string, string> = {}
      // layoutStyles 是 computed，需要访问 .value
      const styles = layoutStyles.value || layoutStyles
      
      if (styles && typeof styles === 'object' && 'justifyContent' in styles) {
        custom.justifyContent = styles.justifyContent as string
      }
      return Object.keys(custom).length > 0 ? custom : undefined
    })

    // 处理灵活工具栏按钮点击
    const handleButtonClick = async (item: any) => {
      console.log('🔘 GenericResourceView 收到按钮点击:', item)
      
      // 支持直接调用 showAddDialogHandler 和其他预设方法
      if (item.action === 'showAddGameDialog' || item.action === 'showAddDialogHandler') {
        resourcePage.showAddDialogHandler()
      } else if (item.action === 'filterBySearch') {
        // 搜索操作不需要额外处理，搜索框已经绑定了 searchQuery
      } else if (item.action === 'showBatchImportDialog') {
        // 批量导入本地资源
        if (!isElectronEnvironment.value || !window.electronAPI) {
          notify.toast('error', '操作失败', '当前环境不支持此功能')
          return
        }

        try {
          // 选择文件夹
          const folderResult = await window.electronAPI.selectFolder()
          if (!folderResult.success || !folderResult.path) {
            console.log('[GenericResourceView] 用户取消选择文件夹或选择失败')
            return
          }

          // 获取当前页面支持的资源类型
          const pageResourceTypes = pageConfig.resourceTypes || [resourceType.value]

          // 收集所有匹配的扩展名
          let allAcceptedExtensions: string[] = []
          pageResourceTypes.forEach((resType: string) => {
            const config = resourceClassMap[resType]
            if (config && config.resourceClass && config.resourceClass.acceptedExtensions) {
              allAcceptedExtensions = [...allAcceptedExtensions, ...config.resourceClass.acceptedExtensions]
            }
          })

          // 去重
          allAcceptedExtensions = [...new Set(allAcceptedExtensions)]

          // 使用新的 API 递归搜索匹配的文件
          const searchResult = await window.electronAPI.searchMatchingFiles(folderResult.path, allAcceptedExtensions)
          if (!searchResult.success) {
            notify.toast('error', '搜索文件失败', searchResult.error || '未知错误')
            return
          }

          const matchedFiles = searchResult.files || []
          
          // 设置文件列表和文件夹路径并显示对话框
          batchImportFiles.value = matchedFiles
          batchImportFolderPath.value = folderResult.path
          showBatchImportDialog.value = true
        } catch (error: any) {
          console.error('[GenericResourceView] 批量导入失败:', error)
          notify.toast('error', '操作失败', error.message || '未知错误')
        }
      }
    }

    // 关闭批量导入对话框
    const closeBatchImportDialog = () => {
      showBatchImportDialog.value = false
      batchImportFiles.value = []
      batchImportFolderPath.value = ''
    }

    // 处理批量导入确认
    const handleBatchImportConfirm = async (selectedFiles: string[], folderPath: string) => {
      if (selectedFiles.length === 0) {
        notify.toast('warning', '提示', '请至少选择一个文件')
        return
      }

      try {
        let addedCount = 0
        let failedCount = 0

        // 获取当前页面支持的资源类型
        const pageResourceTypes = pageConfig.resourceTypes || [resourceType.value]

        for (const relativeFilePath of selectedFiles) {
          // 拼接完整路径
          const fullFilePath = folderPath + (folderPath.endsWith('\\') || folderPath.endsWith('/') ? '' : '/') + relativeFilePath
          const fileName = relativeFilePath.split(/[\\/]/).pop() || ''

          // 获取文件扩展名
          const lowerFileName = fileName.toLowerCase()
          const fileExt = lowerFileName.includes('.') 
            ? '.' + lowerFileName.split('.').pop() 
            : ''

          // 匹配资源类型
          let matchedResourceType: string | null = null
          let MatchedResourceClass: any = null
          
          for (const resType of pageResourceTypes) {
            const config = resourceClassMap[resType]
            if (!config) continue
            
            const ResourceClassToCheck = config.resourceClass
            const acceptedExtensions = ResourceClassToCheck.acceptedExtensions || []
            
            // 检查文件扩展名是否匹配
            if (acceptedExtensions.some((ext: string) => ext.toLowerCase() === fileExt)) {
              matchedResourceType = resType
              MatchedResourceClass = ResourceClassToCheck
              break
            }
          }

          if (!matchedResourceType || !MatchedResourceClass) {
            failedCount++
            continue
          }

          // 创建资源数据
          const resourceData: any = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            resourceType: matchedResourceType === 'Anime' ? 'videoFolder' : (matchedResourceType === 'Video' ? 'video' : matchedResourceType.toLowerCase()),
            name: extractNameFromPath(fileName),
            description: '',
            tags: [],
            resourcePath: fullFilePath,
            coverPath: '',
            folderSize: 0,
            playTime: 0,
            playCount: 0,
            visitedSessions: [],
            addedDate: new Date().toISOString(),
            fileExists: true
          }

          // 获取文件大小
          if (isElectronEnvironment.value && window.electronAPI) {
            if (window.electronAPI.getFileStats) {
              const result = await window.electronAPI.getFileStats(fullFilePath)
              if (result.success && result.size) {
                resourceData.folderSize = result.size
              }
            } else if (window.electronAPI.getFolderSize) {
              const result = await window.electronAPI.getFolderSize(fullFilePath)
              if (result.success) {
                resourceData.folderSize = result.size
              }
            }
          }

          // 使用匹配到的资源类创建实例
          const resource = MatchedResourceClass.fromJSON(resourceData)
          
          // 检查是否已存在相同路径
          const existingItem = items.value.find((item: any) => {
            const itemPath = BaseResources.extractPrimitiveValue(
              item.resourcePath?.value || item.resourcePath
            )
            return itemPath === fullFilePath
          })

          if (existingItem) {
            failedCount++
            continue
          }

          // 添加到列表
          items.value.push(resource)
          addedCount++
        }

        // 保存数据
        if (addedCount > 0) {
          await saveData()
        }

        // 显示通知
        if (addedCount > 0 || failedCount > 0) {
          notify.toast(
            addedCount > 0 ? 'success' : 'warning',
            addedCount > 0 ? '导入成功' : '导入结果',
            addedCount > 0 
              ? `成功导入 ${addedCount} 个资源${failedCount > 0 ? `，${failedCount} 个失败` : ''}`
              : `没有资源被导入（${failedCount} 个失败）`
          )
        }

        // 关闭对话框
        closeBatchImportDialog()
      } catch (error: any) {
        console.error('[GenericResourceView] 批量导入确认失败:', error)
        notify.toast('error', '导入失败', error.message || '未知错误')
      }
    }

    return {
      resourceType, // 返回 computed，保持响应式
      isElectronEnvironment,
      // 多选模式相关
      isMultiSelectMode,
      selectedItems,
      toggleMultiSelectMode,
      isItemSelected,
      toggleSelectItem,
      // 批量导入对话框相关
      showBatchImportDialog,
      batchImportFiles,
      batchImportFolderPath,
      batchImportDialogRef,
      closeBatchImportDialog,
      handleBatchImportConfirm,
      // 批量增加tag对话框相关
      showBatchAddTagDialog,
      closeBatchAddTagDialog,
      handleBatchAddTagConfirm,
      // 批量删除tag对话框相关
      showBatchDeleteTagDialog,
      closeBatchDeleteTagDialog,
      handleBatchDeleteTagConfirm,
      // 批量删除确认对话框相关
      showBatchDeleteConfirmDialog,
      closeBatchDeleteConfirmDialog,
      handleBatchDeleteConfirm,
      isResourceRunning,
      handleResourceAction,
      terminateGame,
      showComicViewer,
      currentAlbum,
      pages,
      currentPageIndex,
      closeComicViewer,
      handleComicViewerPageChange,
      // 小说阅读器相关
      showNovelReader,
      currentReadingNovel,
      showEbookReaderV2,
      ebookReaderV2FilePath,
      ebookNavigation,
      ebookBookAvailable,
      closeNovelReader,
      closeEbookReaderV2,
      handleNavigationUpdated,
      handleRenditionReady,
      handleEbookJumpTo,
      ebookReaderRef,
      getNovelName,
      getNovelAuthor,
      getNovelFilePath,
      getNovelFileType,
      getNovelCurrentPage,
      getNovelNameByPath,
      handlePdfPageChanged,
      handleTextPageChanged,
      handleTextProgressChanged,
      getFileExists, // 获取文件存在性状态
      checkFileExistence, // 文件存在性检查方法
      // FunGrid 布局相关
      displayLayoutBaseWidth,
      displayLayoutMinWidth,
      displayLayoutMaxWidth,
      customLayoutStyle,
      // 灵活工具栏按钮处理
      handleButtonClick,
      // 对话框配置
      dialogConfig,
      // 详情面板相关（从 resourcePage 获取）
      showDetailDialog: resourcePage.showDetailDialog,
      selectedItem: resourcePage.selectedItem,
      itemStats: resourcePage.itemStats,
      itemActions: resourcePage.itemActions,
      closeDetail: resourcePage.closeDetail,
      updateResource: resourcePage.updateResource,
      // 详情面板类型映射（计算属性）
      detailPanelType,
      shouldShowPreview,
      // 番剧详情页视频列表（用于替换视频页）
      isAnimeWithFolderVideos,
      playFolderVideo,
      getThumbnailUrlForFolderVideo,
      handleFolderVideoThumbnailError,
      generateFolderVideoThumbnail,
      // 详情页图片预览相关（完全复刻 ImageView.vue）
      // 图片缓存相关
      ...imageCacheComposable,
      // 详情页图片分页相关（排除 loadImageSettings，重命名为 loadImagePagesSettings 避免与方法冲突）
      loadImagePagesSettings: imagePagesComposable.loadImageSettings,
      detailCurrentPage: imagePagesComposable.detailCurrentPage,
      detailPageSize: imagePagesComposable.detailPageSize,
      detailTotalPages: imagePagesComposable.detailTotalPages,
      jumpToPageInput: imagePagesComposable.jumpToPageInput,
      paginatedPages: imagePagesComposable.paginatedPages,
      detailCurrentPageStartIndex: imagePagesComposable.detailCurrentPageStartIndex,
      nextPageGroup: imagePagesComposable.nextPageGroup,
      previousPageGroup: imagePagesComposable.previousPageGroup,
      jumpToPageGroup: imagePagesComposable.jumpToPageGroup,
      resetPagination: imagePagesComposable.resetPagination,
      updateTotalPages: imagePagesComposable.updateTotalPages,
      detailPages,
      handleDetailPageClick,
      handleDetailPageChange,
      // 拖拽相关
      handleFileDrop,
      handleDropError,
      isDragOver,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDragDrop,
      // 路径更新对话框相关
      showPathUpdateDialog: resourcePage.showPathUpdateDialog,
      showScraperDialog,
      scraperMatches,
      scraperCurrentItem,
      confirmScraperUpdate,
      closeScraperDialog,
      pathUpdateInfo: resourcePage.pathUpdateInfo,
      closePathUpdateDialog: resourcePage.closePathUpdateDialog,
      confirmPathUpdate,
      pathUpdateDialogTitle,
      pathUpdateDialogDescription,
      pathUpdateItemNameLabel,
      pathUpdateItemName,
      pathUpdateOldPath,
      pathUpdateNewPath,
      pathUpdateMissingLabel,
      pathUpdateFoundLabel,
      pathUpdateQuestion,
      // 强制结束程序确认对话框相关
      showTerminateConfirmDialog,
      resourceToTerminate,
      terminateResourceName,
      closeTerminateConfirmDialog,
      confirmTerminateGame,
      // 详情面板操作处理（与右键菜单共用 handleDetailActionImpl）
      handleDetailAction: handleDetailActionImpl,
      ...resourcePage, // 展开所有方法和属性，使模板可以直接访问
      // 批量操作相关（必须在 ...resourcePage 之后，以覆盖 resourcePage 中的 contextMenuItems）
      handleBatchAddTag,
      handleBatchDeleteTag,
      handleBatchDelete,
      contextMenuItems,
      // 明确声明方法，确保 TypeScript 能正确识别
      updateScale: resourcePage.updateScale,
      handleEmptyStateAction: resourcePage.handleEmptyStateAction,
      showAddDialogHandler: resourcePage.showAddDialogHandler,
      handleSortChanged: resourcePage.handleSortChanged,
      handleSearchQueryChanged: resourcePage.handleSearchQueryChanged,
      handleSortByChanged: resourcePage.handleSortByChanged,
      handleContextMenuClick: resourcePage.handleContextMenuClick,
      handlePageChange: resourcePage.handlePageChange,
      // 筛选相关（按照 GameView.vue 的方式暴露所有方法）
      // 注意：顺序与 GameView.vue 保持一致，先 toRefs 再展开 filterComposable
      ...toRefs(filterComposable),
      ...filterComposable,
      // 保存 filterComposable 引用，供 methods 中使用
      _filterComposable: filterComposable,
      // 明确暴露 filteredItems 和 paginatedItems，确保模板能正确访问
      // 重要：使用 filterComposable.filteredGames（即 filteredItems），而不是 resourcePage.filteredItems
      // 因为 resourcePage.filteredItems 可能没有正确响应筛选变化
      filteredItems: filterComposable.filteredGames, // 直接使用筛选 composable 的结果
      paginatedItems: resourcePage.paginatedItems,
      // 编辑对话框相关
      ResourceClass,
      allTags,
      availableTagsByField,
      // 编辑对话框状态和方法（从 resourcePage 获取）
      showEditDialog: resourcePage.showEditDialog,
      editForm: resourcePage.editForm,
      closeEdit: resourcePage.closeEdit,
      handleEditConfirm: resourcePage.handleEditConfirm,
      // 供 App.vue 游戏时长/保存逻辑使用（与 GameView 兼容）：games 即 items，saveGames 即 saveData
      games: items,
      saveGames: saveData
    }
    
    // 调试：检查 setup 返回的对象中的筛选方法
    const setupReturn = {
      resourceType,
      isElectronEnvironment,
      isResourceRunning,
      handleResourceAction,
      terminateGame,
      showComicViewer,
      currentAlbum,
      pages,
      currentPageIndex,
      closeComicViewer,
      handleComicViewerPageChange,
      showNovelReader,
      currentReadingNovel,
      showEbookReaderV2,
      ebookReaderV2FilePath,
      ebookNavigation,
      ebookBookAvailable,
      closeNovelReader,
      closeEbookReaderV2,
      handleNavigationUpdated,
      handleRenditionReady,
      handleEbookJumpTo,
      ebookReaderRef,
      getNovelName,
      getNovelAuthor,
      getNovelFilePath,
      getNovelFileType,
      getNovelCurrentPage,
      getNovelNameByPath,
      handlePdfPageChanged,
      handleTextPageChanged,
      handleTextProgressChanged,
      getFileExists,
      checkFileExistence,
      ...resourcePage,
      updateScale: resourcePage.updateScale,
      handleEmptyStateAction: resourcePage.handleEmptyStateAction,
      showAddDialogHandler: resourcePage.showAddDialogHandler,
      handleSortChanged: resourcePage.handleSortChanged,
      handleSearchQueryChanged: resourcePage.handleSearchQueryChanged,
      handleSortByChanged: resourcePage.handleSortByChanged,
      handleContextMenuClick: resourcePage.handleContextMenuClick,
      handlePageChange: resourcePage.handlePageChange,
      ...toRefs(filterComposable),
      ...filterComposable
    }
    
    return setupReturn as any // 使用 as any 绕过类型检查，因为方法确实存在
  },
  methods: {
    handleContextMenu(event: MouseEvent, item: any) {
      (this.$refs.baseView as any)?.showContextMenuHandler(event, item)
    },
    // 更新筛选器数据到 App.vue
    updateFilterData() {
      // 优先从 this 访问，如果不存在则从 filterComposable 访问
      const getFilterDataFn = (this as any).getFilterData || 
                             ((this as any)._filterComposable && (this as any)._filterComposable.getFilterData)
      
      console.log('[GenericResourceView] updateFilterData 被调用')
      console.log('[GenericResourceView] getFilterDataFn 存在:', !!getFilterDataFn)
      console.log('[GenericResourceView] _filterComposable 存在:', !!(this as any)._filterComposable)
      
      if (getFilterDataFn && typeof getFilterDataFn === 'function') {
        const filterData = getFilterDataFn()
        // 详细打印每个筛选器的状态
        const filtersDetail = filterData?.filters?.map((f: any) => ({
          key: f.key,
          title: f.title,
          itemsCount: f.items?.length || 0,
          selectedCount: f.selected?.length || 0,
          excludedCount: f.excluded?.length || 0,
          selected: f.selected || [],
          excluded: f.excluded || []
        })) || []
        console.log('[GenericResourceView] updateFilterData - 筛选器数据:', {
          filtersCount: filterData?.filters?.length || 0,
          filters: filtersDetail
        })
        // 特别检查 developers 筛选器的状态
        const developersFilter = filtersDetail.find((f: any) => f.key === 'developers')
        if (developersFilter) {
          console.log('[GenericResourceView] developers 筛选器状态:', {
            selected: developersFilter.selected,
            excluded: developersFilter.excluded,
            itemsCount: developersFilter.itemsCount
          })
        }
        this.$emit('filter-data-updated', filterData)
      } else {
        console.warn('[GenericResourceView] getFilterData 方法不存在，无法更新筛选器数据')
      }
    },
    // 处理来自 App.vue 的筛选器事件（动态支持所有筛选器，完全按照 GameView 的方式）
    handleFilterEvent(event, data) {
      console.log('GenericResourceView handleFilterEvent:', event, data)
      const filterKey = data?.filterKey || data
      
      // 动态获取筛选方法名
      const filterMethodName = `filterBy${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`
      const excludeMethodName = `excludeBy${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`
      const clearMethodName = `clear${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}Filter`
      
      console.log('[GenericResourceView] 筛选方法名:', { filterMethodName, excludeMethodName, clearMethodName })
      console.log('[GenericResourceView] 方法是否存在:', {
        filterMethod: !!this[filterMethodName],
        excludeMethod: !!this[excludeMethodName],
        clearMethod: !!this[clearMethodName]
      })
      
      switch (event) {
        case 'filter-select':
          if (this[filterMethodName] && typeof this[filterMethodName] === 'function') {
            // 获取筛选前的状态
            const filterComposable = (this as any)._filterComposable
            const filterState = filterComposable?.filterStates?.[filterKey]
            const beforeSelected = filterState?.selected?.value ? [...filterState.selected.value] : []
            console.log('[GenericResourceView] 调用筛选方法前，selected 状态:', beforeSelected)
            
            console.log('[GenericResourceView] 调用筛选方法:', filterMethodName, '参数:', data.itemName)
            this[filterMethodName](data.itemName)
            
            // 获取筛选后的状态
            const afterSelected = filterState?.selected?.value ? [...filterState.selected.value] : []
            console.log('[GenericResourceView] 调用筛选方法后，selected 状态:', afterSelected)
            console.log('[GenericResourceView] 筛选方法调用完成，更新筛选器数据')
            this.updateFilterData()
          } else {
            console.warn('[GenericResourceView] 筛选方法不存在:', filterMethodName)
          }
          break
        case 'filter-exclude':
          if (this[excludeMethodName] && typeof this[excludeMethodName] === 'function') {
            console.log('[GenericResourceView] 调用排除方法:', excludeMethodName, '参数:', data.itemName)
            this[excludeMethodName](data.itemName)
            this.updateFilterData()
          } else {
            console.warn('[GenericResourceView] 排除方法不存在:', excludeMethodName)
          }
          break
        case 'filter-clear':
          if (this[clearMethodName] && typeof this[clearMethodName] === 'function') {
            console.log('[GenericResourceView] 调用清除方法:', clearMethodName)
            this[clearMethodName]()
            this.updateFilterData()
          } else {
            console.warn('[GenericResourceView] 清除方法不存在:', clearMethodName)
          }
          break
      }
    }
  },
  async mounted() {
    // 等待下一个 tick，确保数据已完全更新到响应式系统中（完全按照 ImageView loadAlbums 的方式）
    await this.$nextTick()
    
    // 提取所有筛选器数据（使用 useResourceFilter 的方法，完全按照 ImageView loadAlbums 的方式）
    if (this.extractAllFilters && typeof this.extractAllFilters === 'function') {
      console.log('[GenericResourceView] 调用 extractAllFilters，当前 items 数量:', (this as any).items?.length || 0)
      this.extractAllFilters()
      console.log('[GenericResourceView] extractAllFilters 执行完成')
    } else {
      console.warn('[GenericResourceView] extractAllFilters 方法不存在')
    }

    // 初始化筛选器数据（完全按照 ImageView loadAlbums 的方式）
    this.updateFilterData()
    
    // 注意：不需要在这里注册全局事件监听器
    // ResourceView.vue 已经注册了全局事件监听器，并且会调用这个组件的 handleFilterEvent 方法
    // 这与 GameView.vue 和 ImageView.vue 的实现方式一致
  },
  beforeUnmount() {
    // 注意：不需要清理筛选事件监听器
    // 因为事件监听器是由 ResourceView.vue 注册的，它会负责清理
  }
})
</script>

<style scoped lang="scss">
.generic-resource-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// resource-content 本身就是 fun-drop-zone，需要直接覆盖样式
.resource-content {
  flex: 1;
  overflow-y: auto;
  
  // 覆盖 FunDropZone 的默认样式（resource-content 本身就是 fun-drop-zone）
  // 布局相关：使用 block 布局，不居中对齐
  display: block !important;
  align-items: unset !important;
  justify-content: unset !important;
  min-height: auto !important;
  height: 100%;
  
  // 移除默认边框和背景
  border: none !important;
  background: transparent !important;
  padding: var(--spacing-xl);
  cursor: default !important;
  
  // 移除默认 hover 效果
  &:hover {
    background: transparent !important;
    border-color: transparent !important;
  }
  
  // 拖拽时才显示边框和背景
  &.drag-over {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 2px dashed var(--accent-color) !important;
    border-radius: var(--radius-xl);
    position: relative;
    
    // 添加拖拽提示遮罩层
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(59, 130, 246, 0.2);
      border-radius: var(--radius-xl);
      z-index: 1;
      pointer-events: none;
    }
    
    // 添加拖拽提示文字
    &::after {
      content: '松开鼠标添加资源';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 12px 24px;
      border-radius: var(--radius-md);
      font-size: 16px;
      font-weight: 600;
      z-index: 2;
      pointer-events: none;
      white-space: nowrap;
    }
  }
}

// FunGrid 拖拽状态样式
:deep(.fun-grid.is-dragging) {
  opacity: 0.5;
  pointer-events: none;
}

// 空网格占位
.empty-grid {
  min-height: 200px;
  
  &.is-dragging {
    opacity: 0.5;
  }
}

/* 小说阅读器样式 */
.novel-reader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.novel-reader-content {
  width: 90%;
  height: 90%;
  background: var(--bg-primary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.reader-title h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.reader-author {
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.reader-controls {
  display: flex;
  gap: 8px;
}

.btn-close-reader {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close-reader:hover {
  background: var(--bg-tertiary);
}

.btn-icon {
  font-size: 1.2rem;
}

.reader-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.reader-content-wrapper {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.ebook-reader-v2-content {
  display: flex;
  height: 100%;
}

.chapter-navigation-sidebar {
  width: 250px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  background: var(--bg-secondary);
}

.chapter-nav-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.chapter-nav-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.reader-content-main {
  flex: 1;
  overflow: hidden;
}

/* 强制结束程序确认对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color var(--transition-base);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);

  h3 {
    color: var(--text-primary);
    margin: 0;
    transition: color var(--transition-base);
  }
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.modal-body {
  padding: var(--spacing-xl);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-secondary);
  }
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  transition: background var(--transition-base);

  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: var(--spacing-xl);
  }
}
</style>
