import { 
	FormField_Text, 
	FormField_Textarea, 
	FormField_Tags, 
	FormField_SelectSingleImageFile, 
	FormField as FormFieldType,
	FormField
} from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 单图片类
 */
export class SingleImage extends BaseResources {

	// 接受的文件扩展名
	static acceptedExtensions = [
		'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',  // 常见图片格式
		'.tiff', '.tif', '.heic', '.heif'  // 其他图片格式
	]

	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'single-image'
	})
	
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('图片名称', false)
	})
	
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('图片简介', false)
	})
	
	author: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('作者', false)
	})
	
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		editType: new FormField_Tags('图片标签', false)
	})
	
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_SelectSingleImageFile('图片文件', [
			{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] },
			{ name: '所有文件', extensions: ['*'] }
		], true)
	})

	visitedSessions: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	get lastViewed(): string | null {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null
	}

	get viewCount(): number {
		const arr = this.visitedSessions.value
		return Array.isArray(arr) ? arr.length : 0
	}

	/** 可被刮削的字段（导入刮削库时只保存这些） */
	static getScrapableFieldKeys(): string[] {
		return ['resourceType', 'name', 'description', 'author', 'tags', 'resourcePath']
	}

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	getSaveData(): any {
		return {
			id: this.id.value || this.id.defaultValue || '',
			fingerprint: this.fingerprint.value || '',
			resourceType: this.resourceType.value || this.resourceType.defaultValue || 'singleImage',
			name: this.name.value || '',
			description: this.description.value || '',
			author: this.author.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			resourcePath: this.resourcePath.value || '',
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
		addTitle: '添加图片',
		editTitle: '编辑图片',
	}

	// 静态配置：右键菜单项
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'open', icon: '🖼️', label: '打开图片' },
		{ key: 'folder', icon: '📁', label: '打开文件夹' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除图片' }
	]

	// 静态配置：启动方式配置
	static actionConfig = {
		key: 'open',
		icon: '🖼️',
		label: '打开图片',
		handlerName: 'openImage' // 组件中对应的方法名
	}

	// 静态方法：获取显示文本配置（支持多态）
	static getDisplayTexts() {
		return {
			neverAccessed: '从未查看',
			justAccessed: '刚刚',
			accessAction: '查看',
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
		subtitle: 'author', // 副标题：作者字段
		extra: 'description', // 额外信息：描述字段
		tags: 'tags', // 标签字段
		maxTags: 3, // 最多显示 3 个标签
		badge: {
			field: 'viewCount',
			render: (value: any) => {
				const count = value || 0
				return count > 0 ? `${count} 次浏览` : ''
			}
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
				formatter: undefined
			},
			{
				field: 'resourcePath',
				label: '图片路径',
				formatter: undefined
			}
		],
		dataRecords: [
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
				icon: '🖼️',
				label: '打开图片',
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
				label: '删除图片',
				class: 'btn-remove'
			}
		]
	}
}
