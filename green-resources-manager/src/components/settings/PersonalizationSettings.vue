<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingInput
        :title="$t('settings.personalization.customAppTitle')"
        :description="$t('settings.personalization.customAppTitleDesc')"
        :model-value="localCustomAppTitle"
        :placeholder="$t('settings.personalization.customAppTitlePlaceholder')"
        @update:model-value="onCustomAppTitleInput"
        @blur="onCustomAppTitleBlur"
      />
      
      <SettingInput
        :title="$t('settings.personalization.customAppSubtitle')"
        :description="$t('settings.personalization.customAppSubtitleDesc')"
        :model-value="localCustomAppSubtitle"
        :placeholder="$t('settings.personalization.customAppSubtitlePlaceholder')"
        @update:model-value="onCustomAppSubtitleInput"
        @blur="onCustomAppSubtitleBlur"
      />
      
      <SettingFilePicker
        :title="$t('settings.personalization.backgroundImage')"
        :description="$t('settings.personalization.backgroundImageDesc')"
        :model-value="settings.backgroundImagePath"
        :placeholder="$t('settings.personalization.backgroundImagePlaceholder')"
        picker-type="image"
        :browse-button-text="$t('settings.personalization.selectImageButton')"
        @update:model-value="onBackgroundImageChange"
      />
      
      <div v-if="settings.backgroundImagePath" class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ $t('settings.personalization.clearBackgroundTitle') }}</span>
          <span class="setting-desc">{{ $t('settings.personalization.clearBackgroundDesc') }}</span>
        </label>
        <div class="setting-control">
          <button class="btn-clear-background" @click="clearBackgroundImage">
            <span class="btn-icon">🗑️</span>
            {{ $t('settings.personalization.clearButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n'
import notify from '../../utils/NotificationService'
import SettingFilePicker from './SettingFilePicker.vue'
import SettingInput from './SettingInput.vue'

export default {
  name: 'PersonalizationSettings',
  components: {
    SettingFilePicker,
    SettingInput
  },
  props: {
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
      localCustomAppTitle: '',
      localCustomAppSubtitle: ''
    }
  },
  watch: {
    'settings.customAppTitle'(newValue) {
      this.localCustomAppTitle = newValue || ''
    },
    'settings.customAppSubtitle'(newValue) {
      this.localCustomAppSubtitle = newValue || ''
    }
  },
  mounted() {
    // 初始化本地值
    this.localCustomAppTitle = this.settings.customAppTitle || ''
    this.localCustomAppSubtitle = this.settings.customAppSubtitle || ''
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    onCustomAppTitleInput(newTitle: string) {
      this.localCustomAppTitle = newTitle
    },
    
    onCustomAppSubtitleInput(newSubtitle: string) {
      this.localCustomAppSubtitle = newSubtitle
    },
    
    onCustomAppTitleBlur() {
      const newTitle = this.localCustomAppTitle || ''
      this.updateSetting('customAppTitle', newTitle)
      try {
        const event = new CustomEvent('custom-app-title-changed', {
          detail: { title: newTitle }
        })
        window.dispatchEvent(event)
        console.log('已触发 custom-app-title-changed 事件')
      } catch (error) {
        console.error('触发标题变化事件失败:', error)
      }
      notify.success(this.t('settings.personalization.titleUpdated'), this.t('settings.personalization.titleSetTo', { title: newTitle || this.t('app.appTitle') }))
    },
    
    onCustomAppSubtitleBlur() {
      const newSubtitle = this.localCustomAppSubtitle || ''
      this.updateSetting('customAppSubtitle', newSubtitle)
      try {
        const event = new CustomEvent('custom-app-subtitle-changed', {
          detail: { subtitle: newSubtitle }
        })
        window.dispatchEvent(event)
        console.log('已触发 custom-app-subtitle-changed 事件')
      } catch (error) {
        console.error('触发副标题变化事件失败:', error)
      }
      notify.success(this.t('settings.personalization.subtitleUpdated'), this.t('settings.personalization.subtitleSetTo', { subtitle: newSubtitle || this.t('app.appSubtitle') }))
    },
    
    onBackgroundImageChange(newPath: string) {
      this.updateSetting('backgroundImagePath', newPath)
      try {
        const event = new CustomEvent('background-image-changed', {
          detail: { path: newPath }
        })
        window.dispatchEvent(event)
        console.log('已触发 background-image-changed 事件')
      } catch (error) {
        console.error('触发背景图片变化事件失败:', error)
      }
      notify.success(this.t('settings.personalization.backgroundUpdated'), this.t('settings.personalization.backgroundSetTo', { path: newPath }))
    },
    
    clearBackgroundImage() {
      this.updateSetting('backgroundImagePath', '')
      try {
        const event = new CustomEvent('background-image-changed', {
          detail: { path: '' }
        })
        window.dispatchEvent(event)
        console.log('已触发 background-image-changed 事件（清除）')
      } catch (error) {
        console.error('触发背景图片清除事件失败:', error)
      }
      notify.success(this.t('settings.personalization.backgroundCleared'), this.t('settings.personalization.backgroundRemoved'))
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

.btn-clear-background {
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

.btn-clear-background:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}
</style>

