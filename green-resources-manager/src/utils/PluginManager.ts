/**
 * 插件管理器
 * 负责扫描、加载和管理创意工坊插件
 */

interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  entry?: string
  tags?: string[]
  icon?: string
}

interface PluginInfo {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  entry?: string
  tags?: string[]
  icon?: string
  path: string // 插件目录路径
  enabled: boolean // 是否启用
  manifestPath: string // manifest.json 路径
}

interface PluginInstance {
  id: string
  info: PluginInfo
  instance: any // 插件实例（export default 的对象）
  api: any // 插件 API
  loaded: boolean // 是否已加载
}

class PluginManager {
  private plugins: PluginInfo[] = []
  private loadedPlugins: Map<string, PluginInstance> = new Map()
  private modsDirectory: string = 'mods'

  /**
   * 获取 mods 目录路径
   */
  private getModsDirectory(): string {
    // 在 Electron 应用中，mods 目录应该在应用根目录下
    // 这里返回相对路径，实际使用时需要转换为绝对路径
    return this.modsDirectory
  }

  /**
   * 扫描 mods 目录，加载所有插件
   */
  async scanPlugins(): Promise<PluginInfo[]> {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        console.warn('electronAPI.listFiles 不可用')
        return []
      }

      // 获取应用根路径
      let appRootPath = ''
      if (window.electronAPI.getAppRootPath) {
        try {
          const rootResult = await window.electronAPI.getAppRootPath() as any
          if (rootResult && (rootResult.success || typeof rootResult === 'string')) {
            // 如果返回的是对象，取 path 字段；如果是字符串，直接使用
            appRootPath = typeof rootResult === 'string' ? rootResult : (rootResult.path || '')
          }
        } catch (error) {
          console.warn('获取应用根路径失败:', error)
          appRootPath = ''
        }
      }

      // 构建 mods 目录路径
      const modsPath = appRootPath ? `${appRootPath}/${this.modsDirectory}` : this.modsDirectory
      
      // 列出 mods 目录下的所有文件夹
      const listResult = await window.electronAPI.listFiles(modsPath)
      
      if (!listResult || !listResult.success || !listResult.files) {
        console.warn('无法列出 mods 目录:', listResult?.error || '未知错误')
        return []
      }

      const plugins: PluginInfo[] = []
      
      // 遍历每个目录，检查是否为有效插件
      for (const folderName of listResult.files) {
        // 跳过 README.md 等文件
        if (folderName.includes('.')) {
          continue
        }

        try {
          const pluginPath = appRootPath ? `${appRootPath}/${this.modsDirectory}/${folderName}` : `${this.modsDirectory}/${folderName}`
          const manifestPath = `${pluginPath}/manifest.json`

          // 检查 manifest.json 是否存在
          if (window.electronAPI.checkFileExists) {
            const existsResult = await window.electronAPI.checkFileExists(manifestPath)
            if (!existsResult || !existsResult.success) {
              continue
            }
          }

          // 读取 manifest.json
          if (!window.electronAPI.readJsonFile) {
            continue
          }

          const manifestResult = await window.electronAPI.readJsonFile(manifestPath)
          
          if (!manifestResult || !manifestResult.success || !manifestResult.data) {
            console.warn(`无法读取插件 ${folderName} 的 manifest.json`)
            continue
          }

          const manifest = manifestResult.data as PluginManifest

          // 验证必需的字段
          if (!manifest.id || !manifest.name || !manifest.version) {
            console.warn(`插件 ${folderName} 的 manifest.json 缺少必需字段`)
            continue
          }

          // 加载插件启用状态（从设置或本地存储）
          const enabled = await this.getPluginEnabledStatus(manifest.id)

          const pluginInfo: PluginInfo = {
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            author: manifest.author,
            entry: manifest.entry || 'index.js',
            tags: manifest.tags,
            icon: manifest.icon,
            path: pluginPath,
            enabled: enabled,
            manifestPath: manifestPath
          }

          plugins.push(pluginInfo)
        } catch (error) {
          console.error(`加载插件 ${folderName} 失败:`, error)
        }
      }

      this.plugins = plugins
      return plugins
    } catch (error) {
      console.error('扫描插件失败:', error)
      return []
    }
  }

  /**
   * 获取插件启用状态
   */
  private async getPluginEnabledStatus(pluginId: string): Promise<boolean> {
    try {
      // 从本地存储读取
      const storageKey = `plugin-${pluginId}-enabled`
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        return stored === 'true'
      }
      
      // 默认禁用
      return false
    } catch (error) {
      console.error(`获取插件 ${pluginId} 启用状态失败:`, error)
      return false
    }
  }

  /**
   * 设置插件启用状态
   */
  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      const plugin = this.plugins.find(p => p.id === pluginId)
      if (!plugin) {
        console.warn(`插件 ${pluginId} 不存在`)
        return false
      }

      // 如果状态相同，不需要操作
      if (plugin.enabled === enabled) {
        return true
      }

      // 更新内存中的状态
      plugin.enabled = enabled

      // 保存到本地存储
      const storageKey = `plugin-${pluginId}-enabled`
      localStorage.setItem(storageKey, enabled.toString())

      // 如果启用，加载插件；如果禁用，卸载插件
      if (enabled) {
        await this.loadPlugin(pluginId)
      } else {
        await this.unloadPlugin(pluginId)
      }

      return true
    } catch (error) {
      console.error(`设置插件 ${pluginId} 启用状态失败:`, error)
      // 恢复状态
      const plugin = this.plugins.find(p => p.id === pluginId)
      if (plugin) {
        plugin.enabled = !enabled
      }
      return false
    }
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginId: string): Promise<boolean> {
    try {
      // 检查是否已加载
      if (this.loadedPlugins.has(pluginId)) {
        console.warn(`插件 ${pluginId} 已经加载`)
        return true
      }

      const plugin = this.plugins.find(p => p.id === pluginId)
      if (!plugin) {
        console.warn(`插件 ${pluginId} 不存在`)
        return false
      }

      // 读取插件代码
      if (!window.electronAPI || !window.electronAPI.readTextFile) {
        console.error('electronAPI.readTextFile 不可用')
        return false
      }

      const entryFile = plugin.entry || 'index.js'
      const entryPath = `${plugin.path}/${entryFile}`

      // 读取插件代码
      const codeResult = await window.electronAPI.readTextFile(entryPath)
      if (!codeResult || !codeResult.success || !codeResult.content) {
        console.error(`无法读取插件 ${pluginId} 的代码文件: ${entryPath}`)
        return false
      }

      const pluginCode = codeResult.content

      // 创建插件 API
      const { createPluginAPI } = await import('./PluginAPI')
      const api = createPluginAPI(pluginId)

      // 执行插件代码
      // 插件代码使用 ES6 export default 语法，需要转换为 CommonJS
      let pluginModule: any
      try {
        // 创建一个模块环境
        const moduleExports: any = {}
        const module = { exports: moduleExports }
        const exports = moduleExports

        // 将 ES6 export default 转换为 CommonJS module.exports
        // 替换 export default 为 module.exports =
        let transformedCode = pluginCode
        // 匹配 export default { ... } 或 export default function/class
        // 使用更精确的正则表达式
        transformedCode = transformedCode.replace(/export\s+default\s+/g, 'module.exports = ')

        // 使用 Function 构造函数执行转换后的代码
        const func = new Function('module', 'exports', transformedCode)
        func(module, module.exports)

        // 获取导出的模块
        pluginModule = module.exports

        // 验证模块是否有效
        if (!pluginModule || (typeof pluginModule === 'object' && Object.keys(pluginModule).length === 0 && pluginModule.constructor === Object)) {
          console.error(`插件 ${pluginId} 导出为空或无效`)
          return false
        }
      } catch (error) {
        console.error(`执行插件 ${pluginId} 代码失败:`, error)
        console.error('错误详情:', error)
        // 输出代码片段以便调试
        console.error('代码片段（前200字符）:', pluginCode.substring(0, 200))
        return false
      }

      if (!pluginModule || typeof pluginModule !== 'object') {
        console.error(`插件 ${pluginId} 没有导出有效的模块对象`)
        return false
      }

      // 创建插件实例
      const instance: PluginInstance = {
        id: pluginId,
        info: plugin,
        instance: pluginModule,
        api: api,
        loaded: false
      }

      // 调用插件的 onLoad 方法
      if (typeof pluginModule.onLoad === 'function') {
        try {
          await pluginModule.onLoad(api)
          instance.loaded = true
          console.log(`✅ 插件 ${pluginId} 加载成功`)
        } catch (error) {
          console.error(`插件 ${pluginId} 的 onLoad 方法执行失败:`, error)
          return false
        }
      } else {
        // 如果没有 onLoad，也标记为已加载
        instance.loaded = true
        console.log(`✅ 插件 ${pluginId} 加载成功（无 onLoad 方法）`)
      }

      // 有 styles.css 就注入到页面，卸载时再移除
      await this.loadPluginStyles(plugin)

      // 保存插件实例
      this.loadedPlugins.set(pluginId, instance)

      return true
    } catch (error) {
      console.error(`加载插件 ${pluginId} 失败:`, error)
      return false
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const instance = this.loadedPlugins.get(pluginId)
      if (!instance) {
        // 如果未加载，认为卸载成功
        return true
      }

      // 调用插件的 onUnload 方法
      if (instance.instance && typeof instance.instance.onUnload === 'function') {
        try {
          await instance.instance.onUnload(instance.api)
          console.log(`✅ 插件 ${pluginId} 卸载成功`)
        } catch (error) {
          console.error(`插件 ${pluginId} 的 onUnload 方法执行失败:`, error)
          // 即使 onUnload 失败，也继续卸载流程
        }
      }

      // 清理插件注册的导航项
      try {
        const pluginNavigationManager = (await import('./PluginNavigationManager')).default
        pluginNavigationManager.clearByPluginId(pluginId)
      } catch (error) {
        console.warn(`清理插件 ${pluginId} 的导航项失败:`, error)
      }

      this.removePluginStyles(pluginId)

      // 从已加载列表中移除
      this.loadedPlugins.delete(pluginId)

      return true
    } catch (error) {
      console.error(`卸载插件 ${pluginId} 失败:`, error)
      return false
    }
  }

  /**
   * 把插件目录里的 styles.css 注入页面。
   * 样式用插件 id 作为元素 id，重复加载时直接替换内容。
   */
  private async loadPluginStyles(plugin: PluginInfo): Promise<void> {
    try {
      const stylePath = `${plugin.path}/styles.css`

      if (window.electronAPI && window.electronAPI.checkFileExists) {
        const existsResult = await window.electronAPI.checkFileExists(stylePath)
        if (!existsResult || !existsResult.success || existsResult.exists === false) {
          return
        }
      }

      if (!window.electronAPI || !window.electronAPI.readTextFile) {
        return
      }

      const result = await window.electronAPI.readTextFile(stylePath)
      if (!result || !result.success || !result.content) {
        return
      }

      const styleId = `plugin-style-${plugin.id}`
      let styleElement = document.getElementById(styleId) as HTMLStyleElement | null
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }
      styleElement.textContent = result.content
    } catch (error) {
      console.warn(`加载插件 ${plugin.id} 的样式失败:`, error)
    }
  }

  private removePluginStyles(pluginId: string): void {
    const styleElement = document.getElementById(`plugin-style-${pluginId}`)
    if (styleElement) {
      styleElement.remove()
    }
  }

  /**
   * 加载所有启用的插件
   */
  async loadEnabledPlugins(): Promise<void> {
    const enabledPlugins = this.plugins.filter(p => p.enabled)
    console.log(`开始加载 ${enabledPlugins.length} 个启用的插件...`)

    for (const plugin of enabledPlugins) {
      try {
        await this.loadPlugin(plugin.id)
      } catch (error) {
        console.error(`加载插件 ${plugin.id} 失败:`, error)
      }
    }

    console.log(`插件加载完成，已加载 ${this.loadedPlugins.size} 个插件`)
  }

  /**
   * 获取已加载的插件实例
   */
  getLoadedPlugin(pluginId: string): PluginInstance | undefined {
    return this.loadedPlugins.get(pluginId)
  }

  /**
   * 获取所有已加载的插件
   */
  getLoadedPlugins(): PluginInstance[] {
    return Array.from(this.loadedPlugins.values())
  }

  /**
   * 获取所有插件
   */
  getPlugins(): PluginInfo[] {
    return [...this.plugins]
  }

  /**
   * 根据 ID 获取插件
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.plugins.find(p => p.id === pluginId)
  }
}

// 导出单例
const pluginManager = new PluginManager()
export default pluginManager

