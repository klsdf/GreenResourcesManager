<template>
  <div class="setting-item">
    <label class="setting-label">
      <span class="setting-title">{{ $lt(title) }}</span>
      <span class="setting-desc" v-if="description">{{ $lt(description) }}</span>
    </label>
    <div class="setting-control">
      <div class="file-input-group">
        <input 
          type="text" 
          :value="modelValue"
          :placeholder="$lt(placeholder)"
          class="setting-input"
          readonly
        >
        <button class="btn-browse" @click="handleBrowse">
          {{ $lt(browseButtonText) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SettingFilePicker',
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
    },
    placeholder: {
      type: String,
      default: '选择文件或目录'
    },
    browseButtonText: {
      type: String,
      default: '浏览'
    },
    pickerType: {
      type: String as () => 'file' | 'directory' | 'screenshots' | 'saveData' | 'executable' | 'image',
      default: 'directory'
    }
  },
  emits: ['update:modelValue', 'browse'],
  methods: {
    async handleBrowse() {
      try {
        let result: any = null
        
        // 调试信息
        console.log('SettingFilePicker handleBrowse:', {
          pickerType: this.pickerType,
          hasElectronAPI: !!window.electronAPI,
          hasSetSaveDataDirectory: !!window.electronAPI?.setSaveDataDirectory,
          hasSetScreenshotsDirectory: !!window.electronAPI?.setScreenshotsDirectory,
          hasSelectFolder: !!window.electronAPI?.selectFolder,
          hasSelectFile: !!window.electronAPI?.selectFile,
          hasSelectExecutableFile: !!window.electronAPI?.selectExecutableFile
        })
        
        if (this.pickerType === 'screenshots' && window.electronAPI?.setScreenshotsDirectory) {
          result = await window.electronAPI.setScreenshotsDirectory()
          if (result) {
            this.$emit('update:modelValue', result)
            this.$emit('browse', { type: 'screenshots', path: result })
          }
        } else if (this.pickerType === 'saveData' && window.electronAPI?.setSaveDataDirectory) {
          result = await window.electronAPI.setSaveDataDirectory()
          if (result && result.success) {
            this.$emit('update:modelValue', result.directory)
            this.$emit('browse', { type: 'saveData', result })
          } else if (result && !result.success) {
            // 如果 API 调用失败，显示错误信息
            console.error('设置存档目录失败:', result.error)
            alert(`设置存档目录失败: ${result.error || '未知错误'}`)
          }
        } else if (this.pickerType === 'directory' && window.electronAPI?.selectFolder) {
          // 修复：使用 selectFolder 而不是 selectDirectory
          result = await window.electronAPI.selectFolder()
          if (result && result.success) {
            this.$emit('update:modelValue', result.path)
            this.$emit('browse', { type: 'directory', path: result.path })
          } else if (result && !result.success) {
            console.error('选择目录失败:', result.error)
            alert(`选择目录失败: ${result.error || '未知错误'}`)
          }
        } else if (this.pickerType === 'file' && window.electronAPI?.selectFile) {
          result = await window.electronAPI.selectFile()
          if (result) {
            this.$emit('update:modelValue', result)
            this.$emit('browse', { type: 'file', path: result })
          }
        } else if (this.pickerType === 'executable' && window.electronAPI?.selectExecutableFile) {
          result = await window.electronAPI.selectExecutableFile()
          if (result) {
            this.$emit('update:modelValue', result)
            this.$emit('browse', { type: 'executable', path: result })
          }
        } else if (this.pickerType === 'image' && window.electronAPI?.selectImageFile) {
          result = await window.electronAPI.selectImageFile()
          if (result) {
            this.$emit('update:modelValue', result)
            this.$emit('browse', { type: 'image', path: result })
          }
        } else {
          // 提供更详细的错误信息
          const errorMsg = this.pickerType === 'saveData' 
            ? '当前环境不支持自定义存档功能。请确保在 Electron 环境中运行，并且 preload.js 已正确加载。'
            : '当前环境不支持选择文件/目录功能'
          console.error('选择文件/目录失败:', {
            pickerType: this.pickerType,
            hasElectronAPI: !!window.electronAPI,
            electronAPIKeys: window.electronAPI ? Object.keys(window.electronAPI) : []
          })
          alert(errorMsg)
        }
      } catch (error: any) {
        console.error('选择文件/目录失败:', error)
        alert('选择失败: ' + error.message)
      }
    }
  }
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

.file-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-input-group .setting-input {
  flex: 1;
  min-width: 200px;
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.setting-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-input:read-only {
  cursor: default;
  background: var(--bg-tertiary);
}

.btn-browse {
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-browse:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
</style>

