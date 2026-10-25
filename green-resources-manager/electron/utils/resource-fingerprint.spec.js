import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  computeResourceFingerprint,
  computeResourceFingerprintAsync,
  findRelocatedResourceAsync
} from './resource-fingerprint'
import { writeResourceMarker } from './resource-marker'

const tempDirs = []

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-fingerprint-'))
  tempDirs.push(dir)
  return dir
}

function writeFiles(dir, names) {
  for (const name of names) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, 'content')
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('resource fingerprint with markers', () => {
  it('does not change when a marker file is written into the folder', () => {
    const plainDir = makeTempDir()
    const markedDir = makeTempDir()
    const files = ['a.dat', 'sub/b.dat']
    writeFiles(plainDir, files)
    writeFiles(markedDir, files)

    const before = computeResourceFingerprint(plainDir, 'names')
    const written = writeResourceMarker({
      resourcePath: markedDir,
      resourceId: 'resource-1',
      resourceType: 'game',
      skipHide: true
    })
    expect(written.success).toBe(true)

    const after = computeResourceFingerprint(markedDir, 'names')
    expect(before.success).toBe(true)
    expect(after.success).toBe(true)
    expect(after.fingerprint).toBe(before.fingerprint)
  })
})

describe('async resource fingerprint', () => {
  it('matches the sync result for folders, image folders and files', async () => {
    const gameDir = makeTempDir()
    writeFiles(gameDir, ['a.dat', 'sub/b.dat'])
    expect(await computeResourceFingerprintAsync(gameDir, 'names'))
      .toEqual(computeResourceFingerprint(gameDir, 'names'))

    const mangaDir = makeTempDir()
    writeFiles(mangaDir, ['1.png', '2.jpg', 'sub/3.webp'])
    expect(await computeResourceFingerprintAsync(mangaDir, 'pages'))
      .toEqual(computeResourceFingerprint(mangaDir, 'pages'))

    const fileDir = makeTempDir()
    const moviePath = path.join(fileDir, 'movie.mp4')
    fs.writeFileSync(moviePath, 'video-content')
    expect(await computeResourceFingerprintAsync(moviePath, 'size'))
      .toEqual(computeResourceFingerprint(moviePath, 'size'))
  })

  it('shares one directory scan for several exes but keeps each anchor', async () => {
    const dir = makeTempDir()
    writeFiles(dir, ['data.pak', 'sub/level.dat'])
    const firstPath = path.join(dir, 'game.exe')
    const secondPath = path.join(dir, 'tool.exe')
    fs.writeFileSync(firstPath, 'a')
    fs.writeFileSync(secondPath, 'b')

    const first = await computeResourceFingerprintAsync(firstPath, 'names')
    const second = await computeResourceFingerprintAsync(secondPath, 'names')
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)

    const firstParts = first.fingerprint.split('|')
    const secondParts = second.fingerprint.split('|')
    // 同一个目录的清单和哈希一样，只有启动文件名各自不同。
    expect(firstParts.slice(0, 4)).toEqual(secondParts.slice(0, 4))
    expect(firstParts[4]).toBe('game.exe')
    expect(secondParts[4]).toBe('tool.exe')
  })

  it('finds a renamed sibling folder', async () => {
    const parent = makeTempDir()
    const oldDir = path.join(parent, 'old-name')
    fs.mkdirSync(oldDir)
    writeFiles(oldDir, ['a.dat', 'sub/b.dat'])

    const fingerprint = (await computeResourceFingerprintAsync(oldDir, 'names')).fingerprint
    expect(fingerprint).toBeTruthy()

    fs.renameSync(oldDir, path.join(parent, 'new-name'))
    const result = await findRelocatedResourceAsync(oldDir, fingerprint, false)
    expect(result.success).toBe(true)
    expect(result.newPath).toBe(path.join(parent, 'new-name'))
  })
})
