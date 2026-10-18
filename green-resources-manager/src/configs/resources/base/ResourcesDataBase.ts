import { ResourceField } from './ResourceField.ts'
import { FormField_Text } from './FormField.ts'

/**
 * 资源显示文本配置接口
 */
export interface ResourceDisplayTexts {
	/**
	 * 从未访问的默认文本（当没有访问记录时显示）
	 */
	neverAccessed: string
	
	/**
	 * 刚刚访问的文本（1分钟内）
	 */
	justAccessed: string
	
	/**
	 * 访问动作的文本（用于"X分钟前访问"等）
	 */
	accessAction: string
	
	/**
	 * 昨天访问的文本
	 */
	yesterdayAccessed: string
}

/**
 * 资源基类（抽象类）
 * 定义所有资源类型必须实现的基础字段
 * 子类必须实现或重写这些抽象属性
 */
export abstract class BaseResources {
	
	/**
	 * 静态方法：获取显示文本配置
	 * 子类可以覆盖此方法来自定义显示文本
	 * 使用静态方法而不是静态字段，支持真正的多态
	 * @returns 显示文本配置
	 */
	static getDisplayTexts(): ResourceDisplayTexts {
		return {
			neverAccessed: '从未访问',
			justAccessed: '刚刚',
			accessAction: '访问',
			yesterdayAccessed: '昨天'
		}
	}

	/**
	 * 静态方法：获取卡片显示配置
	 * 子类可以覆盖此方法来自定义卡片显示
	 * @returns 卡片显示配置
	 */
	static getCardDisplayConfig(): any {
		return null // 默认无配置，子类需要实现
	}

	/**
	 * 静态方法：获取默认图标路径
	 * 子类可以覆盖此方法来自定义默认图标
	 * @returns 默认图标路径
	 */
	static getDefaultIcon(): string {
		return './default-image.png'
	}

	/**
	 * 静态方法：获取 action handler 名称
	 * 子类可以覆盖此方法来自定义 action handler
	 * 这个方法返回页面组件中处理资源打开/启动的方法名
	 * @returns action handler 方法名
	 */
	static getActionHandlerName(): string | null {
		// 如果子类定义了 actionConfig，返回其 handlerName
		if ((this as any).actionConfig && (this as any).actionConfig.handlerName) {
			return (this as any).actionConfig.handlerName
		}
		return null
	}

	/**
	 * 静态方法：返回可被刮削的字段名列表（从存档导入刮削库时只保存这些字段）
	 * 子类应重写此方法，返回如 name、description、tags、resourcePath、coverPath 等
	 * @returns 字段名数组，不包含 id
	 */
	static getScrapableFieldKeys(): string[] {
		return []
	}

	//内部字段

	// 资源唯一标识符
	id: ResourceField<string> = new ResourceField<string>({
		saveable: true
	})
	
	/**
	 * 是否存在文件
	 */
	fileExists: ResourceField<boolean> = new ResourceField<boolean>({
		saveable: false
	})

	/**
	 * 内容指纹。
	 * 不展示在编辑框里。用来在改名或移动之后认出还是不是原来那一条资源。
	 */
	fingerprint: ResourceField<string> = new ResourceField<string>({
		saveable: true,
		defaultValue: ''
	})
	
	/**
	 * 添加日期
	 */
	addedDate: ResourceField<string> = new ResourceField<string>({
		saveable: true
	})
	
	/**
	 * 评分
	 */
	rating: ResourceField<number> = new ResourceField<number>({
		saveable: true
	})
	
	/**
	 * 评论
	 */
	comment: ResourceField<string> = new ResourceField<string>({
		saveable: true
	})
	
	/**
	 * 是否为收藏
	 */
	isFavorite: ResourceField<boolean> = new ResourceField<boolean>({
		saveable: true
	})
	

	/**
	 * 是否为压缩包文件
	 */
	isArchive: ResourceField<boolean> = new ResourceField<boolean>({
		saveable: false
	})
	
	

    //子类必须实现的字段
	abstract tags: ResourceField<string[]> // 资源标签
	abstract name: ResourceField<string> // 资源名称
	abstract description: ResourceField<string> // 资源描述
	abstract resourcePath: ResourceField<string> // 资源路径

	abstract resourceType: ResourceField<string> // 资源类型

	/**
	 * 获取可保存的数据（纯 JSON 对象）
	 * 子类必须实现此方法，返回可直接序列化的纯数据对象
	 * @returns {any} 可保存的纯 JSON 对象
	 */
	abstract getSaveData(): any

	/**
	 * 生成唯一的资源ID
	 * @returns {string} 资源ID
	 */
	protected generateId(): string {
		return Date.now().toString() + Math.random().toString(36).substr(2, 9)
	}

	/**
	 * 辅助方法：提取所有 saveable 字段的值，返回纯 JSON 对象
	 * 子类可以在 getSaveData() 中调用此方法
	 * @returns {any} 包含所有 saveable 字段的纯 JSON 对象
	 */
	protected extractSaveableFields(): any {
		const saveableData: any = {}
		for (const key in this) {
			const field = (this as any)[key]
			if (field instanceof ResourceField && field.saveable) {
				const valueToSave = field.value !== undefined ? field.value : field.defaultValue
				const extracted = BaseResources.extractPrimitiveValue(valueToSave)
				// 直接赋值，确保是原始类型或纯数组/对象
				saveableData[key] = extracted
			}
		}
		return saveableData
	}

	/**
	 * 构造函数
	 * 自动生成 id（如果还没有值）
	 * 注意：fromJSON 会覆盖这个值（如果 JSON 中有 id）
	 */
	constructor() {
		// 如果 id 还没有值，自动生成
		if (!this.id.value) {
			this.id.value = this.generateId()
		}
	}

	/**
	 * 从任意值中提取原始值
	 * 如果值是 ResourceField 对象，递归提取其 value
	 * 如果值是包含 value 属性的对象，递归提取其 value
	 * 否则直接返回原值（原始类型或数组）
	 * @param value - 要提取的值
	 * @returns 原始值
	 */
	static extractPrimitiveValue(value: any): any {
		// 如果是 ResourceField 对象，递归提取
		if (value instanceof ResourceField) {
			return BaseResources.extractPrimitiveValue(value.value)
		}
		// 如果是普通对象且包含 value 属性，递归提取
		if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
			return BaseResources.extractPrimitiveValue(value.value)
		}
		// 对于数组和对象，检查是否是 Proxy
		if (value && typeof value === 'object') {
			const isArray = Array.isArray(value)
			const valueType = isArray ? 'array' : 'object'
			const constructorName = value.constructor?.name
			const hasProxyIndicator = constructorName !== (isArray ? 'Array' : 'Object')
			
			// if (hasProxyIndicator || valueType === 'array') {
			// 	console.log(`[BaseResources.extractPrimitiveValue] 检测到 ${valueType}，constructor: ${constructorName}，尝试序列化检查:`, {
			// 		canStringify: (() => {
			// 			try {
			// 				JSON.stringify(value)
			// 				return true
			// 			} catch (e) {
			// 				return `失败: ${e.message}`
			// 			}
			// 		})(),
			// 		length: isArray ? value.length : Object.keys(value).length
			// 	})
			// }
		}
		// 否则直接返回（原始类型或数组）
		return value
	}

	/**
	 * 从资源实例中提取可保存的数据
	 * @param instance - 资源类实例（Game、Novel、Audio 等）
	 * @returns 只包含可保存字段的普通对象
	 */
	static getSaveableData(instance: BaseResources): any {
		const saveableData: any = {}
		console.log(`[BaseResources.getSaveableData] 开始提取，instance 类型:`, instance?.constructor?.name)
		
		for (const key in instance) {
			const field = (instance as any)[key]
			if (field instanceof ResourceField && field.saveable) {
				// 如果 value 是 undefined 但 defaultValue 存在，使用 defaultValue
				const valueToSave = field.value !== undefined ? field.value : field.defaultValue
				// 使用 extractPrimitiveValue 确保保存的是原始值
				const extracted = BaseResources.extractPrimitiveValue(valueToSave)
				saveableData[key] = extracted
				
				// 记录关键字段的类型信息
				if (key === 'id' || key === 'resourceType' || key === 'tags' || key === 'developers') {
					console.log(`[BaseResources.getSaveableData] 字段 ${key}:`, {
						valueType: typeof extracted,
						isArray: Array.isArray(extracted),
						constructor: extracted?.constructor?.name,
						value: Array.isArray(extracted) ? `[数组，长度: ${extracted.length}]` : (typeof extracted === 'object' ? '[对象]' : extracted)
					})
				}
			}
		}
		
		console.log(`[BaseResources.getSaveableData] 提取完成，返回对象 keys:`, Object.keys(saveableData))
		return saveableData
	}

	/**
	 * 从 JSON 对象创建资源类实例
	 * @param this - 资源类构造函数（Game、Novel、Audio 等）
	 * @param jsonData - 从 JSON 加载的普通对象
	 * @returns 资源类实例
	 */
	static fromJSON<T extends BaseResources>(
		this: new () => T,
		jsonData: any
	): T {
		const instance = new this()
		
		console.log('[BaseResources.fromJSON] 开始解析:', {
			jsonData,
			jsonDataKeys: Object.keys(jsonData || {})
		})
		
		// 遍历实例的所有属性，将 JSON 数据赋值给 ResourceField.value
		for (const key in instance) {
			const field = (instance as any)[key]
			if (field instanceof ResourceField) {
				// 如果 JSON 数据中有这个字段，赋值给 ResourceField.value
				if (jsonData[key] !== undefined && jsonData[key] !== null) {
					// 使用 extractPrimitiveValue 确保提取的是原始值
					const value = BaseResources.extractPrimitiveValue(jsonData[key])
					
					// console.log('[BaseResources.fromJSON] 处理字段:', {
					// 	key,
					// 	originalValue: jsonData[key],
					// 	extractedValue: value,
					// 	valueType: typeof value,
					// 	isObject: typeof value === 'object' && value !== null,
					// 	isArray: Array.isArray(value)
					// })
					
					field.value = value
					
					// console.log('[BaseResources.fromJSON] 赋值完成:', {
					// 	key,
					// 	finalValue: field.value,
					// 	finalValueType: typeof field.value
					// })
				}
			}
		}
		
		return instance
	}
}
  