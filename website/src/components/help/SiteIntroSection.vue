<template>
  <HelpSection
    :title="$lt('🏠 关于 Green Resources Manager')"
    :subtitle="$lt('您的个人多媒体资源管理器')"
  >
    <div class="intro-content">
      <DetailCard :title="$lt('🎯 项目简介')">
        <p>
          {{ $lt('GreenResourcesManager（绿色资源管理器） 是一个专为仓鼠症用户设计的绿色多媒体资源管理器。它非常善于帮助您管理大量且类型丰富复杂的媒体文件，包括游戏、图片、视频、小说、网站和音频文件。您不用再依赖于windows本地的原生管理方式，而是可以享受更加自由和便捷的管理体验。') }}
        </p>
      </DetailCard>

      <DetailCard :title="$lt('📖 开发背景')">
        <p>{{ $lt('Green Resources Manager 是一款专为“仓鼠症”用户设计的全能多媒体资源管理器。随着存储成本的降低，个人拥有大容量存储已成为可能，但管理海量资源的难度也随之增加。当资源超过 10TB 后，无论是按种类还是按常用程度分类，都难以满足需求。') }}</p>
        <p style="margin-top: 15px;">
          <strong>{{ $lt('Green Resources Manager 应运而生') }}</strong>{{ $lt('，提供统一界面管理游戏、漫画、视频、音频、小说、网站等各类多媒体资源，让资源管理变得优雅而高效。') }}
        </p>
      </DetailCard>

      <DetailCard :title="$lt('🎯 目标用户')">
        <ul>
          <li>{{ $lt('拥有强烈仓鼠症的用户') }}</li>
          <li>{{ $lt('希望以更优雅方式管理软件和媒体的用户') }}</li>
        </ul>
      </DetailCard>

      <DetailCard :title="$lt('✨ 核心特性')">
        <ul>
          <li><strong>{{ $lt('完全本地、绝对隐私：') }}</strong>{{ $lt('所有数据保存在本地，绝不联网（至少现在是这样）。') }}</li>
          <li><strong>{{ $lt('类 Steam 的应用管理：') }}</strong>{{ $lt('可以为所有 EXE 文件提供时长记录、截图功能。') }}</li>
          <li><strong>{{ $lt('信息记录狂魔：') }}</strong>{{ $lt('自动记录各种数据，包括游戏时长、游戏运行次数、第一次运行时间、上一次运行时间等，并自动整理日报、周报。') }}</li>
          <li><strong>{{ $lt('tag 索引系统：') }}</strong>{{ $lt('管理器会自动收集所有资源的 tag，并显示到左侧导航栏，点击 TAG 就能超快速索引所需资源。') }}</li>
          <li><strong>{{ $lt('多种资源支持：') }}</strong>{{ $lt('不同于 Steam 单一的游戏管理逻辑，本管理器还支持漫画、视频、音频、小说、网站等多种资源。') }}</li>
        </ul>
      </DetailCard>

      <DetailCard :title="$lt('🛠️ 技术栈')">
        <div class="tech-stack">
          <span class="tech-tag">Vue.js 3</span>
          <span class="tech-tag">Electron</span>
          <span class="tech-tag">Vite</span>
          <span class="tech-tag">Node.js</span>
          <span class="tech-tag">TypeScript</span>
          <span class="tech-tag">SASS</span>
          <span class="tech-tag">PDF.js</span>
          <span class="tech-tag">EPUB.js</span>
        </div>
      </DetailCard>

      <DetailCard :title="$lt('📜 开源协议')">
        <p>{{ $lt('本项目采用') }} <strong>PolyForm Noncommercial License 1.0.0</strong> {{ $lt('开源协议。') }}</p>
        <ul>
          <li><strong>{{ $lt('非商业使用：') }}</strong>{{ $lt('您可以自由使用、修改、分发本软件，但仅限于非商业用途') }}</li>
          <li><strong>{{ $lt('商业使用：') }}</strong>{{ $lt('如需用于商业目的，需要获得单独的商业许可证') }}</li>
          <li><strong>{{ $lt('个人使用：') }}</strong>{{ $lt('个人非商业用途完全免费，无需授权') }}</li>
          <li><strong>{{ $lt('研究和教育：') }}</strong>{{ $lt('用于研究、评估或教育目的的使用是被允许的') }}</li>
          <li><strong>{{ $lt('修改和分发：') }}</strong>{{ $lt('您可以修改源代码并分发，但必须保留原始版权声明和许可证') }}</li>
        </ul>
        <p style="margin-top: 15px; color: var(--text-secondary); font-size: 0.9rem;">
          {{ $lt('完整协议内容请查看项目根目录的 LICENSE 文件，或访问') }}
          <span @click="openExternalLink('https://polyformproject.org/licenses/noncommercial/1.0.0/')" class="external-link" style="cursor: pointer;">
            PolyForm Noncommercial License 1.0.0
          </span>
        </p>
      </DetailCard>

      <DetailCard :title="$lt('📂 项目地址')">
        {{ $lt('我要 star！我要 star！star、star 要要要~') }}
        <div class="project-links">
          <div @click="openExternalLink(GITHUB_REPO.url)" class="project-link">
            <span class="link-icon">🐙</span>
            <span class="link-text">{{ $lt('GitHub 仓库') }}</span>
          </div>
          <div @click="openExternalLink(GITHUB_REPO.releasesUrl)" class="project-link">
            <span class="link-icon">📦</span>
            <span class="link-text">{{ $lt('下载最新版本') }}</span>
          </div>
        </div>
      </DetailCard>

      <DetailCard :title="$lt('📧 联系方式兼客服中心')">
        <div class="contact-methods">
          <div class="contact-method">
            <span class="contact-icon">💬</span>
            <div class="contact-details">
              <h4>QQ</h4>
              <p>{{ $lt('吹水用，以及有什么建议可以在这里反馈') }}</p>
              <span class="external-link">群号：853149421 / 1098139167</span>
            </div>
          </div>
          <div class="contact-method">
            <span class="contact-icon">🐙</span>
            <div class="contact-details">
              <h4>GitHub</h4>
              <p>{{ $lt('可以去 issues 板块反馈技术问题') }}</p>
              <span @click="openExternalLink(GITHUB_REPO.issuesUrl)" class="external-link">
                {{ GITHUB_REPO.issuesUrl }}
              </span>
            </div>
          </div>
        </div>
      </DetailCard>
    </div>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../../../../green-resources-manager/src/components/help/HelpSection.vue'
import DetailCard from '../../../../green-resources-manager/src/components/DetailCard.vue'
import { GITHUB_REPO } from '../../../../green-resources-manager/src/utils/constants'
import { useHelpUtils } from '../../../../green-resources-manager/src/composables/useHelpUtils'

const { openExternalLink } = useHelpUtils()
</script>

<style scoped>
.intro-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
</style>
