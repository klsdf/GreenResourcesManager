<template>
  <div v-if="isVisible" id="dialog" class="pet-dialog show">
    <button id="dialog-close" class="dialog-close" :title="$lt('关闭')" @click="handleClose">×</button>
    <div id="dialog-text" class="dialog-text">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean
  text: string
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.pet-dialog {
  position: absolute;
  top: 20px;
  left: 650px; /* 500px 菜单 + 150px（主区域中心） */
  transform: translateX(-50%);
  min-width: 200px;
  max-width: 280px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #4a90e2;
  border-radius: 12px;
  padding: 12px 16px;
  padding-top: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: none;
  z-index: 1000;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  animation: fadeIn 0.3s ease;
}

.pet-dialog.show {
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.dialog-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  word-wrap: break-word;
}

.dialog-close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

/* 对话框箭头（指向下方的桌宠） */
.pet-dialog::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #4a90e2;
}

.pet-dialog::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(255, 255, 255, 0.95);
}
</style>

