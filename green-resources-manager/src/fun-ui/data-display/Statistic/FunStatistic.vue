<template>
  <div class="fun-statistic">
    <div v-if="icon" class="fun-statistic__icon">{{ icon }}</div>
    <div class="fun-statistic__content">
      <div class="fun-statistic__value">
        <span v-if="isLoading">...</span>
        <span v-else>{{ formattedValue }}</span>
        <span v-if="suffix" class="fun-statistic__suffix">{{ suffix }}</span>
      </div>
      <div v-if="label" class="fun-statistic__label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 数值（数字或字符串） */
  value: number | string
  /** 标签文本 */
  label?: string
  /** 图标 */
  icon?: string
  /** 后缀单位 */
  suffix?: string
  /** 是否加载中 */
  loading?: boolean
  /** 是否启用千分位格式化 */
  thousandSeparator?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  icon: '',
  suffix: '',
  loading: false,
  thousandSeparator: true
})

const isLoading = computed(() => props.loading)

// 格式化数值
const formattedValue = computed(() => {
  if (isLoading.value) {
    return '...'
  }

  const val = props.value

  // 如果已经是字符串（可能包含单位）
  if (typeof val === 'string') {
    // 检查是否已经是格式化后的字符串（包含单位，如 "1.5GB", "10小时", "1.2MB"）
    // 匹配：数字 + 可选小数 + 单位（字母或中文）
    const hasUnitPattern = /^\d+(\.\d+)?[a-zA-Z\u4e00-\u9fa5]+$/
    
    if (hasUnitPattern.test(val.trim())) {
      // 如果已经有单位，直接返回（不进行千分位格式化）
      return val
    }
    
    // 尝试转换为数字
    const num = parseFloat(val)
    if (isNaN(num)) {
      return val // 无法转换，直接返回原字符串
    }
    
    // 进行千分位格式化
    return props.thousandSeparator ? formatNumber(num) : num.toString()
  }

  // 数字类型，进行千分位格式化
  if (typeof val === 'number') {
    return props.thousandSeparator ? formatNumber(val) : val.toString()
  }

  return String(val)
})

// 千分位格式化
function formatNumber(num: number): string {
  // 如果是小数，保留小数部分
  if (!Number.isInteger(num)) {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }
  
  // 整数使用千分位
  return num.toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.fun-statistic {
  display: flex;
  align-items: center;
  flex: 1;
}

.fun-statistic__icon {
  font-size: 2rem;
  flex-shrink: 0;
  margin-right: 16px;
  opacity: 0.9;
  transition: transform 0.3s ease;
  min-width: 40px;
  text-align: center;
}

.fun-statistic__content {
  flex: 1;
  min-width: 0;
}

.fun-statistic__value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-color, #66c0f4);
  line-height: 1.2;
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.fun-statistic__suffix {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-secondary, #666666);
  margin-left: 2px;
}

.fun-statistic__label {
  font-size: 0.9rem;
  color: var(--text-secondary, #666666);
  font-weight: 500;
  line-height: 1.4;
}
</style>