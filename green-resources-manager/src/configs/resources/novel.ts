import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_Number,
	FormField_SelectFile, 
	FormField_SelectGameCover,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 小说类
 */
export class Novel extends BaseResources {
	
	// 接受的文件扩展名
	static acceptedExtensions = [
		'.txt', '.epub', '.pdf', '.mobi', '.azw', '.azw3',  // 电子书格式
		'.doc', '.docx', '.rtf', '.md'  // 文档格式
	]
	
	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'novel'
	})

	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('小说名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('小说简介', false)
	})
	
	author: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('作者', false)
	})
	
	genre: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('类型', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('小说标签', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('小说文件', [
			{ name: '小说文件', extensions: ['txt', 'epub', 'mobi', 'pdf'] },
		], true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectGameCover('封面图片', false)
	})
	
	publishYear: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('出版年份', false)
	})

	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastRead(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'author', 'genre', 'tags', 'resourcePath', 'coverPath', 'publishYear']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'novel',
			name: this.name.value || '',
			description: this.description.value || '',
			author: this.author.value || '',
			genre: this.genre.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			publishYear: this.publishYear.value || '',
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false
		}
	}

	// 静态配置：编辑对话框配置
	static editDialogConfig = {
		addTitle: '添加小说',
		editTitle: '编辑小说',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'read', icon: '📖', label: '开始阅读' },
		{ key: 'read-v2', icon: '📚', label: 'EPUB阅读器V2' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除小说' }
	]

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'read',
		icon: '📖',
		label: '开始阅读',
		handlerName: 'openNovelReader' // 组件中对应的方法名
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未阅读',
			justAccessed: '刚刚',
			accessAction: '阅读',
			yesterdayAccessed: '昨天'
		}
	}

	// 静态方法：获取默认图标路径
	static getDefaultIcon() {
		return './default-novel.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', // 标题：使用 name 字段
		subtitle: 'description', // 副标题：作者字段
		extra: 'genre', // 额外信息：类型字段
		tags: 'tags', // 标签字段
		maxTags: 3, // 最多显示 3 个标签
		badge: {
			field: 'totalWords',
			formatter: 'formatWordCount'
		},
		progress: {
			field: 'readProgress', // 进度值字段
			unit: '%' // 单位
		},
		stats: [
			{
				type: 'text' as const,
				field: 'readProgress',
				label: '',
				formatter: 'formatReadProgress'
			},
			{
				type: 'time' as const,
				field: 'readTime',
				label: '',
				formatter: 'formatReadTime'
			},
			{
				type: 'date' as const,
				field: 'lastRead',
				label: '',
				formatter: 'formatLastRead'
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
				field: 'author',
				label: '作者',
				formatter: undefined
			},
			{
				field: 'genre',
				label: '类型',
				formatter: undefined
			},
			{
				field: 'publishYear',
				label: '出版年份',
				formatter: undefined
			},
			{
				field: 'resourcePath',
				label: '小说路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'readProgress',
				label: '阅读进度',
				formatter: undefined,
				defaultValue: '0%'
			},
			{
				field: 'readTime',
				label: '阅读时长',
				formatter: 'formatPlayTime',
				defaultValue: '0 分钟'
			},
			{
				field: 'lastRead',
				label: '最后阅读',
				formatter: 'formatLastPlayed',
				defaultValue: '从未阅读'
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
				key: 'read',
				icon: '📖',
				label: '开始阅读',
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
				label: '删除小说',
				class: 'btn-remove'
			}
		]
	}
}
