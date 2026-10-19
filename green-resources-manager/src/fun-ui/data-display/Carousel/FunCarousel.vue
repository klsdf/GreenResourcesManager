<template>
  <div
    class="fun-carousel"
    :style="wrapStyle"
  >
    <button
      v-if="items.length > 1"
      type="button"
      class="fun-carousel__arrow fun-carousel__arrow--left"
      aria-label="上一张"
      @click.stop="goPrev"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button
      v-if="items.length > 1"
      type="button"
      class="fun-carousel__arrow fun-carousel__arrow--right"
      aria-label="下一张"
      @click.stop="goNext"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
    <div
      class="fun-carousel__track"
      :style="trackStyle"
    >
      <img
        v-for="(url, i) in items"
        :key="i"
        :src="displayUrls[i]"
        :alt="imageAlt"
        class="fun-carousel__img"
        @error="onImageError(i)"
      />
    </div>
    <div
      v-if="items.length > 1"
      class="fun-carousel__dots"
    >
      <button
        v-for="(_, i) in items"
        :key="i"
        type="button"
        class="fun-carousel__dot"
        :class="{ 'fun-carousel__dot--active': currentIndex === i }"
        :aria-label="`第 ${i + 1} 张`"
        @click.stop="currentIndex = i"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  /** 图片 URL 列表 */
  items: string[]
  /** 宽度，如 '200px' 或 200 */
  width?: string | number
  /** 高度，如 '200px' 或 200 */
  height?: string | number
  /** 图片加载失败时使用的 fallback 地址 */
  fallbackImage?: string
  /** 图片 alt 文案 */
  imageAlt?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '200px',
  height: '200px',
  fallbackImage: '',
  imageAlt: ''
})

const currentIndex = ref(0)
const imageErrors = ref<Record<number, boolean>>({})

const displayUrls = computed(() =>
  props.items.map((url, i) => (imageErrors.value[i] && props.fallbackImage ? props.fallbackImage : url))
)

const wrapStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height
}))

const trackStyle = computed(() => ({
  transform: `translateX(-${currentIndex.value * 100}%)`
}))

function onImageError(index: number) {
  imageErrors.value = { ...imageErrors.value, [index]: true }
}

function goPrev() {
  const n = props.items.length
  if (n <= 1) return
  currentIndex.value = (currentIndex.value - 1 + n) % n
}

function goNext() {
  const n = props.items.length
  if (n <= 1) return
  currentIndex.value = (currentIndex.value + 1) % n
}
</script>

<style scoped>
.fun-carousel {
  position: relative;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-tertiary);
}

.fun-carousel__arrow {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 48px;
  border: none;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.fun-carousel__arrow:hover {
  background: rgba(0, 0, 0, 0.45);
}

.fun-carousel__arrow svg {
  width: 24px;
  height: 24px;
}

.fun-carousel__arrow--left {
  left: 0;
}

.fun-carousel__arrow--right {
  right: 0;
}

.fun-carousel__track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.fun-carousel__img {
  width: 100%;
  height: 100%;
  min-width: 100%;
  object-fit: cover;
  display: block;
}

.fun-carousel__dots {
  position: absolute;
  bottom: 4px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 2px 0;
}

.fun-carousel__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 0.2s;
}

.fun-carousel__dot:hover {
  background: rgba(255, 255, 255, 0.8);
}

.fun-carousel__dot--active {
  background: #fff;
  transform: scale(1.2);
}
</style>
