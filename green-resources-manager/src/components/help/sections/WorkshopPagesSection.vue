<template>
  <HelpSection
    :title="$lt('📄 自定义页面')"
    :subtitle="$lt('从模板复制一页，再改它怎么收文件')"
    :intro="$lt('资源页面不是插件。它是侧边栏里的一张名单，用来收集某一类文件。')"
  >
    <DetailCard :title="$lt('从模板新建')">
      <p>{{ $lt('进入设置的「页面管理」，点「添加新页面」。先选游戏、番剧、小说、电影、漫画、单图、软件、网站、音频或其它，再写页面名称。模板决定这一页一开始接受什么文件、有哪些按钮和筛选。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('配置是怎么生成的')">
      <p>{{ $lt('程序会把 configs/pages 里对应的模板复制成一份新的 json，文件名以 custom- 开头，并登记到 pageOrder.json。新页面有自己的编号，名单和原来的页面分开。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('在界面里改')">
      <p>{{ $lt('点这一页的铅笔，可以改名称、图标、接受的文件、编辑时显示的字段、侧边栏筛选、每页数量、卡片宽窄、空状态文字、添加和编辑窗口的标题，以及排序方式。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('直接改文件')">
      <p>{{ $lt('页面管理里可以打开配置目录，直接编辑这些 json。改的是这一页怎么显示和接受什么，不会改已经保存的资源内容。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('文件按本身分类')">
      <p>{{ $lt('接受的资源按文件本身分，例如可执行文件、图片、图片文件夹、视频、视频文件夹、小说文件、音频和网址。同一种文件会归到列表里靠前的那一种。') }}</p>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>
