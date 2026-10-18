import { PAGE_TEMPLATES, TEMPLATE_FILE_NAMES, createUniquePageId, isSafePageFileName } from './pageTemplates'

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
	 * 按模板新建一个页面。
	 * 复制模板里的筛选、工具栏和空状态，但换成新的页面 ID，
	 * 这样新页面的数据和原来的页面是分开的。
	 */
	public async createPageFromTemplate(templateId: string, pageName: string): Promise<{ success: boolean; pageId?: string; error?: string }> {
		await this.ready()
		const template = PAGE_TEMPLATES.find(item => item.id === templateId)
		if (!template) {
			return { success: false, error: '请选择一个页面模板' }
		}

		const trimmedName = pageName.trim()
		if (!trimmedName) {
			return { success: false, error: '请填写页面名称' }
		}

		const templateResult = await electronAPI.readJsonFile(`configs/pages/${template.fileName}`)
		if (!templateResult?.success || !templateResult.data) {
			return { success: false, error: '读取页面模板失败' }
		}

		const existingIds = new Set(this.metaConfigs.map(meta => meta.config.id))
		const pageId = createUniquePageId(template.id, existingIds)
		const clonedConfig = JSON.parse(JSON.stringify(templateResult.data))
		clonedConfig.id = pageId
		clonedConfig.name = trimmedName
		clonedConfig.icon = template.icon
		clonedConfig.settingsKey = pageId

		const fileName = `custom-${pageId}.json`
		if (!isSafePageFileName(fileName)) {
			return { success: false, error: '生成的配置文件名不合法' }
		}

		const writeResult = await electronAPI.writeJsonFile(`configs/pages/${fileName}`, clonedConfig)
		if (!writeResult?.success) {
			return { success: false, error: writeResult?.error || '写入页面配置失败' }
		}

		const nextOrder = this.getAllPageConfigs().map(meta => ({
			fileName: this.idToFileNameMap.get(meta.config.id),
			order: meta.order,
			isDefault: meta.isDefault !== false,
			isHidden: !!meta.isHidden
		}))
		nextOrder.push({
			fileName,
			order: nextOrder.length + 1,
			isDefault: false,
			isHidden: false
		})

		const orderResult = await electronAPI.writeJsonFile('configs/pages/pageOrder.json', nextOrder)
		if (!orderResult?.success) {
			await electronAPI.deleteFile(`configs/pages/${fileName}`)
			return { success: false, error: orderResult?.error || '更新页面列表失败' }
		}

		this.readyPromise = this.loadConfigs()
		await this.readyPromise
		return { success: true, pageId }
	}

	/**
	 * 从页面列表里移除一个页面。
	 * 内置模板文件会保留，方便以后再按这个类型新建；
	 * 用户新建出来的配置文件会一起删掉。
	 */
	public async removePage(pageId: string): Promise<{ success: boolean; error?: string }> {
		await this.ready()
		const fileName = this.idToFileNameMap.get(pageId)
		if (!fileName) {
			return { success: false, error: '找不到这个页面' }
		}

		const remaining = this.getAllPageConfigs().filter(meta => meta.config.id !== pageId)
		const nextOrder = remaining.map((meta, index) => ({
			fileName: this.idToFileNameMap.get(meta.config.id),
			order: index + 1,
			isDefault: meta.isDefault !== false,
			isHidden: !!meta.isHidden
		}))

		const orderResult = await electronAPI.writeJsonFile('configs/pages/pageOrder.json', nextOrder)
		if (!orderResult?.success) {
			return { success: false, error: orderResult?.error || '更新页面列表失败' }
		}

		this.readyPromise = this.loadConfigs()
		await this.readyPromise

		const shouldKeepTemplate = TEMPLATE_FILE_NAMES.has(fileName)
		if (!shouldKeepTemplate && isSafePageFileName(fileName)) {
			const deleteResult = await electronAPI.deleteFile(`configs/pages/${fileName}`)
			if (!deleteResult?.success) {
				return { success: false, error: deleteResult?.error || '页面已从列表移除，但配置文件删除失败' }
			}
		}

		return { success: true }
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
				const fileName = this.idToFileNameMap.get(pageId)
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