<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSlider
        title="JPEG压缩质量"
        description="设置缩略图生成的JPEG压缩质量 (1-100)"
        :model-value="settings.image.jpegQuality"
        :min="10"
        :max="100"
        unit="%"
        @update:model-value="updateSetting('image.jpegQuality', $event)"
      />
      
      <SettingSlider
        title="缩略图尺寸"
        description="设置缩略图的最大宽度和高度 (像素)"
        :model-value="settings.image.thumbnailSize"
        :min="100"
        :max="500"
        :step="10"
        unit="px"
        @update:model-value="updateSetting('image.thumbnailSize', $event)"
      />
      
      <SettingSlider
        title="图片缓存大小"
        description="设置图片缓存的最大内存占用 (MB)"
        :model-value="settings.image.cacheSize"
        :min="10"
        :max="200"
        :step="10"
        unit="MB"
        @update:model-value="updateSetting('image.cacheSize', $event)"
      />
      
      <SettingToggle
        title="启用缩略图模式"
        description="在预览网格中使用缩略图以节省内存"
        :model-value="settings.image.enableThumbnails"
        @update:model-value="updateSetting('image.enableThumbnails', $event)"
      />
      
      <SettingSlider
        title="图片预加载数量"
        description="在阅读器中预加载的图片数量"
        :model-value="settings.image.preloadCount"
        :min="1"
        :max="10"
        unit="张"
        @update:model-value="updateSetting('image.preloadCount', $event)"
      />
      
      <SettingToggle
        title="启用硬件加速"
        description="使用GPU硬件加速渲染图片"
        :model-value="settings.image.hardwareAcceleration"
        @update:model-value="updateSetting('image.hardwareAcceleration', $event)"
      />
      
      <SettingSelect
        title="图片渲染质量"
        description="设置图片的渲染质量级别"
        :model-value="settings.image.renderQuality"
        :options="renderQualityOptions"
        @update:model-value="updateSetting('image.renderQuality', $event)"
      />
      
      <SettingSlider
        title="详情页显示图片数量"
        description="设置详情页中每页显示的图片数量"
        :model-value="settings.image.detailPageSize"
        :min="10"
        :max="100"
        :step="5"
        unit="张"
        @update:model-value="updateSetting('image.detailPageSize', $event)"
      />
      
      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">测试图片设置</span>
          <span class="setting-desc">测试当前图片设置是否正确保存</span>
        </label>
        <div class="setting-control">
          <button class="btn-test-image-settings" @click="testImageSettings">
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
import alertService from '../../utils/AlertService.ts'
import SettingToggle from './SettingToggle.vue'
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'

export default {
  name: 'ImageSettings',
  components: {
    SettingToggle,
    SettingSelect,
    SettingSlider
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
      renderQualityOptions: [
        { value: 'high', label: '高质量' },
        { value: 'medium', label: '中等质量' },
        { value: 'low', label: '低质量' }
      ]
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
    },
    
    async testImageSettings() {
      try {
        console.log('=== 测试图片设置 ===')
        console.log('当前图片设置:', {
          jpegQuality: this.settings.image.jpegQuality,
          thumbnailSize: this.settings.image.thumbnailSize,
          cacheSize: this.settings.image.cacheSize,
          enableThumbnails: this.settings.image.enableThumbnails,
          preloadCount: this.settings.image.preloadCount,
          hardwareAcceleration: this.settings.image.hardwareAcceleration,
          renderQuality: this.settings.image.renderQuality,
          detailPageSize: parseInt(this.settings.image.detailPageSize)
        })
        
        // 保存设置
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('图片设置保存成功')
          
          // 重新加载设置验证
          const reloadedSettings = await saveManager.loadSettings()
          console.log('重新加载的图片设置:', {
            jpegQuality: reloadedSettings.image?.jpegQuality,
            thumbnailSize: reloadedSettings.image?.thumbnailSize,
            cacheSize: reloadedSettings.image?.cacheSize,
            enableThumbnails: reloadedSettings.image?.enableThumbnails,
            preloadCount: reloadedSettings.image?.preloadCount,
            hardwareAcceleration: reloadedSettings.image?.hardwareAcceleration,
            renderQuality: reloadedSettings.image?.renderQuality,
            detailPageSize: reloadedSettings.image?.detailPageSize
          })
          
          notify.success('图片设置测试完成', '图片设置已保存并验证，请查看控制台输出')
        } else {
          await alertService.error('图片设置保存失败！', '错误')
        }
      } catch (error: any) {
        console.error('测试图片设置失败:', error)
        await alertService.error('测试图片设置失败: ' + error.message, '错误')
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

.btn-test-image-settings {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test-image-settings:hover {
  background: #d97706;
  transform: translateY(-1px);
}
</style>

