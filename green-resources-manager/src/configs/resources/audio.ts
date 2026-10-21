import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectFile, 
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 音频类
 */
export class Audio extends BaseResources {

	// 接受的文件扩展名
	static acceptedExtensions = [
		'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',  // 常见音频格式
		'.opus', '.ape', '.alac', '.aiff', '.mid', '.midi'  // 其他音频格式
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'audio'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('音频名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('备注', false)
	})
	
	artist: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('艺术家', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('标签', false)
	})
	
	actors: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('演员', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('音频文件', [
			{ name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'] },
			{ name: '所有文件', extensions: ['*'] }
		], true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('缩略图', [
			{ name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'] },
			{ name: '所有文件', extensions: ['*'] }
		], false)
	})

	/** 音频时长（秒） */
	duration: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastPlayed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	get playCount(): number {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) ? arr.length : 0
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'artist', 'tags', 'actors', 'resourcePath', 'coverPath']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'audio',
			name: this.name.value || '',
			description: this.description.value || '',
			artist: this.artist.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			actors: Array.isArray(this.actors.value) ? [...this.actors.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			duration: this.duration.value ?? 0,
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false,
			finished: this.finished.value === true,
			finishedAt: this.finished.value === true ? (this.finishedAt.value || '') : ''
		}
	}

	// 静态配置：编辑对话框配置
	static editDialogConfig = {
		addTitle: '添加音频',
		editTitle: '编辑音频',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'play', icon: '▶️', label: '播放' },
		{ key: 'addToPlaylist', icon: '➕', label: '添加到播放列表' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'delete', icon: '🗑️', label: '删除音频' }
	]

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'play',
		icon: '▶️',
		label: '播放',
		handlerName: 'playAudio' // 组件中对应的方法名
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未播放',
			justAccessed: '刚刚',
			accessAction: '播放',
			yesterdayAccessed: '昨天'
		}
	}

	// 静态方法：获取默认图标路径
	static getDefaultIcon() {
		return './default-audio.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', // 标题：使用 name 字段
		subtitle: 'artist', // 副标题：艺术家字段
		extra: 'description', // 额外信息：描述字段（备注）
		tags: 'tags', // 标签字段
		maxTags: 3, // 最多显示 3 个标签
		badge: {
			field: 'duration',
			formatter: 'formatAudioDuration'
		},
		specialItems: [
			{
				field: 'actors',
				label: '演员:',
				isArray: true,
				maxArrayItems: 2,
				arrayJoin: ', '
			}
		],
		stats: [
			{
				type: 'count' as const,
				field: 'playCount',
				label: '播放',
				formatter: 'formatPlayCount'
			},
			{
				type: 'date' as const,
				field: 'lastPlayed',
				label: '',
				formatter: 'formatLastPlayed'
			}
		]
	}

	// 静态配置：详情页显示配置
	static detailPanelConfig = {
		title: {
			field: 'name',
			formatter: undefined
		},
		objectiveInfo: [
			{
				field: 'artist',
				label: '艺术家',
				formatter: undefined
			},
			{
				field: 'actors',
				label: '演员',
				formatter: undefined,
				arrayJoin: '、'
			},
			{
				field: 'resourcePath',
				label: '音频路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'playCount',
				label: '播放次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastPlayed',
				label: '最后播放',
				formatter: 'formatLastPlayed',
				defaultValue: '从未播放'
			},
			{
				field: 'addedDate',
				label: '添加时间',
				formatter: 'formatDate',
				defaultValue: '未知'
			}
		],
		actions: [
			{
				key: 'play',
				icon: '▶️',
				label: '播放',
				class: 'btn-play'
			},
			{
				key: 'folder',
				icon: '📁',
				label: '打开文件夹',
				class: 'btn-open-folder'
			},
			{
				key: 'edit',
				icon: '✏️',
				label: '编辑信息',
				class: 'btn-edit'
			},
			{
				key: 'delete',
				icon: '🗑️',
				label: '删除音频',
				class: 'btn-remove'
			}
		]
	}
}
