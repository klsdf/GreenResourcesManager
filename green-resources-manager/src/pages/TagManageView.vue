<template>
  <div class="tag-manage-page">
    <!-- 左侧：资源类型 → 字段树 -->
    <aside class="tm-sidebar">
      <h3 class="tm-title">🏷️ 标签管理</h3>
      <div v-for="res in registry" :key="res.type" class="tm-res-group">
        <div class="tm-res-name">{{ res.label }}</div>
        <div
          v-for="f in res.fields"
          :key="f.field"
          class="tm-field-item"
          :class="{ active: selectedType === res.type && selectedField === f.field }"
          @click="selectField(res.type, f.field)"
        >
          <span>{{ f.label }}</span>
        </div>
      </div>
    </aside>

    <!-- 右侧：标签列表 -->
    <main class="tm-main">
      <template v-if="electronAvailable && selectedType">
        <header class="tm-toolbar">
          <input
            v-model="keyword"
            class="tm-search"
            type="text"
            placeholder="搜索标签名称..."
          />
          <label class="tm-check">
            <input v-model="unusedOnly" type="checkbox" />
            仅看未使用
          </label>
          <label class="tm-check">
            <input v-model="duplicatesOnly" type="checkbox" />
            疑似重复
          </label>
          <button class="tm-btn" @click="loadTags">刷新</button>
          <button class="tm-btn tm-btn-warn" @click="onRebuild">重建索引</button>
        </header>

        <div class="tm-bulk-bar" v-if="checkedNorms.size > 0">
          已选择 {{ checkedNorms.size }} 个标签
          <button class="tm-btn tm-btn-primary" :disabled="checkedNorms.size < 2" @click="openMergeDialog">
            合并为…
          </button>
          <button class="tm-btn" @click="checkedNorms.clear()">取消选择</button>
          <span v-if="checkedNorms.size < 2" class="tm-hint">合并需选择至少 2 个标签</span>
        </div>

        <div class="tm-table-wrap">
          <table class="tm-table">
            <thead>
              <tr>
                <th class="col-check"></th>
                <th class="col-name">标签名</th>
                <th class="col-count">使用数</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="tm-empty">加载中…</td>
              </tr>
              <tr v-else-if="tags.length === 0">
                <td colspan="4" class="tm-empty">没有符合条件的标签</td>
              </tr>
              <tr v-for="item in tags" :key="item.norm">
                <td class="col-check">
                  <input
                    type="checkbox"
                    :checked="checkedNorms.has(item.norm)"
                    @change="toggleCheck(item.norm)"
                  />
                </td>
                <td class="col-name">
                  {{ item.name }}
                  <span v-if="item.rawVariants > 1" class="tm-badge tm-badge-warn" title="同一标签存在不同大小写/写法">
                    ×{{ item.rawVariants }} 种写法
                  </span>
                  <span v-if="item.count === 0" class="tm-badge">未使用</span>
                </td>
                <td class="col-count">{{ item.count }}</td>
                <td class="col-actions">
                  <button class="tm-btn tm-btn-small" @click="openRenameDialog(item)">重命名</button>
                  <button class="tm-btn tm-btn-small tm-btn-danger" @click="openRemoveDialog(item)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else-if="!electronAvailable" class="tm-empty-page">
        标签索引需要在 Electron 环境中使用，请通过桌面客户端打开本页面。
      </div>
      <div v-else class="tm-empty-page">请在左侧选择一个字段查看标签</div>
    </main>

    <!-- 重命名 / 合并 对话框 -->
    <div v-if="dialog.visible" class="tm-modal-mask" @click.self="closeDialog">
      <div class="tm-modal">
        <h4>{{ dialog.mode === 'merge' ? '合并标签' : '重命名标签' }}</h4>
        <p class="tm-dialog-desc" v-if="dialog.mode === 'rename'">
          将「{{ dialog.sourceNames[0] }}」重命名为新名称，会同步修改所有引用它的资源。
        </p>
        <p class="tm-dialog-desc" v-else>
          将 {{ dialog.sourceNames.length }} 个标签合并为一个名称，会同步修改所有引用资源。
        </p>
        <input
          ref="dialogInput"
          v-model="dialog.targetName"
          class="tm-search"
          type="text"
          placeholder="输入新的标签名称"
          @keyup.enter="confirmDialog"
        />
        <div class="tm-modal-actions">
          <button class="tm-btn" @click="closeDialog">取消</button>
          <button class="tm-btn tm-btn-primary" :disabled="!dialog.targetName.trim() || dialog.busy" @click="confirmDialog">
            {{ dialog.busy ? '处理中…' : '确定' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="removeDialog.visible" class="tm-modal-mask" @click.self="closeRemoveDialog">
      <div class="tm-modal">
        <h4>删除标签</h4>
        <p class="tm-dialog-desc">
          确定删除标签「{{ removeDialog.name }}」吗？
          该标签将从 <strong>{{ removeDialog.count }}</strong> 个资源中移除，资源本身不会被删除。
        </p>
        <div class="tm-modal-actions">
          <button class="tm-btn" @click="closeRemoveDialog">取消</button>
          <button class="tm-btn tm-btn-danger" :disabled="removeDialog.busy" @click="confirmRemove">
            {{ removeDialog.busy ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { TAG_RESOURCE_REGISTRY } from '../configs/tagFields'
import { useTagIndex } from '../composables/useTagIndex'
import notify from '../utils/NotificationService'

const registry = TAG_RESOURCE_REGISTRY
const tagIndexStore = useTagIndex()
const electronAvailable = tagIndexStore.isAvailable()

const selectedType = ref('')
const selectedField = ref('')
const keyword = ref('')
const unusedOnly = ref(false)
const duplicatesOnly = ref(false)
const loading = ref(false)
const tags = ref<TagIndexManageItem[]>([])
const checkedNorms = reactive(new Set<string>())

let searchTimer: ReturnType<typeof setTimeout> | null = null
let offTagsRebuilt: (() => void) | null = null

const api = () => (window as any).electronAPI

async function loadTags() {
  if (!selectedType.value || !selectedField.value) return
  loading.value = true
  try {
    const res = await api().tagIndexList(selectedType.value, selectedField.value, {
      keyword: keyword.value.trim(),
      unusedOnly: unusedOnly.value,
      duplicatesOnly: duplicatesOnly.value,
      limit: 1000
    })
    if (res?.ok) {
      tags.value = res.data || []
    } else {
      notify.toast('error', '标签管理', res?.message || '加载标签失败')
    }
  } catch (err: any) {
    notify.toast('error', '标签管理', err?.message || '加载标签失败')
  } finally {
    loading.value = false
  }
}

function selectField(type: string, field: string) {
  selectedType.value = type
  selectedField.value = field
  checkedNorms.clear()
  loadTags()
}

watch([keyword, unusedOnly, duplicatesOnly], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadTags, 300)
})

function toggleCheck(norm: string) {
  if (checkedNorms.has(norm)) checkedNorms.delete(norm)
  else checkedNorms.add(norm)
}

// ===== 重命名 / 合并 =====
const dialog = reactive({
  visible: false,
  mode: 'rename' as 'rename' | 'merge',
  targetName: '',
  sourceNorms: [] as string[],
  sourceNames: [] as string[],
  busy: false
})

function openRenameDialog(item: TagIndexManageItem) {
  dialog.mode = 'rename'
  dialog.sourceNorms = [item.norm]
  dialog.sourceNames = [item.name]
  dialog.targetName = item.name
  dialog.busy = false
  dialog.visible = true
}

function openMergeDialog() {
  const norms = [...checkedNorms]
  if (norms.length < 2) return
  dialog.mode = 'merge'
  dialog.sourceNorms = norms
  dialog.sourceNames = norms.map(n => tags.value.find(t => t.norm === n)?.name || n)
  dialog.targetName = dialog.sourceNames[0]
  dialog.busy = false
  dialog.visible = true
}

function closeDialog() {
  dialog.visible = false
}

async function confirmDialog() {
  const targetName = dialog.targetName.trim()
  if (!targetName || dialog.busy) return
  dialog.busy = true
  try {
    const res = dialog.mode === 'rename'
      ? await api().tagIndexRename(selectedType.value, selectedField.value, dialog.sourceNorms[0], targetName)
      : await api().tagIndexMerge(selectedType.value, selectedField.value, dialog.sourceNorms, targetName)
    if (res?.ok) {
      notify.toast('success', '标签管理', `已同步 ${res.affected ?? 0} 个资源`)
      dialog.visible = false
      checkedNorms.clear()
      // 索引已通过 tags:rebuilt 广播刷新，这里再确保列表更新
      await tagIndexStore.reloadByTypes([selectedType.value])
      await loadTags()
    } else {
      notify.toast('error', '标签管理', res?.message || '操作失败')
    }
  } catch (err: any) {
    notify.toast('error', '标签管理', err?.message || '操作失败')
  } finally {
    dialog.busy = false
  }
}

// ===== 删除 =====
const removeDialog = reactive({
  visible: false,
  norm: '',
  name: '',
  count: 0,
  busy: false
})

function openRemoveDialog(item: TagIndexManageItem) {
  removeDialog.norm = item.norm
  removeDialog.name = item.name
  removeDialog.count = item.count
  removeDialog.busy = false
  removeDialog.visible = true
}

function closeRemoveDialog() {
  removeDialog.visible = false
}

async function confirmRemove() {
  removeDialog.busy = true
  try {
    const res = await api().tagIndexRemove(selectedType.value, selectedField.value, removeDialog.norm)
    if (res?.ok) {
      notify.toast('success', '标签管理', `已从 ${res.affected ?? 0} 个资源中移除标签`)
      removeDialog.visible = false
      checkedNorms.delete(removeDialog.norm)
      await tagIndexStore.reloadByTypes([selectedType.value])
      await loadTags()
    } else {
      notify.toast('error', '标签管理', res?.message || '删除失败')
    }
  } catch (err: any) {
    notify.toast('error', '标签管理', err?.message || '删除失败')
  } finally {
    removeDialog.busy = false
  }
}

// ===== 重建索引 =====
async function onRebuild() {
  try {
    notify.toast('info', '标签管理', '开始重建标签索引…')
    const res = await api().tagIndexRebuild()
    if (res?.ok) {
      notify.toast('success', '标签管理', `重建完成：${res.refCount ?? 0} 条引用，耗时 ${res.durationMs ?? 0}ms`)
      await tagIndexStore.reloadAll()
      await loadTags()
    } else {
      notify.toast('error', '标签管理', res?.message || '重建失败')
    }
  } catch (err: any) {
    notify.toast('error', '标签管理', err?.message || '重建失败')
  }
}

onMounted(() => {
  // 其它窗口/页面引发标签变更时刷新当前列表
  if (electronAvailable && api().onTagsRebuilt) {
    offTagsRebuilt = api().onTagsRebuilt((data: any) => {
      if (!selectedType.value) return
      if (!data?.resourceTypes || data.resourceTypes.includes(selectedType.value)) {
        loadTags()
      }
    })
  }
})

onBeforeUnmount(() => {
  offTagsRebuilt?.()
})
</script>

<style scoped>
.tag-manage-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg-primary);
}

.tm-sidebar {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 16px 12px;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.tm-title {
  margin: 0 0 16px;
  font-size: 1rem;
  color: var(--text-primary);
}

.tm-res-group {
  margin-bottom: 10px;
}

.tm-res-name {
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 6px 10px;
  font-weight: 600;
}

.tm-field-item {
  padding: 6px 10px 6px 22px;
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s ease;
}

.tm-field-item:hover {
  background: var(--bg-tertiary);
}

.tm-field-item.active {
  background: var(--accent-color);
  color: #fff;
}

.tm-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  overflow: hidden;
}

.tm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.tm-search {
  flex: 1;
  min-width: 220px;
  max-width: 360px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.tm-search:focus {
  outline: none;
  border-color: var(--accent-color);
}

.tm-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.tm-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tm-btn:hover {
  border-color: var(--accent-color);
}

.tm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tm-btn-small {
  padding: 3px 10px;
  font-size: 0.8rem;
  margin-right: 6px;
}

.tm-btn-primary {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

.tm-btn-danger {
  border-color: rgba(220, 53, 69, 0.5);
  color: #dc3545;
}

.tm-btn-danger:hover {
  background: #dc3545;
  color: #fff;
}

.tm-btn-warn {
  border-color: rgba(255, 193, 7, 0.6);
  color: #d39e00;
}

.tm-bulk-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.tm-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.tm-table-wrap {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.tm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.tm-table th,
.tm-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.tm-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  z-index: 1;
}

.col-check {
  width: 40px;
}

.col-count {
  width: 90px;
}

.col-actions {
  width: 170px;
  white-space: nowrap;
}

.tm-empty,
.tm-empty-page {
  text-align: center;
  color: var(--text-secondary);
  padding: 48px 20px !important;
}

.tm-empty-page {
  margin: auto;
  font-size: 0.9rem;
}

.tm-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.tm-badge-warn {
  background: rgba(255, 193, 7, 0.18);
  color: #d39e00;
}

.tm-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.tm-modal {
  width: 420px;
  max-width: 90vw;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 22px;
  box-shadow: 0 20px 40px var(--shadow-medium, rgba(0, 0, 0, 0.3));
}

.tm-modal h4 {
  margin: 0 0 12px;
  color: var(--text-primary);
}

.tm-dialog-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 14px;
}

.tm-modal .tm-search {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
}

.tm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
</style>
