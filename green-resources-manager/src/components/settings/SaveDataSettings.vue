<template>
  <div class="settings-section">
    <div class="settings-grid">
      <!-- 存档位置单独成页。位置记录在程序旁边，不写进被搬走的那份存档。 -->
      <SettingSelect
        :title="$t('settings.saveData.title')"
        :description="$t('settings.saveData.description')"
        :model-value="saveLocationMode"
        :options="saveDataLocationOptions"
        @update:model-value="onSaveDataLocationChange"
      />

      <SettingFilePicker
        v-if="saveLocationMode === 'custom'"
        :title="$t('settings.saveData.customPathTitle')"
        :description="$t('settings.saveData.customPathDesc')"
        :model-value="saveLocationPath"
        :placeholder="$t('settings.saveData.customPathPlaceholder')"
        picker-type="saveData"
        @browse="handleSaveDataBrowse"
      />

      <SettingToggle
        :title="$t('settings.cloudSave.title')"
        :description="$t('settings.cloudSave.description')"
        :model-value="settings.onedriveBackup === true"
        @update:model-value="onOnedriveBackupChange"
      />
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ onedriveRoot ? $t('settings.cloudSave.connected') : $t('settings.cloudSave.missing') }}</span>
          <span class="setting-desc">{{ onedriveRoot || $t('settings.cloudSave.missingDetail') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-save-data-folder" :disabled="!onedriveRoot" @click="openOnedriveFolder">
            <span class="btn-icon">📁</span>
            {{ $t('settings.cloudSave.openFolder') }}
          </button>
        </div>
      </div>

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
          <span class="setting-title">{{ $t('settings.autoBackup.openFolderTitle') }}</span>
          <span class="setting-desc">{{ $t('settings.autoBackup.openFolderDesc') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-save-data-folder" @click="openSaveBackupFolder">
            <span class="btn-icon">📁</span>
            {{ $t('settings.autoBackup.openFolderButton') }}
          </button>
        </div>
      </div>

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
    </div>
  </div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n'
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'
import SettingFilePicker from './SettingFilePicker.vue'

/**
 * 存档设置页。
 * 和通用设置分开，是因为存档位置、云存档、自动备份都在改同一份数据放哪、怎么留副本。
 */
export default {
  name: 'SaveDataSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingSlider,
    SettingFilePicker
  },
  props: {
    /** 当前设置。云存档和自动备份的开关都写在这里，再由父页面保存。 */
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data() {
    return {
      /** 存档位置只来自项目根目录的记录，不放进真正的存档。 */
      saveLocationMode: 'default',
      /** 自定义存档的父目录。空字符串表示使用程序旁边的 SaveData。 */
      saveLocationPath: '',
      /** 探测到的 OneDrive 根目录。空字符串表示这台电脑没找到同步文件夹。 */
      onedriveRoot: ''
    }
  },
  computed: {
    /** 还没写过保留份数时，滑块按 5 份显示。 */
    maxBackupCountValue() {
      return this.settings.maxBackupCount ?? 5
    },
    /** 存档位置的两个选项：程序旁边，或玩家选的目录。 */
    saveDataLocationOptions() {
      return [
        { value: 'default', label: this.t('settings.saveData.default') },
        { value: 'custom', label: this.t('settings.saveData.custom') }
      ]
    }
  },
  mounted() {
    this.loadSaveLocation()
    this.refreshOnedriveStatus()
  },
  methods: {
    /**
     * 把一项设置交给父页面。父页面会合并进整份设置再自动保存。
     * @param key 设置字段名
     * @param value 新的值
     */
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },

    /**
     * 问主进程这台电脑的 OneDrive 文件夹在哪。
     * 找不到时开关仍能打开，但要等 OneDrive 客户端登录后，下次保存才会写进去。
     */
    async refreshOnedriveStatus() {
      if (!window.electronAPI?.onedriveStatus) {
        this.onedriveRoot = ''
        return
      }
      try {
        const status = await window.electronAPI.onedriveStatus()
        this.onedriveRoot = status?.detected || ''
      } catch (error) {
        console.warn('[设置] 探测 OneDrive 失败:', error)
        this.onedriveRoot = ''
      }
    },

    /**
     * 打开或关闭云存档。
     * 开关随其他设置一起写入存档。打开后主进程会在保存完成时把数据库复制到 OneDrive。
     * @param enabled 是否开启
     */
    async onOnedriveBackupChange(enabled: boolean) {
      this.updateSetting('onedriveBackup', enabled === true)
      await this.refreshOnedriveStatus()
      if (!enabled) return
      if (!this.onedriveRoot) {
        notify.warning(this.t('settings.cloudSave.title'), this.t('settings.cloudSave.missingDetail'))
      }
    },

    /**
     * 打开 OneDrive 里的云存档文件夹。
     * 目录还没有时主进程会先建好，方便确认文件有没有写进去。
     */
    async openOnedriveFolder() {
      if (!window.electronAPI?.onedriveOpenFolder) {
        notify.error(this.t('messages.error'), this.t('settings.cloudSave.missingDetail'))
        return
      }
      const result = await window.electronAPI.onedriveOpenFolder()
      if (result?.ok) {
        notify.success(this.t('settings.cloudSave.openFolder'), result.path || '')
      } else {
        notify.error(this.t('messages.error'), result?.error || this.t('settings.cloudSave.missingDetail'))
      }
    },

    /**
     * 从项目根目录读取存档位置，用来显示设置项。
     */
    async loadSaveLocation() {
      if (!window.electronAPI?.getSaveLocation) return
      const location = await window.electronAPI.getSaveLocation()
      const saveDataPath = location?.saveDataPath || ''
      this.saveLocationPath = saveDataPath
      this.saveLocationMode = saveDataPath ? 'custom' : 'default'
    },

    /**
     * 切回本地存档时只改位置记录。主题和截图目录仍留在原来的存档里。
     * @param newLocation 默认或自定义
     */
    async onSaveDataLocationChange(newLocation: string) {
      this.saveLocationMode = newLocation
      if (newLocation !== 'default') return
      this.saveLocationPath = ''
      if (window.electronAPI?.setSaveLocation) {
        await window.electronAPI.setSaveLocation('')
      }
      const directory = window.electronAPI?.getSaveDataDirectory
        ? await window.electronAPI.getSaveDataDirectory()
        : 'SaveData'
      saveManager.setDataDirectory(directory)
      notify.success(this.t('settings.general.saveDataLocationUpdated'), this.t('settings.general.saveDataLocationDefault'))
    },

    /**
     * 打开或关闭定时备份。关掉时把间隔写成 0，备份调度就会停。
     * @param newValue 是否开启
     */
    onAutoBackupEnabledChange(newValue: boolean) {
      this.updateSetting('autoBackupEnabled', newValue)
      if (!newValue) {
        this.updateSetting('autoBackupInterval', 0)
      } else if (this.settings.autoBackupInterval < 5) {
        this.updateSetting('autoBackupInterval', 5)
      }
      try {
        window.dispatchEvent(new CustomEvent('auto-backup-interval-changed', {
          detail: {
            interval: newValue ? this.settings.autoBackupInterval : 0
          }
        }))
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      if (newValue) {
        notify.success(this.t('settings.general.autoBackupEnabled'), this.t('settings.general.autoBackupIntervalSet', { interval: this.settings.autoBackupInterval }))
      } else {
        notify.success(this.t('settings.general.autoBackupDisabled'), this.t('settings.general.autoBackupDisabledDetail'))
      }
    },

    /**
     * 改自动备份间隔，并通知正在跑的备份调度。
     * @param newInterval 间隔，单位是分钟
     */
    onAutoBackupIntervalChange(newInterval: number) {
      this.updateSetting('autoBackupInterval', newInterval)
      try {
        window.dispatchEvent(new CustomEvent('auto-backup-interval-changed', {
          detail: {
            interval: this.settings.autoBackupEnabled ? newInterval : 0
          }
        }))
      } catch (error) {
        console.error('触发自动备份时间间隔变化事件失败:', error)
      }
      notify.success(this.t('settings.general.autoBackupIntervalUpdated'), this.t('settings.general.autoBackupIntervalSet', { interval: newInterval }))
    },

    /**
     * 改自动备份最多留下几份。超出的旧备份由备份流程自己删。
     * @param newCount 保留份数
     */
    onMaxBackupCountChange(newCount: number) {
      this.updateSetting('maxBackupCount', newCount)
      notify.success(this.t('settings.general.backupCountUpdated'), this.t('settings.general.backupCountSet', { count: newCount }))
    },

    /**
     * 选好自定义目录后，把存档复制过去，并让当前会话改读新目录。
     * @param result 文件选择器返回的目录和复制结果
     */
    async handleSaveDataBrowse({ result }: { result: any }) {
      if (result && result.success) {
        this.saveLocationPath = result.directory
        this.saveLocationMode = 'custom'
        const newSaveDataPath = result.directory + '/SaveData'
        saveManager.setDataDirectory(newSaveDataPath)
        const message = result.message || this.t('settings.general.saveDataDirectoryUpdated')
        let detailMessage = this.t('settings.general.saveDataDirectorySet', { directory: result.directory })
        if (result.copiedFiles && result.copiedFiles > 0) {
          detailMessage += `\n\n${this.t('settings.general.saveDataFilesCopied', { count: result.copiedFiles })}`
          detailMessage += `\n${message}`
        } else {
          detailMessage += `\n\n${message}`
        }
        notify.success(this.t('settings.general.saveDataDirectoryUpdated'), detailMessage)
      } else if (result && !result.success) {
        const errorMessage = result.error || this.t('settings.general.saveDataUnknownError')
        notify.error(this.t('settings.general.saveDataFailed'), errorMessage)
      }
    },

    /**
     * 打开当前存档对应的自动备份目录。
     * 目录在系统用户文件夹里，界面上不好猜路径，所以从这里直接打开。
     */
    async openSaveBackupFolder() {
      try {
        if (!window.electronAPI?.getSaveBackupDirectory || !window.electronAPI?.openFolder) {
          notify.info(this.t('settings.general.folderPath'), this.t('settings.general.browserEnvironmentNote'))
          return
        }
        const backupPath = await window.electronAPI.getSaveBackupDirectory()
        const result = await window.electronAPI.openFolder(backupPath)
        if (result.success) {
          notify.success(this.t('settings.general.folderOpened'), this.t('settings.autoBackup.openedDetail', { path: backupPath }))
        } else {
          notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: result.error }))
        }
      } catch (error: any) {
        notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: error.message }))
      }
    },

    /**
     * 打开正在使用的存档文件夹。目录不存在时先建出来。
     */
    async openSaveDataFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          const saveDataPath = window.electronAPI.getSaveDataDirectory
            ? await window.electronAPI.getSaveDataDirectory()
            : 'SaveData'
          try {
            if (window.electronAPI.ensureDirectory) {
              await window.electronAPI.ensureDirectory(saveDataPath)
            }
          } catch (error) {
            console.warn('创建存档目录失败:', error)
          }
          const result = await window.electronAPI.openFolder(saveDataPath)
          if (result.success) {
            notify.success(this.t('settings.general.folderOpened'), this.t('settings.general.folderOpenedDetail', { path: saveDataPath }))
          } else {
            notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: result.error }))
          }
        } else {
          notify.info(this.t('settings.general.folderPath'), `SaveData\n\n${this.t('settings.general.browserEnvironmentNote')}`)
        }
      } catch (error: any) {
        notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: error.message }))
      }
    }
  }
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
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
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  margin-right: 16px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
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
}

.btn-open-save-data-folder:hover {
  background: #059669;
}

.btn-open-save-data-folder:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
