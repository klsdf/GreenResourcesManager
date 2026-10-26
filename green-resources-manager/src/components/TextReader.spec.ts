import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TextReader from './TextReader.vue'
import { MAX_MOUNTED_TEXT_PAGES } from '../utils/textReaderWindow'

const { loadSettings, saveSettings } = vi.hoisted(() => ({
  loadSettings: vi.fn(async () => ({
    novel: { readerSettings: { wordsPerPage: 100 } }
  })),
  saveSettings: vi.fn(async () => true)
}))

vi.mock('../utils/SaveManager.ts', () => ({
  default: { loadSettings, saveSettings }
}))

/** 四十页正文。每页 100 字，用来确认不会把所有页都画出来。 */
const novelText = '字'.repeat(100 * 40)

/**
 * 挂上文本阅读器，并等文件读完。
 * @param props 额外的阅读器参数
 * @returns 挂好的阅读器
 */
async function mountReader(props: Record<string, unknown> = {}) {
  const wrapper = mount(TextReader, {
    props: {
      filePath: 'D:/novels/long.txt',
      wordsPerPage: 100,
      initialPage: 1,
      ...props
    },
    global: {
      mocks: { $lt: (value: string) => value }
    }
  })
  await flushPromises()
  return wrapper
}

describe('文本阅读器无极模式', () => {
  beforeEach(() => {
    loadSettings.mockClear()
    saveSettings.mockClear()
    ;(window as unknown as { electronAPI: { readTextFile: ReturnType<typeof vi.fn> } }).electronAPI = {
      readTextFile: vi.fn(async () => ({ success: true, content: novelText }))
    }
  })

  it('分页模式只显示当前页，不把后面的页挂出来', async () => {
    const wrapper = await mountReader()
    expect(wrapper.findAll('[data-page]')).toHaveLength(0)
    expect(wrapper.find('.novel-text').text()).toBe('字'.repeat(100))
    expect(wrapper.text()).toContain('1 / 40')
  })

  it('无极模式从当前页向后只挂固定页数，几万页也不会全部出现', async () => {
    const wrapper = await mountReader({
      initialPage: 25,
      readerSettings: { readMode: 'infinite', fontSize: 16, lineHeight: 1.6, fontFamily: 'sans-serif', backgroundColor: '#fff', textColor: '#333' }
    })
    const pages = wrapper.findAll('[data-page]')
    expect(pages).toHaveLength(MAX_MOUNTED_TEXT_PAGES)
    expect(pages[0].attributes('data-page')).toBe('25')
    expect(pages[pages.length - 1].attributes('data-page')).toBe(String(25 + MAX_MOUNTED_TEXT_PAGES - 1))
  })

  it('从分页切到无极后，窗口从当前页开始，并且会记住这个选择', async () => {
    const wrapper = await mountReader()
    await wrapper.find('[data-mode="infinite"]').trigger('click')
    await flushPromises()

    const pages = wrapper.findAll('[data-page]')
    expect(pages).toHaveLength(MAX_MOUNTED_TEXT_PAGES)
    expect(pages[0].attributes('data-page')).toBe('1')
    expect(pages[pages.length - 1].attributes('data-page')).toBe(String(MAX_MOUNTED_TEXT_PAGES))
    expect(saveSettings).toHaveBeenCalled()
    const saved = saveSettings.mock.calls.at(-1)?.[0]
    expect(saved.novel.readerSettings.readMode).toBe('infinite')
  })
})
