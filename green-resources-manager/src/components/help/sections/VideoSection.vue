<template>
  <HelpSection 
    :title="$lt('🎬 视频管理模块')" 
    :subtitle="$lt('适合电影和番剧/电视剧，喜欢屯电影的可以试试👍')"
    intro="视频管理模块可以同时管理单一视频和视频文件夹，这是考虑到电影和番剧/电视剧的两种类型而设计的。电影类资源往往是单一的视频，而番剧/电视剧往往会有多个相似的视频组成同一个系列。因此在本地文件容易呈现文件夹的形式。因此视频模块可以同时管理这两种资源。">
    <DetailCard :title="$lt('🎬 视频播放')">
      <p>{{ $lt('内置视频播放器，支持 MP4、AVI、MKV 等格式，双击视频文件即可播放。') }}</p>
    </DetailCard>

    <DetailCard :title="$lt('🖼️ 缩略图预览')">
      <p>{{ $lt('自动生成视频缩略图，快速预览视频内容，无需打开播放器。') }}</p>
    </DetailCard>

    <DetailCard :title="$lt('⌨️ 播放控制')">
      <p>{{ $lt('空格键播放/暂停，方向键控制进度，ESC 退出全屏，支持音量调节。') }}</p>
    </DetailCard>

    <DetailCard :title="$lt('🎯 内部和外部播放器')">
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

