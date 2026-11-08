import { FormField_Text, FormField_Textarea, FormField_Tags } from './base/FormField.ts'
import { BaseResources } from './base/ResourcesDataBase.ts'
import { ResourceField } from './base/ResourceField.ts'

/**
 * 合集。
 * 它不是磁盘上的文件夹，也不是一种能拖进来的文件。
 * 点开之后进入当前页的二级目录，里面仍是这一页已有的资源卡片。
 * 合集里可以放任何类型的文件，不限当前页面本来接受的类型。
 * 番剧里的单集和漫画里的页不自动拆进来；要把番剧拆开，用右键转换成视频合集。
 */
export class Collection extends BaseResources {

	/**
	 * 存档类型。页面索引和资源表都用这个名字找到合集表。
	 */
	resourceType: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: 'collection'
	})

	/**
	 * 合集名称。创建时必填，卡片和面包屑都显示它。
	 */
	name: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Text('合集名称', true)
	})

	/**
	 * 合集简介。可以空着。
	 */
	description: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		editType: new FormField_Textarea('简介', false)
	})

	/**
	 * 合集自己的标签。成员的标签仍记在成员上，不会汇总到这里。
	 */
	tags: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: [],
		editType: new FormField_Tags('标签', false)
	})

	/**
	 * 系列名。只有这一页本来就有系列字段时，左侧面板才显示。
	 */
	series: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: ''
	})

	/**
	 * 合集自己的演员。这是整组的资料，不是把每一集的演员并起来。
	 */
	actors: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	/**
	 * 合集自己的声优。
	 */
	voiceActors: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	/**
	 * 合集自己的制作组。
	 */
	productionTeam: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	/**
	 * 合集没有自己的文件。路径留空，避免被当成丢失的资源。
	 */
	resourcePath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: ''
	})

	/**
	 * 自己指定的封面。空着时卡片用第一个成员的封面。
	 */
	coverPath: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: '',
		editType: new FormField_Text('封面路径', false)
	})

	/**
	 * 成员资源的 id，按加入顺序排列。
	 * 同一页里一个资源只出现在一个合集中。
	 */
	memberIds: ResourceField<string[]> = new ResourceField<string[]>({
		saveable: true,
		defaultValue: []
	})

	/**
	 * 写出可保存的纯对象。
	 * 成员只记 id，不复制资源正文。
	 */
	getSaveData(): any {
		/** 成员 id。空值收成空数组，避免存档里出现 null。 */
		const memberIds = Array.isArray(this.memberIds.value) ? [...this.memberIds.value] : []
		return {
			id: this.id.value || this.id.defaultValue || '',
			resourceType: this.resourceType.value || 'collection',
			name: this.name.value || '',
			description: this.description.value || '',
			series: this.series.value || '',
			tags: Array.isArray(this.tags.value) ? [...this.tags.value] : [],
			actors: Array.isArray(this.actors.value) ? [...this.actors.value] : [],
			voiceActors: Array.isArray(this.voiceActors.value) ? [...this.voiceActors.value] : [],
			productionTeam: Array.isArray(this.productionTeam.value) ? [...this.productionTeam.value] : [],
			resourcePath: '',
			coverPath: this.coverPath.value || '',
			memberIds,
			addedDate: this.addedDate.value || '',
			rating: this.rating.value || 0,
			comment: this.comment.value || '',
			isFavorite: this.isFavorite.value || false,
			finished: this.finished.value === true,
			finishedAt: this.finished.value === true ? (this.finishedAt.value || '') : ''
		}
	}

	/**
	 * 卡片上显示名称、成员数量和标签。
	 * 成员数量从 memberIds 算，不另存一份，避免和名单不一致。
	 */
	static cardDisplayConfig = {
		title: 'name',
		extra: 'description',
		tags: 'tags',
		maxTags: 3,
		badge: {
			field: 'memberIds',
			render: (value: unknown) => {
				const count = Array.isArray(value) ? value.length : 0
				return `${count} 个`
			}
		},
		stats: []
	}

	/**
	 * 详情里只放合集自己的信息。打开方式是进入二级目录，不在这里启动文件。
	 */
	static detailPanelConfig = {
		title: {
			field: 'name',
			formatter: undefined
		},
		objectiveInfo: [
			{
				field: 'description',
				label: '简介',
				formatter: undefined
			}
		],
		dataRecords: [
			{
				field: 'addedDate',
				label: '添加时间',
				formatter: 'formatDate',
				defaultValue: '未知'
			}
		],
		actions: [
			{
				key: 'edit',
				icon: '✏️',
				label: '编辑信息',
				class: 'btn-edit'
			},
			{
				key: 'remove',
				icon: '🗑️',
				label: '删除合集',
				class: 'btn-remove'
			}
		]
	}

	/**
	 * 右键保留详情和编辑。删除只删合集，成员回到页面根目录。
	 */
	static contextMenuItems = [
		{ key: 'detail', icon: '👁️', label: '查看详情' },
		{ key: 'edit', icon: '✏️', label: '编辑信息' },
		{ key: 'remove', icon: '🗑️', label: '删除合集' }
	]
}
