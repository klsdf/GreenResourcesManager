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
 * 软件类
 */
export class Software extends BaseResources {
	
	// 接受的文件扩展名（用于拖拽文件时自动匹配资源类型）
	static acceptedExtensions = [
		'.exe',  // 可执行文件
		'.msi',  // Windows 安装包
		'.dmg',  // macOS 安装包
		'.app',  // macOS 应用
		'.apk',  // Android 应用
		'.bat',  // 批处理文件
		'.sh',   // Shell 脚本
		'.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz'  // 压缩包
	]
	
	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'software'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('软件名称', false)
	})

	nickname: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('软件别名', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('软件简介', false)
	})
	
	developer: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('开发商', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('软件标签', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('软件文件', [
			{ name: '可执行文件', extensions: ['exe', 'swf', 'bat'] },
			{ name: '压缩文件', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'tar.gz', 'bz2', 'tar.bz2', 'xz', 'tar.xz'] },
		], true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectGameCover('软件封面', false)
	})

	// 文件夹大小（字节）
	folderSize: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 运行时长（分钟）
	playTime: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 运行次数
	playCount: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 每次访问（启动）的时间记录（ISO 字符串数组，按时间升序）
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

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'developer', 'tags', 'resourcePath', 'coverPath']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
		getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'software',
			name: this.name.value || '',
			nickname: this.nickname.value || '',
			description: this.description.value || '',
			developer: this.developer.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			folderSize: this.folderSize.value ?? 0,
			playTime: this.playTime.value ?? 0,
			playCount: this.playCount.value ?? 0,
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false
		}
	}

	// 静态配置：编辑对话框配置
	static editDialogConfig = {
		addTitle: '添加软件',
		editTitle: '编辑软件',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'launch', icon: '▶️', label: '启动软件' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'update-folder-size', icon: '📊', label: '更新文件夹大小' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除软件' }
	]


	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'launch',
		icon: '▶️',
		label: '启动软件',
		handlerName: 'launchExecutable' // 使用通用的可执行文件启动 handler
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未运行',
			justAccessed: '刚刚',
			accessAction: '运行',
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
		subtitle: 'developer', // 副标题：开发商字段
		extra: 'description', // 额外信息：描述字段
		tags: 'tags', // 标签字段
		maxTags: 9, // 最多显示 9 个标签
		badge: {
			field: 'folderSize',
			formatter: 'formatFolderSize'
		},
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
				showRunningStatus: true // 显示运行状态
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
				field: 'developer',
				label: '开发商',
				formatter: undefined
			},
			{
				field: 'resourcePath',
				label: '软件路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'playTime',
				label: '总运行时长',
				formatter: 'formatPlayTime',
				defaultValue: '0 分钟'
			},
			{
				field: 'playCount',
				label: '运行次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastPlayed',
				label: '最后运行',
				formatter: 'formatLastPlayed',
				defaultValue: '从未运行'
			},
			{
				field: 'firstPlayed',
				label: '第一次运行',
				formatter: 'formatFirstPlayed',
				defaultValue: '从未运行'
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
				label: '启动软件',
				class: 'btn-play',
				showCondition: {
					notArchive: true,
					runningAlternative: {
						key: 'terminate',
						icon: '⏹️',
						label: '结束软件',
						class: 'btn-stop-software'
					}
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
				label: '删除软件',
				class: 'btn-remove'
			}
		]
	}
}
