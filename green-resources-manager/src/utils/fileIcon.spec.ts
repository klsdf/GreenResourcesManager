import { describe, expect, it } from 'vitest'
import { fileExtensionOf, getFileIconKind, usesNativeFileIcon } from './fileIcon'

describe('批量导入文件图标', () => {
  it('从带路径的文件名里取扩展名', () => {
    expect(fileExtensionOf('Game\\bin\\game.exe')).toBe('.exe')
    expect(fileExtensionOf('Game/bin/game.EXE')).toBe('.exe')
    expect(fileExtensionOf('README')).toBe('')
  })

  it('exe 和快捷方式使用程序自带的图标', () => {
    expect(getFileIconKind('Game\\game.exe')).toBe('app')
    expect(getFileIconKind('Desktop\\game.lnk')).toBe('app')
    expect(usesNativeFileIcon('Game\\game.exe')).toBe(true)
    expect(usesNativeFileIcon('Desktop\\game.lnk')).toBe(true)
    expect(usesNativeFileIcon('Game\\data.zip')).toBe(false)
  })

  it('压缩包、bat 和 swf 使用各自的图标', () => {
    expect(getFileIconKind('Game\\data.zip')).toBe('archive')
    expect(getFileIconKind('Game\\data.cbz')).toBe('archive')
    expect(getFileIconKind('Game\\setup.msi')).toBe('archive')
    expect(getFileIconKind('Game\\start.bat')).toBe('terminal')
    expect(getFileIconKind('Game\\movie.swf')).toBe('flash')
  })

  it('按资源目录识别图片、视频、音频和小说', () => {
    expect(getFileIconKind('Game\\cover.webp')).toBe('image')
    expect(getFileIconKind('Game\\video.mkv')).toBe('video')
    expect(getFileIconKind('Game\\music.flac')).toBe('audio')
    expect(getFileIconKind('Game\\story.epub')).toBe('novel')
    expect(getFileIconKind('Game\\story.pdf')).toBe('novel')
  })

  it('认不出的类型退回普通文件图标', () => {
    expect(getFileIconKind('Game\\readme.xyz')).toBe('file')
  })
})
