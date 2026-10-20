<template>
  <div class="sponsor-view">
    <div class="sponsor-content">
      <!-- 微信赞助码 -->
      <section class="sponsor-section">
        <h3 class="section-title">{{ $lt('赞赏') }}</h3>
        <p class="section-desc">{{ $lt('扫码时，如有意愿，请将名字备注到付款信息里面！以便加入赞助人名单！') }}</p>
        <div class="qrcode-wrap">
          <div
            v-for="(src, i) in wechatSponsorImages"
            :key="i"
            class="qrcode-item"
          >
            <img
              :src="src"
              :alt="`微信赞赏码 ${i + 1}`"
              class="qrcode-img"
              @error="onWechatImgError(i)"
            />
            <p v-if="wechatImgErrors[i]" class="qrcode-tip">{{ $lt('请将图片放到') }} <code>public{{ src }}</code></p>
          </div>
        </div>
      </section>

      <!-- 游戏宣传 -->
      <section class="sponsor-section game-promo">
        <h3 class="section-title">{{ $lt('我的游戏') }}</h3>
        <div v-if="gameLink" class="game-card">
          <div class="game-cover-wrap" @click="openGameLink">
            <fun-carousel
              :items="gameCovers"
              width="100%"
              height="100%"
              fallback-image="./default-game.png"
              image-alt="游戏封面"
            />
          </div>
          <div class="game-info">
            <h4 class="game-name">{{ gameName }}</h4>
            <p class="game-desc">{{ gameDesc }}</p>
            <a
              :href="gameLink"
              target="_blank"
              rel="noopener noreferrer"
              class="game-link-text"
              @click.prevent="openGameLink"
            >{{ $lt('去看看 →（感兴趣可以点一下愿望单！谢谢喵！）') }}</a>
          </div>
        </div>
        <div v-else class="game-card game-card--placeholder">
          <div class="game-cover-wrap">
            <fun-carousel
              :items="gameCovers"
              width="100%"
              height="100%"
              fallback-image="./default-game.png"
              image-alt="游戏封面"
            />
          </div>
          <div class="game-info">
            <h4 class="game-name">{{ gameName }}</h4>
            <p class="game-desc">{{ gameDesc }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 赞赏码：可配置两张图片并排显示
const wechatSponsorImages = ref<string[]>(['./imgs/wechat-sponsor.png', './imgs/alipay-sponsor.jpg'])
const wechatImgErrors = ref<Record<number, boolean>>({})
function onWechatImgError(index: number) {
  wechatImgErrors.value = { ...wechatImgErrors.value, [index]: true }
}

// 游戏宣传：修改以下内容即可
const gameName = ref('我思故我在')
const gameDesc = ref('本游戏是一款实验性意识流视觉小说。讲述了您和一位失忆的少女在无人的都市中探索、漫步、旅行、歌唱、舞蹈、欢笑、哭泣、相爱、相拥的故事。游戏内采用了一种类似诗歌的文本形式，如果您对诗歌有所兴趣，不妨停歇片刻，一同在虚假而美好的游戏世界中，与少女共同书写一段只属于你们的诗。')
const gameLink = ref('https://store.steampowered.com/app/3985390/_/?beta=1') // 填游戏链接，留空则不显示“去看看”
const gameCovers = ref<string[]>([
  './imgs/games-sponsor/1.jpg',
  './imgs/games-sponsor/2.jpg',
  './imgs/games-sponsor/3.jpg',
  './imgs/games-sponsor/4.jpg',
  './imgs/games-sponsor/5.jpg',
  './imgs/games-sponsor/6.jpg',
  './imgs/games-sponsor/7.jpg']) // 多张封面图，由 fun-carousel 轮播展示

/** 打开游戏链接（封面与「去看看」共用，Electron 用默认浏览器，否则新标签打开） */
function openGameLink() {
  const url = gameLink.value
  if (!url) return
  const api = (window as any).electronAPI
  if (api?.openExternal) {
    api.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
</script>

<style scoped>
.sponsor-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);


  --image-width: 800px;
  --image-height: 500px;
}
.sponsor-content {
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.sponsor-title {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}
.sponsor-desc {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
.section-desc{
  color:rgb(255, 73, 73);
}

.sponsor-section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  border-radius: 0;
  background: var(--bg-secondary);
  border: none;
  border-bottom: 1px solid var(--border-color);
}
.sponsor-section:last-child {
  margin-bottom: 0;
  border-bottom: none;
}


.qrcode-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: var(--spacing-lg);
}
.qrcode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}
.qrcode-img {
  width: 450px;
  height: 450px;
  object-fit: contain;
  background: #fff;
  border-radius: var(--radius-sm);
  padding: 8px;
  box-sizing: border-box;
}
.qrcode-tip {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.qrcode-tip code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  font-size: 0.8rem;
}

.section-title {
  margin-bottom: 15px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}


.game-card {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.game-cover-wrap {
  position: relative;
  width: var(--image-width);
  height: var(--image-height);
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.game-card:not(.game-card--placeholder) .game-cover-wrap {
  cursor: pointer;
}
.game-info {
  flex: 1;
  min-width: 0;

  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-xs);
}
.game-name {

  font-size: 3rem;
  font-weight: 600;
  color: var(--text-primary);
}
.game-desc {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.game-link-text {
  margin-top: var(--spacing-xs);
  font-size: 1.5rem;
  color: var(--color-primary, #4a89ff);
  text-decoration: none;
  align-self: flex-start;
}
.game-link-text:hover {
  text-decoration: underline;
}
.game-card--placeholder {
  cursor: default;
  pointer-events: none;
}
.game-card--placeholder .game-link-text {
  display: none;
}
</style>
