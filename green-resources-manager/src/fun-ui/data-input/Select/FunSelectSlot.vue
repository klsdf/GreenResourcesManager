<template>
  <div class="fun-select" v-click-outside="close">
    <div class="select-trigger" @click="toggle">
      <input
          readonly
          :value="displayLabel"
          :placeholder="placeholder"
      />
    </div>

    <ul v-if="isOpen" class="select-dropdown">
      <slot></slot>
    </ul>
  </div>
</template>

<script setup>
import { ref, provide, toRef, watch, useSlots } from 'vue';

const props = defineProps(['modelValue', 'placeholder']);
const slots = useSlots();
const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const displayLabel = ref('');

const toggle = () => isOpen.value = !isOpen.value;
const close = () => isOpen.value = false;

// 核心逻辑：监听外部 v-model 的变化
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    displayLabel.value = '';
    return;
  }

  // 技巧：从插槽 VNode 中寻找对应的 label
  // 注意：这要求 fun-option 必须传入了 label 属性
  const children = slots.default?.() || [];

  // 递归或平铺查找匹配的 option (处理 v-for 产生的情况)
  const options = children.flatMap(vnode =>
      Array.isArray(vnode.children) ? vnode.children : vnode
  );

  const targetOption = options.find(opt => opt.props?.value === newVal);

  if (targetOption) {
    displayLabel.value = targetOption.props.label;
  }
}, { immediate: true }); // immediate 确保初始值也能被正确显示

// 向子组件暴露状态和方法
provide('selectContext', {
  modelValue: toRef(props, 'modelValue'),
  changeValue: (val, label) => {
    displayLabel.value = label;
    emit('update:modelValue', val);
    emit('change', val);
    close();
  }
});

// 自定义指令：点击外部关闭下拉框
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  }
};
</script>

<style scoped>
.fun-select { position: relative; width: 450px; }
.select-trigger input { width: 100%; padding: 8px; cursor: pointer; }
.select-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  width: 100%;
  border: 1px solid #ddd;
  background: #fff;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
}
</style>