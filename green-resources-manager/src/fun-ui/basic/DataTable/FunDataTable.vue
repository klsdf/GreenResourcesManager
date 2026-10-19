<template>
  <div class="fun-data-table">
    <div class="fun-data-table__wrap">
      <table class="fun-data-table__table" :data-editable="editable">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" :class="col.className">
              {{ col.label || col.key }}
            </th>
            <th v-if="showActions" class="fun-data-table__action-column">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in data" :key="getRowKey(row, idx)">
            <td 
              v-for="col in columns" 
              :key="col.key" 
              :class="['fun-data-table__cell', col.cellClassName, { 'fun-data-table__cell--editing': isEditing(row, col.key) }]"
              @dblclick="editable && handleCellDoubleClick(row, col.key, idx)"
            >
              <template v-if="editable && isEditing(row, col.key)">
                <FunInput
                  v-if="!editingIsMultiline"
                  ref="editInputRef"
                  v-model="editingValue"
                  class="fun-data-table__edit-input"
                  @blur="handleCellBlur(row, col.key, idx)"
                  @keydown.enter="handleCellBlur(row, col.key, idx)"
                  @keydown.esc="handleCellCancel(row, col.key, idx)"
                  autofocus
                />
                <textarea
                  v-else
                  ref="editTextareaRef"
                  v-model="editingValue"
                  class="fun-data-table__edit-input fun-data-table__edit-textarea"
                  @blur="handleCellBlur(row, col.key, idx)"
                  @keydown.esc="handleCellCancel(row, col.key, idx)"
                  rows="6"
                />
              </template>
              <template v-else-if="$slots.cell">
                <slot name="cell" :value="row[col.key]" :row="row" :column="col" />
              </template>
              <slot
                v-else
                :name="`cell-${col.key}`"
                :row="row"
                :value="row[col.key]"
                :column="col"
                :editing="isEditing(row, col.key)"
              >
                {{ formatCellValue(row[col.key], col) }}
              </slot>
            </td>
            <td v-if="showActions" class="fun-data-table__action-cell">
              <slot name="actions" :row="row" :index="idx">
                <button
                  v-if="showDelete"
                  type="button"
                  class="fun-data-table__btn-delete"
                  @click="handleDelete(row, idx)"
                  :title="deleteTitle"
                >
                  🗑️
                </button>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import FunInput from '../Input/FunInput.vue'

interface Column {
  /** 列的唯一标识（对应数据字段名） */
  key: string
  /** 列标题 */
  label?: string
  /** 列头 CSS 类名 */
  className?: string
  /** 单元格 CSS 类名 */
  cellClassName?: string
  /** 自定义格式化函数 */
  formatter?: (value: any, row: any) => string
}

interface Props {
  /** 表格数据 */
  data: Array<Record<string, any>>
  /** 列配置 */
  columns?: Column[]
  /** 是否显示操作列 */
  showActions?: boolean
  /** 是否显示删除按钮 */
  showDelete?: boolean
  /** 删除按钮标题 */
  deleteTitle?: string
  /** 行键生成函数 */
  rowKey?: string | ((row: any, index: number) => string | number)
  /** 默认单元格格式化函数 */
  defaultFormatter?: (value: any) => string
  /** 是否可编辑 */
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  columns: undefined,
  showActions: false,
  showDelete: false,
  deleteTitle: '删除此记录',
  rowKey: undefined,
  defaultFormatter: undefined,
  editable: false
})

const emit = defineEmits<{
  delete: [row: any, index: number]
  'cell-edit': [row: any, column: string, newValue: any, oldValue: any, index: number]
}>()

// 编辑状态管理
const editingCell = ref<{ rowKey: string | number, column: string } | null>(null)
const editingValue = ref<string>('')
const editingOldValue = ref<any>(null)
const editingIsMultiline = ref(false)
const editInputRef = ref<InstanceType<typeof FunInput> | null>(null)
const editTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 如果没有提供 columns，从数据中自动提取
const columns = computed<Column[]>(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns
  }
  
  // 从数据中提取列
  if (props.data.length === 0) {
    return []
  }
  
  const firstRow = props.data[0]
  return Object.keys(firstRow).map(key => ({
    key,
    label: key
  }))
})

// 获取行的唯一键
const getRowKey = (row: any, index: number): string | number => {
  if (typeof props.rowKey === 'string') {
    return row[props.rowKey] ?? index
  }
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row, index)
  }
  // 默认使用 id 字段或索引
  return row.id ?? row.key ?? index
}

// 格式化单元格值
const formatCellValue = (value: any, column: Column): string => {
  // 优先使用列的自定义格式化函数
  if (column.formatter) {
    return column.formatter(value, {})
  }
  
  // 使用默认格式化函数
  if (props.defaultFormatter) {
    return props.defaultFormatter(value)
  }
  
  // 默认格式化逻辑
  if (value === null || value === undefined) {
    return ''
  }
  // 如果是数组或对象，转为 JSON 字符串
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  // 其他类型直接转为字符串
  return String(value)
}

// 处理删除
const handleDelete = (row: any, index: number) => {
  emit('delete', row, index)
}

// 检查单元格是否正在编辑
const isEditing = (row: any, column: string): boolean => {
  if (!editingCell.value) return false
  const rowKey = getRowKey(row, -1)
  return editingCell.value.rowKey === rowKey && editingCell.value.column === column
}

// 处理单元格双击
const handleCellDoubleClick = async (row: any, column: string, index: number) => {
  if (!props.editable) return
  
  const rowKey = getRowKey(row, index)
  const value = row[column]
  
  // 保存原始值
  editingOldValue.value = value
  editingValue.value = formatCellValue(value, columns.value.find(c => c.key === column) || { key: column })
  editingIsMultiline.value = editingValue.value.includes('\n')
  editingCell.value = { rowKey, column }
  
  // 等待下一个 tick 后聚焦输入框/文本框（ref 在 v-for 内会变成数组，需取首个元素）
  await nextTick()
  setTimeout(() => {
    if (editingIsMultiline.value && editTextareaRef.value) {
      const textareaEl = Array.isArray(editTextareaRef.value)
        ? editTextareaRef.value[0]
        : editTextareaRef.value
      if (textareaEl && typeof textareaEl.focus === 'function') {
        textareaEl.focus()
        textareaEl.select()
      }
    } else if (editInputRef.value) {
      const inputRef = Array.isArray(editInputRef.value) ? editInputRef.value[0] : editInputRef.value
      const inputEl = inputRef?.$el as HTMLInputElement | undefined
      if (inputEl && typeof inputEl.focus === 'function') {
        inputEl.focus()
        inputEl.select()
      }
    }
  }, 0)
}

// 处理单元格失去焦点
const handleCellBlur = (row: any, column: string, index: number) => {
  if (!editingCell.value || !isEditing(row, column)) return
  
  const newValue = editingValue.value
  const oldValue = editingOldValue.value
  
  // 如果值没有变化，直接清除编辑状态
  if (newValue === formatCellValue(oldValue, columns.value.find(c => c.key === column) || { key: column })) {
    editingCell.value = null
    editingValue.value = ''
    editingOldValue.value = null
    return
  }
  
  // 触发编辑事件，让父组件处理保存逻辑
  emit('cell-edit', row, column, newValue, oldValue, index)
  
  // 清除编辑状态（父组件会通过刷新数据来更新显示）
  editingCell.value = null
  editingValue.value = ''
  editingOldValue.value = null
}

// 处理取消编辑（ESC 键）
const handleCellCancel = (row: any, column: string, index: number) => {
  editingCell.value = null
  editingValue.value = ''
  editingOldValue.value = null
}
</script>

<style scoped lang="scss">
.fun-data-table {
  width: 100%;
}

.fun-data-table__wrap {
  overflow: auto;
  width: 100%;
}

.fun-data-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.fun-data-table__table th,
.fun-data-table__table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.fun-data-table__table th {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-weight: 600;
}

.fun-data-table__table td {
  color: var(--text-primary);
  transition: background 0.15s ease;
}

/* 行级高亮 */
.fun-data-table__table tbody tr:hover td {
  background: var(--bg-tertiary);
}

/* 单元格级高亮：当前悬停的单元格更亮 */
.fun-data-table__table tbody tr:hover td:hover {
  background: color-mix(in srgb, var(--accent-color, #4a90e2) 14%, var(--bg-tertiary));
}

.fun-data-table__cell {
  max-width: 300px;
  word-break: break-word;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  position: relative;
}

.fun-data-table__table[data-editable="true"] .fun-data-table__cell:not(.fun-data-table__action-cell) {
  cursor: text;
}

.fun-data-table__table[data-editable="true"] .fun-data-table__cell:not(.fun-data-table__action-cell):hover {
  background: color-mix(in srgb, var(--accent-color, #4a90e2) 8%, transparent) !important;
}

.fun-data-table__cell--editing {
  padding: 0;
}

.fun-data-table__edit-input {
  width: 100%;
  min-width: 150px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  border: 2px solid var(--accent-color, #4a90e2);
  border-radius: var(--radius-sm);
  outline: none;
}

.fun-data-table__cell--editing .fun-data-table__edit-input {
  margin: -2px;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.fun-data-table__edit-textarea {
  height: 800px;
  min-height: 120px;
  resize: vertical;
  display: block;
}

.fun-data-table__action-column {
  width: 80px;
  text-align: center;
  min-width: 80px;
}

.fun-data-table__action-cell {
  text-align: center;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.fun-data-table__btn-delete {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.fun-data-table__btn-delete:hover {
  background: var(--error-color, #e74c3c);
  color: #fff;
  transform: scale(1.1);
}

.fun-data-table__btn-delete:active {
  transform: scale(0.95);
}
</style>
