export interface DocEntry {
  slug: string
  title: string
  navTitle: string
  icon: string
  description: string
  category: string
  keywords: string[]
}

export interface DocCategory {
  id: string
  title: string
  icon: string
  description: string
  docs: DocEntry[]
}

export const docCategories: DocCategory[] = [
  {
    id: 'start',
    title: '入门指南',
    icon: '🌱',
    description: '先认识一下这个软乎乎的仓鼠窝',
    docs: [
      {
        slug: 'introduction',
        title: '认识 Green Resources Manager',
        navTitle: '项目介绍',
        icon: '🏠',
        description: 'Green Resources Manager 是一款完全本地的多媒体资源管理器，帮你把游戏、漫画、视频、小说、网站和音频收进同一个仓鼠窝。',
        category: 'start',
        keywords: ['绿色资源管理器', '项目介绍', '本地资源管理', '仓鼠症']
      },
      {
        slug: 'basics',
        title: '通用操作与快捷键',
        navTitle: '通用操作',
        icon: '🛠️',
        description: '窗口快捷键、伪装模式、数据存储位置和 tag 索引系统的使用说明。',
        category: 'start',
        keywords: ['快捷键', '伪装模式', '数据存储', 'tag 索引']
      },
      {
        slug: 'pages',
        title: '页面与资源',
        navTitle: '页面与资源',
        icon: '📄',
        description: '创建、编辑、排序和删除页面，把不同类型的资源分门别类地放进侧边栏。',
        category: 'start',
        keywords: ['页面管理', '添加页面', '删除页面', '资源分类']
      },
      {
        slug: 'resources',
        title: '添加与删除资源',
        navTitle: '资源管理',
        icon: '📦',
        description: '如何往页面里添加资源、从名单里删除资源，以及本地文件不会被误删的说明。',
        category: 'start',
        keywords: ['添加资源', '删除资源', '拖拽添加', '本地文件']
      },
      {
        slug: 'faq',
        title: '常见问题',
        navTitle: '常见问题',
        icon: '❓',
        description: 'Green Resources Manager 使用中的常见问题与解决办法。',
        category: 'start',
        keywords: ['FAQ', '常见问题', '隐藏模式', '删除资源']
      }
    ]
  },
  {
    id: 'api',
    title: '资源 API',
    icon: '🔌',
    description: '用同一套接口，把各类资源接进管理器',
    docs: [
      {
        slug: 'api',
        title: 'API 手册总览',
        navTitle: 'API 总览',
        icon: '🔌',
        description: 'Green Resources Manager 资源管理 API 总览，支持游戏、漫画、视频、小说、网站和音频。',
        category: 'api',
        keywords: ['API', '接口手册', '资源管理接口']
      },
      {
        slug: 'api-games',
        title: '游戏管理 API',
        navTitle: '游戏 API',
        icon: '🎮',
        description: '游戏管理 API：读取游戏列表、记录游戏时长、启动游戏和获取截图。',
        category: 'api',
        keywords: ['游戏 API', '游戏时长', '启动游戏']
      },
      {
        slug: 'api-manga',
        title: '漫画管理 API',
        navTitle: '漫画 API',
        icon: '📚',
        description: '漫画管理 API：获取漫画列表、封面、页数和阅读进度。',
        category: 'api',
        keywords: ['漫画 API', '漫画阅读', '封面']
      },
      {
        slug: 'api-videos',
        title: '视频管理 API',
        navTitle: '视频 API',
        icon: '🎬',
        description: '视频管理 API：读取视频列表、封面、时长和播放进度。',
        category: 'api',
        keywords: ['视频 API', '视频播放', '时长']
      },
      {
        slug: 'api-novels',
        title: '小说管理 API',
        navTitle: '小说 API',
        icon: '📖',
        description: '小说管理 API：读取小说列表、封面、字数、阅读进度和章节信息。',
        category: 'api',
        keywords: ['小说 API', '阅读进度', '章节']
      },
      {
        slug: 'api-websites',
        title: '网站管理 API',
        navTitle: '网站 API',
        icon: '🌐',
        description: '网站管理 API：读取网站资源列表、封面和访问信息。',
        category: 'api',
        keywords: ['网站 API', '网页收藏', '网站资源']
      },
      {
        slug: 'api-audio',
        title: '音频管理 API',
        navTitle: '音频 API',
        icon: '🎵',
        description: '音频管理 API：读取音频列表、封面、时长和播放记录。',
        category: 'api',
        keywords: ['音频 API', '音乐', '播放记录']
      }
    ]
  },
  {
    id: 'workshop',
    title: '创意工坊',
    icon: '🎨',
    description: '把管理器改成更趁手的样子',
    docs: [
      {
        slug: 'workshop',
        title: '创意工坊手册',
        navTitle: '工坊总览',
        icon: '🎨',
        description: '用创意工坊扩展管理器的页面、插件、便笺和日期管理能力。',
        category: 'workshop',
        keywords: ['创意工坊', '自定义页面', '插件']
      },
      {
        slug: 'workshop-pages',
        title: '自定义页面',
        navTitle: '自定义页面',
        icon: '📄',
        description: '在创意工坊中创建自定义页面，组合你需要的功能模块。',
        category: 'workshop',
        keywords: ['自定义页面', '工坊页面']
      },
      {
        slug: 'workshop-plugin',
        title: '自定义功能',
        navTitle: '自定义功能',
        icon: '🧩',
        description: '通过创意工坊插件扩展管理器的功能。',
        category: 'workshop',
        keywords: ['自定义功能', '工坊插件']
      },
      {
        slug: 'workshop-note',
        title: '便笺插件',
        navTitle: '便笺插件',
        icon: '📝',
        description: '使用便笺插件记录资源相关的笔记和待办。',
        category: 'workshop',
        keywords: ['便笺', '笔记插件']
      },
      {
        slug: 'workshop-calendar',
        title: '日期管理插件',
        navTitle: '日期管理插件',
        icon: '📅',
        description: '使用日期管理插件记录和查看与资源相关的重要日期。',
        category: 'workshop',
        keywords: ['日期管理', '日历插件']
      }
    ]
  },
  {
    id: 'support',
    title: '支持与关于',
    icon: '💬',
    description: '遇到问题时，来这里找我们',
    docs: [
      {
        slug: 'support',
        title: '客服群与问题反馈',
        navTitle: '客服与反馈',
        icon: '💬',
        description: '加入 QQ 群、提交 GitHub Issues 或填写反馈表格，把问题和建议告诉我们。',
        category: 'support',
        keywords: ['QQ群', '问题反馈', 'GitHub Issues']
      },
      {
        slug: 'about',
        title: '关于我们',
        navTitle: '关于我们',
        icon: 'ℹ️',
        description: '了解 Green Resources Manager、帽子社和开发者。',
        category: 'support',
        keywords: ['关于我们', '帽子社', '开发者']
      }
    ]
  }
]

export const flatDocs = docCategories.flatMap((category) => category.docs)

export function getDocBySlug(slug: string) {
  const index = flatDocs.findIndex((doc) => doc.slug === slug)
  if (index === -1) return null
  return {
    doc: flatDocs[index],
    prev: index > 0 ? flatDocs[index - 1] : null,
    next: index < flatDocs.length - 1 ? flatDocs[index + 1] : null,
    category: docCategories.find((item) => item.id === flatDocs[index].category) ?? null
  }
}
