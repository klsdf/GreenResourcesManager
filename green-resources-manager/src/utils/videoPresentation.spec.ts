import { describe, expect, it } from 'vitest'
import { matchLooseFile, matchLooseFolder } from '../configs/resources/resourceKindCatalog'
import { sharedParentDirectory, videoFilesInFolder } from './videoPresentation'

describe('合集里不限类型地认文件', () => {
	it('pdf 按小说认，不按图片文件夹', () => {
		expect(matchLooseFile('.pdf')?.id).toBe('novel')
	})

	it('视频、音频和认不出的扩展名各自归位', () => {
		expect(matchLooseFile('.mkv')?.id).toBe('video')
		expect(matchLooseFile('.flac')?.id).toBe('audio')
		expect(matchLooseFile('.xyz')).toBeUndefined()
	})

	it('文件夹按里面最多的那类文件决定类型', () => {
		expect(matchLooseFolder(['第一集.mp4', '第二集.mkv', '封面.jpg'])?.id).toBe('videoFolder')
		expect(matchLooseFolder(['001.jpg', '002.png'])?.id).toBe('imageFolder')
		expect(matchLooseFolder(['说明.txt'])?.id).toBe('novel')
		expect(matchLooseFolder(['备注.xyz'])).toBeUndefined()
	})
})

describe('番剧和视频合集互相转换时的路径', () => {
	it('只挑出这一层的视频，并按文件名排序', () => {
		const files = videoFilesInFolder('D:/番剧/第一季', ['b.mkv', '海报.jpg', 'a.mp4'])
		expect(files).toEqual(['D:/番剧/第一季/a.mp4', 'D:/番剧/第一季/b.mkv'])
	})

	it('同一文件夹可以收成番剧，分散在两处则不行', () => {
		expect(sharedParentDirectory(['D:/季/01.mp4', 'D:/季/02.mkv'])).toBe('D:/季')
		expect(sharedParentDirectory(['D:/季/01.mp4', 'E:/另一季/02.mkv'])).toBe('')
	})
})
