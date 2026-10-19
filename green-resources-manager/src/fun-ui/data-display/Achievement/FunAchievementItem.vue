<template>
  <div
    :class="[
      'fun-achievement-item',
      { 'fun-achievement-item--completed': achievement.unlocked, 'fun-achievement-item--in-progress': !achievement.unlocked }
    ]"
  >
    <div class="fun-achievement-item__icon">
      <span v-if="achievement.unlocked">🏆</span>
      <span v-else>🔒</span>
    </div>
    <div class="fun-achievement-item__info">
      <div class="fun-achievement-item__title">
        {{ displayTitle }}
        <span v-if="achievement.unlocked" class="fun-achievement-item__badge fun-achievement-item__badge--completed">已完成</span>
        <span v-else class="fun-achievement-item__badge fun-achievement-item__badge--in-progress">进行中</span>
      </div>
      <div class="fun-achievement-item__description">{{ displayDescription }}</div>
      <div
        v-if="achievement.kind === 'progress'"
        class="fun-achievement-item__progress"
      >
        <progress
          :value="achievement.current ?? 0"
          :max="achievement.target ?? 0"
          :title="progressTitle"
          class="fun-achievement-item__progress-bar"
        />
        <span class="fun-achievement-item__progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** 成就条目数据（与 AchievementView 中 Achievement 实例形状兼容） */
export interface AchievementItemData {
  id: string
  title: string
  description: string
  kind: 'progress' | 'trigger'
  unlocked: boolean
  current: number | null
  target: number | null
  isHidden?: boolean
  hiddenTip?: string
}

const props = defineProps<{
  /** 单条成就数据 */
  achievement: AchievementItemData
}>()

const displayTitle = computed(() => {
  const a = props.achievement
  if (a.isHidden && !a.unlocked) return '？？？'
  return a.title
})

const displayDescription = computed(() => {
  const a = props.achievement
  if (a.isHidden && !a.unlocked) return a.hiddenTip || '继续探索以解锁这个成就'
  return a.description
})

const progressTitle = computed(() => {
  const a = props.achievement
  if (a.kind !== 'progress' || a.target == null) return '进度: 0%'
  const safeCurrent = typeof a.current === 'number' ? a.current : 0
  if (a.target === 0) return '进度: 0%'
  const percent = Math.min(100, Math.round((safeCurrent / a.target) * 100))
  return `进度: ${percent}%`
})
</script>

<style scoped>
.fun-achievement-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.fun-achievement-item--completed {
  border-color: #4CAF50;
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(76, 175, 80, 0.05) 100%);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1);
}

.fun-achievement-item--completed::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
}

.fun-achievement-item--completed .fun-achievement-item__progress-bar::-webkit-progress-value {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

.fun-achievement-item--completed .fun-achievement-item__progress-bar::-webkit-progress-value::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
}

.fun-achievement-item--completed .fun-achievement-item__progress-bar::-moz-progress-bar {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

.fun-achievement-item--in-progress {
  border-color: var(--accent-color);
  background: linear-gradient(135deg, var(--bg-primary) 0%, rgba(var(--accent-color-rgb), 0.03) 100%);
  position: relative;
}

.fun-achievement-item--in-progress::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-color-light));
  opacity: 0.7;
}

.fun-achievement-item--in-progress .fun-achievement-item__progress-bar::-webkit-progress-value {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.fun-achievement-item--in-progress .fun-achievement-item__progress-bar::-webkit-progress-value::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: fun-achievement-item-shimmer 2s infinite;
}

.fun-achievement-item--in-progress .fun-achievement-item__progress-bar::-moz-progress-bar {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fun-achievement-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.fun-achievement-item__icon {
  font-size: 2rem;
  margin-right: 16px;
  min-width: 40px;
  text-align: center;
}

.fun-achievement-item__info {
  flex: 1;
  margin-right: 16px;
}

.fun-achievement-item__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fun-achievement-item__badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fun-achievement-item__badge--completed {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.fun-achievement-item__badge--in-progress {
  background: rgba(var(--accent-color-rgb), 0.1);
  color: var(--accent-color);
  border: 1px solid rgba(var(--accent-color-rgb), 0.3);
}

.fun-achievement-item__description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.fun-achievement-item__progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fun-achievement-item__progress-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  border: none;
  background: var(--border-color);
  -webkit-appearance: none;
  appearance: none;
}

.fun-achievement-item__progress-bar::-webkit-progress-bar {
  background: var(--border-color);
  border-radius: 4px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.fun-achievement-item__progress-bar::-webkit-progress-value {
  background: linear-gradient(90deg, var(--accent-color), var(--accent-color-light));
  border-radius: 4px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.fun-achievement-item__progress-bar::-webkit-progress-value::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: fun-achievement-item-shimmer 2s infinite;
}

.fun-achievement-item__progress-bar::-moz-progress-bar {
  background: linear-gradient(90deg, var(--accent-color), var(--accent-color-light));
  border-radius: 4px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fun-achievement-item-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.fun-achievement-item__progress-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 60px;
  text-align: right;
}
</style>
