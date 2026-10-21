<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-content scraper-dialog" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ $lt('刮削补全') }}</h3>
        <button class="btn-close" @click="handleCancel">✕</button>
      </div>
      <div class="modal-body">
        <p v-if="matches.length === 0" class="empty-hint">{{ $lt('未找到匹配的刮削数据') }}</p>
        <template v-else>
          <p class="match-summary">{{ $lt('找到') }} {{ matches.length }} {{ $lt('条匹配的刮削数据') }}{{ matches.length > 1 ? '，请选择一条应用' : '' }}</p>
          <div v-if="matches.length > 1" class="match-list">
            <label
              v-for="(m, idx) in matches"
              :key="m._id"
              class="match-item"
              :class="{ selected: selectedIndex === idx }"
            >
              <input type="radio" :value="idx" v-model="selectedIndex" />
              <span class="match-name">{{ getMatchName(m) }}</span>
              <span class="match-type">{{ getMatchTypeLabel(m.matchType) }}</span>
            </label>
          </div>
          <div v-else class="match-single">
            <span class="match-name">{{ getMatchName(matches[0]) }}</span>
            <span class="match-type">{{ getMatchTypeLabel(matches[0].matchType) }}</span>
          </div>
          <div v-if="selectedMatch" class="update-preview">
            <h4>{{ $lt('更新内容（将补全以下空字段）：') }}</h4>
            <div class="diff-list">
              <div
                v-for="entry in updateEntries"
                :key="entry.key"
                class="diff-row"
              >
                <span class="field-key">{{ entry.key }}</span>
                <span class="field-value">{{ formatValue(entry.value) }}</span>
              </div>
              <p v-if="updateEntries.length === 0" class="no-update">{{ $lt('主存档已有完整数据，无需更新') }}</p>
            </div>
          </div>
          <p class="update-question">{{ $lt('是否更新？') }}</p>
        </template>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleCancel">{{ $lt('取消') }}</button>
        <button
          class="btn-confirm"
          :disabled="matches.length === 0 || (selectedMatch && updateEntries.length === 0)"
          @click="handleConfirm"
        > {{ $lt('更新') }} </button>
      </div>
    </div>
  </div>
</template>

<script>
// 刮削数据专有字段，不写入主存档
const SCRAPER_ONLY_KEYS = ['resourceFileName', 'resourceFolderName']

export default {
  name: 'ScraperUpdateDialog',
  props: {
    visible: { type: Boolean, default: false },
    matches: { type: Array, default: () => [] },
    currentItem: { type: Object, default: null }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return { selectedIndex: 0 }
  },
  computed: {
    selectedMatch() {
      if (this.matches.length === 0) return null
      return this.matches[this.selectedIndex] ?? this.matches[0]
    },
    updateEntries() {
      if (!this.selectedMatch || !this.currentItem) return []
      let scraped
      try {
        scraped = typeof this.selectedMatch.jsonData === 'string'
          ? JSON.parse(this.selectedMatch.jsonData)
          : this.selectedMatch.jsonData
      } catch (e) {
        return []
      }
      const entries = []
      for (const [key, value] of Object.entries(scraped)) {
        if (key === 'id' || SCRAPER_ONLY_KEYS.includes(key)) continue
        const current = this.getCurrentValue(this.currentItem, key)
        const isEmpty = current === null || current === undefined || current === ''
        const hasNew = value !== null && value !== undefined && value !== ''
        if (isEmpty && hasNew) {
          entries.push({ key, value })
        }
      }
      return entries
    }
  },
  watch: {
    matches() {
      this.selectedIndex = 0
    }
  },
  methods: {
    getMatchName(m) {
      try {
        const d = typeof m.jsonData === 'string' ? JSON.parse(m.jsonData) : m.jsonData
        return d?.name || d?.resourcePath || `刮削 #${m._id}`
      } catch (e) {
        return `刮削 #${m._id}`
      }
    },
    getMatchTypeLabel(type) {
      const map = { name: '同名', folder: '同文件夹', 'name+folder': '同名+同文件夹' }
      return map[type] || ''
    },
    getCurrentValue(item, key) {
      if (!item) return undefined
      const v = item[key]
      if (v && typeof v === 'object' && 'value' in v) return v.value
      return v
    },
    formatValue(v) {
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
    },
    handleConfirm() {
      if (this.selectedMatch && this.updateEntries.length > 0) {
        this.$emit('confirm', this.selectedMatch)
      } else if (this.selectedMatch && this.updateEntries.length === 0) {
        this.$emit('cancel')
      }
    },
    handleCancel() {
      this.$emit('cancel')
    },
    handleOverlayMouseDown(event) {
      if (event.target === event.currentTarget) this.handleCancel()
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  max-width: 520px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-dark);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.modal-body { padding: 20px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}
.empty-hint { color: var(--text-secondary); margin: 0; }
.match-summary { margin: 0 0 12px 0; color: var(--text-primary); }
.match-list { margin-bottom: 16px; }
.match-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
}
.match-item:hover, .match-item.selected { background: var(--bg-secondary); }
.match-item input { cursor: pointer; }
.match-name { flex: 1; color: var(--text-primary); }
.match-type {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
}
.match-single {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 16px;
}
.update-preview { margin: 16px 0; }
.update-preview h4 { margin: 0 0 10px 0; font-size: 14px; color: var(--text-primary); }
.diff-list {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}
.diff-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.diff-row:last-child { margin-bottom: 0; }
.field-key { min-width: 100px; color: var(--text-secondary); }
.field-value {
  flex: 1;
  word-break: break-all;
  color: var(--text-primary);
}
.no-update { margin: 0; color: var(--text-secondary); font-size: 13px; }
.update-question { text-align: center; margin: 16px 0 0 0; font-weight: 500; color: var(--text-primary); }
.btn-cancel, .btn-confirm {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-confirm {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
}
.btn-confirm:hover:not(:disabled) { background: var(--accent-hover); }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
}
</style>
