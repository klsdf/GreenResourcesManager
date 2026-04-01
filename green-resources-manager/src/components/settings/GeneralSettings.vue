<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSelect
        :title="$t('settings.language.title')"
        :description="$t('settings.language.description')"
        :model-value="currentLanguage"
        :options="languageOptions"
        @update:model-value="onLanguageChange"
      />
      
      <SettingSelect
        :title="$t('settings.theme.title')"
        :description="$t('settings.theme.description')"
        :model-value="settings.theme"
        :options="themeOptions"
        @update:model-value="onThemeChange"
      />
      
      <SettingToggle
        :title="$t('settings.autoStart.title')"
        :description="$t('settings.autoStart.description')"
        :model-value="settings.autoStart"
        @update:model-value="onAutoStartChange"
      />
      
      <SettingToggle
        :title="$t('settings.minimizeToTray.title')"
        :description="$t('settings.minimizeToTray.description')"
        :model-value="settings.minimizeToTray"
        @update:model-value="onMinimizeToTrayChange"
      />
      
      <SettingToggle
        :title="$t('settings.disguiseMode.title')"
        :description="$t('settings.disguiseMode.description')"
        :model-value="settings.disguiseMode"
        @update:model-value="onDisguiseModeChange"
      />
      
      <SettingToggle
        :title="$t('settings.safetyKey.title')"
        :description="$t('settings.safetyKey.description')"
        :model-value="settings.safetyKeyEnabled"
        @update:model-value="onSafetyKeyChange"
      />
      
      <div class="setting-item" v-if="settings.safetyKeyEnabled">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.general.safetyKeyShortcut') }}</span>
          <span class="setting-desc">{{ $t('settings.general.safetyKeyShortcutDesc') }}</span>
        </label>
        <div class="setting-control">
          <FunShortcutInput
            v-model="settings.safetyKeyShortcut"
            :default-shortcut="'Esc'"
          />
        </div>
      </div>

      <SettingToggle
        :title="$t('settings.showWindowShortcut.title')"
        :description="$t('settings.showWindowShortcut.description')"
        :model-value="settings.showWindowShortcutEnabled"
        @update:model-value="onShowWindowShortcutEnabledChange"
      />

      <div class="setting-item" v-if="settings.showWindowShortcutEnabled">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.showWindowShortcut.shortcutTitle') }}</span>
          <span class="setting-desc">{{ $t('settings.showWindowShortcut.shortcutDesc') }}</span>
        </label>
        <div class="setting-control">
          <FunShortcutInput
            v-model="settings.showWindowShortcut"
            :default-shortcut="'F2'"
            @shortcut-changed="onShowWindowShortcutChange"
          />
        </div>
      </div>

      <SettingInput
        v-if="settings.safetyKeyEnabled"
        :title="$t('settings.general.safetyKeyUrl')"
        :description="$t('settings.general.safetyKeyUrlDesc')"
        :model-value="settings.safetyKeyUrl"
        :placeholder="$t('settings.general.safetyKeyUrlPlaceholder')"
        :input-style="{ minWidth: '400px' }"
        @update:model-value="onSafetyKeyUrlChange"
      />
      
      <SettingSelect
        :title="$t('settings.saveData.title')"
        :description="$t('settings.saveData.description')"
        :model-value="settings.saveDataLocation"
        :options="saveDataLocationOptions"
        @update:model-value="onSaveDataLocationChange"
      />
      
      <SettingFilePicker
        v-if="settings.saveDataLocation === 'custom'"
        :title="$t('settings.saveData.customPathTitle')"
        :description="$t('settings.saveData.customPathDesc')"
        :model-value="settings.saveDataPath"
        :placeholder="$t('settings.saveData.customPathPlaceholder')"
        picker-type="saveData"
        @update:model-value="updateSetting('saveDataPath', $event)"
        @browse="handleSaveDataBrowse"
      />
      
      <SettingToggle
        :title="$t('settings.autoBackup.title')"
        :description="$t('settings.autoBackup.description')"
        :model-value="settings.autoBackupEnabled"
        @update:model-value="onAutoBackupEnabledChange"
      />
      
      <SettingSlider
        v-if="settings.autoBackupEnabled"
        :title="$t('settings.autoBackup.intervalTitle')"
        :description="$t('settings.autoBackup.intervalDesc')"
        :model-value="settings.autoBackupInterval"
        :min="5"
        :max="60"
        :step="5"
        :unit="$t('settings.autoBackup.unitMinutes')"
        @update:model-value="onAutoBackupIntervalChange"
      />
      
      <SettingSlider
        v-if="settings.autoBackupEnabled"
        :title="$t('settings.autoBackup.maxCountTitle')"
        :description="$t('settings.autoBackup.maxCountDesc')"
        :model-value="maxBackupCountValue"
        :min="3"
        :max="10"
        :step="1"
        :unit="$t('settings.autoBackup.unitCount')"
        @update:model-value="onMaxBackupCountChange"
      />
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.saveData.openFolderTitle') }}</span>
          <span class="setting-desc">{{ $t('settings.saveData.openFolderDesc') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-save-data-folder" @click="openSaveDataFolder">
            <span class="btn-icon">📁</span>
            {{ $t('settings.saveData.openFolderButton') }}
          </button>
        </div>
      </div>
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.general.resetSettings') }}</span>
          <span class="setting-desc">{{ $t('settings.general.resetSettingsDesc') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-reset-settings" @click="resetSettings">
            <span class="btn-icon">🔄</span>
            {{ $t('settings.general.resetButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n'
import { setLanguage, getCurrentLanguage, availableLanguages } from '../../locales'
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import alertService from '../../utils/AlertService'
import confirmService from '../../utils/ConfirmService'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingInput from './SettingInput.vue'
import SettingSlider from './SettingSlider.vue'
import SettingFilePicker from './SettingFilePicker.vue'
import FunShortcutInput from '../../fun-ui/data-input/ShortcutInput/FunShortcutInput.vue'

export default {
  name: 'GeneralSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingInput,
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
  emits: ['update:settings', 'theme-changed', 'action'],
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data() {
    return {
      currentLanguage: getCurrentLanguage(),
      languageOptions: availableLanguages
    }
  },
  computed: {
    maxBackupCountValue() {
      return this.settings.maxBackupCount ?? 5
    },
    themeOptions() {
      return [
        { value: 'light', label: this.t('settings.theme.light') },
        { value: 'dark', label: this.t('settings.theme.dark') },
        { value: 'ukiyoe', label: this.t('settings.theme.ukiyoe') },
        { value: 'chinese', label: this.t('settings.theme.chinese') },
        { value: 'forest', label: this.t('settings.theme.forest') },
        { value: 'ocean', label: this.t('settings.theme.ocean') },
        { value: 'auto', label: this.t('settings.theme.auto') }
      ]
    },
    saveDataLocationOptions() {
      return [
        { value: 'default', label: this.t('settings.saveData.default') },
        { value: 'custom', label: this.t('settings.saveData.custom') }
      ]
    }
  },

  
  methods: {
    onLanguageChange(lang: string) {
      setLanguage(lang)
      this.currentLanguage = lang
      notify.toast('success', this.t('messages.saveSuccess'), this.t('settings.language.description'))
    },
    
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    onThemeChange(newTheme: string) {
      this.updateSetting('theme', newTheme)
      // 实时应用主题变化
      this.applyTheme(newTheme)
    },
    
    applyTheme(theme: string) {
      // 处理跟随系统主题
      let actualTheme = theme
      if (theme === 'auto') {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        actualTheme = prefersDark ? 'dark' : 'light'
      }
      
      // 应用主题
      document.documentElement.setAttribute('data-theme', actualTheme)
      localStorage.setItem('butter-manager-theme', theme)
      
      // 通知父组件主题变化
      this.$emit('theme-changed', actualTheme)
    },
    
    async onAutoStartChange(newValue: boolean) {
      this.updateSetting('autoStart', newValue)
      try {
        if (window.electronAPI && window.electronAPI.setAutoStart) {
          const result = await window.electronAPI.setAutoStart(newValue)
          if (result.success) {
            console.log('开机自启设置更新成功:', result.enabled)
            this.showNotification(
              this.t('settings.general.autoStartUpdated'), 
              result.enabled ? this.t('settings.general.autoStartEnabled') : this.t('settings.general.autoStartDisabled')
            )
          } else {
            console.error('开机自启设置更新失败:', result.error)
            alertService.error(this.t('settings.general.autoStartFailed', { error: result.error }))
            this.updateSetting('autoStart', !newValue)
          }
        } else {
          console.warn('当前环境不支持开机自启功能')
          alertService.warning(this.t('settings.general.autoStartNotSupported'))
          this.updateSetting('autoStart', !newValue)
        }
      } catch (error: any) {
        console.error('更新开机自启设置失败:', error)
        alertService.error(this.t('settings.general.autoStartUpdateFailed', { error: error.message }))
        this.updateSetting('autoStart', !newValue)
      }
    },
    
    async onMinimizeToTrayChange(newValue: boolean) {
      this.updateSetting('minimizeToTray', newValue)
      try {
        if (window.electronAPI && window.electronAPI.setMinimizeToTray) {
          const result = await window.electronAPI.setMinimizeToTray(newValue)
          if (result.success) {
            console.log('最小化到托盘设置更新成功:', result.enabled)
            this.showNotification(
              this.t('settings.general.minimizeToTrayUpdated'), 
              result.enabled ? this.t('settings.general.minimizeToTrayEnabled') : this.t('settings.general.minimizeToTrayDisabled')
            )
          } else {
            console.error('最小化到托盘设置更新失败:', result.error)
            notify.error(this.t('messages.error'), this.t('settings.general.minimizeToTrayFailed', { error: result.error }))
            this.updateSetting('minimizeToTray', !newValue)
          }
        } else {
          console.warn('当前环境不支持最小化到托盘功能')
          notify.warning(this.t('common.warning'), this.t('settings.general.minimizeToTrayNotSupported'))
          this.updateSetting('minimizeToTray', !newValue)
        }
      } catch (error: any) {
        console.error('更新最小化到托盘设置失败:', error)
        notify.error(this.t('messages.error'), this.t('settings.general.minimizeToTrayUpdateFailed', { error: error.message }))
        this.updateSetting('minimizeToTray', !newValue)
      }
    },
    
    async onDisguiseModeChange(newValue: boolean) {
      this.updateSetting('disguiseMode', newValue)
      console.log('伪装模式设置已更新:', newValue)
      
      try {
        const disguiseManager = await import('../../utils/DisguiseManager.js')
        disguiseManager.default.clearCache()
        console.log('伪装图片缓存已清除')
      } catch (error) {
        console.error('清除伪装图片缓存失败:', error)
      }
      
      try {
        const event = new CustomEvent('disguise-mode-changed', {
          detail: { enabled: newValue }
        })
        window.dispatchEvent(event)
        console.log('已触发 disguise-mode-changed 事件')
      } catch (error) {
        console.error('触发伪装模式变化事件失败:', error)
      }
      
      notify.success(
        this.t('settings.general.disguiseModeUpdated'), 
        newValue ? this.t('settings.general.disguiseModeEnabled') : this.t('settings.general.disguiseModeDisabled')
      )
    },
    
    async onSafetyKeyChange(newValue: boolean) {
      this.updateSetting('safetyKeyEnabled', newValue)
      console.log('安全键设置已更新:', newValue)
      
      if (window.electronAPI && window.electronAPI.setSafetyKey) {
        try {
        const result = await window.electronAPI.setSafetyKey(
          newValue, 
          this.settings.safetyKeyUrl,
          this.settings.safetyKeyShortcut
        )
          if (result.success) {
            console.log('✅ 安全键全局快捷键已', newValue ? '启用' : '禁用')
          } else {
            console.warn('设置安全键失败:', result.error)
            notify.error(
              this.t('settings.general.safetyKeyFailed'), 
              result.error || this.t('settings.general.safetyKeyFailedDetail')
            )
            this.updateSetting('safetyKeyEnabled', !newValue)
            return
          }
        } catch (error: any) {
          console.error('设置安全键失败:', error)
          notify.error(this.t('settings.general.safetyKeyFailed'), error.message)
          this.updateSetting('safetyKeyEnabled', !newValue)
          return
        }
      }
      
      try {
        const event = new CustomEvent('safety-key-changed', {
          detail: { 
            enabled: newValue,
            url: this.settings.safetyKeyUrl
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 safety-key-changed 事件')
      } catch (error) {
        console.error('触发安全键变化事件失败:', error)
      }
      
      notify.success(
        this.t('settings.general.safetyKeyUpdated'), 
        newValue ? this.t('settings.general.safetyKeyEnabled') : this.t('settings.general.safetyKeyDisabled')
      )
    },
    
    async onSafetyKeyUrlChange(newUrl: string) {
      this.updateSetting('safetyKeyUrl', newUrl)
      // 当安全键URL变化时，更新全局快捷键设置
      if (this.settings.safetyKeyEnabled && window.electronAPI && window.electronAPI.setSafetyKey) {
        try {
          const result = await window.electronAPI.setSafetyKey(true, newUrl, this.settings.safetyKeyShortcut)
          if (result.success) {
            console.log('✅ 安全键URL已更新')
          } else {
            console.warn('更新安全键URL失败:', result.error)
          }
        } catch (error) {
          console.error('更新安全键URL失败:', error)
        }
      }
      
      // 触发自定义事件，通知 App.vue
      if (this.settings.safetyKeyEnabled) {
        try {
          const event = new CustomEvent('safety-key-changed', {
            detail: { 
              enabled: this.settings.safetyKeyEnabled,
              url: newUrl
            }
          })
          window.dispatchEvent(event)
        } catch (error) {
          console.error('触发安全键URL变化事件失败:', error)
        }
      }
    },

    async onShowWindowShortcutEnabledChange(newValue: boolean) {
      this.updateSetting('showWindowShortcutEnabled', newValue)
      if (window.electronAPI && window.electronAPI.updateShowWindowShortcut) {
        try {
          const result = await window.electronAPI.updateShowWindowShortcut(newValue ? this.settings.showWindowShortcut : '')
          if (result.success) {
            console.log('✅ 打开软件快捷键已', newValue ? '启用' : '禁用')
            notify.success(this.t('settings.general.showWindowShortcutUpdated'), newValue ? this.t('settings.general.showWindowShortcutEnabled') : this.t('settings.general.showWindowShortcutDisabled'))
          } else {
            console.warn('更新打开软件快捷键失败:', result.error)
            notify.error(this.t('messages.error'), result.error || this.t('settings.general.showWindowShortcutUpdateFailed'))
            this.updateSetting('showWindowShortcutEnabled', !newValue)
          }
        } catch (error: any) {
          console.error('更新打开软件快捷键失败:', error)
          notify.error(this.t('messages.error'), error.message)
          this.updateSetting('showWindowShortcutEnabled', !newValue)
        }
      }
    },

    async onShowWindowShortcutChange(newKey: string) {
      this.updateSetting('showWindowShortcut', newKey)
      if (this.settings.showWindowShortcutEnabled && window.electronAPI && window.electronAPI.updateShowWindowShortcut) {
        try {
          const result = await window.electronAPI.updateShowWindowShortcut(newKey)
          if (result.success) {
            console.log('✅ 打开软件快捷键已更新为:', newKey)
            notify.success(this.t('settings.general.showWindowShortcutUpdated'), this.t('settings.general.showWindowShortcutSet', { key: newKey }))
          } else {
            console.warn('更新打开软件快捷键失败:', result.error)
            notify.error(this.t('messages.error'), result.error || this.t('settings.general.showWindowShortcutUpdateFailed'))
            this.updateSetting('showWindowShortcut', this.settings.showWindowShortcut)
          }
        } catch (error: any) {
          console.error('更新打开软件快捷键失败:', error)
          notify.error(this.t('messages.error'), error.message)
          this.updateSetting('showWindowShortcut', this.settings.showWindowShortcut)
        }
      }
    },
    
    onSaveDataLocationChange(newLocation: string) {
      this.updateSetting('saveDataLocation', newLocation)
      if (newLocation === 'default') {
        console.log('已切换到默认存档目录')
        notify.success(this.t('settings.general.saveDataLocationUpdated'), this.t('settings.general.saveDataLocationDefault'))
      }
    },
    
    onAutoBackupEnabledChange(newValue: boolean) {
      this.updateSetting('autoBackupEnabled', newValue)
      console.log('自动备份开关已更新:', newValue)
      
      if (!newValue) {
        this.updateSetting('autoBackupInterval', 0)
      } else {
        if (this.settings.autoBackupInterval < 5) {
          this.updateSetting('autoBackupInterval', 5)
        }
      }
      
      try {
        const event = new CustomEvent('auto-backup-interval-changed', {
          detail: { 
            interval: newValue ? this.settings.autoBackupInterval : 0
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 auto-backup-interval-changed 事件')
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      
      if (newValue) {
        notify.success(this.t('settings.general.autoBackupEnabled'), this.t('settings.general.autoBackupIntervalSet', { interval: this.settings.autoBackupInterval }))
      } else {
        notify.success(this.t('settings.general.autoBackupDisabled'), this.t('settings.general.autoBackupDisabledDetail'))
      }
    },
    
    onAutoBackupIntervalChange(newInterval: number) {
      this.updateSetting('autoBackupInterval', newInterval)
      console.log('自动备份时间间隔已更新:', newInterval, '分钟')
      
      try {
        const event = new CustomEvent('auto-backup-interval-changed', {
          detail: { 
            interval: this.settings.autoBackupEnabled ? newInterval : 0
          }
        })
        window.dispatchEvent(event)
        console.log('已触发 auto-backup-interval-changed 事件')
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      
      notify.success(this.t('settings.general.autoBackupIntervalUpdated'), this.t('settings.general.autoBackupIntervalSet', { interval: newInterval }))
    },
    
    onMaxBackupCountChange(newCount: number) {
      this.updateSetting('maxBackupCount', newCount)
      console.log('保留备份数量已更新:', newCount, '个')
      notify.success(this.t('settings.general.backupCountUpdated'), this.t('settings.general.backupCountSet', { count: newCount }))
    },
    
    async handleSaveDataBrowse({ result }: { result: any }) {
      if (result && result.success) {
        this.updateSetting('saveDataPath', result.directory)
        this.updateSetting('saveDataLocation', 'custom')
        
        const newSaveDataPath = result.directory + '/SaveData'
        const saveManagerUpdated = saveManager.setDataDirectory(newSaveDataPath)
        if (saveManagerUpdated) {
          console.log('SaveManager数据目录已更新为:', newSaveDataPath)
        }
        
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('存档目录设置已保存')
        }
        
        const message = result.message || this.t('settings.general.saveDataDirectoryUpdated')
        let detailMessage = this.t('settings.general.saveDataDirectorySet', { directory: result.directory })
        
        if (result.copiedFiles && result.copiedFiles > 0) {
          detailMessage += `\n\n${this.t('settings.general.saveDataFilesCopied', { count: result.copiedFiles })}`
          detailMessage += `\n${message}`
        } else {
          detailMessage += `\n\n${message}`
        }
        
        notify.success(this.t('settings.general.saveDataDirectoryUpdated'), detailMessage)
        
        if (result.copiedFiles && result.copiedFiles > 0) {
          console.log('存档数据复制完成:', {
            directory: result.directory,
            copiedFiles: result.copiedFiles,
            message: result.message
          })
        }
      } else if (result && !result.success) {
        const errorMessage = result.error || this.t('settings.general.saveDataUnknownError')
        notify.error(this.t('settings.general.saveDataFailed'), errorMessage)
        console.error('设置存档目录失败:', result.error)
      }
    },
    
    async openSaveDataFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          let saveDataPath = ''
          
          if (this.settings.saveDataLocation === 'default') {
            saveDataPath = 'SaveData'
          } else if (this.settings.saveDataLocation === 'custom') {
            saveDataPath = this.settings.saveDataPath
          }
          
          if (!saveDataPath || saveDataPath.trim() === '') {
            saveDataPath = 'SaveData'
          }
          
          console.log('尝试打开存档文件夹:', saveDataPath)
          
          try {
            if (window.electronAPI.ensureDirectory) {
              const ensureResult = await window.electronAPI.ensureDirectory(saveDataPath)
              if (ensureResult.success) {
                console.log('存档目录已确保存在:', saveDataPath)
              }
            }
          } catch (error) {
            console.warn('创建存档目录失败:', error)
          }
          
          const result = await window.electronAPI.openFolder(saveDataPath)
          if (result.success) {
            console.log('存档文件夹已打开')
            notify.success(this.t('settings.general.folderOpened'), this.t('settings.general.folderOpenedDetail', { path: saveDataPath }))
          } else {
            console.error('打开存档文件夹失败:', result.error)
            notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: result.error }))
          }
        } else {
          const saveDataPath = this.settings.saveDataLocation === 'default' 
            ? 'SaveData' 
            : (this.settings.saveDataPath || 'SaveData')
          notify.info(this.t('settings.general.folderPath'), `${saveDataPath}\n\n${this.t('settings.general.browserEnvironmentNote')}`)
        }
      } catch (error: any) {
        console.error('打开存档文件夹失败:', error)
        notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: error.message }))
      }
    },
    
    async resetSettings() {
      if (await confirmService.confirm(this.t('settings.general.resetSettingsConfirm'))) {
        try {
          this.$emit('action', { type: 'reset-settings' })
        } catch (error: any) {
          console.error('重置设置失败:', error)
          notify.error(this.t('settings.general.resetSettingsFailed'), this.t('settings.general.resetSettingsFailedDetail', { error: error.message }))
        }
      }
    },
    
    async showNotification(title: string, message: string) {
      // 简单的通知实现
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(title, message)
      } else {
        // 降级处理：使用浏览器通知
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message })
            }
          })
        }
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

.btn-open-save-data-folder {
  background: #10b981;
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

.btn-open-save-data-folder:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-reset-settings {
  background: #ef4444;
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

.btn-reset-settings:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}

.shortcut-display {
  display: flex;
  gap: 5px;
  align-items: center;
}


</style>

