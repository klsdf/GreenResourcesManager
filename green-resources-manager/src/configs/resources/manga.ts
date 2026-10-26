import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectFile, 
	FormField_SelectMangaCover,
	FormField_SelectFolder,
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 漫画/图片专辑类
 */
export class Manga extends BaseResources {

	// 图片文件夹本身。zip、cbz 等压缩包是独立的「压缩包」类型，由页面配置决定收不收。
	// 注意：使用 '<folder>' 标记表示接受文件夹（无扩展名）
	static acceptedExtensions = [
		'.pdf',  // PDF 格式漫画
		'<folder>'  // 文件夹标记（无扩展名）
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'manga'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('漫画名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('漫画简介', false)
	})
	
	author: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('作者', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('漫画标签', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectFolder('漫画文件夹路径', true)
	})
	
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectMangaCover('封面图片', false)
	})

	// 图片专辑特有字段
	pagesCount: ResourceField<number> = new ResourceField<number>({
		saveable: false,
		defaultValue: 0
	})

	/**
	 * 读到的页码，从 1 开始。
	 * 漫画阅读器内部用 0 开始的下标。存的时候加 1，打开的时候再减 1，避免和「第 1 页」对不上。
	 */
	currentPage: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 1
	})

	/** 阅读进度，0 到 100。用当前页除以总页数，卡片上的进度条读这个值。 */
	readProgress: ResourceField<number> = new ResourceField<number>({
		saveable: true,
		defaultValue: 0
	})

	// 每次查看的时间记录（ISO 字符串数组，按时间升序）
	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	/** 最后查看时间（从 visitedSessions 派生） */
	get lastViewed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	/** 浏览次数（从 visitedSessions 派生） */
	get viewCount(): number {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) ? arr.length : 0
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'author', 'tags', 'resourcePath', 'coverPath']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		const id = this.id.value || this.id.defaultValue
		if (!id) {
			console.warn('[Manga.getSaveData] id 为空，生成新 id')
		}
		return {
			id: id || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'manga',
			name: this.name.value || '',
			description: this.description.value || '',
			author: Array.isArray(this.author.value) ? [...this.author.value] : [],
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			resourcePath: this.resourcePath.value || '',
			coverPath: this.coverPath.value || '',
			pagesCount: this.pagesCount.value || 0,
			currentPage: Number(this.currentPage.value) > 0 ? Math.floor(Number(this.currentPage.value)) : 1,
			readProgress: Number(this.readProgress.value) || 0,
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
		addTitle: '添加漫画',
		editTitle: '编辑漫画',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'open', icon: '📖', label: '打开漫画' },
		{ key: 'openComicDefault', icon: '📂', label: '用默认程序打开', onlyComicArchive: true },
		{ key: 'openComicSpecified', icon: '🔧', label: '用指定程序打开', onlyComicArchive: true },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除漫画' }
	]

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'open',
		icon: '📖',
		label: '打开漫画',
		handlerName: 'openAlbum' // 组件中对应的方法名
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
		return './default-image.png'
	}

	// 静态配置：卡片显示配置
	static cardDisplayConfig = {
		title: 'name', // 标题：使用 name 字段
		subtitle: 'description', // 副标题：作者字段
		extra: 'author', // 额外信息：描述字段
		tags: 'tags', // 标签字段
		maxTags: 3, // 最多显示 3 个标签
		badge: {
			field: 'pagesCount',
			render: (value: any) => {
				const count = value || 0
				return `${count} 页`
			}
		},
		progress: {
			field: 'readProgress',
			unit: '%'
		},
		stats: [
			{
				type: 'count' as const,
				field: 'viewCount',
				label: '浏览',
				formatter: 'formatViewCount'
			},
			{
				type: 'date' as const,
				field: 'lastViewed',
				label: '',
				formatter: 'formatLastViewed'
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
				formatter: undefined,
				arrayJoin: '、'
			},
			{
				field: 'resourcePath',
				label: '漫画路径',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'pagesCount',
				label: '总页数',
				formatter: undefined,
				defaultValue: '0'
			},
			{
				field: 'currentPage',
				label: '当前页',
				formatter: undefined,
				defaultValue: '1'
			},
			{
				field: 'readProgress',
				label: '阅读进度',
				formatter: undefined,
				defaultValue: '0%'
			},
			{
				field: 'viewCount',
				label: '浏览次数',
				formatter: undefined,
				defaultValue: '0 次'
			},
			{
				field: 'lastViewed',
				label: '最后查看',
				formatter: 'formatDate',
				defaultValue: '从未查看'
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
				icon: '📖',
				label: '开始阅读',
				class: 'btn-play'
			},
			{
				key: 'openComicDefault',
				icon: '📂',
				label: '用默认程序打开',
				class: 'btn-open-folder',
				// 只对 cbr/cbz 显示。文件夹漫画继续走内置阅读器。
				showCondition: { onlyComicArchive: true }
			},
			{
				key: 'openComicSpecified',
				icon: '🔧',
				label: '用指定程序打开',
				class: 'btn-open-folder',
				showCondition: { onlyComicArchive: true }
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
				label: '删除漫画',
				class: 'btn-remove'
			}
		],
		// 预览区域指令：使用资源自身文件夹内的图片作为详情预览
		previewArea: 'useSelfFolder'
	}
}
