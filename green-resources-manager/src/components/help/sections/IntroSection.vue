<template>
  <HelpSection 
    title="🏠 关于GreenResourcesManager<br/>（绿色资源管理器）" 
    subtitle="您的个人多媒体资源管理器">
    <div class="intro-content">
      <DetailCard title="🎯 项目简介">
        <p>GreenResourcesManager（绿色资源管理器）
          是一个专为仓鼠症用户设计的绿色多媒体资源管理器。它非常善于帮助您管理大量且类型丰富复杂的媒体文件，包括游戏、图片、视频、小说、网站和音频文件。您不用再依赖于windows本地的原生管理方式，而是可以享受更加自由和便捷的管理体验。
        </p>
      </DetailCard>
      <DetailCard title="📖 开发背景">
        <p>Green Resources Manager 是一款专为"仓鼠症"用户设计的全能多媒体资源管理器。随着存储成本的降低，个人拥有大容量存储已成为可能，但管理海量资源的难度也随之增加。当资源超过 10TB 后，无论是按种类还是按常用程度分类，都难以满足需求。</p>
        <p style="margin-top: 15px;"><strong>Green Resources Manager 应运而生</strong>，提供统一界面管理游戏、漫画、视频、音频、小说、网站等各类多媒体资源，让资源管理变得优雅而高效。</p>
      </DetailCard>

      <DetailCard title="🎯 目标用户">
        <ul>
          <li>拥有强烈仓鼠症的用户</li>
          <li>希望以更优雅方式管理软件和媒体的用户</li>
        </ul>
      </DetailCard>

      <DetailCard title="✨ 核心特性">
        <ul>
          <li><strong>完全本地、绝对隐私：</strong>所有数据保存在本地，绝不联网（至少现在是这样）。</li>
          <li><strong>类Steam的应用管理：</strong>可以为所有EXE文件提供时长记录、截图功能。</li>
          <li><strong>信息记录狂魔：</strong>自动记录各种数据，包括游戏时长、游戏运行次数、第一次运行时间、上一次运行时间等。并且会自动整理日报、周报，为您提供全方位的信息记录。</li>
          <li><strong>tag索引系统：</strong>管理器会自动收集所有资源的tag，并显示到不同资源的左侧导航栏，可以通过点击TAG的方式超快速索引所需的资源，再也不用纠结把资源放到哪个文件夹了</li>
          <li><strong>多种资源支持：</strong>不同于steam单一的游戏管理逻辑，本管理器不仅可以管理应用还支持漫画、视频、音频、小说、网站等多种资源的管理。</li>
        </ul>
      </DetailCard>
      <DetailCard title="🛠️ 技术栈">
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
      <DetailCard title="📜 开源协议">
        <p>本项目采用 <strong>PolyForm Noncommercial License 1.0.0</strong> 开源协议。</p>
        <ul>
          <li><strong>非商业使用：</strong>您可以自由使用、修改、分发本软件，但仅限于非商业用途</li>
          <li><strong>商业使用：</strong>如需用于商业目的，需要获得单独的商业许可证</li>
          <li><strong>个人使用：</strong>个人非商业用途完全免费，无需授权</li>
          <li><strong>研究和教育：</strong>用于研究、评估或教育目的的使用是被允许的</li>
          <li><strong>修改和分发：</strong>您可以修改源代码并分发，但必须保留原始版权声明和许可证</li>
        </ul>
        <p style="margin-top: 15px; color: var(--text-secondary); font-size: 0.9rem;">
          完整协议内容请查看项目根目录的 LICENSE 文件，或访问 
          <span @click="openExternalLink('https://polyformproject.org/licenses/noncommercial/1.0.0/')" class="external-link" style="cursor: pointer;">
            PolyForm Noncommercial License 1.0.0
          </span>
        </p>
      </DetailCard>

      <DetailCard title="📂 项目地址">
        我要star！我要star！star、star要要要~
        <div class="project-links">
          <div @click="openExternalLink(GITHUB_REPO.cloneUrl)"
            class="project-link">
            <span class="link-icon">🐙</span>
            <span class="link-text">GitHub 仓库</span>
          </div>
          <div @click="openExternalLink(GITHUB_REPO.releasesUrl)"
            class="project-link">
            <span class="link-icon">📦</span>
            <span class="link-text">下载最新版本</span>
          </div>
        </div>
      </DetailCard>
      <DetailCard title="📧 联系方式兼客服中心（BuShi">
        <div class="contact-methods">
          <div class="contact-method">
            <span class="contact-icon">💬</span>
            <div class="contact-details">
              <h4>GitHub</h4>
              <p>可以去issues板块反馈技术问题</p>
              <span @click="openExternalLink(GITHUB_REPO.issuesUrl)"
                class="external-link">
                {{ GITHUB_REPO.issuesUrl }}
              </span>
            </div>
          </div>

          <div class="contact-method">
            <span class="contact-icon">💬</span>
            <div class="contact-details">
              <h4>QQ</h4>
              <p>吹水用，以及有什么建议可以在这里反馈</p>
              <span @click="openExternalLink('https://qm.qq.com/q/motJp8Bryu')" class="external-link">
                点击链接加入群聊【GreenResourceManager里群*李代数】：https://qm.qq.com/q/motJp8Bryu
              </span>
            </div>
          </div>
        </div>
      </DetailCard>
    </div>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
import { GITHUB_REPO } from '../../../utils/constants'
import { useHelpUtils } from '../../../composables/useHelpUtils'

const { openExternalLink } = useHelpUtils()
</script>

<style scoped>
.intro-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
</style>

