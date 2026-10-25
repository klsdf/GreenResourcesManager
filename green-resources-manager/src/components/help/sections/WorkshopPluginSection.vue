<template>
  <HelpSection
    :title="$lt('🧩 自定义功能')"
    :subtitle="$lt('用 mods 里的插件给侧边栏加一个新入口')"
    :intro="$lt('插件适合程序里原来没有的功能。它不会变成一张收文件的资源页，而是自己登记一个侧边栏入口，点进去打开自己的页面。')"
  >
    <DetailCard :title="$lt('插件放在哪')">
      <p>{{ $lt('放在应用根目录的 mods 文件夹。创意工坊页面可以打开这个文件夹。每个插件是一个子文件夹，里面至少要有 manifest.json 和入口脚本，默认是 index.js。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('让它出现在列表里')">
      <p>{{ $lt('放好后，在创意工坊点「刷新」。新插件默认是关的，打开开关才会加载。关掉开关会卸载插件，并拿掉它注册的侧边栏入口。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('入口要导出什么')">
      <p>{{ $lt('index.js 使用 export default。加载时调用 onLoad(api)，卸载时调用 onUnload(api)。脚本里不要写 import，加载器不会去找外部模块。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('记下自己的数据')">
      <p>{{ $lt('api.storage.get、set、remove。数据写在本机，键名会自动加上插件编号，避免和别的插件撞车。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('在侧边栏加一个入口')">
      <p>{{ $lt('api.navigation.register，传入 id、name、icon 和 onClick。不用时调用 api.navigation.unregister。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('弹出提示')">
      <p>{{ $lt('api.ui.showNotification(标题, 类型, { message })。类型可以是 success、info 或 error。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('打开自己的页面')">
      <p>{{ $lt('api.ui.showCustomView({ title, content, onMount })。content 是一段 HTML。onMount 会拿到页面容器，用来给按钮绑定点击。') }}</p>
    </DetailCard>
    <DetailCard :title="$lt('发布到公共工坊')">
      <p>{{ $lt('在插件自己的 GitHub 仓库发布 Release，把 manifest.json、入口脚本和可选的 styles.css 作为资源上传，再把仓库写进 workshop/community-mods.json。客户端会从最新 Release 读取文件和版本。') }}</p>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>
