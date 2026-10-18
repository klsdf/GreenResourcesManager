import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectFolder, 
	FormField_SelectVideoThumbnail,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 视频文件夹类
 */
export class VideoFolder extends BaseResources {


	static acceptedExtensions = [

	'<folder>'  // 文件夹标记（无扩展名）
		
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'animation'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('文件夹名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('文件夹描述', false)
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
	
	voiceActors: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('声优', false)
	})
	
	productionTeam: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('制作组', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFolder('文件夹路径', true)
	})
	
	thumbnail: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectVideoThumbnail('缩略图', false)
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
			'resourceType', 'name', 'description', 'tags', 'actors',
			'voiceActors', 'productionTeam', 'resourcePath', 'thumbnail'
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
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'videoFolder',
			name: this.name.value || '',
			description: this.description.value || '',
			series: this.series.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			actors: Array.isArray(this.actors.value) ? [...this.actors.value] : [],
			voiceActors: Array.isArray(this.voiceActors.value) ? [...this.voiceActors.value] : [],
			productionTeam: Array.isArray(this.productionTeam.value) ? [...this.productionTeam.value] : [],
			resourcePath: this.resourcePath.value || '',
			thumbnail: this.thumbnail.value || '',
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false
		}
	}

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'open',
		icon: '📁',
		label: '打开文件夹',
		handlerName: 'openFolder' // 组件中对应的方法名
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
			field: 'videoCount',
			render: (value: any) => {
				const count = value || 0
				return `${count} 个视频`
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
				field: 'videoCount',
				label: '',
				render: (value: any) => (value ? `${value} 个视频` : '')
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
				field: 'voiceActors',
				label: '声优',
				formatter: undefined,
				arrayJoin: '、'
			},
			{
				field: 'productionTeam',
				label: '制作组',
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
				field: 'videoCount',
				label: '视频数量',
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
