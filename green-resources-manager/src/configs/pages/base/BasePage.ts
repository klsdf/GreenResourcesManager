import { ResourceField } from '../../resources/base/ResourceField.ts'
import { 
	FormField_Text, 
	FormField_Textarea,
	FormField_Select,
	FormField_Tags,
	FormField_Checkbox,
	FormField as FormFieldType
} from '../../resources/base/FormField.ts'
import type { SortOption } from '../../../types/sort'
import type { FilterConfig, FilterItem } from '../../../types/filter'

/**
 * 空状态配置接口
 */
export interface EmptyStateConfig {
	icon: string
	title: string
	description: string
	buttonText: string
	buttonAction: string
}

/**
 * 工具栏项基础接口
 */
export interface ToolbarItemBase {
	type: string
}

/**
 * 按钮类型工具栏项
 */
export interface ToolbarButtonItem extends ToolbarItemBase {
	type: 'button'
	label: string
	action: string
	icon?: string
	buttonType?: 'primary' | 'secondary'
}

/**
 * 搜索框类型工具栏项
 */
export interface ToolbarSearchItem extends ToolbarItemBase {
	type: 'search'
	placeholder: string
	action: string
}

/**
 * 排序选择器类型工具栏项
 */
export interface ToolbarSortItem extends ToolbarItemBase {
	type: 'sort'
}

/**
 * 布局控制类型工具栏项
 */
export interface ToolbarLayoutItem extends ToolbarItemBase {
	type: 'layout'
}

/**
 * 多选模式类型工具栏项
 */
export interface ToolbarMultiSelectItem extends ToolbarItemBase {
	type: 'multi-select'
}

/**
 * 工具栏项类型
 */
export type ToolbarItem = ToolbarButtonItem | ToolbarSearchItem | ToolbarSortItem | ToolbarLayoutItem | ToolbarMultiSelectItem

/**
 * 工具栏配置接口（旧版兼容）
 */
export interface LegacyToolbarConfig {
	addButtonText: string
	searchPlaceholder: string
	sortOptions?: Array<{ value: string; label: string }>
	pageType?: string
	scale?: number
	showLayoutControl?: boolean
	addFolderButtonText?: string
	importBookmarkButtonText?: string
}

/**
 * 工具栏配置接口（新版 - 灵活配置）
 */
export interface FlexibleToolbarConfig {
	items: ToolbarItem[]
	sortOptions?: Array<{ value: string; label: string }>
	pageType?: string
	scale?: number
	showLayoutControl?: boolean
}

/**
 * 工具栏配置类型（兼容新旧两种格式）
 */
export type ToolbarConfig = LegacyToolbarConfig | FlexibleToolbarConfig

/**
 * 对话框配置接口
 */
export interface DialogConfig {
	addTitle: string
	editTitle: string
	addButtonText: string
	editButtonText: string
	enableEngineAutoDetect?: boolean
	enableScreenshotCover?: boolean
}

/**
 * 页面基类（抽象类）
 * 定义所有页面类型必须实现的基础字段
 * 参考资源类的设计模式，使用 ResourceField 来定义字段
 */
export abstract class BasePage {
	/**
	 * 页面唯一标识（用于路由和数据存储）
	 * 子类必须定义此属性
	 * 例如：'games', 'software', 'images' 等
	 */
	abstract readonly id: string
	
	/**
	 * 页面显示名称
	 * 子类必须定义此属性
	 * 例如：'游戏', '软件', '图片' 等
	 */
	abstract readonly name: string
	
	/**
	 * 页面图标（emoji 或图标类名）
	 * 子类必须定义此属性
	 * 例如：'🎮', '💾', '🖼️' 等
	 */
	abstract readonly icon: string
	
	/**
	 * 页面描述信息（可选）
	 * 子类可以定义此属性
	 */
	readonly description?: string
	
	/**
	 * 接受的资源类型（可以多个）
	 * 子类应该定义此属性
	 * 例如：['Game'], ['Image', 'Manga'], ['Software'] 等
	 * 注意：resourceTypes[0] 会被用作页面的主资源类型
	 */
	resourceTypes?: string[]
	
	/**
	 * 获取排序选项配置
	 * 子类必须实现此方法，返回该页面支持的排序选项
	 * @returns 排序选项数组
	 */
	abstract getSortOptions(): SortOption[]
	
	/**
	 * 获取排序配置（用于 SQL 排序）
	 * 子类必须实现此方法，返回该页面支持的排序配置数组
	 * 每个配置包含：label（显示标签）、dbField（数据库字段名）、order（排序方向）
	 * @returns 排序配置数组，格式：{ label: string, dbField: string, order: 'asc' | 'desc' }[]
	 */
	abstract getSortConfig(): Array<{ label: string, dbField: string, order: 'asc' | 'desc' }>
	
	/**
	 * 获取空状态配置
	 * 子类必须实现此方法，返回该页面的空状态配置
	 * @returns 空状态配置对象
	 */
	abstract getEmptyStateConfig(): EmptyStateConfig
	
	/**
	 * 获取工具栏配置
	 * 子类必须实现此方法，返回该页面的工具栏配置
	 * @returns 工具栏配置对象
	 */
	abstract getToolbarConfig(): ToolbarConfig
	
	/**
	 * 获取对话框配置
	 * 子类可以重写此方法，返回该页面的对话框配置
	 * @returns 对话框配置对象
	 */
	getDialogConfig(): DialogConfig {
		return {
			addTitle: '添加资源',
			editTitle: '编辑资源',
			addButtonText: '添加',
			editButtonText: '保存修改'
		}
	}
	
	/**
	 * 获取筛选配置
	 * 子类可以重写此方法，返回该页面支持的筛选器配置
	 * 默认返回包含"丢失的资源"筛选的配置
	 * 子类重写时应该调用 super.getFilterConfig() 并合并自己的配置，或者手动包含"丢失的资源"筛选
	 * @template T 资源类型
	 * @returns 筛选配置数组
	 */
	getFilterConfig<T = any>(): FilterConfig<T>[] {
		return [
			{
				key: 'missing-resources',
				title: '丢失的资源',
				fieldAccessor: (item: any) => {
					// 这个字段访问器不会被使用，因为使用了 extractFn
					return null
				},
				isArray: false,
				// 自定义提取函数：提取"丢失的资源"
				// 注意：即使数量为0也返回，确保筛选器始终显示
				extractFn: (items: any[]): FilterItem[] => {
					const result: FilterItem[] = []
					let missingResourcesCount = 0

					items.forEach((item: any) => {
						// 统计丢失的资源
						const fileExists = (item as any).fileExists?.value
						if (fileExists === false) {
							missingResourcesCount++
						}
					})

					// 始终返回，即使数量为0，确保筛选器可以显示
					result.push({
						name: '丢失的资源',
						count: missingResourcesCount
					})

					return result
				},
				// 自定义匹配函数：处理"丢失的资源"
				matchFn: (item: any, selected: string[], excluded: string[]): boolean => {
					// 检查排除条件
					if (excluded.length > 0) {
						const fileExists = (item as any).fileExists?.value
						if (excluded.includes('丢失的资源') && fileExists === false) {
							return false
						}
					}

					// 检查选中条件
					if (selected.length > 0) {
						const fileExists = (item as any).fileExists?.value
						
						return selected.some(sel => {
							if (sel === '丢失的资源') {
								return fileExists === false
							}
							return false
						})
					}

					return true
				}
			}
		] as FilterConfig<T>[]
	}
}
