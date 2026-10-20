<template>
  <section class="content-section">
    <div class="section-header">
      <h1 v-html="title"></h1>
      <p class="section-subtitle">{{ subtitle }}</p>
    </div>
    <p v-if="intro" class="module-intro">{{ intro }}</p>
    <div class="module-detail">
      <slot></slot>
    </div>
  </section>
</template>

<script lang="ts">
export default {
  name: 'HelpSection',
  props: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    intro: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.content-section {
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}

.section-header h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-weight: 700;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin: 0;
}

.module-intro {
  font-size: 1.1rem;
  color: var(--text-primary);
  line-height: 1.7;
  margin: 25px 0 35px 0;
  padding: 20px 25px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-left: 4px solid var(--accent-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  font-weight: 500;
}

.module-intro::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
}

.module-detail {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

@media (max-width: 768px) {
  .section-header h1 {
    font-size: 2rem;
  }
}

[data-theme="dark"] .module-intro,
[data-theme="night"] .module-intro,
[data-theme="night-ink"] .module-intro {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>

