<template>
  <div id="menu" :class="{ show: isVisible, hidden: !isVisible }" class="pet-menu">
    <div id="menu-header" class="menu-header">
      <div id="menu-title" class="menu-title">{{ $lt('桌宠菜单') }}</div>
      <div class="menu-coins" v-if="coins !== undefined">
        <span class="coins-icon">🪙</span>
        <span class="coins-value">{{ coins }}</span>
      </div>
    </div>
    <div class="menu-body">
      <!-- 侧边栏导航 -->
      <div class="menu-sidebar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="sidebar-item"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <span class="sidebar-icon">{{ tab.icon }}</span>
          <span class="sidebar-label">{{ tab.label }}</span>
        </button>
      </div>
      
      <!-- 内容区域 -->
      <div class="menu-content">
        <PetMenuStatus
          v-if="currentTab === 'status'"
          :appetite="appetite"
          :sleepiness="sleepiness"
          :libido="libido"
          :debug-mode="debugMode"
          :debug-info="debugInfo"
        />
        <PetMenuAffection
          v-else-if="currentTab === 'affection'"
          :level="affectionLevel"
          :exp="affectionExp"
          :exp-required="affectionExpRequired"
          :exp-progress="affectionExpProgress"
          :total-exp="affectionTotalExp"
        />
        <PetMenuShop
          v-else-if="currentTab === 'shop'"
          :coins="coins"
          @buy="handleBuy"
        />
        <PetMenuInventory
          v-else-if="currentTab === 'inventory'"
          :inventory-items="inventoryItems"
          @use="handleUse"
        />
        <PetMenuEarnings
          v-else-if="currentTab === 'earnings'"
          :last-earnings-time="lastEarningsTime"
        />
        <PetMenuRules
          v-else-if="currentTab === 'rules'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PetMenuStatus from './PetMenuStatus.vue'
import PetMenuAffection from './PetMenuAffection.vue'
import PetMenuShop from './PetMenuShop.vue'
import PetMenuInventory from './PetMenuInventory.vue'
import PetMenuEarnings from './PetMenuEarnings.vue'
import PetMenuRules from './PetMenuRules.vue'

const props = defineProps<{
  isVisible: boolean
  affectionLevel: number
  affectionExp: number
  affectionExpRequired: number
  affectionExpProgress: number
  affectionTotalExp: number
  appetite: number
  sleepiness: number
  libido: number
  debugMode: boolean
  debugInfo: {
    mode: string
    clickData: any
    message?: string
  }
  coins?: number
  inventoryItems: any[]
  lastEarningsTime?: string | null
}>()

const emit = defineEmits<{
  buy: [item: any]
  use: [item: any]
}>()

const currentTab = ref<'status' | 'affection' | 'shop' | 'inventory' | 'earnings' | 'rules'>('status')

const tabs = [
  { id: 'status' as const, label: '状态', icon: '📊' },
  { id: 'affection' as const, label: '好感度', icon: '💕' },
  { id: 'shop' as const, label: '商店', icon: '🛒' },
  { id: 'inventory' as const, label: '仓库', icon: '📦' },
  { id: 'earnings' as const, label: '收益', icon: '💰' },
  { id: 'rules' as const, label: '玩法', icon: '📖' }
]

function handleBuy(item: any) {
  emit('buy', item)
}

function handleUse(item: any) {
  emit('use', item)
}
</script>

<style scoped>
.pet-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 500px;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  z-index: 0;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  border-right: 2px solid #e0e0e0;
}

.pet-menu.show {
  transform: translateX(0);
  opacity: 1;
  transition: all 0.3s ease;
}

.pet-menu.hidden {
  pointer-events: none;
  opacity: 0;
  transition: all 0.3s ease;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.menu-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.menu-coins {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border-radius: 16px;
  font-weight: bold;
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.coins-icon {
  font-size: 16px;
}

.coins-value {
  font-size: 14px;
}

.menu-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.menu-sidebar {
  width: 80px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  background: #f9f9f9;
}

.sidebar-item {
  width: 100%;
  padding: 12px 8px;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  color: #666;
}

.sidebar-item:hover {
  background: #f0f0f0;
  color: #333;
}

.sidebar-item.active {
  background: #e8f4fd;
  border-left-color: #4a90e2;
  color: #4a90e2;
}

.sidebar-icon {
  font-size: 20px;
}

.sidebar-label {
  font-size: 11px;
  font-weight: 500;
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 #f0f0f0;
}

.menu-content::-webkit-scrollbar {
  width: 8px;
}

.menu-content::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.menu-content::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 4px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

</style>

