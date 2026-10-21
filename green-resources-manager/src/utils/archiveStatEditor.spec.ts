import { describe, expect, it } from 'vitest'
import { Game } from '../configs/resources/game'
import { Manga } from '../configs/resources/manga'
import { Novel } from '../configs/resources/novel'
import { Other } from '../configs/resources/other'
import { BaseResources } from '../configs/resources/base/ResourcesDataBase'
import {
  buildArchiveUpdates,
  collectArchiveStatFields,
  fromDatetimeLocal,
  joinDuration,
  readArchiveStatForm,
  rebuildVisitedSessions,
  splitDuration,
  toDatetimeLocal
} from './archiveStatEditor'

describe('修改游玩记录', () => {
  it('时长按存档单位拆开再拼回去', () => {
    expect(splitDuration(3661, 'seconds')).toEqual({ hours: 1, minutes: 1, seconds: 1 })
    expect(joinDuration({ hours: 1, minutes: 1, seconds: 1 }, 'seconds')).toBe(3661)
    expect(splitDuration(90, 'minutes')).toEqual({ hours: 1, minutes: 30, seconds: 0 })
    expect(joinDuration({ hours: 1, minutes: 90, seconds: 0 }, 'minutes')).toBe(150)
  })

  it('日期输入框来回转换后钟点不变', () => {
    const local = '2020-05-06T07:08'
    expect(toDatetimeLocal(fromDatetimeLocal(local))).toBe(local)
  })

  it('游戏的次数单独保存，只改访问记录的头和尾', () => {
    const game = Game.fromJSON({
      id: 'g1',
      name: '旧档',
      resourceType: 'game',
      playTime: 3661,
      playCount: 3,
      visitedSessions: ['2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z'],
      voiceActor: ['甲']
    })
    const fields = collectArchiveStatFields(game)
    expect(fields.map((field) => field.key)).toEqual(['playTime', 'playCount', 'lastPlayed', 'firstPlayed', 'addedDate'])
    expect(fields.find((field) => field.key === 'playCount')?.sessionCount).toBeFalsy()

    const form = readArchiveStatForm(game, fields)
    form.playTime = { hours: 2, minutes: 0, seconds: 0 }
    form.playCount = 40
    form.firstPlayed = toDatetimeLocal('2019-06-01T08:00:00.000Z')
    form.lastPlayed = toDatetimeLocal('2024-06-01T08:00:00.000Z')

    const updates = buildArchiveUpdates(game, fields, form)
    expect(updates.playTime).toBe(7200)
    expect(updates.playCount).toBe(40)
    expect(updates.visitedSessions).toEqual([
      fromDatetimeLocal(String(form.firstPlayed)),
      '2021-01-01T00:00:00.000Z',
      fromDatetimeLocal(String(form.lastPlayed))
    ])

    Object.keys(updates).forEach((key) => BaseResources.assignSavedValue(game, key, updates[key]))
    const saved = BaseResources.composeSaveData(game, game.getSaveData())
    expect(saved.playCount).toBe(40)
    expect(saved.playTime).toBe(7200)
    expect(saved.voiceActor).toEqual(['甲'])
    expect(saved.visitedSessions).toHaveLength(3)
  })

  it('漫画的浏览次数就是访问记录的条数', () => {
    const manga = Manga.fromJSON({
      id: 'm1',
      name: '旧漫画',
      resourceType: 'manga',
      visitedSessions: ['2020-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z']
    })
    const fields = collectArchiveStatFields(manga)
    expect(fields.find((field) => field.key === 'viewCount')?.sessionCount).toBe(true)
    expect(fields.some((field) => field.key === 'pagesCount')).toBe(false)

    const form = readArchiveStatForm(manga, fields)
    expect(form.viewCount).toBe(2)
    form.viewCount = 4
    const updates = buildArchiveUpdates(manga, fields, form)
    const sessions = updates.visitedSessions as string[]
    expect(sessions).toHaveLength(4)
    expect(sessions[0]).toBe('2020-01-01T00:00:00.000Z')
    expect(sessions[sessions.length - 1]).toBe('2022-01-01T00:00:00.000Z')
  })

  it('次数改成 0 会清空访问记录，改成 1 只留最后一次', () => {
    const sessions = ['2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z']
    expect(rebuildVisitedSessions(sessions, { count: 0 })).toEqual([])
    expect(rebuildVisitedSessions(sessions, { count: 1 })).toEqual(['2022-01-01T00:00:00.000Z'])
  })

  it('小说阅读时长按分钟保存', () => {
    const novel = Novel.fromJSON({
      id: 'n1',
      name: '旧小说',
      resourceType: 'novel',
      readTime: 90,
      readProgress: 10
    })
    const fields = collectArchiveStatFields(novel)
    const duration = fields.find((field) => field.key === 'readTime')
    expect(duration?.durationUnit).toBe('minutes')
    const form = readArchiveStatForm(novel, fields)
    expect(form.readTime).toEqual({ hours: 1, minutes: 30, seconds: 0 })
    form.readProgress = 80
    const updates = buildArchiveUpdates(novel, fields, form)
    expect(updates.readTime).toBe(90)
    expect(updates.readProgress).toBe(80)
  })

  it('没改过的时间会按原来的字符串写回', () => {
    const first = '2020-01-01T00:00:12.345Z'
    const last = '2022-01-01T00:00:59.000Z'
    const game = Game.fromJSON({
      id: 'g3',
      name: '原样',
      resourceType: 'game',
      visitedSessions: [first, last]
    })
    const fields = collectArchiveStatFields(game)
    const form = readArchiveStatForm(game, fields)
    const updates = buildArchiveUpdates(game, fields, form)
    expect(updates.visitedSessions).toEqual([first, last])
  })

  it('正在运行时不改游戏时长', () => {
    const game = Game.fromJSON({ id: 'g2', name: '在玩', resourceType: 'game', playTime: 100, playCount: 1 })
    const fields = collectArchiveStatFields(game)
    const form = readArchiveStatForm(game, fields)
    form.playTime = { hours: 9, minutes: 0, seconds: 0 }
    form.playCount = 8
    const updates = buildArchiveUpdates(game, fields, form, { lockPlayTime: true })
    expect(updates.playTime).toBeUndefined()
    expect(updates.playCount).toBe(8)
  })

  it('其它资源没有单独的次数字段时，按访问记录改次数', () => {
    const other = Other.fromJSON({
      id: 'o1',
      name: '旧档',
      resourceType: 'other',
      visitedSessions: ['2020-01-01T00:00:00.000Z']
    })
    const fields = collectArchiveStatFields(other)
    expect(fields.find((field) => field.key === 'playCount')?.sessionCount).toBe(true)
    const form = readArchiveStatForm(other, fields)
    form.playCount = 3
    form.playTime = { hours: 1, minutes: 0, seconds: 0 }
    const updates = buildArchiveUpdates(other, fields, form)
    expect(updates.visitedSessions).toHaveLength(3)
    expect(updates.playTime).toBe(3600)
  })
})
