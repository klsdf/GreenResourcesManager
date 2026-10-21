<template>
  <HelpSection
    :title="$lt('📝 便笺插件')"
    :subtitle="$lt('两份文件就能在侧边栏加一个页面')"
    :intro="$lt('把下面两份文件放进 mods/hello-note，刷新创意工坊并打开开关。侧边栏会出现「便笺」，点进去就是插件自己的页面。')"
  >
    <DetailCard :title="$lt('manifest.json')">
      <CodeBlock :code="manifestExample" language="json" />
    </DetailCard>
    <DetailCard :title="$lt('index.js')">
      <CodeBlock :code="entryExample" language="javascript" />
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
import CodeBlock from '../../CodeBlock.vue'

/** 最小插件的清单，放在 mods/hello-note/manifest.json。 */
const manifestExample = `{
  "id": "hello-note",
  "name": "便笺",
  "version": "1.0.0",
  "description": "在侧边栏加一个自己的页面",
  "author": "你的名字",
  "entry": "index.js",
  "icon": "📝"
}`

/** 最小插件的入口。加载时注册侧边栏，点击后打开一段 HTML。 */
const entryExample = `export default {
  async onLoad(api) {
    api.navigation.register({
      id: 'hello-note',
      name: '便笺',
      icon: '📝',
      onClick: () => {
        api.ui.showCustomView({
          title: '便笺',
          content: '<p>这是插件自己的页面。</p>'
        })
      }
    })
  },
  async onUnload(api) {
    api.navigation.unregister('hello-note')
  }
}`
</script>
