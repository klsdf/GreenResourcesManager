import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectFile, 
	FormField_SelectGameCover,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 其它资源类
 * 用于存储任意类型的文件或资源
 */
export class Other extends BaseResources {

	// 接受的文件扩展名（接受所有类型）
	static acceptedExtensions = ['*']  // * 表示接受所有文件类型
	
	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'other'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('资源名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('资源简介', false)
	})
	
	category: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('资源分类', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('资源标签', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('资源文件', [
			{ name: '所有文件', extensions: ['*'] }
		], true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectGameCover('资源封面', false)
	})

	// 文件夹大小（字节）
	folderSize: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 每次访问的时间记录（ISO 字符串数组）
	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastPlayed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	get firstPlayed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[0] : null
	}

	get playCount(): number {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) ? arr.length : 0
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'category', 'tags', 'resourcePath', 'coverPath']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'other',
			name: this.name.value || '',
			description: this.description.value || '',
			category: this.category.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			folderSize: this.folderSize.value ?? 0,
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false
		}
	}

	// 静态配置：编辑对话框配置
	static editDialogConfig = {
		addTitle: '添加资源',
		editTitle: '编辑资源',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'launch', icon: '▶️', label: '打开资源' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'update-folder-size', icon: '📊', label: '更新文件夹大小' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除资源' }
	]

	// 静态配置：工具栏配置
	static toolbarConfig = {
		title: '其它资源',
		enableSearch: true,
		enableSort: true,
		enableAdd: true,
		enableExport: true
	}

	// 静态配置：启动方式配置（用系统默认应用打开）
	static actionConfig = {
		key: 'launch',
		icon: '▶️',
		label: '打开资源',
		handlerName: 'launchDefault' // 用系统默认应用打开文件
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
		return './default-game.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', // 标题：使用 name 字段
		subtitle: 'category', // 副标题：分类字段
		extra: 'description', // 额外信息：描述字段
		tags: 'tags', // 标签字段
		maxTags: 9, // 最多显示 9 个标签
		stats: [
			{
				type: 'text' as const,
				field: 'playTime',
				label: '总时长:',
				formatter: 'formatPlayTime'
			},
			{
				type: 'text' as const,
				field: 'lastPlayed',
				label: '',
				formatter: 'formatLastPlayed',
				showRunningStatus: false
			}
		],
		badge: {
			field: 'folderSize',
			formatter: 'formatFolderSize'
		}
	}

	// 静态配置：详情页显示配置
	static detailPanelConfig = {
		type: 'other', // 用于 DetailPanel 的 type prop
		title: {
			field: 'name',
			formatter: undefined
		},
		objectiveInfo: [
			{
				field: 'category',
				label: '资源分类',
				formatter: undefined
			},
			{
				field: 'resourcePath',
				label: '资源路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'playTime',
				label: '总使用时长',
				formatter: 'formatPlayTime',
				defaultValue: '0 分钟'
			},
			{
				field: 'playCount',
				label: '使用次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastPlayed',
				label: '最后使用',
				formatter: 'formatLastPlayed',
				defaultValue: '从未使用'
			},
			{
				field: 'firstPlayed',
				label: '第一次使用',
				formatter: 'formatFirstPlayed',
				defaultValue: '从未使用'
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
				key: 'launch',
				icon: '▶️',
				label: '打开资源',
				class: 'btn-play',
				showCondition: {
					notArchive: true
				}
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
				label: '删除资源',
				class: 'btn-remove'
			}
		]
	}
}
