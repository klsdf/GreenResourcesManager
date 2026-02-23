import { BasePage } from './base/BasePage'
import type { SortOptionConfig } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { SingleImage as SingleImageClass } from '@resources/singleImage.ts'

type SingleImage = InstanceType<typeof SingleImageClass>

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

  sortOptions: SortOptionConfig[] = [
    { id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
    { id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
    { id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
    { id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' }
  ]
  
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

  getSortConfigForFrontend(sortValue: string): SortConfig<SingleImage> | null {
    const config = this.sortOptions.find(opt => opt.id === sortValue)
    if (!config) {
      return null
    }
    
    const fieldAccessor = (image: SingleImage) => {
      const value = (image as any)[config.field]?.value
      if (config.field === 'addedDate') {
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

  getFilterConfig<T = SingleImage>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
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
    
    return [...baseFilters, ...singleImageFilters]
  }
}
