<template>
  <div class="resource-list">
    <div class="resource-list__header" role="row">
      <span v-if="isMultiSelectMode" class="resource-list__cell resource-list__cell--check"></span>
      <span class="resource-list__cell resource-list__cell--name">{{ $lt('名称') }}</span>
      <span
        v-for="column in columns"
        :key="column.key"
        class="resource-list__cell"
        :class="columnClass(column)"
      >{{ $lt(column.label) }}</span>
      <span class="resource-list__cell resource-list__cell--action"></span>
    </div>

    <div
      v-for="item in items"
      :key="rowKey(item)"
      class="resource-list__row"
      :class="{ 'is-selected': isItemSelected(item) }"
      role="row"
      @click="handleRowClick(item)"
      @contextmenu.prevent="$emit('contextmenu', $event, item)"
    >
      <span v-if="isMultiSelectMode" class="resource-list__cell resource-list__cell--check" @click.stop>
        <input
          type="checkbox"
          :checked="isItemSelected(item)"
          @change="$emit('toggle-select', item)"
        >
      </span>

      <span class="resource-list__cell resource-list__cell--name">
        <span class="resource-list__icon" aria-hidden="true">{{ iconFor(item) }}</span>
        <span class="resource-list__name" :title="nameOf(item)">{{ nameOf(item) }}</span>
        <span v-if="itemIsRunning(item)" class="resource-list__running">{{ $lt('运行中') }}</span>
        <span v-if="itemFileMissing(item)" class="resource-list__missing" :title="$lt('本地文件不存在')">⚠️</span>
        <span v-if="itemIsFavorite(item)" class="resource-list__star" :title="$lt('已收藏')">⭐</span>
      </span>

      <span
        v-for="column in columns"
        :key="column.key"
        class="resource-list__cell"
        :class="columnClass(column)"
        :title="cellTitle(item, column)"
      >
        <template v-if="column.tags">
          <span v-if="tagsOf(item).length === 0" class="resource-list__empty">—</span>
          <span v-for="tag in tagsOf(item).slice(0, 3)" :key="tag" class="resource-list__tag">{{ tag }}</span>
          <span v-if="tagsOf(item).length > 3" class="resource-list__tag-more">+{{ tagsOf(item).length - 3 }}</span>
        </template>
        <template v-else>{{ cellText(item, column) }}</template>
      </span>

      <span class="resource-list__cell resource-list__cell--action">
        <button
          type="button"
          class="resource-list__action"
          :title="itemIsRunning(item) ? $lt('停止') : $lt('打开')"
          @click.stop="$emit('action', item)"
        >{{ itemIsRunning(item) ? '⏹️' : '▶️' }}</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPlayTime, formatLastPlayed, formatDuration, formatVideoDuration } from '../utils/formatters'
import { lt, lf } from '../locales/lt'

interface ListColumn {
  key: string
  field: string
  label: string
  formatter?: string
  render?: (value: any, item: any) => string
  tags?: boolean
}

interface Props {
  items: any[]
  /** 根据一条资源算出卡片类型，用来选图标 */
  typeForItem?: (item: any) => string
  isRunningItem?: (item: any) => boolean
  fileExistsFor?: (item: any) => boolean
  isMultiSelectMode?: boolean
  isItemSelected?: (item: any) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMultiSelectMode: false
})

const emit = defineEmits<{
  click: [item: any]
  contextmenu: [event: MouseEvent, item: any]
  action: [item: any]
  'toggle-select': [item: any]
}>()

const TYPE_ICONS: Record<string, string> = {
  game: '🎮',
  software: '💻',
  image: '🖼️',
  singleimage: '🖼️',
  novel: '📖',
  video: '🎬',
  anime: '🎬',
  audio: '🎵',
  website: '🌐',
  other: '📦',
  folder: '📁'
}

/** 配置里只写了字段名的列，用这套中文表补表头 */
const FIELD_LABELS: Record<string, string> = {
  name: '名称',
  description: '描述',
  developers: '开发商',
  developer: '开发商',
  publisher: '发行商',
  engine: '引擎',
  author: '作者',
  artist: '艺术家',
  series: '系列',
  category: '分类',
  genre: '类型',
  platform: '平台',
  playTime: '总时长',
  lastPlayed: '最后游玩',
  lastViewed: '最后浏览',
  lastRead: '最后阅读',
  lastWatched: '最后观看',
  lastVisited: '最后访问',
  addedDate: '添加时间',
  readTime: '阅读时长',
  readProgress: '阅读进度',
  playCount: '运行次数',
  watchCount: '观看次数',
  folderSize: '大小',
  duration: '时长',
  pagesCount: '页数',
  totalWords: '字数',
  videoCount: '视频数',
  audioCount: '音频数',
  viewCount: '浏览次数',
  visitCount: '访问次数'
}

function unwrap(value: any): any {
  let current = value
  // ResourceField 只取 value，嵌套时继续往里拆
  while (current && typeof current === 'object' && 'value' in current && 'saveable' in current) {
    current = current.value
  }
  return current
}

function readField(item: any, fieldPath: string): any {
  if (!item || !fieldPath) return null
  const parts = String(fieldPath).split('.')
  let value = item
  for (const part of parts) {
    if (value == null) return null
    value = unwrap(value[part])
  }
  return value
}

function getCardConfig(item: any): any {
  const ctor = item?.constructor
  if (!ctor) return null
  if (typeof ctor.getCardDisplayConfig === 'function') {
    const result = ctor.getCardDisplayConfig()
    if (result) return result
  }
  return ctor.cardDisplayConfig || null
}

function labelFor(field: string, configured?: string): string {
  const cleaned = String(configured || '').replace(/[:：]\s*$/, '').trim()
  if (cleaned) return cleaned
  return FIELD_LABELS[field] || field
}

/**
 * 列表的列跟着资源类的卡片配置走：
 * 副标题、额外信息、统计项和角标字段各占一列，最后补一列标签。
 */
const columns = computed<ListColumn[]>(() => {
  const first = props.items[0]
  const config = getCardConfig(first)
  if (!config) return []

  const result: ListColumn[] = []
  const usedFields = new Set<string>()

  const addColumn = (column: ListColumn) => {
    if (!column.field || usedFields.has(column.field)) return
    usedFields.add(column.field)
    result.push(column)
  }

  // description 通常很长，列表里放一列会把其他属性挤没，跳过
  if (config.subtitle && config.subtitle !== 'description') {
    addColumn({ key: 'subtitle', field: config.subtitle, label: labelFor(config.subtitle) })
  }
  if (config.extra) {
    addColumn({ key: 'extra', field: config.extra, label: labelFor(config.extra) })
  }
  for (const stat of config.stats || []) {
    addColumn({
      key: `stat-${stat.field}`,
      field: stat.field,
      label: labelFor(stat.field, stat.label),
      formatter: stat.formatter,
      render: stat.render
    })
  }
  if (config.badge) {
    addColumn({
      key: `badge-${config.badge.field}`,
      field: config.badge.field,
      label: labelFor(config.badge.field),
      formatter: config.badge.formatter,
      render: config.badge.render
    })
  }
  result.push({ key: 'tags', field: config.tags || 'tags', label: '标签', tags: true })

  return result
})

function formatFolderSize(sizeInBytes: any): string {
  if (!sizeInBytes) return lt('未知大小')
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = Number(sizeInBytes)
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  const formatted = size % 1 === 0 ? size.toString() : size.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}

function formatWordCount(wordCount: any): string {
  const count = Number(wordCount)
  if (!count) return lt('未知字数')
  if (count < 1000) return lf('{n} 字', { n: count })
  if (count < 10000) return lf('{n} 千字', { n: (count / 1000).toFixed(1) })
  return lf('{n} 万字', { n: count >= 100000 ? Math.round(count / 10000) : (count / 10000).toFixed(1) })
}

function formatAddedDate(dateString: any): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.ceil(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return lt('今天')
  if (diffDays === 1) return lt('昨天')
  if (diffDays < 7) return lf('{n}天前', { n: diffDays })
  if (diffDays < 30) return lf('{n}周前', { n: Math.ceil(diffDays / 7) })
  if (diffDays < 365) return lf('{n}个月前', { n: Math.ceil(diffDays / 30) })
  return lf('{n}年前', { n: Math.ceil(diffDays / 365) })
}

const formatterMap: Record<string, (value: any) => string> = {
  formatPlayTime: value => formatPlayTime(value),
  formatLastPlayed: value => formatLastPlayed(value),
  formatLastViewed: value => formatLastPlayed(value),
  formatLastWatched: value => formatLastPlayed(value),
  formatLastRead: value => formatLastPlayed(value),
  formatDuration: value => formatDuration(value, '未知时长'),
  formatVideoDuration: value => formatVideoDuration(value, '未知时长'),
  formatAudioDuration: value => formatDuration(value, '未知时长'),
  formatFolderSize: value => formatFolderSize(value),
  formatWordCount: value => formatWordCount(value),
  formatAddedDate: value => formatAddedDate(value),
  formatReadProgress: value => (value == null || value === '' ? '' : `${value}%`),
  formatReadStatus: value => {
    const minutes = Number(value)
    if (!minutes) return lt('未阅读')
    if (minutes < 60) return lf('{minutes} 分钟', { minutes })
    if (minutes < 1440) {
      return lf('{hours} 小时 {mins} 分钟', { hours: Math.floor(minutes / 60), mins: minutes % 60 })
    }
    return lf('{days} 天 {hours} 小时', { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60) })
  }
}

function cellText(item: any, column: ListColumn): string {
  const raw = readField(item, column.field)
  let text = ''
  if (column.render) {
    text = column.render(raw, item)
  } else if (column.formatter && formatterMap[column.formatter]) {
    text = formatterMap[column.formatter](raw)
  } else {
    text = raw == null || raw === '' ? '' : String(raw)
  }
  return text || '—'
}

function cellTitle(item: any, column: ListColumn): string {
  const text = cellText(item, column)
  return text === '—' ? '' : text
}

function columnClass(column: ListColumn): string {
  if (column.tags) return 'resource-list__cell--tags'
  if (column.field === 'folderSize' || column.field === 'duration' || column.field === 'pagesCount' || column.field === 'totalWords') {
    return 'resource-list__cell--number'
  }
  return ''
}

function rowKey(item: any): string {
  return String(item?.id?.value ?? item?.id ?? '')
}

function nameOf(item: any): string {
  return String(readField(item, 'name') || '')
}

function iconFor(item: any): string {
  const rawType = props.typeForItem ? props.typeForItem(item) : ''
  const type = String(rawType || '').toLowerCase()
  return TYPE_ICONS[type] || '📄'
}

function itemIsRunning(item: any): boolean {
  return props.isRunningItem ? props.isRunningItem(item) === true : false
}

function itemFileMissing(item: any): boolean {
  return props.fileExistsFor ? props.fileExistsFor(item) === false : false
}

function itemIsFavorite(item: any): boolean {
  return readField(item, 'isFavorite') === true
}

function isItemSelected(item: any): boolean {
  return props.isItemSelected ? props.isItemSelected(item) === true : false
}

function tagsOf(item: any): string[] {
  const raw = readField(item, getCardConfig(item)?.tags || 'tags')
  return Array.isArray(raw) ? raw.map(tag => String(tag)) : []
}

function handleRowClick(item: any) {
  if (props.isMultiSelectMode) {
    emit('toggle-select', item)
  } else {
    emit('click', item)
  }
}
</script>

<style scoped lang="scss">
.resource-list {
  padding: 6px 20px 20px;
  font-size: var(--font-size-sm, 0.875rem);
}

.resource-list__header,
.resource-list__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  min-height: 40px;
  padding: 0 var(--spacing-sm, 8px);
}

.resource-list__header {
  position: sticky;
  top: 0;
  z-index: 2;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: 600;
  user-select: none;
}

.resource-list__row {
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.is-selected {
    background: color-mix(in srgb, var(--accent-color) 18%, transparent);
  }
}

.resource-list__cell {
  flex: 0 0 120px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-list__cell--check {
  flex: 0 0 24px;
  display: flex;
  align-items: center;

  input {
    cursor: pointer;
  }
}

.resource-list__cell--name {
  flex: 2 1 280px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.resource-list__cell--number {
  flex: 0 0 110px;
  text-align: right;
}

.resource-list__cell--tags {
  flex: 1 1 160px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.resource-list__cell--action {
  flex: 0 0 40px;
  display: flex;
  justify-content: flex-end;
}

.resource-list__icon {
  flex: 0 0 auto;
  font-size: 1.05rem;
  line-height: 1;
}

.resource-list__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.resource-list__running {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--success-color, #10b981);
  color: #fff;
  font-size: var(--font-size-xs, 0.75rem);
  line-height: 1.5;
}

.resource-list__missing,
.resource-list__star {
  flex: 0 0 auto;
  font-size: 0.85rem;
}

.resource-list__tag {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: var(--font-size-xs, 0.75rem);
}

.resource-list__tag-more,
.resource-list__empty {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs, 0.75rem);
}

.resource-list__action {
  padding: 2px 6px;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;

  &:hover {
    background: var(--bg-secondary);
  }
}
</style>
