import gamePageConfig from './gamePage.json'
import softwarePageConfig from './softwarePage.json'
import imagePageConfig from './imagePage.json'
import singleImagePageConfig from './singleImagePage.json'
import videoPageConfig from './videoPage.json'
import animePageConfig from './animePage.json'
import novelPageConfig from './novelPage.json'
import websitePageConfig from './websitePage.json'
import audioPageConfig from './audioPage.json'
import otherPageConfig from './otherPage.json'

export interface PageConfig {
	id: string
	name: string
	icon: string
	description?: string
	settingsKey: string
	defaultPageSize: number
	resourceTypes: string[]
	displayLayoutConfig: {
		minWidth: number
		maxWidth: number
	}
	sortOptions: Array<{
		id: string
		label: string
		field: string
		order: 'asc' | 'desc'
	}>
	emptyStateConfig: {
		icon: string
		title: string
		description: string
		buttonText: string
		buttonAction: string
	}
	toolbarConfig: {
		items: Array<{
			type: string
			label?: string
			action?: string
			icon?: string
			buttonType?: 'primary' | 'secondary'
			placeholder?: string
		}>
		sortOptions?: Array<{
			id: string
			label: string
			field: string
			order: 'asc' | 'desc'
		}>
		pageType?: string
	}
	dialogConfig: {
		addTitle: string
		editTitle: string
		addButtonText: string
		editButtonText: string
		enableEngineAutoDetect?: boolean
		enableScreenshotCover?: boolean
		enableRandomizeThumbnail?: boolean
	}
	filterConfig: Array<{
		key: string
		title: string
		filterType: string
		params: any
		isArray?: boolean
	}>
	showFolderVideosInDetail?: boolean
}

export interface PageConfigMeta {
	config: PageConfig
	order: number
	isHidden?: boolean
	isDefault?: boolean
}

const PAGE_CONFIGS: PageConfigMeta[] = [
	{
		config: gamePageConfig as PageConfig,
		order: 1,
		isDefault: true
	},
	{
		config: softwarePageConfig as PageConfig,
		order: 2,
		isDefault: true
	},
	{
		config: imagePageConfig as PageConfig,
		order: 3,
		isDefault: true
	},
	{
		config: singleImagePageConfig as PageConfig,
		order: 4,
		isDefault: true
	},
	{
		config: videoPageConfig as PageConfig,
		order: 5,
		isDefault: true
	},
	{
		config: animePageConfig as PageConfig,
		order: 6,
		isDefault: true
	},
	{
		config: novelPageConfig as PageConfig,
		order: 7,
		isDefault: true
	},
	{
		config: websitePageConfig as PageConfig,
		order: 8,
		isDefault: true
	},
	{
		config: audioPageConfig as PageConfig,
		order: 9,
		isDefault: true
	},
	{
		config: otherPageConfig as PageConfig,
		order: 10,
		isDefault: true
	}
]

export class PageConfigLoader {
	private static instance: PageConfigLoader
	private configs: Map<string, PageConfig> = new Map()
	private metaConfigs: PageConfigMeta[] = []

	private constructor() {
		this.loadConfigs()
	}

	public static getInstance(): PageConfigLoader {
		if (!PageConfigLoader.instance) {
			PageConfigLoader.instance = new PageConfigLoader()
		}
		return PageConfigLoader.instance
	}

	private loadConfigs(): void {
		this.metaConfigs = [...PAGE_CONFIGS]
		this.metaConfigs.forEach(meta => {
			this.configs.set(meta.config.id, meta.config)
		})
	}

	public getPageConfig(id: string): PageConfig | undefined {
		return this.configs.get(id)
	}

	public getAllPageConfigs(): PageConfigMeta[] {
		return [...this.metaConfigs].sort((a, b) => a.order - b.order)
	}

	public getVisiblePageConfigs(): PageConfigMeta[] {
		return this.metaConfigs
			.filter(meta => !meta.isHidden)
			.sort((a, b) => a.order - b.order)
	}

	public getDefaultPageConfigs(): PageConfigMeta[] {
		return this.metaConfigs
			.filter(meta => meta.isDefault)
			.sort((a, b) => a.order - b.order)
	}

	public hasPage(id: string): boolean {
		return this.configs.has(id)
	}

	public getEmptyStateConfig(id: string) {
		const config = this.getPageConfig(id)
		return config?.emptyStateConfig
	}

	public getToolbarConfig(id: string) {
		const config = this.getPageConfig(id)
		if (!config) return null

		return {
			...config.toolbarConfig,
			sortOptions: config.sortOptions,
			pageType: config.id
		}
	}

	public getDialogConfig(id: string) {
		const config = this.getPageConfig(id)
		return config?.dialogConfig
	}

	public getFilterConfig(id: string) {
		const config = this.getPageConfig(id)
		return config?.filterConfig
	}

	public getSortOptions(id: string) {
		const config = this.getPageConfig(id)
		return config?.sortOptions
	}

	public getResourceTypes(id: string) {
		const config = this.getPageConfig(id)
		return config?.resourceTypes
	}

	public getDisplayLayoutConfig(id: string) {
		const config = this.getPageConfig(id)
		return config?.displayLayoutConfig
	}

	public getDefaultPageSize(id: string) {
		const config = this.getPageConfig(id)
		return config?.defaultPageSize
	}

	public getSettingsKey(id: string) {
		const config = this.getPageConfig(id)
		return config?.settingsKey
	}

	public getShowFolderVideosInDetail(id: string): boolean {
		const config = this.getPageConfig(id)
		return config?.showFolderVideosInDetail || false
	}
}

export const pageConfigLoader = PageConfigLoader.getInstance()

/**
 * 根据 ID 获取页面配置
 */
export function getPageConfigById(id: string): PageConfigMeta | undefined {
	const meta = pageConfigLoader.getAllPageConfigs().find(meta => meta.config.id === id)
	return meta
}

/**
 * 获取所有可见页面配置
 */
export function getVisiblePageConfigs(): PageConfigMeta[] {
	return pageConfigLoader.getVisiblePageConfigs()
}

/**
 * 获取所有页面配置（包括隐藏的）
 */
export function getAllPageConfigs(): PageConfigMeta[] {
	return pageConfigLoader.getAllPageConfigs()
}