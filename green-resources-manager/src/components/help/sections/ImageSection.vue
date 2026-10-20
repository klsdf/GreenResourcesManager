<template>
  <HelpSection 
    :title="$lt('🖼️ 图片管理模块')" 
    :subtitle="$lt('我一般用来看漫画，主打一个方便')"
    intro="图片管理模块主要用于管理文件夹，比如漫画和套图等资源，不适合管理单一的图片。图片管理器最重要的功能是内置的漫画阅读器，可以直接在APP内快速地阅读漫画。">
    <DetailCard :title="$lt('🖼️ 图片文件夹的添加')">
      <ul>
        <li>{{ $lt('点击图片页的上方添加图片文件夹按钮，可以添加图片文件夹') }}</li>
        <li>{{ $lt('拖动图片文件夹到图片页，可以添加图片文件夹') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🗑️ 删除图片文件夹')">
      <ul>
        <li>{{ $lt('点击漫画卡，进入详情页后，点击删除漫画') }}</li>
        <li>{{ $lt('右键图片文件夹，可以从菜单中删除图片文件夹') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('🎯 内部和外部阅读器')">
      <ul>
        <li>{{ $lt('内部阅读器：本APP提供了内部阅读器可以非常方便地阅读漫画。') }}</li>
        <li>{{ $lt('外部阅读器：如果不想使用自带的阅读器，可以在设置-图片-图片阅读方式 进行设置') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

