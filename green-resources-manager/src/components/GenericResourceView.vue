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
      :display-mode="displayMode"
      @update:scale="updateScale"
      @update:displayMode="updateDisplayMode"
      @empty-state-action="handleEmptyStateAction" 
      @add-item="showAddDialogHandler" 
      @button-click="handleButtonClick"
      @sort-changed="handleSortChanged"
      @search-query-changed="handleSearchQueryChanged" 
      @sort-by-changed="handleSortByChanged"
      @context-menu-click="handleContextMenuClick" 
      @page-change="handlePageChange"
      @toggle-multi-select="toggleMultiSelectMode"
      @select-current-page="selectCurrentPage"
      @select-all="selectAllListed">
      
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
      <div v-if="currentCollectionId" class="collection-bar">
        <button type="button" class="collection-bar__back" @click="leaveCollection">返回</button>
        <span class="collection-bar__crumb">{{ pageTitle }} / {{ currentCollectionName }}</span>
      </div>
      <!-- 使用 FunGrid 组件进行布局 -->
      <FunGrid
        v-if="displayMode !== 'list' && paginatedItems.length > 0"
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
          :type="cardTypeForResource(item, (resourceType || 'game').toLowerCase())"
          :is-electron-environment="isElectronEnvironment"
          :file-exists="getFileExists(item)"
          :scale="scale"
          :is-running="isResourceRunning(item)"
          :is-multi-select-mode="isMultiSelectMode"
          :is-selected="isItemSelected(item)"
          :note="membershipNote(item)"
          :fallback-cover="collectionCover(item)"
          @click="() => (this as any).openListedItem(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
          @action="handleResourceAction"
          @toggle-select="() => toggleSelectItem(item)"
        />
      </FunGrid>
      <ResourceListView
        v-else-if="displayMode === 'list' && paginatedItems.length > 0"
        :items="paginatedItems"
        :type-for-item="(item: any) => cardTypeForResource(item, (resourceType || 'game').toLowerCase())"
        :is-running-item="isResourceRunning"
        :file-exists-for="getFileExists"
        :is-multi-select-mode="isMultiSelectMode"
        :is-item-selected="isItemSelected"
        :note-for="membershipNote"
        @click="(item: any) => (this as any).openListedItem(item)"
        @contextmenu="handleContextMenu"
        @action="handleResourceAction"
        @toggle-select="toggleSelectItem"
      />
      <div v-else class="empty-grid" :class="{ 'is-dragging': isDragOver }"></div>
    </div>
    </BaseView>
    
    <!-- 详情面板 -->
    <DetailPanel
      :visible="showDetailDialog && !!selectedItem"
      :item="selectedItem"
      :page-field-defs="pageFieldDefs"
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
          :thumbnail-shape="previewThumbnailShape"
          :pages="detailPages"
          :currentPage="detailCurrentPage"
          :pageSize="detailPageSize"
          :totalPages="detailTotalPages"
          :resolveImage="resolveThumbnailImage"
          :handleImageError="handleImageError"
          @page-click="handleDetailPageClick"
          @page-change="handleDetailPageChange"
        />
        <!-- 番剧/文件夹视频列表（Anime 类型，用于替换视频页） -->
        <FolderVideosGrid
          v-else-if="isAnimeWithFolderVideos"
          :videos="detailFolderVideos"
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
      :resource-class="addResourceClass"
      :type-choices="acceptedTypeChoices"
      :selected-type="addingPageType"
      :enabled-field-keys="pageFieldKeys"
      :page-field-defs="pageFieldDefs"
      :is-electron-environment="isElectronEnvironment"
      :available-tags="allTags"
      :available-tags-by-field="availableTagsByField"
      :enable-engine-auto-detect="dialogConfig.enableEngineAutoDetect"
      :enable-screenshot-cover="dialogConfig.enableScreenshotCover"
      :enable-randomize-thumbnail="dialogConfig.enableRandomizeThumbnail"
      :add-title="dialogConfig.addTitle"
      @change-type="addingPageType = $event"
      :edit-title="dialogConfig.editTitle"
      :add-button-text="dialogConfig.addButtonText"
      :edit-button-text="dialogConfig.editButtonText"
      @close="closeAddDialog"
      @confirm="handleAddConfirm"
      @randomize-thumbnail="handleRandomizeThumbnail"
      @video-file-selected="handleVideoFileSelected"
    />
    
    <!-- 编辑资源对话框 -->
    <ResourcesEditDialog
      :visible="showEditDialog"
      mode="edit"
      :resource-class="editResourceClass"
      :enabled-field-keys="editEnabledFieldKeys"
      :page-field-defs="pageFieldDefs"
      :resource-data="editForm"
      :is-electron-environment="isElectronEnvironment"
      :available-tags="allTags"
      :available-tags-by-field="availableTagsByField"
      :enable-engine-auto-detect="dialogConfig.enableEngineAutoDetect"
      :enable-screenshot-cover="dialogConfig.enableScreenshotCover"
      :enable-randomize-thumbnail="dialogConfig.enableRandomizeThumbnail"
      :add-title="dialogConfig.addTitle"
      :edit-title="dialogConfig.editTitle"
      :add-button-text="dialogConfig.addButtonText"
      :edit-button-text="dialogConfig.editButtonText"
      @close="closeEdit"
      @confirm="handleEditConfirm"
      @randomize-thumbnail="handleRandomizeThumbnail"
      @video-file-selected="handleVideoFileSelected"
    />

    <!-- 修改游玩记录。和编辑信息分开，避免把时长、次数和名字介绍混在一张表里。 -->
    <ArchiveStatDialog
      :visible="showArchiveDialog"
      :resource="archiveTarget"
      :play-time-locked="archivePlayTimeLocked"
      @close="closeArchiveDialog"
      @confirm="handleArchiveConfirm"
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
            <button class="btn-close-reader" @click="closeNovelReader" :title="$lt('关闭阅读器')">
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
            @progress-changed="handleTextProgressChanged"
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
            <button class="btn-close-reader" @click="closeEbookReaderV2" :title="$lt('关闭阅读器')">
              <span class="btn-icon">✕</span>
            </button>
          </div>
        </div>
        <div class="reader-content-wrapper ebook-reader-v2-content">
          <!-- 左侧章节导航栏 -->
          <div class="chapter-navigation-sidebar">
            <div class="chapter-nav-header">
              <h4>{{ $lt('章节列表') }}</h4>
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
              :initial-cfi="getNovelEpubCfiByPath(ebookReaderV2FilePath)"
              @close="closeEbookReaderV2"
              @ready="handleEbookReady"
              @navigation-updated="handleNavigationUpdated"
              @rendition-ready="handleRenditionReady"
              @progress-changed="handleEbookProgressChanged"
              @location-changed="handleEbookLocationChanged"
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
    
    <div v-if="showCreateCollectionDialog" class="modal-overlay" @click="closeCreateCollectionDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>创建合集</h3>
          <button class="btn-close" @click="closeCreateCollectionDialog">✕</button>
        </div>
        <div class="modal-body">
          <label class="collection-field">
            <span>合集名称</span>
            <input v-model="newCollectionName" type="text" class="collection-field__input" placeholder="例如：某一季、某一系列" @keyup.enter="confirmCreateCollection">
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeCreateCollectionDialog">取消</button>
          <button class="btn-confirm" @click="confirmCreateCollection">创建并进入</button>
        </div>
      </div>
    </div>

    <div v-if="showMemberPicker" class="modal-overlay" @click="closeMemberPicker">
      <div class="modal-content collection-picker" @click.stop>
        <div class="modal-header">
          <h3>加入已有资源</h3>
          <button class="btn-close" @click="closeMemberPicker">✕</button>
        </div>
        <div class="modal-body">
          <input v-model="memberPickerQuery" type="text" class="collection-field__input" placeholder="搜索本页资源">
          <p class="collection-picker__hint">这里只列出还没放进当前合集的资源。已经在别的合集里的，加进来后会从那边移出。</p>
          <div class="collection-picker__list">
            <label v-for="candidate in memberPickerCandidates" :key="candidate.id" class="collection-picker__row">
              <input type="checkbox" :checked="memberPickerSelected.has(candidate.id)" @change="toggleMemberPicker(candidate.id)">
              <span>{{ candidate.name }}</span>
              <span v-if="candidate.ownerName" class="collection-picker__owner">当前在「{{ candidate.ownerName }}」</span>
            </label>
            <p v-if="memberPickerCandidates.length === 0" class="collection-picker__empty">没有可以加入的资源</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeMemberPicker">取消</button>
          <button class="btn-confirm" @click="confirmAddMembers">加入</button>
        </div>
      </div>
    </div>

    <div v-if="showCollectionPicker" class="modal-overlay" @click="closeCollectionPicker">
      <div class="modal-content collection-picker" @click.stop>
        <div class="modal-header">
          <h3>加入合集</h3>
          <button class="btn-close" @click="closeCollectionPicker">✕</button>
        </div>
        <div class="modal-body">
          <div class="collection-picker__list">
            <button
              v-for="collection in collectionChoices"
              :key="collection.id"
              type="button"
              class="collection-picker__choice"
              @click="confirmAddSelectionToCollection(collection.id)"
            >{{ collection.name }}</button>
            <p v-if="collectionChoices.length === 0" class="collection-picker__empty">还没有合集。先在工具栏创建。</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeCollectionPicker">取消</button>
        </div>
      </div>
    </div>

    <!-- 强制结束程序确认对话框 -->
    <div v-if="showTerminateConfirmDialog" class="modal-overlay" @click="closeTerminateConfirmDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ $lt('强制结束程序') }}</h3>
          <button class="btn-close" @click="closeTerminateConfirmDialog">✕</button>
        </div>
        <div class="modal-body">
          <p>{{ $lt('确定要强制结束程序') }} <strong>{{ terminateResourceName }}</strong> {{ $lt('吗？') }}</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;"> {{ $lt('此操作将立即终止程序进程，未保存的数据可能会丢失。') }} </p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeTerminateConfirmDialog">{{ $lt('取消') }}</button>
          <button class="btn-confirm" @click="confirmTerminateGame" style="background: #ef4444;">{{ $lt('确认结束') }}</button>
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
    :searching="batchImportSearching"
    :importing="batchImportImporting"
    :import-progress="batchImportProgress"
    :available-extensions="batchImportSearchExtensions"
    :folder-options="batchImportFolderOptions"
    @close="closeBatchImportDialog"
    @search="runBatchImportSearch"
    @confirm="handleBatchImportConfirm"
  />
  
  <!-- 书签导入对话框 -->
  <BookmarkImportDialog
    ref="bookmarkImportDialogRef"
    :visible="showBookmarkImportDialog"
    @close="closeBookmarkImportDialog"
    @confirm="handleBookmarkImportConfirm"
  />
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, watch, toRefs } from 'vue'
import BaseView from './BaseView.vue'
import ResourceListView from './ResourceListView.vue'
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
import BookmarkImportDialog from './BookmarkImportDialog.vue'
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
import { pageConfigLoader, type PageConfig } from '../configs/pages/PageConfigLoader.ts'
import { executeActionHandler, getActionHandler, isComicArchivePath, type ActionHandlerContext } from '../utils/ResourceActionHandlers'
import { useGameRunningStore } from '../stores/game-running'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import notify from '../utils/NotificationService.ts'
import { lt } from '../locales/lt.ts'
import { addTrackToSavedPlaylist, normalizePlaylistTrack } from '../utils/audioPlaylist.ts'
import saveManager from '../utils/SaveManager.ts'
import { calculateAndUpdateResourceSize, calculateResourceSizesBatch, type FolderSizeCache } from '../utils/ResourceSizeService.ts'
import { detectGameEngine } from '../utils/GameEngineDetector.ts'
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
import ArchiveStatDialog from './ArchiveStatDialog.vue'
import ScraperUpdateDialog from './ScraperUpdateDialog.vue'
import type { FilterItem } from '../types/filter'
import coverManager from '../utils/CoverManager.ts'
import { fingerprintFileSize, fingerprintKindForResource, fingerprintPageCount, isSameFingerprintIdentity, readFingerprint, writeFingerprint } from '../utils/resourceFingerprint.ts'
import { cardTypeForResource, classForKind, collectFieldCatalog, defaultAcceptedKindIds, extensionsForSearch, findBasicKind, folderImportOptions, getResourceClassBySavedType, matchAcceptedKind, savedTypeOfClass } from '../configs/resources/resourceKindCatalog'
import { Collection } from '@resources/collection.ts'
import { indexMembership, isCollectionRecord, listCollectionScope, memberIdsOf, resourceIdOf as collectionResourceId, writeMemberIds } from '../utils/collectionScope'
import {
  buildSameResourceDescriptor,
  matchesSameResource,
  normalizeSameResourceRule,
  type SameResourceDescriptor,
  type SameResourceRule
} from '../utils/sameResourceRule'
import { decideMarkerImport, type MarkerImportCandidate } from '../utils/resourceMarkerImport'
import { defsForPage } from '../configs/pages/pageFieldSchema'

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

// 资源类型到资源类的映射
const resourceClassMap: Record<string, { resourceClass: any }> = {
  Game: {
    resourceClass: Game
  },
  Software: {
    resourceClass: Software
  },
  Image: {
    resourceClass: Manga
  },
  Manga: {
    resourceClass: Manga
  },
  SingleImage: {
    resourceClass: SingleImage
  },
  Video: {
    resourceClass: Video
  },
  Anime: {
    resourceClass: VideoFolder // 番剧使用文件夹结构
  },
  Novel: {
    resourceClass: Novel
  },
  Website: {
    resourceClass: Website
  },
  Audio: {
    resourceClass: Audio
  },
  Other: {
    resourceClass: Other // Other 类型使用独立的 Other 资源类
  }
}

export default defineComponent({
  name: 'GenericResourceView',
  components: {
    BaseView,
    ResourceListView,
    MediaCard,
    DetailPanel,
    AlbumPagesGrid,
    ComicViewer,
    PdfReader,
    TextReader,
    EbookReader,
    ContentView,
    ResourcesEditDialog,
    ArchiveStatDialog,
    PathUpdateDialog,
    ScraperUpdateDialog,
    FolderVideosGrid,
    BatchImportDialog,
    BatchAddTagDialog,
    BatchDeleteTagDialog,
    BatchDeleteConfirmDialog,
    BookmarkImportDialog,
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
    
    // 获取资源类
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
        isElectronEnvironment: ref(false),
        displayMode: ref('grid'),
        updateDisplayMode: () => {}
      }
    }

    const ResourceClass = resourceConfig.resourceClass

    // 资源类型到页面配置 ID 的映射
    const resourceTypeToPageIdMap: Record<string, string> = {
      Game: 'games',
      Software: 'software',
      Image: 'images',
      Manga: 'images',
      SingleImage: 'single-image',
      Video: 'videos',
      Anime: 'anime-series',
      Novel: 'novels',
      Website: 'websites',
      Audio: 'audio',
      Other: 'other'
    }

    // 获取页面配置（从 JSON 配置加载器）
    // 优先用当前页面自己的 ID。同一类型可以有多页，不能再按类型写死到内置页面，
    // 否则新页面会读到旧页面的数据。
    const pageConfig = computed(() => {
      const ownPageId = props.pageConfig?.id
      if (ownPageId) {
        const ownConfig = pageConfigLoader.getPageConfig(ownPageId)
        if (!ownConfig) {
          console.error(`未找到页面配置 ID ${ownPageId} 的配置`)
        }
        return ownConfig
      }
      const pageId = resourceTypeToPageIdMap[resourceType.value]
      if (!pageId) {
        console.error(`未找到资源类型 ${resourceType.value} 对应的页面配置 ID`)
        return undefined
      }
      const config = pageConfigLoader.getPageConfig(pageId)
      if (!config) {
        console.error(`未找到页面配置 ID ${pageId} 的配置`)
      }
      return config
    })

    /**
     * 这个页面接受的基本资源类型。
     * 只决定新文件能不能放进来，以及新文件按哪种方式打开。
     * 已经保存的记录仍按自己的 resourceType 读取。
     */
    const legacyResourceTypes = computed((): string[] => {
      const configured = pageConfig.value?.resourceTypes
      if (Array.isArray(configured) && configured.length > 0) return configured
      const fallback = props.pageConfig?.type || props.resourceType
      return fallback ? [String(fallback)] : []
    })
    const acceptedKindIds = computed((): string[] => {
      const configured = pageConfig.value?.acceptedKinds
      if (Array.isArray(configured) && configured.length > 0) {
        return configured.filter((kindId: string) => !!findBasicKind(kindId))
      }
      return defaultAcceptedKindIds(legacyResourceTypes.value)
    })
    /** 批量导入时能搜到的扩展名，跟着这一页接受的资源类型走 */
    const batchImportSearchExtensions = computed(() => extensionsForSearch(acceptedKindIds.value))
    /** 文件夹模式能勾的类型。图片页给图片文件夹，音乐页给音频文件夹。 */
    const batchImportFolderOptions = computed(() => folderImportOptions(acceptedKindIds.value))
    /** 最近一次搜索是文件还是文件夹。确认导入时按它决定把路径当成文件还是目录。 */
    const batchImportMode = ref<'file' | 'folder'>('file')
    /** 文件夹结果的相对路径对应哪种基本类型。根目录用点号当键。 */
    const batchImportKindByPath = ref<Record<string, string>>({})
    /** 页面编辑时要显示的字段。没配过就不过滤，沿用资源类上的全部字段 */
    const pageFieldKeys = computed((): string[] | null => {
      const fields = pageConfig.value?.pageFields
      return Array.isArray(fields) ? fields : null
    })
    /**
     * 这一页的字段定义。
     * 编辑框、详情里多出来的字段都看这份名单，不看资源类上写死的那一套。
     */
    const pageFieldDefs = computed(() => {
      const fields = pageConfig.value?.pageFields
      if (!Array.isArray(fields)) return []
      return defsForPage(fields, pageConfig.value?.pageFieldDefs, collectFieldCatalog())
    })

    /** 添加窗口当前选中的基本资源类型 */
    const addingPageType = ref(acceptedKindIds.value[0] || 'executable')
    /** 添加窗口使用的资源类。打开方式由这种文件决定，字段再由页面字段名单裁剪 */
    const addResourceClass = computed(() => classForKind(addingPageType.value, legacyResourceTypes.value) || ResourceClass)
    /** 添加窗口里可选的基本资源类型 */
    const acceptedTypeChoices = computed(() => {
      return acceptedKindIds.value.map(kindId => ({
        id: kindId,
        label: findBasicKind(kindId)?.label || kindId
      }))
    })
    /** 右键点中的那一条，菜单跟它的资源类走 */
    const contextMenuTarget = ref<any>(null)

    /**
     * 按存档里的 resourceType 还原成对应的资源类。
     * 认不出时才退回页面的默认类，避免整页打不开。
     */
    const instantiateSavedResource = (data: any) => {
      const savedType = data?.resourceType || data?.resource_type
      const matchedClass = getResourceClassBySavedType(savedType) || ResourceClass
      if (String(savedType || '').trim().toLowerCase() === 'collection') {
        return Collection.fromJSON(data)
      }
      return matchedClass.fromJSON(data)
    }

    /** 资源类构造函数名对应页面配置里的类型名，封面目录按这个分，不按页面的第一种类型分 */
    const PAGE_TYPE_BY_CLASS_NAME: Record<string, string> = {
      Game: 'Game',
      Software: 'Software',
      Manga: 'Image',
      SingleImage: 'SingleImage',
      Video: 'Video',
      VideoFolder: 'Anime',
      Novel: 'Novel',
      Website: 'Website',
      Audio: 'Audio',
      Other: 'Other'
    }
    const pageTypeOfResource = (resource: any) => {
      return PAGE_TYPE_BY_CLASS_NAME[resource?.constructor?.name] || resourceType.value
    }

    // 获取对话框配置
    const dialogConfig = computed(() => {
      return pageConfig.value?.dialogConfig || {
        addTitle: '添加资源',
        editTitle: '编辑资源',
        addButtonText: '添加',
        editButtonText: '保存修改'
      }
    })

    // 当前资源类型是否使用 launchExecutable（游戏、软件等可执行程序），用于运行状态与时长追踪
    const supportsRunningTracking = computed(() =>
      ResourceClass?.actionConfig?.handlerName === 'launchExecutable'
    )

    // 响应式数据
    const items = ref<any[]>([])
    /** 当前进入的合集 id。空字符串表示还在页面根目录。 */
    const currentCollectionId = ref('')
    /** 创建合集时填写的名称。 */
    const newCollectionName = ref('')
    /** 是否显示创建合集的名称框。 */
    const showCreateCollectionDialog = ref(false)
    /** 是否显示「加入已有资源」。 */
    const showMemberPicker = ref(false)
    /** 加入已有资源时的搜索词。 */
    const memberPickerQuery = ref('')
    /** 加入已有资源时勾中的 id。 */
    const memberPickerSelected = ref<Set<string>>(new Set())
    /** 多选之后选择要放进哪个合集。 */
    const showCollectionPicker = ref(false)

    /**
     * 把一条资源放进指定合集，并从同一页的其他合集里移出。
     * 一个资源同一页只属于一个合集，所以后加入的合集会把旧归属清掉。
     * @param collectionId 目标合集
     * @param memberId 资源 id
     */
    const moveResourceIntoCollection = (collectionId: string, memberId: string) => {
      if (!collectionId || !memberId || collectionId === memberId) return
      for (const item of items.value) {
        if (!isCollectionRecord(item)) continue
        const id = collectionResourceId(item)
        const members = memberIdsOf(item).filter(existing => existing !== memberId)
        if (id === collectionId) {
          writeMemberIds(item, [...members, memberId])
        } else if (members.length !== memberIdsOf(item).length) {
          writeMemberIds(item, members)
        }
      }
    }

    /**
     * 正在看某个合集时，新加进本页的资源直接成为它的成员。
     * 这样在合集里面拖入或添加，不会跑回根目录才看得见。
     * @param resource 刚放进列表的资源
     */
    const rememberInCurrentCollection = (resource: any) => {
      if (!currentCollectionId.value || isCollectionRecord(resource)) return
      moveResourceIntoCollection(currentCollectionId.value, collectionResourceId(resource))
    }

    /**
     * 资源被删掉时，从所有合集名单里去掉它。
     * 删的是合集本身时，成员留在页面上，只是不再归组。
     * @param resourceId 被删除的 id
     */
    const detachDeletedResource = (resourceId: string) => {
      if (currentCollectionId.value === resourceId) currentCollectionId.value = ''
      for (const item of items.value) {
        if (!isCollectionRecord(item)) continue
        const members = memberIdsOf(item)
        if (!members.includes(resourceId)) continue
        writeMemberIds(item, members.filter(id => id !== resourceId))
      }
    }
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
    /** 最近一次搜索列出的相对路径。窗口下面的勾选列表用这份。 */
    const batchImportFiles = ref<string[]>([])
    /** 这份结果是从哪个文件夹搜出来的。确认导入时用它拼完整路径。 */
    const batchImportFolderPath = ref<string>('')
    /** 主进程还在扫目录时为 true，避免连点把两次结果搅在一起。 */
    const batchImportSearching = ref(false)
    /** 正在把勾选的文件写进资源库。窗口要一直开着，让人能看到进度。 */
    const batchImportImporting = ref(false)
    /** 写入进度。file 是当前正在处理的相对路径。 */
    const batchImportProgress = ref<{ current: number; total: number; file?: string }>({ current: 0, total: 0 })
    const batchImportDialogRef = ref<any>(null)

    // 书签导入对话框相关
    const showBookmarkImportDialog = ref(false)
    const bookmarkImportDialogRef = ref<any>(null)

    // 批量增加tag对话框相关
    const showBatchAddTagDialog = ref(false)

    // 批量删除tag对话框相关
    const showBatchDeleteTagDialog = ref(false)

    // 批量删除确认对话框相关
    const showBatchDeleteConfirmDialog = ref(false)

    const { getVideoDuration } = useVideoDuration()
    const { getAudioDuration } = useAudioDuration()

    // 番剧页面：文件夹视频列表、播放、缩略图（用于替换视频页时展示集数列表）
    const videoFolderComposable = useVideoFolder(pageConfig.value?.id || '')
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
     * 取出资源上的文件路径。
     */
    const readItemPath = (item: any): string => {
      return String(BaseResources.extractPrimitiveValue(
        item?.resourcePath?.value || item?.resourcePath || item?.executablePath?.value || item?.executablePath || ''
      ) || '')
    }

    /**
     * 这一页里是不是已经有这个文件或这条记录。
     */
    const pageAlreadyHas = (filePath: string, resourceId?: string): boolean => {
      return items.value.some((item: any) => {
        if (resourceId && String(BaseResources.extractPrimitiveValue(item.id?.value || item.id)) === resourceId) return true
        const itemPath = readItemPath(item)
        return !!itemPath && isSameResourcePath(itemPath, filePath)
      })
    }

    /**
     * 按路径把已经入库的资源接进当前页面。
     * 找不到时返回 null，调用方再新建一条。
     */
    const attachExistingResource = async (filePath: string): Promise<any | null> => {
      if (!isElectronEnvironment.value || !window.electronAPI?.sqliteFindResourceByPath) return null
      let result: { ok: boolean; resource?: any; message?: string }
      try {
        result = await window.electronAPI.sqliteFindResourceByPath(filePath)
      } catch (error: any) {
        const message = String(error?.message || error)
        if (message.includes('No handler registered')) {
          throw new Error('请完全退出应用后重新打开，再拖入文件。只刷新页面不会接上已有记录')
        }
        throw error
      }
      if (!result?.ok || !result.resource) return null

      const saved = result.resource
      const resourceId = String(saved.id || '')
      if (pageAlreadyHas(filePath, resourceId)) return null

      const SavedClass = getResourceClassBySavedType(saved.resourceType) || ResourceClass
      const resource = SavedClass.fromJSON(saved)
      items.value.push(resource)
      rememberInCurrentCollection(resource)
      return resource
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
        let linkedCount = 0
        let relocatedCount = 0
        let failedCount = 0
        let typeMismatchCount = 0
        let duplicateCount = 0
        let ambiguousCount = 0
        const duplicateNames: string[] = []
        const claimedResourceIds = new Set<string>()
        const markerLookupCache = new Map<string, { resource: any; tableName: string } | null>()
        const sameResourceRule = await loadSameResourceRule()

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
            
            if (pageAlreadyHas(filePath)) {
              console.log(`[GenericResourceView] 资源已在当前页面: ${file.name}`)
              duplicateCount++
              duplicateNames.push(file.name)
              continue
            }

            const matchedKind = matchAcceptedKind(fileExt, isFolder, acceptedKindIds.value)
            const MatchedResourceClass = matchedKind
              ? classForKind(matchedKind.id, legacyResourceTypes.value)
              : null

            if (!matchedKind || !MatchedResourceClass) {
              console.warn(`[GenericResourceView] 文件 ${file.name} 不在这个页面接受的资源里`)
              typeMismatchCount++
              continue
            }

            // 别的页面，或之前从页面里拿掉的同一份文件，接回原来的记录。
            const linked = await attachExistingResource(filePath)
            if (linked) {
              await writeResourceMarkerForItem(linked, filePath, { onlyIfMissing: true })
              addedCount++
              linkedCount++
              continue
            }

            const incomingSavedType = savedTypeOfClass(MatchedResourceClass).toLowerCase()

            // 资源旁边有标记时，标记里的资源 ID 比路径和文件名都可靠。
            let adoptedResourceId = ''
            const markerMatch = await findMarkerImportMatch(filePath, incomingSavedType, markerLookupCache)
            if (markerMatch.action === 'duplicate') {
              duplicateCount++
              duplicateNames.push(markerMatch.item ? sameResourceName(markerMatch.item) : '已有资源')
              continue
            }
            if (markerMatch.action === 'ambiguous') {
              ambiguousCount++
              continue
            }
            if (markerMatch.action === 'adopt') {
              if (claimedResourceIds.has(markerMatch.resourceId)) {
                duplicateCount++
                continue
              }
              adoptedResourceId = markerMatch.resourceId
            }
            if (markerMatch.action === 'relocate') {
              if (claimedResourceIds.has(markerMatch.resourceId)) {
                duplicateCount++
                continue
              }
              const existingItem = attachSavedResource(markerMatch.saved)
              if (await relocateImportedItem(existingItem, filePath, claimedResourceIds)) {
                relocatedCount++
              } else {
                duplicateCount++
              }
              continue
            }

            // 按设置里的规则判断是不是已经有一条相同的资源。
            const sameMatch = await findSameResourceForImport(
              filePath,
              incomingSavedType,
              sameResourceRule,
              fingerprintKindForResource(incomingSavedType)
            )
            if (sameMatch.action === 'duplicate') {
              duplicateCount++
              duplicateNames.push(sameResourceName(sameMatch.item))
              continue
            }
            if (sameMatch.action === 'ambiguous') {
              notifySameResourceAmbiguous(sameMatch.items.length)
              ambiguousCount++
              continue
            }
            if (sameMatch.action === 'relocate') {
              if (await relocateImportedItem(sameMatch.item, filePath, claimedResourceIds)) {
                relocatedCount++
              } else {
                duplicateCount++
              }
              continue
            }

            // 规则没对上时再用内容指纹兜底。改名又搬家，但项目文件或页数还能认出来的，仍然算同一条。
            const relocatedItem = await findMissingResourceByFingerprint(filePath, sameMatch.incoming.fingerprint)
            if (relocatedItem) {
              if (await relocateImportedItem(relocatedItem, filePath, claimedResourceIds)) {
                relocatedCount++
              } else {
                duplicateCount++
              }
              continue
            }
            
            // 创建匹配到的资源类型
            const resourceData: any = {
              id: adoptedResourceId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              resourceType: savedTypeOfClass(MatchedResourceClass),
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
            
            // 自动扫描图片并设置封面（仅针对图片/漫画类型）
            // 压缩包在漫画页里沿用漫画类，也要像图片文件夹一样取第一张图当封面
            const isMangaArchive = matchedKind.id === 'archive' && savedTypeOfClass(MatchedResourceClass) === 'manga'
            if ((matchedKind.id === 'imageFolder' || isMangaArchive) && isElectronEnvironment.value && window.electronAPI) {
              console.log('[GenericResourceView] 开始扫描图片并设置封面:', filePath)
              
              // 检查是否为压缩包
              const isArchive = /\.(zip|rar|7z|cbz)$/i.test(filePath.toLowerCase())
              
              try {
                if (isArchive && window.electronAPI.listImageFilesInArchive) {
                  console.log('[GenericResourceView] 压缩包模式，调用 listImageFilesInArchive')
                  const resp = await window.electronAPI.listImageFilesInArchive(filePath)
                  console.log('[GenericResourceView] 压缩包扫描结果:', resp)
                  if (resp.success && resp.files && resp.files.length > 0) {
                    // 优先查找名为 cover 的图片
                    const coverImage = resp.files.find((file: string) => {
                      const fileName = file.toLowerCase()
                      return fileName.includes('cover') || fileName.includes('front') || fileName.includes('thumb')
                    })
                    const targetImage = coverImage || resp.files[0]
                    const base = `archive:///${filePath.replace(/\\/g, '/')}`
                    const coverPath = `${base}#${encodeURIComponent(targetImage)}`
                    resourceData.coverPath = coverPath
                    console.log('[GenericResourceView] 压缩包封面设置为:', coverPath)
                    console.log('[GenericResourceView] 使用的图片:', coverImage ? 'cover图片' : '第一张图片')
                  }
                } else if (window.electronAPI.listImageFiles) {
                  console.log('[GenericResourceView] 文件夹模式，调用 listImageFiles')
                  const resp = await window.electronAPI.listImageFiles(filePath)
                  console.log('[GenericResourceView] 文件夹扫描结果:', resp)
                  if (resp.success && resp.files && resp.files.length > 0) {
                    // 优先查找名为 cover 的图片
                    const coverImage = resp.files.find((file: string) => {
                      const fileName = file.toLowerCase()
                      return fileName.includes('cover') || fileName.includes('front') || fileName.includes('thumb')
                    })
                    const targetImage = coverImage || resp.files[0]
                    resourceData.coverPath = targetImage
                    console.log('[GenericResourceView] 文件夹封面设置为:', targetImage)
                    console.log('[GenericResourceView] 使用的图片:', coverImage ? 'cover图片' : '第一张图片')
                  }
                }
              } catch (error) {
                console.warn('[GenericResourceView] 扫描图片失败:', error)
                // 扫描失败不影响添加，继续使用空封面
              }
              
              console.log('[GenericResourceView] 封面设置完成')
            }

            // 电影是单个视频文件。拖进来时顺手截一帧当封面，并读时长。
            // 以前这里只建一条空 thumbnail 的记录，卡片就会一直停在默认图。
            if (matchedKind.id === 'video' && !isFolder) {
              try {
                const duration = await getVideoDuration(filePath)
                if (duration > 0) {
                  resourceData.duration = duration
                }
                const thumb = await videoThumbnailComposable.generateThumbnail(
                  filePath,
                  resourceData.name,
                  null,
                  undefined,
                  { skipPersist: true }
                )
                if (thumb) {
                  resourceData.thumbnail = thumb
                }
              } catch (error) {
                console.warn('[GenericResourceView] 拖拽电影时生成封面失败:', error)
              }
            }

            // 视频文件夹里的每一集也截一帧。只给单个视频截的话，文件夹详情里会一直是占位图。
            if (matchedKind.id === 'videoFolder' && isFolder) {
              try {
                const filled = await fillFolderVideoCovers(filePath, resourceData.name, {})
                if (Object.keys(filled.map).length > 0) {
                  resourceData.videoThumbnails = filled.map
                }
                if (filled.firstThumb) {
                  resourceData.thumbnail = filled.firstThumb
                }
              } catch (error) {
                console.warn('[GenericResourceView] 拖拽视频文件夹时生成封面失败:', error)
              }
            }
            
            // 使用匹配到的资源类创建实例
            const resource = MatchedResourceClass.fromJSON(resourceData)

            // 拖进来就认出引擎并写进这条记录。不然得到编辑里再点一次识别。
            await assignDetectedGameEngine(resource, filePath)

            // 游戏拖进来的是 exe，大小要算它所在的整个文件夹。
            // 以前这里直接记文件大小，而且不是 0，之后进页面也不会再重算。
            if (isElectronEnvironment.value) {
              const cardConfig = resource.constructor?.cardDisplayConfig
              if (cardConfig?.badge?.field === 'folderSize') {
                await calculateAndUpdateResourceSize(
                  resource,
                  isElectronEnvironment.value,
                  pageTypeOfResource(resource) === 'Game'
                )
              }
            }
            console.log(`[GenericResourceView] 创建资源对象 (类型: ${matchedKind.id}):`, resource)

            // 把封面复制进存档目录。这样以后原文件或原文件夹没了，卡片仍然能显示这张封面。
            const resourceId = BaseResources.extractPrimitiveValue(resource.id?.value || resource.id || resourceData.id)
            if (resourceId) {
              const processed = await coverManager.processCoverForResource(resource, pageTypeOfResource(resource), String(resourceId))
              if (processed) Object.assign(resource, processed)
            }

            await attachFingerprint(resource, filePath, sameMatch.incoming.fingerprint)
            await writeResourceMarkerForItem(resource, filePath)
            
            // 添加到列表
          items.value.push(resource)
          rememberInCurrentCollection(resource)
          if (adoptedResourceId) claimedResourceIds.add(adoptedResourceId)
          addedCount++
        }
        
        if (addedCount > 0 || relocatedCount > 0) {
          await saveData()
          const parts = [
            addedCount > 0 ? `成功添加 ${addedCount} 个资源` : '',
            linkedCount > 0 ? `其中 ${linkedCount} 个接上了已有记录` : '',
            relocatedCount > 0 ? `更新 ${relocatedCount} 条资源路径` : '',
            ambiguousCount > 0 ? `${ambiguousCount} 个无法唯一确定` : '',
            duplicateCount > 0 ? `${duplicateCount} 个已存在` : '',
            failedCount > 0 ? `${failedCount} 个失败` : '',
            typeMismatchCount > 0 ? `${typeMismatchCount} 个类型不匹配` : ''
          ].filter(Boolean)
          notify.toast(
            'success',
            addedCount > 0 ? '添加成功' : '路径已更新',
            parts.join('，')
          )
        } else if (duplicateCount > 0) {
          const preview = duplicateNames.slice(0, 3).join('、')
          notify.toast(
            'warning',
            '已存在相同资源',
            `${duplicateCount} 个文件符合当前的相同资源规则，已跳过${preview ? `：${preview}` : ''}`
          )
        } else if (typeMismatchCount > 0) {
          notify.toast(
            'error',
            '资源类型不匹配',
            `${typeMismatchCount} 个文件的类型不匹配当前页面的配置`
          )
        } else if (ambiguousCount > 0) {
          notify.toast(
            'warning',
            '无法唯一确定',
            `${ambiguousCount} 个文件对上了多条旧记录，已跳过`
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
      const pageId = pageConfig.value?.id
      if (!pageId) {
        throw new Error('无法保存数据：pageId 不存在')
      }
      
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.sqliteSavePageResources) {
        throw new Error('不在 Electron 环境或数据库 API 不可用，无法保存')
      }
      for (const item of items.value) {
        if (!isCollectionRecord(item)) continue
        const alive = new Set(items.value.filter(entry => !isCollectionRecord(entry)).map(collectionResourceId))
        writeMemberIds(item, memberIdsOf(item).filter(id => alive.has(id)))
      }
      const saveableData = items.value.map(item => BaseResources.composeSaveData(item, (item as any).getSaveData()))
      // 先收成纯 JSON。响应式代理直接传给主进程时无法克隆，番剧详情上的视频列表就会让整次保存失败。
      let plainData: any
      try {
        plainData = JSON.parse(JSON.stringify(saveableData))
      } catch (serializeError: any) {
        throw new Error(`数据无法保存: ${serializeError?.message || '存档里有不能序列化的内容'}`)
      }
      const result = await window.electronAPI.sqliteSavePageResources(pageId, plainData)
      if (!result || !result.ok) {
        throw new Error((result && result.message) ? result.message : '保存页面数据到数据库失败')
      }
      console.log(`[GenericResourceView] 页面 ${pageId} 数据保存成功`)
      return true
    }

    /**
     * 只保存指定资源的正文，不重写页面索引。
     * 星级、收藏、页数、访问记录这类修改不需要动页面成员，避免整页序列化和整表重写。
     * @param targets 一个或多个资源实例
     */
    const saveResourcesDelta = async (targets: any | any[]) => {
      const pageId = pageConfig.value?.id
      if (!pageId) {
        throw new Error('无法保存数据：pageId 不存在')
      }
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.sqliteUpsertPageResources) {
        throw new Error('不在 Electron 环境或数据库 API 不可用，无法保存')
      }

      const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean)
      if (list.length === 0) return true

      const saveableData = list.map(item => BaseResources.composeSaveData(item, (item as any).getSaveData()))
      const plainData = JSON.parse(JSON.stringify(saveableData))
      const result = await window.electronAPI.sqliteUpsertPageResources(pageId, plainData)
      if (!result || !result.ok) {
        throw new Error(result?.message || '增量保存资源失败')
      }
      return true
    }

    /**
     * 延迟合并保存。访问记录这类不需要立刻落盘的修改先攒着，
     * 一次 IPC 写多条，避免连点几次就整页保存几次。
     */
    let scheduledResourceSaveTimer: ReturnType<typeof setTimeout> | null = null
    const scheduledResourceSaveItems = new Map<string, any>()

    const resourceIdOf = (item: any) =>
      BaseResources.extractPrimitiveValue(item?.id?.value ?? item?.id)

    const scheduleResourceSave = (item: any, delay = 800) => {
      const id = resourceIdOf(item)
      if (!id) return
      scheduledResourceSaveItems.set(id, item)
      if (scheduledResourceSaveTimer) return
      scheduledResourceSaveTimer = setTimeout(() => {
        scheduledResourceSaveTimer = null
        flushScheduledResourceSaves().catch(error => {
          console.warn('[GenericResourceView] 延迟保存资源失败:', error)
        })
      }, delay)
    }

    const cancelScheduledResourceSave = (item: any) => {
      const id = resourceIdOf(item)
      if (id) scheduledResourceSaveItems.delete(id)
    }

    const flushScheduledResourceSaves = async () => {
      if (scheduledResourceSaveTimer) {
        clearTimeout(scheduledResourceSaveTimer)
        scheduledResourceSaveTimer = null
      }
      if (scheduledResourceSaveItems.size === 0) return
      const snapshot = Array.from(scheduledResourceSaveItems.values())
      scheduledResourceSaveItems.clear()
      await saveResourcesDelta(snapshot)
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
              await saveResourcesDelta(item)
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
    /**
     * 详情下面正在显示的视频。
     * 不挂在资源类上。类实例后来才多出来的字段，界面不一定会跟着刷新，数量有了列表却不出现。
     */
    const detailFolderVideos = ref<any[]>([])
    /** 这次打开的详情已经扫过文件夹。没扫完不画出列表，避免先闪一行「没有视频」。 */
    const detailFolderVideosReady = ref(false)
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
    const sortOptions = pageConfig.value?.sortOptions || []

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

    /** 修改数据的表单是否打开 */
    const showArchiveDialog = ref(false)
    /** 正在改记录的那条资源。关掉详情后还要靠它把表单填上。 */
    const archiveTarget = ref<any>(null)
    /** 这条资源还在运行时，表单里的时长先锁住 */
    const archivePlayTimeLocked = computed(() => {
      return !!(archiveTarget.value && isResourceRunning(archiveTarget.value))
    })

    /**
     * 关掉修改数据的表单。
     */
    const closeArchiveDialog = () => {
      showArchiveDialog.value = false
      archiveTarget.value = null
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
      const touched: any[] = []

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
            touched.push(item)
            successCount++
          } catch (error) {
            console.error(`[GenericResourceView] 批量增加tag失败: ${itemId}`, error)
            failCount++
          }
        }
      }

      if (successCount > 0) {
        await saveResourcesDelta(touched)
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
      const touched: any[] = []

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
            touched.push(item)
            successCount++
          } catch (error) {
            console.error(`[GenericResourceView] 批量删除tag失败: ${itemId}`, error)
            failCount++
          }
        }
      }

      if (successCount > 0) {
        await saveResourcesDelta(touched)
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
          detachDeletedResource(String(itemId))
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
        const batchItems = [
          { key: 'batchAddTag', icon: '🏷️', label: '批量增加tag' },
          { key: 'batchDeleteTag', icon: '🏷️', label: '批量删除tag' },
          { key: 'batchDelete', icon: '🗑️', label: '批量删除文件' }
        ]
        if (currentCollectionId.value) {
          return [{ key: 'removeFromCollection', icon: '📤', label: '移出合集' }, ...batchItems]
        }
        return [{ key: 'addToCollection', icon: '📁', label: '加入合集' }, ...batchItems]
      } else {
        const menuClass = contextMenuTarget.value?.constructor || ResourceClass
        const resourcePath = BaseResources.extractPrimitiveValue(
          contextMenuTarget.value?.resourcePath?.value || contextMenuTarget.value?.resourcePath || ''
        )
        /** 文件夹漫画不显示外部打开。只有 cbr/cbz 才需要默认程序或指定程序。 */
        const showComicArchiveActions = isComicArchivePath(resourcePath)
        const menuItems = (menuClass.contextMenuItems || []).filter((item: { onlyComicArchive?: boolean }) => {
          return !item.onlyComicArchive || showComicArchiveActions
        })
        if (isCollectionRecord(contextMenuTarget.value)) return menuItems
        return [...menuItems, { key: 'scraper', icon: '📥', label: '刮削' }]
      }
    })

    
    // 使用通用筛选 composable（传入页面配置 ID 和额外数据）
    const filterComposable = useResourceFilter(
      items, 
      searchQuery, 
      sortBy, 
      pageConfig.value?.id || '',
      { isGameRunning: isGameRunningForFilter }
    )
    
    // 从筛选器状态中获取所有标签（用于编辑对话框，兼容单一口径）
    const allTags = computed<FilterItem[]>(() => {
      const tagsState = filterComposable.filterStates?.tags
      return tagsState?.items?.value || []
    })

    // 按字段 key 提供各自的候选列表（开发商用 developers 数据，标签用 tags 数据）
    // 注意：筛选器的 key 可能与资源字段名不同（如游戏页发行商 filter key 为 publishers，资源字段为 publisher），
    // 因此同时按 filterConfig.params.field（资源字段名）建立映射，供编辑对话框按字段名查找
    const availableTagsByField = computed<Record<string, FilterItem[]>>(() => {
      const states = filterComposable.filterStates
      if (!states || typeof states !== 'object') return {}
      // 建立 filter key -> 资源字段名 的映射
      const fieldByFilterKey: Record<string, string> = {}
      ;(pageConfig.value?.filterConfig || []).forEach((cfg: any) => {
        if (cfg?.key && cfg?.params?.field) {
          fieldByFilterKey[cfg.key] = cfg.params.field
        }
      })
      const map: Record<string, FilterItem[]> = {}
      for (const key of Object.keys(states)) {
        const items = (states as any)[key]?.items?.value
        const list = Array.isArray(items) ? items : []
        map[key] = list
        // 同时以资源字段名存一份（如 publishers -> publisher），保证编辑面板能按字段名命中
        const resourceField = fieldByFilterKey[key]
        if (resourceField && resourceField !== key) {
          map[resourceField] = list
        }
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

        const result = await window.electronAPI.terminateGame(executablePath, resourceName)
        
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
            await saveResourcesDelta(resource)
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
      if (isCollectionRecord(resource)) {
        openListedItem(resource)
        return
      }
      // 从资源实例获取实际的资源类型
      const actualResourceType = BaseResources.extractPrimitiveValue(
        resource.resourceType?.value || resource.resourceType
      ) || resource?.constructor?.name || resourceType.value
      
      // 构建 handler 上下文
      const context: ActionHandlerContext = {
        isElectronEnvironment: isElectronEnvironment.value,
        pageId: pageConfig.value?.id,
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
            cancelScheduledResourceSave(item)
            await saveResourcesDelta(item)
          }
        },
        isResourceRunning: (resource: any) => {
          return isResourceRunning(resource)
        },
        addRunningResource: (resourceInfo: any) => {
          // 能不能记运行时长，看这条资源自己的打开方式，不看页面的第一种类型
          const handlerName = resource?.constructor?.getActionHandlerName?.()
          if (handlerName === 'launchExecutable') {
            gameRunningStore.addRunningGame({
              id: resourceInfo.id,
              pid: resourceInfo.pid,
              windowTitles: resourceInfo.windowTitles || [],
              gameName: resourceInfo.gameName || ''
            })
          }
        },
        removeRunningResource: (resourceId: string) => {
          gameRunningStore.removeRunningGame(resourceId)
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
          scheduleResourceSave(item)
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
          const singleImageExt = /\.(jpg|jpeg|jpe|jfif|png|gif|bmp|webp|svg|ico|tiff|tif|heic|heif)$/i
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
              novel: settings.novel || {},
              websiteOpenMode: settings.websiteOpenMode === 'internal' ? 'internal' : 'external'
            }
          } catch (error) {
            console.warn('[GenericResourceView] 获取全局设置失败:', error)
            return {
              novelDefaultOpenMode: 'internal',
              novel: {},
              websiteOpenMode: 'external'
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
          scheduleResourceSave(item)
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
      // 不把页码清回 0。阅读器还在收起的一瞬间如果收到 0，会把已经记下的进度盖成第一页。

      // 只清空阅读器相关的状态，保留currentAlbum用于详情页显示
      // 如果是从详情页打开的，保持详情页状态
      // 如果是从卡片直接打开的，清空详情页状态
      if (!showDetailModal.value) {
        currentAlbum.value = null
        pages.value = []
      }
    }

    /**
     * 把一个字段写回资源。
     * 类上的字段放在 value 里，旧数据直接挂在实例上时就改那一层。
     * @param item 资源实例
     * @param key 字段名
     * @param value 要写下的值
     */
    const assignResourceField = (item: any, key: string, value: any) => {
      if (item?.[key] && typeof item[key] === 'object' && 'value' in item[key]) {
        item[key].value = value
      } else if (item) {
        item[key] = value
      }
    }

    /**
     * 漫画翻页后记下页码和百分比。
     * 下标从 0 开始，存档里的页码从 1 开始，和独立标签页用同一套。
     * @param newIndex 当前图片在列表里的位置
     */
    const handleComicViewerPageChange = (newIndex: number) => {
      currentPageIndex.value = newIndex
      const album = currentAlbum.value
      if (!album) return
      const albumId = String(BaseResources.extractPrimitiveValue(album.id?.value ?? album.id) ?? '')
      const item = items.value.find((i: any) => String(i.id?.value ?? i.id ?? '') === albumId) || album
      const page = newIndex + 1
      const total = pages.value.length
      assignResourceField(item, 'currentPage', page)
      assignResourceField(item, 'readProgress', total > 0 ? Math.round((page / total) * 100) : 0)
      scheduleResourceSave(item)
    }

    // 小说阅读器相关方法
    const closeNovelReader = () => {
      showNovelReader.value = false
      currentReadingNovel.value = null
    }

    /** EPUB 已经跳回上次的位置之后才允许记进度。 */
    const ebookProgressArmed = ref(false)

    const closeEbookReaderV2 = () => {
      showEbookReaderV2.value = false
      ebookReaderV2FilePath.value = ''
      ebookNavigation.value = null
      ebookBookAvailable.value = false
      ebookRendition.value = null
      ebookProgressArmed.value = false
    }

    /**
     * EPUB 目录和上次的位置都准备好了，后面的翻页可以写入存档。
     */
    const handleEbookReady = () => {
      ebookProgressArmed.value = true
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

    /**
     * 按文件路径取出 EPUB 上次的位置。
     * 内置阅读器打开时手里是路径，位置记在对应的那本小说上。
     * @param filePath 小说文件路径
     * @returns EPUB 位置。没有时是空字符串
     */
    const getNovelEpubCfiByPath = (filePath: string): string => {
      const novel = items.value.find((n: any) => getNovelFilePath(n) === filePath)
      if (!novel) return ''
      return BaseResources.extractPrimitiveValue(novel.epubCfi?.value || novel.epubCfi) || ''
    }

    /**
     * 把小说的页码、百分比或 EPUB 位置写回列表里的那一条，并安排落盘。
     * 独立标签页走数据库；这里是内置阅读器，资源就在当前列表里，直接改这一条。
     * @param patch 这次要记下的位置
     * @param filePath 没有当前小说对象时，用路径把那一条找出来
     */
    const persistNovelReading = (patch: { currentPage?: number, readProgress?: number, epubCfi?: string }, filePath = '') => {
      const novel = currentReadingNovel.value
      const novelId = novel ? String(BaseResources.extractPrimitiveValue(novel.id?.value ?? novel.id) ?? '') : ''
      const path = filePath || (novel ? getNovelFilePath(novel) : ebookReaderV2FilePath.value)
      const item = items.value.find((i: any) => {
        const id = String(i.id?.value ?? i.id ?? '')
        if (novelId && id === novelId) return true
        return path && getNovelFilePath(i) === path
      })
      if (!item) return
      if (patch.currentPage != null) assignResourceField(item, 'currentPage', patch.currentPage)
      if (patch.readProgress != null) assignResourceField(item, 'readProgress', patch.readProgress)
      if (patch.epubCfi) assignResourceField(item, 'epubCfi', patch.epubCfi)
      scheduleResourceSave(item)
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
      persistNovelReading({ currentPage: pageNum })
    }

    // 处理文本阅读器页面变化
    const handleTextPageChanged = async (pageNum: number) => {
      persistNovelReading({ currentPage: pageNum })
    }

    // 处理文本阅读器进度变化
    const handleTextProgressChanged = async (progress: number) => {
      persistNovelReading({ readProgress: progress })
    }

    /**
     * 内置 EPUB 阅读器的百分比。位置还没恢复完时不写，避免开头覆盖上次的进度。
     * @param progress 0 到 100
     */
    const handleEbookProgressChanged = (progress: number) => {
      if (!ebookProgressArmed.value) return
      persistNovelReading({ readProgress: progress }, ebookReaderV2FilePath.value)
    }

    /**
     * 内置 EPUB 阅读器的内部位置。
     * @param cfi 阅读器给出的位置
     */
    const handleEbookLocationChanged = (cfi: string) => {
      if (!ebookProgressArmed.value || !cfi) return
      persistNovelReading({ epubCfi: cfi }, ebookReaderV2FilePath.value)
    }

    /**
     * 独立标签页写完进度后，把列表里同一条资源的页码和百分比改掉。
     * 卡片不用重新进页面就能看到进度。这里只改内存，数据库已经由阅读器写过。
     * @param payload 阅读器通知的位置
     */
    const applyIncomingReadingProgress = (payload: { id?: string, resourcePath?: string, currentPage?: number, readProgress?: number, epubCfi?: string }) => {
      if (!payload) return
      const targetId = String(payload.id || '')
      const targetPath = String(payload.resourcePath || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
      const item = items.value.find((i: any) => {
        const id = String(i.id?.value ?? i.id ?? '')
        if (targetId && id === targetId) return true
        const path = String(BaseResources.extractPrimitiveValue(i.resourcePath?.value ?? i.resourcePath) || '')
          .replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
        return !!targetPath && path === targetPath
      })
      if (!item) return
      if (payload.currentPage != null) assignResourceField(item, 'currentPage', payload.currentPage)
      if (payload.readProgress != null) assignResourceField(item, 'readProgress', payload.readProgress)
      if (payload.epubCfi) assignResourceField(item, 'epubCfi', payload.epubCfi)
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
        const classNameToPageType: Record<string, string> = {
          Game: 'Game',
          Software: 'Software',
          Manga: 'Image',
          SingleImage: 'SingleImage',
          Video: 'Video',
          VideoFolder: 'Anime',
          Novel: 'Novel',
          Website: 'Website',
          Audio: 'Audio',
          Other: 'Other'
        }
        const rt = classNameToPageType[item?.constructor?.name] || resourceType.value
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
         // 计算资源大小
          const success = await calculateAndUpdateResourceSize(
            item, 
            isElectronEnvironment.value, 
            pageTypeOfResource(item) === 'Game'
          )
          
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
            await saveResourcesDelta(item)
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

        await applyRelocatedPath(existingItem, newPath)

        // 保存更新后的数据
        await saveResourcesDelta(existingItem)

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
      const itemType = pageConfig.value?.name || '资源'
      return `更新${itemType}路径`
    })

    const pathUpdateDialogDescription = computed(() => {
      const itemType = pageConfig.value?.name || '资源'
      return `发现符合相同资源规则、但路径不同的${itemType}记录：`
    })

    const pathUpdateItemNameLabel = computed(() => {
      const itemType = pageConfig.value?.name || '资源'
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
    
    /**
     * 按当前资源重算左侧筛选栏的数量，并交给外层侧栏。
     * 详情里改星级或完成状态时，列表条数不变，打开页面时统计的数量不会自己更新。
     * 勾选筛选用的是资源上的最新星级，所以列表是对的，侧栏数字却还停在改之前。
     */
    function refreshFilterSidebar() {
      if (!filterComposable.extractAllFilters || !filterComposable.getFilterData) {
        return
      }
      filterComposable.extractAllFilters()
      emit('filter-data-updated', filterComposable.getFilterData())
    }

    /**
     * 侧栏是否勾了筛选。
     * 有搜索词或筛选时，根目录要把合集里的资源也列出来，否则收进去就搜不到。
     */
    const collectionPunchThrough = computed(() => {
      if (String(searchQuery.value || '').trim()) return true
      const states = filterComposable.filterStates
      if (!states) return false
      return Object.values(states).some((state: any) => {
        const selected = state?.selected?.value || []
        const excluded = state?.excluded?.value || []
        return selected.length > 0 || excluded.length > 0
      })
    })

    /**
     * 当前这一屏的卡片。
     * 分页和空状态都看这份，而不是库里的全部资源。
     */
    const listedItems = computed(() => listCollectionScope(
      items.value,
      filteredItems.value || [],
      currentCollectionId.value,
      collectionPunchThrough.value && !currentCollectionId.value
    ))

    /** 页面名称，面包屑用。 */
    const pageTitle = computed(() => pageConfig.value?.name || '资源')

    /** 正在看的合集名称。合集被删掉后回到根目录。 */
    const currentCollectionName = computed(() => {
      const current = items.value.find(item => collectionResourceId(item) === currentCollectionId.value)
      if (!current || !isCollectionRecord(current)) return ''
      return String(BaseResources.extractPrimitiveValue(current.name?.value ?? current.name) || '未命名合集')
    })

    /**
     * 搜索打穿时，标出这条资源属于哪个合集。人在合集里面时不再重复标注。
     * @param item 卡片上的资源
     */
    const membershipNote = (item: any) => {
      if (!collectionPunchThrough.value || currentCollectionId.value || isCollectionRecord(item)) return ''
      const name = indexMembership(items.value).nameByMember.get(collectionResourceId(item))
      return name ? `属于「${name}」` : ''
    }

    /**
     * 合集没设封面时，用第一个成员的封面。
     * @param item 合集或普通资源
     */
    const collectionCover = (item: any) => {
      if (!isCollectionRecord(item)) return ''
      const own = String(BaseResources.extractPrimitiveValue(item.coverPath?.value ?? item.coverPath) || '')
      if (own) return ''
      const firstId = memberIdsOf(item)[0]
      if (!firstId) return ''
      const member = items.value.find(entry => collectionResourceId(entry) === firstId)
      if (!member) return ''
      const coverFields = [member.coverPath, member.thumbnail, member.cover, member.thumbnailPath]
      for (const field of coverFields) {
        const value = String(BaseResources.extractPrimitiveValue(field) || '').trim()
        if (value) return value
      }
      return ''
    }

    /**
     * 单击卡片。合集进入二级目录，其他资源仍打开详情。
     * @param item 被点的卡片
     */
    const openListedItem = (item: any) => {
      if (isCollectionRecord(item)) {
        currentCollectionId.value = collectionResourceId(item)
        searchQuery.value = ''
        return
      }
      if ((resourcePage as any).showDetail) {
        (resourcePage as any).showDetail(item)
      }
    }

    /** 从合集返回页面根目录。 */
    const leaveCollection = () => {
      currentCollectionId.value = ''
    }

    /** 打开创建合集的名称框。已经在合集里面时不能再创建下一层。 */
    const openCreateCollectionDialog = () => {
      if (currentCollectionId.value) return
      newCollectionName.value = ''
      showCreateCollectionDialog.value = true
    }

    const closeCreateCollectionDialog = () => {
      showCreateCollectionDialog.value = false
    }

    /**
     * 创建合集并进入它。
     * 合集先是空的，成员从本页已有资源里加。
     */
    const confirmCreateCollection = async () => {
      const name = newCollectionName.value.trim()
      if (!name) {
        notify.toast('warning', '创建合集', '请先填写合集名称')
        return
      }
      const collection = new Collection()
      collection.name.value = name
      collection.addedDate.value = new Date().toISOString()
      items.value.unshift(collection)
      showCreateCollectionDialog.value = false
      currentCollectionId.value = collectionResourceId(collection)
      try {
        await saveData()
      } catch (error: any) {
        notify.toast('error', '创建合集', error?.message || '保存失败')
      }
    }

    /** 本页可以放进当前合集的资源。 */
    const memberPickerCandidates = computed(() => {
      const current = items.value.find(item => collectionResourceId(item) === currentCollectionId.value)
      const already = new Set(memberIdsOf(current))
      const owners = indexMembership(items.value)
      const query = memberPickerQuery.value.trim().toLowerCase()
      return items.value
        .filter(item => !isCollectionRecord(item))
        .map(item => {
          const id = collectionResourceId(item)
          const name = String(BaseResources.extractPrimitiveValue(item.name?.value ?? item.name) || '未命名')
          return { id, name, ownerName: owners.nameByMember.get(id) || '' }
        })
        .filter(item => item.id && !already.has(item.id))
        .filter(item => !query || item.name.toLowerCase().includes(query))
    })

    const openMemberPicker = () => {
      if (!currentCollectionId.value) return
      memberPickerQuery.value = ''
      memberPickerSelected.value = new Set()
      showMemberPicker.value = true
    }

    const closeMemberPicker = () => {
      showMemberPicker.value = false
    }

    /**
     * 勾选或取消一条待加入的资源。
     * @param id 资源 id
     */
    const toggleMemberPicker = (id: string) => {
      const next = new Set(memberPickerSelected.value)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      memberPickerSelected.value = next
    }

    /** 把勾中的资源放进当前合集。 */
    const confirmAddMembers = async () => {
      const collectionId = currentCollectionId.value
      if (!collectionId || memberPickerSelected.value.size === 0) {
        closeMemberPicker()
        return
      }
      for (const memberId of memberPickerSelected.value) {
        moveResourceIntoCollection(collectionId, memberId)
      }
      closeMemberPicker()
      try {
        await saveData()
        notify.toast('success', '已加入合集', `加入了 ${memberPickerSelected.value.size} 个资源`)
      } catch (error: any) {
        notify.toast('error', '加入合集', error?.message || '保存失败')
      }
    }

    /** 根目录上已有的合集，供多选加入时挑选。 */
    const collectionChoices = computed(() => {
      return items.value.filter(isCollectionRecord).map(item => ({
        id: collectionResourceId(item),
        name: String(BaseResources.extractPrimitiveValue(item.name?.value ?? item.name) || '未命名合集')
      })).filter(item => item.id)
    })

    const closeCollectionPicker = () => {
      showCollectionPicker.value = false
    }

    /** 多选之后打开合集名单。没有合集时先提示去创建。 */
    const openCollectionPicker = () => {
      if (selectedItems.value.size === 0) {
        notify.toast('warning', '加入合集', '请先选择资源')
        return
      }
      if (collectionChoices.value.length === 0) {
        notify.toast('warning', '加入合集', '还没有合集，请先创建')
        return
      }
      showCollectionPicker.value = true
    }

    /**
     * 把当前多选放进一个合集。合集自己不能成为成员。
     * @param collectionId 目标合集
     */
    const confirmAddSelectionToCollection = async (collectionId: string) => {
      let count = 0
      for (const id of selectedItems.value) {
        const item = items.value.find(entry => collectionResourceId(entry) === id)
        if (!item || isCollectionRecord(item)) continue
        moveResourceIntoCollection(collectionId, id)
        count++
      }
      closeCollectionPicker()
      if (count === 0) return
      try {
        await saveData()
        notify.toast('success', '已加入合集', `加入了 ${count} 个资源`)
      } catch (error: any) {
        notify.toast('error', '加入合集', error?.message || '保存失败')
      }
    }

    /** 把多选的资源从当前合集移回根目录，不删除资源。 */
    const removeSelectionFromCollection = async () => {
      const current = items.value.find(item => collectionResourceId(item) === currentCollectionId.value)
      if (!current) return
      const removing = selectedItems.value
      writeMemberIds(current, memberIdsOf(current).filter(id => !removing.has(id)))
      try {
        await saveData()
        notify.toast('success', '已移出合集', '这些资源回到了页面根目录')
      } catch (error: any) {
        notify.toast('error', '移出合集', error?.message || '保存失败')
      }
    }

    const resourcePage = createResourcePage({
      pageConfig: {
        pageType: pageConfig.value?.id || 'games',
        itemType: pageConfig.value?.name || '资源',
        defaultPageSize: pageConfig.value?.defaultPageSize || 20
      },
      items: items,
      filteredItems: listedItems,
      searchQuery: searchQuery,
      sortBy: sortBy,
      crudConfig: {
        items: items,
        onAdd: async (data: any) => {
          const newItem = new (addResourceClass.value || ResourceClass)()
          console.log('[GenericResourceView] onAdd 开始 - data:', data)
          console.log('[GenericResourceView] onAdd 开始 - newItem 初始 id:', newItem.id?.value)
          
          for (const key in data) {
            BaseResources.assignSavedValue(newItem, key, data[key])
          }
          
          console.log('[GenericResourceView] onAdd 处理后 - newItem.id.value:', newItem.id?.value)
          
          // 处理封面：保存到 cover 文件夹
          const resourceId = BaseResources.extractPrimitiveValue(newItem.id?.value || newItem.id)
          if (resourceId) {
            console.log('[GenericResourceView] 准备处理封面...')
            const processedItem = await coverManager.processCoverForResource(newItem, pageTypeOfResource(newItem), resourceId)
            if (processedItem) {
              Object.assign(newItem, processedItem)
              console.log('[GenericResourceView] 封面处理完成')
            }
          }
          
          // 如果资源有 folderSize 字段配置，自动计算大小
          const cardConfig = newItem.constructor?.cardDisplayConfig || 
                           (typeof newItem.constructor?.getCardDisplayConfig === 'function' 
                             ? newItem.constructor.getCardDisplayConfig() 
                             : null)
          if (cardConfig?.badge?.field === 'folderSize' && isElectronEnvironment.value) {
            await calculateAndUpdateResourceSize(
              newItem, 
              isElectronEnvironment.value, 
              pageTypeOfResource(newItem) === 'Game'
            )
          }
          
          items.value.push(newItem)
          rememberInCurrentCollection(newItem)
          
          // 保存数据
          await saveData()
          
          return newItem
        },
        onUpdate: async (id: string, updates: any) => {
          const item = items.value.find((i: any) => (i.id?.value || i.id) === id)
          if (item) {
            const previousCover = coverManager.extractCoverFromResource(item)
            // 更新 ResourceField 的值（而不是直接覆盖对象）
            Object.keys(updates).forEach(key => {
              // 类上有的字段改 value。这一页新加的字段留在记录上，不因为当前类不认识就丢掉。
              BaseResources.assignSavedValue(item, key, updates[key])
            })
            
            // 处理封面：如果封面字段被更新了，保存到 cover 文件夹
            const hasCoverUpdate = ['coverPath', 'cover', 'thumbnail', 'thumbnailPath'].some(
              field => updates[field] !== undefined
            )
            if (hasCoverUpdate) {
              console.log('[GenericResourceView] 封面已更新，准备处理封面...')
              const resourceId = BaseResources.extractPrimitiveValue(item.id?.value || item.id)
              if (resourceId) {
                const processedItem = await coverManager.processCoverForResource(item, pageTypeOfResource(item), resourceId)
                if (processedItem) {
                  Object.assign(item, processedItem)
                  console.log('[GenericResourceView] 封面处理完成')
                }
              }
            }
            
            // 仅当更新了 resourcePath、且当前没有 folderSize 数据时才计算大小（不覆盖已有值）
            if (updates.resourcePath && isElectronEnvironment.value) {
              const cardConfig = item.constructor?.cardDisplayConfig || 
                               (typeof item.constructor?.getCardDisplayConfig === 'function' 
                                 ? item.constructor.getCardDisplayConfig() 
                                 : null)
              if (cardConfig?.badge?.field === 'folderSize') {
                const folderSize = BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize)
                if (folderSize === undefined || folderSize === null) {
                  await calculateAndUpdateResourceSize(
                    item, 
                    isElectronEnvironment.value, 
                    pageTypeOfResource(item) === 'Game'
                  )
                }
              }
            }
            
            // 只写这一条资源，不重写整页
            cancelScheduledResourceSave(item)
            await saveResourcesDelta(item)
            if (hasCoverUpdate && previousCover && pageTypeOfResource(item) === 'Video') {
              const nextCover = coverManager.extractCoverFromResource(item)
              await deleteReplacedCover(previousCover.value, nextCover?.value || '')
            }
            // 星级、完成状态写在资源上，侧栏数量要按保存后的数据立刻重算。
            refreshFilterSidebar()
          }
        },
        onDelete: async (id: string) => {
          const index = items.value.findIndex((i: any) => (i.id?.value || i.id) === id)
          if (index > -1) {
            detachDeletedResource(id)
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
        itemType: pageConfig.value?.name || '资源'
      },
      contextMenuHandlers: contextMenuHandlers,
      emptyState: pageConfig.value?.emptyStateConfig || {
        icon: '📄',
        title: '暂无数据',
        description: '点击"添加"按钮添加新项目',
        buttonText: '添加',
        buttonAction: 'showAddDialog'
      },
      toolbar: {
        ...pageConfigLoader.getToolbarConfig(pageConfig.value?.id || resourceTypeToPageIdMap[resourceType.value]),
        sortOptions: sortOptions.map(option => ({
          id: option.id,
          label: option.label
        }))
      },
      displayLayout: pageConfig.value?.displayLayoutConfig,
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

    /**
     * 编辑窗口用被编辑那一条自己的资源类。
     * 编辑数据是拷贝出来的普通对象，所以要回到列表里找原来的实例。
     */
    const editResourceClass = computed(() => {
      const form: any = resourcePage.editForm.value
      const formId = form?.id?.value || form?.id
      const item = items.value.find((entry: any) => (entry.id?.value || entry.id) === formId)
      return item?.constructor || addResourceClass.value || ResourceClass
    })

    /**
     * 编辑合集时只留名称、简介、标签和封面。
     * 页面上的引擎、时长、路径是成员自己的字段，不应该出现在合集上。
     */
    const editEnabledFieldKeys = computed(() => {
      const form: any = resourcePage.editForm.value
      if (isCollectionRecord(form)) return ['name', 'description', 'tags', 'coverPath']
      return pageFieldKeys.value
    })

    /**
     * 工具栏在「添加」后面放「创建合集」。
     * 进入合集后改成返回和加入已有资源，不再创建下一层。
     */
    const collectionToolbar = computed(() => {
      const base = resourcePage.toolbarConfig || { items: [] }
      const itemsInBar = Array.isArray(base.items) ? [...base.items] : []
      if (currentCollectionId.value) {
        const withoutCreate = itemsInBar.filter((item: any) => item?.action !== 'showCreateCollectionDialog')
        return {
          ...base,
          items: [
            { type: 'button', label: '返回上一级', action: 'leaveCollection', buttonType: 'secondary' },
            { type: 'button', label: '加入已有资源', action: 'showMemberPicker', icon: '➕', buttonType: 'primary' },
            ...withoutCreate
          ]
        }
      }
      const already = itemsInBar.some((item: any) => item?.action === 'showCreateCollectionDialog')
      if (already) return base
      const addIndex = itemsInBar.findIndex((item: any) => item?.type === 'button')
      const createButton = { type: 'button', label: '创建合集', action: 'showCreateCollectionDialog', icon: '📁', buttonType: 'primary' }
      if (addIndex < 0) {
        return { ...base, items: [createButton, ...itemsInBar] }
      }
      const next = [...itemsInBar]
      next.splice(addIndex + 1, 0, createButton)
      return { ...base, items: next }
    })

    /**
     * 空合集用自己的说明。页面原来的「库是空的」只在根目录一条资源都没有时出现。
     */
    const collectionEmptyState = computed(() => {
      const base = resourcePage.emptyStateConfig
      if (!currentCollectionId.value || collectionPunchThrough.value) return base
      const current = items.value.find(item => collectionResourceId(item) === currentCollectionId.value)
      if (memberIdsOf(current).length > 0) return base
      return {
        ...base,
        noResultsIcon: '📁',
        noResultsTitle: '这个合集还是空的',
        noResultsDescription: '用「加入已有资源」把本页已有的资源加进来'
      }
    })

    watch(currentCollectionId, () => {
      resourcePage.resetToFirstPage?.()
    })

    /**
     * 正在看的合集被删掉之后回到根目录。
     * 否则面包屑还停在一个已经不存在的 id 上，列表会是空的。
     */
    watch(() => items.value.map(item => collectionResourceId(item)).join('|'), () => {
      if (!currentCollectionId.value) return
      const current = items.value.find(item => collectionResourceId(item) === currentCollectionId.value)
      if (!current || !isCollectionRecord(current)) currentCollectionId.value = ''
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
     * 读取设置里的相同资源规则。读不到时用默认的「文件名 + 上一级文件夹」。
     */
    const loadSameResourceRule = async (): Promise<SameResourceRule> => {
      try {
        const settings = await saveManager.loadSettings()
        return normalizeSameResourceRule(settings?.sameResourceRule)
      } catch (error) {
        console.warn('[GenericResourceView] 读取相同资源规则失败，使用默认规则:', error)
        return normalizeSameResourceRule(null)
      }
    }

    /**
     * 标记文件开关。旧存档没有这个字段时按开启处理。
     */
    const loadResourceMarkerEnabled = async (): Promise<boolean> => {
      try {
        const settings = await saveManager.loadSettings()
        return settings?.resourceMarkerEnabled !== false
      } catch (error) {
        console.warn('[GenericResourceView] 读取标记文件设置失败，按开启处理:', error)
        return true
      }
    }

    /** 网站地址和压缩包内部虚拟路径没有实体位置，不写标记。 */
    const canUseResourceMarker = (filePath: string): boolean => {
      return !!filePath && !/^[a-z]+:\/\//i.test(filePath)
    }

    const getResourceId = (item: any): string => {
      return String(BaseResources.extractPrimitiveValue(item?.id?.value ?? item?.id) || '')
    }

    /**
     * 给资源写标记。补写时传 onlyIfMissing，避免每次进页面都重写一遍。
     */
    const writeResourceMarkerForItem = async (
      item: any,
      filePath: string,
      options: { onlyIfMissing?: boolean; previousPath?: string } = {}
    ): Promise<boolean> => {
      if (!canUseResourceMarker(filePath)) return false
      if (!isElectronEnvironment.value || !window.electronAPI?.writeResourceMarker) return false
      const resourceId = getResourceId(item)
      if (!resourceId) return false
      if (!(await loadResourceMarkerEnabled())) return false
      try {
        const result = await window.electronAPI.writeResourceMarker({
          resourcePath: filePath,
          resourceId,
          resourceType: savedTypeOfResource(item),
          resourceName: sameResourceName(item),
          previousPath: options.previousPath,
          onlyIfMissing: options.onlyIfMissing
        })
        return !!result?.success
      } catch (error) {
        console.warn('[GenericResourceView] 写入资源标记失败:', filePath, error)
        return false
      }
    }

    type MarkerImportMatch =
      | { action: 'none' }
      | { action: 'adopt'; resourceId: string }
      | { action: 'duplicate'; resourceId: string; item?: any }
      | { action: 'relocate'; resourceId: string; item: any; saved: any }
      | { action: 'ambiguous'; count: number }

    /** 资源表名对应的存档类型，用来在记录没写 resourceType 时判断类型。 */
    const SAVED_TYPES_BY_TABLE: Record<string, string[]> = {
      games: ['game'],
      software: ['software'],
      manga: ['manga', 'image'],
      singleImage: ['single-image', 'singleimage'],
      video: ['movie', 'video'],
      videoFolder: ['animation', 'videofolder', 'anime'],
      novel: ['novel'],
      website: ['website'],
      audio: ['audio'],
      other: ['other']
    }

    /**
     * 按资源 ID 在所有资源表里找记录。一次导入里重复查同一个 ID 时走缓存。
     */
    const findResourceRecordById = async (
      resourceId: string,
      cache?: Map<string, { resource: any; tableName: string } | null>
    ): Promise<{ resource: any; tableName: string } | null> => {
      if (!resourceId) return null
      if (cache?.has(resourceId)) return cache.get(resourceId) || null
      if (!isElectronEnvironment.value || !window.electronAPI?.sqliteFindResourceById) return null

      try {
        const result = await window.electronAPI.sqliteFindResourceById(resourceId)
        const found = result?.ok && result.resource
          ? { resource: result.resource, tableName: String(result.tableName || '') }
          : null
        cache?.set(resourceId, found)
        return found
      } catch (error) {
        console.warn('[GenericResourceView] 按资源 ID 查找失败:', resourceId, error)
        return null
      }
    }

    const markerRecordTypeMatches = (saved: any, tableName: string, incomingType: string): boolean => {
      if (!incomingType) return true
      const declaredType = typeof saved?.resourceType === 'string'
        ? saved.resourceType.trim().toLowerCase()
        : ''
      if (declaredType) return declaredType === incomingType
      return (SAVED_TYPES_BY_TABLE[String(tableName || '')] || []).includes(incomingType)
    }

    const checkResourcePathExists = async (filePath: string): Promise<boolean> => {
      if (!filePath || !isElectronEnvironment.value || !window.electronAPI?.checkFileExists) return false
      try {
        const result = await window.electronAPI.checkFileExists(filePath)
        return !!result?.exists
      } catch (error) {
        console.warn('[GenericResourceView] 检查旧路径是否存在失败:', filePath, error)
        return false
      }
    }

    /** 把已经在数据库里的记录接进当前页；已经在了就直接复用。 */
    const attachSavedResource = (saved: any): any => {
      const resourceId = String(saved?.id || '')
      if (resourceId) {
        const existing = items.value.find((item: any) => getResourceId(item) === resourceId)
        if (existing) return existing
      }
      const resource = instantiateSavedResource(saved)
      items.value.push(resource)
      rememberInCurrentCollection(resource)
      return resource
    }

    /**
     * 导入的资源旁边有标记时，按标记里的资源 ID 找全局旧记录。
     * 旧路径还在说明这只是一份拷贝，按重复处理；旧路径没了才把记录改到新位置。
     */
    const findMarkerImportMatch = async (
      filePath: string,
      savedType: string,
      lookupCache?: Map<string, { resource: any; tableName: string } | null>
    ): Promise<MarkerImportMatch> => {
      if (!isElectronEnvironment.value || !window.electronAPI?.listResourceMarkers) return { action: 'none' }
      if (!(await loadResourceMarkerEnabled())) return { action: 'none' }

      let markers: ResourceMarkerInfo[] = []
      try {
        const result = await window.electronAPI.listResourceMarkers(filePath)
        if (!result?.success || !result.markers?.length) return { action: 'none' }
        markers = result.markers
      } catch (error) {
        console.warn('[GenericResourceView] 读取资源标记失败:', filePath, error)
        return { action: 'none' }
      }

      const baseName = filePath.split(/[\\/]/).pop()?.toLowerCase() || ''
      const isExactMarker = (marker: ResourceMarkerInfo): boolean =>
        marker.targetType === 'folder' || (marker.targetFileName || '').toLowerCase() === baseName
      // 同名侧车优先级最高；改过名的文件才用目录里剩下的标记。
      const ordered = [...markers].sort(
        (left, right) => Number(isExactMarker(right)) - Number(isExactMarker(left))
      )

      const candidates: MarkerImportCandidate[] = []
      const records = new Map<string, { saved: any; item: any }>()
      const seenIds = new Set<string>()

      for (const marker of ordered) {
        const resourceId = String(marker.resourceId || '')
        if (!resourceId || seenIds.has(resourceId)) continue
        seenIds.add(resourceId)

        const exact = isExactMarker(marker)
        const found = await findResourceRecordById(resourceId, lookupCache)
        if (!found) {
          candidates.push({ resourceId, exact, known: false, oldPathExists: false, typeMatches: true })
          continue
        }

        const item = instantiateSavedResource(found.resource)
        const oldPath = getResourceFilePath(item) || ''
        const oldPathExists = oldPath ? await checkResourcePathExists(oldPath) : false
        candidates.push({
          resourceId,
          exact,
          known: true,
          oldPathExists,
          typeMatches: markerRecordTypeMatches(found.resource, found.tableName, savedType)
        })
        records.set(resourceId, { saved: found.resource, item })
      }

      const decision = decideMarkerImport(candidates)
      if (decision.action === 'adopt') return { action: 'adopt', resourceId: decision.resourceId }
      if (decision.action === 'ambiguous') return { action: 'ambiguous', count: decision.count }
      if (decision.action === 'duplicate') {
        return { action: 'duplicate', resourceId: decision.resourceId, item: records.get(decision.resourceId)?.item }
      }
      if (decision.action === 'relocate') {
        const record = records.get(decision.resourceId)
        if (!record) return { action: 'none' }
        return { action: 'relocate', resourceId: decision.resourceId, item: record.item, saved: record.saved }
      }
      return { action: 'none' }
    }

    /**
     * 计算传入路径的指纹。只有规则勾了内容指纹，或需要指纹兜底时才调用。
     */
    const computeIncomingFingerprint = async (
      filePath: string,
      kind: ReturnType<typeof fingerprintKindForResource>
    ): Promise<string> => {
      if (!kind || !filePath || !window.electronAPI?.computeResourceFingerprint) return ''
      try {
        const result = await window.electronAPI.computeResourceFingerprint(filePath, kind)
        return result?.success && result.fingerprint ? result.fingerprint : ''
      } catch (error) {
        console.warn('[GenericResourceView] 计算资源指纹失败:', filePath, error)
        return ''
      }
    }

    /**
     * 这次拖入或导入的文件，整理成规则比较用的信息。
     */
    const describeIncomingResource = async (
      filePath: string,
      rule: SameResourceRule,
      kind: ReturnType<typeof fingerprintKindForResource>
    ): Promise<SameResourceDescriptor> => {
      const fingerprint = rule.criteria.includes('fingerprint')
        ? await computeIncomingFingerprint(filePath, kind)
        : ''
      let fileSize: number | null = null

      if (rule.criteria.includes('fileSize') && window.electronAPI?.getFileStats) {
        try {
          const stats = await window.electronAPI.getFileStats(filePath)
          if (stats?.success && stats.isFile && Number(stats.size) > 0) {
            fileSize = Number(stats.size)
          }
        } catch (error) {
          console.warn('[GenericResourceView] 读取文件大小失败:', filePath, error)
        }
      }

      if (fileSize === null) {
        const fingerprintSize = fingerprintFileSize(fingerprint)
        if (fingerprintSize > 0) fileSize = fingerprintSize
      }

      return buildSameResourceDescriptor({ path: filePath, fileSize, fingerprint })
    }

    /**
     * 现有资源整理成规则比较用的信息。单文件大小从指纹里取，文件夹不参与大小比较。
     */
    const describeResourceForSameRule = (item: any): SameResourceDescriptor => {
      const path = getResourceFilePath(item) || ''
      const fingerprint = readFingerprint(item)
      const fingerprintSize = fingerprintFileSize(fingerprint)
      return buildSameResourceDescriptor({
        path,
        fingerprint,
        fileSize: fingerprintSize > 0 ? fingerprintSize : null
      })
    }

    /**
     * 资源的存档类型。游戏不会和漫画、视频互相比较。
     */
    const savedTypeOfResource = (item: any): string => {
      const value = BaseResources.extractPrimitiveValue(item?.resourceType?.value ?? item?.resourceType)
      if (typeof value === 'string' && value) return value.trim().toLowerCase()
      return savedTypeOfClass(item?.constructor).trim().toLowerCase()
    }

    /** 通知里显示的资源名。 */
    const sameResourceName = (item: any): string => {
      const name = BaseResources.extractPrimitiveValue(item?.name?.value ?? item?.name)
      return String(name || getResourceFilePath(item) || '未命名资源')
    }

    const notifySameResourceAmbiguous = (count: number): void => {
      notify.toast(
        'warning',
        '无法确定要找回哪一条',
        `有 ${count} 条旧记录符合当前的相同资源规则。为避免改错，本次没有导入；可以在设置里收紧规则后重试。`
      )
    }

    type SameResourceImportMatch =
      | { action: 'none'; incoming: SameResourceDescriptor }
      | { action: 'duplicate'; item: any; incoming: SameResourceDescriptor }
      | { action: 'relocate'; item: any; incoming: SameResourceDescriptor }
      | { action: 'ambiguous'; items: any[]; incoming: SameResourceDescriptor }

    /**
     * 按设置里的规则找当前页面是否有同一条资源。
     * 对方文件还在算重复；只有一条丢失记录才算搬家；多条丢失记录不猜。
     */
    const findSameResourceForImport = async (
      filePath: string,
      savedType: string,
      rule: SameResourceRule,
      kind: ReturnType<typeof fingerprintKindForResource>
    ): Promise<SameResourceImportMatch> => {
      const incoming = await describeIncomingResource(filePath, rule, kind)
      const matched: any[] = []

      for (const item of items.value) {
        const itemPath = getResourceFilePath(item) || ''
        if (!itemPath || isSameResourcePath(itemPath, filePath)) continue
        const itemType = savedTypeOfResource(item)
        if (savedType && itemType && itemType !== savedType) continue
        if (!matchesSameResource(incoming, describeResourceForSameRule(item), rule)) continue
        matched.push(item)
      }

      if (matched.length === 0) return { action: 'none', incoming }

      const existing: any[] = []
      const missing: any[] = []
      for (const item of matched) {
        const itemPath = getResourceFilePath(item) || ''
        let isMissing = !getFileExists(item)
        if (!isMissing && isElectronEnvironment.value && window.electronAPI?.checkFileExists) {
          try {
            const result = await window.electronAPI.checkFileExists(itemPath)
            isMissing = !result?.exists
            if (isMissing) setFileExists(item, false)
          } catch (error) {
            console.warn('[GenericResourceView] 检查旧路径是否存在失败:', itemPath, error)
          }
        }
        if (isMissing) missing.push(item)
        else existing.push(item)
      }

      if (existing.length > 0) return { action: 'duplicate', item: existing[0], incoming }
      if (missing.length === 1) return { action: 'relocate', item: missing[0], incoming }

      // 多条旧记录都丢了时，如果指纹只能对上一条，就用它，免得还要用户手动挑。
      if (incoming.fingerprint) {
        const fingerprintMatches = missing.filter(item =>
          isSameFingerprintIdentity(readFingerprint(item), incoming.fingerprint || '')
        )
        if (fingerprintMatches.length === 1) {
          return { action: 'relocate', item: fingerprintMatches[0], incoming }
        }
      }

      return { action: 'ambiguous', items: missing, incoming }
    }

    /**
     * 路径是否指向同一个位置。比较时忽略斜杠方向和大小写。
     * @param left 路径一
     * @param right 路径二
     * @returns 是否相同
     */
    const isSameResourcePath = (left: string, right: string): boolean => {
      const normalize = (value: string) => value.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase()
      return normalize(left || '') === normalize(right || '')
    }

    /**
     * 把资源路径改到新位置。只改那些目前还记着旧路径的字段。
     * @param item 资源
     * @param oldPath 旧路径
     * @param newPath 新路径
     */
    const setResourceFilePath = (item: any, oldPath: string, newPath: string): void => {
      const pathFields = ['resourcePath', 'filePath', 'executablePath']
      for (const field of pathFields) {
        const current = BaseResources.extractPrimitiveValue(item[field])
        if (!current || !isSameResourcePath(String(current), oldPath)) continue
        if (item[field] && typeof item[field] === 'object' && 'value' in item[field]) {
          item[field].value = newPath
        } else {
          item[field] = newPath
        }
      }
    }

    /**
     * 把已有记录的路径改到新位置，并刷新大小、指纹和标记。
     * 旧路径和新路径相同时不动，避免批量导入里重复处理同一条记录。
     * @param item 已有资源
     * @param newPath 新路径
     * @returns 是否真的改了路径
     */
    const applyRelocatedPath = async (item: any, newPath: string): Promise<boolean> => {
      const oldPath = getResourceFilePath(item) || ''
      if (!oldPath || isSameResourcePath(oldPath, newPath)) return false

      setResourceFilePath(item, oldPath, newPath)
      setFileExists(item, true)

      if (isElectronEnvironment.value && window.electronAPI?.getFolderSize) {
        try {
          const result = await window.electronAPI.getFolderSize(newPath)
          if (result.success && typeof result.size === 'number') {
            if (item.folderSize && typeof item.folderSize === 'object' && 'value' in item.folderSize) {
              item.folderSize.value = result.size
            } else {
              item.folderSize = result.size
            }
          }
        } catch (error) {
          console.warn('[GenericResourceView] 获取文件夹大小失败:', newPath, error)
        }
      }

      await attachFingerprint(item, newPath)
      await writeResourceMarkerForItem(item, newPath, { previousPath: oldPath })
      return true
    }

    /**
     * 导入时把一条旧记录挪到新路径。同一批次里同一条记录只处理一次。
     * @returns 是否更新了路径
     */
    const relocateImportedItem = async (
      item: any,
      newPath: string,
      claimedResourceIds: Set<string>
    ): Promise<boolean> => {
      const resourceId = getResourceId(item)
      if (resourceId && claimedResourceIds.has(resourceId)) return false
      if (!(await applyRelocatedPath(item, newPath))) return false
      if (resourceId) claimedResourceIds.add(resourceId)
      return true
    }

    /**
     * 给一条资源补上指纹。文件还在的时候记下来，之后改名才能认出来。
     * @param item 资源
     * @param filePath 当前真实路径
     */
    const attachFingerprint = async (item: any, filePath: string, knownFingerprint = ''): Promise<void> => {
      const kind = fingerprintKindForResource(item?.constructor?.name || resourceType.value)
      const fingerprint = knownFingerprint || await computeIncomingFingerprint(filePath, kind)
      if (fingerprint) writeFingerprint(item, fingerprint)
    }

    /**
     * 按指纹找出可以改地址的旧资源。
     * 文件名已经变了，但项目文件名、漫画页或文件大小还能对上，并且旧路径打不开，才认为是同一条。
     * 对上多条时不猜，避免把两部页数一样的漫画并错。
     * @param filePath 这次上传的新路径
     * @returns 旧资源；没有唯一匹配时返回 null
     */
    const findMissingResourceByFingerprint = async (filePath: string, knownFingerprint = ''): Promise<any | null> => {
      const kind = fingerprintKindForResource(resourceType.value)
      if (!kind) return null

      const incoming = knownFingerprint || await computeIncomingFingerprint(filePath, kind)
      if (!incoming) return null

      const matches: any[] = []
      for (const item of items.value) {
        const itemPath = getResourceFilePath(item)
        if (!itemPath || isSameResourcePath(itemPath, filePath)) continue
        if (!isSameFingerprintIdentity(readFingerprint(item), incoming)) continue

        let missing = !getFileExists(item)
        if (!missing && window.electronAPI?.checkFileExists) {
          try {
            const result = await window.electronAPI.checkFileExists(itemPath)
            missing = !result?.exists
            if (missing) setFileExists(item, false)
          } catch (error) {
            console.warn('[GenericResourceView] 检查旧路径是否存在失败:', itemPath, error)
          }
        }
        if (missing) matches.push(item)
      }
      return matches.length === 1 ? matches[0] : null
    }

    /**
     * 详情面板 / 右键菜单 共用操作：根据 actionKey 执行对应逻辑，便于复用。
     */
    /**
     * 把修改数据表单里的时长、次数和时间写回这条资源并保存。
     * 走和编辑信息一样的写回，这样页面上多出来的字段也不会被丢掉。
     * @param updates 表单整理好的字段
     */
    const handleArchiveConfirm = async (updates: Record<string, unknown>) => {
      const target = archiveTarget.value
      const id = BaseResources.extractPrimitiveValue(target?.id?.value ?? target?.id)
      const item = items.value.find((entry: any) => (entry.id?.value || entry.id) === id)
      if (!item) {
        notify.toast('error', '保存失败', '找不到这条资源')
        return
      }
      Object.keys(updates).forEach((key) => {
        BaseResources.assignSavedValue(item, key, updates[key])
      })
      cancelScheduledResourceSave(item)
      await saveResourcesDelta(item)
      refreshFilterSidebar()
      closeArchiveDialog()
      notify.toast('success', '已保存', '记录已更新')
    }

    /**
     * 把一首音频放进播放列表，不开始播放。
     * 点「播放」时如果这首已经在列表里，播放器会连同列表里的其他歌一起播。
     * @param item 音频资源
     */
    const addAudioToPlaylist = async (item: any) => {
      const track = normalizePlaylistTrack({
        id: BaseResources.extractPrimitiveValue(item?.id?.value ?? item?.id),
        name: BaseResources.extractPrimitiveValue(item?.name?.value ?? item?.name),
        artist: BaseResources.extractPrimitiveValue(item?.artist?.value ?? item?.artist),
        resourcePath: BaseResources.extractPrimitiveValue(item?.resourcePath?.value ?? item?.resourcePath),
        coverPath: BaseResources.extractPrimitiveValue(item?.coverPath?.value ?? item?.coverPath),
        duration: BaseResources.extractPrimitiveValue(item?.duration?.value ?? item?.duration),
        description: BaseResources.extractPrimitiveValue(item?.description?.value ?? item?.description),
        tags: item?.tags?.value ?? item?.tags,
        actors: item?.actors?.value ?? item?.actors
      })
      if (!track) {
        notify.toast('error', lt('添加失败'), lt('这首音频没有文件路径'))
        return
      }
      const result = await addTrackToSavedPlaylist(track)
      if (!result.saved) {
        notify.toast('error', lt('添加失败'), lt('播放列表没有保存成功'))
        return
      }
      if (result.added) {
        notify.toast('success', lt('已添加'), lt('已将「{name}」添加到播放列表').replace('{name}', track.name))
      } else {
        notify.toast('info', lt('已在列表中'), lt('「{name}」已经在播放列表里').replace('{name}', track.name))
      }
    }

    const handleDetailActionImpl = (actionKey: string, item: any) => {
      switch (actionKey) {
        case 'launch':
          handleResourceAction(item)
          break
        case 'launchWithLocale':
          handleResourceAction(item, { handlerName: 'launchWithLocale' })
          break
        case 'openComicDefault':
          handleResourceAction(item, { handlerName: 'openComicArchiveDefault' })
          break
        case 'openComicSpecified':
          handleResourceAction(item, { handlerName: 'openComicArchiveSpecified' })
          break
        case 'open':
        case 'addToPlaylist':
          void addAudioToPlaylist(item)
          break
        case 'play':
        case 'read':
        case 'visit':
          // 详情面板主按钮：按资源类的 actionConfig 路由到对应 handler
          // （番剧→openFolder、漫画/单图→openAlbum、视频/音频→playVideo/playAudio、网站→openWebsite、小说→openNovelReader）
          handleResourceAction(item)
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
        case 'edit-archive':
          archiveTarget.value = item
          showArchiveDialog.value = true
          if ((resourcePage as any).closeDetail) {
            (resourcePage as any).closeDetail()
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
      const classNameToPageType: Record<string, string> = {
        Game: 'Game', Software: 'Software', Manga: 'Image', SingleImage: 'SingleImage',
        Video: 'Video', VideoFolder: 'Anime', Novel: 'Novel', Website: 'Website', Audio: 'Audio', Other: 'Other'
      }
      const rt = classNameToPageType[item?.constructor?.name] || resourceType.value
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
          cancelScheduledResourceSave(item)
          await saveResourcesDelta(item)
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
    contextMenuHandlers.openComicDefault = (item: any) => handleDetailActionImpl('openComicDefault', item)
    contextMenuHandlers.openComicSpecified = (item: any) => handleDetailActionImpl('openComicSpecified', item)
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
    contextMenuHandlers.addToCollection = () => openCollectionPicker()
    contextMenuHandlers.removeFromCollection = () => removeSelectionFromCollection()

    /**
     * 正在检查文件是否还在。
     * 同一次进入里如果又被叫到，直接跳过，避免同一批结果弹两次。
     */
    let fileExistenceCheckRunning = false

    // 通用的文件存在性检查函数
    const checkFileExistence = async (): Promise<void> => {
      if (fileExistenceCheckRunning) return
      fileExistenceCheckRunning = true
      try {
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

      const markerEnabled = await loadResourceMarkerEnabled()

      // 一次 IPC 批量查完，几千条资源也不用挨个等主进程回话
      const uniquePaths = Array.from(new Set(
        items.value
          .map((item: any) => getResourceFilePath(item))
          .filter((path: any): path is string => typeof path === 'string' && path.trim() !== '')
      ))
      const pathExists = new Map<string, boolean>()
      if (window.electronAPI?.checkFileExistsBatch) {
        const response = await window.electronAPI.checkFileExistsBatch(uniquePaths)
        const results = Array.isArray(response?.results) ? response.results : []
        uniquePaths.forEach((path, index) => pathExists.set(path, results[index] === true))
      } else {
        for (const path of uniquePaths) {
          try {
            const result = await window.electronAPI.checkFileExists(path)
            pathExists.set(path, result?.exists === true)
          } catch (error) {
            console.warn('[GenericResourceView] 检测文件存在性失败:', path, error)
            pathExists.set(path, false)
          }
        }
      }

      for (const item of items.value) {
        if (isCollectionRecord(item)) {
          setFileExists(item, true)
          continue
        }
        const filePath = getResourceFilePath(item)
        setFileExists(item, !!filePath && pathExists.get(filePath) === true)
      }

      /** 指纹或路径被补写过的资源，最后只保存这几条 */
      const dirtyItems = new Set<any>()

      // 文件还在、但还没记过指纹的，补记一次。以后改名或在同级目录移动，就能认出还是这一条。
      let fingerprintDirty = false
      for (const item of items.value) {
        if (!getFileExists(item) || readFingerprint(item)) continue
        const filePath = getResourceFilePath(item)
        if (!filePath) continue
        const before = readFingerprint(item)
        await attachFingerprint(item, filePath)
        if (readFingerprint(item) && readFingerprint(item) !== before) {
          fingerprintDirty = true
          dirtyItems.add(item)
        }
      }

      // 文件还在、但还没写过标记的，补写一次。
      if (markerEnabled) {
        for (const item of items.value) {
          if (!getFileExists(item)) continue
          const filePath = getResourceFilePath(item)
          if (!filePath) continue
          await writeResourceMarkerForItem(item, filePath, { onlyIfMissing: true })
        }
      }

      // 旧路径打不开，但附近还有这个资源 ID 的标记时，标记指向的就是新位置。
      let markerRelinkedCount = 0
      if (markerEnabled && window.electronAPI?.findResourceMarkerLocation) {
        const markerClaims = new Map<string, Array<{ item: any, oldPath: string, newPath: string }>>()
        for (const item of items.value) {
          if (getFileExists(item)) continue
          const oldPath = getResourceFilePath(item)
          const resourceId = getResourceId(item)
          if (!oldPath || !resourceId) continue
          try {
            const found = await window.electronAPI.findResourceMarkerLocation(resourceId, oldPath)
            if (!found?.success || found.ambiguous || !found.newPath) continue
            if (isSameResourcePath(found.newPath, oldPath)) continue
            const key = found.newPath.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase()
            const owners = markerClaims.get(key) || []
            owners.push({ item, oldPath, newPath: found.newPath })
            markerClaims.set(key, owners)
          } catch (error) {
            console.warn('[GenericResourceView] 按标记查找新路径失败:', oldPath, error)
          }
        }

        for (const owners of markerClaims.values()) {
          if (owners.length !== 1) continue
          const { item, oldPath, newPath } = owners[0]
          const taken = items.value.some((other: any) => {
            if (other === item) return false
            const otherPath = getResourceFilePath(other)
            return !!otherPath && isSameResourcePath(otherPath, newPath)
          })
          if (taken) continue
          setResourceFilePath(item, oldPath, newPath)
          setFileExists(item, true)
          await attachFingerprint(item, newPath)
          await writeResourceMarkerForItem(item, newPath, { previousPath: oldPath })
          markerRelinkedCount++
          fingerprintDirty = true
          dirtyItems.add(item)
        }
      }

      // 路径打不开时，只在原来的父目录里找指纹相同的新位置。搬去别的磁盘不会在这里全盘搜索。
      const missingItems = items.value.filter((item: any) => !getFileExists(item) && readFingerprint(item) && getResourceFilePath(item))
      const pageCountOwners = new Map<number, number>()
      for (const item of missingItems) {
        const count = fingerprintPageCount(readFingerprint(item))
        if (count > 0) pageCountOwners.set(count, (pageCountOwners.get(count) || 0) + 1)
      }

      /** 新路径到认领它的旧资源。两条旧记录抢同一个新路径时不自动改。 */
      const claimed = new Map<string, Array<{ item: any, oldPath: string, newPath: string }>>()
      if (window.electronAPI?.findRelocatedResource) {
        for (const item of missingItems) {
          const oldPath = getResourceFilePath(item) || ''
          const fingerprint = readFingerprint(item)
          const pageCount = fingerprintPageCount(fingerprint)
          const allowPageCountOnly = pageCount > 0 && pageCountOwners.get(pageCount) === 1
          try {
            const found = await window.electronAPI.findRelocatedResource(oldPath, fingerprint, allowPageCountOnly)
            if (!found?.newPath || isSameResourcePath(found.newPath, oldPath)) continue
            const key = found.newPath.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase()
            const owners = claimed.get(key) || []
            owners.push({ item, oldPath, newPath: found.newPath })
            claimed.set(key, owners)
          } catch (error) {
            console.warn('[GenericResourceView] 按指纹查找新路径失败:', oldPath, error)
          }
        }
      }

      let relinkedCount = markerRelinkedCount
      for (const owners of claimed.values()) {
        if (owners.length !== 1) continue
        const { item, oldPath, newPath } = owners[0]
        const taken = items.value.some((other: any) => {
          if (other === item) return false
          const otherPath = getResourceFilePath(other)
          return !!otherPath && isSameResourcePath(otherPath, newPath)
        })
        if (taken) continue
        setResourceFilePath(item, oldPath, newPath)
        setFileExists(item, true)
        await attachFingerprint(item, newPath)
        relinkedCount++
        fingerprintDirty = true
        dirtyItems.add(item)
      }

      if (fingerprintDirty && dirtyItems.size > 0) {
        try {
          await saveResourcesDelta(Array.from(dirtyItems))
        } catch (error) {
          console.warn('[GenericResourceView] 保存资源指纹失败:', error)
        }
      }

      const stillMissing = items.value.filter((item: any) => !getFileExists(item)).length
      if (relinkedCount > 0 && stillMissing === 0) {
        notify.toast('success', '已认出原资源', `有 ${relinkedCount} 个资源只是改了名字或移动了位置，已更新路径`)
      } else if (relinkedCount > 0 && stillMissing > 0) {
        notify.toast('warning', '文件检测完成', `已更新 ${relinkedCount} 个改名或移动的资源，还有 ${stillMissing} 个文件不存在`)
      } else if (stillMissing > 0) {
        notify.toast('warning', '文件检测完成', `检测到 ${stillMissing} 个文件不存在`)
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
      } finally {
        fileExistenceCheckRunning = false
      }
    }

    /**
     * 给还没有引擎的游戏做一次自动识别，并写回 engine。
     * 已经填过的不覆盖，避免把用户手动选的引擎改掉。
     * @param resource 刚创建或已经在列表里的资源
     * @param filePath 游戏可执行文件路径
     */
    const assignDetectedGameEngine = async (resource: any, filePath: string) => {
      if (!resource?.engine || typeof resource.engine !== 'object' || !('value' in resource.engine)) return
      const current = BaseResources.extractPrimitiveValue(resource.engine.value)
      if (typeof current === 'string' && current.trim()) return
      if (!filePath || !isElectronEnvironment.value || !window.electronAPI?.listFiles) return
      try {
        const detected = await detectGameEngine(filePath)
        if (detected) {
          resource.engine.value = detected
        }
      } catch (error) {
        console.warn('[GenericResourceView] 自动识别游戏引擎失败:', filePath, error)
      }
    }

    /**
     * 补上以前拖进来、但引擎还是空的游戏。
     * 识别结果会随这次保存写进存档，不用再打开编辑去点识别。
     */
    const fillMissingGameEngines = async () => {
      const pending = items.value.filter((item: any) => {
        if (!item?.engine || typeof item.engine !== 'object' || !('value' in item.engine)) return false
        const current = BaseResources.extractPrimitiveValue(item.engine.value)
        if (typeof current === 'string' && current.trim()) return false
        const resourcePath = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        return typeof resourcePath === 'string' && resourcePath.trim() !== ''
      })
      if (pending.length === 0) return
      const changed: any[] = []
      for (const item of pending) {
        const resourcePath = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        const before = BaseResources.extractPrimitiveValue(item.engine.value)
        await assignDetectedGameEngine(item, String(resourcePath))
        const after = BaseResources.extractPrimitiveValue(item.engine.value)
        if (after && after !== before) changed.push(item)
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
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
      
      const sizesBefore = new Map<any, unknown>()
      resourcesToCalculate.forEach((item: any) => {
        sizesBefore.set(item, BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize))
      })

      const gameResources = resourcesToCalculate.filter((item: any) => pageTypeOfResource(item) === 'Game')
      const otherResources = resourcesToCalculate.filter((item: any) => pageTypeOfResource(item) !== 'Game')
      if (gameResources.length > 0) {
        await calculateResourceSizesBatch(gameResources, isElectronEnvironment.value, true)
      }
      if (otherResources.length > 0) {
        await calculateResourceSizesBatch(otherResources, isElectronEnvironment.value, false)
      }

      const changed = resourcesToCalculate.filter((item: any) => {
        const now = BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize)
        return now !== sizesBefore.get(item)
      })
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
      }
    }

    /**
     * 批量导入后在后台补文件夹大小。
     * 游戏目录可能要扫很久，不能让它挡住“导入完成”；资源先出现在列表里，大小算完再落盘。
     * @param resources 这次新导入的资源
     */
    const fillImportedResourceSizes = async (resources: any[]) => {
      const targets = resources.filter((item: any) => {
        return item.constructor?.cardDisplayConfig?.badge?.field === 'folderSize'
      })
      if (targets.length === 0) return

      const gameResources = targets.filter((item: any) => pageTypeOfResource(item) === 'Game')
      const otherResources = targets.filter((item: any) => pageTypeOfResource(item) !== 'Game')
      /** 同一批里同一个文件夹只扫一次。 */
      const folderSizeCache: FolderSizeCache = new Map()
      try {
        if (gameResources.length > 0) {
          await calculateResourceSizesBatch(gameResources, isElectronEnvironment.value, true, undefined, folderSizeCache)
        }
        if (otherResources.length > 0) {
          await calculateResourceSizesBatch(otherResources, isElectronEnvironment.value, false, undefined, folderSizeCache)
        }
        const calculated = targets.filter((item: any) => {
          const size = BaseResources.extractPrimitiveValue(item.folderSize?.value ?? item.folderSize)
          return Number(size) > 0
        })
        if (calculated.length > 0) {
          await saveResourcesDelta(calculated)
        }
      } catch (error) {
        console.warn('[GenericResourceView] 后台补文件夹大小失败:', error)
      }
    }

    /**
     * 给还没字数的小说统计字数，并写进存档。
     * 只处理卡片徽章是字数的资源。已经有字数的不重算，避免每次进页面都把整本书再读一遍。
     * txt 和 epub 在主进程里数，页面只拿回一个数字。
     */
    const calculateNovelWordCounts = async () => {
      if (!isElectronEnvironment.value || !window.electronAPI?.countNovelWords) {
        return
      }

      /** 还没有字数、并且文件格式能统计的小说 */
      const novelsToCount = items.value.filter((item: any) => {
        const cardConfig = item.constructor?.cardDisplayConfig
        if (cardConfig?.badge?.field !== 'totalWords') return false
        const totalWords = BaseResources.extractPrimitiveValue(item.totalWords?.value ?? item.totalWords)
        if (totalWords) return false
        const resourcePath = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        if (!resourcePath || typeof resourcePath !== 'string') return false
        return /\.(txt|md|text|epub)$/i.test(resourcePath)
      })

      if (novelsToCount.length === 0) {
        return
      }

      const changed: any[] = []
      for (const item of novelsToCount) {
        const resourcePath = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        try {
          const result = await window.electronAPI.countNovelWords(resourcePath)
          const wordCount = Number(result?.wordCount) || 0
          if (result?.success && wordCount > 0 && item.totalWords && typeof item.totalWords === 'object' && 'value' in item.totalWords) {
            item.totalWords.value = wordCount
            changed.push(item)
          }
        } catch (error) {
          console.warn('[GenericResourceView] 统计小说字数失败:', resourcePath, error)
        }
      }

      if (changed.length > 0) {
        await saveResourcesDelta(changed)
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

      // 只算自己带页数字段的资源，不要求整个页面都是漫画
      const resourcesToCalculate = items.value.filter((item: any) => {
        const cardConfig = item.constructor?.cardDisplayConfig ||
          (typeof item.constructor?.getCardDisplayConfig === 'function' ? item.constructor.getCardDisplayConfig() : null)
        if (cardConfig?.badge?.field !== 'pagesCount') return false
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

      const changed: any[] = []
      for (const item of resourcesToCalculate) {
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
          } else {
            item.pagesCount = count
          }
          // 页数以前不写回存档，每次进页面都要重新扫一遍文件夹
          changed.push(item)
        } catch (error) {
          console.warn('[GenericResourceView] 获取漫画页数失败:', resourcePath, error)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
      }
    }

    // 自动计算番剧/视频文件夹的视频数量（仅针对配置了 videoCount 且尚未有数据的资源；有值则不覆盖）
    const calculateAnimeVideoCounts = async () => {
      // 只算自己带视频数字段的资源
      const resourcesToCalculate = items.value.filter((item: any) => {
        const cardConfig = item.constructor?.cardDisplayConfig ||
          (typeof item.constructor?.getCardDisplayConfig === 'function' ? item.constructor.getCardDisplayConfig() : null)
        if (cardConfig?.badge?.field !== 'videoCount') return false
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

      const changed: any[] = []
      for (const item of resourcesToCalculate) {
        const resourcePath = BaseResources.extractPrimitiveValue(
          item.resourcePath?.value || item.resourcePath
        )
        if (!resourcePath || typeof resourcePath !== 'string' || !resourcePath.trim()) continue
        try {
          const folder = { ...item, folderPath: resourcePath }
          const folderVideos = await videoFolderComposable.getFolderVideos(folder)
          item.videoCount = folderVideos?.length ?? 0
          changed.push(item)
        } catch (error) {
          console.warn('[GenericResourceView] 获取番剧视频数量失败:', resourcePath, error)
          item.videoCount = 0
          changed.push(item)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
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
      const changed: any[] = []
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
            changed.push(item)
          }
        } catch (e) {
          console.warn('[GenericResourceView] 获取视频时长失败:', path, e)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
      }
    }

    /**
     * 封面换掉以后清掉旧文件。
     * 只删存档里的副本和自动截帧生成的文件，用户从别处选的封面原图不动。
     * @param previousCover 更新前用的封面路径
     * @param nextCover 更新后的封面路径，空表示用户清除了封面
     */
    const deleteReplacedCover = async (previousCover: string, nextCover: string) => {
      if (!previousCover || previousCover === nextCover) return
      if (previousCover.startsWith('data:') || previousCover.startsWith('http://') ||
          previousCover.startsWith('https://') || previousCover.startsWith('archive:')) return

      const normalized = previousCover.replace(/\\/g, '/')
      const isRelative = !/^[A-Za-z]:/.test(normalized) && !normalized.startsWith('/') && !normalized.startsWith('file://')
      if (isRelative) {
        await saveManager.deleteThumbnail(normalized)
        return
      }

      const saveDir = String(saveManager.dataDirectory || '').replace(/\\/g, '/').replace(/\/+$/, '')
      const lower = normalized.toLowerCase()
      const generatedDirs = [
        `${saveDir}/Video/Covers`,
        `${saveDir}/AnimeSeries/Covers`,
        `${saveDir}/Game/Covers`,
        `${saveDir}/Image/Covers`,
        `${saveDir}/videos/covers`,
        `${saveDir}/games/covers`,
        `${saveDir}/images/covers`
      ]
        .map(dir => dir.toLowerCase())
      for (const dir of generatedDirs) {
        if (!lower.startsWith(`${dir}/`)) continue
        // 只认自动截帧放在目录根部的 xxxcover_N.jpg。
        // 文件夹视频的封面在子目录里，还被 videoThumbnails 引用着，不能跟着删。
        const fileName = lower.slice(dir.length + 1)
        if (!fileName.includes('/') && /cover_\d+\.(jpg|jpeg|png|webp)$/.test(fileName)) {
          await saveManager.deleteThumbnail(normalized)
          return
        }
      }
    }

    /**
     * 把还放在资源原路径上的封面复制进存档目录，并改成相对路径。
     * 已经在存档里的封面不会再复制。原文件已经丢了的封面补不回来，只能继续显示默认图。
     */
    const persistCoversIntoSaveData = async () => {
      const changed: any[] = []
      for (const item of items.value) {
        const resourceId = BaseResources.extractPrimitiveValue(item.id?.value || item.id)
        const coverInfo = coverManager.extractCoverFromResource(item)
        if (!resourceId || !coverInfo || !coverManager.shouldProcessCover(coverInfo.value)) continue
        try {
          const processed = await coverManager.processCoverForResource(item, pageTypeOfResource(item), String(resourceId))
          const nextCover = coverManager.extractCoverFromResource(processed)
          if (nextCover && nextCover.value !== coverInfo.value) {
            Object.assign(item, processed)
            changed.push(item)
          }
        } catch (error) {
          console.warn('[GenericResourceView] 把封面写入存档失败:', resourceId, error)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
        console.log(`[GenericResourceView] 已将 ${changed.length} 个封面复制进存档`)
      }
    }

    /**
     * 给还没有封面的电影补一帧截图。
     * 时长可以事后读出来，封面以前没有这条补救，所以上传后卡片一直是默认图。
     * 只处理 thumbnail 为空、但视频文件还在的条目，已有封面的不动。
     */
    const refreshMissingVideoThumbnails = async () => {
      const toUpdate = items.value.filter((item: any) => {
        const thumbnail = BaseResources.extractPrimitiveValue(item.thumbnail?.value ?? item.thumbnail)
        const path = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        const hasThumbnail = typeof thumbnail === 'string' && thumbnail.trim() !== ''
        return !hasThumbnail && typeof path === 'string' && path.trim() !== ''
      })
      if (toUpdate.length === 0) return
      const changed: any[] = []
      for (const item of toUpdate) {
        const path = BaseResources.extractPrimitiveValue(item.resourcePath?.value || item.resourcePath)
        const name = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || ''
        const resourceId = BaseResources.extractPrimitiveValue(item.id?.value || item.id)
        if (!path || typeof path !== 'string' || !resourceId) continue
        try {
          const thumb = await videoThumbnailComposable.generateThumbnail(
            path,
            name,
            null,
            undefined,
            { skipPersist: true }
          )
          if (!thumb) continue
          if (item.thumbnail && typeof item.thumbnail === 'object' && 'value' in item.thumbnail) {
            item.thumbnail.value = thumb
          } else {
            item.thumbnail = thumb
          }
          // 截出来的帧先留在内存里，这里直接写入存档，只留这一张
          const processed = await coverManager.processCoverForResource(item, pageTypeOfResource(item), String(resourceId))
          if (processed) Object.assign(item, processed)
          changed.push(item)
        } catch (error) {
          console.warn('[GenericResourceView] 补电影封面失败:', path, error)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
        console.log(`[GenericResourceView] 已补上 ${changed.length} 个电影封面并保存`)
      }
    }

    /**
     * 添加或编辑电影时，选中视频文件后写入名称、时长和封面。
     * 对话框只会抛出 video-file-selected。不接这个事件的话，表单里的封面一直是空的，保存后卡片就是默认图。
     * @param _key 表单字段名，目前固定是 resourcePath
     * @param filePath 选中的视频绝对路径
     * @param formData 对话框里的表单对象，直接改它才能让预览跟着变
     */
    const handleVideoFileSelected = async (_key: string, filePath: string, formData: Record<string, any>) => {
      if (!filePath || !formData) return
      if (!formData.name || !String(formData.name).trim()) {
        formData.name = extractNameFromPath(filePath)
      }
      try {
        const duration = await getVideoDuration(filePath)
        if (duration > 0) {
          formData.duration = duration
        }
      } catch (error) {
        console.warn('[GenericResourceView] 获取视频时长失败:', error)
      }
      const currentThumbnail = typeof formData.thumbnail === 'string' ? formData.thumbnail.trim() : ''
      if (!currentThumbnail) {
        try {
          const thumb = await videoThumbnailComposable.generateThumbnail(
            filePath,
            formData.name || '',
            null,
            undefined,
            { skipPersist: true }
          )
          if (thumb) {
            formData.thumbnail = thumb
          }
        } catch (error) {
          console.warn('[GenericResourceView] 生成视频封面失败:', error)
        }
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
      const changed: any[] = []
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
            changed.push(item)
          }
        } catch (e) {
          console.warn('[GenericResourceView] 获取音频时长失败:', path, e)
        }
      }
      if (changed.length > 0) {
        await saveResourcesDelta(changed)
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
    let offTagsRebuiltHandler: (() => void) | null = null
    onMounted(async () => {
      // 1. 加载页面数据（仅从数据库读取）
      const pageId = pageConfig.value?.id
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
              converted.push(instantiateSavedResource(loadedData[i]))
            } catch (e) {
              console.error(`[GenericResourceView] fromJSON 第 ${i} 条失败:`, loadedData[i], e)
              throw e
            }
            // 几千条时一次还原完会把界面冻住，隔一段让浏览器喘口气
            if (i > 0 && i % 100 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0))
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
      
      // 3. 加载分页设置
      console.log('[GenericResourceView] 准备加载分页设置', {
        pageId,
        resourceType: resourceType.value,
        currentPageSize: resourcePage.pageSize,
        totalPages: resourcePage.totalPages
      })
      await resourcePage.loadPaginationSettings(pageId)
      console.log('[GenericResourceView] 分页设置加载完成', {
        pageId,
        resourceType: resourceType.value,
        updatedPageSize: resourcePage.pageSize,
        totalPages: resourcePage.totalPages,
        currentPage: resourcePage.currentPage
      })

      // 排序和分页一样按页面记在设置里。以前只在切换排序时写入，进来时没有读，所以每次都回到按名称升序。
      await resourcePage.loadSortSetting(pageId)
      
      // 4. 注册事件监听器
      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.onGameProcessEnded) {
        window.electronAPI.onGameProcessEnded((event: any, data: any) => {
          handleGameProcessEnded(data)
        })
      }

      // 标签管理页执行重命名/合并/删除后，主进程广播 tags:rebuilt，
      // 本页若包含对应资源类型，则重新拉取数据，保证卡片标签与数据库一致
      if (window.electronAPI?.onTagsRebuilt) {
        offTagsRebuiltHandler = window.electronAPI.onTagsRebuilt(async (data: any) => {
          const types: string[] = data?.resourceTypes || []
          // 页面 pageConfig.type 为 PascalCase（如 Anime/Image），需归一化为主进程逻辑类型
          const rawType = String(resourceType.value || '')
          const currentLogicalType = rawType === 'Anime'
            ? 'videoFolder'
            : rawType === 'Image'
              ? 'manga'
              : rawType.charAt(0).toLowerCase() + rawType.slice(1)
          if (types.length > 0 && !types.includes(currentLogicalType)) {
            return
          }
          try {
            const result = await window.electronAPI.sqliteGetPageData(pageId)
            if (!result?.ok) return
            const loadedData = result.data || []
            if (ResourceClass && ResourceClass.fromJSON) {
              items.value = loadedData.map((d: any) => instantiateSavedResource(d))
            } else {
              items.value = loadedData
            }
            if (filterComposable.extractAllFilters) {
              filterComposable.extractAllFilters()
            }
          } catch (e) {
            console.error('[GenericResourceView] 标签变更后重载页面数据失败:', e)
          }
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
        const runningIds = gameRunningStore.runningGameIds
        if (runningIds && runningIds.length > 0) {
          runningIds.forEach((resourceId: string) => {
            const event = new CustomEvent('game-request-update-playtime', {
              detail: { gameId: resourceId }
            })
            window.dispatchEvent(event)
          })
        }
      }, 1000) // 每1秒更新一次。只有自己会启动的资源才会被登记进来
      
      // 文件是否存在、封面和大小都在下面的列表长度监听里做。
      // 加载完成时会给 items 赋值，长度从 0 变成实际数量，那一次就会检查。这里再查就会弹两次。
    })
    
    // 组件卸载前清理事件监听器
    onBeforeUnmount(() => {
      // 离开页面前把攒下的访问记录写完
      flushScheduledResourceSaves().catch(error => {
        console.warn('[GenericResourceView] 离开页面前保存资源失败:', error)
      })
      window.removeEventListener('game-request-update-playtime', handleRequestUpdatePlaytime as EventListener)
      window.removeEventListener('game-request-final-playtime', handleRequestFinalPlaytime as EventListener)
      // 清理定时器
      if (playtimeUpdateTimer) {
        clearInterval(playtimeUpdateTimer)
        playtimeUpdateTimer = null
      }
      if (maintenanceTimer) {
        clearTimeout(maintenanceTimer)
        maintenanceTimer = null
      }
      // 游戏页：移除全局截图监听
      if (isElectronEnvironment.value && window.electronAPI?.removeGlobalScreenshotListener) {
        window.electronAPI.removeGlobalScreenshotListener()
      } else if (isElectronEnvironment.value && window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('global-screenshot-trigger')
      }
      // 移除标签重建广播监听
      if (offTagsRebuiltHandler) {
        offTagsRebuiltHandler()
        offTagsRebuiltHandler = null
      }
    })


    /**
     * 进页面后要补的维护任务：封面入库、文件存在性、页数、时长。
     * 这些都会碰磁盘和数据库，不能压在首屏渲染上，统一延后合并跑一次。
     */
    let maintenanceTimer: ReturnType<typeof setTimeout> | null = null
    let maintenanceRunning = false
    let maintenancePending = false

    const runMaintenance = async () => {
      if (maintenanceRunning) {
        maintenancePending = true
        return
      }
      maintenanceRunning = true
      try {
        await persistCoversIntoSaveData()
        await checkFileExistence()
        await calculateResourceSizes()
        await fillMissingGameEngines()
        await calculateMangaPagesCounts()
        await calculateAnimeVideoCounts()
        await calculateNovelWordCounts()
        if (items.value.some((item: any) => item?.constructor?.name === 'Video')) {
          await refreshUnknownVideoDurations()
          await refreshMissingVideoThumbnails()
        }
        await refreshMissingFolderVideoCovers()
        if (items.value.some((item: any) => item?.constructor?.name === 'Audio')) {
          await refreshUnknownAudioDurations()
        }
      } catch (error) {
        console.warn('[GenericResourceView] 后台维护任务失败:', error)
      } finally {
        maintenanceRunning = false
        if (maintenancePending) {
          maintenancePending = false
          scheduleMaintenance()
        }
      }
    }

    const scheduleMaintenance = (delay = 1200) => {
      if (maintenanceTimer) clearTimeout(maintenanceTimer)
      maintenanceTimer = setTimeout(() => {
        maintenanceTimer = null
        runMaintenance()
      }, delay)
    }

    // 监听 items 变化，当数据更新时自动检查文件存在性和计算大小
    watch(
      () => items.value.length,
      (newLength, oldLength) => {
        // 只在数据从空变为有数据，或者数据数量变化时检查
        if (newLength > 0 && (oldLength === 0 || newLength !== oldLength)) {
          // 等首屏画完再开始，几千条资源的扫描不会卡住打开页面
          scheduleMaintenance()
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

    /**
     * 截图文件夹里的图按横图排。资源自己文件夹里的漫画页仍按竖图排。
     */
    const previewThumbnailShape = computed(() => {
      const selectedItem = resourcePage.selectedItem.value
      const area = selectedItem?.constructor?.detailPanelConfig?.previewArea
      return area === 'useScreenshotFolder' ? 'landscape' : 'portrait'
    })

    /**
     * 这条是不是视频文件夹。
     * 看存档里的类型，不看类名。打包后类名会被改掉，用类名判断会把刚拖进来的文件夹也当成没有视频。
     * @param item 当前资源
     */
    const isVideoFolderResource = (item: any) => {
      const saved = String(BaseResources.extractPrimitiveValue(item?.resourceType) || '').trim().toLowerCase()
      if (saved === 'animation' || saved === 'videofolder' || saved === 'video-folder' || saved === 'anime') return true
      return item?.constructor?.cardDisplayConfig?.badge?.field === 'videoCount'
    }
    /**
     * 视频文件夹的目录。
     * 新记录写在 resourcePath。旧记录可能还在 folderPath 上，两条都要认。
     * @param item 当前资源
     */
    const videoFolderPathOf = (item: any) => {
      const candidates = [
        item?.resourcePath,
        item?.folderPath,
        item?.retainedFields?.resourcePath,
        item?.retainedFields?.folderPath
      ]
      for (const candidate of candidates) {
        const value = BaseResources.extractPrimitiveValue(candidate)
        if (typeof value === 'string' && value.trim()) return value.trim()
      }
      return ''
    }

    /**
     * 读出这条视频文件夹已经记住的封面。
     * 没有记过就返回空表。返回的是副本，改它不会碰到别的文件夹。
     * @param item 视频文件夹
     */
    const readVideoThumbnailMap = (item: any): Record<string, string> => {
      const raw = BaseResources.extractPrimitiveValue(item?.videoThumbnails)
      /** 路径到封面的对照。键一律用正斜杠。 */
      const map: Record<string, string> = {}
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return map
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value !== 'string' || !value.trim()) continue
        map[String(key).replace(/\\/g, '/')] = value
      }
      return map
    }

    /**
     * 把封面对照表写回这条资源。
     * 类字段写 value，旧数据如果只是普通对象就直接换掉。
     * @param item 视频文件夹
     * @param map 路径到封面的对照
     */
    const writeVideoThumbnailMap = (item: any, map: Record<string, string>) => {
      if (!item) return
      /** 交给存档的普通对象，避免和界面上的响应式对象是同一份。 */
      const plain = { ...map }
      const field = item.videoThumbnails
      if (field && typeof field === 'object' && 'value' in field) {
        field.value = plain
      } else {
        item.videoThumbnails = plain
      }
    }

    /**
     * 文件夹自己还没有封面时，用里面第一集的截图。
     * 已经选过封面的不动。
     * @param item 视频文件夹
     * @param thumb 第一张可用的封面路径
     */
    const assignFolderThumbnailIfEmpty = (item: any, thumb: string) => {
      if (!item || !thumb) return
      const current = BaseResources.extractPrimitiveValue(item.thumbnail)
      if (typeof current === 'string' && current.trim()) return
      if (item.thumbnail && typeof item.thumbnail === 'object' && 'value' in item.thumbnail) {
        item.thumbnail.value = thumb
      } else {
        item.thumbnail = thumb
      }
    }

    /**
     * 把记住的封面贴到刚扫出来的视频上。
     * 扫描本身不带封面，只按路径对上之前截好的那一帧。
     * @param videos 这次扫到的视频
     * @param map 路径到封面的对照
     */
    const applyVideoThumbnailMap = (videos: Array<{ path?: string, thumbnail?: string | null }>, map: Record<string, string>) => {
      for (const video of videos) {
        const key = String(video.path || '').replace(/\\/g, '/')
        const saved = map[key]
        if (saved) video.thumbnail = saved
      }
    }

    /**
     * 给文件夹里还没有封面的视频各截一帧。
     * 一次只处理一个视频，避免几十集同时解码。已经有封面的跳过。
     * @param folderPath 视频文件夹路径
     * @param folderName 文件夹名称，用来给封面文件起名
     * @param existing 已经记住的封面
     */
    const fillFolderVideoCovers = async (
      folderPath: string,
      folderName: string,
      existing: Record<string, string>
    ): Promise<{ map: Record<string, string>, firstThumb: string, addedCount: number }> => {
      const videos = await videoFolderComposable.getFolderVideos({ folderPath } as any)
      /** 补完之后的封面对照。先抄一份已有的，再往里加新截到的。 */
      const map = { ...existing }
      /** 第一张能用的封面，留给文件夹卡片。 */
      let firstThumb = ''
      /** 这次新截到的数量。为 0 时不用再保存。 */
      let addedCount = 0
      const cleanFolderName = String(folderName || '未知').replace(/[^\w\u4e00-\u9fa5\-_]/g, '_') || 'folder'
      for (const video of videos) {
        const key = String(video.path || '').replace(/\\/g, '/')
        if (!key) continue
        if (map[key]) {
          if (!firstThumb) firstThumb = map[key]
          continue
        }
        const videoFileName = key.split('/').pop() || ''
        const nameWithoutExt = videoFileName.replace(/\.[^/.]+$/, '')
        const cleanVideoName = nameWithoutExt.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_') || 'video'
        const maxNumber = await videoThumbnailComposable.getMaxFolderVideoThumbnailNumber(cleanFolderName, cleanVideoName)
        const thumbnailFilename = `${cleanFolderName}/${cleanVideoName}_cover_${maxNumber + 1}.jpg`
        const thumb = await videoThumbnailComposable.generateThumbnailForFolderVideo(video.path, thumbnailFilename)
        if (!thumb) continue
        map[key] = thumb
        addedCount++
        if (!firstThumb) firstThumb = thumb
      }
      return { map, firstThumb, addedCount }
    }

    /**
     * 正在给文件夹补封面。避免进入页面和列表变化各跑一遍，同一批视频被截两次。
     */
    let folderCoverFillRunning = false

    /**
     * 给还没有封面的视频文件夹补截图。
     * 只补缺的那几集。已经拖进来、当时没截到封面的文件夹，下次进页面也会补上。
     */
    const refreshMissingFolderVideoCovers = async () => {
      if (folderCoverFillRunning) return
      const folders = items.value.filter((item: any) => isVideoFolderResource(item))
      if (folders.length === 0) return
      folderCoverFillRunning = true
      /** 这次补过封面的文件夹，最后只保存这几条。 */
      const changed: any[] = []
      try {
        for (const item of folders) {
          const folderPath = videoFolderPathOf(item)
          if (!folderPath) continue
          const folderName = BaseResources.extractPrimitiveValue(item.name?.value || item.name) || '未知'
          const filled = await fillFolderVideoCovers(folderPath, String(folderName), readVideoThumbnailMap(item))
          if (filled.addedCount === 0) continue
          writeVideoThumbnailMap(item, filled.map)
          assignFolderThumbnailIfEmpty(item, filled.firstThumb)
          const selected = resourcePage.selectedItem.value
          const selectedId = BaseResources.extractPrimitiveValue(selected?.id)
          const itemId = BaseResources.extractPrimitiveValue(item.id)
          if (selected && selectedId && itemId && String(selectedId) === String(itemId)) {
            applyVideoThumbnailMap(detailFolderVideos.value, filled.map)
          }
          changed.push(item)
        }
        if (changed.length > 0) {
          await saveResourcesDelta(changed)
          console.log(`[GenericResourceView] 已为 ${changed.length} 个视频文件夹补上封面`)
        }
      } catch (error) {
        console.warn('[GenericResourceView] 补视频文件夹封面失败:', error)
      } finally {
        folderCoverFillRunning = false
      }
    }
    /**
     * 详情下面要不要画出视频列表。
     * 扫完才显示。空列表也显示，用来说明这个文件夹里没有认出来的视频。
     */
    const isAnimeWithFolderVideos = computed(() => {
      return detailFolderVideosReady.value && isVideoFolderResource(resourcePage.selectedItem.value)
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
        const series = resourcePage.selectedItem.value
        if (series && isVideoFolderResource(series)) {
          const currentCount = Number(BaseResources.extractPrimitiveValue(series.playCount?.value ?? series.playCount) || 0)
          if (series.playCount && typeof series.playCount === 'object' && 'value' in series.playCount) {
            series.playCount.value = currentCount + 1
          }
          const original = items.value.find((item: any) => collectionResourceId(item) === collectionResourceId(series))
          if (original && original !== series && original.playCount && typeof original.playCount === 'object') {
            original.playCount.value = currentCount + 1
          }
          try {
            await saveResourcesDelta(original || series)
          } catch (error) {
            console.warn('[GenericResourceView] 保存番剧播放次数失败:', error)
          }
        }
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
        const thumbnailPath = await videoThumbnailComposable.generateThumbnailForFolderVideo(video.path, thumbnailFilename)
        if (thumbnailPath) {
          // 新图生成成功后再删旧图，生成失败时原来的封面还能用
          if (video.thumbnail?.trim() && video.thumbnail !== thumbnailPath) {
            await videoThumbnailComposable.deleteOldThumbnail(video.thumbnail)
          }
          video.thumbnail = thumbnailPath
          const videoInList = selectedItem.folderVideos?.[index]
          if (videoInList) videoInList.thumbnail = thumbnailPath
          const coverKey = String(video.path || '').replace(/\\/g, '/')
          const coverMap = readVideoThumbnailMap(selectedItem)
          coverMap[coverKey] = thumbnailPath
          writeVideoThumbnailMap(selectedItem, coverMap)
          const originalItem = items.value.find((i: any) => (i.id?.value || i.id) === (selectedItem.id?.value || selectedItem.id))
          if (originalItem?.folderVideos?.[index]) {
            originalItem.folderVideos[index].thumbnail = thumbnailPath
          }
          if (originalItem && originalItem !== selectedItem) {
            writeVideoThumbnailMap(originalItem, coverMap)
          }
          try {
            await saveResourcesDelta(originalItem || selectedItem)
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

    const handleRandomizeThumbnail = async (key: string, formData: any, updateThumbnail: (path: string) => void) => {
      try {
        const filePath = formData?.resourcePath
        if (!filePath) {
          notify.toast('warning', '提示', '请先选择视频文件')
          return
        }
        
        const videoName = formData?.name || ''
        const currentThumbnail = formData?.thumbnail || ''
        
        console.log('=== 开始生成随机封面 ===')
        console.log('视频文件路径:', filePath)
        console.log('视频名称:', videoName)
        console.log('当前缩略图:', currentThumbnail)
        
        const thumb = await videoThumbnailComposable.generateThumbnail(
          filePath,
          videoName,
          null,
          undefined,
          { skipPersist: true }
        )
        console.log('随机封面生成结果:', thumb)
        
        if (thumb) {
          console.log('缩略图生成成功，路径:', thumb)
          if (updateThumbnail) {
            updateThumbnail(thumb)
          }
        } else {
          console.log('缩略图生成失败')
          notify.toast('warning', '提示', '生成缩略图失败')
        }
      } catch (error: any) {
        console.error('生成随机缩略图失败:', error)
        notify.toast('error', '错误', `生成缩略图失败: ${error.message || '未知错误'}`)
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

          // 视频文件夹才扫下面的列表。页面类型不要求正好叫 Anime，刚拖进来的也走这里。
          if (isVideoFolderResource(selectedItem)) {
            const folderPath = videoFolderPathOf(selectedItem)
            detailFolderVideosReady.value = false
            detailFolderVideos.value = []
            if (!folderPath) {
              detailFolderVideosReady.value = true
            } else {
              try {
                const folder = { folderPath }
                const folderVideos = await videoFolderComposable.getFolderVideos(folder)
                if (resourcePage.selectedItem.value !== selectedItem) return
                applyVideoThumbnailMap(folderVideos, readVideoThumbnailMap(selectedItem))
                detailFolderVideos.value = folderVideos
                selectedItem.folderVideos = folderVideos
                selectedItem.videoCount = folderVideos.length
                const originalItem = items.value.find((i: any) => (i.id?.value || i.id) === (selectedItem.id?.value || selectedItem.id))
                if (originalItem && originalItem !== selectedItem) {
                  originalItem.folderVideos = folderVideos
                  originalItem.videoCount = folderVideos.length
                }
              } catch (error) {
                console.error('[GenericResourceView] 加载番剧视频列表失败:', error)
                if (resourcePage.selectedItem.value !== selectedItem) return
                detailFolderVideos.value = []
                selectedItem.folderVideos = []
              } finally {
                if (resourcePage.selectedItem.value === selectedItem) {
                  detailFolderVideosReady.value = true
                }
              }
            }
          } else {
            detailFolderVideos.value = []
            detailFolderVideosReady.value = false
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
              
              const previousPagesCount = BaseResources.extractPrimitiveValue(selectedItem.pagesCount?.value ?? selectedItem.pagesCount)
              if (selectedItem.pagesCount && typeof selectedItem.pagesCount === 'object' && 'value' in selectedItem.pagesCount) {
                selectedItem.pagesCount.value = files.length
              } else {
                selectedItem.pagesCount = files.length
              }
              if (previousPagesCount !== files.length) {
                scheduleResourceSave(selectedItem)
              }
            } catch (error) {
              console.error('[GenericResourceView] 加载图片列表失败:', error)
            }
          }
        } else if (!showDetail) {
          // 关闭详情时清空图片列表和视频列表
          detailPages.value = []
          detailFolderVideos.value = []
          detailFolderVideosReady.value = false
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
            // 访问记录不急着落盘，攒一下再写；打开一张图不该重写整页
            scheduleResourceSave(item)
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
    const displayLayoutConfig = pageConfig.value?.displayLayoutConfig || { minWidth: 200, maxWidth: 400 }

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
      if (item.action === 'showAddDialog') {
        resourcePage.showAddDialogHandler()
      } else if (item.action === 'showCreateCollectionDialog') {
        openCreateCollectionDialog()
      } else if (item.action === 'leaveCollection') {
        leaveCollection()
      } else if (item.action === 'showMemberPicker') {
        openMemberPicker()
      } else if (item.action === 'filterBySearch') {
        // 搜索操作不需要额外处理，搜索框已经绑定了 searchQuery
      } else if (item.action === 'showBatchImportDialog') {
        // 先打开窗口。深度、排除名单和路径都在窗口里设，搜完的结果也留在同一个窗口。
        batchImportFiles.value = []
        batchImportFolderPath.value = ''
        batchImportMode.value = 'file'
        batchImportKindByPath.value = {}
        batchImportSearching.value = false
        showBatchImportDialog.value = true
      } else if (item.action === 'showBookmarkImportDialog') {
        showBookmarkImportDialog.value = true
      }
    }

    /**
     * 按窗口里的深度、排除名单和文件类型搜索当前页面接受的文件。
     * 扩展名默认来自这一页勾选的资源类型，窗口里可以再收窄。
     * @param options 路径、层数、排除片段、要搜的扩展名，以及本层找到后是否继续往下
     */
    const runBatchImportSearch = async (options: {
      folderPath: string
      maxDepth: number | null
      excludePatterns: string[]
      extensions: string[]
      stopAtFirstMatch?: boolean
      mode?: 'file' | 'folder'
      folderGroups?: { id: string; extensions: string[] }[]
    }) => {
      if (!isElectronEnvironment.value || !window.electronAPI?.searchMatchingFiles) {
        notify.toast('error', '操作失败', '当前环境不支持此功能')
        return
      }
      /** 文件夹模式只收目录。文件模式仍按扩展名搜单个文件。 */
      const searchingFolders = options.mode === 'folder'
      batchImportMode.value = searchingFolders ? 'folder' : 'file'
      batchImportSearching.value = true
      try {
        const searchExtensions = searchingFolders
          ? []
          : (options.extensions?.length > 0
            ? options.extensions
            : extensionsForSearch(acceptedKindIds.value))
        const searchResult = await window.electronAPI.searchMatchingFiles(options.folderPath, searchExtensions, {
          maxDepth: options.maxDepth,
          excludePatterns: options.excludePatterns,
          // 文件模式默认「本层找到就不再往下」。文件夹模式由主进程固定成：有内容就收当前层。
          stopAtFirstMatch: searchingFolders ? true : options.stopAtFirstMatch !== false,
          mode: searchingFolders ? 'folders' : 'files',
          folderGroups: searchingFolders ? options.folderGroups : []
        })
        if (!searchResult.success) {
          notify.toast('error', searchingFolders ? '搜索文件夹失败' : '搜索文件失败', searchResult.error || '未知错误')
          batchImportFiles.value = []
          batchImportFolderPath.value = ''
          batchImportKindByPath.value = {}
          return
        }
        batchImportFiles.value = searchResult.files || []
        batchImportKindByPath.value = searchResult.kinds || {}
        batchImportFolderPath.value = options.folderPath
      } catch (error: any) {
        console.error('[GenericResourceView] 批量导入搜索失败:', error)
        notify.toast('error', '操作失败', error.message || '未知错误')
      } finally {
        batchImportSearching.value = false
      }
    }

    // 关闭批量导入对话框
    const closeBatchImportDialog = () => {
      showBatchImportDialog.value = false
      batchImportFiles.value = []
      batchImportFolderPath.value = ''
      batchImportMode.value = 'file'
      batchImportKindByPath.value = {}
      batchImportSearching.value = false
      batchImportImporting.value = false
      batchImportProgress.value = { current: 0, total: 0 }
    }

    // 关闭书签导入对话框
    const closeBookmarkImportDialog = () => {
      showBookmarkImportDialog.value = false
    }

    // 处理批量导入确认
    const handleBatchImportConfirm = async (selectedFiles: string[], folderPath: string) => {
      // 写入过程中窗口还开着，防住重复确认，否则同一批会进两次。
      if (batchImportImporting.value) return
      if (selectedFiles.length === 0) {
        notify.toast('warning', '提示', batchImportMode.value === 'folder' ? '请至少选择一个文件夹' : '请至少选择一个文件')
        return
      }
      /** 这次确认的是文件夹搜索结果。路径指向目录，类型来自搜索时记下的对照。 */
      const importingFolders = batchImportMode.value === 'folder'

      batchImportImporting.value = true
      batchImportProgress.value = { current: 0, total: selectedFiles.length }

      try {
        let addedCount = 0
        let linkedCount = 0
        let relocatedCount = 0
        let failedCount = 0
        let duplicateCount = 0
        let ambiguousCount = 0
        const claimedResourceIds = new Set<string>()
        const markerLookupCache = new Map<string, { resource: any; tableName: string } | null>()
        /** 这次真正新建的资源。文件夹大小等收窗以后在后台补。 */
        const addedResources: any[] = []
        const sameResourceRule = await loadSameResourceRule()

        for (let index = 0; index < selectedFiles.length; index++) {
          const relativeFilePath = selectedFiles[index]
          // 先把这一条摆到进度上，后面每一步都会让窗口有反应。
          batchImportProgress.value = {
            current: index + 1,
            total: selectedFiles.length,
            file: relativeFilePath
          }
          // 根目录被收成一条资源时相对路径是点号，完整路径就是搜索根目录本身。
          const isSearchRoot = importingFolders && (relativeFilePath === '.' || relativeFilePath === '')
          const fullFilePath = isSearchRoot
            ? folderPath
            : folderPath + (folderPath.endsWith('\\') || folderPath.endsWith('/') ? '' : '/') + relativeFilePath
          const fileName = isSearchRoot
            ? (folderPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || '')
            : (relativeFilePath.split(/[\\/]/).pop() || '')

          // 获取文件扩展名。文件夹导入不靠扩展名判断类型。
          const lowerFileName = fileName.toLowerCase()
          const fileExt = lowerFileName.includes('.') 
            ? '.' + lowerFileName.split('.').pop() 
            : ''

          /** 文件夹结果用搜索时记下的类型；文件结果仍按扩展名匹配当前页面。 */
          const folderKindId = importingFolders ? batchImportKindByPath.value[relativeFilePath] : ''
          const matchedKind = importingFolders
            ? findBasicKind(folderKindId)
            : matchAcceptedKind(fileExt, false, acceptedKindIds.value)
          const MatchedResourceClass = importingFolders
            ? (folderKindId ? classForKind(folderKindId, legacyResourceTypes.value) : null)
            : (matchedKind ? classForKind(matchedKind.id, legacyResourceTypes.value) : null)

          if (!matchedKind || !MatchedResourceClass) {
            failedCount++
            continue
          }

          if (pageAlreadyHas(fullFilePath)) {
            duplicateCount++
            continue
          }

          const linked = await attachExistingResource(fullFilePath)
          if (linked) {
            await writeResourceMarkerForItem(linked, fullFilePath, { onlyIfMissing: true })
            addedCount++
            linkedCount++
            continue
          }

          const incomingSavedType = savedTypeOfClass(MatchedResourceClass).toLowerCase()

          let adoptedResourceId = ''
          const markerMatch = await findMarkerImportMatch(fullFilePath, incomingSavedType, markerLookupCache)
          if (markerMatch.action === 'duplicate') {
            duplicateCount++
            continue
          }
          if (markerMatch.action === 'ambiguous') {
            ambiguousCount++
            continue
          }
          if (markerMatch.action === 'adopt') {
            if (claimedResourceIds.has(markerMatch.resourceId)) {
              duplicateCount++
              continue
            }
            adoptedResourceId = markerMatch.resourceId
          }
          if (markerMatch.action === 'relocate') {
            if (claimedResourceIds.has(markerMatch.resourceId)) {
              duplicateCount++
              continue
            }
            const existingItem = attachSavedResource(markerMatch.saved)
            if (await relocateImportedItem(existingItem, fullFilePath, claimedResourceIds)) {
              relocatedCount++
            } else {
              duplicateCount++
            }
            continue
          }

          const sameMatch = await findSameResourceForImport(
            fullFilePath,
            incomingSavedType,
            sameResourceRule,
            fingerprintKindForResource(incomingSavedType)
          )
          if (sameMatch.action === 'duplicate') {
            duplicateCount++
            continue
          }
          if (sameMatch.action === 'ambiguous') {
            notifySameResourceAmbiguous(sameMatch.items.length)
            ambiguousCount++
            continue
          }
          if (sameMatch.action === 'relocate') {
            if (await relocateImportedItem(sameMatch.item, fullFilePath, claimedResourceIds)) {
              relocatedCount++
            } else {
              duplicateCount++
            }
            continue
          }

          const relocatedItem = await findMissingResourceByFingerprint(fullFilePath, sameMatch.incoming.fingerprint)
          if (relocatedItem) {
            if (await relocateImportedItem(relocatedItem, fullFilePath, claimedResourceIds)) {
              relocatedCount++
            } else {
              duplicateCount++
            }
            continue
          }

          // 创建资源数据
          const resourceData: any = {
            id: adoptedResourceId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            resourceType: savedTypeOfClass(MatchedResourceClass),
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

          // 使用匹配到的资源类创建实例
          const resource = MatchedResourceClass.fromJSON(resourceData)

          // 批量导入和拖入一样，当时就识别引擎并保存。
          await assignDetectedGameEngine(resource, fullFilePath)

          await attachFingerprint(resource, fullFilePath, sameMatch.incoming.fingerprint)
          await writeResourceMarkerForItem(resource, fullFilePath)

          // 添加到列表
          items.value.push(resource)
          rememberInCurrentCollection(resource)
          addedResources.push(resource)
          if (adoptedResourceId) claimedResourceIds.add(adoptedResourceId)
          addedCount++
        }

        // 保存数据
        if (addedCount > 0 || relocatedCount > 0) {
          await saveData()
        }

        // 文件夹大小要扫整个目录，放后台算，别让人对着进度条等。
        if (addedResources.length > 0) {
          void fillImportedResourceSizes(addedResources)
        }

        // 显示通知
        if (addedCount > 0 || relocatedCount > 0 || failedCount > 0 || duplicateCount > 0 || ambiguousCount > 0) {
          const parts = [
            addedCount > 0 ? `成功导入 ${addedCount} 个资源` : '',
            linkedCount > 0 ? `其中 ${linkedCount} 个接上了已有记录` : '',
            relocatedCount > 0 ? `更新 ${relocatedCount} 条资源路径` : '',
            duplicateCount > 0 ? `${duplicateCount} 个已存在` : '',
            ambiguousCount > 0 ? `${ambiguousCount} 个无法唯一确定` : '',
            failedCount > 0 ? `${failedCount} 个失败` : ''
          ].filter(Boolean)
          notify.toast(
            addedCount > 0 || relocatedCount > 0 ? 'success' : 'warning',
            addedCount > 0 || relocatedCount > 0 ? '导入完成' : '导入结果',
            parts.join('，')
          )
        }
      } catch (error: any) {
        console.error('[GenericResourceView] 批量导入确认失败:', error)
        notify.toast('error', '导入失败', error.message || '未知错误')
      } finally {
        // 不管成功还是失败都收窗，免得一直停在“正在导入”。
        closeBatchImportDialog()
      }
    }

    // 处理书签导入确认
    const handleBookmarkImportConfirm = async (bookmarks: any[]) => {
      if (bookmarks.length === 0) {
        notify.toast('warning', '提示', '请至少选择一个书签')
        return
      }

      try {
        let addedCount = 0
        let failedCount = 0

        for (const bookmark of bookmarks) {
          // 创建网站资源数据
          const resourceData: any = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            resourceType: 'website',
            name: bookmark.name || '未命名网站',
            description: '',
            resourcePath: bookmark.url,
            tags: bookmark.tags || [],
            visitedSessions: [],
            addedDate: new Date().toISOString()
          }

          // 使用 Website 类创建实例
          const resource = Website.fromJSON(resourceData)
          
          // 检查是否已存在相同URL
          const existingItem = items.value.find((item: any) => {
            const itemUrl = BaseResources.extractPrimitiveValue(
              item.resourcePath?.value || item.resourcePath
            )
            return itemUrl === bookmark.url
          })

          if (existingItem) {
            failedCount++
            continue
          }

          // 添加到列表
          items.value.push(resource)
          rememberInCurrentCollection(resource)
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
              ? `成功导入 ${addedCount} 个书签${failedCount > 0 ? `，${failedCount} 个失败` : ''}`
              : `没有书签被导入（${failedCount} 个失败）`
          )
        }

        // 关闭对话框
        closeBookmarkImportDialog()
      } catch (error) {
        console.error('[GenericResourceView] 书签导入确认失败:', error)
        notify.toast('error', '导入失败', (error as any).message || '未知错误')
      }
    }

    /**
     * 把一批资源加进当前选择。
     * 换成新的 Set 再赋回去，批量勾选时卡片和已选数量会一起更新。
     * 已经选中的会留着，所以先勾这一页，再翻页勾另一页，两页都会留在选择里。
     * @param list 要勾选的资源
     */
    const addItemsToSelection = (list: any[]) => {
      const next = new Set(selectedItems.value)
      for (const item of list || []) {
        const itemId = item?.id?.value || item?.id
        if (itemId) next.add(itemId)
      }
      selectedItems.value = next
    }

    /**
     * 勾选当前这一页正在显示的资源。
     * 分页之后屏幕上只有这一页，所以范围是当前页，不是整个筛选结果。
     */
    const selectCurrentPage = () => {
      addItemsToSelection(resourcePage.paginatedItems?.value || [])
    }

    /**
     * 勾选当前筛选和搜索之后的全部资源，包含其他页。
     * 用筛选结果而不是库里的全部，避免把搜索藏起来的资源也选进批量删除。
     */
    const selectAllListed = () => {
      addItemsToSelection(listedItems.value || [])
    }

    return {
      resourceType, // 返回 computed，保持响应式
      isElectronEnvironment,
      // 多选模式相关
      isMultiSelectMode,
      selectedItems,
      toggleMultiSelectMode,
      selectCurrentPage,
      selectAllListed,
      isItemSelected,
      toggleSelectItem,
      // 批量导入对话框相关
      showBatchImportDialog,
      batchImportSearchExtensions,
      batchImportFolderOptions,
      batchImportFiles,
      batchImportFolderPath,
      batchImportSearching,
      batchImportImporting,
      batchImportProgress,
      batchImportDialogRef,
      closeBatchImportDialog,
      runBatchImportSearch,
      handleBatchImportConfirm,
      // 书签导入对话框相关
      showBookmarkImportDialog,
      bookmarkImportDialogRef,
      closeBookmarkImportDialog,
      handleBookmarkImportConfirm,
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
      previewThumbnailShape,
      // 番剧详情页视频列表（用于替换视频页）
      isAnimeWithFolderVideos,
      detailFolderVideos,
      playFolderVideo,
      getThumbnailUrlForFolderVideo,
      handleFolderVideoThumbnailError,
      generateFolderVideoThumbnail,
      handleRandomizeThumbnail,
      handleVideoFileSelected,
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
      contextMenuTarget,
      addResourceClass,
      editResourceClass,
      acceptedTypeChoices,
      addingPageType,
      pageFieldKeys,
      pageFieldDefs,
      cardTypeForResource,
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
      filteredItems: listedItems,
      paginatedItems: resourcePage.paginatedItems,
      toolbarConfig: collectionToolbar,
      emptyStateConfig: collectionEmptyState,
      currentCollectionId,
      currentCollectionName,
      pageTitle,
      membershipNote,
      collectionCover,
      openListedItem,
      leaveCollection,
      showCreateCollectionDialog,
      newCollectionName,
      closeCreateCollectionDialog,
      confirmCreateCollection,
      showMemberPicker,
      memberPickerQuery,
      memberPickerCandidates,
      memberPickerSelected,
      closeMemberPicker,
      toggleMemberPicker,
      confirmAddMembers,
      showCollectionPicker,
      collectionChoices,
      closeCollectionPicker,
      confirmAddSelectionToCollection,
      editEnabledFieldKeys,
      // 编辑对话框相关
      ResourceClass,
      allTags,
      availableTagsByField,
      // 编辑对话框状态和方法（从 resourcePage 获取）
      showEditDialog: resourcePage.showEditDialog,
      editForm: resourcePage.editForm,
      closeEdit: resourcePage.closeEdit,
      handleEditConfirm: resourcePage.handleEditConfirm,
      showArchiveDialog,
      archiveTarget,
      archivePlayTimeLocked,
      closeArchiveDialog,
      handleArchiveConfirm,
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
      this.contextMenuTarget = item
      ;(this.$refs.baseView as any)?.showContextMenuHandler(event, item)
    },
    // 更新筛选器数据到 App.vue
    updateFilterData() {
      // 标签索引异步回来之后也会走这里。先按当前资源重算不走索引的筛选项，再把候选抄给左侧栏。
      if (typeof (this as any).extractAllFilters === 'function') {
        (this as any).extractAllFilters()
      }
      // 优先从 this 访问，如果不存在则从 filterComposable 访问
      const getFilterDataFn = (this as any).getFilterData || 
                             ((this as any)._filterComposable && (this as any)._filterComposable.getFilterData)
      
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

.collection-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px 0;
}

.collection-bar__back {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
}

.collection-bar__crumb {
  color: var(--text-secondary);
}

.collection-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collection-field__input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.collection-picker__hint,
.collection-picker__empty,
.collection-picker__owner {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.collection-picker__list {
  max-height: 320px;
  overflow: auto;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collection-picker__row,
.collection-picker__choice {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  background: transparent;
  color: var(--text-primary);
  border: 0;
  cursor: pointer;
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
  color: var(--text-on-accent, #1a1a1a);
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
