<template>
  <div class="help-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <h2 v-if="!isCollapsed">{{ $t('help.sidebar.title') }}</h2>
      <button class="collapse-toggle" @click="toggleCollapse" :title="isCollapsed ? $t('help.sidebar.expandMenu') : $t('help.sidebar.collapseMenu')">
        {{ isCollapsed ? '→' : '←' }}
      </button>
    </div>
    <nav class="sidebar-nav">
      <FunMenu
        :items="menuItems"
        :active-key="activeSection"
        :default-expanded-keys="['user-manual']"
        :is-item-active-fn="isItemActive"
        :collapsed="isCollapsed"
        @item-click="handleMenuClick"
      />
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FunMenu from '../../fun-ui/navigation/Menu/FunMenu.vue'
import type { MenuItem } from '../../fun-ui/navigation/Menu/FunMenu.vue'

interface Props {
  activeSection: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'section-change': [section: string]
}>()

const { t } = useI18n()

const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const menuItems = computed<MenuItem[]>(() => [
  {
    id: 'user-manual',
    icon: '📖',
    label: t('help.sidebar.userManual'),
    children: [
      { id: 'intro', icon: '🏠', label: t('help.sidebar.intro') },
      { id: 'general', icon: '🛠️', label: t('help.sidebar.general') },
      { id: 'game', icon: '🎮', label: t('help.sidebar.game') },
      { id: 'image', icon: '🖼️', label: t('help.sidebar.image') },
      { id: 'video', icon: '🎬', label: t('help.sidebar.video') },
      { id: 'novel', icon: '📚', label: t('help.sidebar.novel') },
      { id: 'website', icon: '🌐', label: t('help.sidebar.website') },
      { id: 'audio', icon: '🎵', label: t('help.sidebar.audio') },
      { id: 'faq', icon: '❓', label: t('help.sidebar.faq') },

    ]
  },
  {
    id: 'api',
    icon: '🔌',
    label: t('help.sidebar.apiManual'),
    children: [
      { id: 'api-games', icon: '🎮', label: t('help.sidebar.apiGames') },
      { id: 'api-manga', icon: '📚', label: t('help.sidebar.apiManga') },
      { id: 'api-videos', icon: '🎬', label: t('help.sidebar.apiVideos') },
      { id: 'api-novels', icon: '📖', label: t('help.sidebar.apiNovels') },
      { id: 'api-websites', icon: '🌐', label: t('help.sidebar.apiWebsites') },
      { id: 'api-audio', icon: '🎵', label: t('help.sidebar.apiAudio') }
    ]
  },
  { id: 'workshop', icon: '🎨', label: t('help.sidebar.workshop') },
  { id: 'support', icon: '💬', label: t('help.sidebar.support') },
  { id: 'about', icon: 'ℹ️', label: t('help.sidebar.about') },
])

const isItemActive = (item: MenuItem): boolean => {
  if (item.id === 'user-manual' && item.children) {
    return item.children.some(child => props.activeSection === child.id)
  }
  
  if (item.id === 'api' && item.children) {
    return props.activeSection === 'api' || 
           props.activeSection === 'api-games' ||
           props.activeSection === 'api-manga' ||
           props.activeSection === 'api-videos' ||
           props.activeSection === 'api-novels' ||
           props.activeSection === 'api-websites' ||
           props.activeSection === 'api-audio' ||
           item.children.some(subChild => props.activeSection === subChild.id)
  }
  
  return props.activeSection === item.id
}

const handleMenuClick = (item: MenuItem) => {
  if (item.id) {
    if (item.id !== 'user-manual') {
      emit('section-change', item.id)
    }
  }
}
</script>

<style scoped>
.help-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: width 0.3s ease;
}

.help-sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.sidebar-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  transition: opacity 0.3s ease;
}

.help-sidebar.collapsed .sidebar-header h2 {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.collapse-toggle {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  background: var(--bg-primary);
  border-color: var(--accent-color);
}

.help-sidebar.collapsed .collapse-toggle {
  margin: 0 auto;
}

.sidebar-nav {
  flex: 1;
  padding: 10px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .help-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-nav {
    padding: 0;
  }
}
</style>

