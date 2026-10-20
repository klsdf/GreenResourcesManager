const { BrowserView, app } = require('electron')
const path = require('path')
const fs = require('fs')
const { resolveMainPreloadPath } = require('../utils/preload-path')

/**
 * 标签页管理器
 * 管理主窗口中的 BrowserView 标签页
 */
class TabManager {
  constructor(mainWindow, isDev = false) {
    this.mainWindow = mainWindow
    this.isDev = isDev
    this.tabs = new Map() // Map<tabId, { id, view, url, title, isHome }>
    this.activeTabId = null
    this.sidebarWidth = 0 // 标签页覆盖整个窗口，不需要预留侧边栏宽度
    this.headerHeight = 0 // 标签页从窗口顶部开始
    this.audioPlayerHeight = 80 // 底部音频播放器高度
    this.tabBarHeight = 40 // 标签栏高度
    /** 标签页 BrowserView 与主窗口加载同一份 preload，内部页面才能调用 IPC */
    this.preloadPath = resolveMainPreloadPath()

    // 监听窗口大小变化
    if (mainWindow) {
      mainWindow.on('resize', () => this.updateAllTabBounds())
    }

    // 创建默认主页标签页
    this.createHomeTab()
  }

  /**
   * 创建默认主页标签页（特殊标签页，不创建BrowserView）
   */
  createHomeTab() {
    const homeTabId = 'home-tab'
    const homeTabInfo = {
      id: homeTabId,
      view: null, // 主页标签页没有BrowserView
      url: null,
      title: '主页',
      isHome: true // 标记为主页标签页
    }
    this.tabs.set(homeTabId, homeTabInfo)
    this.activeTabId = homeTabId
    
    // 通知渲染进程主页标签页已创建
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tab-loaded', { tabId: homeTabId, url: null })
      this.mainWindow.webContents.send('tab-activated', { tabId: homeTabId })
    }
    
    console.log('✅ 创建默认主页标签页')
  }

  /**
   * 创建新标签页
   * @param {string} url - 要加载的 URL（可选，默认空白页）
   * @param {string} title - 标签页标题（可选）
   * @returns {string} 标签页 ID
   */
  createTab(url = null, title = '新标签页') {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 创建 BrowserView
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: this.preloadPath
      }
    })

    // 确定要加载的 URL
    let targetUrl = url
    if (!targetUrl) {
      // 加载空白页面
      const appPath = app.getAppPath()

      // 尝试多个可能的路径
      const possiblePaths = [
        path.join(appPath, 'public', 'html', 'blank-tab.html'),
        path.join(appPath, 'html', 'blank-tab.html'),
        path.join(__dirname, '../../html/blank-tab.html')
      ]

      let blankPagePath = possiblePaths.find(p => fs.existsSync(p))
      
      if (!blankPagePath) {
        // 如果都找不到，使用第一个路径（让 Electron 报错）
        blankPagePath = possiblePaths[0]
        console.warn('⚠️ 警告: 找不到 blank-tab.html 文件，尝试的路径:', possiblePaths)
      }
      
      targetUrl = `file://${blankPagePath.replace(/\\/g, '/')}`
      console.log('✅ 空白标签页路径:', targetUrl)
    }

    // 加载 URL
    view.webContents.loadURL(targetUrl).catch(err => {
      console.error('加载标签页 URL 失败:', err)
    })

    // 监听页面标题变化
    view.webContents.on('page-title-updated', (event, title) => {
      this.updateTabTitle(tabId, title)
    })

    // 监听页面加载完成
    view.webContents.on('did-finish-load', () => {
      // 通知渲染进程标签页已加载
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('tab-loaded', { tabId, url: targetUrl })
      }
    })

    // 存储标签页信息
    const tabInfo = {
      id: tabId,
      view: view,
      url: targetUrl,
      title: title,
      isHome: false // 普通标签页
    }
    this.tabs.set(tabId, tabInfo)

    // 设置为活动标签页
    this.setActiveTab(tabId)

    console.log('✅ 创建新标签页:', tabId, targetUrl)
    return tabId
  }

  /**
   * 设置活动标签页
   * @param {string} tabId - 标签页 ID
   */
  setActiveTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn('标签页不存在:', tabId)
      return
    }

    const activeTab = this.tabs.get(tabId)
    
    // 如果是主页标签页，隐藏所有BrowserView
    if (activeTab.isHome) {
      this.tabs.forEach((tabInfo, id) => {
        if (tabInfo.view) {
          this.mainWindow.removeBrowserView(tabInfo.view)
        }
      })
      this.activeTabId = tabId
      
      // 通知渲染进程活动标签页已改变
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('tab-activated', { tabId })
      }
      return
    }

    // 隐藏所有标签页
    this.tabs.forEach((tabInfo, id) => {
      if (id !== tabId && tabInfo.view) {
        this.mainWindow.removeBrowserView(tabInfo.view)
      }
    })

    // 显示活动标签页
    if (activeTab.view) {
      this.mainWindow.setBrowserView(activeTab.view)
      this.updateTabBounds(tabId)
      this.activeTabId = tabId

      // 通知渲染进程活动标签页已改变
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('tab-activated', { tabId })
      }
    }
  }

  /**
   * 关闭标签页
   * @param {string} tabId - 标签页 ID
   */
  closeTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.warn('标签页不存在:', tabId)
      return
    }

    const tabInfo = this.tabs.get(tabId)
    
    // 主页标签页不能被关闭（这是硬性规则，永远不能删除）
    if (tabInfo.isHome) {
      console.log('主页标签页不能被关闭')
      return
    }
    
    // 如果是活动标签页，需要切换到其他标签页
    if (this.activeTabId === tabId) {
      // 找到其他标签页（优先切换到主页）
      const otherTabs = Array.from(this.tabs.keys()).filter(id => id !== tabId)
      if (otherTabs.length > 0) {
        // 优先切换到主页，否则切换到最后一个标签页
        const homeTab = otherTabs.find(id => this.tabs.get(id).isHome)
        const targetTab = homeTab || otherTabs[otherTabs.length - 1]
        this.setActiveTab(targetTab)
      } else {
        // 没有其他标签页了，应该切换到主页标签页（主页标签页应该始终存在）
        const homeTab = Array.from(this.tabs.keys()).find(id => this.tabs.get(id).isHome)
        if (homeTab) {
          this.setActiveTab(homeTab)
        } else {
          // 如果主页标签页也不存在（不应该发生），隐藏所有 BrowserView
          if (tabInfo.view) {
            this.mainWindow.removeBrowserView(tabInfo.view)
          }
          this.activeTabId = null
        }
      }
    } else {
      // 不是活动标签页，直接移除
      if (tabInfo.view) {
        this.mainWindow.removeBrowserView(tabInfo.view)
      }
    }

    // 销毁 BrowserView
    if (tabInfo.view && !tabInfo.view.webContents.isDestroyed()) {
      tabInfo.view.webContents.destroy()
    }

    // 从 Map 中移除
    this.tabs.delete(tabId)

    // 通知渲染进程标签页已关闭
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tab-closed', { tabId })
    }
  }

  /**
   * 更新标签页标题
   * @param {string} tabId - 标签页 ID
   * @param {string} title - 新标题
   */
  updateTabTitle(tabId, title) {
    if (!this.tabs.has(tabId)) {
      return
    }

    const tabInfo = this.tabs.get(tabId)
    tabInfo.title = title

    // 通知渲染进程标题已更新
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tab-title-updated', { tabId, title })
    }
  }

  /**
   * 更新标签页 URL
   * @param {string} tabId - 标签页 ID
   * @param {string} url - 新 URL
   */
  navigateTab(tabId, url) {
    if (!this.tabs.has(tabId)) {
      console.warn('标签页不存在:', tabId)
      return
    }

    const tabInfo = this.tabs.get(tabId)
    tabInfo.url = url
    tabInfo.view.webContents.loadURL(url).catch(err => {
      console.error('导航标签页失败:', err)
    })
  }

  /**
   * 更新单个标签页的边界
   * @param {string} tabId - 标签页 ID
   */
  updateTabBounds(tabId) {
    if (!this.tabs.has(tabId) || !this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

    const tabInfo = this.tabs.get(tabId)
    
    // 主页标签页没有 BrowserView，不需要更新边界
    if (!tabInfo.view) {
      return
    }

    const bounds = this.mainWindow.getBounds()
    
    const viewBounds = {
      x: 0, // 从窗口最左侧开始
      y: this.tabBarHeight, // 从标签栏下方开始
      width: bounds.width, // 覆盖整个窗口宽度
      height: bounds.height - this.tabBarHeight - this.audioPlayerHeight // 减去标签栏和音频播放器高度
    }

    tabInfo.view.setBounds(viewBounds)
  }

  /**
   * 更新所有标签页的边界
   */
  updateAllTabBounds() {
    // 只更新活动标签页的边界（且该标签页必须有 BrowserView）
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      const activeTab = this.tabs.get(this.activeTabId)
      // 只有非主页标签页（有 BrowserView）才需要更新边界
      if (activeTab && activeTab.view) {
        this.updateTabBounds(this.activeTabId)
      }
    }
  }

  /**
   * 获取所有标签页信息
   * @returns {Array} 标签页列表
   */
  getAllTabs() {
    return Array.from(this.tabs.values()).map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      isHome: tab.isHome || false
    }))
  }

  /**
   * 获取活动标签页 ID
   * @returns {string|null}
   */
  getActiveTabId() {
    // 如果没有活动标签页，返回主页标签页 ID（主页标签页应该始终存在）
    return this.activeTabId || 'home-tab'
  }

  /**
   * 清理所有标签页（保留主页标签页）
   */
  destroy() {
    // 保存主页标签页信息
    const homeTab = this.tabs.get('home-tab')
    
    // 销毁所有非主页标签页的 BrowserView
    this.tabs.forEach((tabInfo, tabId) => {
      if (!tabInfo.isHome && tabInfo.view && !tabInfo.view.webContents.isDestroyed()) {
        tabInfo.view.webContents.destroy()
      }
    })
    
    // 清除所有标签页
    this.tabs.clear()
    
    // 恢复主页标签页（如果存在）
    if (homeTab) {
      this.tabs.set('home-tab', homeTab)
      this.activeTabId = 'home-tab'
    } else {
      // 如果主页标签页不存在，重新创建它
      this.createHomeTab()
    }
  }
}

// 导出单例
let tabManagerInstance = null

/**
 * 获取标签页管理器实例
 * @param {BrowserWindow} mainWindow - 主窗口
 * @param {boolean} isDev - 是否为开发环境
 * @returns {TabManager}
 */
function getTabManager(mainWindow, isDev) {
  if (!tabManagerInstance) {
    tabManagerInstance = new TabManager(mainWindow, isDev)
  }
  return tabManagerInstance
}

/**
 * 重置标签页管理器实例（用于测试或重新初始化）
 */
function resetTabManager() {
  if (tabManagerInstance) {
    tabManagerInstance.destroy()
    tabManagerInstance = null
  }
}

module.exports = {
  getTabManager,
  resetTabManager
}
