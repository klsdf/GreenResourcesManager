import { describe, expect, it } from 'vitest'
import { getFilterFunctions, isFolderResource } from './filterLibrary'

describe('文件夹筛选', () => {
	const { extractFn, matchFn } = getFilterFunctions('folder', {})

	it('合集、番剧和没有扩展名的目录算文件夹，单个文件不算', () => {
		const collection = { resourceType: 'collection', resourcePath: '' }
		const series = { resourceType: 'animation', resourcePath: 'D:/Anime/火影' }
		const mangaFolder = { resourceType: 'manga', resourcePath: 'D:/Comics/某本' }
		const movie = { resourceType: 'movie', resourcePath: 'D:/Movies/a.mkv' }
		const pdf = { resourceType: 'manga', resourcePath: 'D:/Comics/某本.pdf' }
		expect(isFolderResource(collection)).toBe(true)
		expect(isFolderResource(series)).toBe(true)
		expect(isFolderResource(mangaFolder)).toBe(true)
		expect(isFolderResource(movie)).toBe(false)
		expect(isFolderResource(pdf)).toBe(false)
		expect(extractFn([collection, series, movie, pdf])).toEqual([
			{ name: '文件夹', count: 2 },
			{ name: '不是文件夹', count: 2 }
		])
		expect(matchFn(collection, ['文件夹'], [])).toBe(true)
		expect(matchFn(movie, ['文件夹'], [])).toBe(false)
		expect(matchFn(series, [], ['文件夹'])).toBe(false)
		expect(matchFn(movie, [], [])).toBe(true)
	})
})
