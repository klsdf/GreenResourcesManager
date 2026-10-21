/**
 * 伪装模式开关。
 * 设置已经写进 SQLite，卡片和侧栏不能再只看浏览器里的旧缓存。
 */

/**
 * 当前这次运行里的伪装开关。
 * null 表示还没从设置同步过来，这时才去看旧的本地缓存。
 */
let disguiseModeEnabled: boolean | null = null

/**
 * 把伪装开关记到内存里，供卡片和筛选栏立刻读取。
 * @param enabled 是否开启伪装模式
 */
export function setDisguiseModeEnabled(enabled: boolean): void {
  disguiseModeEnabled = enabled === true
}

/**
 * 检查伪装模式是否启用。
 * 优先用这次运行里同步过的值；还没同步时，再看旧版本留在本地缓存里的设置。
 * @returns 是否启用伪装模式
 */
export function isDisguiseModeEnabled(): boolean {
  if (disguiseModeEnabled !== null) {
    return disguiseModeEnabled
  }

  try {
    /** 旧版本把整份设置存在浏览器本地缓存里。 */
    const settings = localStorage.getItem('butter-manager-settings')
    if (settings) {
      const parsedSettings = JSON.parse(settings)
      return parsedSettings.disguiseMode === true
    }
    return false
  } catch (error) {
    console.error('检查伪装模式设置失败:', error)
    return false
  }
}
