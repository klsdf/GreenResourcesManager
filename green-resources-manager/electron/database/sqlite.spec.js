import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import Module from 'node:module'
import os from 'node:os'
import path from 'node:path'

const state = vi.hoisted(() => ({
  saveDir: '',
  tables: new Map()
}))

vi.mock('../utils/save-location', () => ({
  resolveSaveDataDirectory: () => state.saveDir
}))

class FakeDatabase {
  exec(sql) {
    for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g)) {
      if (!state.tables.has(match[1])) state.tables.set(match[1], new Map())
    }
  }

  prepare(sql) {
    const tableMatch = sql.match(/FROM "([^"]+)" WHERE id = \?/)
    return {
      get: (...params) => {
        if (sql.includes('sqlite_master')) {
          return state.tables.has(params[0]) ? { name: params[0] } : undefined
        }
        if (!tableMatch) return undefined
        return state.tables.get(tableMatch[1])?.get(params[0])
      }
    }
  }

  close() {}
}

const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'better-sqlite3') return FakeDatabase
  return originalLoad.call(this, request, parent, isMain)
}

const { findResourceById } = await import('./sqlite')

let tempDir = ''

function seed(tableName, resource) {
  if (!state.tables.has(tableName)) state.tables.set(tableName, new Map())
  state.tables.get(tableName).set(resource.id, {
    id: resource.id,
    jsonData: JSON.stringify(resource)
  })
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-sqlite-'))
  state.saveDir = tempDir
  state.tables.clear()
})

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('findResourceById', () => {
  it('finds a resource in any resource table', async () => {
    seed('video', {
      id: 'video-1',
      resourceType: 'video',
      resourcePath: 'D:\\Movies\\one.mp4'
    })
    seed('games', {
      id: 'game-1',
      resourceType: 'game',
      resourcePath: 'D:\\Games\\One\\Game.exe'
    })

    await expect(findResourceById('video-1')).resolves.toEqual({
      ok: true,
      tableName: 'video',
      resource: {
        id: 'video-1',
        resourceType: 'video',
        resourcePath: 'D:\\Movies\\one.mp4'
      }
    })

    await expect(findResourceById('game-1')).resolves.toMatchObject({
      ok: true,
      tableName: 'games',
      resource: { id: 'game-1', resourceType: 'game' }
    })
  })

  it('returns an empty result when the id does not exist', async () => {
    await expect(findResourceById('missing')).resolves.toEqual({ ok: true, resource: null })
  })

  it('treats a blank id as missing', async () => {
    await expect(findResourceById('   ')).resolves.toEqual({ ok: true, resource: null })
  })
})
