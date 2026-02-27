import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { SingleImage as SingleImageClass } from '@resources/singleImage.ts'

type SingleImage = InstanceType<typeof SingleImageClass>

export class SingleImagePage extends BasePage {
  readonly id = 'single-image'
  readonly name = '单图'
  readonly icon = '🖼️'
  readonly description = '可以管理单一图片文件喵'
  
  // 分页设置键名（用于从设置中读取分页配置）
  readonly settingsKey: string = 'singleImage'
  
  // 默认每页显示数量
  readonly defaultPageSize: number = 20
  
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
      items: [
        {
          type: 'button',
          label: '添加单图',
          action: 'showAddDialog',
          icon: '➕',
          buttonType: 'primary'
        },
        {
          type: 'button',
          label: '批量导入本地资源',
          action: 'showBatchImportDialog',
          icon: '📥'
        },
        {
          type: 'search',
          placeholder: '搜索单图...',
          action: 'filterBySearch'
        },
        {
          type: 'multi-select'
        },
        {
          type: 'layout'
        },
        {
          type: 'sort'
        }
      ],
      sortOptions: this.sortOptions,
      pageType: this.id
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
