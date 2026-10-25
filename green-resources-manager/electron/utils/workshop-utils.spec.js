import { describe, expect, it } from 'vitest'
import workshopUtils from './workshop-utils.js'

const {
  compareVersions,
  normalizeRegistry,
  normalizeManifest,
  buildReleaseAssetUrl,
  isValidRepo,
  isValidModId
} = workshopUtils

describe('workshop-utils / registry', () => {
  it('parses a plain array like Obsidian community-plugins.json', () => {
    const mods = normalizeRegistry([
      {
        id: 'demo-mod',
        name: 'Demo',
        author: 'Author',
        description: 'A demo',
        repo: 'owner/demo',
        tags: ['one', 'one', 'two']
      }
    ])

    expect(mods).toEqual([
      {
        id: 'demo-mod',
        name: 'Demo',
        author: 'Author',
        description: 'A demo',
        repo: 'owner/demo',
        icon: '',
        tags: ['one', 'two']
      }
    ])
  })

  it('supports the { mods: [] } wrapper', () => {
    const mods = normalizeRegistry({
      mods: [{ id: 'demo-mod', name: 'Demo', repo: 'owner/demo' }]
    })
    expect(mods).toHaveLength(1)
  })

  it('drops invalid and duplicate entries instead of failing the whole registry', () => {
    const mods = normalizeRegistry([
      { id: 'demo-mod', name: 'Demo', repo: 'owner/demo' },
      { id: 'demo-mod', name: 'Duplicate', repo: 'owner/other' },
      { id: 'Bad Id', name: 'Bad', repo: 'owner/bad' },
      { id: 'no-repo', name: 'No repo', repo: '' },
      { id: 'path-traversal', name: 'Bad repo', repo: '../evil' }
    ])

    expect(mods.map((mod) => mod.id)).toEqual(['demo-mod'])
  })

  it('rejects an entirely invalid non-empty registry', () => {
    expect(() => normalizeRegistry([{ id: 'Bad Id', repo: 'owner/demo' }])).toThrow()
  })
})

describe('workshop-utils / versions', () => {
  it('compares numeric parts instead of strings', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1)
    expect(compareVersions('v2.0.0', '1.99.99')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.8.0', '0.9.0')).toBe(-1)
  })

  it('treats prerelease as older than the release', () => {
    expect(compareVersions('1.0.0-beta.2', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0.0', '1.0.0-beta.2')).toBe(1)
    expect(compareVersions('1.0.0-beta.1', '1.0.0-beta.2')).toBe(-1)
  })

  it('returns 0 for invalid versions so bad data never looks like an update', () => {
    expect(compareVersions('not-a-version', '1.0.0')).toBe(0)
  })
})

describe('workshop-utils / manifest', () => {
  it('fills defaults and trims fields', () => {
    expect(
      normalizeManifest({
        id: 'demo-mod',
        name: ' Demo ',
        version: '1.2.3',
        description: ' text '
      })
    ).toMatchObject({
      id: 'demo-mod',
      name: 'Demo',
      version: '1.2.3',
      entry: 'index.js',
      description: 'text'
    })
  })

  it('rejects ids with dots because the scanner skips dotted folders', () => {
    expect(isValidModId('demo.mod')).toBe(false)
  })

  it('rejects an entry that escapes the plugin folder', () => {
    expect(() =>
      normalizeManifest({
        id: 'demo-mod',
        name: 'Demo',
        version: '1.0.0',
        entry: '../evil.js'
      })
    ).toThrow()
  })

  it('rejects an invalid minAppVersion', () => {
    expect(() =>
      normalizeManifest({
        id: 'demo-mod',
        name: 'Demo',
        version: '1.0.0',
        entry: 'index.js',
        minAppVersion: '1.0'
      })
    ).toThrow()
  })
})

describe('workshop-utils / release urls', () => {
  it('builds latest release asset urls without the GitHub API', () => {
    expect(buildReleaseAssetUrl('owner/demo', 'index.js')).toBe(
      'https://github.com/owner/demo/releases/latest/download/index.js'
    )
  })

  it('rejects unsafe repo and file values', () => {
    expect(isValidRepo('owner/demo')).toBe(true)
    expect(isValidRepo('owner/demo/extra')).toBe(false)
    expect(isValidRepo('../demo')).toBe(false)
    expect(() => buildReleaseAssetUrl('owner/demo', '../index.js')).toThrow()
  })
})
