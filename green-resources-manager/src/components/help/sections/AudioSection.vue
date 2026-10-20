<template>
  <HelpSection 
    :title="$lt('🎵 音频管理模块')" 
    :subtitle="$lt('我超喜欢这个全局播放器，听优香ASMR这一块👍')"
    intro="音频管理模块主要用于管理音频文件,目前暂时不支持视频。除此之外，考虑到很多人（比如我）喜欢在看漫画的时候听音声，所以该模块内置了全局的音频播放器。您可以在任何时候播放音频。">
    <DetailCard :title="$lt('🎵 添加音频')">
      <ul>
        <li>{{ $lt('点击音频页的上方添加音频按钮，可以添加音频') }}</li>
        <li>{{ $lt('拖动音频文件到音频页，可以添加音频') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

