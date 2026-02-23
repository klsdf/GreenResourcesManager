import { BasePage } from './base/BasePage'
import type { SortOption } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { SingleImage as SingleImageClass } from '@resources/singleImage.ts'

// SingleImage 类型就是 SingleImageClass 的实例类型
type SingleImage = InstanceType<typeof SingleImageClass>

/**
 * 单图页面配置
 */
export class SingleImagePage extends BasePage {
  readonly id = 'single-image'
  readonly name = '单图'
  readonly icon = '🖼️'
  readonly description = '可以管理单一图片文件喵'
  
  resourceTypes = ['SingleImage']
  
  displayLayoutConfig = {
    minWidth: 150,
    maxWidth: 500
  }
  
  getEmptyStateConfig() {
    return {
      icon: '🖼️',
      title: '你的单图库是空的',
      description: '点击"添加单图"按钮来添加你的第一张图片',
      buttonText: '添加第一张图片',
      buttonAction: 'showAddDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      addButtonText: '添加单图',
      searchPlaceholder: '搜索单图...'
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
  getSortConfigForFrontend(sortValue: string): SortConfig<SingleImage> | null {
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
    const fieldAccessor = (image: SingleImage) => {
      const value = (image as any)[dbField]?.value
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
   * 定义单图页面支持的所有筛选器
   * 合并基类的"丢失的资源"筛选和单图特有的筛选器
   */
  getFilterConfig<T = SingleImage>(): FilterConfig<T>[] {
    // 获取基类的筛选配置（包含"丢失的资源"）
    const baseFilters = super.getFilterConfig<T>()
    
    // 单图特有的筛选器
    const singleImageFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (image: any) => {
          return (image as any).tags?.value || []
        },
        isArray: true
      },
      {
        key: 'author',
        title: '作者筛选',
        fieldAccessor: (image: any) => {
          return (image as any).author?.value || ''
        },
        isArray: false
      }
    ] as FilterConfig<T>[]
    
    // 合并基类配置和单图特有配置
    return [...baseFilters, ...singleImageFilters]
  }
}
