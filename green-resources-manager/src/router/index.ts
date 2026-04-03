import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import type { PageConfig } from '../types/page'
import pageConfigManager from '../utils/PageConfigManager'

// 固定页面路由
const fixedRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomeView.vue'),
    meta: {
      title: '主页',
      icon: '🏠',
      description: '欢迎页面，快速访问各个功能模块',
      requiresFilter: false
    }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../pages/SearchView.vue'),
    meta: {
      title: '搜索',
      icon: '🔍',
      description: '在所有资源中搜索内容',
      requiresFilter: false
    }
  },
  {
    path: '/debug',
    name: 'debug',
    component: () => import('../pages/DebugView.vue'),
    meta: {
      title: 'Debug',
      icon: '🐛',
      description: '用于各种调试和测试',
      requiresFilter: false
    }
  },
  {
    path: '/database',
    name: 'database',
    component: () => import('../pages/DatabaseView.vue'),
    meta: {
      title: '数据库',
      icon: '🗄️',
      description: '这里是存档的数据',
      requiresFilter: false
    }
  },
  {
    path: '/scraper-library',
    name: 'scraper-library',
    component: () => import('../pages/ScraperLibraryView.vue'),
    meta: {
      title: '本地刮削库',
      icon: '📚',
      description: '本地刮削库，对资源右键点击刮削即可使用',
      requiresFilter: false
    }
  },
  {
    path: '/workshop',
    name: 'workshop',
    component: () => import('../pages/WorkshopView.vue'),
    meta: {
      title: '创意工坊',
      icon: '🎨',
      description: '分享和发现社区创作内容',
      requiresFilter: false
    }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../pages/UserView.vue'),
    meta: {
      title: '用户',
      icon: '👤',
      description: '记录您的个人数据已经本软件的各种数据',
      requiresFilter: false
    },
    children: [
      {
        path: 'profile',
        name: 'users-profile',
        component: () => import('../pages/user/ProfileView.vue'),
        meta: { title: '用户资料' }
      },
      {
        path: 'achievements',
        name: 'users-achievements',
        component: () => import('../pages/user/AchievementView.vue'),
        meta: { title: '成就' }
      },
      {
        path: 'statistics',
        name: 'users-statistics',
        component: () => import('../pages/user/StatisticsView.vue'),
        meta: { title: '统计' }
      },
      {
        path: '',
        redirect: 'profile'
      }
    ]
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../pages/MessageCenterView.vue'),
    meta: {
      title: '信息中心',
      icon: '📢',
      description: '查看系统通知和操作历史',
      requiresFilter: false
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsView.vue'),
    meta: {
      title: '设置',
      icon: '⚙️',
      description: '管理应用设置和偏好',
      requiresFilter: false
    }
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('../pages/HelpView.vue'),
    meta: {
      title: '帮助',
      icon: '❓',
      description: '了解应用功能和使用方法',
      requiresFilter: false
    }
  },
  {
    path: '/changelog',
    name: 'changelog',
    component: () => import('../pages/ChangelogView.vue'),
    meta: {
      title: '更新记录',
      icon: '📋',
      description: '版本更新与功能变更记录',
      requiresFilter: false
    }
  },
  {
    path: '/sponsor',
    name: 'sponsor',
    component: () => import('../pages/SponsorView.vue'),
    meta: {
      title: '赞助产品',
      icon: '❤️',
      description: '支持项目持续开发',
      requiresFilter: false
    }
  },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('../pages/CollectionsView.vue'),
    meta: {
      title: '合集',
      icon: '🗂️',
      description: '管理你的合集',
      requiresFilter: false
    }
  },
  {
    path: '/recent',
    name: 'recent',
    component: () => import('../pages/RecentView.vue'),
    meta: {
      title: '最近浏览',
      icon: '🕒',
      description: '查看最近浏览的内容',
      requiresFilter: false
    }
  },
  {
    path: '/resource-view',
    name: 'resource-view',
    component: () => import('../pages/ResourceView.vue'),
    meta: {
      title: '资源视图',
      icon: '📊',
      description: '资源视图页面',
      requiresFilter: false
    }
  }
]

/**
 * 根据页面配置创建资源路由
 * 所有页面都使用 ResourceView 组件，由配置驱动生成页面内容
 */
function createResourceRoute(pageConfig: PageConfig): RouteRecordRaw {
  return {
    path: `/${pageConfig.id}`,
    name: pageConfig.id,
    component: () => import('../components/ResourceView.vue'),
    props: {
      pageConfig: pageConfig
    },
    meta: {
      title: pageConfig.name,
      icon: pageConfig.icon,
      description: pageConfig.description || `${pageConfig.name}管理页面`,
      requiresFilter: true,
      pageConfig: pageConfig
    }
  }
}

/**
 * 从 pageConfigManager 加载动态路由
 */
export async function loadDynamicRoutes(): Promise<RouteRecordRaw[]> {
  const pages = await pageConfigManager.getPages()
  
  return pages
    .filter(page => !page.isHidden)
    .map(page => createResourceRoute(page))
}

/**
 * 创建路由实例
 */
export async function createAppRouter() {
  // 加载动态路由
  const dynamicRoutes = await loadDynamicRoutes()
  
  // 合并所有路由
  const routes: RouteRecordRaw[] = [
    ...fixedRoutes,
    ...dynamicRoutes,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]

  const router = createRouter({
    history: createWebHashHistory(),
    routes
  })

  // 路由守卫：保存最后访问的页面
  router.afterEach((to) => {
    // 保存到 localStorage 或通过事件通知 App.vue
    if (to.name && to.name !== 'home') {
      window.dispatchEvent(new CustomEvent('route-changed', {
        detail: { routeName: to.name }
      }))
    }
  })

  return router
}

/**
 * 更新动态路由（当页面配置变化时调用）
 */
export async function updateDynamicRoutes(router: ReturnType<typeof createRouter>) {
  // 移除旧的动态路由（除了固定路由）
  const routesToRemove = router.getRoutes().filter(route => {
    const meta = route.meta as any
    return meta?.pageConfig && !fixedRoutes.some(r => r.name === route.name)
  })

  routesToRemove.forEach(route => {
    if (route.name) {
      router.removeRoute(route.name)
    }
  })

  // 添加新的动态路由
  const newRoutes = await loadDynamicRoutes()
  newRoutes.forEach(route => {
    router.addRoute(route)
  })
}

