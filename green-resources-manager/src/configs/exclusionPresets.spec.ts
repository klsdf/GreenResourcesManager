import { describe, expect, it } from 'vitest'
import {
  EXCLUSION_CATEGORIES,
  buildExcludePatterns,
  getDefaultExcludedCategoryIds
} from './exclusionPresets'

describe('exclusion presets', () => {
  it('covers the runtime executables found in RenPy game folders', () => {
    const patterns = buildExcludePatterns(['renpy'], '')
    expect(patterns).toEqual(expect.arrayContaining([
      'python.exe',
      'pythonw.exe',
      'zsync.exe',
      'zsyncmake.exe',
      'renpy'
    ]))
  })

  it('only returns patterns from the checked categories', () => {
    const patterns = buildExcludePatterns(['unity'], '')
    expect(patterns).toEqual(expect.arrayContaining(['UnityCrashHandler', 'MonoBleedingEdge']))
    expect(patterns).not.toContain('CrashReportClient.exe')
  })

  it('adds custom names and removes duplicates ignoring case', () => {
    const patterns = buildExcludePatterns(['unity'], 'my-tool.exe\nunitycrashhandler\n\nmy-tool.exe\n')
    expect(patterns).toContain('my-tool.exe')
    expect(patterns.filter(pattern => pattern.toLowerCase() === 'unitycrashhandler')).toHaveLength(1)
    expect(patterns.filter(pattern => pattern === 'my-tool.exe')).toHaveLength(1)
  })

  it('skips tool and runtime folders without hiding files with the same name', () => {
    const patterns = buildExcludePatterns(['tool-lib'], '')
    expect(patterns).toEqual(expect.arrayContaining([
      'folder:tool',
      'folder:=lib',
      'folder:=libs',
      'folder:=lib32',
      'folder:=lib64'
    ]))
  })

  it('leaves runtimes that may be the main executable unchecked by default', () => {
    const ids = getDefaultExcludedCategoryIds()
    expect(ids).not.toContain('nwjs')
    expect(ids).not.toContain('java')
  })

  it('never excludes common game executable names', () => {
    const patterns = buildExcludePatterns(
      EXCLUSION_CATEGORIES.map(category => category.id),
      ''
    )
    expect(patterns).not.toContain('Game.exe')
    expect(patterns).not.toContain('launcher.exe')
  })
})
