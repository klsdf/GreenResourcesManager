<template>
  <div id="app">
    <!-- 应用缩放提示（菜单/快捷键改变整体缩放时显示） -->
    <div v-if="appZoomHintVisible" class="app-zoom-hint" role="status" aria-live="polite">
      缩放至 {{ appZoomHintPercent }}%
    </div>

    <!-- 加载中提示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <h2>Butter Manager</h2>
        <FunLoading text="正在初始化应用..." />
      </div>
    </div>

    <!-- 标签栏 - 始终显示，覆盖在侧边栏上方 -->
    <TabBar @tabs-changed="onTabsChanged" v-show="!isLoading" />

    <!-- 左侧导航栏 - 只在活动标签页是主页时显示 -->
    <nav class="sidebar" v-show="!isLoading && activeTabIsHome" :class="{ 'sidebar-narrow': sidebarWidth < 200 }" :style="sidebarStyle">
      <div class="sidebar-header">
        <img 
          :src="logoIcon" 
          alt="Butter Manager" 
          class="sidebar-logo"
          @click="onLogoClick"
        >
        <h1>{{ customAppTitle || '绿色资源管理器' }}</h1>
        <p>{{ customAppSubtitle || '绿色、全能的资源管理器' }}</p>
        <p class="version">v{{ version }}</p>
      </div>

      <ul class="nav-menu">
        <!-- 主页（可展开/折叠） -->
        <li class="nav-item-wrapper">
          <div 
            class="nav-item" 
            :class="{ active: $route.name === 'home' || isResourcePageActive }"
          >
            <div class="nav-item-content" @click="navigateTo('home')">
              <span class="nav-icon">{{ viewConfig.home?.icon || '🏠' }}</span>
              <span class="nav-text">{{ viewConfig.home?.name || '主页' }}</span>
            </div>
            <span 
              class="nav-arrow" 
              :class="{ expanded: isHomeMenuExpanded }"
              @click.stop="toggleHomeMenu"
            >
              ▶
            </span>
          </div>
          <!-- 资源页面子菜单 -->
          <ul class="nav-submenu" :class="{ expanded: isHomeMenuExpanded }">
            <li 
              v-for="page in resourcePages" 
              :key="page.id"
              class="nav-submenu-item"
            >
              <div 
                class="nav-item nav-item-child"
                :class="{ active: $route.name === page.id }"
                @click="navigateTo(page.id)"
              >
                <span class="nav-icon">{{ page.icon }}</span>
                <span class="nav-text">{{ page.name }}</span>
              </div>
            </li>
          </ul>
        </li>
        
        <!-- 搜索（一级菜单） -->
        <li 
          class="nav-item-wrapper"
          :class="{ active: $route.name === 'search' }"
        >
          <div 
            class="nav-item"
            :class="{ active: $route.name === 'search' }"
            @click="navigateTo('search')"
          >
            <span class="nav-icon">{{ viewConfig.search?.icon || '🔍' }}</span>
            <span class="nav-text">{{ viewConfig.search?.name || '搜索' }}</span>
          </div>
        </li>

        <!-- 本地存档（一级菜单） -->
        <li 
          class="nav-item-wrapper"
          :class="{ active: $route.name === 'database' }"
        >
          <div 
            class="nav-item"
            :class="{ active: $route.name === 'database' }"
            @click="navigateTo('database')"
          >
            <span class="nav-icon">{{ viewConfig.database?.icon || '🗄️' }}</span>
            <span class="nav-text">{{ viewConfig.database?.name || '本地存档' }}</span>
          </div>
        </li>

        <!-- 本地刮削库（一级菜单） -->
        <li 
          class="nav-item-wrapper"
          :class="{ active: $route.name === 'scraper-library' }"
        >
          <div 
            class="nav-item"
            :class="{ active: $route.name === 'scraper-library' }"
            @click="navigateTo('scraper-library')"
          >
            <span class="nav-icon">{{ viewConfig['scraper-library']?.icon || '📚' }}</span>
            <span class="nav-text">{{ viewConfig['scraper-library']?.name || '本地刮削库' }}</span>
          </div>
        </li>
        
        <!-- 插件注册的导航项 -->
        <li 
          v-for="navItem in pluginNavigationItems" 
          :key="navItem.id"
          class="nav-item-wrapper"
        >
          <div 
            class="nav-item"
            @click="handlePluginNavigation(navItem)"
          >
            <span class="nav-icon">{{ navItem.icon }}</span>
            <span class="nav-text">{{ navItem.name }}</span>
          </div>
        </li>
      </ul>

      <!-- 底部按钮 -->
      <div class="nav-footer">
        <div v-for="viewId in footerViews" :key="viewId" 
          :class="['nav-item', `${viewId}-item`, { active: $route.name === viewId }]" 
          @click="navigateTo(viewId)">
          <span class="nav-icon">{{ viewConfig[viewId]?.icon || '' }}</span>
          <span class="nav-text">{{ viewConfig[viewId]?.name || '' }}</span>
        </div>
      </div>
    </nav>

    <!-- 侧边栏拖拽条 - 只在显示侧边栏时出现 -->
    <div
      v-show="!isLoading && activeTabIsHome"
      class="sidebar-resizer"
      :style="{ left: sidebarWidth + 'px' }"
      @mousedown.prevent="startSidebarResize"
    />

    <!-- 主内容区域 -->
    <main class="main-content" :class="{ 'with-tabs': hasTabs && !activeTabIsHome }" :style="mainContentStyle" v-show="!isLoading">

      <!-- 主页内容 - 只在活动标签页是主页时显示 -->
      <template v-if="activeTabIsHome">
        <!-- 标题和简介 -->
        <header class="content-header">
          <h2>{{ getCurrentViewTitle() }}</h2>
          <p>{{ getCurrentViewDescription() }}</p>
        </header>

        <div class="content-body" :class="{ 'with-filter': showFilterSidebar }">
          <!-- 筛选器侧边栏 - 只在需要筛选的页面显示 -->
          <div v-if="showFilterSidebar" class="filter-sidebar-container">
            <FilterSidebar 
              :filters="currentFilterData.filters" 
              :isLoading="isFilterSidebarLoading"
              @filter-select="onFilterSelect"
              @filter-exclude="onFilterExclude" 
              @filter-clear="onFilterClear" 
            />
          </div>

          <!-- 页面内容区域 -->
          <div class="page-content" :class="{ 'has-background': backgroundImageUrl }" :style="pageContentStyle">
          <!-- 插件视图 -->
          <div v-if="pluginView.visible" class="plugin-view-container">
            <div class="plugin-view-header">
              <h3>{{ pluginView.title }}</h3>
              <button class="plugin-view-close" @click="closePluginView">✕</button>
            </div>
            <div class="plugin-view-body" ref="pluginViewBody" v-html="pluginView.content"></div>
          </div>
          <!-- 正常路由视图 -->
          <router-view 
            v-else
            ref="routerView"
            @filter-data-updated="updateFilterData"
            @navigate="navigateTo"
            @theme-changed="onThemeChanged"
          />
          </div>
        </div>
      </template>
      
      <!-- 全局音频播放器 -->
      <GlobalAudioPlayer @audio-started="onAudioStarted" @playlist-ended="onPlaylistEnded" />
    </main>

    <!-- 全局通知组件 -->
    <fun-notification ref="toastNotification" />

    <!-- 全局 Alert 组件 -->
    <fun-alert ref="alert" />

    <!-- 全局 Confirm 组件 -->
    <fun-confirm-dialog ref="confirm" default-cancel="true" />

    <!-- 启动时版本更新弹窗（显示全部更新内容 + 开发者配置的注意事项） -->
    <FunModal
      v-model="showVersionModal"
      title="更新说明"
      :max-width="'560px'"
    >
      <div class="version-modal-body">
        <ChangelogEntryCard
          v-for="(entry, idx) in changelogEntries"
          :key="idx"
          :entry="entry"
          :highlight-as-latest="idx === 0"
        />
      </div>
      <template #footer>
        <button type="button" class="btn-confirm" @click="onVersionModalClose">知道了</button>
      </template>
    </FunModal>
  </div>
</template>

<script lang="ts">
import GlobalAudioPlayer from './components/GlobalAudioPlayer.vue'
import FilterSidebar from './components/FilterSidebar.vue'
import TabBar from './components/TabBar.vue'
import FunLoading from './fun-ui/feedback/Loading/FunLoading.vue'
import FunModal from './fun-ui/feedback/Modal/FunModal.vue'
import ChangelogEntryCard from './components/ChangelogEntryCard.vue'
import { changelogEntries } from './data/changelog'
import { updateDynamicRoutes } from './router/index'


import notificationService from './utils/NotificationService.ts'
import alertService from './utils/AlertService.ts'
import confirmService from './utils/ConfirmService.ts'

import saveManager from './utils/SaveManager.ts'
// ✨ 使用新的配置管理器（基于配置文件，无需存档）
import pageConfigManager from './utils/PageConfigManager.ts'
import pluginManager from './utils/PluginManager.ts'
import pluginNavigationManager from './utils/PluginNavigationManager.ts'
import { unlockAchievement } from './pages/user/AchievementView.vue'


export default {
  name: 'App',
  components: {
    GlobalAudioPlayer,
    FilterSidebar,
    TabBar,
    FunLoading,
    FunModal,
    ChangelogEntryCard
  },
  data() {
    return {
      theme: 'light',
      version: '0.0.0',
      isLoading: true, // 应用加载状态
      showVersionModal: false, // 启动时版本更新弹窗
      changelogEntries, // 全部更新记录（来自 data/changelog）
      isInitialized: false, // 存档系统是否已初始化
      isLogoClicked: false, // logo 是否被点击过
      // 筛选器相关数据
      showFilterSidebar: false,
      isFilterSidebarLoading: false,
      currentFilterData: {
        filters: []
      },
      // 全局游戏运行状态管理
      runningGames: new Map(), // 存储正在运行的游戏信息 {gameId: {id, pid, windowTitles: string[], gameName, startTime}}
      statusCheckInterval: null, // 定期检查运行状态的定时器
      playtimeUpdateInterval: null, // 定期更新游戏时长的定时器（每1秒）
      playtimeSaveInterval: null, // 定期保存游戏时长的定时器（每1分钟）
      // 保存队列管理
      saveQueue: [], // 保存任务队列
      isProcessingSaveQueue: false, // 是否正在处理保存队列
      // 应用使用时长跟踪
      appSessionStartTime: null, // 应用会话开始时间
      appUsageTimer: null, // 应用使用时长定时器
      // 文件丢失检测控制
      hasCheckedFileLoss: false, // 是否已经检测过文件丢失（应用启动时检测一次）
      // WinRAR 检测相关
      winRARInstalled: false,
      winRARPath: null as string | null,
      winRARExecutable: null as string | null,
      // 安全键相关
      safetyKeyEnabled: false,
      safetyKeyUrl: '',
      // 应用缩放提示（菜单放大/缩小/实际大小时顶部中央短暂显示）
      appZoomHintVisible: false,
      appZoomHintPercent: 100,
      appZoomHintTimer: null,
      removeAppZoomChanged: null,
      // 自动备份相关
      autoBackupInterval: 0, // 自动备份时间间隔（分钟），0表示禁用
      autoBackupTimer: null, // 自动备份定时器
      lastBackupTime: null, // 上次备份时间
      // 个性化设置
      customAppTitle: '', // 自定义软件标题
      customAppSubtitle: '', // 自定义软件副标题
      // 背景图片相关
      backgroundImagePath: '', // 背景图片路径
      backgroundImageUrl: '', // 背景图片URL（用于显示）
      // 统一的页面配置
      pages: [], // 动态页面配置
      isHomeMenuExpanded: true, // 主页菜单是否展开（默认展开）
      // 插件导航项
      pluginNavigationItems: [], // 插件注册的导航项
      handlePluginNavigationUpdate: null as (() => void) | null, // 插件导航项更新事件处理器
      // 插件视图
      pluginView: {
        visible: false,
        title: '',
        content: '',
        onMount: null as ((container: HTMLElement) => void) | null
      },
      viewConfig: {
        // 固定页面
        home: {
          name: '主页',
          icon: '🏠',
          description: '欢迎页面，快速访问各个功能模块'
        },
        search: {
          name: '搜索',
          icon: '🔍',
          description: '在所有资源中搜索内容'
        },
        debug: {
          name: 'Debug',
          icon: '🐛',
          description: '用于各种调试和测试'
        },
        database: {
          name: '本地存档',
          icon: '🗄️',
          description: '展示存档的数据'
        },
        'scraper-library': {
          name: '本地刮削库',
          icon: '📚',
          description: '本地刮削库（暂未开放）'
        },
        workshop: {
          name: '创意工坊',
          icon: '🎨',
          description: '分享和发现社区创作内容'
        },
        users: {
          name: '用户',
          icon: '👤',
          description: '记录您的个人数据已经本软件的各种数据'
        },
        messages: {
          name: '信息中心',
          icon: '📢',
          description: '查看系统通知和操作历史'
        },
        help: {
          name: '帮助',
          icon: '❓',
          description: '了解应用功能和使用方法'
        },
        changelog: {
          name: '更新记录',
          icon: '📋',
          description: '版本更新与功能变更记录'
        },
        sponsor: {
          name: '赞助产品',
          icon: '❤️',
          description: '支持项目持续开发'
        },
        settings: {
          name: '设置',
          icon: '⚙️',
          description: '管理应用设置和偏好'
        },
        // 合集页面（暂时注释）
        collections: {
          name: '合集',
          icon: '🗂️',
          description: '管理你的合集'
        }
      },
      navItems: [],
      // 标签页相关
      hasTabs: false, // 是否有标签页（不包括主页标签）
      activeTabIsHome: true, // 当前活动标签页是否是主页
      // 侧边栏可拖拽宽度
      sidebarWidth: 280,
      isSidebarResizing: false,
      sidebarResizeStartX: 0,
      sidebarResizeStartWidth: 0
    }
  },
  computed: {
    sidebarStyle(): Record<string, string> {
      if (this.isLoading || !this.activeTabIsHome) return {}
      return { width: this.sidebarWidth + 'px', minWidth: this.sidebarWidth + 'px' }
    },
    mainContentStyle(): Record<string, string> {
      if (!this.activeTabIsHome) return {}
      return { marginLeft: this.sidebarWidth + 'px' }
    },
    currentPageConfig() {
      // 从路由 meta 中获取页面配置
      const route = this.$route
      if (route.meta?.pageConfig) {
        return route.meta.pageConfig
      }
      // 兼容旧逻辑：从 pages 中查找
      return this.pages.find(p => p.id === route.name && !p.isHidden)
    },
    // 主导航页面ID列表（一级菜单）
    mainNavViewIds() {
      // 主页、搜索、本地存档、本地刮削库是一级菜单，资源页面是主页的子菜单
      return ['home', 'search', 'database', 'scraper-library']
    },
    // 资源页面列表（主页的子菜单）
    resourcePages() {
      return this.pages.filter(p => !p.isHidden)
    },
    // 检查当前是否在资源页面（用于高亮主页）
    isResourcePageActive() {
      return this.resourcePages.some(page => this.$route.name === page.id)
    },
    // 底部导航页面ID列表
    footerViews() {
      return ['workshop', 'users', 'messages', 'help', 'changelog', 'sponsor', 'settings']
    },
    // 根据点击状态返回对应的 logo 图标
    logoIcon() {
      return this.isLogoClicked ? './hide-icon.png' : './butter-icon.png'
    },
    // 页面内容区域的样式（包含背景图片）
    pageContentStyle() {
      const style: any = {}
      if (this.backgroundImageUrl) {
        style['--bg-image-url'] = `url(${this.backgroundImageUrl})`
      }
      return style
    },
  },
  methods: {
    startSidebarResize(e: MouseEvent) {
      this.isSidebarResizing = true
      this.sidebarResizeStartX = e.clientX
      this.sidebarResizeStartWidth = this.sidebarWidth
      document.addEventListener('mousemove', this.onSidebarResizeMove)
      document.addEventListener('mouseup', this.onSidebarResizeEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    onSidebarResizeMove(e: MouseEvent) {
      if (!this.isSidebarResizing) return
      const delta = e.clientX - this.sidebarResizeStartX
      let w = this.sidebarResizeStartWidth + delta
      w = Math.max(100, Math.min(480, w))
      this.sidebarWidth = w
      this.sidebarResizeStartX = e.clientX
      this.sidebarResizeStartWidth = w
    },
    onSidebarResizeEnd() {
      this.isSidebarResizing = false
      document.removeEventListener('mousemove', this.onSidebarResizeMove)
      document.removeEventListener('mouseup', this.onSidebarResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    },
    // 点击 logo 的处理方法
    onLogoClick() {
      // 播放解锁音效
      this.playUnlockSound()
      // 切换图标
      this.isLogoClicked = true



      unlockAchievement('serect_click')
    },
    // 播放解锁音效
    playUnlockSound() {
      try {
        const audio = new Audio('./unlock.mp3')
        audio.play().catch(error => {
          console.warn('播放解锁音效失败:', error)
        })
      } catch (error) {
        console.warn('创建音频对象失败:', error)
      }
    },
    // 检查是否应该进行文件丢失检测
    shouldCheckFileLoss() {
      return !this.hasCheckedFileLoss
    },
    
    // 标记文件丢失检测已完成
    markFileLossChecked() {
      this.hasCheckedFileLoss = true
    },
    
    async checkFirstLoginAchievement() {
         await unlockAchievement('first_login')

    },
    
    // 打印磁盘信息（后台异步执行，不阻塞）
    async printDiskInfo() {
      try {
        // 延迟执行，确保应用已经启动完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const drives = ['C:', 'D:', 'E:', 'F:', 'G:']
        
        console.log('=== 开始获取磁盘信息（后台执行） ===')
        
        // 并行获取所有磁盘信息，提高速度
        const diskInfoPromises = drives.map(async (drive) => {
          try {
            if (window.electronAPI && window.electronAPI.getDiskTypeByPath) {
              // 确保路径格式正确（盘符后面加反斜杠）
              const drivePath = drive.endsWith(':') ? drive + '\\' : drive + ':\\'
              const result = await window.electronAPI.getDiskTypeByPath(drivePath)
              
              if (result.success) {
                console.log(`\n📀 ${drive} 盘信息:`)
                console.log(`  磁盘名称: ${result.friendlyName}`)
                console.log(`  磁盘类型: ${result.mediaType}`) // SSD 或 HDD
                console.log(`  设备ID: ${result.deviceId}`)
                console.log(`  磁盘大小: ${result.sizeGB} GB`)
                console.log(`  总线类型: ${result.busType}`)
              } else {
                console.log(`\n❌ ${drive} 盘: 无法获取信息 - ${result.error}`)
              }
            }
          } catch (error) {
            console.error(`获取 ${drive} 盘信息时出错:`, error)
          }
        })
        
        // 等待所有磁盘信息获取完成（但不阻塞主流程）
        await Promise.allSettled(diskInfoPromises)
        
        console.log('\n=== 磁盘信息获取完成 ===\n')
      } catch (error) {
        console.error('获取磁盘信息时出错:', error)
      }
    },

    // 预热资源页面
    prefetchResourceViews() {
      const run = () => {
        const loaders: Array<() => Promise<any>> = [
          () => import('./components/ResourceView.vue')
        ]

        for (const loader of loaders) {
          try {
            loader().catch(() => {})
          } catch (_) {
            // ignore
          }
        }
      }

      const w = window as any
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(run, { timeout: 2000 })
      } else {
        setTimeout(run, 0)
      }
    },

    // 重新加载自定义页面配置并刷新导航（用于"页面管理"修改后即时生效）
    // ✨ 新版：使用 PageConfigManager（异步操作，需要 async/await）
    async reloadCustomPages() {
      try {
        // 从配置文件读取页面列表（需要 await）
        this.pages = await pageConfigManager.getPages()

        // 更新 viewConfig
        this.pages.forEach(page => {
          this.viewConfig[page.id] = {
            name: page.name,
            icon: page.icon,
            description: page.description || `${page.name}管理页面`
          }
        })

        // 导航项现在通过模板直接渲染，不需要在这里设置
        // 但保留这个逻辑以防其他地方使用
        this.navItems = this.mainNavViewIds.map(viewId => ({
          id: viewId,
          name: this.viewConfig[viewId]?.name || viewId,
          icon: this.viewConfig[viewId]?.icon || '📄',
          description: this.viewConfig[viewId]?.description || ''
        }))

        // 更新动态路由
        if (this.$router) {
          await updateDynamicRoutes(this.$router)
        }

        // 当前页面如果变为隐藏/已删除（仅资源视图会有 pageConfig）则回退
        const currentRouteName = this.$route.name as string
        if (this.mainNavViewIds.includes(currentRouteName) && currentRouteName !== 'home' && !this.currentPageConfig) {
          const firstVisible = this.pages.find(p => !p.isHidden)?.id
          if (firstVisible) {
            this.$router.push({ name: firstVisible })
          } else {
            this.$router.push({ name: 'home' })
          }
        }
      } catch (e) {
        console.error('重新加载自定义页面失败:', e)
      }
    },
    
    navigateTo(viewId: string) {
      this.$router.push({ name: viewId }).catch(err => {
        // 忽略重复导航错误
        if (err.name !== 'NavigationDuplicated') {
          console.error('导航失败:', err)
          // 如果路由不存在，跳转到主页
          this.$router.push({ name: 'home' })
        }
      })
    },
    // 处理插件导航项点击
    handlePluginNavigation(navItem: any) {
      try {
        if (navItem.onClick && typeof navItem.onClick === 'function') {
          navItem.onClick()
        }
      } catch (error) {
        console.error(`执行插件导航项 ${navItem.id} 的 onClick 失败:`, error)
      }
    },
    // 更新插件导航项列表
    updatePluginNavigationItems() {
      this.pluginNavigationItems = pluginNavigationManager.getNavigationItems()
    },
    // 显示插件视图
    showPluginView(config: { title: string; content: string; onMount?: (container: HTMLElement) => void }) {
      this.pluginView.visible = true
      this.pluginView.title = config.title
      this.pluginView.content = config.content
      this.pluginView.onMount = config.onMount || null
      
      // 在下一个tick执行onMount回调
      this.$nextTick(() => {
        const bodyElement = this.$refs.pluginViewBody as HTMLElement
        if (bodyElement && this.pluginView.onMount) {
          try {
            this.pluginView.onMount(bodyElement)
          } catch (error) {
            console.error('执行插件视图 onMount 回调失败:', error)
          }
        }
      })
    },
    // 关闭插件视图
    closePluginView() {
      this.pluginView.visible = false
      this.pluginView.title = ''
      this.pluginView.content = ''
      this.pluginView.onMount = null
    },
    // 关闭更新说明弹窗并写入 hasShowUpdateDialog
    async onVersionModalClose() {
      this.showVersionModal = false
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          settings.hasShowUpdateDialog = true
          await saveManager.saveSettings(settings)
        }
      } catch (error) {
        console.warn('保存 hasShowUpdateDialog 失败:', error)
      }
    },
    // 切换主页菜单展开/折叠
    toggleHomeMenu() {
      this.isHomeMenuExpanded = !this.isHomeMenuExpanded
    },
    // switchView(viewId: string) {
    //   // 兼容旧代码，重定向到 navigateTo
    //   this.navigateTo(viewId)
    // },
    resetFilterData() {
      this.currentFilterData = {
        filters: []
      }
    },
    updateFilterData(filterData) {
      this.currentFilterData = { ...this.currentFilterData, ...filterData }
      // 数据更新后取消加载状态
      this.isFilterSidebarLoading = false
    },
    onFilterSelect({ filterKey, itemName }) {
      console.log('App.vue onFilterSelect:', filterKey, itemName)
      // 通过全局事件发送筛选器事件
      window.dispatchEvent(new CustomEvent('filter-select', {
        detail: { filterKey, itemName }
      }))
    },
    onFilterExclude({ filterKey, itemName }) {
      console.log('App.vue onFilterExclude:', filterKey, itemName)
      // 通过全局事件发送筛选器事件
      window.dispatchEvent(new CustomEvent('filter-exclude', {
        detail: { filterKey, itemName }
      }))
    },
    onFilterClear(filterKey) {
      console.log('App.vue onFilterClear:', filterKey)
      // 通过全局事件发送筛选器事件
      window.dispatchEvent(new CustomEvent('filter-clear', {
        detail: filterKey
      }))
    },
    // 全局游戏运行状态管理方法
    addRunningGame(gameInfo) {
      // gameInfo: { id: string, pid: number, windowTitles?: string[], gameName?: string }
      const runtimeGameData = {
        id: gameInfo.id,
        pid: gameInfo.pid,
        windowTitles: gameInfo.windowTitles || [],
        gameName: gameInfo.gameName || null,
        startTime: Date.now()
      }
      this.runningGames.set(gameInfo.id, runtimeGameData)
      console.log('全局添加运行游戏:', runtimeGameData, '当前运行游戏:', Array.from(this.runningGames.keys()))
    },
    removeRunningGame(gameId) {
      console.log(`[DEBUG] 🗑️ removeRunningGame 被调用，gameId: ${gameId}`)
      const runtimeGameData = this.runningGames.get(gameId)
      if (runtimeGameData) {
        // 计算本次会话的游戏时长
        const sessionDuration = Math.floor((Date.now() - runtimeGameData.startTime) / 1000) // 转换为秒
        console.log(`[DEBUG] ⏱️ 游戏 ${gameId} 本次会话时长: ${sessionDuration} 秒`, '游戏信息:', runtimeGameData)
        
        // 通知游戏视图（GenericResourceView）更新游戏时长，游戏结束时需要保存
        console.log(`[DEBUG] 💾 调用 updateGamePlayTime，gameId: ${gameId}, sessionDuration: ${sessionDuration}, shouldSave: true`)
        this.updateGamePlayTime(gameId, sessionDuration, true)
      } else {
        console.log(`[DEBUG] ⚠️ removeRunningGame: 未找到 gameId ${gameId} 的运行数据`)
      }
      
      this.runningGames.delete(gameId)
      console.log(`[DEBUG] ✅ 已从 runningGames 中移除 gameId: ${gameId}，当前运行游戏:`, Array.from(this.runningGames.keys()))
    },
    isGameRunning(gameId) {
      return this.runningGames.has(gameId)
    },
    // 获取当前游戏页视图（GenericResourceView，与 GameView 兼容的 games/saveGames 接口）
    getGameView() {
      if (this.$route?.name !== 'games') return null
      const rv = this.$refs.routerView
      return rv?.$refs?.innerView || null
    },
    // 更新游戏时长（只更新内存，不立即保存）
    updateGamePlayTime(gameId, sessionDuration, shouldSave = false) {
      const gameView = this.getGameView()
      if (!gameView || !gameView.games) {
        console.log('游戏视图不可用，无法更新游戏时长')
        return
      }
      
      const game = gameView.games.find(g => (g.id?.value ?? g.id) === gameId)
      if (game) {
        // 累加游戏时长（兼容 ResourceField：可能是 .value 或直接值）
        const prev = (game.playTime?.value ?? game.playTime) || 0
        const next = prev + sessionDuration
        if (game.playTime && typeof game.playTime === 'object' && 'value' in game.playTime) {
          game.playTime.value = next
        } else {
          game.playTime = next
        }
        
        // 只有在 shouldSave 为 true 时才保存（游戏结束时）
        if (shouldSave) {
          this.saveGamesSafely(gameView)
          const name = game.name?.value ?? game.name
          console.log(`游戏 ${name} 总时长更新为: ${next} 秒 (本次增加: ${sessionDuration} 秒)，已保存`)
        } else {
          // console.log(`游戏 ${game.name} 总时长更新为: ${game.playTime} 秒 (本次增加: ${sessionDuration} 秒)，暂存内存`)
        }
      } else {
        console.warn('未找到对应的游戏:', gameId)
      }
    },
    // 安全保存游戏数据（使用队列机制，防止并发写入）
    async saveGamesSafely(gameView) {
      // 将保存任务添加到队列
      return new Promise((resolve, reject) => {
        const saveTask = {
          gameView,
          resolve,
          reject,
          timestamp: Date.now()
        }
        
        this.saveQueue.push(saveTask)
        console.log(`📝 保存任务已加入队列，当前队列长度: ${this.saveQueue.length}`)
        
        // 如果队列处理程序没有运行，启动它
        if (!this.isProcessingSaveQueue) {
          this.processSaveQueue()
        }
      })
    },
    // 处理保存队列（按顺序执行保存任务）
    async processSaveQueue() {
      if (this.isProcessingSaveQueue) {
        return // 已经在处理中，避免重复启动
      }
      
      this.isProcessingSaveQueue = true
      console.log('🔄 开始处理保存队列')
      
      while (this.saveQueue.length > 0) {
        const task = this.saveQueue.shift() // 从队列头部取出任务
        
        if (!task || !task.gameView) {
          console.warn('⚠️ 无效的保存任务，跳过')
          if (task && task.reject) {
            task.reject(new Error('无效的保存任务'))
          }
          continue
        }
        
        try {
          console.log(`💾 执行保存任务 (队列剩余: ${this.saveQueue.length})`)
          
          if (typeof task.gameView.saveGames === 'function') {
            await task.gameView.saveGames()
            console.log('✅ 保存任务完成')
            
            if (task.resolve) {
              task.resolve()
            }
          } else {
            throw new Error('gameView.saveGames 方法不可用')
          }
        } catch (error) {
          console.error('❌ 保存任务失败:', error)
          
          if (task.reject) {
            task.reject(error)
          }
        }
        
        // 任务之间稍作延迟，避免过于频繁的写入
        if (this.saveQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      this.isProcessingSaveQueue = false
      console.log('✅ 保存队列处理完成')
    },
    // 更新运行游戏的窗口标题列表
    async updateRunningGamesWindowTitles() {
      if (!window.electronAPI || !window.electronAPI.getAllWindowTitlesByPID) {
        console.log('无法更新窗口标题：Electron API 不可用')
        return
      }
      
      const runningGamesToUpdate: Array<[string, any]> = Array.from(this.runningGames.entries())
      
      for (const [gameId, runtimeGameData] of runningGamesToUpdate) {
        try {
          // 获取进程的所有窗口标题
          const result = await window.electronAPI.getAllWindowTitlesByPID(runtimeGameData.pid)
          
          if (result.success && result.windowTitles && result.windowTitles.length > 0) {
            // 检查是否有新的窗口标题
            const oldTitles = runtimeGameData.windowTitles || []
            const newTitles = result.windowTitles.filter(title => title && title.trim())
            
            // 合并去重，保留所有窗口标题
            const allTitles = [...new Set([...oldTitles, ...newTitles])]
            
            // 如果有新增的窗口标题，更新数据
            if (allTitles.length !== oldTitles.length || 
                allTitles.some(title => !oldTitles.includes(title))) {
              runtimeGameData.windowTitles = allTitles
              console.log(`✅ 更新游戏 ${runtimeGameData.gameName || gameId} 的窗口标题列表:`, allTitles)
            }
          }
        } catch (error) {
          console.warn(`更新游戏 ${runtimeGameData.gameName || gameId} 窗口标题失败:`, error.message)
          // 出错时不影响其他游戏，继续处理
        }
      }
    },
    // 检查所有游戏的运行状态
    async checkAllGamesRunningStatus() {
      if (!window.electronAPI || !window.electronAPI.getAllWindowTitlesByPID) {
        console.log('无法检查游戏运行状态：Electron API 不可用')
        return
      }
      
      const gameView = this.getGameView()
      if (!gameView || !gameView.games) {
        console.log('游戏视图不可用，跳过状态检查')
        return
      }
      
      console.log(`[DEBUG] 🔍 开始检查所有游戏的运行状态，当前运行游戏数量: ${this.runningGames.size}`)
      const runningGamesToCheck: Array<[string, any]> = Array.from(this.runningGames.entries())
      console.log(`[DEBUG] 📋 待检查的游戏列表:`, runningGamesToCheck.map(([id, data]) => ({ id, pid: data.pid, gameName: data.gameName })))
      
      for (const [gameId, runtimeGameData] of runningGamesToCheck) {
        const game = gameView.games.find(g => (g.id?.value ?? g.id) === gameId)
        if (!game) {
          // 游戏不存在，从运行列表中移除
          this.runningGames.delete(gameId)
          console.log(`游戏 ${gameId} 不存在，从运行列表中移除`)
          continue
        }
        
        const gameName = game.name?.value ?? game.name
        try {
          // 通过 PID 检查游戏进程是否还在运行（尝试获取窗口标题，如果失败说明进程已结束）
          console.log(`[DEBUG] 🔍 检查游戏 ${gameName} (ID: ${gameId}, PID: ${runtimeGameData.pid}) 的运行状态...`)
          const result = await window.electronAPI.getAllWindowTitlesByPID(runtimeGameData.pid)
          console.log(`[DEBUG] 📋 getAllWindowTitlesByPID 结果:`, { success: result.success, windowTitles: result.windowTitles, error: result.error })
          
          if (!result.success) {
            // 无法获取窗口标题，可能是进程已结束
            // 如果之前有窗口标题但现在获取不到，可能是进程结束了
            console.log(`[DEBUG] ⚠️ 无法获取窗口标题，之前记录的窗口标题:`, runtimeGameData.windowTitles)
            if (runtimeGameData.windowTitles && runtimeGameData.windowTitles.length > 0) {
              // 之前有窗口，现在获取不到，可能是进程结束了
              console.log(`[DEBUG] 🔴 游戏 ${gameName} 进程已结束（之前有窗口但现在获取不到），从运行列表中移除`)
              this.removeRunningGame(gameId)
            } else {
              console.log(`[DEBUG] ⚠️ 游戏 ${gameName} 之前没有窗口标题，无法判断进程是否结束，保留运行状态`)
            }
          } else {
            console.log(`[DEBUG] ✅ 游戏 ${gameName} 进程仍在运行，窗口标题:`, result.windowTitles)
          }
        } catch (error) {
          console.error(`[DEBUG] ❌ 检查游戏 ${gameName} 运行状态失败:`, error)
          // 出错时保守处理，保留运行状态
        }
      }
      
      console.log('游戏运行状态检查完成，正在运行的游戏:', Array.from(this.runningGames.keys()))
    },
    // 启动定期检查运行状态
    startPeriodicStatusCheck() {
      // 每30秒检查一次运行状态
      this.statusCheckInterval = setInterval(async () => {
        if (this.runningGames.size > 0) {
          console.log('定期检查游戏运行状态...')
          await this.checkAllGamesRunningStatus()
          // 同时更新窗口标题列表（检测新创建的窗口）
          await this.updateRunningGamesWindowTitles()
        }
      }, 3000) // 3秒
    },
    // 启动定期更新游戏时长
    startPeriodicPlaytimeUpdate() {
      // 每1秒更新一次游戏时长（只更新内存）
      this.playtimeUpdateInterval = setInterval(() => {
        if (this.runningGames.size > 0) {
          this.updateRunningGamesPlaytime()
        }
      }, 1000) // 1秒
      
      // 每1分钟保存一次游戏时长
      this.playtimeSaveInterval = setInterval(() => {
        if (this.runningGames.size > 0) {
          this.saveRunningGamesPlaytime()
        }
      }, 60000) // 60秒 = 1分钟
    },
    // 更新正在运行游戏的时长（只更新内存，不保存）
    updateRunningGamesPlaytime() {
      const now = Date.now()
      
      for (const [gameId, runtimeGameData] of this.runningGames) {
        if (runtimeGameData.startTime) {
          const sessionDuration = Math.floor((now - runtimeGameData.startTime) / 1000)
          
          // 更新会话开始时间（重置计时器）
          runtimeGameData.startTime = now
          
          // 更新游戏时长（不保存，只更新内存）
          this.updateGamePlayTime(gameId, sessionDuration, false)
        }
      }
    },
    // 保存正在运行游戏的时长（每1分钟执行一次）
    async saveRunningGamesPlaytime() {
      const gameView = this.getGameView()
      if (!gameView || !gameView.games) {
        console.log('游戏视图不可用，无法保存游戏时长')
        return
      }
      
      // 检查是否有正在运行的游戏需要保存
      let hasRunningGames = false
      for (const [gameId] of this.runningGames) {
        const game = gameView.games.find(g => (g.id?.value ?? g.id) === gameId)
        if (game) {
          hasRunningGames = true
          break
        }
      }
      
      if (hasRunningGames) {
        try {
          await this.saveGamesSafely(gameView)
          console.log('✅ 定期保存游戏时长完成（每1分钟）')
        } catch (error) {
          console.error('定期保存游戏时长失败:', error)
        }
      }
    },
    // 停止定期检查
    stopPeriodicStatusCheck() {
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval)
        this.statusCheckInterval = null
        console.log('已停止定期检查游戏运行状态')
      }
    },
    // 停止定期更新游戏时长
    stopPeriodicPlaytimeUpdate() {
      if (this.playtimeUpdateInterval) {
        clearInterval(this.playtimeUpdateInterval)
        this.playtimeUpdateInterval = null
        console.log('已停止定期更新游戏时长')
      }
      if (this.playtimeSaveInterval) {
        clearInterval(this.playtimeSaveInterval)
        this.playtimeSaveInterval = null
        console.log('已停止定期保存游戏时长')
      }
    },
    // 开始应用使用时长跟踪
    async startAppUsageTracking() {
      try {
        await saveManager.startUsageTracking()
        this.appSessionStartTime = new Date()
        console.log('应用使用时长跟踪已开始')
      } catch (error) {
        console.error('开始应用使用时长跟踪失败:', error)
      }
    },
    // 停止应用使用时长跟踪
    async stopAppUsageTracking() {
      try {
        await saveManager.endUsageTracking()
        this.appSessionStartTime = null
        console.log('应用使用时长跟踪已停止')
      } catch (error) {
        console.error('停止应用使用时长跟踪失败:', error)
      }
    },
    getCurrentViewTitle() {
      const route = this.$route
      if (route.meta?.title) {
        return route.meta.title as string
      }
      const config = this.viewConfig[route.name as string]
      return config?.name || '未知页面'
    },
    getCurrentViewDescription() {
      const route = this.$route
      if (route.meta?.description) {
        return route.meta.description as string
      }
      const config = this.viewConfig[route.name as string]
      return config?.description || '无描述'
    },
    async applyBackgroundImage(imagePath: string) {
      try {
        this.backgroundImagePath = imagePath
        // 使用 readFileAsDataUrl 或 getFileUrl 获取图片URL
        if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          const dataUrl = await window.electronAPI.readFileAsDataUrl(imagePath)
          if (dataUrl) {
            this.backgroundImageUrl = dataUrl
            console.log('背景图片已应用:', imagePath)
            return
          }
        }
        // 降级到 getFileUrl
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          const result = await window.electronAPI.getFileUrl(imagePath)
          if (result && result.success && result.url) {
            this.backgroundImageUrl = result.url
            console.log('背景图片已应用（通过getFileUrl）:', imagePath)
            return
          }
        }
        // 如果都失败了，尝试直接使用路径（可能不工作，但至少不会报错）
        console.warn('无法获取背景图片URL，尝试使用原始路径:', imagePath)
        this.backgroundImageUrl = imagePath
      } catch (error) {
        console.error('应用背景图片失败:', error)
        this.backgroundImageUrl = ''
      }
    },
    
    applyTheme(theme) {
      this.theme = theme

      // 处理跟随系统主题
      let actualTheme = theme
      if (theme === 'auto') {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        actualTheme = prefersDark ? 'dark' : 'light'
      }

      // 应用实际主题
      document.documentElement.setAttribute('data-theme', actualTheme)
      localStorage.setItem('butter-manager-theme', theme)

      console.log('应用主题:', theme, '实际主题:', actualTheme)
    },
    onThemeChanged(theme) {
      this.theme = theme
    },
    onAudioStarted(audio) {
      console.log('🎵 全局音频播放器开始播放:', audio.name)
      // 可以在这里添加额外的逻辑，比如显示通知等
    },
    onPlaylistEnded() {
      console.log('🏁 播放列表播放完毕')
      // 可以在这里添加播放列表结束后的逻辑
    },
    onTabsChanged(hasTabs, activeTabId) {
      // hasTabs 表示是否有非主页标签页
      // 如果只有主页标签页，hasTabs 应该是 false
      this.hasTabs = hasTabs
      // 检查活动标签页是否是主页
      this.checkActiveTabIsHome(activeTabId)
    },
    async checkActiveTabIsHome(activeTabId) {
      if (!window.electronAPI || !window.electronAPI.tabGetAll) {
        // 没有 Electron API 时，默认显示主页
        this.activeTabIsHome = true
        this.hasTabs = false
        return
      }
      
      try {
        const result = await window.electronAPI.tabGetAll()
        if (result.success) {
          const targetTabId = activeTabId || result.activeTabId
          const activeTab = result.tabs.find(t => t.id === targetTabId)
          const isHome = activeTab ? (activeTab.isHome || false) : (targetTabId === 'home-tab')
          console.log('检查活动标签页:', { targetTabId, activeTab, isHome, allTabs: result.tabs })
          this.activeTabIsHome = isHome
          // 更新 hasTabs：如果有非主页标签页，则为 true
          const nonHomeTabs = result.tabs.filter(t => !t.isHome)
          this.hasTabs = nonHomeTabs.length > 0
        } else {
          this.activeTabIsHome = true
          this.hasTabs = false
        }
      } catch (error) {
        console.error('检查活动标签页失败:', error)
        this.activeTabIsHome = true
        this.hasTabs = false
      }
    },
    async saveCurrentView(viewId: string) {
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          settings.lastView = viewId
          await saveManager.saveSettings(settings)
          console.log('✅ 已保存最后访问页面:', viewId)
        }
      } catch (error) {
        console.warn('保存最后访问页面失败:', error)
      }
    },
    async loadLastView() {
      try {
        const settings = await saveManager.loadSettings()
        if (settings && settings.lastView) {
          // 验证页面ID是否有效（从配置中获取所有有效的视图ID）
          const validViews = Object.keys(this.viewConfig)
          if (validViews.includes(settings.lastView)) {
            console.log('✅ 加载最后访问页面:', settings.lastView)
            return settings.lastView
          }
        }
      } catch (error) {
        console.warn('加载最后访问页面失败:', error)
      }
      return 'home' // 默认返回主页
    },
    
    // 加载安全键设置
    async loadSafetyKeySettings() {
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          this.safetyKeyEnabled = settings.safetyKeyEnabled || false
          this.safetyKeyUrl = settings.safetyKeyUrl || 'https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466'
          this.setupSafetyKeyListener()
        }
      } catch (error) {
        console.warn('加载安全键设置失败:', error)
      }
    },
    
    // 加载自动备份设置
    async loadAutoBackupSettings() {
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          // 如果开启了自动备份，使用设置的时间间隔，否则为0
          if (settings.autoBackupEnabled) {
            this.autoBackupInterval = settings.autoBackupInterval || 5
          } else {
            this.autoBackupInterval = 0
          }
          console.log('✅ 已加载自动备份设置:', settings.autoBackupEnabled ? `${this.autoBackupInterval} 分钟` : '已禁用')
          
          // 启动自动备份定时器
          this.startAutoBackupTimer()
        }
      } catch (error) {
        console.warn('加载自动备份设置失败:', error)
      }
    },
    
    // 检测 WinRAR 是否已安装
    async checkWinRARInstallation() {
      try {
        if (window.electronAPI && window.electronAPI.checkWinRARInstalled) {
          const result = await window.electronAPI.checkWinRARInstalled()
          
          if (result.success) {
            this.winRARInstalled = result.installed
            this.winRARPath = result.path || null
            this.winRARExecutable = result.executable || null
            
            if (result.installed) {
              console.log('✅ WinRAR 已安装:', result.path)
              console.log('   可执行文件:', result.executable)
            } else {
              console.log('❌ WinRAR 未安装')
            }
          } else {
            console.warn('检测 WinRAR 安装状态失败:', result.error)
            this.winRARInstalled = false
            this.winRARPath = null
            this.winRARExecutable = null
          }
        } else {
          console.warn('WinRAR 检测 API 不可用')
        }
      } catch (error) {
        console.error('检测 WinRAR 安装状态异常:', error)
        this.winRARInstalled = false
        this.winRARPath = null
        this.winRARExecutable = null
      }
    },
    
    // 执行自动备份
    async performAutoBackup() {
      try {
        console.log('🔄 开始执行自动备份...')
        // 获取保留备份数量设置
        const settings = await saveManager.loadSettings()
        const maxBackups = settings?.maxBackupCount || 5
        const result = await saveManager.backupEntireSaveData(maxBackups)
        if (result.success) {
          this.lastBackupTime = new Date()
          console.log('✅ 自动备份成功:', result.backupPath)
          // 显示通知
          notificationService.success('自动备份成功', `存档已备份到: ${result.backupPath}`)
        } else {
          console.error('❌ 自动备份失败:', result.error)
          notificationService.error('自动备份失败', result.error)
        }
      } catch (error) {
        console.error('执行自动备份失败:', error)
        notificationService.error('自动备份失败', error.message)
      }
    },
    
    // 启动自动备份定时器
    startAutoBackupTimer() {
      // 先停止现有的定时器
      this.stopAutoBackupTimer()
      
      // 如果时间间隔为0，则不启动定时器
      if (this.autoBackupInterval <= 0) {
        console.log('自动备份已禁用')
        return
      }
      
      // 转换为毫秒
      const intervalMs = this.autoBackupInterval * 60 * 1000
      
      console.log(`启动自动备份定时器，间隔: ${this.autoBackupInterval} 分钟 (${intervalMs} 毫秒)`)
      
      // 启动定时器
      this.autoBackupTimer = setInterval(() => {
        this.performAutoBackup()
      }, intervalMs)
    },
    
    // 停止自动备份定时器
    stopAutoBackupTimer() {
      if (this.autoBackupTimer) {
        clearInterval(this.autoBackupTimer)
        this.autoBackupTimer = null
        console.log('已停止自动备份定时器')
      }
    },
    
    // 设置安全键监听
    async setupSafetyKeyListener() {
      try {
        if (window.electronAPI && window.electronAPI.setSafetyKey) {
          const result = await window.electronAPI.setSafetyKey(this.safetyKeyEnabled, this.safetyKeyUrl)
          if (result.success) {
            console.log('✅ 安全键全局快捷键已', this.safetyKeyEnabled ? '启用' : '禁用', '(ESC)')
          } else {
            console.warn('设置安全键失败:', result.error)
          }
        }
      } catch (error) {
        console.error('设置安全键监听失败:', error)
      }
    }
  },
  async mounted() {
    // 监听应用整体缩放变化（菜单/快捷键），显示“缩放至 XX%”提示
    if (window.electronAPI && typeof window.electronAPI.onAppZoomChanged === 'function') {
      this.removeAppZoomChanged = window.electronAPI.onAppZoomChanged((data) => {
        const zoomLevel = data && typeof data.zoomLevel === 'number' ? data.zoomLevel : 0
        const percent = Math.round(Math.pow(2, zoomLevel) * 100)
        this.appZoomHintPercent = percent
        this.appZoomHintVisible = true
        if (this.appZoomHintTimer) clearTimeout(this.appZoomHintTimer)
        this.appZoomHintTimer = window.setTimeout(() => {
          this.appZoomHintVisible = false
          this.appZoomHintTimer = null
        }, 1500)
      })
    }

    // 初始化标签页状态（确保默认显示主页）
    if (window.electronAPI && window.electronAPI.tabGetAll) {
      try {
        const result = await window.electronAPI.tabGetAll()
        if (result.success) {
          const activeTab = result.tabs.find(t => t.id === (result.activeTabId || 'home-tab'))
          this.activeTabIsHome = activeTab ? (activeTab.isHome || false) : true
          const nonHomeTabs = result.tabs.filter(t => !t.isHome)
          this.hasTabs = nonHomeTabs.length > 0
        }
      } catch (error) {
        console.warn('初始化标签页状态失败:', error)
        this.activeTabIsHome = true
        this.hasTabs = false
      }
    } else {
      // 没有 Electron API 时，默认显示主页
      this.activeTabIsHome = true
      this.hasTabs = false
    }

    // 读取版本号
    try {
      const packageJson = await import('../package.json')
      this.version = packageJson.version || '0.0.0'
    } catch (error) {
      console.warn('无法读取版本号:', error)
      this.version = '0.0.0'
    }

    // 首先初始化存档系统
    try {
      console.log('正在初始化存档系统...')
      const initSuccess = await saveManager.initialize()
      if (initSuccess) {
        console.log('✅ 存档系统初始化成功')
        this.isInitialized = true // 标记初始化完成
      } else {
        console.warn('⚠️ 存档系统初始化失败，但应用将继续运行')
        this.isInitialized = true // 即使失败也标记为完成，避免阻塞
      }
    } catch (error) {
      console.error('存档系统初始化出错:', error)
      this.isInitialized = true // 即使出错也标记为完成，避免阻塞
    }

    // 初始化自定义页面管理器
    // ✨ 新版：使用 PageConfigManager（异步操作，需要 await）
    try {
      await this.reloadCustomPages()
      console.log('✅ 页面配置加载成功:', this.pages.length, '个页面')
      console.log('📄 页面列表:', this.pages.map(p => `${p.name}(${p.id})`).join(', '))
    } catch (error) {
      console.error('❌ 页面配置加载失败:', error)
    }

    // 加载最后访问的页面
    try {
      const lastView = await this.loadLastView()
      // 安全地导航到最后访问的页面
      this.$router.push({ name: lastView }).catch(() => {
        // 如果路由不存在，跳转到主页
        this.$router.push({ name: 'home' })
      })
      console.log('🎯 已设置当前页面为:', lastView)
    } catch (error) {
      console.warn('加载最后访问页面失败，使用默认页面:', error)
      this.$router.push({ name: 'home' })
    }

    // 监听路由变化，更新筛选器状态
    this.$watch(
      () => this.$route,
      (route) => {
        if (route.name) {
          // 路由变化时关闭插件视图
          if (this.pluginView.visible) {
            this.closePluginView()
          }
          
          const requiresFilter = route.meta?.requiresFilter === true
          this.showFilterSidebar = requiresFilter
          this.resetFilterData()
          this.isFilterSidebarLoading = requiresFilter
          
          // 保存当前页面
          this.saveCurrentView(route.name as string)
          
          // 如果当前在资源页面，自动展开主页菜单
          const isResourcePage = this.resourcePages.some(page => route.name === page.id)
          if (isResourcePage) {
            this.isHomeMenuExpanded = true
          }
          
          // 如果是有筛选器的页面，需要手动触发筛选器数据更新
          if (requiresFilter) {
            this.$nextTick(() => {
              // 通过全局事件请求更新筛选器数据
              window.dispatchEvent(new CustomEvent('filter-request-update'))
            })
          }
        }
      },
      { immediate: true }
    )

    // 初次进入带筛选器的页面时，显示加载状态并主动触发一次筛选器数据刷新
    this.resetFilterData()
    this.isFilterSidebarLoading = this.showFilterSidebar
    if (this.showFilterSidebar) {
      this.$nextTick(() => {
        // 通过全局事件请求更新筛选器数据
        window.dispatchEvent(new CustomEvent('filter-request-update'))
      })
    }
    
    // 初始化通知服务
    try {
      notificationService.init(this.$refs.toastNotification)
    } catch (error) {
      console.error('通知服务初始化失败:', error)
    }

    // 初始化 Alert 服务
    try {
      alertService.init(this.$refs.alert)
    } catch (error) {
      console.error('Alert 服务初始化失败:', error)
    }

    // 初始化 Confirm 服务
    try {
      confirmService.init(this.$refs.confirm)
    } catch (error) {
      console.error('Confirm 服务初始化失败:', error)
    }

    // 然后从 SaveManager 加载设置（所有降级逻辑由 SaveManager 处理）
    try {
      const settings = await saveManager.loadSettings()
      const theme = settings?.theme || 'auto'
      console.log('从 SaveManager 加载主题设置:', theme)
      this.applyTheme(theme)
      
      // 加载个性化设置
      if (settings?.customAppTitle) {
        this.customAppTitle = settings.customAppTitle
      }
      if (settings?.customAppSubtitle) {
        this.customAppSubtitle = settings.customAppSubtitle
      }
      
      // 加载背景图片设置
      if (settings?.backgroundImagePath) {
        await this.applyBackgroundImage(settings.backgroundImagePath)
      }
    } catch (error) {
      console.warn('从 SaveManager 加载设置失败，使用默认主题:', error)
      // 如果 SaveManager 也失败了，使用默认主题
      this.applyTheme('auto')
    }

    await this.checkFirstLoginAchievement()

    // 在后台异步打印磁盘信息，不阻塞启动流程
    this.printDiskInfo().catch(error => {
      console.error('后台获取磁盘信息失败:', error)
    })

    // 启动游戏运行状态检查
    this.startPeriodicStatusCheck()

    // 在应用空闲时预热各资源页面
    this.prefetchResourceViews()
    
    // 启动游戏时长更新
    this.startPeriodicPlaytimeUpdate()
    
    // 开始应用使用时长跟踪
    await this.startAppUsageTracking()
    
    // 加载安全键设置
    await this.loadSafetyKeySettings()
    
    // 加载自动备份设置
    await this.loadAutoBackupSettings()
    
    // 检测 WinRAR 安装状态
    await this.checkWinRARInstallation()
    
    // 初始化插件系统
    try {
      console.log('正在初始化插件系统...')
      await pluginManager.scanPlugins()
      await pluginManager.loadEnabledPlugins()
      console.log('✅ 插件系统初始化完成')
      
      // 更新插件导航项
      this.updatePluginNavigationItems()
    } catch (error) {
      console.error('插件系统初始化失败:', error)
    }
    
    // 监听插件导航项更新事件
    this.handlePluginNavigationUpdate = () => {
      this.updatePluginNavigationItems()
    }
    window.addEventListener('plugin-navigation-updated', this.handlePluginNavigationUpdate)
    
    // 监听插件自定义视图显示事件
    const handlePluginShowCustomView = (event: CustomEvent) => {
      const { title, content, onMount } = event.detail
      this.showPluginView({ title, content, onMount })
    }
    window.addEventListener('plugin-show-custom-view', handlePluginShowCustomView as EventListener)
    
    // 监听自定义标题变化事件
    window.addEventListener('custom-app-title-changed', (event: CustomEvent) => {
      const { title } = event.detail
      this.customAppTitle = title || ''
    })
    
    // 监听自定义副标题变化事件
    window.addEventListener('custom-app-subtitle-changed', (event: CustomEvent) => {
      const { subtitle } = event.detail
      this.customAppSubtitle = subtitle || ''
    })
    
    // 监听背景图片变化事件
    window.addEventListener('background-image-changed', async (event: CustomEvent) => {
      const { path } = event.detail
      this.backgroundImagePath = path || ''
      if (path) {
        await this.applyBackgroundImage(path)
      } else {
        this.backgroundImageUrl = ''
      }
    })
    
    // 监听安全键设置变化事件
    window.addEventListener('safety-key-changed', async (event: CustomEvent) => {
      const { enabled, url } = event.detail
      this.safetyKeyEnabled = enabled
      if (url) {
        this.safetyKeyUrl = url
      }
      await this.setupSafetyKeyListener()
    })
    
    // 监听自动备份时间间隔变化事件
    window.addEventListener('auto-backup-interval-changed', async (event: CustomEvent) => {
      const { interval } = event.detail
      this.autoBackupInterval = interval || 0
      console.log('自动备份时间间隔已更新:', this.autoBackupInterval, '分钟')
      this.startAutoBackupTimer()
    })

    // 监听页面管理变更（设置页新增/隐藏/排序后刷新导航）
    window.addEventListener('custom-pages-updated', () => {
      this.reloadCustomPages()
    })
    
    // 监听安全键触发事件（来自主进程）
    if (window.electronAPI && window.electronAPI.onSafetyKeyTriggered) {
      window.electronAPI.onSafetyKeyTriggered(() => {
        console.log('收到安全键触发事件（来自主进程）')
        // 主进程已经处理了最小化和打开网页，这里可以添加额外的UI反馈
      })
    }
    
    // 所有初始化完成，隐藏加载提示
    this.isLoading = false
    console.log('✅ 应用初始化完成')
    // 根据存档 hasShowUpdateDialog 决定是否显示版本更新弹窗
    try {
      const settings = await saveManager.loadSettings()
      if (settings && settings.hasShowUpdateDialog !== true) {
        this.$nextTick(() => {
          this.showVersionModal = true
        })
      }
    } catch (e) {
      // 读取失败时默认显示一次
      this.$nextTick(() => {
        this.showVersionModal = true
      })
    }
    // this.showVersionModal = true
  },
  beforeUnmount() {
    // 停止定期检查游戏运行状态
    this.stopPeriodicStatusCheck()
    
    // 停止定期更新游戏时长
    this.stopPeriodicPlaytimeUpdate()
    
    // 停止应用使用时长跟踪
    this.stopAppUsageTracking()
    
    // 停止自动备份定时器
    this.stopAutoBackupTimer()
    
    // 移除插件导航项更新事件监听
    if (this.handlePluginNavigationUpdate) {
      window.removeEventListener('plugin-navigation-updated', this.handlePluginNavigationUpdate)
    }
    
    // 关闭插件视图
    this.closePluginView()
    
    // 禁用安全键（清理全局快捷键）
    if (window.electronAPI && window.electronAPI.setSafetyKey) {
      // 使用 Promise 而不是 await，因为 beforeUnmount 不能是 async
      window.electronAPI.setSafetyKey(false, '').catch((error) => {
        console.error('禁用安全键失败:', error)
      })
    }

    // 移除应用缩放变化监听
    if (this.removeAppZoomChanged && typeof this.removeAppZoomChanged === 'function') {
      this.removeAppZoomChanged()
      this.removeAppZoomChanged = null
    }
    if (this.appZoomHintTimer) {
      clearTimeout(this.appZoomHintTimer)
      this.appZoomHintTimer = null
    }
  }
}
</script>

<style scoped>
/* 应用缩放提示：屏幕上方中央，菜单/快捷键改变整体缩放时短暂显示 */
.app-zoom-hint {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  pointer-events: none;
  animation: app-zoom-hint-fade 0.2s ease-out;
}
@keyframes app-zoom-hint-fade {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 内容区域布局 */
.content-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-body.with-filter {
  display: flex;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.page-content.has-background::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: var(--bg-image-url);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: 0;
  opacity: 0.3;
  mix-blend-mode: multiply;/* 混合模式：乘法，使背景图片更暗 */
  pointer-events: none;
}

.page-content.has-background > * {
  position: relative;
  z-index: 1;
}



.sidebar-logo{
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin: 0 auto;
  display: block;
  margin-bottom: 8px;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
}

/* 侧边栏宽度拖拽条 */
.sidebar-resizer {
  position: fixed;
  top: 40px;
  bottom: 0;
  width: 6px;
  z-index: 100;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
}
.sidebar-resizer:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* 侧边栏窄屏模式（< 200px）：只显示图标 */
.sidebar.sidebar-narrow .sidebar-header h1,
.sidebar.sidebar-narrow .sidebar-header p {
  display: none;
}
.sidebar.sidebar-narrow .sidebar-header {
  padding: 12px 8px;
}
.sidebar.sidebar-narrow .nav-text {
  display: none;
}
.sidebar.sidebar-narrow .nav-item,
.sidebar.sidebar-narrow .nav-item-content {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}
.sidebar.sidebar-narrow .nav-item {
  padding: 12px 8px;
}
.sidebar.sidebar-narrow .nav-item-child {
  padding-left: 0;
  justify-content: center;
}
.sidebar.sidebar-narrow .nav-footer .nav-item {
  justify-content: center;
  padding: 12px 8px;
}

/* 筛选器侧边栏样式 */
.filter-sidebar-container {
  display: flex;
  flex-direction: column;
  width: 250px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

/* 版本号样式 */
.version {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  opacity: 0.8;
  font-weight: 400;
}

/* 加载中样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.3s ease;
}

.loading-content {
  text-align: center;
  color: var(--text-primary);
}

.loading-content h2 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 插件视图样式 */
.plugin-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.plugin-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-secondary);
}

.plugin-view-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.plugin-view-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.plugin-view-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.plugin-view-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* 启动时版本更新弹窗（条目样式在 ChangelogEntryCard 中统一维护） */
.version-modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}
.version-modal-body > * {
  margin-bottom: var(--spacing-sm);
}
.version-modal-body > *:last-child {
  margin-bottom: 0;
}
:deep(.fun-modal__footer) .btn-confirm {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary, #0ea5e9);
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
}
:deep(.fun-modal__footer) .btn-confirm:hover {
  opacity: 0.9;
}
</style>
