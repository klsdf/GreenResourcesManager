import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import workshopService from './workshop-service.js'

const { createWorkshopService } = workshopService

const REGISTRY_URL = 'https://registry.test/community-mods.json'
const MANIFEST_URL = 'https://github.com/owner/demo/releases/latest/download/manifest.json'
const INDEX_URL = 'https://github.com/owner/demo/releases/latest/download/index.js'
const STYLE_URL = 'https://github.com/owner/demo/releases/latest/download/styles.css'

let root
let dirs

function createDirs() {
  return {
    modsRoot: path.join(root, 'mods'),
    cacheRoot: path.join(root, 'cache')
  }
}

function jsonResponse(value) {
  return { status: 200, headers: {}, body: Buffer.from(JSON.stringify(value)) }
}

function textResponse(value) {
  return { status: 200, headers: {}, body: Buffer.from(value) }
}

function notFound() {
  return { status: 404, headers: {}, body: Buffer.alloc(0) }
}

function createService(routes, appVersion = '0.8.0') {
  return createWorkshopService({
    modsRoot: dirs.modsRoot,
    cacheRoot: dirs.cacheRoot,
    registryUrls: [REGISTRY_URL],
    appVersion,
    fetchBuffer: async (url) => routes[url] || notFound()
  })
}

function defaultRoutes() {
  const routes = {
    [REGISTRY_URL]: jsonResponse([
      {
        id: 'demo-mod',
        name: 'Demo',
        author: 'Author',
        description: 'A demo plugin',
        repo: 'owner/demo'
      }
    ]),
    [MANIFEST_URL]: jsonResponse({
      id: 'demo-mod',
      name: 'Demo',
      version: '1.0.0',
      author: 'Author',
      entry: 'index.js'
    }),
    [INDEX_URL]: textResponse('export default { onLoad() {} }'),
    [STYLE_URL]: notFound()
  }
  return routes
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'grm-workshop-'))
  dirs = createDirs()
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('workshop-service', () => {
  it('fetches the registry and caches it for offline use', async () => {
    const routes = defaultRoutes()
    const service = createService(routes)

    const online = await service.getRegistry({ force: true })
    expect(online.success).toBe(true)
    expect(online.mods).toHaveLength(1)
    expect(online.cached).toBe(false)

    delete routes[REGISTRY_URL]
    const offline = await service.getRegistry({ force: true })
    expect(offline.success).toBe(true)
    expect(offline.stale).toBe(true)
    expect(offline.mods[0].id).toBe('demo-mod')
  })

  it('explains when the registry file has not been published', async () => {
    const service = createService({})

    const result = await service.getRegistry({ force: true })
    expect(result.success).toBe(false)
    expect(result.error).toContain('HTTP 404')
    expect(result.error).toContain('community-mods.json')
  })

  it('installs a mod into mods/<id> and records its source', async () => {
    const service = createService(defaultRoutes())
    await service.getRegistry({ force: true })

    const result = await service.installMod({ id: 'demo-mod', repo: 'owner/demo' })
    expect(result.success).toBe(true)

    const pluginDir = path.join(dirs.modsRoot, 'demo-mod')
    const manifest = JSON.parse(await fs.readFile(path.join(pluginDir, 'manifest.json'), 'utf8'))
    const entry = await fs.readFile(path.join(pluginDir, 'index.js'), 'utf8')
    const metadata = JSON.parse(
      await fs.readFile(path.join(dirs.modsRoot, '.workshop', 'demo-mod.json'), 'utf8')
    )

    expect(manifest.version).toBe('1.0.0')
    expect(entry).toContain('onLoad')
    expect(metadata.repo).toBe('owner/demo')
    expect(metadata.files['manifest.json']).toMatch(/^[a-f0-9]{64}$/)
    expect(metadata.files['index.js']).toMatch(/^[a-f0-9]{64}$/)

    const installed = await service.getInstalled()
    expect(installed).toEqual([
      expect.objectContaining({
        id: 'demo-mod',
        repo: 'owner/demo',
        name: 'Demo',
        version: '1.0.0'
      })
    ])
  })

  it('replaces an existing version and checks for updates', async () => {
    const routes = defaultRoutes()
    const service = createService(routes)
    await service.getRegistry({ force: true })
    await service.installMod({ id: 'demo-mod', repo: 'owner/demo' })

    routes[MANIFEST_URL] = jsonResponse({
      id: 'demo-mod',
      name: 'Demo',
      version: '1.1.0',
      author: 'Author',
      entry: 'index.js'
    })
    routes[INDEX_URL] = textResponse('export default { onLoad() { return "v1.1.0" } }')

    const updates = await service.checkUpdates()
    expect(updates.success).toBe(true)
    expect(updates.updates).toEqual([
      {
        id: 'demo-mod',
        repo: 'owner/demo',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0'
      }
    ])

    const installed = await service.installMod({ id: 'demo-mod', repo: 'owner/demo' })
    expect(installed.success).toBe(true)

    const entry = await fs.readFile(
      path.join(dirs.modsRoot, 'demo-mod', 'index.js'),
      'utf8'
    )
    expect(entry).toContain('v1.1.0')

    const installedAfter = await service.getInstalled()
    expect(installedAfter[0].version).toBe('1.1.0')
  })

  it('uninstalls only mods installed from the workshop', async () => {
    const service = createService(defaultRoutes())
    await service.getRegistry({ force: true })
    await service.installMod({ id: 'demo-mod', repo: 'owner/demo' })

    await service.uninstallMod('demo-mod')
    expect(await service.getInstalled()).toEqual([])
    await expect(
      fs.access(path.join(dirs.modsRoot, 'demo-mod'))
    ).rejects.toThrow()

    await expect(service.uninstallMod('demo-mod')).rejects.toThrow()
  })

  it('refuses a repo that does not match the registry entry', async () => {
    const service = createService(defaultRoutes())
    await service.getRegistry({ force: true })

    await expect(
      service.installMod({ id: 'demo-mod', repo: 'evil/demo' })
    ).rejects.toThrow('来源')
  })

  it('refuses a manifest id that does not match the registry', async () => {
    const routes = defaultRoutes()
    routes[MANIFEST_URL] = jsonResponse({
      id: 'other-mod',
      name: 'Other',
      version: '1.0.0',
      entry: 'index.js'
    })
    const service = createService(routes)
    await service.getRegistry({ force: true })

    await expect(
      service.installMod({ id: 'demo-mod', repo: 'owner/demo' })
    ).rejects.toThrow('id')
  })

  it('refuses a plugin that needs a newer app version', async () => {
    const routes = defaultRoutes()
    routes[MANIFEST_URL] = jsonResponse({
      id: 'demo-mod',
      name: 'Demo',
      version: '1.0.0',
      entry: 'index.js',
      minAppVersion: '9.0.0'
    })
    const service = createService(routes)
    await service.getRegistry({ force: true })

    await expect(
      service.installMod({ id: 'demo-mod', repo: 'owner/demo' })
    ).rejects.toThrow('9.0.0')
  })

  it('rejects unsafe ids before touching the filesystem', async () => {
    const service = createService(defaultRoutes())
    await service.getRegistry({ force: true })

    await expect(
      service.installMod({ id: '../evil', repo: 'owner/demo' })
    ).rejects.toThrow('id')
  })

  it('downloads optional styles.css when the release provides it', async () => {
    const routes = defaultRoutes()
    routes[STYLE_URL] = textResponse('.demo { color: red; }')
    const service = createService(routes)
    await service.getRegistry({ force: true })
    await service.installMod({ id: 'demo-mod', repo: 'owner/demo' })

    const style = await fs.readFile(
      path.join(dirs.modsRoot, 'demo-mod', 'styles.css'),
      'utf8'
    )
    expect(style).toContain('color: red')
  })
})
