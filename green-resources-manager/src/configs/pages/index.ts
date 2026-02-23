/**
 * 页面配置索引
 * 所有页面配置在这里统一管理和导出
 * 无需任何存档文件，直接从配置读取
 */

import { GamePage } from './GamePage'
import { SoftwarePage } from './SoftwarePage'
import { ImagePage } from './ImagePage'
import { SingleImagePage } from './SingleImagePage'
import { VideoPage } from './VideoPage'
import { AnimePage } from './AnimePage'
import { NovelPage } from './NovelPage'
import { WebsitePage } from './WebsitePage'
import { AudioPage } from './AudioPage'
import { OtherPage } from './OtherPage'

/**
 * 页面配置接口
 * 定义每个页面的元数据
 */
export interface PageConfigMeta {
  pageClass: any                // 页面配置类（必须继承 BasePage）
  order: number                 // 显示顺序
  isHidden?: boolean           // 是否隐藏（默认 false）
  isDefault?: boolean          // 是否为系统默认页面（默认 true）
}

/**
 * 页面配置列表
 * 
 * 添加新页面步骤：
 * 1. 在 src/configs/pages/ 创建页面配置类（继承 BasePage）
 * 2. 在页面类中定义 id、name、icon、type、description 等属性
 * 3. 在本文件顶部 import 导入
 * 4. 在下面的数组中添加配置项（只需指定 pageClass 和 order）
 * 
 * 注意：id、name、icon 等信息由页面类自己定义，无需在这里重复！
 */
export const PAGE_CONFIGS: PageConfigMeta[] = [
  {
    pageClass: GamePage,        // 页面类会提供：id='games', name='游戏', icon='🎮'
    order: 1,
    isDefault: true
  },
  {
    pageClass: SoftwarePage,    // 页面类会提供：id='software', name='软件', icon='💾'
    order: 2,
    isDefault: true
  },
  {
    pageClass: ImagePage,       // 页面类会提供：id='images', name='图片', icon='🖼️'
    order: 3,
    isDefault: true
  },
  {
    pageClass: SingleImagePage, // 页面类会提供：id='single-image', name='单图', icon='🖼️'
    order: 4,
    isDefault: true
  },
  {
    pageClass: VideoPage,       // 页面类会提供：id='videos', name='电影', icon='🎬'
    order: 5,
    isDefault: true
  },
  {
    pageClass: AnimePage,       // 页面类会提供：id='anime-series', name='番剧', icon='📺'
    order: 6,
    isDefault: true
  },
  {
    pageClass: NovelPage,       // 页面类会提供：id='novels', name='小说', icon='📚'
    order: 7,
    isDefault: true
  },
  {
    pageClass: WebsitePage,     // 页面类会提供：id='websites', name='网站', icon='🌐'
    order: 8,
    isDefault: true
  },
  {
    pageClass: AudioPage,       // 页面类会提供：id='audio', name='声音', icon='🎵'
    order: 9,
    isDefault: true
  },
  {
    pageClass: OtherPage,       // 页面类会提供：id='other', name='其它', icon='📦'
    order: 10,
    isDefault: true
  }
]

/**
 * 根据 ID 获取页面配置
 */
export function getPageConfigById(id: string): PageConfigMeta | undefined {
  return PAGE_CONFIGS.find(config => {
    const pageInstance = new config.pageClass()
    return pageInstance.id === id
  })
}

/**
 * 获取所有可见页面配置
 */
export function getVisiblePageConfigs(): PageConfigMeta[] {
  return PAGE_CONFIGS
    .filter(config => !config.isHidden)
    .sort((a, b) => a.order - b.order)
}

/**
 * 获取所有页面配置（包括隐藏的）
 */
export function getAllPageConfigs(): PageConfigMeta[] {
  return [...PAGE_CONFIGS].sort((a, b) => a.order - b.order)
}
