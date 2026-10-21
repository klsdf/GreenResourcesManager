<template>
  <div class="sponsor-view">
    <div class="sponsor-content">
      <!-- 游戏宣传 -->
      <section class="sponsor-section">
        <div class="section-head">
          <h3 class="section-title">{{ $lt('我的游戏') }}</h3>
        </div>
        <div class="game-grid">
          <article v-for="game in games" :key="game.name" class="game-card">
            <div class="game-cover" @click="openGameLink(game.link)">
              <fun-carousel
                v-if="game.covers.length > 1"
                :items="game.covers"
                width="100%"
                height="100%"
                fallback-image="./default-game.png"
                :image-alt="game.name"
              />
              <template v-else>
                <img class="game-cover__blur" :src="game.covers[0]" alt="" aria-hidden="true" />
                <img
                  class="game-cover__img"
                  :src="game.covers[0]"
                  :alt="game.name"
                  loading="lazy"
                  decoding="async"
                />
              </template>
            </div>
            <div class="game-body">
              <div class="game-tags">
                <span v-for="tag in game.tags" :key="tag" class="game-tag">{{ tag }}</span>
              </div>
              <h4 class="game-name">{{ game.name }}</h4>
              <p class="game-desc">{{ game.desc }}</p>
              <a
                :href="game.link"
                target="_blank"
                rel="noopener noreferrer"
                class="game-link"
                @click.prevent="openGameLink(game.link)"
              >
                <svg class="game-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M14 4h6v6" />
                  <path d="M20 4 10 14" />
                  <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
                </svg>
                <span>{{ $lt('在 Steam 查看') }}</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <!-- 微信赞助码 -->
      <section class="sponsor-section">
        <div class="section-head">
          <h3 class="section-title">{{ $lt('赞赏') }}</h3>
        </div>
        <p class="section-note">{{ $lt('扫码时，如有意愿，请将名字备注到付款信息里面！以便加入赞助人名单！') }}</p>
        <div class="qrcode-wrap">
          <figure v-for="(src, i) in wechatSponsorImages" :key="src" class="qrcode-item">
            <div class="qrcode-frame">
              <img
                :src="src"
                :alt="`赞赏码 ${i + 1}`"
                class="qrcode-img"
                loading="lazy"
                @error="onWechatImgError(i)"
              />
            </div>
            <figcaption v-if="wechatImgErrors[i]" class="qrcode-tip">
              {{ $lt('请将图片放到') }} <code>public{{ src }}</code>
            </figcaption>
          </figure>
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

interface GameItem {
  name: string
  desc: string
  link: string
  covers: string[]
  tags: string[]
}

// 游戏宣传：在这里增删游戏即可
const games = ref<GameItem[]>([
  {
    name: '我思故我在',
    desc: '本游戏是一款实验性意识流视觉小说。讲述了您和一位失忆的少女在无人的都市中探索、漫步、旅行、歌唱、舞蹈、欢笑、哭泣、相爱、相拥的故事。游戏内采用了一种类似诗歌的文本形式，如果您对诗歌有所兴趣，不妨停歇片刻，一同在虚假而美好的游戏世界中，与少女共同书写一段只属于你们的诗。',
    link: 'https://store.steampowered.com/app/3985390/',
    tags: ['实验性视觉小说', '诗歌'],
    covers: [
      './imgs/games-sponsor/1.jpg',
      './imgs/games-sponsor/2.jpg',
      './imgs/games-sponsor/3.jpg',
      './imgs/games-sponsor/4.jpg',
      './imgs/games-sponsor/5.jpg',
      './imgs/games-sponsor/6.jpg',
      './imgs/games-sponsor/7.jpg'
    ]
  },
  {
    name: 'Web少女编程学院',
    desc: '欢迎来到美少女云集的 Web 编程学院。你可以和少女们一起上课学习前端开发，也可以在课余逛游戏厅、看电影、泡图书馆，度过平静而美好的日常；即使没有任何编程经验，也能在她们的陪伴下轻松入门。',
    link: 'https://store.steampowered.com/app/4459780/',
    tags: ['视觉小说', '编程'],
    covers: ['./imgs/games-sponsor/web-academy/cover.jpg']
  },
  {
    name: '林西物语 —— 放置武侠村',
    desc: '《林西物语》是一款叙事向放置经营 RPG。你将从一块农田、几枚铜钱开始，指挥伙伴们种田、采矿、烹饪、锻造、修炼与冒险，把荒凉小镇慢慢经营成热闹据点，在轻松的日常里书写属于自己的江湖故事。',
    link: 'https://store.steampowered.com/app/4803020/',
    tags: ['放置经营', '武侠'],
    covers: ['./imgs/games-sponsor/linxi/cover.jpg']
  }
])

/** 打开游戏链接（封面与「在 Steam 查看」共用，Electron 用默认浏览器，否则新标签打开） */
function openGameLink(url: string) {
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
}

.sponsor-content {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 30px 34px 44px;
  box-sizing: border-box;
}

.sponsor-section {
  margin-bottom: 24px;
  padding: 26px 28px 28px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-secondary);
  box-shadow: 0 6px 20px var(--shadow-light);
}

.sponsor-section:last-child {
  margin-bottom: 0;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.section-title {
  position: relative;
  margin: 0;
  padding-left: 14px;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 4px;
  height: 1.1em;
  border-radius: 999px;
  background: var(--accent-color);
  transform: translateY(-50%);
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 22px;
}

.game-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-primary);
  box-shadow: 0 3px 10px var(--shadow-light);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.game-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 14px 30px var(--shadow-medium);
  transform: translateY(-4px);
}

.game-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg-tertiary);
  cursor: pointer;
}

.game-cover :deep(.fun-carousel) {
  border-radius: 0;
}

.game-cover :deep(.fun-carousel__arrow) {
  width: 34px;
}

.game-cover :deep(.fun-carousel__arrow svg) {
  width: 20px;
  height: 20px;
}

.game-cover :deep(.fun-carousel__img) {
  transition: transform 0.55s ease;
}

.game-card:hover .game-cover :deep(.fun-carousel__img) {
  transform: scale(1.04);
}

.game-cover__blur {
  position: absolute;
  inset: -24px;
  width: calc(100% + 48px);
  height: calc(100% + 48px);
  object-fit: cover;
  filter: blur(20px) saturate(1.15);
  opacity: 0.9;
  transform: scale(1.05);
}

.game-cover__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.55s ease;
}

.game-card:hover .game-cover__img {
  transform: scale(1.03);
}

.game-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 18px 18px 20px;
}

.game-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.game-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-tertiary);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.game-tag::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-color);
}

.game-name {
  margin: 0;
  font-size: 1.22rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text-primary);
}

.game-desc {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--text-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.game-link {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 7px;
  margin-top: auto;
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--accent-color);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-on-accent);
  text-decoration: none;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.game-link:hover {
  filter: brightness(0.94);
}

.game-link:active {
  transform: translateY(1px);
}

.game-link__icon {
  width: 15px;
  height: 15px;
}

.section-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0 0 20px;
  padding: 11px 14px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  font-size: 0.86rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.section-note::before {
  content: '';
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--warning-color);
}

.qrcode-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 28px;
  padding: 2px 0 4px;
}

.qrcode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.qrcode-frame {
  width: clamp(180px, 22vw, 230px);
  aspect-ratio: 7 / 10;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 20px var(--shadow-light);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.qrcode-item:hover .qrcode-frame {
  box-shadow: 0 16px 30px var(--shadow-medium);
  transform: translateY(-4px);
}

.qrcode-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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

@media (max-width: 720px) {
  .sponsor-content {
    padding: 18px 16px 28px;
  }

  .sponsor-section {
    padding: 20px 18px 22px;
    border-radius: 16px;
  }

  .section-title {
    font-size: 1.16rem;
  }

  .game-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .game-body {
    padding: 16px;
  }
}
</style>
