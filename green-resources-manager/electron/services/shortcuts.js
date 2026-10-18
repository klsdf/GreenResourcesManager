/**
 * @module Shortcuts
 * @description 管理应用程序的全局快捷键功能，包括截图快捷键和安全键（ESC）管理。
 *
 * 主要功能:
 * 1. 注册和管理全局截图快捷键，允许用户在任意位置触发截图功能。
 * 2. 管理安全键（ESC键），当触发时最小化主窗口和游戏窗口，并打开安全网页。
 * 3. 检查快捷键是否可用（未被其他应用占用）。
 * 4. 提供清理函数用于注销所有全局快捷键。
 * 5. 注册与快捷键相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, getMainWindow, getGameProcess, shell)`: 注册 IPC 处理器。
 * - `unregisterAllShortcuts()`: 注销所有全局快捷键（用于应用退出时清理）。
 *
 * 内部函数:
 * - `updateGlobalShortcut(newKey, getMainWindow, globalShortcut)`: 更新全局截图快捷键。
 * - `updateSafetyKey(enabled, url, getMainWindow, getGameProcess, shell, globalShortcut, handleSafetyKeyTrigger)`: 更新安全键设置。
 * - `handleSafetyKeyTrigger(getMainWindow, getGameProcess, safetyKeyUrl, shell)`: 处理安全键触发事件。
 * - `checkShortcutAvailable(key, globalShortcut)`: 检查快捷键是否可用。
 *
 * IPC 处理器:
 * - `update-global-shortcut`: 更新全局截图快捷键。
 * - `check-global-shortcut-available`: 检查快捷键是否可用。
 * - `set-safety-key`: 设置安全键（启用/禁用和安全网页URL）。
 *
 * 快捷键功能:
 * - 全局截图快捷键：可自定义的全局快捷键，触发后发送 `global-screenshot-trigger` 事件到渲染进程。
 * - 安全键（ESC）：全局 ESC 键，触发后最小化主窗口和所有游戏窗口，并打开指定的安全网页。
 * - 安全键触发条件：只有当有游戏正在运行或应用窗口处于焦点时才会执行。
 */

const { globalShortcut, shell } = require('electron')

// 存储当前注册的快捷键
let currentGlobalShortcut = null
// 存储安全键相关设置
let safetyKeyEnabled = false
let safetyKeyUrl = ''
/** 当前真正注册到系统里的安全键。注销时必须用同一串，不能写死 Escape。 */
let currentSafetyShortcut = null
// 存储打开软件快捷键相关设置
let currentShowWindowShortcut = null

/**
 * 处理安全键触发事件。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} getGameProcess - 获取游戏进程模块的函数。
 * @returns {Promise<void>}
 */
async function handleSafetyKeyTrigger(getMainWindow, getGameProcess) {
  try {
    console.log('🔒 安全键触发: ESC')

    const gameProcess = getGameProcess()
    const mainWindow = getMainWindow()

    // 检查是否有游戏正在运行
    const hasRunningGames = gameProcess.getGameProcessesCount() > 0

    // 检查应用窗口是否处于焦点状态
    const isAppFocused = mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()

    // 只有当游戏正在运行或应用窗口处于焦点时才执行
    if (!hasRunningGames && !isAppFocused) {
      console.log('⚠️ 安全键触发但条件不满足：无运行中的游戏且应用窗口未聚焦，忽略操作')
      return
    }

    console.log('✅ 安全键条件满足：', {
      hasRunningGames,
      isAppFocused
    })

    // 最小化主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
      console.log('✅ 主窗口已最小化')
    }

    // 最小化所有游戏窗口
    if (hasRunningGames) {
      await gameProcess.minimizeAllGameWindows()
    }

    // 打开安全网页
    if (safetyKeyUrl) {
      await shell.openExternal(safetyKeyUrl)
      console.log('✅ 安全网页已打开:', safetyKeyUrl)
    }

    // 通知渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('safety-key-triggered')
    }
  } catch (error) {
    console.error('执行安全键操作失败:', error)
  }
}

/**
 * 更新全局截图快捷键。
 * @param {string|null} newKey - 新的快捷键字符串（如 'CommandOrControl+Shift+S'）或 null 表示注销。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @returns {{success: boolean, key?: string, error?: string}} 更新结果。
 */
function updateGlobalShortcut(newKey, getMainWindow) {
  try {
    // 只注销截图快捷键，保留安全键
    if (currentGlobalShortcut) {
      globalShortcut.unregister(currentGlobalShortcut)
    }
    currentGlobalShortcut = null

    // 注册新的快捷键
    if (newKey) {
      const registered = globalShortcut.register(newKey, () => {
        console.log('[截图] 全局快捷键', newKey, '被按下')
        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('global-screenshot-trigger')
          console.log('[截图] 已向渲染进程发送 global-screenshot-trigger')
        } else {
          console.warn('[截图] 主窗口不可用，未发送 global-screenshot-trigger')
        }
      })

      if (registered) {
        console.log('[截图] 全局快捷键', newKey, '注册成功')
        currentGlobalShortcut = newKey
        return { success: true, key: newKey }
      } else {
        console.log('[截图] 全局快捷键', newKey, '注册失败，可能被其他应用占用')
        return { success: false, error: '快捷键被其他应用占用' }
      }
    }

    return { success: true, key: null }
  } catch (error) {
    console.error('更新全局快捷键失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 更新安全键设置。
 * 快捷键由设置页按下录入，不能再写死 Escape，否则用户改完按新键没有反应。
 * @param {boolean} enabled - 是否启用安全键。
 * @param {string} url - 安全网页URL。
 * @param {string} shortcut - 要注册的快捷键，例如 Esc、Ctrl+Q。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} getGameProcess - 获取游戏进程模块的函数。
 * @returns {{success: boolean, error?: string}} 更新结果。
 */
function updateSafetyKey(enabled, url, shortcut, getMainWindow, getGameProcess) {
  try {
    safetyKeyEnabled = enabled
    safetyKeyUrl = url || ''

    if (currentSafetyShortcut) {
      globalShortcut.unregister(currentSafetyShortcut)
      currentSafetyShortcut = null
    }
    // 旧版本只注册过 Escape，这里一并清掉，避免改键后 Esc 仍然触发。
    globalShortcut.unregister('Escape')
    globalShortcut.unregister('Esc')

    if (enabled) {
      const key = shortcut || 'Esc'
      const registered = globalShortcut.register(key, () => {
        handleSafetyKeyTrigger(getMainWindow, getGameProcess)
      })

      if (registered) {
        currentSafetyShortcut = key
        console.log('✅ 安全键全局快捷键注册成功:', key)
        return { success: true }
      } else {
        console.log('⚠️ 安全键全局快捷键注册失败，可能被其他应用占用:', key)
        return { success: false, error: '快捷键被其他应用占用' }
      }
    } else {
      console.log('安全键已禁用')
      return { success: true }
    }
  } catch (error) {
    console.error('更新安全键设置失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 检查快捷键是否可用（未被其他应用占用）。
 * @param {string} key - 快捷键字符串。
 * @returns {{success: boolean, available?: boolean, error?: string}} 检查结果。
 */
function checkShortcutAvailable(key) {
  try {
    // 尝试注册快捷键来检查是否可用
    const testRegistered = globalShortcut.register(key, () => {})
    if (testRegistered) {
      // 立即注销测试快捷键
      globalShortcut.unregister(key)
      return { success: true, available: true }
    } else {
      return { success: true, available: false }
    }
  } catch (error) {
    console.error('检查全局快捷键可用性失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 更新打开软件快捷键。
 * @param {string|null} newKey - 新的快捷键字符串（如 'F2'）或 null 表示注销。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} showAndFocusMainWindow - 显示并聚焦主窗口的函数。
 * @returns {{success: boolean, key?: string, error?: string}} 更新结果。
 */
function updateShowWindowShortcut(newKey, getMainWindow, showAndFocusMainWindow) {
  try {
    // 注销之前的快捷键
    if (currentShowWindowShortcut) {
      globalShortcut.unregister(currentShowWindowShortcut)
    }
    currentShowWindowShortcut = null

    // 注册新的快捷键
    if (newKey) {
      const registered = globalShortcut.register(newKey, () => {
        console.log('[显示窗口] 全局快捷键', newKey, '被按下')
        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          // 无论窗口是否可见，都强制显示并聚焦到最上层
          showAndFocusMainWindow()
          console.log('[显示窗口] 已显示并聚焦主窗口到最上层')
        } else {
          console.warn('[显示窗口] 主窗口不可用')
        }
      })

      if (registered) {
        console.log('[显示窗口] 全局快捷键', newKey, '注册成功')
        currentShowWindowShortcut = newKey
        return { success: true, key: newKey }
      } else {
        console.log('[显示窗口] 全局快捷键', newKey, '注册失败，可能被其他应用占用')
        return { success: false, error: '快捷键被其他应用占用' }
      }
    }

    return { success: true, key: null }
  } catch (error) {
    console.error('更新显示窗口快捷键失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注销所有全局快捷键（用于应用退出时清理）。
 */
function unregisterAllShortcuts() {
  try {
    // 注销截图快捷键
    if (currentGlobalShortcut) {
      globalShortcut.unregister(currentGlobalShortcut)
      currentGlobalShortcut = null
    }
    // 注销安全键
    if (currentSafetyShortcut) {
      globalShortcut.unregister(currentSafetyShortcut)
      currentSafetyShortcut = null
    }
    globalShortcut.unregister('Escape')
    globalShortcut.unregister('Esc')
    // 注销显示窗口快捷键
    if (currentShowWindowShortcut) {
      globalShortcut.unregister(currentShowWindowShortcut)
      currentShowWindowShortcut = null
    }
    console.log('所有全局快捷键已注销')
  } catch (error) {
    console.error('注销全局快捷键失败:', error)
  }
}

/**
 * 注册与快捷键相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} getGameProcess - 获取游戏进程模块的函数。
 * @param {Function} showAndFocusMainWindow - 显示并聚焦主窗口的函数。
 */
function registerIpcHandlers(ipcMain, getMainWindow, getGameProcess, showAndFocusMainWindow) {
  // 更新全局快捷键
  ipcMain.handle('update-global-shortcut', async (event, newKey) => {
    try {
      const result = updateGlobalShortcut(newKey, getMainWindow)
      return result
    } catch (error) {
      console.error('更新全局快捷键失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 检查全局快捷键是否可用
  ipcMain.handle('check-global-shortcut-available', async (event, key) => {
    return checkShortcutAvailable(key)
  })

  // 设置安全键
  ipcMain.handle('set-safety-key', async (event, enabled, url, shortcut) => {
    try {
      const result = updateSafetyKey(enabled, url, shortcut, getMainWindow, getGameProcess)
      return result
    } catch (error) {
      console.error('设置安全键失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 更新显示窗口快捷键
  ipcMain.handle('update-show-window-shortcut', async (event, newKey) => {
    try {
      const result = updateShowWindowShortcut(newKey, getMainWindow, showAndFocusMainWindow)
      return result
    } catch (error) {
      console.error('更新显示窗口快捷键失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  registerIpcHandlers,
  unregisterAllShortcuts,
  updateShowWindowShortcut
}

