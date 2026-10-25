import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SAME_RESOURCE_RULE,
  buildSameResourceDescriptor,
  filterSameResourceCandidates,
  matchesSameResource,
  normalizeResourcePath,
  normalizeSameResourceRule,
  pathWithoutDrive,
  resourceFileName,
  resourceParentFolder,
  type SameResourceRule
} from './sameResourceRule'

function rule(criteria: SameResourceRule['criteria'], mode: SameResourceRule['mode'] = 'all'): SameResourceRule {
  return { version: 1, mode, criteria }
}

const standard = rule(['fileName', 'parentFolder'])

describe('normalizeSameResourceRule', () => {
  it('旧存档没有规则时使用默认规则', () => {
    expect(normalizeSameResourceRule(undefined)).toEqual(DEFAULT_SAME_RESOURCE_RULE)
    expect(normalizeSameResourceRule(null)).toEqual(DEFAULT_SAME_RESOURCE_RULE)
  })

  it('过滤未知条件并按固定顺序整理', () => {
    const normalized = normalizeSameResourceRule({
      version: 2,
      mode: 'any',
      criteria: ['fingerprint', 'unknown', 'fileName', 'fileName']
    })
    expect(normalized.version).toBe(2)
    expect(normalized.mode).toBe('any')
    expect(normalized.criteria).toEqual(['fileName', 'fingerprint'])
  })

  it('条件为空时退回默认，避免所有资源都被当成重复', () => {
    expect(normalizeSameResourceRule({ mode: 'all', criteria: [] }).criteria)
      .toEqual(DEFAULT_SAME_RESOURCE_RULE.criteria)
  })
})

describe('路径拆分', () => {
  it('忽略斜杠方向、大小写和末尾斜杠', () => {
    expect(normalizeResourcePath('D:\\Games\\Foo\\')).toBe('d:/games/foo')
    expect(normalizeResourcePath('d:/games/foo')).toBe('d:/games/foo')
  })

  it('文件名默认包含扩展名', () => {
    expect(resourceFileName('D:/Games/Foo/game.exe')).toBe('game.exe')
    expect(resourceFileName('D:/Comics/Foo')).toBe('foo')
  })

  it('文件取所在文件夹，文件夹取它的上一层', () => {
    expect(resourceParentFolder('D:/Games/Foo/foo.exe')).toBe('foo')
    expect(resourceParentFolder('D:/Games/Foo')).toBe('games')
  })

  it('忽略盘符时保留目录层级', () => {
    expect(pathWithoutDrive('D:\\Games\\Foo')).toBe('games/foo')
    expect(pathWithoutDrive('E:/Games/Foo')).toBe('games/foo')
    expect(pathWithoutDrive('D:/Backup/Foo')).not.toBe(pathWithoutDrive('D:/Games/Foo'))
  })

  it('中文、UNC 和空路径不会出错', () => {
    expect(resourceFileName('D:/资源/游戏/启动.exe')).toBe('启动.exe')
    expect(resourceParentFolder('\\\\NAS\\Share\\Foo\\foo.exe')).toBe('foo')
    expect(resourceFileName('')).toBe('')
    expect(resourceParentFolder('')).toBe('')
  })
})

describe('matchesSameResource', () => {
  it('文件名相同但文件夹不同，默认规则不算重复', () => {
    expect(matchesSameResource(
      { path: 'D:/Games/Foo/game.exe' },
      { path: 'D:/Games/Bar/game.exe' },
      standard
    )).toBe(false)
  })

  it('文件名和上一级文件夹相同，换盘也算重复', () => {
    expect(matchesSameResource(
      { path: 'D:/Games/Foo/game.exe' },
      { path: 'E:/Games/Foo/game.exe' },
      standard
    )).toBe(true)
  })

  it('忽略盘符的完整路径能认出换盘后的同一个目录', () => {
    const pathRule = rule(['pathWithoutDrive'])
    expect(matchesSameResource(
      { path: 'D:/Games/Foo' },
      { path: 'E:/Games/Foo' },
      pathRule
    )).toBe(true)
    expect(matchesSameResource(
      { path: 'D:/Backup/Foo' },
      { path: 'D:/Games/Foo' },
      pathRule
    )).toBe(false)
  })

  it('文件大小和扩展名都要相同，文件夹不参与大小比较', () => {
    const sizeRule = rule(['fileSize'])
    expect(matchesSameResource(
      { path: 'D:/Video/a.mp4', fileSize: 1024 },
      { path: 'E:/Video/b.mp4', fileSize: 1024 },
      sizeRule
    )).toBe(true)
    expect(matchesSameResource(
      { path: 'D:/Video/a.mp4', fileSize: 1024 },
      { path: 'D:/Video/a.mkv', fileSize: 1024 },
      sizeRule
    )).toBe(false)
    expect(matchesSameResource(
      { path: 'D:/Games/Foo' },
      { path: 'E:/Games/Foo' },
      sizeRule
    )).toBe(false)
  })

  it('内容指纹使用现有 names / pages / size 身份段', () => {
    const fingerprintRule = rule(['fingerprint'])
    expect(matchesSameResource(
      { path: 'D:/Games/Foo', fingerprint: 'v1|names|120|abc|full' },
      { path: 'E:/Backup/Foo', fingerprint: 'v1|names|120|abc|full' },
      fingerprintRule
    )).toBe(true)
    expect(matchesSameResource(
      { path: 'D:/Comics/Foo', fingerprint: 'v1|pages|20|hash' },
      { path: 'D:/Comics/Foo', fingerprint: 'v1|pages|21|hash' },
      fingerprintRule
    )).toBe(false)
    expect(matchesSameResource(
      { path: 'D:/Video/a.mp4', fingerprint: 'v1|size|1024|.mp4' },
      { path: 'D:/Video/b.mp4', fingerprint: 'v1|size|1024|.mp4' },
      fingerprintRule
    )).toBe(true)
    expect(matchesSameResource(
      { path: 'D:/Games/Foo', fingerprint: 'v1|names|120|abc|partial' },
      { path: 'E:/Games/Foo', fingerprint: 'v1|names|120|abc|partial' },
      fingerprintRule
    )).toBe(false)
  })

  it('all 模式要求全部条件成立', () => {
    const strict = rule(['fileName', 'parentFolder', 'pathWithoutDrive'])
    expect(matchesSameResource(
      { path: 'D:/Games/Foo/game.exe' },
      { path: 'E:/Games/Foo/game.exe' },
      strict
    )).toBe(true)
    expect(matchesSameResource(
      { path: 'D:/Games/Foo/game.exe' },
      { path: 'E:/Other/Foo/game.exe' },
      strict
    )).toBe(false)
  })

  it('any 模式任意一条成立即可', () => {
    const loose = rule(['fileName', 'fileSize'], 'any')
    expect(matchesSameResource(
      { path: 'D:/Games/Foo/game.exe', fileSize: 100 },
      { path: 'E:/Elsewhere/game.exe', fileSize: 999 },
      loose
    )).toBe(true)
  })

  it('缺少条件需要的数据时判为不满足', () => {
    expect(matchesSameResource(
      { path: 'D:/Games/Foo' },
      { path: 'E:/Games/Foo' },
      rule(['fingerprint'])
    )).toBe(false)
  })

  it('空路径不会互相匹配', () => {
    expect(matchesSameResource({ path: '' }, { path: '' }, standard)).toBe(false)
  })
})

describe('filterSameResourceCandidates', () => {
  it('返回所有符合规则的候选，不在匹配器里替调用方选第一条', () => {
    const candidates = [
      buildSameResourceDescriptor({ path: 'E:/Games/Foo/game.exe' }),
      buildSameResourceDescriptor({ path: 'F:/Games/Foo/game.exe' }),
      buildSameResourceDescriptor({ path: 'G:/Games/Bar/game.exe' })
    ]
    const matches = filterSameResourceCandidates(
      { path: 'D:/Games/Foo/game.exe' },
      candidates,
      standard
    )
    expect(matches).toHaveLength(2)
  })
})
