<template>
  <li
      class="option-item"
      :class="{ 'is-selected': isSelected }"
      @click="handleSelect"
  >
    <slot>{{ label }}</slot>
  </li>
</template>

<script setup>
import { inject, computed } from 'vue';

const props = defineProps({
  value: [String, Number, Object],
  label: String
});

// 注入父组件提供的方法和状态
const selectContext = inject('selectContext');

const isSelected = computed(() => {
  return selectContext.modelValue.value === props.value;
});

const handleSelect = () => {
  selectContext.changeValue(props.value, props.label);
};
</script>

<style scoped>
.option-item {
  padding: 8px 12px;
  cursor: pointer;
  list-style: none;
}
.option-item:hover { background-color: #f5f7fa; }
.is-selected { color: #409eff; font-weight: bold; }
</style>