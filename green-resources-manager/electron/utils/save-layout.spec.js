import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  removeEmptyChildDirectories,
  removeEmptyLegacyCoverDirectories,
  rewriteResourceRecord
} from './save-layout.js'

/** 这次测试用的临时存档根目录 */
let saveDataDir = ''

/**
 * 在临时目录里放一张封面，用来确认文件真的被搬走。
 * @param {string} relativePath 相对 SaveData 的路径
 * @param {string} content 文件内容
 * @returns {string} 写好的绝对路径
 */
function writeCover(relativePath, content) {
  const fullPath = path.join(saveDataDir, ...relativePath.split('/'))
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content)
  return fullPath
}

describe('存档封面目录', () => {
  afterEach(() => {
    if (saveDataDir && fs.existsSync(saveDataDir)) {
      fs.rmSync(saveDataDir, { recursive: true, force: true })
    }
    saveDataDir = ''
  })

  it('把游戏封面收进 Game，描述文字不动', () => {
    saveDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-save-'))
    writeCover('games/covers/game.jpg', 'game-cover')

    const { record, changed } = rewriteResourceRecord('games', {
      coverPath: 'games/covers/game.jpg',
      description: '路径说明 games/covers/ 不要改'
    }, saveDataDir)

    expect(changed).toBe(true)
    expect(record.coverPath).toBe('Game/Covers/game.jpg')
    expect(record.description).toBe('路径说明 games/covers/ 不要改')
    expect(fs.readFileSync(path.join(saveDataDir, 'Game', 'Covers', 'game.jpg'), 'utf8')).toBe('game-cover')
    expect(fs.existsSync(path.join(saveDataDir, 'games', 'covers', 'game.jpg'))).toBe(false)
  })

  it('电影封面进 Video，番剧截帧连同所在文件夹进 AnimeSeries', () => {
    saveDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-save-'))
    writeCover('videos/covers/movie.jpg', 'movie')
    const seriesDir = path.join(saveDataDir, 'Video', 'Covers', 'Series')
    writeCover('Video/Covers/movie-at-root.jpg', 'root-movie')
    writeCover('Video/Covers/Series/episode.jpg', 'episode')
    writeCover('Video/Covers/Series/extra.jpg', 'extra')

    const movie = rewriteResourceRecord('video', {
      thumbnail: 'videos/covers/movie.jpg'
    }, saveDataDir)
    const folder = rewriteResourceRecord('videoFolder', {
      coverPath: 'videos/covers/series.jpg',
      videoThumbnails: {
        'D:/show/episode.mp4': path.join(seriesDir, 'episode.jpg')
      }
    }, saveDataDir)

    expect(movie.record.thumbnail).toBe('Video/Covers/movie.jpg')
    expect(fs.readFileSync(path.join(saveDataDir, 'Video', 'Covers', 'movie.jpg'), 'utf8')).toBe('movie')
    expect(fs.readFileSync(path.join(saveDataDir, 'Video', 'Covers', 'movie-at-root.jpg'), 'utf8')).toBe('root-movie')

    expect(folder.changed).toBe(true)
    expect(folder.record.videoThumbnails['D:/show/episode.mp4'].replace(/\\/g, '/')).toContain('AnimeSeries/Covers/Series/episode.jpg')
    expect(fs.readFileSync(path.join(saveDataDir, 'AnimeSeries', 'Covers', 'Series', 'episode.jpg'), 'utf8')).toBe('episode')
    expect(fs.readFileSync(path.join(saveDataDir, 'AnimeSeries', 'Covers', 'Series', 'extra.jpg'), 'utf8')).toBe('extra')
    expect(fs.existsSync(path.join(seriesDir, 'episode.jpg'))).toBe(false)

    removeEmptyChildDirectories(path.join(saveDataDir, 'Video', 'Covers'))
    expect(fs.existsSync(seriesDir)).toBe(false)
    expect(fs.existsSync(path.join(saveDataDir, 'Video', 'Covers', 'movie-at-root.jpg'))).toBe(true)
  })

  it('已经迁过的路径再跑一次不会改', () => {
    saveDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-save-'))
    writeCover('Game/Covers/game.jpg', 'game-cover')
    const again = rewriteResourceRecord('games', {
      coverPath: 'Game/Covers/game.jpg'
    }, saveDataDir)
    expect(again.changed).toBe(false)
    expect(again.record.coverPath).toBe('Game/Covers/game.jpg')
  })

  it('旧目录搬空以后才删掉，里面还有文件就留着', () => {
    saveDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grm-save-'))
    writeCover('games/covers/left.jpg', 'keep')
    fs.mkdirSync(path.join(saveDataDir, 'images', 'covers'), { recursive: true })

    removeEmptyLegacyCoverDirectories(saveDataDir)

    expect(fs.existsSync(path.join(saveDataDir, 'games', 'covers', 'left.jpg'))).toBe(true)
    expect(fs.existsSync(path.join(saveDataDir, 'images'))).toBe(false)
  })
})
