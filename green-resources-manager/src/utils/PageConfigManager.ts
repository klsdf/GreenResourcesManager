/**
 * 页面配置管理器（新版 - 完全基于 JSON 配置）
 * 
 * 设计理念：
 * - 零存档：所有配置直接从 JSON 配置文件读取
 * - 配置即数据：页面元数据在 JSON 文件中定义
 * - 即插即用：添加页面只需在 PageConfigLoader 中注册
 * 
 * 与旧版 CustomPageManager 的区别：
 * - CustomPageManager: 依赖 pages.json 存档，需要初始化、保存等操作
 * - PageConfigManager: 直接从 JSON 配置文件读取，无需任何存档操作
 */

import { PageConfig, ResourceType } from '../types/page';
import { pageConfigLoader, type PageConfigMeta } from '../configs/pages/PageConfigLoader';

/**
 * 页面配置管理器（新版）
 * 完全基于配置文件，无需存档系统
 */
class PageConfigManager {
  private pages: PageConfig[] = [];
  private initialized = false;

  /**
   * 初始化页面配置
   * 直接从 JSON 配置文件读取，需要异步操作
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('[PageConfigManager] 从 JSON 配置文件加载页面...');
    
    const now = Date.now();
    
    // 等待配置加载完成
    await pageConfigLoader.ready();
    
    // 从 PageConfigLoader 获取所有页面配置
    const pageConfigs = pageConfigLoader.getAllPageConfigs();
    
    // 遍历所有页面配置
    this.pages = pageConfigs.map(meta => {
      const config = meta.config;
      
      // 从 resourceTypes[0] 推导主资源类型
      const resourceType = (config.resourceTypes && config.resourceTypes.length > 0)
        ? config.resourceTypes[0] as ResourceType
        : 'Other' as ResourceType;
      
      // 从 JSON 配置读取所有配置信息
      const pageConfig: PageConfig = {
        id: config.id,                        // 从 JSON 配置读取 id
        name: config.name,                    // 从 JSON 配置读取 name
        icon: config.icon,                    // 从 JSON 配置读取 icon
        type: resourceType,                         // 从 resourceTypes[0] 推导
        description: config.description || '', // 从 JSON 配置读取 description
        isDefault: meta.isDefault !== false,
        isHidden: meta.isHidden || false,
        order: meta.order,
        createdAt: now,
        updatedAt: now
      };
      
      console.log(`[PageConfigManager] 加载页面: ${pageConfig.id} (${pageConfig.name}), type: ${resourceType}`);
      return pageConfig;
    });
    
    console.log(`[PageConfigManager] 成功加载 ${this.pages.length} 个页面配置`);
    this.initialized = true;
  }


  /**
   * 获取所有页面配置（按顺序排序）
   */
  async getPages(): Promise<PageConfig[]> {
    if (!this.initialized) {
      await this.init();
    }
    return [...this.pages].sort((a, b) => a.order - b.order);
  }

  /**
   * 获取可见页面配置（排除隐藏的页面）
   */
  async getVisiblePages(): Promise<PageConfig[]> {
    const pages = await this.getPages();
    return pages.filter(p => !p.isHidden);
  }

  /**
   * 根据 ID 获取页面配置
   */
  async getPage(id: string): Promise<PageConfig | undefined> {
    if (!this.initialized) {
      await this.init();
    }
    return this.pages.find(p => p.id === id);
  }

  /**
   * 获取页面配置（从 JSON 配置）
   * 这个方法返回 JSON 配置对象
   */
  getPageConfig(id: string): any {
    return pageConfigLoader.getPageConfig(id);
  }

  /**
   * 重新加载配置
   * 在开发环境中，如果修改了配置文件，可以调用此方法刷新
   */
  reload(): void {
    this.initialized = false;
    this.pages = [];
    this.init();
    console.log('[PageConfigManager] 配置已重新加载');
  }

  /**
   * 检查页面是否存在
   */
  hasPage(id: string): boolean {
    return pageConfigLoader.hasPage(id);
  }

  /**
   * 获取默认页面配置
   * 返回标记为默认的页面列表
   */
  async getDefaultPages(): Promise<PageConfig[]> {
    const pages = await this.getPages();
    return pages.filter(p => p.isDefault);
  }

  /**
   * 获取页面统计信息
   */
  async getStats() {
    if (!this.initialized) {
      await this.init();
    }
    
    return {
      total: this.pages.length,
      visible: this.pages.filter(p => !p.isHidden).length,
      hidden: this.pages.filter(p => p.isHidden).length,
      default: this.pages.filter(p => p.isDefault).length,
      custom: this.pages.filter(p => !p.isDefault).length
    };
  }
}

// 导出单例实例
export const pageConfigManager = new PageConfigManager();
export default pageConfigManager;

// 同时导出类，以便需要时创建新实例
export { PageConfigManager };
