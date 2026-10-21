<!--
  修改游玩记录的表单。
  跟「编辑信息」分开：那边改名字和介绍，这边只改时长、次数和时间。
  最上方的提醒一直放着，因为这个入口是用来补上使用软件之前的记录，不是拿来反复改存档的。
-->
<template>
  <div v-if="visible" class="archive-overlay" @click.self="close">
    <div class="archive-dialog" role="dialog" aria-modal="true">
      <div class="archive-header">
        <h3>{{ $lt('修改数据') }}</h3>
        <button type="button" class="archive-close" @click="close">×</button>
      </div>
      <div class="archive-body">
        <div class="archive-warning">
          <strong>{{ $lt('先看一眼') }}</strong>
          <p>{{ $lt('这些数字是你自己玩出来、看出来的记录。这里只适合补上使用这个软件之前就已经有的时长和次数。不建议拿它反复改数据。自己打出来的记录，才最值得珍惜。') }}</p>
        </div>
        <p v-if="playTimeLocked" class="archive-lock">
          {{ $lt('正在游玩时先不要改时长。结束之后再改，避免和这次正在计算的时长叠在一起。') }}
        </p>
        <p v-if="fields.length === 0" class="archive-empty">
          {{ $lt('这条资源没有可以改的记录。') }}
        </p>
        <template v-for="field in fields" :key="field.key">
        <div v-if="form[field.key] !== undefined" class="archive-field">
          <span class="archive-label">{{ $lt(field.label) }}</span>
          <div v-if="field.kind === 'duration'" class="archive-duration">
            <label>
              <input
                v-model.number="form[field.key].hours"
                type="number"
                min="0"
                :disabled="isDurationLocked(field.key)"
              />
              <span>{{ $lt('小时') }}</span>
            </label>
            <label>
              <input
                v-model.number="form[field.key].minutes"
                type="number"
                min="0"
                :disabled="isDurationLocked(field.key)"
              />
              <span>{{ $lt('分钟') }}</span>
            </label>
            <label v-if="field.durationUnit !== 'minutes'">
              <input
                v-model.number="form[field.key].seconds"
                type="number"
                min="0"
                :disabled="isDurationLocked(field.key)"
              />
              <span>{{ $lt('秒') }}</span>
            </label>
          </div>
          <input
            v-else-if="field.kind === 'count' || field.kind === 'percent'"
            v-model.number="form[field.key]"
            class="archive-input"
            type="number"
            min="0"
            :max="field.kind === 'percent' ? 100 : undefined"
          />
          <input
            v-else
            v-model="form[field.key]"
            class="archive-input"
            type="datetime-local"
          />
          <span v-if="field.hint" class="archive-hint">{{ $lt(field.hint) }}</span>
        </div>
        </template>
      </div>
      <div class="archive-footer">
        <button type="button" class="archive-cancel" @click="close">{{ $lt('取消') }}</button>
        <button type="button" class="archive-save" :disabled="fields.length === 0" @click="confirm">
          {{ $lt('保存修改') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  buildArchiveUpdates,
  collectArchiveStatFields,
  readArchiveStatForm,
  type ArchiveStatField
} from '../utils/archiveStatEditor'

const props = defineProps<{
  /** 是否打开这张表单 */
  visible: boolean
  /** 正在改的那条资源 */
  resource: any
  /** 游戏还在运行时，不允许改这一次正在累加的时长 */
  playTimeLocked: boolean
}>()

const emit = defineEmits<{
  /** 关掉表单，不保存 */
  close: []
  /** 把整理好的更新交回去保存 */
  confirm: [updates: Record<string, unknown>]
}>()

/** 这一条资源在详情里实际有的记录项 */
const fields = computed<ArchiveStatField[]>(() => (props.resource ? collectArchiveStatFields(props.resource) : []))

/** 表单当前值。打开时从资源上抄一份，确认时再写回去。 */
const form = reactive<Record<string, any>>({})

/**
 * 判断这一项时长是不是因为游戏还在运行而不能改。
 * @param key 字段名
 * @returns 需要锁住时为 true
 */
function isDurationLocked(key: string): boolean {
  return props.playTimeLocked && key === 'playTime'
}

/**
 * 用资源上的现有记录填表单。
 * 每次打开都重新抄，避免上次没保存的输入留在下一回。
 */
function loadForm() {
  for (const key of Object.keys(form)) delete form[key]
  if (!props.resource) return
  const next = readArchiveStatForm(props.resource, fields.value)
  for (const key of Object.keys(next)) form[key] = next[key]
}

/**
 * 关掉表单。
 */
function close() {
  emit('close')
}

/**
 * 整理表单并交给外面保存。
 * 正在运行的时长在这里丢掉，其余记录照常提交。
 */
function confirm() {
  if (!props.resource || fields.value.length === 0) return
  const updates = buildArchiveUpdates(props.resource, fields.value, form, {
    lockPlayTime: props.playTimeLocked
  })
  emit('confirm', updates)
}

watch(
  () => [props.visible, props.resource] as const,
  () => {
    if (props.visible) loadForm()
  },
  { immediate: true }
)
</script>

<style scoped>
.archive-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.archive-dialog {
  width: 560px;
  max-width: 92vw;
  max-height: 88vh;
  overflow: auto;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 12px;
  box-shadow: 0 20px 40px var(--shadow-medium);
}

.archive-header,
.archive-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.archive-header {
  border-bottom: 1px solid var(--border-color);
}

.archive-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.archive-close {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.4rem;
  cursor: pointer;
}

.archive-body {
  padding: 16px 20px 4px;
}

.archive-warning {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(214, 158, 46, 0.16);
  border: 1px solid rgba(214, 158, 46, 0.5);
  line-height: 1.6;
}

.archive-warning strong {
  display: block;
  margin-bottom: 4px;
}

.archive-warning p,
.archive-lock,
.archive-empty {
  margin: 0;
}

.archive-lock {
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.archive-empty {
  margin-bottom: 12px;
}

.archive-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.archive-label {
  font-weight: 600;
}

.archive-duration {
  display: flex;
  gap: 12px;
}

.archive-duration label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.archive-input,
.archive-duration input {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
}

.archive-input {
  width: 100%;
}

.archive-duration input {
  width: 88px;
}

.archive-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.archive-footer {
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
}

.archive-cancel,
.archive-save {
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

.archive-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.archive-save {
  background: var(--accent-color);
  color: white;
  border: none;
}

.archive-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
