import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Video as VideoClass } from '@resources/video.ts'

type Video = InstanceType<typeof VideoClass>

export class VideoPage extends BasePage {
  readonly id = 'videos'
  readonly name = '电影'
  readonly icon = '🎬'
  readonly description = '可以管理电影等单一的视频'
  
  // 分页设置键名（用于从设置中读取分页配置）
  readonly settingsKey: string = 'video'
  
  // 默认每页显示数量
  readonly defaultPageSize: number = 20
  
  resourceTypes = ['Video']
  
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
      icon: '🎬',
      title: '你的电影库是空的',
      description: '点击"添加电影"按钮来添加你的第一部电影',
      buttonText: '添加第一部电影',
      buttonAction: 'showAddVideoDialog'
    }
  }
  
  getToolbarConfig() {
    return {
      items: [
        {
          type: 'button',
          label: '添加视频',
          action: 'showAddVideoDialog',
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
          placeholder: '搜索视频...',
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
  
  getDialogConfig() {
    return {
      addTitle: '添加视频',
      editTitle: '编辑视频',
      addButtonText: '添加视频',
      editButtonText: '保存',
      enableRandomizeThumbnail: true
    }
  }

  getFilterConfig<T = Video>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const videoFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        filterType: 'resourceField',
        params: {
          resource: 'video',
          field: 'tags'
        },
        isArray: true
      },
      {
        key: 'actors',
        title: '演员筛选',
        filterType: 'resourceField',
        params: {
          resource: 'video',
          field: 'actors'
        },
        isArray: true
      },
      {
        key: 'series',
        title: '系列筛选',
        filterType: 'resourceField',
        params: {
          resource: 'video',
          field: 'series'
        },
        isArray: false
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...videoFilters]
  }
}
