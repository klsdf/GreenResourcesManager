/**
 * 标签索引 Store（模块级单例）
 * ============================================================================
 * 标签候选不再通过遍历资源统计，而是从主进程 SQLite 标签索引（tag_refs）查询。
 *
 * 职责：
 * 1. 按页面一次性加载各 resourceField 筛选器的候选 { name, norm, count }
 * 2. 监听主进程广播：
 *    - tags:changed：单资源增删改 → 本地按 adds/removes 增量调整计数
 *    - tags:rebuilt：重命名/合并/删除/重建 → 重新拉取相关候选
 * 3. 无 Electron 环境（纯浏览器 dev）时不可用，调用方回退到旧的遍历逻辑
 *
 * 内部唯一标识用 `${resourceType}:${field}`（不同页面可能存在同名 filter key，
 * 如多个页面都有 key='tags'，但同一资源类型的同名字段应共享同一份候选）
 */
import { reactive, toRef } from 'vue'

export interface TagIndexFilterItem {
  name: string
  norm: string
  count: number
}

interface TagQuery {
  /** 页面筛选器 key（filterConfig.key），结果按此返回 */
  key: string
  resourceType: string
  field: string
}

function internalId(resourceType: string, field: string) {
  return `${resourceType}:${field}`
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

// 候选数据：internalId → 候选数组（reactive 保证 toRef 后响应式）
const itemsStore = reactive<Record<string, TagIndexFilterItem[]>>({})

// internalId → 元信息
const metaStore: Record<string, { resourceType: string; field: string }> = {}

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
 * 注册一个标签字段，返回其候选项的 Ref
 * 多次注册同一 (resourceType, field) 返回同一份引用
 */
function register(resourceType: string, field: string) {
  const id = internalId(resourceType, field)
  metaStore[id] = { resourceType, field }
  if (!(id in itemsStore)) itemsStore[id] = []
  return toRef(itemsStore, id)
}

function applyAdds(resourceType: string, adds: Array<{ field: string; tag: string; norm: string }>) {
  for (const change of adds) {
    const id = internalId(resourceType, change.field)
    const list = itemsStore[id]
    if (!list) continue
    const existing = list.find(i => i.norm === change.norm)
    if (existing) {
      existing.count += 1
    } else {
      // 保持按名称排序的大致顺序（新标签追加，侧边栏展示不做严格要求）
      list.push({ name: change.tag, norm: change.norm, count: 1 })
    }
  }
}

function applyRemoves(resourceType: string, removes: Array<{ field: string; tag: string; norm: string }>) {
  for (const change of removes) {
    const id = internalId(resourceType, change.field)
    const list = itemsStore[id]
    if (!list) continue
    const idx = list.findIndex(i => i.norm === change.norm)
    if (idx === -1) continue
    list[idx].count -= 1
    if (list[idx].count <= 0) {
      list.splice(idx, 1)
    }
  }
}

/**
 * 处理主进程广播：
 * - 单资源事件：resourceType + adds/removes 增量
 * - 批量事件：resourceTypes 列表，整类型重新拉取
 */
async function handleChanged(data: any) {
  if (!data) return
  // 批量保存：重新加载受影响资源类型的所有字段
  if (Array.isArray(data.resourceTypes) && data.resourceTypes.length > 0) {
    await reloadByTypes(data.resourceTypes)
    return
  }
  const resourceType: string | null = data.resourceType
  if (!resourceType) return

  const adds: any[] = Array.isArray(data.adds) ? data.adds : []
  const removes: any[] = Array.isArray(data.removes) ? data.removes : []
  if (adds.length === 0 && removes.length === 0) return

  // 该类型字段尚未加载过 → 无需增量（下次加载会拿到最新值）
  const typePrefix = `${resourceType}:`
  const hasLoadedType = Object.keys(metaStore).some(id => id.startsWith(typePrefix) && id in itemsStore)
  if (!hasLoadedType) return

  applyRemoves(resourceType, removes)
  applyAdds(resourceType, adds)
  notifySidebar()
}

/** 重新拉取某些资源类型的全部已注册字段 */
async function reloadByTypes(resourceTypes: string[]) {
  const api = getApi()
  if (!api) return
  const queries: TagQuery[] = []
  for (const id of Object.keys(metaStore)) {
    const meta = metaStore[id]
    if (resourceTypes.includes(meta.resourceType)) {
      queries.push({ key: id, resourceType: meta.resourceType, field: meta.field })
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
        const id = internalId(q.resourceType, q.field)
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
