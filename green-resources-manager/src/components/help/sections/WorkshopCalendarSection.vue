<template>
  <HelpSection
    :title="$lt('📅 日期管理插件')"
    :subtitle="$lt('带月历和本地记录的完整例子')"
    :intro="$lt('mods/calendar-manager 是日期管理插件。它会在侧边栏加「日期管理」，打开一个月历，并把日程记在本机。要做带按钮和本地记录的功能，可以先照着它改。')"
  >
    <DetailCard :title="$lt('它做了什么')">
      <ul>
        <li>{{ $lt('onLoad 里用 api.storage.get 读出已经记下的日程。') }}</li>
        <li>{{ $lt('用 api.navigation.register 在侧边栏加上「日期管理」。') }}</li>
        <li>{{ $lt('点进去后，用 api.ui.showCustomView 打开月历。onMount 里给上个月、下个月和添加按钮绑定点击。') }}</li>
        <li>{{ $lt('增删改之后调用 api.storage.set 写回本机。onUnload 时再保存一次，并取消侧边栏入口。') }}</li>
      </ul>
    </DetailCard>
    <DetailCard :title="$lt('文件在哪')">
      <ul>
        <li><strong>manifest.json</strong>{{ $lt('：插件名称、版本和入口文件。') }}</li>
        <li><strong>index.js</strong>{{ $lt('：月历、日程的增删改，以及怎么调用接口。') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>
