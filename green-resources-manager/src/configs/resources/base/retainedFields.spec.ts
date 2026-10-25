import { describe, expect, it } from 'vitest'
import { Audio } from '../audio'
import { Game } from '../game'
import { collapseSortOptions, defsForPage, expandSortOptions } from '../../pages/pageFieldSchema'
import { BaseResources } from './ResourcesDataBase'

describe('页面字段留在资源记录上', () => {
  it('类上没有的字段会跟类字段一起保存', () => {
    const game = Game.fromJSON({
      id: 'g1',
      name: '示例',
      resourceType: 'game',
      voiceActor: ['甲']
    })
    expect(game.name.value).toBe('示例')
    expect(game.retainedFields.voiceActor).toEqual(['甲'])
    const saved = BaseResources.composeSaveData(game, game.getSaveData())
    expect(saved.name).toBe('示例')
    expect(saved.voiceActor).toEqual(['甲'])
    expect(saved.retainedFields).toBeUndefined()
  })

  it('番剧详情挂上的视频列表不会写进存档', () => {
    const game = Game.fromJSON({
      id: 'g1',
      name: '示例',
      resourceType: 'game',
      folderVideos: [{ name: '第一集', path: 'a.mp4' }],
      voiceActor: ['甲']
    })
    expect(game.retainedFields.folderVideos).toBeUndefined()
    expect((game as any).folderVideos).toBeUndefined()
    BaseResources.assignSavedValue(game, 'folderVideos', [{ name: '第二集', path: 'b.mp4' }])
    const saved = BaseResources.composeSaveData(game, game.getSaveData())
    expect(saved.folderVideos).toBeUndefined()
    expect(saved.voiceActor).toEqual(['甲'])
  })

  it('拖拽音频带进来的 playCount 不会写回只读派生属性', () => {
    const audio = Audio.fromJSON({
      id: 'a1',
      name: '示例音频',
      resourceType: 'audio',
      resourcePath: 'D:/music/a.mp3',
      playCount: 0
    })
    expect(audio.playCount).toBe(0)
    expect(audio.retainedFields.playCount).toBeUndefined()
  })

  it('写入新字段时不覆盖记录里已有的另一项', () => {
    const audio = Audio.fromJSON({
      id: 'a1',
      name: '音声',
      resourceType: 'audio',
      engine: 'Kirikiri Z'
    })
    BaseResources.assignSavedValue(audio, 'voiceActor', ['乙'])
    const saved = BaseResources.composeSaveData(audio, audio.getSaveData())
    expect(saved.engine).toBe('Kirikiri Z')
    expect(saved.voiceActor).toEqual(['乙'])
    expect(saved.name).toBe('音声')
  })

  it('旧页面只有字段名时，会用目录里的名字补上定义', () => {
    const defs = defsForPage(['name', 'custom_1'], [{ key: 'custom_1', label: '声优', editor: 'tags' }], [
      { key: 'name', label: '游戏名', editor: 'text' }
    ])
    expect(defs).toEqual([
      { key: 'name', label: '游戏名', editor: 'text' },
      { key: 'custom_1', label: '声优', editor: 'tags' }
    ])
  })

  it('同一种排序收成一条，保存时再写成升序和降序', () => {
    const choices = collapseSortOptions([
      { field: 'name', label: '按名称排序' },
      { field: 'name', label: '按名称排序（降序）' },
      { field: 'addedDate', label: '按添加时间（升序）' }
    ])
    expect(choices).toEqual([
      { field: 'name', label: '按名称排序' },
      { field: 'addedDate', label: '按添加时间' }
    ])
    expect(expandSortOptions(choices)).toEqual([
      { id: 'name-asc', label: '按名称排序', field: 'name', order: 'asc' },
      { id: 'name-desc', label: '按名称排序（降序）', field: 'name', order: 'desc' },
      { id: 'addedDate-asc', label: '按添加时间', field: 'addedDate', order: 'asc' },
      { id: 'addedDate-desc', label: '按添加时间（降序）', field: 'addedDate', order: 'desc' }
    ])
  })
})
