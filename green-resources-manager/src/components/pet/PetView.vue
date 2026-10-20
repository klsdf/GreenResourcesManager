<template>
  <div class="pet-view">
    <img
      ref="petImageRef"
      id="pet-image"
      class="pet-image"
      src="/imgs/pets/仓鼠娘.png"
      :alt="$lt('桌宠')"
    />

    <!-- 交互区域 -->
    <div
      ref="interactionAreaRef"
      id="interaction-area"
      class="interaction-area"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @wheel="handleWheel"
    ></div>

    <!-- 调试覆盖层 -->
    <div ref="debugOverlayRef" id="debug-overlay" class="debug-overlay"></div>

    <!-- 调试切换按钮 -->
    <button
      id="debug-toggle"
      class="debug-toggle-button"
      :class="{ active: debugMode }"
      :title="$lt('调试模式 (D)')"
      @click="toggleDebugMode"
    >
      D
    </button>

    <!-- 输入框容器 -->
    <PetInput @send="handleSendMessage" @menu-click="menu.toggleMenu" />

    <!-- 对话框 -->
    <PetDialog :is-visible="dialog.isVisible.value" :text="dialog.text.value" @close="dialog.hideDialog" />

    <!-- 菜单页面 -->
    <PetMenu
      :is-visible="menu.isVisible.value"
      :affection-level="petData.affectionSystem.level.value"
      :affection-exp="petData.affectionSystem.exp.value"
      :affection-exp-required="petData.affectionSystem.expRequired.value"
      :affection-exp-progress="petData.affectionSystem.expProgress.value"
      :affection-total-exp="petData.affectionSystem.getTotalExp()"
      :appetite="petData.appetite.value"
      :sleepiness="petData.sleepiness.value"
      :libido="petData.libido.value"
      :debug-mode="debugMode"
      :debug-info="debugInfo"
      :coins="petData.coins.value"
      :inventory-items="inventory.inventoryItems.value"
      :last-earnings-time="petData.lastEarningsTime.value"
      @buy="handleBuyItem"
      @use="handleUseItem"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePetData } from '../../composables/pet/usePetData'
import { usePetInteraction } from '../../composables/pet/usePetInteraction'
import { usePetDialog } from '../../composables/pet/usePetDialog'
import { usePetMenu } from '../../composables/pet/usePetMenu'
import { usePetDebug } from '../../composables/pet/usePetDebug'
import { usePetZoom } from '../../composables/pet/usePetZoom'
import { usePetShop } from '../../composables/pet/usePetShop'
import { usePetInventory } from '../../composables/pet/usePetInventory'
import { usePetResourceEarnings } from '../../composables/pet/usePetResourceEarnings'
import { regionConfig } from '../../composables/pet/usePetRegions'
import PetDialog from './PetDialog.vue'
import PetMenu from './PetMenu.vue'
import PetInput from './PetInput.vue'

// Refs
const petImageRef = ref<HTMLElement | null>(null)
const interactionAreaRef = ref<HTMLElement | null>(null)
const debugOverlayRef = ref<HTMLElement | null>(null)

// Composables
const petData = usePetData()
const dialog = usePetDialog()
const menu = usePetMenu()

const interaction = usePetInteraction(petImageRef, regionConfig)

const { debugMode, debugInfo, toggleDebugMode, showClickMarker, updateDebugInfo } = usePetDebug(
  debugOverlayRef,
  petImageRef,
  regionConfig
)

const { handleWheel } = usePetZoom()

// 商店和仓库（使用 petData.coins 作为金币源）
const shop = usePetShop(petData.coins)
const inventory = usePetInventory()

// 资源收益系统
usePetResourceEarnings(petData.coins, petData.lastEarningsTime, petData.savePetData)

// 处理鼠标事件
function handleMouseDown(e: MouseEvent) {
  interaction.handleMouseDown(e)
}

function handleMouseMove(e: MouseEvent) {
  interaction.handleMouseMove(e)
}

function handleMouseUp(e: MouseEvent) {
  const clickData = interaction.handleMouseUp(e)

  // 只有在不是拖动的情况下才处理点击
  if (!interaction.isDragging.value && !interaction.isWindowDragging.value) {
    if (clickData) {
      // 显示点击标记
      showClickMarker(e.clientX, e.clientY, clickData.region.name)

      // 调试模式：显示点击信息
      if (debugMode.value) {
        updateDebugInfo('点击检测', clickData)
      }

      // 增加好感度
      petData.increaseAffection(1)

      // 显示对话框
      if (dialog.isVisible.value) {
        dialog.hideDialog()
        setTimeout(() => {
          dialog.showDialog(clickData.region)
        }, 200)
      } else {
        dialog.showDialog(clickData.region)
      }
    } else {
      // 点击位置不在任何区域内（但确实是点击，不是拖动）
      showClickMarker(e.clientX, e.clientY, '无区域')

      if (debugMode.value) {
        if (petImageRef.value) {
          const imageRect = petImageRef.value.getBoundingClientRect()
          updateDebugInfo('点击位置不在任何区域内', {
            region: { name: '无', x: [0, 0], y: [0, 0], color: '#000000', dialogs: [] },
            relativeX: (e.clientX - imageRect.left) / imageRect.width,
            relativeY: (e.clientY - imageRect.top) / imageRect.height,
            pixelX: e.clientX - imageRect.left,
            pixelY: e.clientY - imageRect.top
          })
        }
      }

      // 增加好感度
      petData.increaseAffection(1)

      // 显示默认对话框
      if (dialog.isVisible.value) {
        dialog.hideDialog()
        setTimeout(() => {
          dialog.showDialog(null)
        }, 200)
      } else {
        dialog.showDialog(null)
      }
    }
  }
  // 如果是拖动，不处理点击事件，直接返回
}

function handleMouseLeave() {
  interaction.handleMouseLeave()
}

// 处理发送消息
function handleSendMessage(message: string) {
  dialog.showMessage(message)
  petData.increaseAffection(1)
}

// 处理购买物品
async function handleBuyItem(item: any) {
  const result = shop.buyItem(item)
  if (result.success) {
    // 添加到仓库（传递完整的物品信息）
    inventory.addItem(item, 1)
    // 保存金币变化
    await petData.savePetData()
    // 显示提示
    dialog.showMessage(result.message || `成功购买 ${item.name}`)
  } else {
    dialog.showMessage(result.message || '购买失败')
  }
}

// 处理使用物品
function handleUseItem(item: any) {
  const result = inventory.useItem(item)
  if (result.success && result.effect) {
    // 应用效果
    if (result.effect.affection) {
      // 使用经验值系统增加好感度
      petData.affectionSystem.addExp(result.effect.affection)
      petData.savePetData()
    }
    if (result.effect.appetite) {
      petData.updateAttribute('appetite', petData.appetite.value + result.effect.appetite)
    }
    if (result.effect.sleepiness) {
      petData.updateAttribute('sleepiness', petData.sleepiness.value + result.effect.sleepiness)
    }
    if (result.effect.libido) {
      petData.updateAttribute('libido', petData.libido.value + result.effect.libido)
    }
    // 显示提示
    dialog.showMessage(result.message || `使用了 ${item.name}`)
  } else {
    dialog.showMessage(result.message || '使用失败')
  }
}

// 快捷键支持（D键切换调试模式）
function handleKeyDown(e: KeyboardEvent) {
  // 如果焦点在输入框，不触发快捷键
  const activeElement = document.activeElement
  if (activeElement && activeElement.tagName === 'INPUT') return

  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault()
    toggleDebugMode()
  }
}

// 菜单内容滚动处理
function setupMenuScroll() {
  const menuContent = document.getElementById('menu-content')
  if (menuContent) {
    menuContent.addEventListener(
      'wheel',
      (e) => {
        const isScrollable = menuContent.scrollHeight > menuContent.clientHeight
        if (isScrollable) {
          e.stopPropagation()
        }
      },
      { passive: true }
    )
  }
}

onMounted(async () => {
  // 加载桌宠数据
  await petData.loadPetData()

  // 初始化菜单（默认隐藏）
  menu.hideMenu()

  // 设置快捷键
  document.addEventListener('keydown', handleKeyDown)

  // 设置菜单滚动
  setupMenuScroll()
})
</script>

<style scoped>
/* 全局动画样式，确保动态创建的元素也能应用 */
.pet-view {
  width: 800px; /* 500px 菜单 + 300px 主区域 */
  height: 700px;
  overflow: hidden;
  background: transparent;
  cursor: default;
  user-select: none;
  position: relative;
  margin: 0;
  padding: 0;
}

.interaction-area {
  position: absolute;
  top: 0;
  left: 500px;
  width: 350px;
  height: calc(100% - 50px);
  z-index: 2;
  pointer-events: auto;
}

.pet-image {
  position: absolute;
  top: 0;
  left: 500px;
  width: 350px;
  height: calc(100% - 50px);
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  z-index: 1;
}

.debug-overlay {
  position: absolute;
  top: 0;
  left: 500px;
  width: 350px;
  height: calc(100% - 50px);
  z-index: 3;
  pointer-events: none;
  display: block;
}

.debug-region {
  position: absolute;
  border: 2px solid;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.debug-region-label {
  position: absolute;
  top: 2px;
  left: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 3px;
  font-weight: bold;
}

.debug-click-marker {
  position: absolute;
  font-size: 20px;
  line-height: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: debugClickFade 2s ease-out forwards;
  z-index: 10;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.debug-click-marker::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #ffffff;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
  animation: debugClickFadeCircle 2s ease-out forwards;
  z-index: -1;
}

@keyframes debugClickFade {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

@keyframes debugClickFadeCircle {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2);
  }
}

.debug-toggle-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background: rgba(74, 144, 226, 0.8);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 14px;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

.debug-toggle-button:hover {
  background: rgba(74, 144, 226, 1);
}

.debug-toggle-button.active {
  background: rgba(255, 0, 0, 0.8);
}
</style>

