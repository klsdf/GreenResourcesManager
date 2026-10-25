import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourceListView from './ResourceListView.vue'
import { formatPlayTime } from '../utils/formatters'

class FakeGame {
  name = 'Baldur Gate'
  developers = 'Larian'
  playTime = 3661
  lastPlayed = null
  folderSize = 2048
  tags = ['RPG', '回合制', '联机', '中文']
  isFavorite = true
}

;(FakeGame as any).cardDisplayConfig = {
  title: 'name',
  subtitle: 'description',
  extra: 'developers',
  tags: 'tags',
  badge: { field: 'folderSize', formatter: 'formatFolderSize' },
  stats: [
    { field: 'playTime', label: '总时长:', formatter: 'formatPlayTime' },
    { field: 'lastPlayed', label: '', formatter: 'formatLastPlayed' }
  ]
}

const mocks = {
  $lt: (value: string) => value
}

function mountList(props: Record<string, unknown> = {}) {
  return mount(ResourceListView, {
    props: {
      items: [new FakeGame()],
      typeForItem: () => 'game',
      isRunningItem: () => false,
      fileExistsFor: () => true,
      isMultiSelectMode: false,
      isItemSelected: () => false,
      ...props
    },
    global: { mocks }
  })
}

describe('ResourceListView 列表显示', () => {
  it('按资源类的卡片配置铺出名称、开发商、时长、大小和标签列', () => {
    const wrapper = mountList()
    const headers = wrapper.findAll('.resource-list__header .resource-list__cell').map(cell => cell.text())

    expect(headers).toContain('名称')
    expect(headers).toContain('开发商')
    expect(headers).toContain('总时长')
    expect(headers).toContain('最后游玩')
    expect(headers).toContain('大小')
    expect(headers).toContain('标签')

    const row = wrapper.find('.resource-list__row')
    expect(row.text()).toContain('Baldur Gate')
    expect(row.text()).toContain('Larian')
    expect(row.text()).toContain(formatPlayTime(3661))
    expect(row.text()).toContain('2 KB')
    expect(row.text()).toContain('RPG')
    expect(row.text()).toContain('+1')
  })

  it('点击行打开详情，多选模式下改为切换勾选', async () => {
    const plain = mountList()
    await plain.find('.resource-list__row').trigger('click')
    expect(plain.emitted('click')).toHaveLength(1)

    const multi = mountList({ isMultiSelectMode: true })
    await multi.find('.resource-list__row').trigger('click')
    expect(multi.emitted('click')).toBeUndefined()
    expect(multi.emitted('toggle-select')).toHaveLength(1)
  })

  it('文件丢失和运行中的状态在名称旁标出来', () => {
    const wrapper = mountList({
      isRunningItem: () => true,
      fileExistsFor: () => false
    })
    const nameCell = wrapper.find('.resource-list__row .resource-list__cell--name')
    expect(nameCell.text()).toContain('运行中')
    expect(nameCell.find('.resource-list__missing').exists()).toBe(true)
  })
})
