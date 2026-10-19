<template>
  <div class="fun-loading">
    <div class="fun-loading__spinner"></div>
    <p v-if="text" class="fun-loading__text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 加载提示文本 */
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: '正在加载...'
})
</script>

<style scoped lang="scss">
.fun-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.fun-loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: fun-loading-spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes fun-loading-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fun-loading__text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
  transition: color 0.3s ease;
}
</style>
