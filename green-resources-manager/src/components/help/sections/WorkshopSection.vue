<template>
  <HelpSection 
    :title="$lt('🎨 创意工坊手册')" 
    :subtitle="$lt('了解创意工坊的功能和使用方法')"
    intro="创意工坊功能正在开发中，敬请期待。">
    
    <DetailCard :title="$lt('📝 功能说明')">
      <p>{{ $lt('创意工坊功能即将上线，届时您可以：') }}</p>
      <ul>
        <li>{{ $lt('浏览和下载社区创作的内容') }}</li>
        <li>{{ $lt('分享自己的创作作品') }}</li>
        <li>{{ $lt('与其他用户交流互动') }}</li>
        <li>{{ $lt('发现更多有趣的内容') }}</li>
      </ul>
      <p>{{ $lt('更多详细信息将在功能上线后更新。') }}</p>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

<style scoped>
/* 空的样式，使用默认样式 */
</style>
