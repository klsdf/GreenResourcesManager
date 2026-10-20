<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingToggle
        :title="$lt('显示桌宠')"
        :description="$lt('在桌面上显示一个可拖动的桌宠')"
        :model-value="petWindowVisible"
        @update:model-value="onPetWindowToggle"
      />
    </div>
  </div>
</template>

<script lang="ts">
import notify from '../../utils/NotificationService'
import SettingToggle from './SettingToggle.vue'

export default {
  name: 'PetSettings',
  components: {
    SettingToggle
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
      petWindowVisible: false
    }
  },
  async mounted() {
    // 检查桌宠窗口是否可见
    await this.checkPetWindowVisibility()
  },
  methods: {
    async checkPetWindowVisibility() {
      try {
        if (window.electronAPI && window.electronAPI.isPetWindowVisible) {
          const result = await window.electronAPI.isPetWindowVisible()
          this.petWindowVisible = result.visible || false
        }
      } catch (error) {
        console.error('检查桌宠窗口状态失败:', error)
      }
    },
    
    async onPetWindowToggle(newValue: boolean) {
      this.petWindowVisible = newValue
      try {
        if (window.electronAPI && window.electronAPI.togglePetWindow) {
          const result = await window.electronAPI.togglePetWindow()
          if (result.success) {
            this.petWindowVisible = result.visible || false
            notify.success(
              '桌宠已' + (this.petWindowVisible ? '显示' : '隐藏'),
              this.petWindowVisible ? '桌宠已显示在桌面上，可以拖动它' : '桌宠已隐藏'
            )
          } else {
            // 恢复状态
            this.petWindowVisible = !newValue
            notify.error('操作失败', '无法切换桌宠显示状态')
          }
        } else {
          notify.warning('功能不可用', '当前环境不支持桌宠功能')
          this.petWindowVisible = !newValue
        }
      } catch (error: any) {
        console.error('切换桌宠显示状态失败:', error)
        notify.error('操作失败', `切换桌宠显示状态失败: ${error.message}`)
        this.petWindowVisible = !newValue
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
</style>

