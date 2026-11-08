import { ref, computed, type Ref } from 'vue'

export type DisplayMode = 'grid' | 'list'

/** 一行最少几张卡片。再少就只剩一张大图。 */
export const CARDS_PER_ROW_MIN = 2
/** 一行最多几张卡片。再多标题会被挤没。 */
export const CARDS_PER_ROW_MAX = 10
/** 没设过，或存的还是旧百分比时，一行放这么多张。 */
export const CARDS_PER_ROW_DEFAULT = 4

/**
 * 把存档里的布局数字收成一行卡片数。
 * 旧版本存的是 15 到 150 的百分比，那种值会把字一起缩小，这里不当成列数。
 * @param value 存档或控件传来的数字
 * @returns 2 到 10 之间的列数
 */
export function normalizeCardsPerRow(value: unknown): number {
  const count = Math.round(Number(value))
  if (count >= CARDS_PER_ROW_MIN && count <= CARDS_PER_ROW_MAX) {
    return count
  }
  return CARDS_PER_ROW_DEFAULT
}

/**
 * 页面上的网格布局状态。
 * scale 现在记下的是一行几张卡片；旧调用仍用这个名字，避免把整条工具栏的参数改名。
 * @param initialScale 初始数字。2 到 10 当作列数，别的值在显示时会收成默认 4 张
 * @param baseWidth 旧的卡片基准宽度，只留给还在用百分比算格子的样式
 * @param initialMode 网格或列表
 */
export function useDisplayLayout(initialScale = 80, baseWidth = 200, initialMode: DisplayMode = 'grid') {
  const scale = ref(initialScale)
  const displayMode: Ref<DisplayMode> = ref(initialMode)

  const updateScale = (newScale: number) => {
    scale.value = newScale
  }

  const updateDisplayMode = (mode: DisplayMode) => {
    displayMode.value = mode === 'list' ? 'list' : 'grid'
  }

  const layoutStyles = computed(() => {
    const scaledWidth = Math.max(100, Math.round(baseWidth * (scale.value / 100)))
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${scaledWidth}px, 1fr))`,
      justifyContent: 'stretch'
    }
  })

  return {
    scale,
    displayMode,
    updateScale,
    updateDisplayMode,
    layoutStyles
  }
}
