<template>
  <div class="scraper-library-view">
    <div class="scraper-library-content">
      <div class="action-bar">
        <button
          type="button"
          class="btn-import"
          :disabled="importing"
          @click="handleImportFromArchive"
        >
          {{ importing ? '导入中...' : '从存档导入刮削库' }}
        </button>
        <button
          type="button"
          class="btn-merge"
          :disabled="merging"
          @click="handleMergeOtherLibrary"
        >
          {{ merging ? '合并中...' : '合并其它刮削库' }}
        </button>
        <button type="button" class="btn-help" @click="helpVisible = true"> {{ $lt('帮助说明') }} </button>
        <span v-if="importedItems.length > 0" class="import-summary"> {{ $lt('已导入') }} {{ importedItems.length }} {{ $lt('条固有数据（无 id）') }} </span>
      </div>

      <!-- 帮助说明弹窗 -->
      <FunModal v-model="helpVisible" :title="$lt('刮削库 · 帮助说明')" :max-width="'520px'">
        <div class="help-body">
          <p><strong>{{ $lt('什么是刮削库？') }}</strong></p>
          <p>{{ $lt('刮削库用于存放可供刮削使用的资源数据。这里的记录是「固有数据」（不含游玩时长、评分、游玩记录等），主要来自存档中各资源表的条目，用于在刮削时匹配、补全元数据。') }}</p>
          <p><strong>{{ $lt('从存档导入刮削库') }}</strong></p>
          <p>{{ $lt('从当前应用的存档中，将各资源表里已有的数据导入到刮削库。导入的是不含 id 的固有数据，方便在其它环境或合并时使用。') }}</p>
          <p><strong>{{ $lt('合并其它刮削库') }}</strong></p>
          <p>{{ $lt('选择另一个刮削库文件（如从其它群友那里得到的scraper-library.db文件），与当前刮削库合并。若存在重复项（按 json 或 name 判断），可选择「覆盖」用外部数据替换本地，或「忽略」保留本地数据；其余记录将直接新增。') }}</p>
        </div>
        <template #footer>
          <button type="button" class="btn-confirm" @click="helpVisible = false">{{ $lt('知道了') }}</button>
        </template>
      </FunModal>

      <!-- 合并刮削库：重复项选择弹窗 -->
      <div v-if="mergeDialogVisible" class="modal-overlay" @mousedown.self="mergeDialogVisible = false">
        <div class="modal-content merge-dialog" @mousedown.stop>
          <div class="modal-header">
            <h3>{{ $lt('合并其它刮削库') }}</h3>
            <button type="button" class="btn-close" @click="mergeDialogVisible = false">✕</button>
          </div>
          <div class="modal-body">
            <p v-if="mergeDuplicates.length === 0" class="merge-summary"> {{ $lt('未发现重复，将新增') }} {{ mergeAddCount }} {{ $lt('条记录。') }} </p>
            <template v-else>
              <p class="merge-summary"> {{ $lt('发现') }} {{ mergeDuplicates.length }} {{ $lt('条重复（json 或 name 相同），请选择覆盖或忽略；另有') }} {{ mergeAddCount }} {{ $lt('条将直接新增。') }} </p>
              <div class="merge-bulk-actions">
                <button type="button" class="btn-bulk" @click="setAllMergeDecision('ignore')">{{ $lt('全部忽略') }}</button>
                <button type="button" class="btn-bulk" @click="setAllMergeDecision('overwrite')">{{ $lt('全选覆盖') }}</button>
              </div>
              <div class="merge-duplicate-list">
                <div
                  v-for="(item, idx) in mergeDuplicates"
                  :key="idx"
                  class="merge-duplicate-row"
                >
                  <span class="merge-name">{{ item.externalName || '(无名称)' }}</span>
                  <span class="merge-vs">{{ $lt('← 覆盖本地') }}</span>
                  <span class="merge-name local">{{ item.localName || '(无名称)' }}</span>
                  <label class="merge-choice">
                    <input type="radio" :name="'merge-' + idx" value="overwrite" v-model="item.decision" /> {{ $lt('覆盖') }} </label>
                  <label class="merge-choice">
                    <input type="radio" :name="'merge-' + idx" value="ignore" v-model="item.decision" /> {{ $lt('忽略') }} </label>
                </div>
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="mergeDialogVisible = false">{{ $lt('取消') }}</button>
            <button type="button" class="btn-confirm" @click="confirmMerge">{{ $lt('确认合并') }}</button>
          </div>
        </div>
      </div>

      <div v-if="importedItems.length === 0" class="scraper-library-empty">
        <p class="empty-hint">{{ $lt('点击「从存档导入刮削库」将各资源表的固有数据导入到此页展示（不包含 id）') }}</p>
      </div>

      <template v-else>
        <div class="library-section">
          <h3>{{ $lt('刮削库数据') }}</h3>
          <div class="table-wrap">
            <FunPagination
              v-if="paginationConfig.totalPages > 1"
              :currentPage="paginationConfig.currentPage"
              :totalPages="paginationConfig.totalPages"
              :pageSize="paginationConfig.pageSize"
              :totalItems="paginationConfig.totalItems"
              itemType="条记录"
              @page-change="handlePageChange"
            />
            <FunDataTable
              :data="paginatedRows"
              :columns="displayColumns"
              :show-actions="false"
              :row-key="(row, idx) => idx"
              :default-formatter="formatCellValue"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import alertService from '../utils/AlertService.ts'
import { usePagination } from '../composables/usePagination'
import FunPagination from '../fun-ui/navigation/Pagination/FunPagination.vue'
import FunDataTable from '../fun-ui/basic/DataTable/FunDataTable.vue'
import FunModal from '../fun-ui/feedback/Modal/FunModal.vue'
import { getScrapableFieldsByTable } from '../configs/resources/scrapableFields'

const importing = ref(false)
const merging = ref(false)
const importedItems = ref<Array<Record<string, any>>>([])
const helpVisible = ref(false)

// 合并其它刮削库：弹窗与重复项
const mergeDialogVisible = ref(false)
const mergeDuplicates = ref<Array<{
  external: { _id: number; sourceTable: string; updateTime: string; author: string | null; jsonData: string }
  local: { _id: number; sourceTable: string; updateTime: string; author: string | null; jsonData: string }
  externalName: string
  localName: string
  decision: 'overwrite' | 'ignore'
}>>([])
const mergeAddCount = ref(0)
/** 待合并的外部数据（非重复项将新增） */
let mergeExternalData: Array<{ _id: number; sourceTable: string; updateTime: string; author: string | null; jsonData: string }> = []

// 从导入数据中收集所有列，表头直接用英文字段名（资源结构灵活，列随数据动态变化）
const displayColumns = computed(() => {
  if (importedItems.value.length === 0) return []
  const allKeys = new Set<string>()
  importedItems.value.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)))
  const keys = Array.from(allKeys).sort((a, b) => {
    if (a === 'sourceTable') return -1
    if (b === 'sourceTable') return 1
    if (a === 'name') return -1
    if (b === 'name') return 1
    if (a === 'resourcePath') return -1
    if (b === 'resourcePath') return 1
    return a.localeCompare(b)
  })
  return keys.map(key => ({ key, label: key }))
})

const paginationComposable = usePagination(importedItems, 50, '条记录')
const paginatedRows = computed(() => paginationComposable.paginatedItems.value)
const paginationConfig = computed(() => paginationComposable.paginationConfig.value)

const handlePageChange = (pageNum: number) => {
  paginationComposable.handlePageChange(pageNum)
}

// 格式化单元格（与 DatabaseView 一致：对象/数组转 JSON）
const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch (e) {
      return String(value)
    }
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(parsed, null, 2)
      }
    } catch (_) {}
    return value
  }
  return String(value)
}

/** 从路径取文件名（兼容 / 与 \） */
function getFileNameFromPath(filePath: string): string {
  const parts = filePath.replace(/\/$|\\$/, '').split(/[/\\]/)
  return parts[parts.length - 1] ?? ''
}

// 存档数据库与刮削库数据库的合法文件名
const ARCHIVE_DB_NAME = 'database.db'
const SCRAPER_LIBRARY_DB_NAME = 'scraper-library.db'

// 从存档导入：选择存档 db 文件 → 读取各资源表，去掉 id，保存到本地刮削库
const handleImportFromArchive = async () => {
  const api = (window as any).electronAPI
  if (!api?.scraperDbImport) {
    await alertService.error('当前环境无法访问刮削库 API（请使用 Electron 运行）')
    return
  }
  if (!api?.selectFileWithExtensions) {
    await alertService.error('无法打开文件选择对话框')
    return
  }

  const filePath = await api.selectFileWithExtensions(
    [{ name: '存档数据库', extensions: ['db'] }, { name: '所有文件', extensions: ['*'] }],
    null,
    '选择要导入的存档数据库'
  )
  if (!filePath) return

  if (getFileNameFromPath(filePath) !== ARCHIVE_DB_NAME) {
    await alertService.error(`请选择名为 ${ARCHIVE_DB_NAME} 的存档数据库，防止误导入其它数据库`)
    return
  }

  importing.value = true
  try {
    const scrapableFieldsByTable = getScrapableFieldsByTable()
    const importRes = await api.scraperDbImport(scrapableFieldsByTable, filePath)
    if (!importRes?.ok) {
      await alertService.error(importRes?.message || '导入失败')
      return
    }

    await loadScraperData()
    await alertService.success(`导入完成，共 ${importRes.count || 0} 条固有数据已保存到刮削库数据库`)
  } catch (e: any) {
    await alertService.error(`导入失败: ${e?.message || '未知错误'}`)
  } finally {
    importing.value = false
  }
}

// 从刮削库数据库加载数据
const loadScraperData = async () => {
  const api = (window as any).electronAPI
  if (!api?.scraperDbGetAll) {
    console.warn('[ScraperLibrary] scraperDbGetAll API 不可用')
    return
  }

  try {
    const res = await api.scraperDbGetAll()
    if (res?.ok && Array.isArray(res.data)) {
      importedItems.value = res.data
      paginationComposable.resetToFirstPage()
    } else {
      console.error('[ScraperLibrary] 加载刮削库数据失败:', res?.message)
    }
  } catch (e: any) {
    console.error('[ScraperLibrary] 加载刮削库数据异常:', e)
  }
}

/** 从刮削库记录中取显示名（用于重复判断） */
function getRecordDisplayName(record: { jsonData: string }): string {
  if (!record?.jsonData) return ''
  try {
    const data = typeof record.jsonData === 'string' ? JSON.parse(record.jsonData) : record.jsonData
    const name = data?.name ?? data?.resourcePath ?? data?.resourceFileName ?? ''
    return String(name).trim()
  } catch {
    return ''
  }
}

/** 判断两条记录是否重复：json 相同或 name 相同（同表） */
function isDuplicate(
  external: { sourceTable: string; jsonData: string },
  local: { sourceTable: string; jsonData: string }
): boolean {
  if (external.sourceTable !== local.sourceTable) return false
  if (external.jsonData === local.jsonData) return true
  const a = getRecordDisplayName(external).toLowerCase()
  const b = getRecordDisplayName(local).toLowerCase()
  return a !== '' && a === b
}

// 合并其它刮削库：选择文件 → 读取外部 → 检测重复 → 弹窗选择
const handleMergeOtherLibrary = async () => {
  const api = (window as any).electronAPI
  if (!api?.scraperDbReadExternal || !api?.scraperDbMerge) {
    await alertService.error('当前环境无法访问刮削库 API（请使用 Electron 运行）')
    return
  }
  if (!api?.selectFileWithExtensions) {
    await alertService.error('无法打开文件选择对话框')
    return
  }

  const filePath = await api.selectFileWithExtensions(
    [{ name: '刮削库数据库', extensions: ['db'] }, { name: '所有文件', extensions: ['*'] }],
    null,
    '选择要合并的刮削库数据库'
  )
  if (!filePath) return

  if (getFileNameFromPath(filePath) !== SCRAPER_LIBRARY_DB_NAME) {
    await alertService.error(`请选择名为 ${SCRAPER_LIBRARY_DB_NAME} 的刮削库数据库，防止误合并其它数据库`)
    return
  }

  merging.value = true
  try {
    const res = await api.scraperDbReadExternal(filePath)
    if (!res?.ok || !Array.isArray(res.data)) {
      await alertService.error(res?.message || '读取外部刮削库失败')
      return
    }
    const externalData = res.data
    if (externalData.length === 0) {
      await alertService.info('所选刮削库为空，无需合并')
      return
    }

    const localData = importedItems.value as Array<{ _id: number; sourceTable: string; updateTime: string; author: string | null; jsonData: string }>
    const duplicates: Array<{
      external: typeof externalData[0]
      local: typeof localData[0]
      externalName: string
      localName: string
      decision: 'overwrite' | 'ignore'
    }> = []
    const externalIndicesToAdd = new Set<number>()

    for (let i = 0; i < externalData.length; i++) {
      const ext = externalData[i]
      const matched = localData.find((loc) => isDuplicate(ext, loc))
      if (matched) {
        duplicates.push({
          external: ext,
          local: matched,
          externalName: getRecordDisplayName(ext),
          localName: getRecordDisplayName(matched),
          decision: 'ignore'
        })
      } else {
        externalIndicesToAdd.add(i)
      }
    }

    mergeExternalData = externalData
    mergeDuplicates.value = duplicates
    mergeAddCount.value = externalIndicesToAdd.size
    mergeDialogVisible.value = true
  } catch (e: any) {
    await alertService.error(`合并准备失败: ${e?.message || '未知错误'}`)
  } finally {
    merging.value = false
  }
}

// 全部忽略 / 全选覆盖
const setAllMergeDecision = (decision: 'overwrite' | 'ignore') => {
  mergeDuplicates.value.forEach((item) => { item.decision = decision })
}

// 确认合并：按用户选择执行覆盖/忽略，并新增非重复项
const confirmMerge = async () => {
  const api = (window as any).electronAPI
  if (!api?.scraperDbMerge) return

  const overwrites: Array<{ localId: number; sourceTable: string; jsonData: string; updateTime: string; author: string | null }> = []
  for (const item of mergeDuplicates.value) {
    if (item.decision === 'overwrite') {
      overwrites.push({
        localId: item.local._id,
        sourceTable: item.external.sourceTable,
        jsonData: item.external.jsonData,
        updateTime: item.external.updateTime,
        author: item.external.author
      })
    }
  }

  const adds = mergeExternalData
    .filter((ext) => !mergeDuplicates.value.some((d) => d.external.sourceTable === ext.sourceTable && d.external.jsonData === ext.jsonData))
    .map((r) => ({
    sourceTable: r.sourceTable,
    jsonData: r.jsonData,
    updateTime: r.updateTime,
    author: r.author
  }))

  merging.value = true
  try {
    const result = await api.scraperDbMerge(overwrites, adds)
    if (!result?.ok) {
      await alertService.error(result?.message || '合并失败')
      return
    }
    mergeDialogVisible.value = false
    await loadScraperData()
    await alertService.success(`合并完成：覆盖 ${result.overwritten ?? 0} 条，新增 ${result.added ?? 0} 条`)
  } catch (e: any) {
    await alertService.error(`合并失败: ${e?.message || '未知错误'}`)
  } finally {
    merging.value = false
  }
}

// 页面挂载时加载已有数据
onMounted(() => {
  loadScraperData()
})
</script>

<style scoped>
.scraper-library-view {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
}

.scraper-library-content {
  width: 100%;
  height: 100%;
  padding: var(--spacing-md);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  overflow: hidden;
}

.action-bar {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  padding-bottom: var(--spacing-md);
  flex-shrink: 0;
}

.btn-import {
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-color, #4a90e2);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, transform 0.2s;
}

.btn-import:hover:not(:disabled) {
  background: var(--accent-hover, #3a7bc8);
  transform: translateY(-1px);
}

.btn-import:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-merge {
  padding: var(--spacing-md) var(--spacing-xl);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.btn-merge:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}

.btn-merge:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.import-summary {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.scraper-library-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-secondary);
}

.empty-hint {
  margin: 0;
  font-size: 14px;
  max-width: 480px;
  text-align: center;
}

.library-section {
  flex: 1;
  min-height: 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.library-section h3 {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--border-color);
  flex-shrink: 0;
}

.table-wrap {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

/* 合并刮削库弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content.merge-dialog {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  max-width: 560px;
  width: 90%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px var(--shadow-dark);
}
.modal-content .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.modal-content .modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}
.modal-content .btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
}
.modal-content .modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.merge-summary {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  font-size: 14px;
}
.merge-bulk-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.merge-bulk-actions .btn-bulk {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.merge-bulk-actions .btn-bulk:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}
.merge-duplicate-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}
.merge-duplicate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}
.merge-duplicate-row:last-child {
  border-bottom: none;
}
.merge-duplicate-row .merge-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}
.merge-duplicate-row .merge-name.local {
  color: var(--text-secondary);
}
.merge-duplicate-row .merge-vs {
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
}
.merge-duplicate-row .merge-choice {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--text-primary);
  flex-shrink: 0;
}
.modal-content .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
.modal-content .btn-cancel,
.modal-content .btn-confirm {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.modal-content .btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.modal-content .btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
}
.modal-content .btn-confirm:hover {
  background: var(--accent-hover);
}

.btn-help {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.btn-help:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
}

.help-body p {
  margin: 0 0 12px 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
}
.help-body p:last-child {
  margin-bottom: 0;
}
.help-body strong {
  color: var(--text-primary);
}

/* FunModal 插槽内按钮沿用弹窗按钮样式 */
:deep(.fun-modal__footer .btn-confirm) {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: var(--accent-color);
  color: white;
  border: none;
}
:deep(.fun-modal__footer .btn-confirm:hover) {
  background: var(--accent-hover);
}
</style>
