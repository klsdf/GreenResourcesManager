<template>
  <HelpSection
    :title="$lt('📦 资源管理')"
    :subtitle="$lt('往页面里加一条资源，或从名单里去掉')"
    :intro="$lt('游戏、图片、视频、小说、网站和音频都用同一套方式添加和删除。按钮上的文字会随当前页面变化。')"
  >
    <DetailCard :title="$lt('添加资源')">
      <ul>
        <li><strong>{{ $lt('直接拖入：') }}</strong>{{ $lt('把文件或文件夹拖到页面上，看到「松开鼠标添加资源」后再松开。') }}</li>
        <li><strong>{{ $lt('点页面里的按钮：') }}</strong>{{ $lt('打开对应页面，点击页面内的添加按钮。按钮文字随页面变化，游戏页是「添加游戏」，电影页是「添加电影」。') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('删除资源')">
      <ul>
        <li><strong>{{ $lt('右键删除：') }}</strong>{{ $lt('在资源卡片上右键，选择删除这一条资源。游戏页里这项叫「删除游戏」，其它页面会换成对应的名字。') }}</li>
        <li><strong>{{ $lt('详情页删除：') }}</strong>{{ $lt('点进这条资源，在详情页里也可以删除。') }}</li>
        <li><strong>{{ $lt('删掉的是名单：') }}</strong>{{ $lt('删除只会从这一页的名单里去掉，不会删除磁盘上的文件。') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
/**
 * 资源管理帮助页。
 * 各类资源的添加和删除入口相同，所以不再按游戏、图片、视频分页，统一写在这一页。
 */
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>
