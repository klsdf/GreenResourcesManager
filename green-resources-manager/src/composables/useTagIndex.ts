/**
 * 标签索引 Store（模块级单例）
 * ============================================================================
 * 标签候选不再通过遍历资源统计，而是从主进程 SQLite 标签索引（tag_refs）查询。
 *
 * 职责：
 * 1. 按页面一次性加载各 resourceField 筛选器的候选 { name, norm, count }
 * 2. 监听主进程广播：
 *    - tags:changed：资源增删改 → 按页面重新查询，只更新这一页自己的候选
 *    - tags:rebuilt：重命名/合并/删除/重建 → 重新拉取相关候选
 * 3. 无 Electron 环境（纯浏览器 dev）时不可用，调用方回退到旧的遍历逻辑
 *
 * 候选按「页面 + 资源类型 + 字段」分开保存。
 * 同类型可以建很多页，每页只统计自己名单里的资源，不能共用另一页的标签。
 */
import { reactive, toRef } from 'vue'

export interface TagIndexFilterItem {
  name: string
  norm: string
  count: number
}

interface TagQuery {
  /** 结果写回时用的键，页面侧边栏用「页面 + 类型 + 字段」 */
  key: string
  /** 只统计这一页名单里的资源 */
  pageId: string
  resourceType: string
  field: string
}

/**
 * 某一页某个标签字段的存储键。
 * 页面 id 里可能有短横线，用双冒号和「类型:字段」隔开，避免两页写成同一个键。
 * @param pageId 页面 id
 * @param resourceType 逻辑资源类型
 * @param field 标签字段
 */
function storeId(pageId: string, resourceType: string, field: string) {
  return `${pageId}::${resourceType}:${field}`
}

function getApi(): any | null {
  const api = (typeof window !== 'undefined' ? (window as any).electronAPI : null)
  if (api && typeof api.tagIndexGetByFields === 'function') return api
  return null
}

/** 标签索引是否可用（Electron 且主进程已提供接口） */
export function isTagIndexAvailable(): boolean {
  return getApi() !== null
}

/** 存储键 → 这一页的标签候选。换一份键就是另一页，响应式数组不会串页。 */
const itemsStore = reactive<Record<string, TagIndexFilterItem[]>>({})

/** 存储键 → 这一页要重新拉取时需要的查询条件 */
const metaStore: Record<string, { pageId: string; resourceType: string; field: string }> = {}

// 已加载的页面 / 正在加载的页面（防重复请求）
const loadedPages = new Set<string>()
const loadingPages = new Set<string>()

let listenersBound = false

/**
 * 让左侧筛选栏按最新候选再抄一份。
 * 侧栏用的是当时的数组副本。索引稍后增减时，副本自己不会变，所以要主动再要一次。
 */
function notifySidebar() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('filter-request-update'))
}

/**
 * 注册某一页的一个标签字段，返回这一页自己的候选项。
 * 同一类型的另一页会拿到另一份列表，打开新页面时不会先看到旧页面的标签。
 * @param pageId 页面 id
 * @param resourceType 逻辑资源类型
 * @param field 标签字段
 */
function register(pageId: string, resourceType: string, field: string) {
  const id = storeId(pageId, resourceType, field)
  metaStore[id] = { pageId, resourceType, field }
  if (!(id in itemsStore)) itemsStore[id] = []
  return toRef(itemsStore, id)
}

/**
 * 处理主进程广播。
 * 标签增减不再按资源类型直接改本地计数：那样会把这一页新打的标签加到同类型的其他页面。
 * 改成按已打开的页面重新查询，每一页只带回自己名单里的标签。
 */
async function handleChanged(data: any) {
  if (!data) return
  const resourceTypes: string[] = Array.isArray(data.resourceTypes) && data.resourceTypes.length > 0
    ? data.resourceTypes
    : (data.resourceType ? [data.resourceType] : [])
  if (resourceTypes.length === 0) return
  await reloadByTypes(resourceTypes)
}

/** 重新拉取某些资源类型的全部已注册字段 */
async function reloadByTypes(resourceTypes: string[]) {
  const api = getApi()
  if (!api) return
  const queries: TagQuery[] = []
  for (const id of Object.keys(metaStore)) {
    const meta = metaStore[id]
    if (resourceTypes.includes(meta.resourceType)) {
      queries.push({ key: id, pageId: meta.pageId, resourceType: meta.resourceType, field: meta.field })
    }
  }
  if (queries.length === 0) return
  const res = await api.tagIndexGetByFields(queries)
  if (res?.ok && res.data) {
    for (const q of queries) {
      itemsStore[q.key] = res.data[q.key] || []
    }
    notifySidebar()
  }
}

/** 全量重新加载（标签管理操作/重建后） */
async function reloadAll() {
  await reloadByTypes(Object.values(metaStore).map(m => m.resourceType))
}

function bindListeners() {
  if (listenersBound) return
  const api = getApi()
  if (!api) return
  listenersBound = true
  api.onTagsChanged?.((data: any) => {
    handleChanged(data).catch(err => console.warn('[useTagIndex] 处理 tags:changed 失败', err))
  })
  api.onTagsRebuilt?.((data: any) => {
    if (data && Array.isArray(data.resourceTypes) && data.resourceTypes.length > 0) {
      reloadByTypes(data.resourceTypes).catch(err => console.warn('[useTagIndex] 刷新失败', err))
    } else {
      reloadAll().catch(err => console.warn('[useTagIndex] 全量刷新失败', err))
    }
  })
}

/**
 * 确保页面标签候选已加载（首次进入页面时调用）
 * @param pageId 页面 id
 * @param queries 该页面 resourceField 筛选器查询列表
 */
async function ensurePageLoaded(pageId: string, queries: TagQuery[]) {
  const api = getApi()
  // 无 Electron 环境：由调用方回退到遍历统计
  if (!api) return
  bindListeners()
  if (queries.length === 0) {
    loadedPages.add(pageId)
    return
  }
  if (loadedPages.has(pageId) || loadingPages.has(pageId)) return
  loadingPages.add(pageId)
  try {
    const res = await api.tagIndexGetByFields(queries)
    if (res?.ok && res.data) {
      for (const q of queries) {
        const id = storeId(q.pageId, q.resourceType, q.field)
        itemsStore[id] = res.data[q.key] || []
      }
      loadedPages.add(pageId)
      notifySidebar()
    }
  } catch (err) {
    console.warn(`[useTagIndex] 加载页面 ${pageId} 标签候选失败:`, err)
  } finally {
    loadingPages.delete(pageId)
  }
}

/** 失效页面缓存并重新拉取（数据导入/刮削合并等场景） */
async function invalidatePage(pageId: string, queries: TagQuery[]) {
  loadedPages.delete(pageId)
  await ensurePageLoaded(pageId, queries)
}

export function useTagIndex() {
  return {
    register,
    ensurePageLoaded,
    invalidatePage,
    reloadByTypes,
    reloadAll,
    isAvailable: isTagIndexAvailable
  }
}
