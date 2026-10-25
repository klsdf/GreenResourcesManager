import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DisplayControls from './DisplayControls.vue'

const { saveDisplayModeSetting, getDisplayModeSetting } = vi.hoisted(() => ({
  saveDisplayModeSetting: vi.fn(() => Promise.resolve(true)),
  getDisplayModeSetting: vi.fn(() => Promise.resolve('grid'))
}))

vi.mock('../utils/SaveManager.ts', () => ({
  default: { saveDisplayModeSetting, getDisplayModeSetting }
}))

const sortOptions = [
  { id: 'name-asc', label: '按名称排序（升序）' },
  { id: 'name-desc', label: '按名称排序（降序）' },
  { id: 'playTime-asc', label: '按游戏时长（升序）' },
  { id: 'playTime-desc', label: '按游戏时长（降序）' }
]

function mountControls(props: Record<string, unknown> = {}) {
  return mount(DisplayControls, {
    props: { sortOptions, ...props },
    global: {
      mocks: { $lt: (value: string) => value }
    }
  })
}

describe('DisplayControls 显示方式与排序', () => {
  it('排序下拉每个字段只留一项，方向跟着旁边的按钮走', async () => {
    const wrapper = mountControls({ sortBy: 'name-desc' })

    const options = wrapper.findAll('.sort-select option')
    expect(options).toHaveLength(2)
    expect(options.map(option => option.text())).toEqual(['按名称排序', '按游戏时长'])
    expect((wrapper.find('.sort-select').element as HTMLSelectElement).value).toBe('name')
    expect(wrapper.find('.sort-order-btn').text()).toBe('↓')

    await wrapper.find('.sort-order-btn').trigger('click')
    expect(wrapper.emitted('update:sortBy')?.[0]).toEqual(['name-asc'])
  })

  it('换排序字段时保留原来的升降序', async () => {
    const wrapper = mountControls({ sortBy: 'name-desc' })

    await wrapper.find('.sort-select').setValue('playTime')

    expect(wrapper.emitted('update:sortBy')?.[0]).toEqual(['playTime-desc'])
    expect(wrapper.emitted('sort-changed')?.[0]).toEqual([
      { pageType: '', sortBy: 'playTime-desc' }
    ])
  })

  it('切到列表会通知页面并记住这一页的样式', async () => {
    saveDisplayModeSetting.mockClear()
    const wrapper = mountControls({ pageType: 'games' })
    await flushPromises()

    await wrapper.findAll('.view-mode-switch__button')[1].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:displayMode')?.[0]).toEqual(['list'])
    expect(wrapper.emitted('display-mode-changed')?.[0]).toEqual([
      { pageType: 'games', displayMode: 'list' }
    ])
    expect(saveDisplayModeSetting).toHaveBeenCalledWith('games', 'list')
  })

  it('没有排序选项或关掉显示方式时，对应控件不出现', () => {
    const wrapper = mountControls({ sortOptions: [], showViewMode: false })

    expect(wrapper.find('.sort-control').exists()).toBe(false)
    expect(wrapper.find('.view-mode-switch').exists()).toBe(false)
  })
})
