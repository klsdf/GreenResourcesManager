// 在Electron中，我们需要通过预加载脚本暴露的API获取配置
const electronAPI = window.electronAPI

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

// 定义页面顺序配置文件类型
interface PageOrderConfig {
  fileName: string
  order: number
  isDefault: boolean
}

// 动态读取所有JSON配置文件
const loadAllPageConfigs = async (): Promise<{ metaConfigs: PageConfigMeta[], idToFileNameMap: Map<string, string>, fileNameToIdMap: Map<string, string> }> => {
  try {
    // 读取页面顺序配置
    const pageOrderResult = await electronAPI.readJsonFile('configs/pages/pageOrder.json')
    if (!pageOrderResult.success || !pageOrderResult.data) {
      throw new Error(`Failed to load page order: ${pageOrderResult.error}`)
    }
    const pageOrder = pageOrderResult.data as PageOrderConfig[]
    
    // 读取所有页面配置文件
    const pageConfigs: PageConfigMeta[] = []
    const idToFileNameMap = new Map<string, string>()
    const fileNameToIdMap = new Map<string, string>()
    
    for (const orderConfig of pageOrder) {
      const configResult = await electronAPI.readJsonFile(`configs/pages/${orderConfig.fileName}`)
      if (!configResult.success || !configResult.data) {
        throw new Error(`Failed to load page config ${orderConfig.fileName}: ${configResult.error}`)
      }
      const config = configResult.data as PageConfig
      pageConfigs.push({
        config,
        order: orderConfig.order,
        isDefault: orderConfig.isDefault,
        isHidden: (orderConfig as any).isHidden
      })
      idToFileNameMap.set(config.id, orderConfig.fileName)
      fileNameToIdMap.set(orderConfig.fileName, config.id)
    }
    
    return { metaConfigs: pageConfigs, idToFileNameMap, fileNameToIdMap }
  } catch (error) {
    console.error('Failed to load page configs:', error)
    return { metaConfigs: [], idToFileNameMap: new Map(), fileNameToIdMap: new Map() }
  }
}

// 定义保存页面顺序时的类型
interface SavePageOrderItem {
  fileName: string
  order: number
  isDefault: boolean
  isHidden?: boolean
}

export class PageConfigLoader {
	private static instance: PageConfigLoader
	private configs: Map<string, PageConfig> = new Map()
	private metaConfigs: PageConfigMeta[] = []
	private readyPromise: Promise<void> | null = null
	// 存储文件名和配置ID的映射关系
	private fileNameToIdMap: Map<string, string> = new Map()
	// 反向映射：配置ID到文件名
	private idToFileNameMap: Map<string, string> = new Map()

	private constructor() {
		this.readyPromise = this.loadConfigs()
	}

	public static getInstance(): PageConfigLoader {
		if (!PageConfigLoader.instance) {
			PageConfigLoader.instance = new PageConfigLoader()
		}
		return PageConfigLoader.instance
	}

	private async loadConfigs(): Promise<void> {
		const { metaConfigs, idToFileNameMap, fileNameToIdMap } = await loadAllPageConfigs()
		this.metaConfigs = metaConfigs
		this.idToFileNameMap = idToFileNameMap
		this.fileNameToIdMap = fileNameToIdMap
		this.metaConfigs.forEach(meta => {
			this.configs.set(meta.config.id, meta.config)
		})
	}

	/**
	 * 根据页面ID获取配置文件的文件名
	 * @param pageId 页面ID
	 * @returns 配置文件名，如果未找到则返回null
	 */
	public getFileNameByPageId(pageId: string): string | null {
		return this.idToFileNameMap.get(pageId) || null
	}

	/**
	 * 保存页面顺序和可见性
	 * @param pageIds 按新顺序排列的页面ID数组
	 * @param hiddenPageIds 隐藏页面的ID数组
	 */
	public async savePageOrder(pageIds: string[], hiddenPageIds: string[] = []): Promise<boolean> {
		try {
			// 创建新的页面顺序配置
			const newPageOrder: SavePageOrderItem[] = pageIds.map((pageId, index) => {
				const fileName = this.fileNameToIdMap.get(pageId)
				if (!fileName) {
					throw new Error(`Could not find file name for page ID: ${pageId}`)
				}
				const metaConfig = this.metaConfigs.find(m => m.config.id === pageId)
				return {
					fileName,
					order: index + 1,
					isDefault: metaConfig?.isDefault !== false,
					isHidden: hiddenPageIds.includes(pageId)
				}
			})

			// 写入pageOrder.json文件
			const result = await electronAPI.writeJsonFile('configs/pages/pageOrder.json', newPageOrder)
			if (!result.success) {
				throw new Error(`Failed to save page order: ${result.error}`)
			}

			// 重新加载配置
			this.readyPromise = this.loadConfigs()
			await this.readyPromise

			console.log('[PageConfigLoader] Page order saved successfully')
			return true
		} catch (error) {
			console.error('[PageConfigLoader] Failed to save page order:', error)
			return false
		}
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

	/**
	 * 等待配置加载完成
	 */
	public async ready(): Promise<void> {
		if (this.readyPromise) {
			await this.readyPromise
		}
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