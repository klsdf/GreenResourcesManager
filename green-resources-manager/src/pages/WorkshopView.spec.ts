import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import WorkshopView from './WorkshopView.vue'
import pluginManager from '../utils/PluginManager'

vi.mock('../utils/PluginManager', () => ({
  default: {
    scanPlugins: vi.fn(async () => []),
    setPluginEnabled: vi.fn(async () => true)
  }
}))

const showToast = vi.fn()
const ToastStub = defineComponent({
  setup(_, { expose }) {
    expose({ show: showToast })
    return () => null
  }
})
const Parent = defineComponent({
  render() {
    return h('div', [h(WorkshopView), h(ToastStub, { ref: 'toastNotification' })])
  }
})

const registryMod = {
  id: 'demo-mod',
  name: 'Demo',
  author: 'Author',
  description: 'A demo plugin',
  repo: 'owner/demo',
  icon: '🧩',
  tags: ['demo']
}

let localPlugins: any[]
let installedMods: any[]
let updates: any[]
let electronAPI: Record<string, any>

function setState({
  plugins = [],
  installed = [],
  availableUpdates = []
}: {
  plugins?: any[]
  installed?: any[]
  availableUpdates?: any[]
}) {
  localPlugins = plugins
  installedMods = installed
  updates = availableUpdates
}

function mountView() {
  return mount(Parent, {
    global: {
      mocks: {
        $lt: (text: string) => text
      }
    }
  })
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

beforeEach(() => {
  setState({})
  showToast.mockReset()

  vi.mocked(pluginManager.scanPlugins).mockImplementation(async () => localPlugins)
  vi.mocked(pluginManager.setPluginEnabled).mockReset()
  vi.mocked(pluginManager.setPluginEnabled).mockResolvedValue(true)

  electronAPI = {
    workshopGetRegistry: vi.fn(async () => ({ success: true, mods: [registryMod] })),
    workshopGetInstalled: vi.fn(async () => ({ success: true, mods: installedMods })),
    workshopCheckUpdates: vi.fn(async () => ({ success: true, updates })),
    workshopInstallMod: vi.fn(async () => ({ success: true })),
    workshopUninstallMod: vi.fn(async () => ({ success: true }))
  }
  ;(window as any).electronAPI = electronAPI
})

describe('WorkshopView', () => {
  it('lists online mods and installs one through IPC', async () => {
    electronAPI.workshopInstallMod.mockImplementation(async () => {
      localPlugins = [
        { id: 'demo-mod', name: 'Demo', version: '1.0.0', enabled: false }
      ]
      installedMods = [
        {
          id: 'demo-mod',
          repo: 'owner/demo',
          name: 'Demo',
          version: '1.0.0',
          installedAt: '2026-10-23T00:00:00.000Z'
        }
      ]
      return { success: true }
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Demo')
    expect(wrapper.text()).toContain('owner/demo')

    const installButton = findButton(wrapper, '安装')
    expect(installButton).toBeTruthy()

    await installButton!.trigger('click')
    await flushPromises()

    expect(electronAPI.workshopInstallMod).toHaveBeenCalledWith({
      id: 'demo-mod',
      repo: 'owner/demo'
    })
    expect(showToast).toHaveBeenCalledWith(
      'success',
      '安装完成',
      expect.stringContaining('Demo')
    )

    expect(findButton(wrapper, '已安装')).toBeTruthy()
    expect(findButton(wrapper, '已安装')!.attributes('disabled')).toBeDefined()
  })

  it('shows an update button with the latest version', async () => {
    setState({
      plugins: [{ id: 'demo-mod', name: 'Demo', version: '1.0.0', enabled: false }],
      installed: [
        {
          id: 'demo-mod',
          repo: 'owner/demo',
          name: 'Demo',
          version: '1.0.0',
          installedAt: '2026-10-23T00:00:00.000Z'
        }
      ],
      availableUpdates: [
        {
          id: 'demo-mod',
          repo: 'owner/demo',
          currentVersion: '1.0.0',
          latestVersion: '1.1.0'
        }
      ]
    })

    const wrapper = mountView()
    await flushPromises()

    const updateButton = findButton(wrapper, '更新到 v1.1.0')
    expect(updateButton).toBeTruthy()
    expect(updateButton!.attributes('disabled')).toBeUndefined()

    await updateButton!.trigger('click')
    await flushPromises()

    expect(electronAPI.workshopInstallMod).toHaveBeenCalledWith({
      id: 'demo-mod',
      repo: 'owner/demo'
    })
  })

  it('uninstalls a workshop mod from the installed tab', async () => {
    setState({
      plugins: [{ id: 'demo-mod', name: 'Demo', version: '1.0.0', enabled: false }],
      installed: [
        {
          id: 'demo-mod',
          repo: 'owner/demo',
          name: 'Demo',
          version: '1.0.0',
          installedAt: '2026-10-23T00:00:00.000Z'
        }
      ]
    })
    vi.stubGlobal('confirm', vi.fn(() => true))

    const wrapper = mountView()
    await flushPromises()

    const installedTab = wrapper.findAll('button').find((button) =>
      button.text().includes('已安装')
    )
    await installedTab!.trigger('click')
    await nextTick()

    const uninstallButton = findButton(wrapper, '卸载')
    expect(uninstallButton).toBeTruthy()

    await uninstallButton!.trigger('click')
    await flushPromises()

    expect(electronAPI.workshopUninstallMod).toHaveBeenCalledWith('demo-mod')
    expect(showToast).toHaveBeenCalledWith(
      'success',
      '已卸载',
      expect.stringContaining('Demo')
    )
  })
})
