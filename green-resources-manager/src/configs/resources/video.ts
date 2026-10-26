import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_Date,
	FormField_SelectFile, 
	FormField_SelectVideoThumbnail,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 视频类
 */
export class Video extends BaseResources {

	// 接受的文件扩展名
	static acceptedExtensions = [
		'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm',  // 常见视频格式
		'.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts'  // 其他视频格式
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'movie'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('视频名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('视频描述', false)
	})
	
	series: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('系列名', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('视频标签', false)
	})
	
	actors: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('演员', false)
	})

	/**
	 * 影片发行日期，存成 YYYY-MM-DD。
	 * 侧边栏按这个字符串筛选，空着的归到「未填写」。
	 */
	releaseDate: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: '',
		editType: new FormField_Date('发行日期', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('视频文件', [
			{ name: '视频文件', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'] },
			{ name: '所有文件', extensions: ['*'] }
		], true)
	})
	
	thumbnail: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectVideoThumbnail('缩略图', false)
	})

	// 视频时长（分钟）
	duration: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	/**
	 * 上次看到的秒数。
	 * 播放页按文件路径写回这个值，下次打开从这里继续，而不是总是从头播放。
	 */
	playbackSeconds: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	/**
	 * 看到的百分比，0 到 100。
	 * 卡片上的进度条读这个值。和秒数分开存，是因为列表上不需要再算片长。
	 */
	watchProgress: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	/**
	 * 片长，单位是秒。
	 * 资源上的 duration 是分钟，恢复播放时要用秒来判断是不是停在片尾。
	 */
	playbackDuration: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastWatched(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	get watchCount(): number {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) ? arr.length : 0
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'series', 'tags', 'actors', 'releaseDate', 'resourcePath', 'thumbnail', 'duration']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
		getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'video',
			name: this.name.value || '',
			description: this.description.value || '',
			series: this.series.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			actors: Array.isArray(this.actors.value) ? [...this.actors.value] : [],
			releaseDate: this.releaseDate.value || '',
			resourcePath: this.resourcePath.value || '',
			thumbnail: this.thumbnail.value || '',
			duration: this.duration.value ?? 0,
			playbackSeconds: Number(this.playbackSeconds.value) || 0,
			watchProgress: Number(this.watchProgress.value) || 0,
			playbackDuration: Number(this.playbackDuration.value) || 0,
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
		addTitle: '添加视频',
		editTitle: '编辑视频',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'play', icon: '▶️', label: '播放视频' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除视频' }
	]

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'play',
		icon: '▶️',
		label: '播放视频',
		handlerName: 'playVideo' // 组件中对应的方法名
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未观看',
			justAccessed: '刚刚',
			accessAction: '观看',
			yesterdayAccessed: '昨天'
		}
	}

	// 静态方法：获取默认图标路径
	static getDefaultIcon() {
		return './default-video.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', // 标题：使用 name 字段
		subtitle: 'series', // 副标题：系列名字段
		extra: 'description', // 额外信息：描述字段
		tags: 'tags', // 标签字段
		maxTags: 3, // 最多显示 3 个标签
		badge: {
			field: 'duration',
			formatter: 'formatDuration'
		},
		progress: {
			field: 'watchProgress',
			unit: '%'
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
				field: 'watchCount',
				label: '观看',
				formatter: 'formatWatchCount'
			},
			{
				type: 'date' as const,
				field: 'lastWatched',
				label: '',
				formatter: 'formatLastWatched'
			}
		]
	}

	// 静态配置：详情页显示配置
	static detailPanelConfig = {
		/** 详情面板类型。不写的话会落到 game，封面失败时也用不上视频默认图。 */
		type: 'video',
		defaultImage: './default-video.png',
		title: {
			field: 'name',
			formatter: undefined
		},
		objectiveInfo: [
			{
				field: 'series',
				label: '系列名',
				formatter: undefined
			},
			{
				field: 'actors',
				label: '演员',
				formatter: undefined,
				arrayJoin: '、'
			},
			{
				field: 'releaseDate',
				label: '发行日期',
				formatter: 'formatDate'
			},
			{
				field: 'resourcePath',
				label: '视频路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'watchProgress',
				label: '观看进度',
				formatter: undefined,
				defaultValue: '0%'
			},
			{
				field: 'watchCount',
				label: '观看次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastWatched',
				label: '最后观看',
				formatter: 'formatLastPlayed',
				defaultValue: '从未观看'
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
				label: '播放视频',
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
				key: 'remove',
				icon: '🗑️',
				label: '删除视频',
				class: 'btn-remove'
			}
		]
	}
}
