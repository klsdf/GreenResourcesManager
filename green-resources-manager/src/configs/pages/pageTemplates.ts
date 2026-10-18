/**
 * 新增页面时可选的预设模板。
 *
 * 模板文件本身留在 configs/pages 里，不跟着页面一起删。
 * 这样删掉「游戏」页之后，仍然可以再按游戏模板建一页。
 * 新建页面会复制模板配置，但使用新的页面 ID，避免和旧数据混在一起。
 */
export interface PageTemplate {
  /** 模板标识，同时作为新页面 ID 的前缀 */
  id: string
  /** 选择模板时展示的名称 */
  label: string
  /** 选择模板时展示的图标 */
  icon: string
  /** 模板配置文件名，必须是 configs/pages 下的文件 */
  fileName: string
  /** 简短说明，帮助区分资源类型 */
  description: string
}

/** 预设模板。顺序就是选择面板里的展示顺序。 */
export const PAGE_TEMPLATES: PageTemplate[] = [
  { id: 'games', label: '游戏', icon: '🎮', fileName: 'gamePage.json', description: '管理 exe、bat 等可运行的游戏' },
  { id: 'anime-series', label: '番剧', icon: '📺', fileName: 'animePage.json', description: '管理番剧、电视剧等多集视频' },
  { id: 'novels', label: '小说', icon: '📚', fileName: 'novelPage.json', description: '管理 txt、pdf、epub 等小说' },
  { id: 'videos', label: '电影', icon: '🎬', fileName: 'videoPage.json', description: '管理单部电影或视频文件' },
  { id: 'images', label: '漫画', icon: '🖼️', fileName: 'imagePage.json', description: '管理漫画文件夹或压缩包' },
  { id: 'single-image', label: '单图', icon: '🌄', fileName: 'singleImagePage.json', description: '管理单张图片' },
  { id: 'software', label: '软件', icon: '💾', fileName: 'softwarePage.json', description: '管理软件和常用程序' },
  { id: 'websites', label: '网站', icon: '🌐', fileName: 'websitePage.json', description: '管理网址和收藏夹' },
  { id: 'audio', label: '音频', icon: '🎵', fileName: 'audioPage.json', description: '管理 mp3、wav 等音频' },
  { id: 'other', label: '其它', icon: '📦', fileName: 'otherPage.json', description: '管理任意文件或文件夹' }
]

/** 这些文件是模板来源，删除页面时不能删掉。 */
export const TEMPLATE_FILE_NAMES = new Set(PAGE_TEMPLATES.map(template => template.fileName))

/** 删除页面时必须原样输入的确认文字。 */
export const DELETE_PAGE_CONFIRM_TEXT = '我已知晓数据丢失风险'

/**
 * 判断配置文件名是不是安全的页面文件名。
 * 只允许普通 json 文件名，避免页面列表被改成指向别的路径。
 */
export function isSafePageFileName(fileName: string): boolean {
  return /^[A-Za-z0-9_-]+\.json$/.test(fileName)
}

/**
 * 生成不和现有页面冲突的新页面 ID。
 * 前缀来自模板，后缀用时间保证每次新建都是独立的一页。
 */
export function createUniquePageId(prefix: string, existingIds: Set<string>): string {
  const safePrefix = prefix.replace(/[^A-Za-z0-9_-]/g, '') || 'page'
  let pageId = `${safePrefix}-${Date.now().toString(36)}`
  while (existingIds.has(pageId)) {
    pageId = `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  }
  return pageId
}
