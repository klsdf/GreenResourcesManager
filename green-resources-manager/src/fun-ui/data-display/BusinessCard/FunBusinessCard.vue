<template>
  <div 
    class="fun-business-card-wrapper" 
    @click="flipCard"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :style="cardTransformStyle"
  >
    <div 
      class="fun-business-card" 
      :class="{ 'fun-business-card--flipped': isCardFlipped }"
      :style="cardSizeStyle"
    >
      <div class="fun-business-card__face fun-business-card__face--front">
        <img 
          v-if="frontImage" 
          :src="frontImage" 
          :alt="frontAlt || '名片正面'" 
          class="fun-business-card__image" 
        />
        <div class="fun-business-card__overlay">
          <span class="fun-business-card__hint">{{ flipHint }}</span>
        </div>
      </div>
      <div class="fun-business-card__face fun-business-card__face--back">
        <img 
          v-if="backImage" 
          :src="backImage" 
          :alt="backAlt || '名片背面'" 
          class="fun-business-card__image" 
        />
        <div class="fun-business-card__overlay">
          <span class="fun-business-card__hint">{{ flipHint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  /** 正面图片地址 */
  frontImage?: string
  /** 背面图片地址 */
  backImage?: string
  /** 正面图片 alt 文本 */
  frontAlt?: string
  /** 背面图片 alt 文本 */
  backAlt?: string
  /** 翻转提示文本 */
  flipHint?: string
  /** 卡片宽度 */
  width?: string | number
  /** 卡片高度 */
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  frontImage: './imgs/名片 - 正面.png',
  backImage: './imgs/名片 - 背面.png',
  frontAlt: '名片正面',
  backAlt: '名片背面',
  flipHint: '点击翻转',
  width: 500,
  height: 750
})

const isCardFlipped = ref(false)
const rotateX = ref(0)
const rotateY = ref(0)

const cardTransformStyle = computed(() => {
  if (isCardFlipped.value) {
    return {
      willChange: 'transform',
      transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${180 + rotateY.value}deg)`
    }
  } else {
    return {
      willChange: 'transform',
      transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg)`
    }
  }
})

const cardSizeStyle = computed(() => {
  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height
  }
})

function flipCard() {
  isCardFlipped.value = !isCardFlipped.value
}

function handleMouseMove(event: MouseEvent) {
  const card = event.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  // 计算鼠标相对于卡片中心的位置（-1 到 1）
  const mouseX = (event.clientX - centerX) / (rect.width / 2)
  const mouseY = (event.clientY - centerY) / (rect.height / 2)
  
  // 计算旋转角度（限制在合理范围内）
  rotateY.value = mouseX * 15 // 最大15度
  rotateX.value = -mouseY * 15 // 最大15度，负号是为了自然的方向
}

function handleMouseLeave() {
  // 鼠标离开时平滑回到初始状态
  rotateX.value = 0
  rotateY.value = 0
}
</script>

<style scoped lang="scss">
.fun-business-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  perspective: 1200px;
  cursor: pointer;
  transition: transform 0.1s ease-out;
}

.fun-business-card {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &--flipped {
    transform: rotateY(180deg);
  }
}

.fun-business-card__face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 15px 50px var(--shadow-dark);
  transition: box-shadow var(--transition-slow);
  
  &--front {
    transform: rotateY(0deg);
  }
  
  &--back {
    transform: rotateY(180deg) scaleX(-1);
  }
}

.fun-business-card-wrapper:hover .fun-business-card__face {
  box-shadow: 0 20px 60px var(--shadow-dark);
}

.fun-business-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fun-business-card__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: var(--spacing-xl);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.fun-business-card-wrapper:hover .fun-business-card__overlay {
  opacity: 1;
}

.fun-business-card__hint {
  color: white;
  font-size: var(--font-size-base);
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.5);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fun-business-card {
    width: 400px;
    height: 240px;
  }
}
</style>
