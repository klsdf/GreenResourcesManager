<template>
  <div class="resource-home-view">
    <div class="home-content">
      <div class="placeholder-section">
        <h2>{{ resourceConfig.name }}{{ $lt('主页') }}</h2>
        <p>{{ $lt('这里是') }}{{ resourceConfig.name }}{{ $lt('资源的主页，内容待实现...') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { ResourceType } from '../types/page'
import { RESOURCE_TYPES } from '../types/page'

// 资源类型配置映射
const resourceConfigMap: Record<ResourceType, { name: string; icon: string }> = {
  Game: { name: '游戏', icon: '🎮' },
  Software: { name: '软件', icon: '💾' },
  Image: { name: '图片', icon: '🖼️' },
  SingleImage: { name: '单图', icon: '🖼️' },
  Video: { name: '电影', icon: '🎬' },
  Anime: { name: '番剧', icon: '📺' },
  Novel: { name: '小说', icon: '📚' },
  Website: { name: '网站', icon: '🌐' },
  Audio: { name: '音频', icon: '🎵' }
}

export default {
  name: 'ResourceHomeView',
  props: {
    resourceType: {
      type: String as () => ResourceType,
      required: true,
      validator: (value: string) => {
        return (RESOURCE_TYPES as readonly string[]).includes(value)
      }
    }
  },
  computed: {
    resourceConfig() {
      return resourceConfigMap[this.resourceType as ResourceType] || { name: '未知', icon: '📄' }
    }
  }
}
</script>

<style scoped>
.resource-home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.placeholder-section {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary, #666);
}

.placeholder-section h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--text-primary, #333);
}

.placeholder-section p {
  font-size: 1rem;
}
</style>

