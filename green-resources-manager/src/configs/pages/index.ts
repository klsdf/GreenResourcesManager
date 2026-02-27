/**
 * 页面配置索引
 * 所有页面配置通过 JSON 文件管理，由 PageConfigLoader 统一加载
 * 
 * 添加新页面步骤：
 * 1. 在 src/configs/pages/ 创建 JSON 配置文件（如 newPage.json）
 * 2. 在 PageConfigLoader.ts 中导入并注册该配置
 * 3. 在 PAGE_CONFIGS 数组中添加配置项（指定 config 和 order）
 */

export { pageConfigLoader, PageConfigLoader } from './PageConfigLoader'
export type { PageConfig, PageConfigMeta } from './PageConfigLoader'

// 为了向后兼容，重新导出一些常用的方法
export { getPageConfigById, getVisiblePageConfigs, getAllPageConfigs } from './PageConfigLoader'