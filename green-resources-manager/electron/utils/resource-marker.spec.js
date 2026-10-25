import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  FOLDER_MARKER_NAME,
  findMarkerLocation,
  getFileMarkerPath,
  getFolderMarkerPath,
  listMarkersNearPath,
  readMarkerFile,
  sanitizeMarkerBaseName,
  writeResourceMarker
} from './resource-marker'

const tempDirs = []

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-marker-'))
  tempDirs.push(dir)
  return dir
}

function writeFile(filePath, content = 'x') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

function writeMarker(resourcePath, resourceId, extra = {}) {
  return writeResourceMarker({
    resourcePath,
    resourceId,
    resourceType: 'game',
    resourceName: 'Test Resource',
    skipHide: true,
    ...extra
  })
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('resource marker paths', () => {
  it('replaces characters Windows does not allow in file names', () => {
    expect(sanitizeMarkerBaseName('a:b*c?.zip')).toBe('a_b_c_.zip')
  })

  it('shortens very long names and keeps them unique', () => {
    const longName = `${'a'.repeat(120)}.zip`
    const first = sanitizeMarkerBaseName(longName)
    const second = sanitizeMarkerBaseName(`${'a'.repeat(119)}b.zip`)
    expect(first.length).toBeLessThanOrEqual(89)
    expect(first).not.toBe(second)
  })

  it('puts folder markers inside the folder and file markers beside the file', () => {
    expect(getFolderMarkerPath('D:\\Games\\Foo')).toBe(path.join('D:\\Games\\Foo', FOLDER_MARKER_NAME))
    expect(getFileMarkerPath('D:\\Games\\Foo\\game.exe')).toBe(
      path.join('D:\\Games\\Foo', '.grm-game.exe.json')
    )
  })
})

describe('writing markers', () => {
  it('writes a folder marker with the resource id', () => {
    const root = makeTempDir()
    const result = writeMarker(root, 'resource-1')

    expect(result.success).toBe(true)
    expect(result.markerPath).toBe(getFolderMarkerPath(root))
    const marker = readMarkerFile(result.markerPath)
    expect(marker).toMatchObject({
      app: 'GreenResourcesManager',
      markerVersion: 1,
      resourceId: 'resource-1',
      resourceType: 'game',
      targetType: 'folder',
      targetFileName: ''
    })
    expect(marker.resourcePath).toBe(path.resolve(root))
  })

  it('writes a sidecar for a single file', () => {
    const root = makeTempDir()
    const filePath = path.join(root, 'game.exe')
    writeFile(filePath)

    const result = writeMarker(filePath, 'resource-2')
    expect(result.success).toBe(true)
    expect(result.markerPath).toBe(path.join(root, '.grm-game.exe.json'))
    expect(readMarkerFile(result.markerPath)).toMatchObject({
      resourceId: 'resource-2',
      targetType: 'file',
      targetFileName: 'game.exe'
    })
  })

  it('keeps an existing marker with the same id when onlyIfMissing is set', () => {
    const root = makeTempDir()
    const filePath = path.join(root, 'game.exe')
    writeFile(filePath)
    writeMarker(filePath, 'resource-1')

    const result = writeMarker(filePath, 'resource-1', { onlyIfMissing: true })
    expect(result).toMatchObject({ success: true, skipped: true })
    expect(readMarkerFile(getFileMarkerPath(filePath)).resourceId).toBe('resource-1')
  })

  it('replaces a stale marker whose id no longer matches the record', () => {
    const root = makeTempDir()
    const filePath = path.join(root, 'game.exe')
    writeFile(filePath)
    writeMarker(filePath, 'old-id')

    const result = writeMarker(filePath, 'new-id', { onlyIfMissing: true })
    expect(result.success).toBe(true)
    expect(result.skipped).toBeUndefined()
    expect(readMarkerFile(getFileMarkerPath(filePath)).resourceId).toBe('new-id')
  })

  it('removes stale sidecars for the same resource after a rename', () => {
    const root = makeTempDir()
    const oldFile = path.join(root, 'old.exe')
    writeFile(oldFile)
    writeMarker(oldFile, 'resource-1')

    const newFile = path.join(root, 'new.exe')
    fs.renameSync(oldFile, newFile)
    writeMarker(newFile, 'resource-1')

    expect(fs.existsSync(getFileMarkerPath(oldFile))).toBe(false)
    expect(readMarkerFile(getFileMarkerPath(newFile)).resourceId).toBe('resource-1')
  })

  it('ignores malformed and foreign marker files', () => {
    const root = makeTempDir()
    const markerPath = path.join(root, '.grm-bad.json')
    fs.writeFileSync(markerPath, '{not json')
    expect(readMarkerFile(markerPath)).toBeNull()

    fs.writeFileSync(markerPath, JSON.stringify({ app: 'OtherApp', resourceId: '1' }))
    expect(readMarkerFile(markerPath)).toBeNull()
  })
})

describe('finding markers', () => {
  it('lists markers near a file, putting the exact file name first', () => {
    const root = makeTempDir()
    const first = path.join(root, 'first.exe')
    const second = path.join(root, 'second.exe')
    writeFile(first)
    writeFile(second)
    writeMarker(first, 'resource-1')
    writeMarker(second, 'resource-2')

    const result = listMarkersNearPath(second)
    expect(result.success).toBe(true)
    expect(result.markers[0].resourceId).toBe('resource-2')
    expect(result.markers).toHaveLength(2)
  })

  it('reads a folder marker only for the folder itself', () => {
    const root = makeTempDir()
    writeMarker(root, 'resource-1')
    const nestedFile = path.join(root, 'cover.jpg')
    writeFile(nestedFile)

    expect(listMarkersNearPath(root).markers).toHaveLength(1)
    expect(listMarkersNearPath(nestedFile).markers).toEqual([])
  })

  it('cannot guess a renamed file from a marker alone', () => {
    const root = makeTempDir()
    const oldFile = path.join(root, 'old.exe')
    writeFile(oldFile)
    writeMarker(oldFile, 'resource-1')

    const newFile = path.join(root, 'new.exe')
    fs.renameSync(oldFile, newFile)

    // 侧车里的文件名还是旧的，自动扫描没法知道新名字；拖进来时能读到标记。
    expect(findMarkerLocation('resource-1', oldFile).newPath).toBeNull()
    expect(listMarkersNearPath(newFile).markers[0].resourceId).toBe('resource-1')
  })

  it('finds a renamed folder in the same parent folder', () => {
    const root = makeTempDir()
    const oldFolder = path.join(root, 'Old Game')
    fs.mkdirSync(oldFolder)
    writeMarker(oldFolder, 'resource-1')

    const newFolder = path.join(root, 'New Game')
    fs.renameSync(oldFolder, newFolder)

    const result = findMarkerLocation('resource-1', oldFolder)
    expect(result).toMatchObject({ success: true, newPath: newFolder, ambiguous: false })
  })

  it('finds a game folder moved into a sibling folder', () => {
    const root = makeTempDir()
    const oldFolder = path.join(root, 'Old Game')
    fs.mkdirSync(oldFolder)
    const exePath = path.join(oldFolder, 'game.exe')
    writeFile(exePath)
    writeMarker(exePath, 'resource-1')

    const newFolder = path.join(root, 'New Game')
    fs.renameSync(oldFolder, newFolder)
    const movedExe = path.join(newFolder, 'game.exe')

    const result = findMarkerLocation('resource-1', exePath)
    expect(result).toMatchObject({ success: true, newPath: movedExe, ambiguous: false })
  })

  it('reports ambiguity when two nearby markers claim the same resource', () => {
    const root = makeTempDir()
    const firstFolder = path.join(root, 'First')
    const secondFolder = path.join(root, 'Second')
    fs.mkdirSync(firstFolder)
    fs.mkdirSync(secondFolder)
    writeMarker(firstFolder, 'resource-1')
    writeMarker(secondFolder, 'resource-1')

    const result = findMarkerLocation('resource-1', path.join(root, 'Missing'))
    expect(result.success).toBe(true)
    expect(result.ambiguous).toBe(true)
    expect(result.newPath).toBeNull()
  })

  it('returns nothing when the parent folder is gone', () => {
    const missingParent = path.join(makeTempDir(), 'gone', 'old.exe')
    const result = findMarkerLocation('resource-1', missingParent)
    expect(result).toMatchObject({ success: true, newPath: null, ambiguous: false })
  })
})
