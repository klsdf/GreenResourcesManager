import { BasePage } from './base/BasePage'
import type { SortOption } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { Video as VideoClass } from '@resources/video.ts'

// Video 类型就是 VideoClass 的实例类型
type Video = InstanceType<typeof VideoClass>

/**
 * 视频页面配置
 */
export class VideoPage extends BasePage {
  readonly id = 'videos'
  readonly name = '电影'
  readonly icon = '🎬'
  readonly description = '可以管理电影等单一的视频'
  
  resourceTypes = ['Video']
  
  displayLayoutConfig = {
    minWidth: 150,
    maxWidth: 400
  }
  
  getEmptyStateConfig() {
    return {
      icon: '🎬',
      title: '你的电影库是空的',
      description: '点击"添加电影"按钮来添加你的第一部电影',
      buttonText: '添加第一部电影',
      buttonAction: 'showAddVideoDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      addButtonText: '添加视频',
      searchPlaceholder: '搜索视频...'
    }
  }
  
  /**
   * 获取排序配置（用于 SQL 排序）
   * 返回排序配置数组，包含 label、dbField、order
   */
  getSortConfig(): Array<{ label: string, dbField: string, order: 'asc' | 'desc' }> {
    return [
      {
        label: '按名称排序',
        dbField: 'name',
        order: 'asc'
      },
      {
        label: '按名称排序（降序）',
        dbField: 'name',
        order: 'desc'
      },
      {
        label: '按添加时间（升序）',
        dbField: 'addedDate',
        order: 'asc'
      },
      {
        label: '按添加时间（降序）',
        dbField: 'addedDate',
        order: 'desc'
      }
    ]
  }

  /**
   * 获取排序选项配置（用于工具栏显示）
   * 从排序配置生成排序选项，格式为 'dbField-order'
   */
  getSortOptions(): SortOption[] {
    return this.getSortConfig().map(config => ({
      value: `${config.dbField}-${config.order}`,
      label: config.label
    }))
  }

  /**
   * 根据排序值获取排序配置（用于兼容前端排序，如果 SQL 排序失败时使用）
   * @param sortValue 排序值，如 'name-asc' 或 'name-desc'
   * @returns 排序配置，可直接用于 sortBy 工具函数
   */
  getSortConfigForFrontend(sortValue: string): SortConfig<Video> | null {
    // 解析排序值，格式：'dbField-order'
    const parts = sortValue.split('-')
    if (parts.length !== 2) {
      return null
    }
    
    const [dbField, order] = parts
    const config = this.getSortConfig().find(c => c.dbField === dbField && c.order === order)
    if (!config) {
      return null
    }
    
    // 根据数据库字段名创建字段访问器
    const fieldAccessor = (video: Video) => {
      const value = (video as any)[dbField]?.value
      // 如果是日期字段，转换为时间戳
      if (dbField === 'addedDate') {
        return value ? new Date(value).getTime() : null
      }
      return value != null ? value : null
    }
    
    return {
      fieldAccessor,
      order: config.order,
      compareFn: undefined
    }
  }

  /**
   * 获取筛选配置
   * 定义视频页面支持的所有筛选器
   * 合并基类的"丢失的资源"筛选和视频特有的筛选器
   */
  getFilterConfig<T = Video>(): FilterConfig<T>[] {
    // 获取基类的筛选配置（包含"丢失的资源"）
    const baseFilters = super.getFilterConfig<T>()
    
    // 视频特有的筛选器
    const videoFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (video: any) => {
          return (video as any).tags?.value || []
        },
        isArray: true
      },
      {
        key: 'actors',
        title: '演员筛选',
        fieldAccessor: (video: any) => {
          return (video as any).actors?.value || []
        },
        isArray: true
      },
      {
        key: 'series',
        title: '系列筛选',
        fieldAccessor: (video: any) => {
          return (video as any).series?.value || ''
        },
        isArray: false
      }
    ] as FilterConfig<T>[]
    
    // 合并基类配置和视频特有配置
    return [...baseFilters, ...videoFilters]
  }
}
