<template>
  <div class="setting-item">
    <label class="setting-label">
      <span class="setting-title">{{ $lt(title) }}</span>
      <span class="setting-desc" v-if="description">{{ $lt(description) }}</span>
    </label>
    <div class="setting-control">
      <input 
        type="color" 
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="color-input"
      >
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingColorPicker',
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue']
}
</script>

<style scoped>
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--bg-tertiary);
  transition: border-color 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.color-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}
</style>

