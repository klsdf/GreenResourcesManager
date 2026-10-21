// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { writeJsonFile, readJsonFile } = require('./file-utils.js')

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
