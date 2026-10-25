import { ref, computed, type Ref } from 'vue'

export type DisplayMode = 'grid' | 'list'

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
