<template>
  <HelpSection 
    :title="$lt('❓ 常见问题')" 
    :subtitle="$lt('这里本来没有问题，问的人多了就有了问题')">
    <div class="faq-content">
      <div class="faq-category">
        <h3>{{ $lt('神秘问题') }}</h3>
        <div class="faq-list">
          <div class="faq-item">
            <h4>{{ $lt('Q: 在管理器内删除资源后，本地的资源会删除吗？') }}</h4>
            <p>{{ $lt('A: 永远不会！管理器只会删除资源在管理器内的引用，不会删除本地的资源。') }}</p>
          </div>
          <div class="faq-item">
            <h4>{{ $lt('Q: 为什么开启隐藏模式后，所有的封面图都看不见了？') }}</h4>
            <p>{{ $lt('A: 开启隐藏模式后，系统会自动读取根目录的disguise文件夹，但是这个文件夹默认的空的。所以请自行把伪装的图片放进去') }}</p>
          </div>
        </div>
      </div>
    </div>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
</script>

