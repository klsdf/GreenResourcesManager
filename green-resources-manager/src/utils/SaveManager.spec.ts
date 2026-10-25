import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PAGES_DIR = 'SaveData/pages'
const GAMES_FILE = 'SaveData/Game/games.json'

function clone<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value))
}

function createApi() {
  const files = new Map<string, any>()
  const dirs = new Set<string>()
  const failWrites = new Set<string>()
  const state = {
    saveDirectory: 'SaveData',
    settings: null as any,
    user: null as any,
    settingsSaveResult: { ok: true } as any,
    userSaveResult: { ok: true } as any,
    backupResult: { success: true, backupPath: 'SaveBackup/SaveData_1' } as any
  }

  const api = {
    getSaveDataDirectory: vi.fn(async () => state.saveDirectory),
    ensureDirectory: vi.fn(async (dirPath: string) => {
      dirs.add(dirPath)
      return { success: true }
    }),
    readJsonFile: vi.fn(async (filePath: string) => {
      if (!files.has(filePath)) return { success: false, error: '文件不存在' }
      return { success: true, data: clone(files.get(filePath)) }
    }),
    writeJsonFile: vi.fn(async (filePath: string, data: any) => {
      if (failWrites.has(filePath)) return { success: false, error: '磁盘写入失败' }
      files.set(filePath, clone(data))
      return { success: true }
    }),
    deleteFile: vi.fn(async (filePath: string) => {
      files.delete(filePath)
      return { success: true }
    }),
    deleteDirectory: vi.fn(async () => ({ success: true })),
    listFiles: vi.fn(async (..._args: any[]) => ({ success: true, files: [] as any[] })),
    sqliteGetSettings: vi.fn(async () =>
      state.settings ? { ok: true, settings: clone(state.settings) } : { ok: true }
    ),
    sqliteSaveSettings: vi.fn(async (settings: any) => {
      if (state.settingsSaveResult.ok) state.settings = clone(settings)
      return state.settingsSaveResult
    }),
    sqliteGetUser: vi.fn(async () =>
      state.user ? { ok: true, user: clone(state.user) } : { ok: true }
    ),
    sqliteSaveUser: vi.fn(async (user: any) => {
      if (state.userSaveResult.ok) state.user = clone(user)
      return state.userSaveResult
    }),
    backupSaveDataDirectory: vi.fn(async () => state.backupResult)
  }

  return { api, files, dirs, failWrites, state }
}

async function createManager() {
  vi.resetModules()
  const module = await import('./SaveManager')
  return module.default as any
}

describe('SaveManager 存档保护', () => {
  let ctx: ReturnType<typeof createApi>
  let manager: any

  beforeEach(() => {
    ctx = createApi()
    ;(window as any).electronAPI = ctx.api
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete (window as any).electronAPI
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('创建目录和全部默认数据文件', async () => {
      manager = await createManager()

      expect(await manager.initialize()).toBe(true)

      expect(ctx.api.getSaveDataDirectory).toHaveBeenCalledTimes(1)
      expect(ctx.dirs.has('SaveData/Game')).toBe(true)
      expect(ctx.dirs.has('SaveData/Settings')).toBe(true)
      expect(ctx.dirs.has('SaveData/Video/Covers')).toBe(true)

      expect(ctx.files.get(GAMES_FILE)).toEqual({ games: [] })
      expect(ctx.files.get('SaveData/Video/videos.json')).toEqual({ videos: [] })
      expect(ctx.files.get('SaveData/Settings/collections.json')).toEqual({ collections: [] })
      expect(ctx.files.get('SaveData/Settings/user.json').user.loginHistory).toEqual([])
      expect(ctx.files.get('SaveData/Settings/settings.json').settings.autoBackup).toBe(true)
    })

    it('不会覆盖已经存在的数据文件', async () => {
      const existing = { games: [{ id: 'keep-me' }], timestamp: '2026-01-01T00:00:00.000Z' }
      ctx.files.set(GAMES_FILE, existing)

      manager = await createManager()
      expect(await manager.initialize()).toBe(true)

      expect(ctx.files.get(GAMES_FILE)).toEqual(existing)
      const writtenPaths = ctx.api.writeJsonFile.mock.calls.map((call: any[]) => call[0])
      expect(writtenPaths).not.toContain(GAMES_FILE)
    })

    it('跟随项目记录的存档目录切换所有路径', async () => {
      ctx.state.saveDirectory = 'D:/GreenSaveData'

      manager = await createManager()
      expect(await manager.initialize()).toBe(true)

      expect(manager.dataDirectory).toBe('D:/GreenSaveData')
      expect(manager.filePaths.games).toBe('D:/GreenSaveData/Game/games.json')
      expect(ctx.files.has('D:/GreenSaveData/Game/games.json')).toBe(true)
      expect(ctx.api.ensureDirectory).toHaveBeenCalledWith('D:/GreenSaveData/Video/Covers')
    })

    it('目录创建失败时初始化失败且不写任何文件', async () => {
      ctx.api.ensureDirectory.mockResolvedValueOnce({ success: false })

      manager = await createManager()
      expect(await manager.initialize()).toBe(false)
      expect(ctx.api.writeJsonFile).not.toHaveBeenCalled()
    })
  })

  describe('设置', () => {
    it('合并 SQLite 设置与默认值，并剔除存档位置字段', async () => {
      ctx.state.settings = {
        theme: 'dark',
        saveDataPath: 'D:/old',
        saveDataLocation: 'D:/old',
        sortSettings: { games: 'rating-desc' }
      }

      manager = await createManager()
      const settings = await manager.loadSettings()

      expect(settings.theme).toBe('dark')
      expect(settings.sidebarWidth).toBe(280)
      expect(settings.saveDataPath).toBeUndefined()
      expect(settings.saveDataLocation).toBeUndefined()
      expect(settings.sortSettings.games).toBe('rating-desc')

      await manager.loadSettings()
      expect(ctx.api.sqliteGetSettings).toHaveBeenCalledTimes(1)
    })

    it('保存设置时去掉存档位置并同步缓存', async () => {
      manager = await createManager()
      const settings = {
        ...manager.defaultData.settings,
        theme: 'light',
        saveDataPath: 'D:/secret',
        saveDataLocation: 'D:/secret'
      }

      expect(await manager.saveSettings(settings)).toBe(true)

      const saved = ctx.api.sqliteSaveSettings.mock.calls[0][0]
      expect(saved.theme).toBe('light')
      expect(saved.saveDataPath).toBeUndefined()
      expect(saved.saveDataLocation).toBeUndefined()
      expect(manager.settingsCacheDirty).toBe(false)

      const loaded = await manager.loadSettings()
      expect(loaded.theme).toBe('light')
      expect(ctx.api.sqliteGetSettings).not.toHaveBeenCalled()
    })

    it('SQLite 写入失败时返回 false 并保留脏标记', async () => {
      ctx.state.settingsSaveResult = { ok: false, message: '写入失败' }

      manager = await createManager()
      expect(await manager.saveSettings({ ...manager.defaultData.settings })).toBe(false)
      expect(manager.settingsCacheDirty).toBe(true)
    })

    it('没有 SQLite API 时拒绝保存，避免误报成功', async () => {
      delete (window as any).electronAPI.sqliteSaveSettings

      manager = await createManager()
      expect(await manager.saveSettings({ ...manager.defaultData.settings })).toBe(false)
    })
  })

  describe('页面数据', () => {
    it('保存到 pages 目录，并让缓存与调用方数据隔离', async () => {
      manager = await createManager()
      const data = [{ id: 'a', title: 'A' }]

      expect(await manager.savePageData('game', data)).toBe(true)

      expect(ctx.api.ensureDirectory).toHaveBeenCalledWith(PAGES_DIR)
      expect(ctx.files.get(`${PAGES_DIR}/game.json`)).toEqual(data)

      data[0].title = 'changed-after-save'
      const firstLoad = await manager.loadPageData('game')
      expect(firstLoad).toEqual([{ id: 'a', title: 'A' }])

      firstLoad[0].title = 'changed-after-load'
      expect(await manager.loadPageData('game')).toEqual([{ id: 'a', title: 'A' }])
      expect(ctx.api.readJsonFile).not.toHaveBeenCalled()
    })

    it('从磁盘加载页面数据并复用缓存', async () => {
      ctx.files.set(`${PAGES_DIR}/manga.json`, [{ id: 'm1' }])

      manager = await createManager()
      const loaded = await manager.loadPageData('manga')
      expect(loaded).toEqual([{ id: 'm1' }])

      loaded[0].id = 'mutated'
      expect(await manager.loadPageData('manga')).toEqual([{ id: 'm1' }])
      expect(ctx.api.readJsonFile).toHaveBeenCalledTimes(1)
    })

    it('页面文件格式异常时返回空数组，不把对象当列表', async () => {
      ctx.files.set(`${PAGES_DIR}/novel.json`, { chapters: [] })

      manager = await createManager()
      expect(await manager.loadPageData('novel')).toEqual([])
      expect(await manager.loadPageData('novel')).toEqual([])
      expect(ctx.api.readJsonFile).toHaveBeenCalledTimes(1)
    })

    it('写入失败时不污染已有缓存', async () => {
      ctx.files.set(`${PAGES_DIR}/game.json`, [{ id: 'old' }])

      manager = await createManager()
      expect(await manager.loadPageData('game')).toEqual([{ id: 'old' }])

      ctx.failWrites.add(`${PAGES_DIR}/game.json`)
      expect(await manager.savePageData('game', [{ id: 'new' }])).toBe(false)
      expect(await manager.loadPageData('game')).toEqual([{ id: 'old' }])
    })

    it('切换存档目录后页面数据写到新目录', async () => {
      manager = await createManager()
      expect(manager.setDataDirectory('D:/MySaveData')).toBe(true)

      expect(await manager.savePageData('game', [{ id: 'x' }])).toBe(true)
      expect(ctx.files.has('D:/MySaveData/pages/game.json')).toBe(true)
      expect(manager.filePaths.games).toBe('D:/MySaveData/Game/games.json')
    })

    it('拒绝删除默认页面数据', async () => {
      manager = await createManager()

      expect(await manager.deletePageData('games')).toBe(false)
      expect(ctx.api.deleteDirectory).not.toHaveBeenCalled()

      expect(await manager.deletePageData('custom-page')).toBe(true)
      expect(ctx.api.deleteDirectory).toHaveBeenCalledWith('SaveData/CustomPages/custom-page')
    })
  })

  describe('资源数据', () => {
    it('保存游戏数据时写入版本和时间戳，并隔离缓存', async () => {
      manager = await createManager()
      const games = [{ id: 'g1' }]

      expect(await manager.saveGames(games)).toBe(true)

      const stored = ctx.files.get(GAMES_FILE)
      expect(stored.games).toEqual(games)
      expect(stored.version).toBe(manager.version)
      expect(typeof stored.timestamp).toBe('string')

      games[0].id = 'changed'
      expect(await manager.loadGames()).toEqual([{ id: 'g1' }])
    })

    it('游戏数据损坏时从最近的备份恢复', async () => {
      const backupFile = `${GAMES_FILE}.backup.2026-01-01T00-00-00-000Z`
      ctx.files.set(GAMES_FILE, { games: 'broken' })
      ctx.files.set(backupFile, { games: [{ id: 'restored' }] })
      ctx.api.listFiles.mockResolvedValue({
        success: true,
        files: [{ name: 'games.json.backup.2026-01-01T00-00-00-000Z', path: backupFile, mtime: 1 }]
      })

      manager = await createManager()
      expect(await manager.loadGames()).toEqual([{ id: 'restored' }])
      expect(ctx.files.get(GAMES_FILE)).toEqual({ games: [{ id: 'restored' }] })
      expect(ctx.api.listFiles).toHaveBeenCalledWith('SaveData/Game')
    })
  })

  describe('序列化与成就', () => {
    it('清理无法写入 JSON 的数据类型', async () => {
      manager = await createManager()
      const when = new Date('2026-01-02T03:04:05.000Z')

      const cleaned = manager.cleanDataForSerialization({
        when,
        set: new Set(['a']),
        map: new Map([['k', 'v']]),
        handler: () => {},
        marker: Symbol('x'),
        nested: { handler: () => {}, keep: 'yes' }
      })

      expect(cleaned.when).toBe(when.toISOString())
      expect(cleaned.set).toEqual(['a'])
      expect(cleaned.map).toEqual({ k: 'v' })
      expect('handler' in cleaned).toBe(false)
      expect('marker' in cleaned).toBe(false)
      expect(cleaned.nested).toEqual({ keep: 'yes' })
    })

    it('成就 Map 存档后能还原为 Map', async () => {
      manager = await createManager()
      const states = {
        unlockedAchievements: new Map([['first', true], ['second', false]]),
        lastCheckTime: '2026-01-01T00:00:00.000Z'
      }

      expect(await manager.saveAchievementStates(states)).toBe(true)

      const stored = ctx.files.get('SaveData/Settings/achievements.json')
      expect(stored.achievements.unlockedAchievements).toEqual({ first: true, second: false })

      const loaded = await manager.loadAchievementStates()
      expect(loaded.unlockedAchievements).toBeInstanceOf(Map)
      expect(loaded.unlockedAchievements.get('first')).toBe(true)
    })
  })

  describe('用户数据', () => {
    it('加载用户资料时补齐缺失字段', async () => {
      ctx.state.user = { name: 'Chen', loginHistory: ['2026-01-01T00:00:00.000Z'] }

      manager = await createManager()
      const profile = await manager.loadUserProfile()

      expect(profile.name).toBe('Chen')
      expect(profile.loginHistory).toEqual(['2026-01-01T00:00:00.000Z'])
      expect(profile.checkInDays).toEqual([])
      expect(profile.totalUsageTime).toBe(0)
      expect(typeof profile.joinDate).toBe('string')
    })

    it('开始使用时累计上次会话时长，最多按 24 小时计', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-01T10:00:00.000Z'))
      ctx.state.user = {
        name: 'A',
        joinDate: '2025-01-01T00:00:00.000Z',
        loginHistory: ['2026-02-26T10:00:00.000Z'],
        checkInDays: [],
        totalUsageTime: 100
      }

      manager = await createManager()
      expect(await manager.startUsageTracking()).toBe(true)

      expect(ctx.state.user.totalUsageTime).toBe(100 + 24 * 3600)
      expect(ctx.state.user.loginHistory).toEqual([
        '2026-03-01T10:00:00.000Z',
        '2026-02-26T10:00:00.000Z'
      ])
      const today = new Date()
      const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      expect(ctx.state.user.checkInDays).toEqual([todayText])
    })

    it('再次启动会保留已经记下的登录日，并补上今天', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-02T10:00:00.000Z'))
      ctx.state.user = {
        name: 'A',
        joinDate: '2025-01-01T00:00:00.000Z',
        loginHistory: ['2026-03-01T10:00:00.000Z'],
        checkInDays: ['2026-03-01'],
        totalUsageTime: 10
      }

      manager = await createManager()
      expect(await manager.startUsageTracking()).toBe(true)

      const today = new Date()
      const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      expect(ctx.state.user.checkInDays).toContain('2026-03-01')
      expect(ctx.state.user.checkInDays).toContain(todayText)
      expect(ctx.state.user.checkInDays.filter((day: string) => day === todayText).length).toBe(1)
    })
  })

  describe('缩略图文件', () => {
    it('删除数据库里的相对封面路径时先拼上存档目录', async () => {
      manager = await createManager()
      manager.setDataDirectory('D:/GreenSaveData')

      expect(await manager.deleteThumbnail('videos/covers/123_1.jpg')).toBe(true)

      expect(ctx.api.deleteFile).toHaveBeenCalledWith('D:/GreenSaveData/videos/covers/123_1.jpg')
    })

    it('绝对路径保持原样交给 Electron 删除', async () => {
      manager = await createManager()
      manager.setDataDirectory('D:/GreenSaveData')

      await manager.deleteThumbnail('D:/GreenSaveData/Video/Covers/a_cover_1.jpg')

      expect(ctx.api.deleteFile).toHaveBeenCalledWith('D:/GreenSaveData/Video/Covers/a_cover_1.jpg')
    })

    it('dataURL 不当成文件删除', async () => {
      manager = await createManager()

      expect(await manager.deleteThumbnail('data:image/jpeg;base64,AAAA')).toBe(true)
      expect(ctx.api.deleteFile).not.toHaveBeenCalled()
    })
  })

  describe('整目录备份', () => {
    it('把备份参数和结果原样传递给 Electron', async () => {
      manager = await createManager()

      expect(await manager.backupEntireSaveData()).toEqual({
        success: true,
        backupPath: 'SaveBackup/SaveData_1'
      })
      expect(ctx.api.backupSaveDataDirectory).toHaveBeenCalledWith('SaveData', 5)

      ctx.state.backupResult = { success: false, error: '磁盘空间不足' }
      expect(await manager.backupEntireSaveData(2)).toEqual({
        success: false,
        error: '磁盘空间不足'
      })
      expect(ctx.api.backupSaveDataDirectory).toHaveBeenCalledWith('SaveData', 2)
    })

    it('没有 Electron API 时明确失败', async () => {
      delete (window as any).electronAPI

      manager = await createManager()
      expect(await manager.backupEntireSaveData()).toEqual({
        success: false,
        error: 'Electron API 不可用'
      })
    })
  })
})
