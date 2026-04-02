/**
 * 主题管理 Composable
 * 负责管理应用主题（light/dark/auto）
 */
import { ref, watch } from 'vue'
import saveManager from '../utils/SaveManager'

export type Theme = 'light' | 'dark' | 'ukiyoe' | 'chinese' | 'forest' | 'ocean' | 'cream' | 'auto'

export function useTheme() {
  const theme = ref<Theme>('auto')

  /**
   * 获取实际应用的主题（如果是 auto，则根据系统偏好返回 light 或 dark）
   */
  function getActualTheme(): Exclude<Theme, 'auto'> {
    if (theme.value === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    return theme.value as Exclude<Theme, 'auto'>
  }

  /**
   * 应用主题
   */
  function applyTheme(newTheme: Theme) {
    theme.value = newTheme
    const actualTheme = getActualTheme()

    // 应用实际主题到 DOM
    document.documentElement.setAttribute('data-theme', actualTheme)
    localStorage.setItem('butter-manager-theme', newTheme)

    console.log('应用主题:', newTheme, '实际主题:', actualTheme)
  }

  /**
   * 加载主题设置
   */
  async function loadTheme() {
    try {
      const settings = await saveManager.loadSettings()
      const savedTheme = (settings?.theme || 'auto') as Theme
      applyTheme(savedTheme)
      console.log('从 SaveManager 加载主题设置:', savedTheme)
    } catch (error) {
      console.warn('加载主题设置失败，使用默认主题:', error)
      applyTheme('auto')
    }
  }

  /**
   * 监听系统主题变化（当主题为 auto 时）
   */
  function watchSystemTheme() {
    if (theme.value !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme.value === 'auto') {
        const actualTheme = getActualTheme()
        document.documentElement.setAttribute('data-theme', actualTheme)
      }
    }

    // 使用 addEventListener（现代浏览器支持）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // 降级到 addListener（旧浏览器）
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }

  // 监听主题变化，自动更新系统主题监听
  let cleanupSystemThemeWatcher: (() => void) | null = null
  watch(
    () => theme.value,
    (newTheme) => {
      // 清理旧的监听器
      if (cleanupSystemThemeWatcher) {
        cleanupSystemThemeWatcher()
        cleanupSystemThemeWatcher = null
      }

      // 如果主题是 auto，监听系统主题变化
      if (newTheme === 'auto') {
        cleanupSystemThemeWatcher = watchSystemTheme()
      }
    },
    { immediate: true }
  )

  return {
    theme,
    applyTheme,
    loadTheme,
    getActualTheme
  }
}

