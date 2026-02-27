import { BasePage } from './base/BasePage.ts'
import type { SortOptionConfig } from '../../types/sort'
import type { FilterConfig } from '../../types/filter'
import { Audio as AudioClass } from '@resources/audio.ts'

type Audio = InstanceType<typeof AudioClass>

export class AudioPage extends BasePage {
  readonly id = 'audio'
  readonly name = '声音'
  readonly icon = '🎵'
  readonly description = '可以管理mp3、wav等常见音频文件'
  
  // 分页设置键名（用于从设置中读取分页配置）
  readonly settingsKey: string = 'audio'
  
  // 默认每页显示数量
  readonly defaultPageSize: number = 20
  
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
      items: [
        {
          type: 'button',
          label: '添加音频',
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
          placeholder: '搜索音频...',
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

  getFilterConfig<T = Audio>(): FilterConfig<T>[] {
    const baseFilters = super.getFilterConfig<T>()
    
    const audioFilters: FilterConfig<T>[] = [
      {
        key: 'tags',
        title: '标签筛选',
        filterType: 'resourceField',
        params: {
          resource: 'audio',
          field: 'tags'
        },
        isArray: true
      },
      {
        key: 'artist',
        title: '艺术家筛选',
        filterType: 'resourceField',
        params: {
          resource: 'audio',
          field: 'artist'
        },
        isArray: false
      },
      {
        key: 'actors',
        title: '演员筛选',
        filterType: 'resourceField',
        params: {
          resource: 'audio',
          field: 'actors'
        },
        isArray: true
      }
    ] as FilterConfig<T>[]
    
    return [...baseFilters, ...audioFilters]
  }
}
