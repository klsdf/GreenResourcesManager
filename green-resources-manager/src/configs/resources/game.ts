import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectEngine, 
	FormField_SelectFile, 
	FormField_SelectGameCover,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'


/**
 * 游戏类
 */
export class Game extends BaseResources {
	
	// 接受的文件扩展名（用于拖拽文件时自动匹配资源类型）
	static acceptedExtensions = [
		'.exe',  // 可执行文件
		'.swf',  // Flash 游戏
		'.bat',  // 批处理启动文件
		'.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz'  // 压缩包
	]
	
	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'game'
	})

    
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('游戏名', true)
	})

	nickname: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('昵称', false)
	})

	nameZh: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('中文名', false)
	})

	nameEn: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('英文名', false)
	})

	nameJa: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('日文名', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('游戏简介', false)
	})
	
	developers: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('开发商', false)
	})
	
	publisher: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('发行商', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('标签', false)
	})
	
	engine: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectEngine('选择游戏引擎', false)
	})

	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectGameCover('游戏封面', false)
	})

	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFile('游戏路径', [
			{ name: '可执行文件', extensions: ['exe', 'bat', 'ps1'] },
		], true)
	})

	// 文件夹大小（字节）
	folderSize: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 游戏时长（分钟）
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

	/** 最后一次游玩时间（从 visitedSessions 派生） */
	get lastPlayed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	/** 首次游玩时间（从 visitedSessions 派生） */
	get firstPlayed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[0] : null
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return [
			'resourceType', 'name', 'nickname', 'nameZh', 'nameEn', 'nameJa',
			'description', 'developers', 'publisher', 'tags', 'engine', 'resourcePath'
		]
	}

	getSaveData(): any {
		// 确保id不为空
		const idValue = this.id.value || this.generateId();
		return {
			id: idValue,
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'game',
			name: this.name.value || '',
			nickname: this.nickname.value || '',
			nameZh: this.nameZh.value || '',
			nameEn: this.nameEn.value || '',
			nameJa: this.nameJa.value || '',
			description: this.description.value || '',
			developers: Array.isArray(this.developers.value) ? [...this.developers.value] : [],
			publisher: this.publisher.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			engine: this.engine.value || '',
			coverPath: this.coverPath.value || '',
			resourcePath: this.resourcePath.value || '',
			folderSize: this.folderSize.value || 0,
			playTime: this.playTime.value || 0,
			playCount: this.playCount.value || 0,
			visitedSessions: Array.isArray(this.visitedSessions.value) ? [...this.visitedSessions.value] : [],
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false
		}
	}

	  
  // 静态配置：编辑对话框配置
  static editDialogConfig = {
    addTitle: '添加游戏',
    editTitle: '编辑游戏',
  }

  // 静态配置：右键菜单项
  static contextMenuItems = [
    { key: 'detail', icon: '👁️', label: '查看详情' },
    { key: 'launch', icon: '▶️', label: '启动游戏' },
    { key: 'launchWithLocale', icon: '🌐', label: '转区启动' },
    { key: 'folder', icon: '📁', label: '打开文件夹' },
    { key: 'screenshot-folder', icon: '📸', label: '打开截图文件夹' },
    { key: 'update-folder-size', icon: '📊', label: '更新文件夹大小' },
    { 
      key: 'compress', 
      icon: '🗜️', 
      label: '压缩文件',
      children: [
        { key: 'compress-to', icon: '🗜️', label: '压缩到指定目录...' },
        { key: 'compress-here', icon: '🗜️', label: '压缩到当前目录' }
      ]
    },
    { 
      key: 'extract', 
      icon: '📦', 
      label: '解压文件',
      children: [
        { key: 'extract', icon: '📦', label: '解压到指定目录...' },
        { key: 'extract-here', icon: '📦', label: '解压到当前目录' }
      ]
    },
    { key: 'edit', icon: '✏️', label: '编辑信息' },
    { key: 'remove', icon: '🗑️', label: '删除游戏' }
  ]

  // 静态配置：启动方式配置
  static actionConfig = {
    key: 'launch',
    icon: '▶️',
    label: '启动游戏',
    handlerName: 'launchExecutable' // 使用通用的可执行文件启动 handler
  }

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未游玩',
			justAccessed: '刚刚',
			accessAction: '游玩',
			yesterdayAccessed: '昨天'
		}
	}

	// 静态方法：获取默认图标路径
	static getDefaultIcon() {
		return './default-game.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', 
		subtitle: 'description', 
		extra: 'developers', 
		tags: 'tags', // 标签字段
		maxTags: 9, // 最多显示 9 个标签
		showExeIcon: true, // 显示 EXE 图标
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
		// 主标题配置
		title: {
			field: 'name', // 使用 name 字段作为主标题
			formatter: undefined // 可选：格式化函数名
		},
		
		// 客观信息区（资源地址、开发商等，可以配置任意数量）
		// 这些信息会显示在主标题下方，描述上方
		objectiveInfo: [
			{
				field: 'developers', // 字段名
				label: '开发商', // 显示标签
				formatter: undefined, // 可选：格式化函数名
				arrayJoin: '、' // 如果字段是数组，使用的连接符（默认 '、'）
			},
			{
				field: 'publisher',
				label: '发行商',
				formatter: undefined
			},
			{
				field: 'engine',
				label: '引擎',
				formatter: undefined
			},
			{
				field: 'resourcePath', // 资源路径（优先级：resourcePath > executablePath）
				label: '游戏路径',
				formatter: undefined,
				fallbackFields: ['executablePath'] // 如果 resourcePath 为空，尝试使用这些字段
			}
		],
		
		// 数据记录区（游玩次数、游戏时长等，可以配置任意数量）
		// 这些信息会显示在统计信息区域
		dataRecords: [
			{
				field: 'playTime', // 字段名
				label: '总游戏时长', // 显示标签
				formatter: 'formatPlayTime', // 格式化函数名（可选）
				defaultValue: '0 分钟' // 如果字段值为 0 或空，显示的默认值
			},
			{
				field: 'playCount',
				label: '运行次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastPlayed',
				label: '最后游玩',
				formatter: 'formatLastPlayed',
				defaultValue: '从未游玩'
			},
			{
				field: 'firstPlayed',
				label: '第一次游玩',
				formatter: 'formatFirstPlayed',
				defaultValue: '从未游玩'
			},
			{
				field: 'addedDate',
				label: '添加时间',
				formatter: 'formatDate',
				defaultValue: '未知'
			}
		],
		
		// 按钮组配置
		actions: [
			{
				key: 'launch', // 按钮唯一标识
				icon: '▶️', // 按钮图标
				label: '开始游戏', // 按钮文本
				class: 'btn-play', // CSS 类名
				// 条件显示：根据资源状态决定是否显示
				showCondition: {
					// 如果资源是压缩包，不显示启动按钮
					notArchive: false, // 只在非压缩包时显示
					// 如果资源正在运行，显示不同的按钮
					runningAlternative: {
						key: 'terminate',
						icon: '⏹️',
						label: '结束游戏',
						class: 'btn-stop-game'
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
				label: '删除游戏',
				class: 'btn-remove'
			}
		],
		// 详情 extra 区域：使用该游戏的截图文件夹内图片作为预览
		previewArea: 'useScreenshotFolder'
	}

}


