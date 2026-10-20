<template>
  <div class="earnings-progress">
    <div class="progress-info">
      <span class="progress-label">{{ $lt('距离下次收益') }}</span>
      <span class="progress-time">{{ timeUntilNextEarning }}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, toRefs } from 'vue'

const props = defineProps<{
  lastEarningsTime: string | null
  currentTime: number
}>()

// 监听 props 变化，用于调试
watch(() => props.currentTime, (newTime, oldTime) => {
  console.log('[EarningsProgressBar] currentTime prop 变化:', {
    oldTime,
    newTime,
    newTimeDate: new Date(newTime).toISOString(),
    diff: newTime - (oldTime || newTime)
  })
}, { immediate: true })

const EARNINGS_INTERVAL_MS = 60 * 60 * 1000 // 1小时（毫秒）

// 计算剩余时间（毫秒）
const timeRemaining = computed(() => {
  console.log('[EarningsProgressBar] 计算剩余时间:', {
    lastEarningsTime: props.lastEarningsTime,
    currentTime: props.currentTime,
    currentTimeDate: new Date(props.currentTime).toISOString()
  })
  
  if (!props.lastEarningsTime) {
    // 如果没有上次收益时间，使用当前时间作为基准，显示完整周期倒计时
    // 这样可以看到倒计时在减少，即使还没有设置lastEarningsTime
    console.log('[EarningsProgressBar] 没有上次收益时间，使用当前时间作为基准')
    return EARNINGS_INTERVAL_MS
  }
  const lastTime = new Date(props.lastEarningsTime).getTime()
  const elapsed = props.currentTime - lastTime
  
  if (elapsed < 0) {
    // 时间异常，返回完整周期
    console.log('[EarningsProgressBar] 时间异常，返回完整周期')
    return EARNINGS_INTERVAL_MS
  }
  
  const modulo = elapsed % EARNINGS_INTERVAL_MS
  // 如果模运算结果为0且已过去时间大于0，说明正好到了收益时间点，应该显示为0
  const remaining = modulo === 0 && elapsed > 0 ? 0 : EARNINGS_INTERVAL_MS - modulo
  const result = Math.max(0, remaining)
  console.log('[EarningsProgressBar] 剩余时间计算结果:', {
    lastTime,
    elapsed,
    modulo,
    remaining,
    result,
    resultSeconds: Math.floor(result / 1000)
  })
  return result
})

// 进度百分比（0-100）
const progressPercent = computed(() => {
  if (!props.lastEarningsTime) {
    // 如果没有上次收益时间，进度条保持0%
    return 0
  }
  const lastTime = new Date(props.lastEarningsTime).getTime()
  const elapsed = props.currentTime - lastTime
  
  if (elapsed < 0) {
    return 0
  }
  
  const modulo = elapsed % EARNINGS_INTERVAL_MS
  // 如果正好到了收益时间点，显示100%
  const progress = modulo === 0 && elapsed > 0 ? 1 : modulo / EARNINGS_INTERVAL_MS
  return Math.min(100, progress * 100)
})

// 格式化剩余时间显示（精确到秒）
const timeUntilNextEarning = computed(() => {
  const remaining = timeRemaining.value
  // 只有当剩余时间小于等于0或非常接近0（小于1秒）时，才显示"即将获得收益"
  if (remaining <= 0) {
    return '即将获得收益'
  }
  
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000)
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${seconds}秒`
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  } else {
    return `${seconds}秒`
  }
})
</script>

<style scoped>
.earnings-progress {
  padding: 12px 20px;
  background: #f9f9f9;
  border-radius: 0 0 8px 8px;
  border-left: 3px solid #4a90e2;
  border-top: 1px solid #e0e0e0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 13px;
  color: #666;
}

.progress-time {
  font-size: 13px;
  font-weight: bold;
  color: #4a90e2;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>

