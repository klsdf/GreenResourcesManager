import { findBasicKind } from '../configs/resources/resourceKindCatalog'

/**
 * 单个视频的扩展名。
 * 和基本类型里的「视频」保持同一份名单，避免转换时漏掉页面能播的格式。
 */
export function videoFileExtensions(): string[] {
	const kind = findBasicKind('video')
	return (kind?.extensions || [])
		.filter(ext => ext !== '<folder>' && ext !== '*')
		.map(ext => ext.toLowerCase())
}

/**
 * 路径统一成正斜杠，并去掉末尾斜杠。
 * 同一集不会因为斜杠方向被当成两个文件。
 * @param filePath 原始路径
 */
export function normalizeResourcePath(filePath: string): string {
	return String(filePath || '').replace(/\\/g, '/').replace(/\/+$/, '')
}

/**
 * 文件所在的目录。
 * 没有父目录时返回空字符串，这种路径不能收成一部番剧。
 * @param filePath 文件路径
 */
export function parentDirectory(filePath: string): string {
	const normalized = normalizeResourcePath(filePath)
	const index = normalized.lastIndexOf('/')
	if (index <= 0) return ''
	return normalized.slice(0, index)
}

/**
 * 这些视频是不是都在同一个文件夹里。
 * 番剧对应磁盘上的一个目录。分散在不同目录时不能收成一部。
 * @param filePaths 视频路径
 */
export function sharedParentDirectory(filePaths: string[]): string {
	if (!filePaths.length) return ''
	/** 每个视频的父目录。有一条没有父目录，整组就不能收。 */
	const parents = filePaths.map(parentDirectory)
	if (parents.some(parent => !parent)) return ''
	const first = parents[0].toLowerCase()
	if (!parents.every(parent => parent.toLowerCase() === first)) return ''
	return parents[0]
}

/**
 * 从目录列举结果里挑出视频，并按文件名排序。
 * 列举接口有时只给文件名，这里补上文件夹路径。
 * @param folderPath 视频文件夹
 * @param entries 这一层的文件名或完整路径
 */
export function videoFilesInFolder(folderPath: string, entries: string[]): string[] {
	/** 文件夹本身。后面的相对文件名都拼在它后面。 */
	const folder = normalizeResourcePath(folderPath)
	/** 认作视频的扩展名。 */
	const extensions = new Set(videoFileExtensions())
	/** 这一层里的视频完整路径。 */
	const videos: string[] = []
	for (const entry of entries || []) {
		const raw = String(entry || '').trim()
		if (!raw) continue
		let full = normalizeResourcePath(raw)
		const absolute = /^[A-Za-z]:\//.test(full) || full.startsWith('/')
		if (!absolute) full = folder ? `${folder}/${full}` : full
		const base = full.split('/').pop() || ''
		const dot = base.lastIndexOf('.')
		const ext = dot > 0 ? base.slice(dot).toLowerCase() : ''
		if (!extensions.has(ext)) continue
		videos.push(full)
	}
	videos.sort((left, right) => left.localeCompare(right, 'zh'))
	return videos
}
