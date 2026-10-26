<template>
  <span class="batch-import__file-type-icon" :class="`batch-import__file-type-icon--${kind}`" aria-hidden="true">
    <img v-if="kind === 'app' && icon" :src="icon" alt="" />
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="kind === 'app'">
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <path d="M3 8.5h18" />
        <circle cx="6.2" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </template>
      <template v-else-if="kind === 'archive'">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M4 7.5 12 12l8-4.5M12 12v9" />
        <path d="M12 3v4.5" />
      </template>
      <template v-else-if="kind === 'terminal'">
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <path d="m7.5 9.5 3 2.5-3 2.5M13 14.5h3.5" />
      </template>
      <template v-else-if="kind === 'flash'">
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <path d="M10 9.2v5.6l4.4-2.8z" fill="currentColor" stroke="none" />
      </template>
      <template v-else-if="kind === 'image'">
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.3" />
        <path d="m4.5 17 4-4 3 3 2.5-2.5L19.5 17" />
      </template>
      <template v-else-if="kind === 'video'">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M10 9.2v5.6l4.4-2.8z" fill="currentColor" stroke="none" />
      </template>
      <template v-else-if="kind === 'audio'">
        <path d="M9.5 17.5V6.8l9-1.8v10.4" />
        <circle cx="7" cy="17.5" r="2.5" />
        <circle cx="16" cy="15.4" r="2.5" />
      </template>
      <template v-else-if="kind === 'novel'">
        <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v16H6.5A1.5 1.5 0 0 1 5 18.5z" />
        <path d="M8.5 4v16" />
      </template>
      <template v-else-if="kind === 'folder'">
        <path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </template>
      <template v-else>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </template>
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getFileIconKind } from '../utils/fileIcon'

const props = withDefaults(defineProps<{
  /** 搜索结果的相对路径。 */
  file: string
  /** exe/lnk 取到的程序图标 data URL。取不到时显示内置图标。 */
  icon?: string
  /** 文件夹模式的结果用文件夹图标，不再按扩展名猜。 */
  folder?: boolean
}>(), {
  icon: '',
  folder: false
})

/** 文件夹模式固定用文件夹图标。文件模式仍按扩展名选。 */
const kind = computed(() => props.folder ? 'folder' : getFileIconKind(props.file))
</script>

<style scoped lang="scss">
.batch-import__file-type-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);

  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  &--app {
    color: var(--accent-color);
  }

  &--archive {
    color: #d97706;
  }

  &--terminal {
    color: #16a34a;
  }

  &--flash {
    color: #dc2626;
  }

  &--image {
    color: #0891b2;
  }

  &--video {
    color: #7c3aed;
  }

  &--audio {
    color: #db2777;
  }

  &--novel {
    color: #2563eb;
  }
}
</style>
