<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSelect
        title="默认打开方式"
        description="选择小说的默认打开方式"
        :model-value="settings.novelDefaultOpenMode"
        :options="novelOpenModeOptions"
        @update:model-value="updateSetting('novelDefaultOpenMode', $event)"
      />
      
      <SettingSlider
        title="字体大小"
        description="设置阅读器的默认字体大小"
        :model-value="settings.novelFontSize"
        :min="12"
        :max="24"
        unit="px"
        @update:model-value="updateSetting('novelFontSize', $event)"
      />
      
      <SettingSlider
        title="行高"
        description="设置阅读器的行高"
        :model-value="settings.novelLineHeight"
        :min="1.2"
        :max="2.5"
        :step="0.1"
        @update:model-value="updateSetting('novelLineHeight', $event)"
      />
      
      <SettingSelect
        title="字体"
        description="选择阅读器的默认字体"
        :model-value="settings.novelFontFamily"
        :options="fontFamilyOptions"
        @update:model-value="updateSetting('novelFontFamily', $event)"
      />
      
      <SettingColorPicker
        title="背景色"
        description="设置阅读器的背景颜色"
        :model-value="settings.novelBackgroundColor"
        @update:model-value="updateSetting('novelBackgroundColor', $event)"
      />
      
      <SettingColorPicker
        title="文字颜色"
        description="设置阅读器的文字颜色"
        :model-value="settings.novelTextColor"
        @update:model-value="updateSetting('novelTextColor', $event)"
      />
      
      <SettingSlider
        title="每页字数"
        description="设置每页显示的字数"
        :model-value="settings.novelWordsPerPage"
        :min="500"
        :max="2000"
        unit="字"
        @update:model-value="updateSetting('novelWordsPerPage', $event)"
      />
      
      <SettingToggle
        title="显示阅读进度"
        description="在阅读器中显示阅读进度"
        :model-value="settings.novelShowProgress"
        @update:model-value="updateSetting('novelShowProgress', $event)"
      />
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">测试设置</span>
          <span class="setting-desc">测试当前设置是否正确保存</span>
        </label>
        <div class="setting-control">
          <button class="btn-test-settings" @click="testNovelSettings">
            测试设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'
import SettingColorPicker from './SettingColorPicker.vue'

export default {
  name: 'NovelSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingSlider,
    SettingColorPicker
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  data() {
    return {
      novelOpenModeOptions: [
        { value: 'internal', label: '应用内阅读器' },
        { value: 'external', label: '外部应用' }
      ],
      fontFamilyOptions: [
        { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
        { value: 'SimSun, serif', label: '宋体' },
        { value: 'SimHei, sans-serif', label: '黑体' },
        { value: 'KaiTi, serif', label: '楷体' },
        { value: 'Arial, sans-serif', label: 'Arial' },
        { value: 'Times New Roman, serif', label: 'Times New Roman' }
      ]
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    async testNovelSettings() {
      try {
        console.log('=== 测试小说设置 ===')
        console.log('当前设置:', {
          novelDefaultOpenMode: this.settings.novelDefaultOpenMode,
          novelFontSize: this.settings.novelFontSize,
          novelLineHeight: this.settings.novelLineHeight,
          novelFontFamily: this.settings.novelFontFamily,
          novelBackgroundColor: this.settings.novelBackgroundColor,
          novelTextColor: this.settings.novelTextColor,
          novelWordsPerPage: this.settings.novelWordsPerPage,
          novelShowProgress: this.settings.novelShowProgress
        })
        
        // 保存设置
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('设置保存成功')
          
          // 重新加载设置验证
          const reloadedSettings = await saveManager.loadSettings()
          console.log('重新加载的设置:', reloadedSettings)
          
          notify.success('测试完成', '设置已保存并验证，请查看控制台输出')
        } else {
          notify.error('设置保存失败', '设置保存失败！')
        }
      } catch (error: any) {
        console.error('测试设置失败:', error)
        alert('测试设置失败: ' + error.message)
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

.setting-slider {
  width: 150px;
  margin-right: 10px;
}

.setting-value {
  color: #718096;
  font-size: 0.9rem;
  min-width: 50px;
}

.color-input {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.color-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
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

.btn-test-settings {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test-settings:hover {
  background: #059669;
  transform: translateY(-1px);
}
</style>

