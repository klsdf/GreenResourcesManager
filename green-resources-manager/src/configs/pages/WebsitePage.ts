import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Website as WebsiteClass } from '@resources/website.ts'

type Website = InstanceType<typeof WebsiteClass>

export class WebsitePage extends BasePage {
  readonly id = 'websites'
  readonly name = '网站'
  readonly icon = '🌐'
  readonly description = '可以管理网站，需要手动传入网址，也可以拖拽收藏夹进来'
  
  resourceTypes = ['Website']
  
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
      icon: '🌐',
      title: '你的网站库是空的',
      description: '点击"添加网站"按钮来添加你的第一个网站',
      buttonText: '添加第一个网站',
      buttonAction: 'showAddDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      addButtonText: '添加网站',
      searchPlaceholder: '搜索网站...'
    }
  }

  getFilterConfig<T = Website>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const websiteFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (website: any) => {
          return (website as any).tags?.value || []
        },
        isArray: true
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...websiteFilters]
  }
}
