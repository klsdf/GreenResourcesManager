import { describe, expect, it } from 'vitest'
import {
  addTrackToSavedPlaylist,
  appendPlaylistTrack,
  normalizePlaylistTrack,
  resolvePlaybackQueue,
  type PlaylistTrack
} from './audioPlaylist'

/** 测试用的一首歌。 */
function track(partial: Partial<PlaylistTrack> & { path: string }): PlaylistTrack {
  return {
    id: partial.id || partial.path,
    name: partial.name || '未命名',
    artist: partial.artist || '',
    path: partial.path,
    coverPath: partial.coverPath || '',
    duration: partial.duration || 0,
    description: partial.description || '',
    tags: partial.tags || [],
    actors: partial.actors || []
  }
}

describe('音乐播放列表', () => {
  it('点播放时，不在列表里的歌只单独播放', () => {
    const saved = [track({ id: 'a', name: '甲', path: 'D:/music/a.mp3' })]
    const clicked = track({ id: 'b', name: '乙', path: 'D:/music/b.mp3' })
    const queue = resolvePlaybackQueue(saved, clicked)
    expect(queue.fromSaved).toBe(false)
    expect(queue.tracks.map((item) => item.id)).toEqual(['b'])
    expect(queue.startIndex).toBe(0)
  })

  it('点到已经添加的歌时，播放整份列表并从这一首开始', () => {
    const saved = [
      track({ id: 'a', name: '甲', path: 'D:/music/a.mp3' }),
      track({ id: 'b', name: '乙', path: 'D:/music/b.mp3' })
    ]
    const queue = resolvePlaybackQueue(saved, track({ id: 'b', name: '乙', path: 'D:/music/b.mp3' }))
    expect(queue.fromSaved).toBe(true)
    expect(queue.tracks.map((item) => item.name)).toEqual(['甲', '乙'])
    expect(queue.startIndex).toBe(1)
  })

  it('同一路径大小写不同也算已经在列表里', () => {
    const saved = [track({ id: 'a', path: 'D:/Music/A.mp3' })]
    const next = appendPlaylistTrack(saved, track({ id: 'other', path: 'd:\\music\\a.mp3' }))
    expect(next.added).toBe(false)
    expect(next.tracks).toHaveLength(1)
  })

  it('没有文件路径的音频不能进列表', () => {
    expect(normalizePlaylistTrack({ id: 'x', name: '空' })).toBeNull()
    expect(normalizePlaylistTrack({
      id: { value: 'song-1' },
      name: { value: '夜航' },
      resourcePath: { value: 'D:/music/night.flac' },
      tags: { value: ['轻音乐'] }
    })).toMatchObject({
      id: 'song-1',
      name: '夜航',
      path: 'D:/music/night.flac',
      tags: ['轻音乐']
    })
  })

  it('数据库不可用时添加失败，不会假装已经记下', async () => {
    const result = await addTrackToSavedPlaylist(track({ path: 'D:/music/a.mp3' }))
    expect(result).toEqual({ added: false, saved: false })
  })
})
