<template>
  <div class="detail-card">
    <h3 v-if="title">{{ title }}</h3>
    <div class="detail-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DetailCard',
  props: {
    title: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.detail-card {
  background: var(--bg-secondary);
  padding: 50px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: box-shadow 0.3s ease;
}

.detail-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.detail-card h3 {
  font-size: 1.3rem;
  margin: 0 0 15px 0;
  color: var(--text-primary);
}

.detail-content {
  color: var(--text-secondary);
  line-height: 1.6;
}

.detail-content ul {
  margin: 0;
  padding-left: 20px;
}

.detail-content li {
  margin: 8px 0;
}

.detail-content strong {
  color: var(--text-primary);
}

/* 暗色主题适配 */
[data-theme="dark"] .detail-card:hover,
[data-theme="night"] .detail-card:hover,
[data-theme="night-ink"] .detail-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
</style>
