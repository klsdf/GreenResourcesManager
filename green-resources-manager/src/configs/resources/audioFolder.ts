import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectFolder, 
	FormField_SelectFile
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 音频文件夹类
 */
export class AudioFolder extends BaseResources {

	static acceptedExtensions = [
		'<folder>'  // 文件夹标记（无扩展名）
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'audioFolder'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('文件夹名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('文件夹描述', false)
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
		editType: new FormField_SelectFolder('文件夹路径', true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('缩略图', [
			{ name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'] },
			{ name: '所有文件', extensions: ['*'] }
		], false)
	})

	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastViewed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return [
			'resourceType', 'name', 'description', 'artist', 'tags',
			'actors', 'resourcePath', 'coverPath'
		]
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'audioFolder',
			name: this.name.value || '',
			description: this.description.value || '',
			artist: this.artist.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			actors: Array.isArray(this.actors.value) ? [...this.actors.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false,
			finished: this.finished.value === true,
			finishedAt: this.finished.value === true ? (this.finishedAt.value || '') : ''
		}
	}

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'open',
		icon: '📁',
		label: '打开文件夹',
		handlerName: 'openFolder'
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未打开',
			justAccessed: '刚刚',
			accessAction: '打开',
			yesterdayAccessed: '昨天'
		}
	}

	// 静态方法：获取默认图标路径
	static getDefaultIcon() {
		return './default-audio.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name',
		subtitle: 'artist',
		extra: 'description',
		tags: 'tags',
		maxTags: 3,
		badge: {
			field: 'audioCount',
			render: (value: any) => {
				const count = value || 0
				return `${count} 个音频`
			}
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
				type: 'text' as const,
				field: 'audioCount',
				label: '',
				render: (value: any) => (value ? `${value} 个音频` : '')
			},
			{
				type: 'date' as const,
				field: 'addedDate',
				label: '',
				formatter: 'formatAddedDate'
			}
		]
	}

	// 静态配置：详情页显示配置
	static detailPanelConfig = {
		type: 'folder' as const,
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
				label: '文件夹路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'audioCount',
				label: '音频数量',
				formatter: undefined,
				defaultValue: '0'
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
				key: 'open',
				icon: '📁',
				label: '打开文件夹',
				class: 'btn-play'
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
				label: '删除文件夹',
				class: 'btn-remove'
			}
		]
	}
}
