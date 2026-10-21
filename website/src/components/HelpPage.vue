<script setup lang="ts">
import IntroSection from './help/SiteIntroSection.vue'
import GeneralSection from '../../../green-resources-manager/src/components/help/sections/GeneralSection.vue'
import PagesSection from '../../../green-resources-manager/src/components/help/sections/PagesSection.vue'
import ResourcesSection from '../../../green-resources-manager/src/components/help/sections/ResourcesSection.vue'
import FaqSection from '../../../green-resources-manager/src/components/help/sections/FaqSection.vue'
import ApiSection from '../../../green-resources-manager/src/components/help/sections/ApiSection.vue'
import ApiGamesSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiGamesSection.vue'
import ApiMangaSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiMangaSection.vue'
import ApiVideosSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiVideosSection.vue'
import ApiNovelsSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiNovelsSection.vue'
import ApiWebsitesSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiWebsitesSection.vue'
import ApiAudioSection from '../../../green-resources-manager/src/components/help/sections/api-pages/ApiAudioSection.vue'
import WorkshopSection from '../../../green-resources-manager/src/components/help/sections/WorkshopSection.vue'
import WorkshopPagesSection from '../../../green-resources-manager/src/components/help/sections/WorkshopPagesSection.vue'
import WorkshopPluginSection from '../../../green-resources-manager/src/components/help/sections/WorkshopPluginSection.vue'
import WorkshopNoteSection from '../../../green-resources-manager/src/components/help/sections/WorkshopNoteSection.vue'
import WorkshopCalendarSection from '../../../green-resources-manager/src/components/help/sections/WorkshopCalendarSection.vue'
import SupportSection from './help/SiteSupportSection.vue'
import AboutSection from './help/SiteAboutSection.vue'
import { url } from '../lib/site'

defineProps<{ section: string }>()

const sectionComponents: Record<string, unknown> = {
  introduction: IntroSection,
  basics: GeneralSection,
  pages: PagesSection,
  resources: ResourcesSection,
  faq: FaqSection,
  api: ApiSection,
  'api-games': ApiGamesSection,
  'api-manga': ApiMangaSection,
  'api-videos': ApiVideosSection,
  'api-novels': ApiNovelsSection,
  'api-websites': ApiWebsitesSection,
  'api-audio': ApiAudioSection,
  workshop: WorkshopSection,
  'workshop-pages': WorkshopPagesSection,
  'workshop-plugin': WorkshopPluginSection,
  'workshop-note': WorkshopNoteSection,
  'workshop-calendar': WorkshopCalendarSection,
  support: SupportSection,
  about: AboutSection
}
</script>

<template>
  <component :is="sectionComponents[section]" v-if="sectionComponents[section]" />
  <div v-else class="help-missing">
    <p>这个文档页还在仓鼠窝里打盹，暂时找不到啦。</p>
    <a :href="url('docs/')">回到帮助中心</a>
  </div>
</template>

<style scoped>
.help-missing {
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}
</style>
