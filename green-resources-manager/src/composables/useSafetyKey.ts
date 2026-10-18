/**
 * 安全键管理 Composable
 * 负责管理安全键（ESC键）的启用/禁用和URL配置
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import saveManager from '../utils/SaveManager'

export function useSafetyKey() {
  const safetyKeyEnabled = ref(false)
  const safetyKeyUrl = ref('https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466')
  /** 设置页录入的安全键。注册时带上它，避免主进程退回写死的 Esc。 */
  const safetyKeyShortcut = ref('Esc')

  /**
   * 设置安全键监听
   */
  async function setupSafetyKeyListener() {
    try {
      if (window.electronAPI && window.electronAPI.setSafetyKey) {
        const result = await window.electronAPI.setSafetyKey(safetyKeyEnabled.value, safetyKeyUrl.value, safetyKeyShortcut.value)
        if (result.success) {
          console.log('✅ 安全键全局快捷键已', safetyKeyEnabled.value ? '启用' : '禁用', '(ESC)')
        } else {
          console.warn('设置安全键失败:', result.error)
        }
      }
    } catch (error) {
      console.error('设置安全键监听失败:', error)
    }
  }

  /**
   * 加载安全键设置
   */
  async function loadSafetyKeySettings() {
    try {
      const settings = await saveManager.loadSettings()
      if (settings) {
        safetyKeyEnabled.value = settings.safetyKeyEnabled || false
        safetyKeyUrl.value = settings.safetyKeyUrl || 'https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466'
        safetyKeyShortcut.value = settings.safetyKeyShortcut || 'Esc'
        await setupSafetyKeyListener()
      }
    } catch (error) {
      console.warn('加载安全键设置失败:', error)
    }
  }

  /**
   * 更新安全键设置
   */
  async function updateSafetyKey(enabled: boolean, url?: string, shortcut?: string) {
    safetyKeyEnabled.value = enabled
    if (url !== undefined) {
      safetyKeyUrl.value = url
    }
    if (shortcut) {
      safetyKeyShortcut.value = shortcut
    }
    await setupSafetyKeyListener()
  }

  /**
   * 禁用安全键（清理全局快捷键）
   */
  async function disableSafetyKey() {
    try {
      if (window.electronAPI && window.electronAPI.setSafetyKey) {
        await window.electronAPI.setSafetyKey(false, '')
        console.log('✅ 安全键已禁用')
      }
    } catch (error) {
      console.error('禁用安全键失败:', error)
    }
  }

  /**
   * 初始化安全键监听
   */
  function initSafetyKeyListener() {
    // 监听安全键设置变化事件
    const handleSafetyKeyChanged = async (event: CustomEvent) => {
      const { enabled, url, shortcut } = event.detail
      await updateSafetyKey(enabled, url, shortcut)
    }

    // 监听安全键触发事件（来自主进程）
    if (window.electronAPI && window.electronAPI.onSafetyKeyTriggered) {
      window.electronAPI.onSafetyKeyTriggered(() => {
        console.log('收到安全键触发事件（来自主进程）')
        // 主进程已经处理了最小化和打开网页，这里可以添加额外的UI反馈
      })
    }

    window.addEventListener('safety-key-changed', handleSafetyKeyChanged as EventListener)

    // 返回清理函数
    return () => {
      window.removeEventListener('safety-key-changed', handleSafetyKeyChanged as EventListener)
    }
  }

  return {
    safetyKeyEnabled,
    safetyKeyUrl,
    loadSafetyKeySettings,
    setupSafetyKeyListener,
    updateSafetyKey,
    disableSafetyKey,
    initSafetyKeyListener
  }
}

