<template>
  <div class="settings-section">
    <div class="settings-grid">
      <!-- 标题和选项原文交给 SettingSelect 翻译，这里不再包一层，避免译完的英文被当成新的原文再查一次。 -->
      <SettingSelect
        title="网站打开方式"
        description="选择用系统默认浏览器打开，还是在软件里新开一个标签页"
        :model-value="settings.websiteOpenMode"
        :options="websiteOpenModeOptions"
        @update:model-value="updateSetting('websiteOpenMode', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import SettingSelect from './SettingSelect.vue'

/**
 * 网站设置。
 * 打开方式记在 settings.websiteOpenMode：external 走系统浏览器，internal 走软件新标签页。
 * 默认 external，和以前一点网站就交给系统浏览器的行为一致。
 */
export default {
  name: 'WebsiteSettings',
  components: {
    SettingSelect
  },
  props: {
    /** 设置页当前的整份设置。本组件只读写 websiteOpenMode。 */
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  data() {
    return {
      /**
       * 打开方式选项。
       * value 会写进设置；label 是简体原文，由下拉组件按当前语言翻译。
       */
      websiteOpenModeOptions: [
        { value: 'external', label: '默认浏览器' },
        { value: 'internal', label: '软件新标签页' }
      ]
    }
  },
  methods: {
    /**
     * 把改过的一项交回设置页。
     * 设置页统一负责写进内存并自动保存，这里不直接写盘。
     * @param key 设置字段名
     * @param value 新的值
     */
    updateSetting(key: string, value: string) {
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
