<template>
  <HelpSection 
    :title="$lt('🌐 网站收藏模块')" 
    :subtitle="$lt('我只能说比浏览器自带的好用很多。我收藏的网页太多了，每次都要找好久')"
    intro="网站收藏模块主要用于管理网站收藏,目前其实处于beta阶段，功能还不完善。只能对网页打tag方便索引。">
    <DetailCard :title="$lt('🔖 添加网站')">
      <ul>
        <li>{{ $lt('点击网站页的上方添加网站按钮，可以添加网站') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

