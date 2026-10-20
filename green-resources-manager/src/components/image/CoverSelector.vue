<template>
  <div class="form-group">
    <label class="form-label">{{ label }}</label>
    <div class="cover-selection-container">
      <div class="cover-preview" v-if="cover">
        <img :src="coverImageSrc" :alt="'封面预览'" @error="handleImageError">
        <div class="cover-preview-info">
          <span class="cover-filename">{{ coverFileName }}</span>
        </div>
      </div>
      <div class="cover-actions">
        <button 
          type="button" 
          class="btn-cover-action" 
          @click="handleUseFirstImage" 
          :disabled="!folderPath"
        >
          <span class="btn-icon">🖼️</span> {{ $lt('使用第一张图片') }} </button>
        <button 
          type="button" 
          class="btn-cover-action" 
          @click="handleSelectFromFolder" 
          :disabled="!folderPath"
        >
          <span class="btn-icon">📂</span> {{ $lt('从文件夹选择') }} </button>
        <button 
          type="button" 
          class="btn-cover-action" 
          @click="handleBrowse"
        >
          <span class="btn-icon">📁</span> {{ $lt('选择自定义封面') }} </button>
        <button 
          type="button" 
          class="btn-cover-action btn-clear" 
          @click="handleClear" 
          v-if="cover"
        >
          <span class="btn-icon">🗑️</span> {{ $lt('清除封面') }} </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed } from 'vue'

export default {
  name: 'CoverSelector',
  props: {
    cover: {
      type: String,
      default: ''
    },
    folderPath: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: '封面图片 (可选)'
    },
    resolveCoverImage: {
      type: Function,
      required: true
    },
    getImageFileName: {
      type: Function,
      required: true
    },
    handleImageError: {
      type: Function,
      required: true
    }
  },
  emits: ['use-first-image', 'select-from-folder', 'browse', 'clear'],
  setup(props, { emit }) {
    const coverImageSrc = computed(() => {
      return props.cover ? props.resolveCoverImage(props.cover) : ''
    })

    const coverFileName = computed(() => {
      return props.cover ? props.getImageFileName(props.cover) : ''
    })

    const handleUseFirstImage = () => {
      emit('use-first-image')
    }

    const handleSelectFromFolder = () => {
      emit('select-from-folder')
    }

    const handleBrowse = () => {
      emit('browse')
    }

    const handleClear = () => {
      emit('clear')
    }

    return {
      coverImageSrc,
      coverFileName,
      handleUseFirstImage,
      handleSelectFromFolder,
      handleBrowse,
      handleClear
    }
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.cover-selection-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-preview {
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, #ddd);
  background: var(--bg-secondary, #f5f5f5);
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-preview-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 8px;
  color: white;
  font-size: 12px;
}

.cover-filename {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-cover-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cover-action:hover:not(:disabled) {
  background: var(--bg-hover, #f0f0f0);
  border-color: var(--border-hover, #bbb);
}

.btn-cover-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cover-action.btn-clear {
  color: var(--error-color, #e74c3c);
  border-color: var(--error-color, #e74c3c);
}

.btn-cover-action.btn-clear:hover:not(:disabled) {
  background: var(--error-color, #e74c3c);
  color: white;
}

.btn-icon {
  font-size: 16px;
}
</style>

