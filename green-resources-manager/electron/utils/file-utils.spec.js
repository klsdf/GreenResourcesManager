// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { writeJsonFile, readJsonFile, searchMatchingFiles } = require('./file-utils.js')

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'grm-file-utils-'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(dir, { recursive: true, force: true })
})

describe('JSON 存档文件写入', () => {
  it('自动创建父目录，写完不残留临时文件', async () => {
    const file = join(dir, 'nested', 'deep', 'games.json')
    const data = { games: [{ id: 'g1' }] }

    expect(await writeJsonFile(file, data)).toEqual({ success: true })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(data)

    const names = readdirSync(join(dir, 'nested', 'deep'))
    expect(names.filter(name => name.endsWith('.tmp') || name.endsWith('.old'))).toEqual([])
    expect(await readJsonFile(file)).toEqual({ success: true, data })
  })

  it('覆盖写入前备份旧内容，新内容正常落盘', async () => {
    const file = join(dir, 'games.json')

    await writeJsonFile(file, { version: 1 })
    await new Promise(resolve => setTimeout(resolve, 10))
    await writeJsonFile(file, { version: 2 })

    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ version: 2 })

    const backups = readdirSync(dir).filter(name => name.startsWith('games.json.backup.'))
    expect(backups.length).toBeGreaterThan(0)
    const versions = backups.map(name => JSON.parse(readFileSync(join(dir, name), 'utf8')).version)
    expect(versions).toContain(1)
  })

  it('最多只保留 3 个备份文件', async () => {
    const file = join(dir, 'settings.json')

    for (let version = 0; version < 6; version++) {
      await writeJsonFile(file, { version })
      await new Promise(resolve => setTimeout(resolve, 20))
    }

    await vi.waitFor(() => {
      const backups = readdirSync(dir).filter(name => name.startsWith('settings.json.backup.'))
      expect(backups.length).toBeGreaterThan(0)
      expect(backups.length).toBeLessThanOrEqual(3)
    }, { timeout: 2000, interval: 20 })
  })

  it('数据无法序列化时返回失败，且不破坏原文件', async () => {
    const file = join(dir, 'games.json')
    await writeJsonFile(file, { safe: true })

    const circular = {}
    circular.self = circular

    const result = await writeJsonFile(file, circular)
    expect(result.success).toBe(false)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ safe: true })
  })

  it('允许直接写入 JSON 字符串', async () => {
    const file = join(dir, 'raw.json')

    expect(await writeJsonFile(file, '{"a":1}')).toEqual({ success: true })
    expect(readFileSync(file, 'utf8')).toBe('{"a":1}')
  })
})

describe('JSON 存档文件读取', () => {
  it('文件不存在时返回失败', async () => {
    expect(await readJsonFile(join(dir, 'missing.json'))).toEqual({
      success: false,
      error: '文件不存在'
    })
  })

  it('JSON 损坏时返回失败而不是抛异常', async () => {
    const file = join(dir, 'corrupt.json')
    writeFileSync(file, '{not-json')

    const result = await readJsonFile(file)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('批量搜索文件', () => {
  it('只返回勾选扩展名的文件', async () => {
    mkdirSync(join(dir, 'game'), { recursive: true })
    writeFileSync(join(dir, 'game', 'start.exe'), '')
    writeFileSync(join(dir, 'game', 'run.bat'), '')
    writeFileSync(join(dir, 'game', 'readme.txt'), '')

    const result = await searchMatchingFiles(dir, ['.exe', '.bat'], { maxDepth: 2 })

    expect(result.success).toBe(true)
    expect(result.files.sort()).toEqual([
      join('game', 'run.bat'),
      join('game', 'start.exe')
    ])
  })

  it('本层找到匹配后不再进入子文件夹，兄弟文件夹继续搜索', async () => {
    mkdirSync(join(dir, 'GameA', 'bin'), { recursive: true })
    mkdirSync(join(dir, 'GameB', 'sub'), { recursive: true })
    writeFileSync(join(dir, 'GameA', 'game.exe'), '')
    writeFileSync(join(dir, 'GameA', 'launcher.exe'), '')
    writeFileSync(join(dir, 'GameA', 'bin', 'helper.exe'), '')
    writeFileSync(join(dir, 'GameB', 'sub', 'game.exe'), '')

    const result = await searchMatchingFiles(dir, ['.exe'], {
      maxDepth: 5,
      stopAtFirstMatch: true
    })

    expect(result.success).toBe(true)
    // GameA 本层已经有两个程序，下面的 bin 不再进去；GameB 本层没有，继续往下找到 sub。
    expect(result.files.sort()).toEqual([
      join('GameA', 'game.exe'),
      join('GameA', 'launcher.exe'),
      join('GameB', 'sub', 'game.exe')
    ])
  })

  it('不勾「本层找到后停止」时仍然递归列出子文件夹里的文件', async () => {
    mkdirSync(join(dir, 'GameA', 'bin'), { recursive: true })
    writeFileSync(join(dir, 'GameA', 'game.exe'), '')
    writeFileSync(join(dir, 'GameA', 'bin', 'helper.exe'), '')

    const result = await searchMatchingFiles(dir, ['.exe'], { maxDepth: 5 })

    expect(result.files.sort()).toEqual([
      join('GameA', 'bin', 'helper.exe'),
      join('GameA', 'game.exe')
    ])
  })

  it('folder: 只跳过文件夹，folder:= 只跳过同名文件夹', async () => {
    mkdirSync(join(dir, 'Tool', 'loaders'), { recursive: true })
    mkdirSync(join(dir, 'lib'), { recursive: true })
    mkdirSync(join(dir, 'library'), { recursive: true })
    mkdirSync(join(dir, 'Game'), { recursive: true })
    writeFileSync(join(dir, 'Tool', 'loaders', 'pidfinder.exe'), '')
    writeFileSync(join(dir, 'lib', 'python.exe'), '')
    writeFileSync(join(dir, 'library', 'asset.exe'), '')
    writeFileSync(join(dir, 'Game', 'Tool.exe'), '')
    writeFileSync(join(dir, 'Game', 'main.exe'), '')

    const result = await searchMatchingFiles(dir, ['.exe'], {
      maxDepth: 5,
      excludePatterns: ['folder:tool', 'folder:=lib']
    })

    expect(result.success).toBe(true)
    expect(result.files).toEqual(expect.arrayContaining([
      join('Game', 'Tool.exe'),
      join('Game', 'main.exe'),
      join('library', 'asset.exe')
    ]))
    expect(result.files).not.toContain(join('Tool', 'loaders', 'pidfinder.exe'))
    expect(result.files).not.toContain(join('lib', 'python.exe'))
  })

  it('文件夹模式只收直接含有目标文件的那一层，合集目录继续往下', async () => {
    mkdirSync(join(dir, '我的漫画', '合集', '第一话'), { recursive: true })
    mkdirSync(join(dir, '我的漫画', '单行本'), { recursive: true })
    writeFileSync(join(dir, '我的漫画', '合集', '第一话', '001.jpg'), '')
    writeFileSync(join(dir, '我的漫画', '合集', '第一话', '002.png'), '')
    writeFileSync(join(dir, '我的漫画', '单行本', 'cover.jpg'), '')
    writeFileSync(join(dir, '我的漫画', '说明.txt'), '')

    const result = await searchMatchingFiles(dir, [], {
      maxDepth: 5,
      mode: 'folders',
      folderGroups: [{ id: 'imageFolder', extensions: ['.jpg', '.png'] }]
    })

    expect(result.success).toBe(true)
    expect(result.files.sort()).toEqual([
      join('我的漫画', '单行本'),
      join('我的漫画', '合集', '第一话')
    ])
    expect(result.kinds[join('我的漫画', '合集', '第一话')]).toBe('imageFolder')
    expect(result.kinds[join('我的漫画', '单行本')]).toBe('imageFolder')
  })

  it('选中的文件夹自己就有图片时，收它自己并且不再进入子文件夹', async () => {
    mkdirSync(join(dir, 'extra'), { recursive: true })
    writeFileSync(join(dir, 'page.jpg'), '')
    writeFileSync(join(dir, 'extra', 'more.jpg'), '')

    const result = await searchMatchingFiles(dir, [], {
      maxDepth: 3,
      mode: 'folders',
      folderGroups: [{ id: 'imageFolder', extensions: ['.jpg'] }]
    })

    expect(result.files).toEqual(['.'])
    expect(result.kinds['.']).toBe('imageFolder')
  })

  it('深度为 0 时，根目录没有目标文件就不往下找', async () => {
    mkdirSync(join(dir, '第一话'), { recursive: true })
    writeFileSync(join(dir, '第一话', '001.jpg'), '')

    const result = await searchMatchingFiles(dir, [], {
      maxDepth: 0,
      mode: 'folders',
      folderGroups: [{ id: 'imageFolder', extensions: ['.jpg'] }]
    })

    expect(result.files).toEqual([])
  })

  it('同一层同时有图片和视频时，只按勾选顺序归到前面的那一类', async () => {
    writeFileSync(join(dir, 'a.jpg'), '')
    writeFileSync(join(dir, 'b.mp4'), '')

    const result = await searchMatchingFiles(dir, [], {
      maxDepth: 1,
      mode: 'folders',
      folderGroups: [
        { id: 'imageFolder', extensions: ['.jpg'] },
        { id: 'videoFolder', extensions: ['.mp4'] }
      ]
    })

    expect(result.files).toEqual(['.'])
    expect(result.kinds['.']).toBe('imageFolder')
  })
})
