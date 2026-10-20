<template>
  <HelpSection 
    :title="$lt('📚 小说管理模块')" 
    :subtitle="$lt('我不咋用，只是觉得应该加一个，就加了')"
    intro="小说管理模块主要用于管理txt文件，本模块也内置了一个阅读器，可以直接在APP内快速地阅读小说。">
    <DetailCard :title="$lt('🎯 添加小说')">
      <ul>
        <li>{{ $lt('点击小说页的上方添加小说按钮，可以添加小说') }}</li>
        <li>{{ $lt('拖动txt文件到小说页，可以添加小说') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎨 内置阅读器的设置')">
      <p>{{ $lt('阅读器的设置可以在设置-小说中进行设置。可以设置字体大小、行距、背景色，支持夜间模式，个性化阅读体验。') }}</p>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

