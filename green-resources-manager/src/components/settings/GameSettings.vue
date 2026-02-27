<template>
  <div class="settings-section">
    <div class="settings-grid">
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">截图快捷键</span>
          <span class="setting-desc">设置截图功能的快捷键（如: Ctrl+Shift+S）</span>
        </label>
        <div class="setting-control">
          <FunShortcutInput
            v-model="settings.screenshotKey"
            :default-shortcut="'Ctrl+F12'"
          />
        </div>
      </div>
      
      <SettingSelect
        title="截图保存位置"
        description="选择截图的保存位置"
        :model-value="settings.screenshotLocation"
        :options="screenshotLocationOptions"
        @update:model-value="onScreenshotLocationChange"
      />
      
      <SettingFilePicker
        v-if="settings.screenshotLocation === 'custom'"
        title="自定义截图目录"
        description="选择自定义的截图保存目录"
        :model-value="settings.screenshotsPath"
        placeholder="选择截图保存目录"
        picker-type="screenshots"
        @update:model-value="updateSetting('screenshotsPath', $event)"
        @browse="handleScreenshotsBrowse"
      />
      
      <SettingSelect
        title="截图格式"
        description="选择截图的保存格式"
        :model-value="settings.screenshotFormat"
        :options="screenshotFormatOptions"
        @update:model-value="updateSetting('screenshotFormat', $event)"
      />
      
      <SettingSlider
        title="截图质量"
        description="设置截图的压缩质量 (1-100)"
        :model-value="settings.screenshotQuality"
        :min="1"
        :max="100"
        unit="%"
        @update:model-value="updateSetting('screenshotQuality', $event)"
      />
      
      <SettingToggle
        title="显示截图通知"
        description="截图完成后显示系统通知"
        :model-value="settings.screenshotNotification"
        @update:model-value="updateSetting('screenshotNotification', $event)"
      />
      
      <SettingToggle
        title="自动打开截图文件夹"
        description="截图完成后自动打开保存文件夹"
        :model-value="settings.autoOpenScreenshotFolder"
        @update:model-value="updateSetting('autoOpenScreenshotFolder', $event)"
      />
      
      <SettingToggle
        title="智能窗口检测"
        description="自动检测游戏窗口进行截图"
        :model-value="settings.smartWindowDetection"
        @update:model-value="updateSetting('smartWindowDetection', $event)"
      />
      
      <SettingToggle
        title="使用内置Flash播放器"
        description="使用应用内置的Flash播放器来运行Flash游戏"
        :model-value="settings.useBuiltInFlashPlayer !== false"
        @update:model-value="onUseBuiltInFlashPlayerChange"
      />
      
      <SettingFilePicker
        v-if="settings.useBuiltInFlashPlayer === false"
        title="自定义Flash播放器"
        description="选择自定义的Flash播放器可执行文件"
        :model-value="settings.customFlashPlayerPath || ''"
        placeholder="选择Flash播放器exe文件"
        picker-type="executable"
        @update:model-value="updateSetting('customFlashPlayerPath', $event)"
        @browse="handleFlashPlayerBrowse"
      />
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">转区工具</span>
          <span class="setting-desc">指定转区工具可执行文件路径（如 Locale Emulator 的 LEProc.exe），用于以指定区域/语言运行程序</span>
        </label>
        <div class="setting-control">
          <div class="file-input-group">
            <input
              type="text"
              :value="(settings.game && settings.game.localeEmulatorPath) || ''"
              placeholder="选择转区工具 exe 或点击自动识别"
              class="setting-input"
              readonly
            >
            <button class="btn-browse" @click="handleLocaleEmulatorBrowse">浏览</button>
            <button class="btn-detect" @click="handleLocaleEmulatorDetect">自动识别</button>
          </div>
        </div>
      </div>
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">打开截图文件夹</span>
          <span class="setting-desc">在文件管理器中打开截图保存文件夹</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-screenshot-folder" @click="openScreenshotFolder">
            <span class="btn-icon">📸</span>
            打开文件夹
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import notify from '../../utils/NotificationService'
import alertService from '../../utils/AlertService.ts'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'
import SettingFilePicker from './SettingFilePicker.vue'
import FunShortcutInput from '../../fun-ui/data-input/ShortcutInput/FunShortcutInput.vue'

export default {
  name: 'GameSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingSlider,
    SettingFilePicker,
    FunShortcutInput
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings', 'action'],
  data() {
    return {
      screenshotLocationOptions: [
        { value: 'default', label: '默认目录 (SaveData/Game/Screenshots)' },
        { value: 'custom', label: '自定义目录' }
      ],
      screenshotFormatOptions: [
        { value: 'png', label: 'PNG' },
        { value: 'jpg', label: 'JPG' },
        { value: 'webp', label: 'WebP' }
      ]
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    async onScreenshotKeyChange(newKey: string) {
      this.updateSetting('screenshotKey', newKey)
      // 实时更新全局快捷键
      try {
        if (window.electronAPI && window.electronAPI.updateGlobalShortcut) {
          const result = await window.electronAPI.updateGlobalShortcut(newKey)
          if (result.success) {
            console.log('全局快捷键更新成功:', result.key)
          } else {
            console.error('全局快捷键更新失败:', result.error)
            await alertService.warning(`快捷键设置失败: ${result.error}\n将使用应用内快捷键。`, '快捷键设置失败')
          }
        }
      } catch (error: any) {
        console.error('更新全局快捷键失败:', error)
        await alertService.error('更新快捷键失败: ' + error.message, '错误')
      }
    },
    
    onScreenshotLocationChange(newLocation: string) {
      this.updateSetting('screenshotLocation', newLocation)
      // 当选择默认目录时，清空自定义路径
      if (newLocation === 'default') {
        this.updateSetting('screenshotsPath', '')
        console.log('已切换到默认截图目录')
        notify.success('截图位置已更新', '已切换到默认截图目录 (SaveData/Game/Screenshots)')
      }
    },
    
    handleScreenshotsBrowse({ path }: { path: string }) {
      if (path) {
        this.updateSetting('screenshotsPath', path)
        this.updateSetting('screenshotLocation', 'custom')
        this.$emit('action', { type: 'save-settings' })
        notify.success('截图目录已更新', `已设置自定义截图目录: ${path}`)
      }
    },
    
    onUseBuiltInFlashPlayerChange(enabled: boolean) {
      this.updateSetting('useBuiltInFlashPlayer', enabled)
      // 如果禁用内置播放器，但还没有设置自定义播放器路径，清空路径
      if (!enabled && !this.settings.customFlashPlayerPath) {
        this.updateSetting('customFlashPlayerPath', '')
      }
      // 如果启用内置播放器，清空自定义路径
      if (enabled) {
        this.updateSetting('customFlashPlayerPath', '')
      }
    },
    
    handleFlashPlayerBrowse({ path }: { path: string }) {
      if (path) {
        // 验证是否为exe文件
        if (!path.toLowerCase().endsWith('.exe')) {
          notify.error('文件格式错误', '请选择.exe格式的可执行文件')
          return
        }
        this.updateSetting('customFlashPlayerPath', path)
        this.updateSetting('useBuiltInFlashPlayer', false)
        this.$emit('action', { type: 'save-settings' })
        notify.success('Flash播放器已设置', `已设置自定义Flash播放器: ${path}`)
      }
    },
    
    /** 校验路径是否为 LEProc.exe（仅允许 LEProc.exe 作为转区工具） */
    isLEProcExe(filePath: string): boolean {
      if (!filePath || !filePath.trim()) return false
      const fileName = filePath.replace(/\\/g, '/').split('/').pop() || ''
      return fileName.toLowerCase() === 'leproc.exe'
    },
    
    async handleLocaleEmulatorBrowse() {
      try {
        if (window.electronAPI && window.electronAPI.selectExecutableFile) {
          const path = await window.electronAPI.selectExecutableFile()
          if (path) {
            if (!path.toLowerCase().endsWith('.exe')) {
              notify.error('文件格式错误', '请选择 .exe 格式的可执行文件')
              return
            }
            if (!this.isLEProcExe(path)) {
              notify.error('请选择 LEProc.exe', '转区工具必须指定为 Locale Emulator 的 LEProc.exe，不能使用 LEInstaller.exe 或其他程序。')
              return
            }
            this.updateSetting('game.localeEmulatorPath', path)
            this.$emit('action', { type: 'save-settings' })
            notify.success('转区工具已设置', path)
          }
        }
      } catch (error: any) {
        console.error('选择转区工具失败:', error)
        notify.error('选择失败', error.message)
      }
    },
    
    async handleLocaleEmulatorDetect() {
      try {
        if (window.electronAPI && window.electronAPI.detectLocaleEmulator) {
          const path = await window.electronAPI.detectLocaleEmulator()
          if (path) {
            if (!this.isLEProcExe(path)) {
              notify.warning('请选择 LEProc.exe', '自动识别到的不是 LEProc.exe，转区启动需使用 LEProc.exe。请通过「浏览」手动选择 LEProc.exe。')
              return
            }
            this.updateSetting('game.localeEmulatorPath', path)
            this.$emit('action', { type: 'save-settings' })
            notify.success('已识别转区工具', path)
          } else {
            notify.warning('未检测到', '未在常见位置检测到 Locale Emulator，请手动选择 LEProc.exe。')
          }
        } else {
          notify.warning('不可用', '当前环境不支持自动识别，请使用浏览选择 LEProc.exe。')
        }
      } catch (error: any) {
        console.error('自动识别转区工具失败:', error)
        notify.error('识别失败', error.message)
      }
    },
    
    async openScreenshotFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          // 获取截图文件夹路径
          let screenshotPath = ''
          
          if (this.settings.screenshotLocation === 'default') {
            screenshotPath = 'SaveData/Game/Screenshots'
          } else if (this.settings.screenshotLocation === 'custom') {
            screenshotPath = this.settings.screenshotsPath
          }
          
          if (!screenshotPath || screenshotPath.trim() === '') {
            screenshotPath = 'SaveData/Game/Screenshots'
          }
          
          console.log('尝试打开截图文件夹:', screenshotPath)
          
          // 确保目录存在
          try {
            if (window.electronAPI.ensureDirectory) {
              const ensureResult = await window.electronAPI.ensureDirectory(screenshotPath)
              if (ensureResult.success) {
                console.log('截图目录已确保存在:', screenshotPath)
              }
            }
          } catch (error) {
            console.warn('创建截图目录失败:', error)
          }
          
          const result = await window.electronAPI.openFolder(screenshotPath)
          if (result.success) {
            console.log('截图文件夹已打开')
            notify.success('文件夹已打开', `已打开截图文件夹: ${screenshotPath}`)
          } else {
            console.error('打开截图文件夹失败:', result.error)
            notify.error('打开失败', `打开截图文件夹失败: ${result.error}`)
          }
        } else {
          const screenshotPath = this.settings.screenshotLocation === 'default' 
            ? 'SaveData/Game/Screenshots' 
            : (this.settings.screenshotsPath || 'SaveData/Game/Screenshots')
          notify.info('截图文件夹路径', `${screenshotPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
        }
      } catch (error: any) {
        console.error('打开截图文件夹失败:', error)
        notify.error('打开失败', `打开截图文件夹失败: ${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  min-width: 200px;
  transition: all 0.3s ease;
}

.setting-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-slider {
  width: 150px;
  margin-right: 10px;
}

.setting-value {
  color: #718096;
  font-size: 0.9rem;
  min-width: 50px;
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

.btn-detect {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-detect:hover {
  background: var(--border-color);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--accent-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.btn-open-screenshot-folder {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-open-screenshot-folder:hover {
  background: #7c3aed;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}
</style>

