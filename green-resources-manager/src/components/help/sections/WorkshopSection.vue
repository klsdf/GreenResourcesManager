<template>
  <HelpSection
    :title="$lt('🎨 创意工坊手册')"
    :subtitle="$lt('每种常见做法单独一页')"
    :intro="$lt('自定义有两条路。想多收一类文件，看「自定义页面」。想在侧边栏加一个程序里原来没有的功能，看「自定义功能」。后面两页是可以直接照着做的例子。')"
  >
    <DetailCard :title="$lt('📄 自定义页面')">
      <p>{{ $lt('从游戏、电影、小说这些模板复制一页资源名单，并改它接受什么文件、显示哪些字段和筛选。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('🧩 自定义功能')">
      <p>{{ $lt('在 mods 文件夹里放一个插件。打开开关后，它可以在侧边栏登记入口，并打开自己的页面。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('📝 便笺插件')">
      <p>{{ $lt('最少的例子。两份文件放进 mods/hello-note，侧边栏就会多出一个「便笺」。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('📅 日期管理插件')">
      <p>{{ $lt('mods/calendar-manager 里的完整例子。它有月历、增删日程，并把数据记在本机。') }}</p>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>
