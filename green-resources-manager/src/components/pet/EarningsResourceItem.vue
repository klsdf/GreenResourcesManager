<template>
  <div class="earnings-block-wrapper">
    <div class="earnings-block">
      <div class="earnings-icon">{{ icon }}</div>
      <div class="earnings-info">
        <div class="earnings-label">{{ label }}</div>
        <div class="earnings-value" v-if="!isLoading">{{ count }}</div>
        <div class="earnings-value loading" v-else>{{ $lt('加载中...') }}</div>
      </div>
      <div class="earnings-hourly" v-if="hourlyEarnings !== undefined">
        <div class="hourly-label">{{ $lt('收益') }}</div>
        <div class="hourly-value" v-if="!isLoading">{{ hourlyEarnings }}{{ $lt('金币/小时') }}</div>
        <div class="hourly-value loading" v-else>{{ $lt('加载中...') }}</div>
      </div>
    </div>
    <EarningsProgressBar
      v-if="!isLoading"
      :last-earnings-time="lastEarningsTime"
      :current-time="currentTime"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import EarningsProgressBar from './EarningsProgressBar.vue'

const props = defineProps<{
  icon: string
  label: string
  count: number
  isLoading: boolean
  lastEarningsTime: string | null
  currentTime: number
  hourlyEarnings?: number
}>()

// 监听 currentTime 变化，用于调试
watch(() => props.currentTime, (newTime, oldTime) => {
  console.log(`[EarningsResourceItem:${props.label}] currentTime 变化:`, {
    oldTime,
    newTime,
    newTimeDate: new Date(newTime).toISOString(),
    diff: newTime - (oldTime || newTime)
  })
}, { immediate: true })
</script>

<style scoped>
.earnings-block-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.earnings-block {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px 8px 0 0;
  border-left: 3px solid #4a90e2;
  transition: all 0.2s;
  justify-content: space-between;
}

.earnings-block:hover {
  background: #f0f0f0;
  border-left-color: #357abd;
  transform: translateX(2px);
}

.earnings-icon {
  flex-shrink: 0;
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  border-radius: 12px;
}

.earnings-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.earnings-label {
  font-size: 13px;
  color: #666;
}

.earnings-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.earnings-value.loading {
  font-size: 14px;
  font-weight: normal;
  color: #999;
}

.earnings-hourly {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding-left: 20px;
  border-left: 1px solid #e0e0e0;
}

.hourly-label {
  font-size: 13px;
  color: #666;
}

.hourly-value {
  font-size: 18px;
  font-weight: bold;
  color: #4a90e2;
}

.hourly-value.loading {
  font-size: 14px;
  font-weight: normal;
  color: #999;
}
</style>

