import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FunPagination from './FunPagination.vue'

const FunButtonStub = {
  name: 'FunButton',
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
}

const mocks = {
  $lt: (value: string) => value
}

function mountPagination(props: Record<string, unknown> = {}) {
  return mount(FunPagination, {
    props: {
      currentPage: 2,
      totalPages: 14,
      pageSize: 30,
      totalItems: 393,
      itemType: '游戏',
      ...props
    },
    global: {
      mocks,
      components: { 'fun-button': FunButtonStub }
    }
  })
}

describe('FunPagination 单行布局', () => {
  it('范围和翻页控件在同一行，跳转处显示当前页和总页数', () => {
    const wrapper = mountPagination()

    const root = wrapper.find('.fun-pagination')
    expect(root.find('.fun-pagination__summary').exists()).toBe(true)
    expect(root.find('.fun-pagination__controls').exists()).toBe(true)
    expect(root.find('.fun-pagination__summary').text()).toContain('显示第 31 - 60 个')
    expect(root.find('.fun-pagination__summary').text()).toContain('共 393 个游戏')
    expect(root.find('.fun-pagination__jump-input').element.value).toBe('2')
    expect(root.find('.fun-pagination__jump-total').text()).toContain('/ 14')
  })

  it('输入页码后按回车跳转，超出范围时回到当前页', async () => {
    const wrapper = mountPagination()
    const input = wrapper.find('.fun-pagination__jump-input')

    await input.setValue(5)
    await input.trigger('keyup.enter')
    expect(wrapper.emitted('page-change')?.[0]).toEqual([5])

    await input.setValue(99)
    await input.trigger('keyup.enter')
    expect(wrapper.emitted('page-change')).toHaveLength(1)
    expect((input.element as HTMLInputElement).value).toBe('2')
  })

  it('上一页和下一页按当前页与总页数禁用', async () => {
    const wrapper = mountPagination({ currentPage: 1 })
    expect(wrapper.find('.fun-pagination__button--prev').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ currentPage: 14 })
    expect(wrapper.find('.fun-pagination__button--next').attributes('disabled')).toBeDefined()
  })

  it('右侧插槽放显示设置，列表为空时这一条也保留', () => {
    const wrapper = mount(FunPagination, {
      props: {
        currentPage: 1,
        totalPages: 0,
        pageSize: 30,
        totalItems: 0,
        itemType: '游戏'
      },
      slots: { actions: '<div class="test-actions">显示设置</div>' },
      global: {
        mocks,
        components: { 'fun-button': FunButtonStub }
      }
    })

    expect(wrapper.find('.fun-pagination').exists()).toBe(true)
    expect(wrapper.find('.fun-pagination__controls').exists()).toBe(false)
    expect(wrapper.find('.fun-pagination__actions .test-actions').text()).toBe('显示设置')
  })

  it('有数据时翻页和右侧设置同时渲染', () => {
    const wrapper = mount(FunPagination, {
      props: {
        currentPage: 2,
        totalPages: 14,
        pageSize: 30,
        totalItems: 393,
        itemType: '游戏'
      },
      slots: { actions: '<div class="test-actions">显示设置</div>' },
      global: {
        mocks,
        components: { 'fun-button': FunButtonStub }
      }
    })

    expect(wrapper.find('.fun-pagination__controls').exists()).toBe(true)
    expect(wrapper.find('.fun-pagination__actions').exists()).toBe(true)
  })
})
