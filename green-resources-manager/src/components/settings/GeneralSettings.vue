<template>
  <div class="settings-section">
    <div class="settings-grid">
      <!-- 主题不用下拉框。色条取自该主题的主色，点一下就能对照着选。 -->
      <div class="setting-item theme-setting">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.theme.title') }}</span>
          <span class="setting-desc">{{ $t('settings.theme.description') }}</span>
        </label>
        <div class="theme-palette-grid" role="radiogroup" :aria-label="$t('settings.theme.title')">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="theme-palette"
            :class="{ active: settings.theme === option.value }"
            role="radio"
            :aria-checked="settings.theme === option.value"
            @click="onThemeChange(option.value)"
          >
            <span class="theme-swatch">
              <span
                v-for="(color, index) in option.colors"
                :key="index"
                class="theme-swatch-bar"
                :style="{ background: color }"
              ></span>
            </span>
            <span class="theme-name">{{ $lt(option.label) }}</span>
          </button>
        </div>
      </div>

      <SettingInput
        :title="$lt('用户名')"
        :description="$lt('这个功能现在没有用，是之后会用到的神秘功能')"
        :model-value="userName"
        :placeholder="$lt('请输入你的用户名')"
        :input-style="{ minWidth: '280px' }"
        @update:model-value="userName = $event"
        @blur="saveUserName"
        @keyup.enter="saveUserName"
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

      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.disguiseMode.openFolderTitle') }}</span>
          <span class="setting-desc">{{ $t('settings.disguiseMode.openFolderDesc') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-open-save-data-folder" @click="openDisguiseFolder">
            <span class="btn-icon">📁</span>
            {{ $t('settings.disguiseMode.openFolderButton') }}
          </button>
        </div>
      </div>
      
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
            :model-value="settings.safetyKeyShortcut"
            :default-shortcut="'Esc'"
            @update:model-value="onSafetyKeyShortcutChange"
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
            :model-value="settings.showWindowShortcut"
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

      <div class="setting-item resource-rule-setting">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.sameResource.title') }}</span>
          <span class="setting-desc">{{ $t('settings.sameResource.description') }}</span>
        </label>
        <div class="resource-rule-panel">
          <div class="rule-presets" role="group" :aria-label="$t('settings.sameResource.presets.label')">
            <button
              v-for="preset in sameResourcePresets"
              :key="preset.id"
              type="button"
              class="rule-preset"
              :class="{ active: isSameResourcePresetActive(preset.id) }"
              :aria-pressed="isSameResourcePresetActive(preset.id)"
              @click="applySameResourcePreset(preset.id)"
            >
              {{ $t(`settings.sameResource.presets.${preset.id}`) }}
            </button>
          </div>

          <div class="rule-criteria">
            <label
              v-for="criterion in sameResourceCriteria"
              :key="criterion"
              class="rule-criterion"
              :class="{ active: sameResourceRule.criteria.includes(criterion) }"
            >
              <input
                type="checkbox"
                :checked="sameResourceRule.criteria.includes(criterion)"
                @change="toggleSameResourceCriterion(criterion, $event)"
              />
              <span class="rule-criterion-text">
                <span class="rule-criterion-name">{{ $t(`settings.sameResource.criteria.${criterion}.name`) }}</span>
                <span class="rule-criterion-desc">{{ $t(`settings.sameResource.criteria.${criterion}.desc`) }}</span>
              </span>
            </label>
          </div>

          <div class="rule-mode">
            <span class="rule-mode-label">{{ $t('settings.sameResource.mode.label') }}</span>
            <label class="rule-mode-option">
              <input
                type="radio"
                name="same-resource-mode"
                value="all"
                :checked="sameResourceRule.mode === 'all'"
                @change="setSameResourceMode('all')"
              />
              <span>{{ $t('settings.sameResource.mode.all') }}</span>
            </label>
            <label class="rule-mode-option">
              <input
                type="radio"
                name="same-resource-mode"
                value="any"
                :checked="sameResourceRule.mode === 'any'"
                @change="setSameResourceMode('any')"
              />
              <span>{{ $t('settings.sameResource.mode.any') }}</span>
            </label>
          </div>

          <p class="rule-summary">
            <span class="rule-summary-label">{{ $t('settings.sameResource.summaryPrefix') }}</span>
            <strong>{{ sameResourceSummary }}</strong>
          </p>
          <p v-if="sameResourceRule.mode === 'any'" class="rule-warning">
            {{ $t('settings.sameResource.mode.anyWarning') }}
          </p>
          <p v-if="sameResourceRule.criteria.includes('fingerprint')" class="rule-hint">
            {{ $t('settings.sameResource.fingerprintHint') }}
          </p>
          <p class="rule-hint">{{ $t('settings.sameResource.pathHint') }}</p>
        </div>
      </div>

      <SettingToggle
        :key="resourceMarkerToggleKey"
        :title="$t('settings.resourceMarker.title')"
        :description="$t('settings.resourceMarker.description')"
        :model-value="resourceMarkerEnabled"
        @update:model-value="onResourceMarkerChange"
      />
      
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
import saveManager from '../../utils/SaveManager'
import { lt } from '../../locales/lt'
import { setDisguiseModeEnabled } from '../../utils/disguiseMode'
import notify from '../../utils/NotificationService'
import alertService from '../../utils/AlertService'
import confirmService from '../../utils/ConfirmService'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingInput from './SettingInput.vue'
import SettingSlider from './SettingSlider.vue'
import SettingFilePicker from './SettingFilePicker.vue'
import FunShortcutInput from '../../fun-ui/data-input/ShortcutInput/FunShortcutInput.vue'
import {
  SAME_RESOURCE_CRITERIA,
  SAME_RESOURCE_PRESETS,
  normalizeSameResourceRule,
  type SameResourceCriterion,
  type SameResourceMode
} from '../../utils/sameResourceRule'

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
      /** 存档位置只来自项目根目录的记录，不放进真正的存档。 */
      saveLocationMode: 'default',
      /** 自定义存档的父目录。空字符串表示使用程序旁边的 SaveData。 */
      saveLocationPath: '',
      userName: '',
      savedUserName: '',
      isSavingUserName: false,
      /** 取消关闭标记文件时换 key 强制开关回到原状态 */
      resourceMarkerToggleKey: 0
    }
  },
  computed: {
    maxBackupCountValue() {
      return this.settings.maxBackupCount ?? 5
    },
    resourceMarkerEnabled() {
      return this.settings.resourceMarkerEnabled !== false
    },
    sameResourceCriteria() {
      return SAME_RESOURCE_CRITERIA
    },
    sameResourcePresets() {
      return SAME_RESOURCE_PRESETS
    },
    sameResourceRule() {
      return normalizeSameResourceRule(this.settings.sameResourceRule)
    },
    /** 把当前勾选实时拼成一句人话，改完就能看到规则变成了什么。 */
    sameResourceSummary() {
      const rule = this.sameResourceRule
      const names = rule.criteria.map((criterion: SameResourceCriterion) =>
        this.t(`settings.sameResource.criteria.${criterion}.name`)
      )
      const joiner = this.t(
        rule.mode === 'any'
          ? 'settings.sameResource.mode.joinAny'
          : 'settings.sameResource.mode.joinAll'
      )
      return names.join(joiner)
    },
    /**
     * 主题色板。
     * colors 从 variables.css 里该主题的侧栏、强调色和背景里抽出来，写死在这里。
     * 这样正在用别的主题时，色板也不会跟着变色。
     * 跟随系统没有自己的配色，左右各放暗色和仓鼠娘，表示它会在两者之间切换。
     */
    themeOptions() {
      return [
        { value: 'light', label: this.t('settings.theme.light'), colors: ['#2e140c', '#d7901e', '#F2AB39', '#E4B660', '#FFEFC4', '#fffcf7'] },
        { value: 'dark', label: this.t('settings.theme.dark'), colors: ['#1b2838', '#2a475e', '#66c0f4', '#3c4b5c', '#9daebe', '#c9d0d6'] },
        { value: 'ukiyoe', label: this.t('settings.theme.ukiyoe'), colors: ['#2c1810', '#b71c1c', '#d32f2f', '#8d6e63', '#f0e6d2', '#fff8f0'] },
        { value: 'chinese', label: this.t('settings.theme.chinese'), colors: ['#4A3C39', '#8C3B2A', '#C6493A', '#B8745F', '#CBB7A2', '#F6F3EF'] },
        { value: 'forest', label: this.t('settings.theme.forest'), colors: ['#1b5e20', '#2e7d32', '#4caf50', '#81c784', '#c8e6c9', '#f1f8e9'] },
        { value: 'ocean', label: this.t('settings.theme.ocean'), colors: ['#0d47a1', '#1565c0', '#2196f3', '#64b5f6', '#90caf9', '#e3f2fd'] },
        { value: 'cream', label: this.t('settings.theme.cream'), colors: ['#5D5063', '#A4B5D5', '#EABCDD', '#F0DFEA', '#DDD1E9', '#F7F6F5'] },
        // 下面这组预览色与 TODO_List 选色器一致，从深到浅。
        { value: 'sky', label: this.t('settings.theme.sky'), colors: ['#3451d1', '#4f6ef7', '#6b8cff', '#c5d0ff', '#eef2ff', '#ffffff', '#eef1f5'] },
        { value: 'ink', label: this.t('settings.theme.ink'), colors: ['#1a1a1a', '#2c2c2c', '#5c5c5c', '#8a8a8a', '#d4d4d4', '#f4f4f4', '#ffffff'] },
        { value: 'moss', label: this.t('settings.theme.moss'), colors: ['#1c734c', '#2d8a62', '#2d9a6a', '#3da87a', '#b7e0c8', '#e6f6ed', '#eef6f1'] },
        { value: 'sand', label: this.t('settings.theme.sand'), colors: ['#8b5e3c', '#a87248', '#c47a3a', '#e8c9a0', '#efe6d8', '#f7f3ec', '#fffdf9'] },
        { value: 'dusk', label: this.t('settings.theme.dusk'), colors: ['#4a3cc0', '#6b5ce5', '#8b7cf0', '#cdc4f5', '#d4896a', '#f0edff', '#f3f0f8'] },
        { value: 'dunhuang', label: this.t('settings.theme.dunhuang'), colors: ['#6b3b32', '#a64c3b', '#b78f68', '#8fbfb0', '#3f7a6e', '#cabeaf', '#f7f2ea'] },
        { value: 'morandi', label: this.t('settings.theme.morandi'), colors: ['#5a6b75', '#71838f', '#a07071', '#d39394', '#e4e8ea', '#e8eadc', '#f7f6f1'] },
        { value: 'matisse', label: this.t('settings.theme.matisse'), colors: ['#343e47', '#aa3d36', '#8f603d', '#5a7d6c', '#d2decd', '#e3eaab', '#f6f8ef'] },
        { value: 'memphis', label: this.t('settings.theme.memphis'), colors: ['#077abd', '#5b8fc9', '#6f5f94', '#89d0c2', '#e85d66', '#efd55e', '#f7eef2'] },
        { value: 'night', label: this.t('settings.theme.night'), colors: ['#1a1d24', '#252a36', '#2a3358', '#7b93ff', '#9aacff', '#e0a054', '#e8eaed'] },
        { value: 'night-ink', label: this.t('settings.theme.night-ink'), colors: ['#161616', '#1e1e1e', '#2c2c2c', '#555555', '#a3a3a3', '#ececec', '#f0f0f0'] },
        { value: 'auto', label: this.t('settings.theme.auto'), colors: ['#1b2838', '#2a475e', '#66c0f4', '#F2AB39', '#FFEFC4', '#fffcf7'] }
      ]
    },
    saveDataLocationOptions() {
      return [
        { value: 'default', label: this.t('settings.saveData.default') },
        { value: 'custom', label: this.t('settings.saveData.custom') }
      ]
    }
  },
  mounted() {
    this.loadSaveLocation()
    this.loadUserName()
  },

  
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },

    /**
     * 规则整体写回。勾选顺序统一按固定顺序存，刷新后摘要不会变来变去。
     */
    saveSameResourceRule(criteria: SameResourceCriterion[], mode: SameResourceMode) {
      this.updateSetting('sameResourceRule', {
        version: 1,
        mode,
        criteria: SAME_RESOURCE_CRITERIA.filter(criterion => criteria.includes(criterion))
      })
    },

    toggleSameResourceCriterion(criterion: SameResourceCriterion, event: Event) {
      const checked = (event.target as HTMLInputElement).checked
      const current = this.sameResourceRule.criteria
      const next = checked
        ? [...current, criterion]
        : current.filter(item => item !== criterion)
      if (next.length === 0) {
        ;(event.target as HTMLInputElement).checked = true
        notify.warning(
          this.t('settings.sameResource.title'),
          this.t('settings.sameResource.needOne')
        )
        return
      }
      this.saveSameResourceRule(next, this.sameResourceRule.mode)
    },

    setSameResourceMode(mode: SameResourceMode) {
      this.saveSameResourceRule(this.sameResourceRule.criteria, mode)
    },

    applySameResourcePreset(presetId: string) {
      const preset = SAME_RESOURCE_PRESETS.find(item => item.id === presetId)
      if (!preset) return
      this.saveSameResourceRule(preset.criteria, this.sameResourceRule.mode)
    },

    isSameResourcePresetActive(presetId: string) {
      const preset = SAME_RESOURCE_PRESETS.find(item => item.id === presetId)
      if (!preset) return false
      const current = this.sameResourceRule.criteria
      return preset.criteria.length === current.length && preset.criteria.every(item => current.includes(item))
    },

    /**
     * 关闭标记文件前提醒一次：之后移动或改名再导入，可能认不回原记录。
     * 取消时把开关强制刷回开启，避免组件内部已经先切过去了。
     */
    async onResourceMarkerChange(enabled: boolean) {
      if (!enabled) {
        const confirmed = await confirmService.confirm(
          this.t('settings.resourceMarker.disableConfirm')
        )
        if (!confirmed) {
          this.resourceMarkerToggleKey += 1
          return
        }
      }
      this.updateSetting('resourceMarkerEnabled', enabled)
    },

    async loadUserName() {
      try {
        const profile = await saveManager.loadUserProfile()
        this.userName = profile?.name || ''
        this.savedUserName = this.userName
      } catch (error) {
        console.error('加载用户名失败:', error)
      }
    },

    /**
     * 用户档案是整条覆盖写入的，保存前先读回统计字段，
     * 只改 name，避免把登录记录和成就进度冲掉。
     */
    async saveUserName() {
      const name = this.userName.trim()
      this.userName = name
      if (this.isSavingUserName || name === this.savedUserName) return

      this.isSavingUserName = true
      try {
        const profile = await saveManager.loadUserProfile()
        const success = await saveManager.saveUserProfile({ ...profile, name })
        if (success) {
          this.savedUserName = name
          notify.success(lt('用户名已保存'), '')
        } else {
          notify.error(lt('保存用户名失败'))
        }
      } catch (error: any) {
        console.error('保存用户名失败:', error)
        notify.error(lt('保存用户名失败'), error.message)
      } finally {
        this.isSavingUserName = false
      }
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
      // 先写入内存，卡片收到事件时才能读到新开关，不必再等旧的本地缓存。
      setDisguiseModeEnabled(newValue)
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

    /**
     * 在文件管理器中打开伪装图片文件夹。
     * 目录不存在时由主进程先建好，方便直接把图片和 disguise.txt 放进去。
     */
    async openDisguiseFolder() {
      try {
        if (!window.electronAPI?.getDisguiseDirectory || !window.electronAPI?.openFolder) {
          notify.info(this.t('settings.general.folderPath'), this.t('settings.general.browserEnvironmentNote'))
          return
        }
        /** 主进程按“里面有图片”选中的 disguise 文件夹。 */
        const result = await window.electronAPI.getDisguiseDirectory()
        if (!result?.success || !result.directory) {
          notify.error(this.t('settings.general.folderOpenFailed'), result?.error || this.t('settings.disguiseMode.openFolderFailed'))
          return
        }
        const opened = await window.electronAPI.openFolder(result.directory)
        if (opened.success) {
          notify.success(this.t('settings.general.folderOpened'), this.t('settings.disguiseMode.openedDetail', { path: result.directory }))
        } else {
          notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: opened.error }))
        }
      } catch (error: any) {
        notify.error(this.t('settings.general.folderOpenFailed'), this.t('settings.general.folderOpenFailedDetail', { error: error.message }))
      }
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
            url: this.settings.safetyKeyUrl,
            shortcut: this.settings.safetyKeyShortcut
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
              url: newUrl,
              shortcut: this.settings.safetyKeyShortcut
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

    /**
     * 安全键快捷键改完后立刻重新注册。
     * 注册失败就退回原来的键，避免界面上显示一个按了没反应的组合。
     */
    async onSafetyKeyShortcutChange(newKey: string) {
      const previousKey = this.settings.safetyKeyShortcut
      this.updateSetting('safetyKeyShortcut', newKey)
      if (this.settings.safetyKeyEnabled && window.electronAPI && window.electronAPI.setSafetyKey) {
        try {
          const result = await window.electronAPI.setSafetyKey(true, this.settings.safetyKeyUrl, newKey)
          if (!result.success) {
            this.updateSetting('safetyKeyShortcut', previousKey)
            notify.error(this.t('settings.general.safetyKeyFailed'), result.error || this.t('settings.general.safetyKeyFailedDetail'))
            return
          }
        } catch (error: any) {
          this.updateSetting('safetyKeyShortcut', previousKey)
          notify.error(this.t('settings.general.safetyKeyFailed'), error.message)
          return
        }
      }
      try {
        const event = new CustomEvent('safety-key-changed', {
          detail: {
            enabled: this.settings.safetyKeyEnabled,
            url: this.settings.safetyKeyUrl,
            shortcut: newKey
          }
        })
        window.dispatchEvent(event)
      } catch (error) {
        console.error('触发安全键快捷键变化事件失败:', error)
      }
      notify.success(this.t('settings.general.safetyKeyUpdated'), newKey)
    },

    async onShowWindowShortcutChange(newKey: string) {
      const previousKey = this.settings.showWindowShortcut
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
            this.updateSetting('showWindowShortcut', previousKey)
          }
        } catch (error: any) {
          console.error('更新打开软件快捷键失败:', error)
          notify.error(this.t('messages.error'), error.message)
          this.updateSetting('showWindowShortcut', previousKey)
        }
      } else {
        notify.success(this.t('settings.general.showWindowShortcutUpdated'), this.t('settings.general.showWindowShortcutSet', { key: newKey }))
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
        this.saveLocationPath = result.directory
        this.saveLocationMode = 'custom'

        const newSaveDataPath = result.directory + '/SaveData'
        const saveManagerUpdated = saveManager.setDataDirectory(newSaveDataPath)
        if (saveManagerUpdated) {
          console.log('SaveManager数据目录已更新为:', newSaveDataPath)
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

    async openSaveDataFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          const saveDataPath = window.electronAPI.getSaveDataDirectory
            ? await window.electronAPI.getSaveDataDirectory()
            : 'SaveData'
          
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
          notify.info(this.t('settings.general.folderPath'), `SaveData\n\n${this.t('settings.general.browserEnvironmentNote')}`)
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

.theme-setting {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.theme-palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}

.theme-palette {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin: 0;
  padding: 8px 8px 10px;
  /* 卡片本身固定浅色，避免被当前主题染色，色条才能用来比较。 */
  border: 1px solid #e6e6e6;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: center;
}

.theme-palette:hover {
  border-color: #bdbdbd;
}

.theme-palette.active {
  border: 2px solid #4a5568;
  padding: 7px 7px 9px;
}

.theme-swatch {
  display: flex;
  height: 36px;
  border-radius: 6px;
  overflow: hidden;
}

.theme-swatch-bar {
  flex: 1;
}

.theme-name {
  color: #2d2d2d;
  font-size: 13px;
  line-height: 1.3;
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

.resource-rule-setting {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.resource-rule-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.rule-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-preset {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rule-preset:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.rule-preset.active {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  font-weight: 600;
}

.rule-criteria {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.rule-criterion {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rule-criterion.active {
  border-color: var(--accent-color);
  box-shadow: inset 0 0 0 1px var(--accent-color);
}

.rule-criterion input {
  margin-top: 2px;
  accent-color: var(--accent-color);
}

.rule-criterion-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rule-criterion-name {
  color: var(--text-primary);
  font-size: 0.92rem;
  font-weight: 500;
}

.rule-criterion-desc {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
}

.rule-mode {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.rule-mode-label {
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.rule-mode-option {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 0.88rem;
  cursor: pointer;
}

.rule-mode-option input {
  accent-color: var(--accent-color);
}

.rule-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.rule-summary-label {
  margin-right: 4px;
}

.rule-summary strong {
  color: var(--text-primary);
  font-weight: 600;
}

.rule-warning,
.rule-hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
}

.rule-warning {
  color: #d97706;
}

.rule-hint {
  color: var(--text-secondary);
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
  color: var(--text-on-accent, #1a1a1a);
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

