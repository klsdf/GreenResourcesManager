import { BasePage } from './base/BasePage'
import type { SortOptionConfig } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { Audio as AudioClass } from '@resources/audio.ts'

type Audio = InstanceType<typeof AudioClass>

export class AudioPage extends BasePage {
  readonly id = 'audio'
  readonly name = '声音'
  readonly icon = '🎵'
  readonly description = '可以管理mp3、wav等常见音频文件'
  
  resourceTypes = ['Audio']
  
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
      icon: '🎵',
      title: '你的音频库是空的',
      description: '点击"添加音频"按钮来添加你的第一个音频文件',
      buttonText: '添加第一个音频',
      buttonAction: 'showAddDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      addButtonText: '添加音频',
      searchPlaceholder: '搜索音频...'
    }
  }

  getSortConfigForFrontend(sortValue: string): SortConfig<Audio> | null {
    const config = this.sortOptions.find(opt => opt.id === sortValue)
    if (!config) {
      return null
    }
    
    const fieldAccessor = (audio: Audio) => {
      const value = (audio as any)[config.field]?.value
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

  getFilterConfig<T = Audio>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const audioFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (audio: any) => {
          return (audio as any).tags?.value || []
        },
        isArray: true
      },
      {
        key: 'artist',
        title: '艺术家筛选',
        fieldAccessor: (audio: any) => {
          return (audio as any).artist?.value || ''
        },
        isArray: false
      },
      {
        key: 'actors',
        title: '演员筛选',
        fieldAccessor: (audio: any) => {
          return (audio as any).actors?.value || []
        },
        isArray: true
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...audioFilters]
  }
}
