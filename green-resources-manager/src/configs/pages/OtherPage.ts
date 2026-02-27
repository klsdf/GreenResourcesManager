import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Other as OtherClass } from '@resources/other.ts'

type Other = InstanceType<typeof OtherClass>

export class OtherPage extends BasePage {
  readonly id = 'other'
  readonly name = '其它'
  readonly icon = '📦'
  readonly description = '可以管理任何类型的文件和文件夹'
  
  // 分页设置键名（用于从设置中读取分页配置）
  readonly settingsKey: string = 'other'
  
  // 默认每页显示数量
  readonly defaultPageSize: number = 20
  
  resourceTypes = ['Other']
  
  displayLayoutConfig = {
    minWidth: 150,
    maxWidth: 400
  }

  sortOptions: SortOptionConfig[] = [
    { id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
    { id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
    { id: 'addedDate-asc', label: '按添加时间（升序）', field: 'addedDate', order: 'asc' },
    { id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' }
  ]
  
  getEmptyStateConfig() {
    return {
      icon: '📦',
      title: '你的其它资源库是空的',
      description: '点击"添加资源"按钮来添加你的第一个资源',
      buttonText: '添加第一个资源',
      buttonAction: 'showAddGameDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      items: [
        {
          type: 'button',
          label: '添加资源',
          action: 'showAddGameDialog',
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
          placeholder: '搜索资源...',
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

  getFilterConfig<T = Other>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const otherFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (other: any) => {
          return (other as any).tags?.value || []
        },
        isArray: true
      },
      {
        key: 'category',
        title: '分类筛选',
        fieldAccessor: (other: any) => {
          return (other as any).category?.value || ''
        },
        isArray: false
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...otherFilters]
  }
}
