<template>
  <label class="fun-switch">
    <input 
      type="checkbox" 
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
    <span class="fun-switch__slider"></span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  /** 开关状态 */
  modelValue: boolean
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
}
</script>

<style scoped lang="scss">
.fun-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.fun-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.fun-switch__slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: var(--transition-base);
  border-radius: 24px;
  
  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: var(--transition-base);
    border-radius: 50%;
  }
}

input:checked + .fun-switch__slider {
  background-color: var(--accent-color);
}

input:checked + .fun-switch__slider:before {
  transform: translateX(26px);
}

input:disabled + .fun-switch__slider {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
