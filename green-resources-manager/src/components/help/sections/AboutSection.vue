<template>
  <HelpSection 
    :title="$lt('ℹ️ 关于我们')" 
    :subtitle="$lt('了解 GreenResourcesManager 的更多信息')">
    <!-- 帽子社艺术化展示区域 -->
    <div class="hat-soft-showcase">
      <div class="showcase-header">
        <h2 class="showcase-title">{{ $lt('关于社群') }}</h2>
      </div>
      <div class="hat-soft-logo-container">
        <img :src="baseUrl + 'hat-soft.png'" :alt="$lt('帽子社')" class="hat-soft-logo" />
      </div>
      <div class="hat-soft-content">
        <!-- <h2 class="hat-soft-title">帽子社</h2> -->
        <p class="hat-soft-description"> {{ $lt('帽子社是一个专注于实验游戏开发和游戏理论研究的社群，同时也会涉猎游戏相关的工具、产品开发。如果对游戏感兴趣，欢迎加入我们。') }} </p>
        <div class="hat-soft-links">
          <div class="hat-soft-link-item" @click="openExternalLink('https://qm.qq.com/q/sUCdrpPNkc')">
            <span class="link-icon">💬</span>
            <div class="link-content">
              <span class="link-title">{{ $lt('通知中心') }}</span>
              <span class="link-subtitle">{{ $lt('加入QQ群') }}</span>
            </div>
          </div>
          <div class="hat-soft-link-item" @click="openExternalLink('https://hat-soft.top/')">
            <span class="link-icon">🌐</span>
            <div class="link-content">
              <span class="link-title">{{ $lt('官方网站') }}</span>
              <span class="link-subtitle">hat-soft.top</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 个人信息和名片展示 -->
    <div class="personal-showcase">
      <div class="showcase-header">
        <h2 class="showcase-title">{{ $lt('关于开发者') }}</h2>
      </div>
      <fun-business-card />
      <div class="personal-content">
        <p class="personal-description"> {{ $lt('独立游戏制作人。擅长实验性叙事游戏设计、unity开发、RPGMakerMV开发、Godot开发、WEB开发、作曲、2D美术、游戏理论研究。') }} </p>
        <div class="personal-links">
          <div class="personal-link-item" @click="openExternalLink('https://klsdf.github.io/Profile/')">
            <span class="link-icon">💼</span>
            <div class="link-content">
              <span class="link-title">{{ $lt('个人作品集') }}</span>
              <span class="link-subtitle">{{ $lt('查看更多项目') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 协作者展示区域 -->
    <div class="collaborators-showcase">
      <div class="showcase-header">
        <h2 class="showcase-title">{{ $lt('关于协作者') }}</h2>
      </div>
      <div class="collaborators-content">
        <p class="collaborators-description"> {{ $lt('感谢所有为这个项目做出贡献的协作者们。他们的支持和帮助让这个项目变得更好。') }} </p>
        <div class="collaborators-list">
          <!-- 协作者卡片 -->
          <div 
            class="collaborator-card" 
            v-for="collaborator in collaborators" 
            :key="collaborator.name"
            @click="collaborator.link ? openExternalLink(collaborator.link) : null"
            :class="{ 'clickable': collaborator.link }"
          >
            <div class="collaborator-image-container">
              <img :src="collaborator.image" :alt="collaborator.name" class="collaborator-image" />
            </div>
            <div class="collaborator-name">{{ collaborator.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </HelpSection>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HelpSection from '../HelpSection.vue'
import { useHelpUtils } from '../../../composables/useHelpUtils'

const { openExternalLink } = useHelpUtils()

// 与 vite base: './' 一致，打包后 file:// 下才能正确加载图片
const baseUrl = './'

// 协作者列表数据
const collaborators = ref([
  {
    name: '猫猫D菌_NekoD',
    image: './imgs/猫猫D菌_NekoD.jpg',
    link: 'https://github.com/CutrelyAlex'
  },
  {
    name: 'blycr',
    image: './imgs/blycr.png',
    link: 'https://github.com/blycr'
  }
])
</script>

