<template>
  <section
    :class="['changelog-entry', { 'changelog-entry--latest': highlightAsLatest }]"
  >
    <div class="changelog-entry-header">
      <span class="changelog-version">{{ entry.version }}</span>
      <span v-if="entry.date" class="changelog-date">{{ entry.date }}</span>
    </div>
    <!-- 注意事项（置顶） -->
    <div v-if="entry.notice" class="changelog-notice-block">
      <h4 class="changelog-block-title notice">{{ $lt('注意事项') }}</h4>
      <p class="changelog-notice-text">{{ entry.notice }}</p>
    </div>
    <!-- 按模块展示：重构、新功能、体验优化、bug 修复 -->
    <template v-if="hasVersionBlocks">
      <div v-if="entry.refactor?.length" class="changelog-block">
        <h4 class="changelog-block-title refactor">{{ $lt('重构') }}</h4>
        <ul class="changelog-items">
          <li v-for="(item, i) in entry.refactor" :key="'r-' + i">{{ item }}</li>
        </ul>
      </div>
      <div v-if="entry.features?.length" class="changelog-block">
        <h4 class="changelog-block-title features">{{ $lt('新功能') }}</h4>
        <ul class="changelog-items">
          <li v-for="(item, i) in entry.features" :key="'f-' + i">{{ item }}</li>
        </ul>
      </div>
      <div v-if="entry.experience?.length" class="changelog-block">
        <h4 class="changelog-block-title experience">{{ $lt('体验优化') }}</h4>
        <ul class="changelog-items">
          <li v-for="(item, i) in entry.experience" :key="'e-' + i">{{ item }}</li>
        </ul>
      </div>
      <div v-if="entry.bugfixes?.length" class="changelog-block">
        <h4 class="changelog-block-title bugfixes">{{ $lt('bug 修复') }}</h4>
        <ul class="changelog-items">
          <li v-for="(item, i) in entry.bugfixes" :key="'b-' + i">{{ item }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChangelogEntry } from '../data/changelog'

const props = withDefaults(
  defineProps<{
    entry: ChangelogEntry
    highlightAsLatest?: boolean
  }>(),
  { highlightAsLatest: false }
)

function checkHasVersionBlocks(entry: ChangelogEntry): boolean {
  return !!(
    entry.refactor?.length ||
    entry.features?.length ||
    entry.experience?.length ||
    entry.bugfixes?.length
  )
}

const hasVersionBlocks = computed(() => checkHasVersionBlocks(props.entry))
</script>

<style scoped>
.changelog-entry {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}
.changelog-entry--latest {
  border-color: var(--color-primary, #0ea5e9);
  box-shadow: 0 0 0 1px var(--color-primary, #0ea5e9), 0 0 12px rgba(14, 165, 233, 0.25);
  animation: changelog-entry-glow 2.5s ease-in-out infinite;
}
@keyframes changelog-entry-glow {
  0%,
  100% {
    box-shadow: 0 0 0 1px var(--color-primary, #0ea5e9), 0 0 12px rgba(14, 165, 233, 0.25);
  }
  50% {
    box-shadow: 0 0 0 2px var(--color-primary, #0ea5e9), 0 0 20px rgba(14, 165, 233, 0.4);
  }
}
.changelog-entry-header {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}
.changelog-version {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}
.changelog-date {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.changelog-block {
  margin-bottom: var(--spacing-md);
}
.changelog-block:last-child {
  margin-bottom: 0;
}
.changelog-block-title {
  margin: 0.75em 0 0.35em 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.changelog-block-title.refactor {
  color: var(--changelog-refactor, #8b5cf6);
}
.changelog-block-title.features {
  color: var(--changelog-features, #22c55e);
}
.changelog-block-title.experience {
  color: var(--changelog-experience, #0ea5e9);
}
.changelog-block-title.bugfixes {
  color: var(--changelog-bugfixes, #ef4444);
}
.changelog-block-title.notice {
  color: var(--text-primary);
}
.changelog-items {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
}
.changelog-items li {
  margin-bottom: 0.25em;
}

.changelog-notice-block {
  margin-bottom: 1em;
  padding-bottom: 0.75em;
  border-bottom: 1px solid var(--border-color);
}
.changelog-notice-text {
  margin: 0.35em 0 0;
  font-size: 0.95rem;
  color: rgb(255, 73, 73);
  white-space: pre-wrap;
}
</style>
