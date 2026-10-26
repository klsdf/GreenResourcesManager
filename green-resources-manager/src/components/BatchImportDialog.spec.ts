import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BatchImportDialog from './BatchImportDialog.vue'

const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }))
vi.mock('../utils/NotificationService.ts', () => ({
  default: { toast: toastSpy }
}))

const mocks = {
  $lt: (value: string) => value
}

async function openDialog(props: Record<string, unknown> = {}) {
  const { files = [], ...rest } = props
  const wrapper = mount(BatchImportDialog, {
    props: { visible: false, ...rest },
    global: { mocks }
  })
  await wrapper.setProps({ visible: true })
  // 真实流程里结果是在窗口打开之后才到的。
  if ((files as string[]).length > 0) {
    await wrapper.setProps({ files })
  }
  return wrapper
}

function confirmButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('.batch-import__footer-actions .batch-import__button--confirm')
}

describe('BatchImportDialog 确认导入', () => {
  it('点确认后发出勾选的文件，并留在原地等父组件收窗', async () => {
    const wrapper = await openDialog({
      files: ['GameA/a.exe', 'GameA/b.exe'],
      folderPath: 'D:\\Games'
    })

    await confirmButton(wrapper).trigger('click')

    const emitted = wrapper.emitted('confirm')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]).toEqual([['GameA/a.exe', 'GameA/b.exe'], 'D:\\Games'])
    // 以前这里自己关窗，父组件还在扫描时人看不到任何反应；现在由父组件在导入结束后关。
    expect(wrapper.find('.batch-import-overlay').exists()).toBe(true)
  })

  it('没勾选时点确认会提示，而不是静默什么都不发生', async () => {
    toastSpy.mockClear()
    const wrapper = await openDialog({ folderPath: 'D:\\Games' })

    await confirmButton(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(toastSpy).toHaveBeenCalledWith('warning', '提示', '请先勾选要导入的文件')
    expect(wrapper.find('.batch-import-overlay').exists()).toBe(true)
  })

  it('默认在本层找到后停止向下搜索，取消后按原来的递归方式搜', async () => {
    const wrapper = await openDialog({ availableExtensions: ['.exe'] })
    await wrapper.find('.batch-import__path').setValue('D:\\Games')

    await wrapper.find('.batch-import__search-button').trigger('click')
    const firstSearch = wrapper.emitted('search')?.[0]?.[0] as any
    expect(firstSearch.stopAtFirstMatch).toBe(true)

    await wrapper.find('.batch-import__stop-on-match').setValue(false)
    await wrapper.find('.batch-import__search-button').trigger('click')

    const secondSearch = wrapper.emitted('search')?.[1]?.[0] as any
    expect(secondSearch.stopAtFirstMatch).toBe(false)
    expect(firstSearch.mode).toBe('file')
  })

  it('文件夹模式只提交勾选的文件夹类型，不再带文件扩展名', async () => {
    const wrapper = await openDialog({
      availableExtensions: ['.jpg', '.png'],
      folderOptions: [
        { id: 'imageFolder', label: '图片文件夹', extensions: ['.jpg', '.png'] },
        { id: 'videoFolder', label: '视频文件夹', extensions: ['.mp4'] }
      ]
    })
    await wrapper.find('.batch-import__path').setValue('D:\\Manga')
    await wrapper.find('.batch-import__mode-folder').setValue(true)
    const videoBox = wrapper.findAll('.batch-import__type input[type="checkbox"]').find(box => {
      return box.element instanceof HTMLInputElement && box.element.value === 'videoFolder'
    })
    await videoBox?.setValue(false)

    await wrapper.find('.batch-import__search-button').trigger('click')

    const search = wrapper.emitted('search')?.[0]?.[0] as any
    expect(search.mode).toBe('folder')
    expect(search.extensions).toEqual([])
    expect(search.folderGroups).toEqual([
      { id: 'imageFolder', extensions: ['.jpg', '.png'] }
    ])
    expect(wrapper.text()).not.toContain('搜索的文件类型')
  })

  it('导入过程中不重复发确认，并显示当前文件和进度', async () => {
    const wrapper = await openDialog({
      files: ['GameA/a.exe', 'GameA/b.exe'],
      folderPath: 'D:\\Games',
      importing: true,
      importProgress: { current: 2, total: 5, file: 'GameA/b.exe' }
    })

    const button = confirmButton(wrapper)
    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()

    const overlayText = wrapper.find('.batch-import-overlay').text()
    expect(overlayText).toContain('正在导入 2/5')
    expect(overlayText).toContain('GameA/b.exe')
  })
})
