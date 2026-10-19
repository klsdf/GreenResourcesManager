<template>
  <div class="fun-slider">
    <input 
      type="range" 
      :value="modelValue"
      @input="handleInput"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="fun-slider__input"
    >
    <span v-if="showValue" class="fun-slider__value">{{ formatValue(modelValue) }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 滑块值 */
  modelValue: number
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 步长 */
  step?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示值 */
  showValue?: boolean
  /** 单位 */
  unit?: string
  /** 自定义格式化函数 */
  format?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  showValue: true,
  unit: '',
  format: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function handleInput(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}

function formatValue(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    const defaultValue = props.min || 0
    return props.unit ? `${defaultValue} ${props.unit}` : String(defaultValue)
  }
  if (props.format) {
    return props.format(value)
  }
  return props.unit ? `${value} ${props.unit}` : String(value)
}
</script>

<style scoped lang="scss">
.fun-slider {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.fun-slider__input {
  width: 150px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    transition: var(--transition-base);
    
    &:hover {
      background: var(--accent-hover);
      transform: scale(1.1);
    }
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    border: none;
    transition: var(--transition-base);
    
    &:hover {
      background: var(--accent-hover);
      transform: scale(1.1);
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &::-webkit-slider-thumb,
    &::-moz-range-thumb {
      cursor: not-allowed;
    }
  }
}

.fun-slider__value {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  min-width: 50px;
  text-align: right;
}
</style>
