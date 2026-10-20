<template>
  <div id="input-container" class="pet-input-container">
    <button id="menu-button" class="menu-button" :title="$lt('菜单')" @click="handleMenuClick">☰</button>
    <input
      type="text"
      id="chat-input"
      class="chat-input"
      :placeholder="$lt('输入消息...')"
      v-model="inputValue"
      @keydown="handleKeyDown"
      @mousedown.stop
    />
    <button id="send-button" class="send-button" :title="$lt('发送')" @click="handleSend" @mousedown.stop">➤</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  send: [message: string]
  menuClick: []
}>()

const inputValue = ref('')

function handleSend() {
  const message = inputValue.value.trim()
  if (message) {
    emit('send', message)
    inputValue.value = ''
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    handleSend()
  }
}

function handleMenuClick() {
  emit('menuClick')
}
</script>

<style scoped>
.pet-input-container {
  position: absolute;
  bottom: 0;
  left: 500px;
  width: 300px;
  height: 50px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 8px;
  box-sizing: border-box;
  z-index: 100;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  gap: 8px;
}

.chat-input {
  flex: 1;
  height: 32px;
  border: 1px solid #d0d0d0;
  border-radius: 16px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  background: #f5f5f5;
  color: #333;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.chat-input:focus {
  border-color: #4a90e2;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.chat-input::placeholder {
  color: #999;
}

.send-button {
  width: 36px;
  height: 36px;
  border: none;
  background: #4a90e2;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.send-button:hover {
  background: #357abd;
  transform: scale(1.05);
}

.send-button:active {
  transform: scale(0.95);
}

.menu-button {
  width: 36px;
  height: 36px;
  background: rgba(74, 144, 226, 0.9);
  border: 2px solid #4a90e2;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.menu-button:hover {
  background: rgba(74, 144, 226, 1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>

