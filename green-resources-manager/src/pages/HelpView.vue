<template>
  <div class="help-view">
    <!-- 左侧导航栏 -->
    <HelpSidebar :active-section="activeSection" @section-change="setActiveSection" />

    <!-- 右侧内容区域 -->
    <div class="help-content">
      <!-- 使用动态组件加载各个section -->
      <component :is="currentSectionComponent" v-if="currentSectionComponent" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import HelpSidebar from '../components/help/HelpSidebar.vue'
import IntroSection from '../components/help/sections/IntroSection.vue'
import GeneralSection from '../components/help/sections/GeneralSection.vue'
import PagesSection from '../components/help/sections/PagesSection.vue'
import ResourcesSection from '../components/help/sections/ResourcesSection.vue'
import ApiSection from '../components/help/sections/ApiSection.vue'
import ApiGamesSection from '../components/help/sections/api-pages/ApiGamesSection.vue'
import ApiMangaSection from '../components/help/sections/api-pages/ApiMangaSection.vue'
import ApiVideosSection from '../components/help/sections/api-pages/ApiVideosSection.vue'
import ApiNovelsSection from '../components/help/sections/api-pages/ApiNovelsSection.vue'
import ApiWebsitesSection from '../components/help/sections/api-pages/ApiWebsitesSection.vue'
import ApiAudioSection from '../components/help/sections/api-pages/ApiAudioSection.vue'
import FaqSection from '../components/help/sections/FaqSection.vue'
import WorkshopSection from '../components/help/sections/WorkshopSection.vue'
import WorkshopPagesSection from '../components/help/sections/WorkshopPagesSection.vue'
import WorkshopPluginSection from '../components/help/sections/WorkshopPluginSection.vue'
import WorkshopNoteSection from '../components/help/sections/WorkshopNoteSection.vue'
import WorkshopCalendarSection from '../components/help/sections/WorkshopCalendarSection.vue'
import SupportSection from '../components/help/sections/SupportSection.vue'
import AboutSection from '../components/help/sections/AboutSection.vue'

export default defineComponent({
  name: 'HelpView',
  components: {
    HelpSidebar,
    IntroSection,
    GeneralSection,
    PagesSection,
    ResourcesSection,
    ApiSection,
    ApiGamesSection,
    ApiMangaSection,
    ApiVideosSection,
    ApiNovelsSection,
    ApiWebsitesSection,
    ApiAudioSection,
    FaqSection,
    SupportSection,
    AboutSection,
    WorkshopSection,
    WorkshopPagesSection,
    WorkshopPluginSection,
    WorkshopNoteSection,
    WorkshopCalendarSection
  },
  setup() {
    const activeSection = ref('intro')

    const sectionComponents: Record<string, any> = {
      intro: IntroSection,
      general: GeneralSection,
      pages: PagesSection,
      resources: ResourcesSection,
      api: ApiSection,
      'api-games': ApiGamesSection,
      'api-manga': ApiMangaSection,
      'api-videos': ApiVideosSection,
      'api-novels': ApiNovelsSection,
      'api-websites': ApiWebsitesSection,
      'api-audio': ApiAudioSection,
      faq: FaqSection,
      support: SupportSection,
      about: AboutSection,
      workshop: WorkshopSection,
      'workshop-pages': WorkshopPagesSection,
      'workshop-plugin': WorkshopPluginSection,
      'workshop-note': WorkshopNoteSection,
      'workshop-calendar': WorkshopCalendarSection
    }

    const currentSectionComponent = computed(() => {
      return sectionComponents[activeSection.value]
    })

    function setActiveSection(section: string) {
      activeSection.value = section
    }

    return {
      activeSection,
      currentSectionComponent,
      setActiveSection
    }
  }
})
</script>

<style lang="scss" scoped>
// ============================================
// 帮助页面主容器样式（作用域样式）
// ============================================
.help-view {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}
</style>

<style lang="scss">
// ============================================
// 帮助页面通用样式
// 注意：这些样式是全局的，用于帮助页面的各个子组件
// ============================================

// ============================================
// 1. 布局样式
// ============================================

// 右侧内容区域 - 显示帮助文档的主要内容
.help-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-3xl);
  background: var(--bg-primary);
}

// 移除所有列表的默认样式 - 统一帮助页面的列表外观
.help-view {
  ul {
    list-style: none;
    padding-left: 0;

    li {
      list-style: none;
    }
  }
}

// ============================================
// 2. 技术栈和标签样式
// ============================================

// 技术栈容器 - 用于展示项目使用的技术标签
.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

// 技术标签 - 单个技术标签的样式
.tech-tag {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  padding: 6px var(--spacing-md);
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
}

// ============================================
// 3. 项目链接样式
// ============================================

// 项目链接容器 - 包含多个项目链接
.project-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

// 项目链接项 - 单个项目链接卡片
.project-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: all var(--transition-base);
  cursor: pointer;

  // 悬停效果 - 背景色变化和轻微上移
  &:hover {
    background: var(--accent-color);
    color: var(--text-on-accent, #1a1a1a);
    transform: translateY(-2px);
  }
}

// 链接图标
.link-icon {
  font-size: 1.2rem;
}

// 链接文本
.link-text {
  font-weight: 500;
}

// ============================================
// 4. 联系方式样式
// ============================================

// 联系方式容器 - 包含多种联系方式
.contact-methods {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

// 单个联系方式卡片
.contact-method {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

// 联系方式图标
.contact-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

// 联系方式详情
.contact-details {
  h4 {
    font-size: 1.1rem;
    margin: 0 0 5px 0;
    color: var(--text-primary);
  }

  p {
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0 0 var(--spacing-md) 0;
    font-size: 0.95rem;
  }
}

// 外部链接 - 用于跳转到外部网站
.external-link {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);

  // 悬停时显示下划线
  &:hover {
    text-decoration: underline;
    color: var(--accent-hover);
  }
}

// ============================================
// 5. FAQ（常见问题）样式
// ============================================

// FAQ 内容容器
.faq-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3xl);
}

// FAQ 分类卡片 - 每个分类包含多个问题
.faq-category {
  background: var(--bg-secondary);
  padding: var(--spacing-2xl);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);

  h3 {
    font-size: 1.3rem;
    margin: 0 0 var(--spacing-xl) 0;
    color: var(--text-primary);
  }
}

// FAQ 问题列表
.faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

// FAQ 单个问题项
.faq-item {
  background: var(--bg-tertiary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);

  h4 {
    font-size: 1.1rem;
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }

  p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
}

// ============================================
// 6. 客服群样式
// ============================================

// 客服群卡片容器
.support-group-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  border: 1px solid var(--border-color);
  margin-top: var(--spacing-lg);
}

// 群组信息
.group-info {
  h3 {
    font-size: 1.3rem;
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--text-primary);
  }

  ul {
    margin: var(--spacing-lg) 0;
    padding-left: var(--spacing-2xl);
    color: var(--text-secondary);
    line-height: 1.8;

    li {
      margin: var(--spacing-sm) 0;
      list-style: disc;
    }
  }
}

// 群组描述文本
.group-description {
  color: var(--text-secondary);
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
  font-weight: 500;
}

// 群组链接容器
.group-link-container {
  margin: var(--spacing-2xl) 0 var(--spacing-lg) 0;
}

// 群组链接按钮 - 用于跳转到客服群
.group-link-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  font-weight: 600;
  font-size: 1rem;

  // 悬停效果
  &:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .link-icon {
    font-size: 1.2rem;
  }
}

// 群组链接提示文本
.group-link-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: var(--spacing-md);
}

// 复制链接按钮
.copy-link {
  color: var(--accent-color);
  cursor: pointer;
  text-decoration: underline;
  transition: color var(--transition-base);

  &:hover {
    color: var(--accent-hover);
  }
}

// ============================================
// 7. 帽子社（Hat Soft）展示区域样式
// ============================================

// 帽子社展示卡片 - 带有渐变背景和旋转动画效果
.hat-soft-showcase {
  max-width: 800px;
  margin: 40px auto 60px;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  position: relative;
  overflow: hidden;

  // 背景旋转动画层 - 创建动态视觉效果
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
    pointer-events: none;
  }
}

// 旋转动画关键帧 - 用于背景装饰效果
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 帽子社 Logo 容器
.hat-soft-logo-container {
  margin-bottom: var(--spacing-3xl);
  position: relative;
  z-index: 1;
}

// 帽子社 Logo - 悬停时有旋转和缩放效果
.hat-soft-logo {
  width: 250px;
  height: auto;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2));
  transition: transform var(--transition-base);

  &:hover {
    transform: scale(1.05) rotate(5deg);
  }
}

// 帽子社内容区域
.hat-soft-content {
  position: relative;
  z-index: 1;
}

// 帽子社标题
.hat-soft-title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xl) 0;
  letter-spacing: 2px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

// 帽子社描述文本
.hat-soft-description {
  font-size: 1.15rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin: 0 auto 40px;
  max-width: 600px;
  font-weight: 400;
}

// 帽子社链接容器
.hat-soft-links {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3xl);
  flex-wrap: wrap;
  margin-top: 40px;
}

// 帽子社链接项 - 单个链接卡片
.hat-soft-link-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl) 35px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  transition: all var(--transition-base);
  min-width: 200px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  // 悬停效果 - 上移、边框和阴影变化
  &:hover {
    transform: translateY(-5px);
    border-color: var(--accent-color);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
    background: var(--bg-secondary);
  }

  .link-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .link-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .link-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .link-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
}

// ============================================
// 8. 展示区域标题样式
// ============================================

// 展示区域标题容器
.showcase-header {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

// 展示区域主标题
.showcase-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  letter-spacing: 1px;
}

// 展示区域副标题
.showcase-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
}

// ============================================
// 9. 个人信息和名片展示区域样式
// ============================================

// 个人信息展示卡片 - 与帽子社展示区域样式类似
.personal-showcase {
  max-width: 800px;
  margin: 40px auto 60px;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  position: relative;
  overflow: hidden;

  // 背景旋转动画层
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
    pointer-events: none;
  }
}

// 个人信息内容区域
.personal-content {
  position: relative;
  z-index: 1;
  margin-top: 40px;
}

// 个人信息描述文本
.personal-description {
  font-size: 1.15rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin: 0 auto 40px;
  max-width: 600px;
  font-weight: 400;
}

// 个人信息链接容器
.personal-links {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3xl);
  flex-wrap: wrap;
  margin-top: 40px;
}

// 个人信息链接项 - 单个链接卡片
.personal-link-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl) 35px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  transition: all var(--transition-base);
  min-width: 200px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  // 悬停效果
  &:hover {
    transform: translateY(-5px);
    border-color: var(--accent-color);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
    background: var(--bg-secondary);
  }

  .link-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .link-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .link-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .link-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
}

// ============================================
// 9.1 协作者展示区域样式
// ============================================

// 协作者展示卡片 - 与个人信息展示区域样式类似
.collaborators-showcase {
  max-width: 800px;
  margin: 40px auto 60px;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  position: relative;
  overflow: hidden;

  // 背景旋转动画层
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
    pointer-events: none;
  }
}

// 协作者内容区域
.collaborators-content {
  position: relative;
  z-index: 1;
  margin-top: 40px;
}

// 协作者描述文本
.collaborators-description {
  font-size: 1.15rem;
  line-height: 1.8;
  color: var(--text-secondary);
  margin: 0 auto 40px;
  max-width: 600px;
  font-weight: 400;
}

// 协作者列表容器
.collaborators-list {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3xl);
  flex-wrap: wrap;
  margin-top: 40px;
}

// 协作者卡片 - 包含图片和名称
.collaborator-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  transition: all var(--transition-base);
  min-width: 180px;
  max-width: 220px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  // 悬停效果
  &:hover {
    transform: translateY(-5px);
    border-color: var(--accent-color);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
    background: var(--bg-secondary);
  }

  // 可点击的卡片样式
  &.clickable {
    cursor: pointer;
    
    &:hover {
      transform: translateY(-5px);
      border-color: var(--accent-color);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
      background: var(--bg-secondary);
    }
  }

  .collaborator-image-container {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: var(--spacing-lg);
    border: 3px solid var(--border-color);
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-base);
  }

  .collaborator-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .collaborator-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    line-height: 1.4;
  }
}

// ============================================
// 10. 响应式设计
// ============================================

@media (max-width: 768px) {
  // 移动端：减少内容区域的内边距
  .help-content {
    padding: var(--spacing-xl);
  }

  // 移动端：项目链接垂直排列
  .project-links {
    flex-direction: column;
  }

  // 移动端：联系方式垂直排列
  .contact-methods {
    flex-direction: column;
  }

  // 移动端：帽子社展示区域调整
  .hat-soft-showcase {
    padding: 40px var(--spacing-xl);
    margin: var(--spacing-3xl) auto 40px;
  }

  .hat-soft-logo {
    width: 140px;
  }

  .hat-soft-title {
    font-size: 2.2rem;
  }

  .hat-soft-description {
    font-size: 1rem;
    margin-bottom: var(--spacing-3xl);
  }

  .hat-soft-links {
    flex-direction: column;
    gap: var(--spacing-xl);
    align-items: stretch;
  }

  .hat-soft-link-item {
    min-width: auto;
    justify-content: center;
  }

  // 移动端：个人信息展示区域调整
  .personal-showcase {
    padding: 40px var(--spacing-xl);
    margin: var(--spacing-3xl) auto 40px;
  }

  .showcase-title {
    font-size: 2rem;
  }

  .personal-description {
    font-size: 1rem;
    margin-bottom: var(--spacing-3xl);
  }

  .personal-links {
    flex-direction: column;
    gap: var(--spacing-xl);
    align-items: stretch;
  }

  .personal-link-item {
    min-width: auto;
    justify-content: center;
  }

  // 移动端：协作者展示区域调整
  .collaborators-showcase {
    padding: 40px var(--spacing-xl);
    margin: var(--spacing-3xl) auto 40px;
  }

  .collaborators-description {
    font-size: 1rem;
    margin-bottom: var(--spacing-3xl);
  }

  .collaborators-list {
    flex-direction: column;
    gap: var(--spacing-xl);
    align-items: stretch;
  }

  .collaborator-card {
    min-width: auto;
    max-width: 100%;
    width: 100%;
  }

  .collaborator-image-container {
    width: 100px;
    height: 100px;
  }
}

// ============================================
// 11. 暗色主题适配
// ============================================

[data-theme="dark"],
[data-theme="night"],
[data-theme="night-ink"] {
  // 暗色主题下 FAQ 分类的悬停效果
  .faq-category:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  // 暗色主题下项目链接的悬停效果
  .project-link:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }
}
</style>
