<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingSelect
        :title="$lt('视频播放方式')"
        :description="$lt('选择视频的播放方式')"
        :model-value="settings.videoPlayMode"
        :options="videoPlayModeOptions"
        @update:model-value="updateSetting('videoPlayMode', $event)"
      />
      <SettingSelect
        :title="$lt('转码档位')"
        :description="$lt('只有浏览器播不了的视频才会转码。流畅更省 CPU，标准尽量保持清晰。')"
        :model-value="settings.videoTranscodeQuality || 'standard'"
        :options="transcodeQualityOptions"
        @update:model-value="updateSetting('videoTranscodeQuality', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import SettingSelect from './SettingSelect.vue'
import SettingSlider from './SettingSlider.vue'

export default {
  name: 'VideoSettings',
  components: {
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
      videoPlayModeOptions: [
        { value: 'external', label: '使用外部默认播放器' },
        { value: 'internal', label: '在本应用新标签页中播放' }
      ],
      /** 转码只影响 HEVC 这类浏览器解不了的文件。 */
      transcodeQualityOptions: [
        { value: 'standard', label: '标准' },
        { value: 'fast', label: '流畅' }
      ]
    }
  },
  methods: {
    updateSetting(key: string, value: any) {
      this.$emit('update:settings', { key, value })
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
  gap: 0;
}
</style>

