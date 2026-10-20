<template>
  <div class="setting-item">
    <label class="setting-label">
      <span class="setting-title">{{ $lt(title) }}</span>
      <span class="setting-desc" v-if="description">{{ $lt(description) }}</span>
    </label>
    <div class="setting-control">
      <fun-switch :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingToggle',
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
      type: Boolean,
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

</style>

