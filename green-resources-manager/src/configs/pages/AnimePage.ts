import { BasePage } from './base/BasePage'
import type { SortOptionConfig } from '../../types/sort'
import type { SortConfig } from '../../utils/sortBy'
import type { FilterConfig } from '../../types/filter'
import { VideoFolder as VideoFolderClass } from '@resources/videoFolder.ts'

type VideoFolder = InstanceType<typeof VideoFolderClass>

export class AnimePage extends BasePage {
  readonly id = 'anime-series'
  readonly name = '番剧'
  readonly icon = '📺'
  readonly description = '可以管理番剧和电视剧'
  
  resourceTypes = ['Anime']

  readonly showFolderVideosInDetail = true
  
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
      icon: '📺',
      title: '你的番剧库是空的',
      description: '点击"添加番剧"按钮来添加你的第一部番剧',
      buttonText: '添加第一部番剧',
      buttonAction: 'showAddGameDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      addButtonText: '添加番剧',
      searchPlaceholder: '搜索番剧...'
    }
  }

  getSortConfigForFrontend(sortValue: string): SortConfig<VideoFolder> | null {
    const config = this.sortOptions.find(opt => opt.id === sortValue)
    if (!config) {
      return null
    }
    
    const fieldAccessor = (anime: VideoFolder) => {
      const value = (anime as any)[config.field]?.value
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

  getFilterConfig<T = VideoFolder>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const animeFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        fieldAccessor: (anime: any) => {
          return (anime as any).tags?.value || []
        },
        isArray: true
      },
      {
        key: 'actors',
        title: '演员筛选',
        fieldAccessor: (anime: any) => {
          return (anime as any).actors?.value || []
        },
        isArray: true
      },
      {
        key: 'series',
        title: '系列筛选',
        fieldAccessor: (anime: any) => {
          return (anime as any).series?.value || ''
        },
        isArray: false
      },
      {
        key: 'voiceActors',
        title: '声优筛选',
        fieldAccessor: (anime: any) => {
          return (anime as any).voiceActors?.value || []
        },
        isArray: true
      },
      {
        key: 'productionTeam',
        title: '制作组筛选',
        fieldAccessor: (anime: any) => {
          return (anime as any).productionTeam?.value || []
        },
        isArray: true
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...animeFilters]
  }
}
