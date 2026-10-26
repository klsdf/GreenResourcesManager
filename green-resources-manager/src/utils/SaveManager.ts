/**
 * 把日期写成统计页日历用的本地日期。
 * 不用 toISOString，那个是 UTC，晚上打开会被记到前一天，格子对不上。
 * @param {Date} date 要格式化的日期
 * @returns {string} YYYY-MM-DD
 */
function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * SaveManager - 统一管理存档和读档功能
 * 支持本地 JSON 文件存储、文件导入导出、数据备份等功能
 */
class SaveManager {
  dataDirectory: string
  version: string
  dataDirectories: Record<string, string>
  filePaths: Record<string, string>
  thumbnailDirectories: Record<string, string>
  defaultData: Record<string, any>
  // 数据缓存
  dataCache: Record<string, any> = {}
  // 设置缓存
  settingsCache: Record<string, any> | null = null
  settingsCacheDirty: boolean = false  // 标记缓存是否已被修改，需要写入磁盘

  constructor() {
    this.dataDirectory = 'SaveData'
    this.version = '0.0.0' // 默认版本号，将在初始化时更新
    
    // 各种数据类型的根目录
    this.dataDirectories = {
      games: `${this.dataDirectory}/Game`,
      software: `${this.dataDirectory}/Software`,
      images: `${this.dataDirectory}/Image`,
      singleImage: `${this.dataDirectory}/SingleImage`,
      videos: `${this.dataDirectory}/Video`,
      animeSeries: `${this.dataDirectory}/AnimeSeries`,
      audios: `${this.dataDirectory}/Audio`,
      websites: `${this.dataDirectory}/Website`,
      novels: `${this.dataDirectory}/Novel`,
      settings: `${this.dataDirectory}/Settings`
    }
    
    // 各种数据类型的存档文件路径
    this.filePaths = {
      games: `${this.dataDirectories.games}/games.json`,
      software: `${this.dataDirectories.software}/software.json`,
      images: `${this.dataDirectories.images}/images.json`,
      singleImage: `${this.dataDirectories.singleImage}/singleImage.json`,
      videos: `${this.dataDirectories.videos}/videos.json`,
      animeSeries: `${this.dataDirectories.animeSeries}/animeSeries.json`,
      audios: `${this.dataDirectories.audios}/audios.json`,
      websites: `${this.dataDirectories.websites}/websites.json`,
      novels: `${this.dataDirectories.novels}/novels.json`,
      settings: `${this.dataDirectories.settings}/settings.json`,
      collections: `${this.dataDirectories.settings}/collections.json`,
      user: `${this.dataDirectories.settings}/user.json`, // 用户数据文件
      achievements: `${this.dataDirectories.settings}/achievements.json`, // 成就状态文件
      backup: `${this.dataDirectory}/backup.json` // 备份文件仍在根目录
    }
    
    // 缩略图目录
    this.thumbnailDirectories = {
      videos: `${this.dataDirectories.videos}/Covers`,
      animeSeries: `${this.dataDirectories.animeSeries}/Covers`,
      images: `${this.dataDirectories.images}/Covers`,
      audios: `${this.dataDirectories.audios}/Covers`,
      games: `${this.dataDirectories.games}/Covers`
    }
    
    // 默认数据结构
    this.defaultData = {
      games: [],
      images: [],
      settings: {
        theme: 'auto',
        sidebarWidth: 280,
        autoStart: false,
        minimizeToTray: true,
        disguiseMode: false,
        showWelcome: true,
        sageMode: false,
        safetyKey: 'Ctrl+Alt+Q',
        safetyAppPath: '',
        dataPath: 'C:\\Users\\User\\Documents\\ButterManager',
        autoBackup: true,
        screenshotKey: 'Ctrl+F12',
        screenshotLocation: 'default',
        screenshotsPath: '',
        screenshotFormat: 'png',
        screenshotQuality: 90,
        screenshotNotification: true,
        autoOpenScreenshotFolder: false,
        smartWindowDetection: true,
        videoPlayMode: 'external',
        /** 网站打开方式。external 用系统浏览器，internal 在软件新标签页打开。 */
        websiteOpenMode: 'external',
        /** 云存档。打开后把存档数据库复制到本机 OneDrive 文件夹。 */
        onedriveBackup: false,
        lastView: 'games', // 记录最后访问的页面
        // 各页面的排序方式设置
        sortSettings: {
          games: 'name-asc',
          images: 'name-asc',
          videos: 'name-asc',
          novels: 'name-asc',
          websites: 'name-asc',
          audio: 'name-asc'
        },
        // 各页面的布局缩放设置
        layoutSettings: {
          games: 100,
          images: 100,
          videos: 100,
          novels: 100,
          websites: 100,
          audio: 100
        },
        // 各页面的显示方式：grid 是网格，list 是列表
        displayModes: {},
        // 各页面的标签筛选设置（按页面类型存储每个筛选器的选中/排除状态）
        filterSettings: {},
        /** 导入资源时，哪些特征相同才算同一个资源。 */
        sameResourceRule: {
          version: 1,
          mode: 'all',
          criteria: ['fileName', 'parentFolder']
        },
        /** 在资源旁边写隐藏标记文件，移动或改名后仍能按资源 ID 找回。 */
        resourceMarkerEnabled: true
      }
    }
  }

  /**
   * 写入 JSON 文件
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   * @returns {Promise<boolean>} 写入是否成功
   */
  /**
   * 获取应用版本号
   * @returns {Promise<string>} 版本号
   */
  async getAppVersion() {
    try {
      
      
      //从 package.json 导入
      try {
        const packageJson = await import('../../package.json')
        return packageJson.version || '0.0.0'
      } catch (importError) {
        console.warn('无法从 package.json 获取版本号:', importError)
      }
      
      return '0.0.0'
    } catch (error) {
      console.warn('获取版本号失败:', error)
      return '0.0.0'
    }
  }

  /**
   * 初始化存档系统
   * 检查并创建必要的文件夹和默认文件
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize() {
    try {
      // 获取应用版本号
      this.version = await this.getAppVersion()
      // 先读项目根目录的位置记录，再打开真正的存档
      await this.applySaveDataDirectory()
      
      // 检查主存档目录是否存在
      const mainDirExists = await this.ensureDataDirectory()
      if (!mainDirExists) {
        console.error('无法创建主存档目录:', this.dataDirectory)
        return false
      }
      
      // 创建所有子目录
      const directories = Object.values(this.dataDirectories)
      for (const dir of directories) {
        const created = await this.ensureDirectoryByPath(dir)
        if (!created) {
          console.error('无法创建目录:', dir)
          return false
        }
      }
      
      // 创建缩略图目录
      const thumbnailDirs = Object.values(this.thumbnailDirectories)
      for (const dir of thumbnailDirs) {
        const created = await this.ensureDirectoryByPath(dir)
        if (!created) {
          console.error('无法创建缩略图目录:', dir)
          return false
        }
      }
      
      // 检查并创建默认数据文件
      await this.initializeDataFiles()
      return true
    } catch (error) {
      console.error('初始化存档系统失败:', error)
      return false
    }
  }

  /**
   * 按项目根目录的位置记录切换正在使用的存档目录。
   * @returns {Promise<void>}
   */
  async applySaveDataDirectory() {
    if (!window.electronAPI?.getSaveDataDirectory) return
    const directory = await window.electronAPI.getSaveDataDirectory()
    if (!directory || directory === this.dataDirectory) return
    this.setDataDirectory(directory)
  }

  /**
   * 从真正的存档设置里去掉路径。
   * 存档位置只放在项目根目录，不跟主题、截图目录混在一起。
   * @param {Object} settings - 即将写入存档的设置
   * @returns {Object} 去掉路径后的设置
   */
  omitSaveLocation(settings) {
    if (!settings) return settings
    delete settings.saveDataLocation
    delete settings.saveDataPath
    return settings
  }

  /**
   * 设置数据目录（用于自定义存档位置）
   * @param {string} newDirectory - 新的数据目录路径
   * @returns {boolean} 设置是否成功
   */
  setDataDirectory(newDirectory) {
    try {
      console.log('=== 设置新的数据目录 ===')
      console.log('原目录:', this.dataDirectory)
      console.log('新目录:', newDirectory)
      
      // 更新主目录
      this.dataDirectory = newDirectory
      
      // 重新构建所有路径
      this.dataDirectories = {
        games: `${this.dataDirectory}/Game`,
        software: `${this.dataDirectory}/Software`,
        images: `${this.dataDirectory}/Image`,
        singleImage: `${this.dataDirectory}/SingleImage`,
        videos: `${this.dataDirectory}/Video`,
        animeSeries: `${this.dataDirectory}/AnimeSeries`,
        audios: `${this.dataDirectory}/Audio`,
        websites: `${this.dataDirectory}/Website`,
        novels: `${this.dataDirectory}/Novel`,
        settings: `${this.dataDirectory}/Settings`
      }
      
      this.filePaths = {
        games: `${this.dataDirectories.games}/games.json`,
        software: `${this.dataDirectories.software}/software.json`,
        images: `${this.dataDirectories.images}/images.json`,
        singleImage: `${this.dataDirectories.singleImage}/singleImage.json`,
        videos: `${this.dataDirectories.videos}/videos.json`,
        animeSeries: `${this.dataDirectories.animeSeries}/animeSeries.json`,
        audios: `${this.dataDirectories.audios}/audios.json`,
        websites: `${this.dataDirectories.websites}/websites.json`,
        novels: `${this.dataDirectories.novels}/novels.json`,
        settings: `${this.dataDirectories.settings}/settings.json`,
        collections: `${this.dataDirectories.settings}/collections.json`,
        user: `${this.dataDirectories.settings}/user.json`,
        achievements: `${this.dataDirectories.settings}/achievements.json`,
        backup: `${this.dataDirectory}/backup.json`
      }
      
      this.thumbnailDirectories = {
        videos: `${this.dataDirectories.videos}/Covers`,
        animeSeries: `${this.dataDirectories.animeSeries}/Covers`,
        images: `${this.dataDirectories.images}/Covers`,
        audios: `${this.dataDirectories.audios}/Covers`,
        games: `${this.dataDirectories.games}/Covers`
      }
      
      console.log('数据目录设置完成')
      console.log('新的数据目录:', this.dataDirectory)
      console.log('新的文件路径:', this.filePaths)
      
      return true
    } catch (error) {
      console.error('设置数据目录失败:', error)
      return false
    }
  }

  /**
   * 通过路径确保目录存在
   * @param {string} dirPath - 目录路径
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDirectoryByPath(dirPath) {
    try {
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建目录失败:', dirPath, error)
      return false
    }
  }

  /**
   * 初始化数据文件
   * 检查文件是否存在，如果不存在则创建默认文件
   * @returns {Promise<void>}
   */
  async initializeDataFiles() {
    try {
      // console.log('=== 初始化数据文件 ===')
      
      // 检查并创建各种数据文件
      const dataTypes = ['games', 'images', 'videos', 'audios', 'websites', 'novels', 'settings', 'user', 'achievements', 'collections']
      
      for (const dataType of dataTypes) {
        const filePath = this.filePaths[dataType]
        const fileExists = await this.fileExists(filePath)
        
        if (!fileExists) {
          console.log(`创建默认 ${dataType} 文件:`, filePath)
          await this.createDefaultDataFile(dataType)
        } else {
          //文件存在，啥也不用干
          // console.log(`✅ ${dataType} 文件已存在:`, filePath)
        }
      }
    } catch (error) {
      console.error('初始化数据文件失败:', error)
      throw error
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(filePath) {
    try {
      if (window.electronAPI && window.electronAPI.readJsonFile) {
        const result = await window.electronAPI.readJsonFile(filePath)
        return result.success
      } else {
        // 浏览器环境下的降级处理
        return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * 创建默认数据文件
   * @param {string} dataType - 数据类型
   * @returns {Promise<boolean>} 创建是否成功
   */
  async createDefaultDataFile(dataType) {
    try {
      const filePath = this.filePaths[dataType]
      let defaultData = {}
      
      switch (dataType) {
        case 'games':
          defaultData = { games: [] }
          break
        case 'images':
          defaultData = { images: [] }
          break
        case 'videos':
          defaultData = { videos: [] }
          break
        case 'audios':
          defaultData = { audios: [] }
          break
        case 'websites':
          defaultData = { websites: [] }
          break
        case 'novels':
          defaultData = { novels: [] }
          break
        case 'settings':
          defaultData = { settings: this.defaultData.settings }
          break
        case 'user':
          defaultData = { 
            user: {
              name: '',
              joinDate: new Date().toISOString(),
              loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
              checkInDays: [],
              totalUsageTime: 0 // 总使用时长（秒）
            }
          }
          break
        case 'achievements':
          defaultData = { 
            achievements: {
              unlockedAchievements: new Map(), // 存储已解锁的成就ID和状态
              lastCheckTime: new Date().toISOString()
            }
          }
          break
        case 'collections':
          defaultData = { collections: [] }
          break
        default:
          console.warn('未知的数据类型:', dataType)
          return false
      }
      
      // 写入默认数据
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        const result = await window.electronAPI.writeJsonFile(filePath, defaultData)
        if (result.success) {
          console.log(`✅ 默认 ${dataType} 文件创建成功:`, filePath)
          return true
        } else {
          console.error(`❌ 创建默认 ${dataType} 文件失败:`, result.error)
          return false
        }
      } else {
        console.warn('Electron API 不可用，无法创建默认文件')
        return false
      }
    } catch (error) {
      console.error(`创建默认 ${dataType} 文件失败:`, error)
      return false
    }
  }

  /**
   * 清理数据中的不可序列化内容
   * @param {any} data - 要清理的数据
   * @returns {any} 清理后的数据
   */
  cleanDataForSerialization(data) {
    if (data === null || data === undefined) {
      return data
    }
    
    if (typeof data === 'function') {
      return undefined // 函数无法序列化，返回 undefined
    }
    
    if (typeof data === 'symbol') {
      return undefined // Symbol 无法序列化，返回 undefined
    }
    
    if (data instanceof Date) {
      return data.toISOString() // 日期转换为字符串
    }
    
    if (data instanceof RegExp) {
      return data.toString() // 正则表达式转换为字符串
    }
    
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack
      }
    }
    
    if (data instanceof Map) {
      return Object.fromEntries(data) // Map 转换为普通对象
    }
    
    if (data instanceof Set) {
      return Array.from(data) // Set 转换为数组
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanDataForSerialization(item))
    }
    
    if (typeof data === 'object') {
      const cleaned = {}
      for (const [key, value] of Object.entries(data)) {
        const cleanedValue = this.cleanDataForSerialization(value)
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue
        }
      }
      return cleaned
    }
    
    return data
  }

  /**
   * 创建文件备份
   * @param {string} filePath - 文件路径
   * @returns {Promise<string|null>} 备份文件路径，失败返回null
   */
  async createBackup(filePath) {
    try {
      if (!window.electronAPI || !window.electronAPI.readJsonFile || !window.electronAPI.writeJsonFile) {
        return null
      }
      
      // 检查原文件是否存在
      const fileExists = await this.fileExists(filePath)
      if (!fileExists) {
        return null // 文件不存在，无需备份
      }
      
      // 生成备份文件路径（添加 .backup 后缀和时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `${filePath}.backup.${timestamp}`
      
      // 读取原文件内容
      const originalData = await this.readJsonFile(filePath)
      if (!originalData) {
        return null // 无法读取原文件，跳过备份
      }
      
      // 写入备份文件
      const backupSuccess = await this.writeJsonFileWithoutBackup(backupPath, originalData)
      if (backupSuccess) {
        console.log('✅ 已创建备份文件:', backupPath)
        
        // 清理旧备份（只保留最近的3个备份）
        await this.cleanupOldBackups(filePath, 3)
        
        return backupPath
      }
      
      return null
    } catch (error) {
      console.warn('创建备份失败:', error)
      return null
    }
  }

  /**
   * 清理旧的备份文件
   * @param {string} filePath - 原文件路径
   * @param {number} keepCount - 保留的备份数量
   */
  async cleanupOldBackups(filePath, keepCount = 5) {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        return
      }
      
      const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'))
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1 || filePath.lastIndexOf('\\') + 1)
      const backupPattern = `${fileName}.backup.`
      
      const result = await window.electronAPI.listFiles(dir)
      if (!result.success || !result.files) {
        return
      }
      
      // 筛选出所有备份文件
      const backups = (result.files as any[])
        .filter((file: any) => file && (typeof file === 'string' ? file.startsWith(backupPattern) : file.name && file.name.startsWith(backupPattern)))
        .map((file: any) => {
          if (typeof file === 'string') {
            return {
              name: file,
              path: `${dir}/${file}`,
              mtime: 0
            }
          }
          return {
            name: file.name,
            path: file.path || `${dir}/${file.name}`,
            mtime: file.mtime || 0
          }
        })
        .sort((a, b) => b.mtime - a.mtime) // 按修改时间降序排列
      
      // 删除多余的备份（保留最近的 keepCount 个）
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount)
        for (const backup of toDelete) {
          try {
            if (window.electronAPI.deleteFile) {
              await window.electronAPI.deleteFile(backup.path)
              console.log('🗑️ 已删除旧备份:', backup.name)
            }
          } catch (error) {
            console.warn('删除旧备份失败:', backup.name, error)
          }
        }
      }
    } catch (error) {
      // 清理失败不影响主流程，静默处理
      console.warn('清理旧备份失败（不影响使用）:', error)
    }
  }

  /**
   * 不创建备份的写入方法（用于备份文件本身）
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   * @returns {Promise<boolean>} 写入是否成功
   */
  async writeJsonFileWithoutBackup(filePath, data) {
    try {
      if (!filePath) {
        throw new Error('文件路径不能为空')
      }
      
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        const cleanedData = this.cleanDataForSerialization(data)
        let serializedData
        try {
          serializedData = JSON.parse(JSON.stringify(cleanedData))
        } catch (serializeError) {
          console.error('数据序列化失败:', serializeError)
          throw new Error(`数据序列化失败: ${serializeError.message}`)
        }
        
        const result = await window.electronAPI.writeJsonFile(filePath, serializedData)
        return result.success
      } else {
        const cleanedData = this.cleanDataForSerialization(data)
        localStorage.setItem(filePath, JSON.stringify(cleanedData))
        return true
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      return false
    }
  }

  async writeJsonFile(filePath, data) {
    try {
      // 添加调试信息
      if (!filePath) {
        console.error('writeJsonFile: filePath 参数为空')
        console.error('当前 filePaths:', this.filePaths)
        throw new Error('文件路径不能为空')
      }
      
      // 备份逻辑已移到 electron.js 中统一处理，这里不再需要
      
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        // 清理数据，移除不可序列化的内容
        const cleanedData = this.cleanDataForSerialization(data)
        
        // 先序列化数据，确保可以安全传递
        let serializedData
        try {
          serializedData = JSON.parse(JSON.stringify(cleanedData))
        } catch (serializeError) {
          console.error('数据序列化失败:', serializeError)
          console.error('原始数据:', data)
          console.error('清理后数据:', cleanedData)
          throw new Error(`数据序列化失败: ${serializeError.message}`)
        }
        
        const result = await window.electronAPI.writeJsonFile(filePath, serializedData)
        return result.success
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        const cleanedData = this.cleanDataForSerialization(data)
        localStorage.setItem(filePath, JSON.stringify(cleanedData))
        return true
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      console.error('文件路径:', filePath)
      console.error('数据内容:', data)
      return false
    }
  }

  /**
   * 读取 JSON 文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object|null>} 读取的数据
   */
  async readJsonFile(filePath) {
    try {
      if (window.electronAPI && window.electronAPI.readJsonFile) {
        const result = await window.electronAPI.readJsonFile(filePath)
        return result.success ? result.data : null
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        const data = localStorage.getItem(filePath)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      return null
    }
  }

  /**
   * 确保数据目录存在
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDataDirectory() {
    try {
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(this.dataDirectory)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建数据目录失败:', error)
      return false
    }
  }

  /**
   * 确保指定数据类型的目录存在
   * @param {string} dataType - 数据类型 ('games', 'images', 'videos', 'audios', 'websites', 'novels', 'settings')
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDataTypeDirectory(dataType) {
    try {
      const dirPath = this.dataDirectories[dataType]
      if (!dirPath) {
        console.error('未知的数据类型:', dataType)
        return false
      }

      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error(`创建${dataType}数据目录失败:`, error)
      return false
    }
  }

  /**
   * 确保缩略图目录存在
   * @param {string} type - 数据类型 ('videos', 'images', 'audios', 'games')
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureThumbnailDirectory(type) {
    try {
      const dirPath = this.thumbnailDirectories[type]
      if (!dirPath) {
        console.error('未知的缩略图类型:', type)
        return false
      }

      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建缩略图目录失败:', error)
      return false
    }
  }

  /**
   * 保存缩略图文件
   * @param {string} type - 数据类型 ('videos', 'images', 'audios', 'games')
   * @param {string} filename - 文件名
   * @param {string} dataUrl - base64数据URL
   * @returns {Promise<string|null>} 保存的文件路径，失败返回null
   */
  async saveThumbnail(type, filename, dataUrl) {
    try {
      // 确保目录存在
      const dirCreated = await this.ensureThumbnailDirectory(type)
      if (!dirCreated) {
        console.error('无法创建缩略图目录')
        return null
      }

      const dirPath = this.thumbnailDirectories[type]
      const filePath = `${dirPath}/${filename}`

      if (window.electronAPI && window.electronAPI.saveThumbnail) {
        const result = await window.electronAPI.saveThumbnail(filePath, dataUrl)
        if (result.success) {
          console.log('缩略图保存成功:', filePath)
          return filePath
        } else {
          console.error('缩略图保存失败:', result.error)
          return null
        }
      } else {
        console.warn('Electron API 不可用，无法保存缩略图')
        return null
      }
    } catch (error) {
      console.error('保存缩略图失败:', error)
      return null
    }
  }

  /**
   * 删除缩略图文件
   * @param {string} filePath - 缩略图文件路径
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteThumbnail(filePath) {
    try {
      if (!filePath || filePath.startsWith('data:')) {
        // 如果是base64数据或空路径，直接返回成功
        return true
      }

      let targetPath = String(filePath).replace(/\\/g, '/')
      // 数据库里的封面是相对 SaveData 的路径，delete-file 按进程工作目录解析，
      // 原样传过去会找不到文件却返回成功，旧图就一直留着。
      if (!/^[A-Za-z]:\//.test(targetPath) && !targetPath.startsWith('/') && !targetPath.startsWith('//')) {
        const base = String(this.dataDirectory || '').replace(/\\/g, '/').replace(/\/+$/, '')
        if (!base) {
          console.warn('数据目录未初始化，无法删除缩略图:', filePath)
          return false
        }
        targetPath = `${base}/${targetPath.replace(/^\.?\/*/, '')}`
      }

      if (window.electronAPI && window.electronAPI.deleteFile) {
        const result = await window.electronAPI.deleteFile(targetPath)
        return result.success
      } else {
        console.warn('Electron API 不可用，无法删除缩略图')
        return false
      }
    } catch (error) {
      console.error('删除缩略图失败:', error)
      return false
    }
  }

  /**
   * 保存图片（漫画专辑）数据到本地 JSON 文件
   * @param {Array} images - 图片专辑数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveImages(images) {
    try {
      await this.ensureDataTypeDirectory('images')
      const data = {
        images: images,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.images, data)
      if (success) {
        console.log('图片数据保存成功:', images.length, '个专辑')
        this.dataCache.images = JSON.parse(JSON.stringify(images)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存图片数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载图片（漫画专辑）数据
   * @returns {Promise<Array>} 图片专辑数据数组
   */
  async loadImages() {
    // 检查缓存
    if (this.dataCache.images) {
      console.log('从缓存加载图片数据:', this.dataCache.images.length, '个专辑')
      return JSON.parse(JSON.stringify(this.dataCache.images))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.images)
      if (data && Array.isArray(data.images)) {
        console.log('加载图片数据:', data.images.length, '个专辑')
        this.dataCache.images = data.images // 更新缓存
        return data.images
      }
      return []
    } catch (error) {
      console.error('加载图片数据失败:', error)
      return []
    }
  }

  /**
   * 保存游戏数据到本地 JSON 文件
   * @param {Array} games - 游戏数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveGames(games) {
    try {
      await this.ensureDataTypeDirectory('games')
      
      const data = {
        games: games,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.games, data)
      if (success) {
        console.log('游戏数据保存成功:', games.length, '个游戏')
        this.dataCache.games = JSON.parse(JSON.stringify(games)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存游戏数据失败:', error)
      return false
    }
  }

  /**
   * 保存软件数据到本地 JSON 文件
   * @param {Array} software - 软件数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSoftware(software) {
    try {
      await this.ensureDataTypeDirectory('software')
      
      const data = {
        software: software,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.software, data)
      if (success) {
        console.log('软件数据保存成功:', software.length, '个软件')
        this.dataCache.software = JSON.parse(JSON.stringify(software)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存软件数据失败:', error)
      return false
    }
  }

  /**
   * 保存单图数据到本地 JSON 文件
   * @param {Array} singleImage - 单图数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSingleImage(singleImage) {
    try {
      await this.ensureDataTypeDirectory('singleImage')
      
      const data = {
        singleImage: singleImage,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.singleImage, data)
      if (success) {
        console.log('单图数据保存成功:', singleImage.length, '个单图')
        this.dataCache.singleImage = JSON.parse(JSON.stringify(singleImage)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存单图数据失败:', error)
      return false
    }
  }

  /**
   * 保存视频数据到本地 JSON 文件
   * @param {Array} videos - 视频数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveVideos(videos) {
    try {
      await this.ensureDataTypeDirectory('videos')

      const data = {
        videos: videos,
        timestamp: new Date().toISOString(),
        version: this.version
      }

      const success = await this.writeJsonFile(this.filePaths.videos, data)
      if (success) {
        console.log('视频数据保存成功:', videos.length, '个视频')
        this.dataCache.videos = JSON.parse(JSON.stringify(videos)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存视频数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载视频数据
   * @returns {Promise<Array>} 视频数据数组
   */
  async loadVideos() {
    // 检查缓存
    if (this.dataCache.videos) {
      console.log('从缓存加载视频数据:', this.dataCache.videos.length, '个视频')
      return JSON.parse(JSON.stringify(this.dataCache.videos))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.videos)
      if (data && Array.isArray(data.videos)) {
        console.log('加载视频数据:', data.videos.length, '个视频')
        this.dataCache.videos = data.videos // 更新缓存
        return data.videos
      }
      return []
    } catch (error) {
      console.error('加载视频数据失败:', error)
      return []
    }
  }

  /**
   * 保存番剧数据到本地 JSON 文件
   * @param {Array} animeSeries - 番剧数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveAnimeSeries(animeSeries) {
    try {
      await this.ensureDataTypeDirectory('animeSeries')

      const data = {
        animeSeries: animeSeries,
        timestamp: new Date().toISOString(),
        version: this.version
      }

      const success = await this.writeJsonFile(this.filePaths.animeSeries, data)
      if (success) {
        console.log('番剧数据保存成功:', animeSeries.length, '个番剧')
        this.dataCache.animeSeries = JSON.parse(JSON.stringify(animeSeries)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存番剧数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载番剧数据
   * @returns {Promise<Array>} 番剧数据数组
   */
  async loadAnimeSeries() {
    // 检查缓存
    if (this.dataCache.animeSeries) {
      console.log('从缓存加载番剧数据:', this.dataCache.animeSeries.length, '个番剧')
      return JSON.parse(JSON.stringify(this.dataCache.animeSeries))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.animeSeries)
      if (data && Array.isArray(data.animeSeries)) {
        console.log('加载番剧数据:', data.animeSeries.length, '个番剧')
        this.dataCache.animeSeries = data.animeSeries // 更新缓存
        return data.animeSeries
      }
      return []
    } catch (error) {
      console.error('加载番剧数据失败:', error)
      return []
    }
  }

  async saveAudios(audios) {
    try {
      await this.ensureDataTypeDirectory('audios')
      const data = {
        audios: audios,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.audios, data)
      if (success) {
        console.log('音频数据保存成功:', audios.length, '个音频')
        this.dataCache.audios = JSON.parse(JSON.stringify(audios)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存音频数据失败:', error)
      return false
    }
  }

  async loadAudios() {
    // 检查缓存
    if (this.dataCache.audios) {
      console.log('从缓存加载音频数据:', this.dataCache.audios.length, '个音频')
      return JSON.parse(JSON.stringify(this.dataCache.audios))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.audios)
      if (data && Array.isArray(data.audios)) {
        console.log('加载音频数据:', data.audios.length, '个音频')
        this.dataCache.audios = data.audios // 更新缓存
        return data.audios
      }
      return []
    } catch (error) {
      console.error('加载音频数据失败:', error)
      return []
    }
  }

  async saveWebsites(websites) {
    try {
      await this.ensureDataTypeDirectory('websites')
      const data = {
        websites: websites,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.websites, data)
      if (success) {
        console.log('网站数据保存成功:', websites.length, '个网站')
        this.dataCache.websites = JSON.parse(JSON.stringify(websites)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存网站数据失败:', error)
      return false
    }
  }

  async loadWebsites() {
    // 检查缓存
    if (this.dataCache.websites) {
      console.log('从缓存加载网站数据:', this.dataCache.websites.length, '个网站')
      return JSON.parse(JSON.stringify(this.dataCache.websites))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.websites)
      if (data && Array.isArray(data.websites)) {
        console.log('加载网站数据:', data.websites.length, '个网站')
        this.dataCache.websites = data.websites // 更新缓存
        return data.websites
      }
      return []
    } catch (error) {
      console.error('加载网站数据失败:', error)
      return []
    }
  }

  async saveNovels(novels) {
    try {
      await this.ensureDataTypeDirectory('novels')
      const data = {
        novels: novels,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.novels, data)
      if (success) {
        console.log('小说数据保存成功:', novels.length, '本小说')
        this.dataCache.novels = JSON.parse(JSON.stringify(novels)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存小说数据失败:', error)
      return false
    }
  }

  async loadNovels() {
    // 检查缓存
    if (this.dataCache.novels) {
      console.log('从缓存加载小说数据:', this.dataCache.novels.length, '本小说')
      return JSON.parse(JSON.stringify(this.dataCache.novels))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.novels)
      if (data && Array.isArray(data.novels)) {
        console.log('加载小说数据:', data.novels.length, '本小说')
        this.dataCache.novels = data.novels // 更新缓存
        return data.novels
      }
      return []
    } catch (error) {
      console.error('加载小说数据失败:', error)
      return []
    }
  }

  /**
   * 保存合集数据到本地 JSON 文件
   * @param {Array} collections - 合集数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveCollections(collections) {
    try {
      await this.ensureDataTypeDirectory('settings')
      const data = {
        collections: collections,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.collections, data)
      if (success) {
        console.log('合集数据保存成功:', collections.length, '个合集')
      }
      return success
    } catch (error) {
      console.error('保存合集数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载合集数据
   * @returns {Promise<Array>} 合集数据数组
   */
  async loadCollections() {
    try {
      const data = await this.readJsonFile(this.filePaths.collections)
      if (data && Array.isArray(data.collections)) {
        console.log('加载合集数据:', data.collections.length, '个合集')
        return data.collections
      }
      return []
    } catch (error) {
      console.error('加载合集数据失败:', error)
      return []
    }
  }

  /**
   * 从备份恢复文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 恢复是否成功
   */
  async restoreFromBackupFile(filePath) {
    try {
      if (!window.electronAPI || !window.electronAPI.readJsonFile) {
        return false
      }
      
      // 尝试查找备份文件（最多尝试10个最近的备份）
      const maxAttempts = 10
      for (let i = 0; i < maxAttempts; i++) {
        // 生成可能的备份文件路径（基于时间戳）
        const now = new Date()
        const timestamp = new Date(now.getTime() - i * 60000).toISOString().replace(/[:.]/g, '-') // 每分钟一个备份
        const backupPath = `${filePath}.backup.${timestamp}`
        
        try {
          const backupData = await this.readJsonFile(backupPath)
          if (backupData) {
            // 验证备份数据是否有效
            if (this.filePaths.games === filePath && (!backupData.games || !Array.isArray(backupData.games))) {
              continue // 数据无效，尝试下一个
            }
            
            // 恢复文件
            const restoreSuccess = await this.writeJsonFileWithoutBackup(filePath, backupData)
            if (restoreSuccess) {
              console.log('✅ 已从备份恢复文件:', filePath, '备份文件:', backupPath)
              return true
            }
          }
        } catch (error) {
          // 文件不存在或读取失败，继续尝试下一个
          continue
        }
      }
      
      // 如果时间戳方法失败，尝试使用 listFiles（如果可用）
      if (window.electronAPI.listFiles) {
        try {
          const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'))
          const fileName = filePath.substring(filePath.lastIndexOf('/') + 1 || filePath.lastIndexOf('\\') + 1)
          const backupPattern = `${fileName}.backup.`
          
          const result = await window.electronAPI.listFiles(dir)
          if (result.success && result.files) {
            const backups = (result.files as any[])
              .filter((file: any) => file && (typeof file === 'string' ? file.startsWith(backupPattern) : file.name && file.name.startsWith(backupPattern)))
              .map((file: any) => {
                if (typeof file === 'string') {
                  return {
                    name: file,
                    path: `${dir}/${file}`,
                    mtime: 0
                  }
                }
                return {
                  name: file.name,
                  path: file.path || `${dir}/${file.name}`,
                  mtime: file.mtime || 0
                }
              })
              .sort((a, b) => b.mtime - a.mtime)
            
            for (const backup of backups) {
              try {
                const backupData = await this.readJsonFile(backup.path)
                if (backupData) {
                  if (this.filePaths.games === filePath && (!backupData.games || !Array.isArray(backupData.games))) {
                    continue
                  }
                  
                  const restoreSuccess = await this.writeJsonFileWithoutBackup(filePath, backupData)
                  if (restoreSuccess) {
                    console.log('✅ 已从备份恢复文件:', filePath, '备份文件:', backup.name)
                    return true
                  }
                }
              } catch (error) {
                continue
              }
            }
          }
        } catch (error) {
          console.warn('使用 listFiles 查找备份失败:', error)
        }
      }
      
      console.warn('未找到有效的备份文件:', filePath)
      return false
    } catch (error) {
      console.error('恢复备份失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载游戏数据
   * @returns {Promise<Array>} 游戏数据数组
   */
  async loadGames() {
    // 检查缓存
    if (this.dataCache.games) {
      console.log('从缓存加载游戏数据:', this.dataCache.games.length, '个游戏')
      return JSON.parse(JSON.stringify(this.dataCache.games)) // 返回副本以防止引用修改
    }

    try {
      let data = await this.readJsonFile(this.filePaths.games)
      
      // 检查数据完整性
      if (!data || !data.games || !Array.isArray(data.games)) {
        console.warn('⚠️ 游戏数据文件损坏或为空，尝试从备份恢复...')
        
        // 尝试从备份恢复
        const restored = await this.restoreFromBackupFile(this.filePaths.games)
        if (restored) {
          // 重新读取恢复后的数据
          data = await this.readJsonFile(this.filePaths.games)
          if (data && data.games && Array.isArray(data.games)) {
            console.log('✅ 已从备份恢复游戏数据:', data.games.length, '个游戏')
            this.dataCache.games = data.games // 更新缓存
            return data.games
          }
        }
        
        console.error('❌ 无法恢复游戏数据，返回空数组')
        return []
      }
      
      // 验证数据有效性
      if (data.games.length === 0 && data.timestamp) {
        // 如果数据为空但有时间戳，可能是正常情况（用户删除了所有游戏）
        console.log('游戏数据为空（可能是正常情况）')
        this.dataCache.games = [] // 更新缓存
        return []
      }
      
      this.dataCache.games = data.games // 更新缓存
      return data.games
    } catch (error) {
      console.error('加载游戏数据失败:', error)
      
      // 尝试从备份恢复
      console.warn('尝试从备份恢复游戏数据...')
      const restored = await this.restoreFromBackupFile(this.filePaths.games)
      if (restored) {
        try {
          const data = await this.readJsonFile(this.filePaths.games)
          if (data && data.games && Array.isArray(data.games)) {
            console.log('✅ 已从备份恢复游戏数据:', data.games.length, '个游戏')
            this.dataCache.games = data.games // 更新缓存
            return data.games
          }
        } catch (recoveryError) {
          console.error('恢复后读取数据失败:', recoveryError)
        }
      }
      
      return []
    }
  }

  /**
   * 从本地 JSON 文件加载软件数据
   * @returns {Promise<Array>} 软件数据数组
   */
  async loadSoftware() {
    // 检查缓存
    if (this.dataCache.software) {
      console.log('从缓存加载软件数据:', this.dataCache.software.length, '个软件')
      return JSON.parse(JSON.stringify(this.dataCache.software))
    }

    try {
      let data = await this.readJsonFile(this.filePaths.software)
      
      if (!data || !data.software || !Array.isArray(data.software)) {
        console.log('软件数据文件不存在或为空，返回空数组')
        return []
      }
      
      this.dataCache.software = data.software
      return data.software
    } catch (error) {
      console.error('加载软件数据失败:', error)
      return []
    }
  }

  /**
   * 从本地 JSON 文件加载单图数据
   * @returns {Promise<Array>} 单图数据数组
   */
  async loadSingleImage() {
    // 检查缓存
    if (this.dataCache.singleImage) {
      console.log('从缓存加载单图数据:', this.dataCache.singleImage.length, '个单图')
      return JSON.parse(JSON.stringify(this.dataCache.singleImage))
    }

    try {
      let data = await this.readJsonFile(this.filePaths.singleImage)
      
      if (!data || !data.singleImage || !Array.isArray(data.singleImage)) {
        console.log('单图数据文件不存在或为空，返回空数组')
        return []
      }
      
      this.dataCache.singleImage = data.singleImage
      return data.singleImage
    } catch (error) {
      console.error('加载单图数据失败:', error)
      return []
    }
  }

  /**
   * 保存设置数据到本地 JSON 文件
   * @param {Object} settings - 设置数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSettings(settings) {
    try {
      // 更新缓存
      this.settingsCache = JSON.parse(JSON.stringify(settings))
      this.omitSaveLocation(this.settingsCache)
      this.settingsCacheDirty = true
      
      // 只保存到 SQLite
      if (!window.electronAPI || !window.electronAPI.sqliteSaveSettings) {
        console.error('当前环境无法访问 SQLite 保存功能（请使用 Electron 运行）')
        return false
      }
      
      // 传递深拷贝后的纯数据，避免 Vue Proxy 导致 IPC 克隆失败
      const sqliteResult = await window.electronAPI.sqliteSaveSettings(this.settingsCache)
      if (sqliteResult?.ok) {
        console.log('设置数据已保存到 SQLite')
        this.settingsCacheDirty = false
        await this.applySaveDataDirectory()
        return true
      } else {
        console.error('保存设置到 SQLite 失败:', sqliteResult?.message)
        return false
      }
    } catch (error) {
      console.error('保存设置数据失败:', error)
      return false
    }
  }

  /**
   * 从 SQLite 加载设置数据
   * @returns {Promise<Object>} 设置数据对象
   */
  async loadSettings() {
    // 优先使用缓存，减少数据库读取
    if (this.settingsCache) {
      console.log('从缓存加载设置数据')
      return JSON.parse(JSON.stringify(this.settingsCache))
    }

    // 只从 SQLite 读取
    if (!window.electronAPI || !window.electronAPI.sqliteGetSettings) {
      console.error('当前环境无法访问 SQLite（请使用 Electron 运行），返回默认设置')
      this.settingsCache = this.defaultData.settings
      return JSON.parse(JSON.stringify(this.defaultData.settings))
    }

    try {
      const result = await window.electronAPI.sqliteGetSettings()
      if (result?.ok && result.settings) {
        console.log('从 SQLite 加载设置数据成功')
        const sqliteSettings = result.settings
        const resultSettings = { ...this.defaultData.settings, ...sqliteSettings }
        this.omitSaveLocation(resultSettings)
        this.settingsCache = resultSettings
        await this.applySaveDataDirectory()
        return JSON.parse(JSON.stringify(resultSettings))
      } else {
        // SQLite 中未找到设置数据，返回默认设置
        console.log('SQLite 中未找到设置数据，使用默认设置')
        this.settingsCache = this.defaultData.settings
        return JSON.parse(JSON.stringify(this.defaultData.settings))
      }
    } catch (error) {
      console.error('从 SQLite 加载设置失败:', error)
      // 出错时返回默认设置
      this.settingsCache = this.defaultData.settings
      return JSON.parse(JSON.stringify(this.defaultData.settings))
    }
  }

  /**
   * 导出数据为 JSON 文件
   * @param {string} dataType - 数据类型 ('games', 'settings', 'all')
   * @param {string} filename - 文件名（可选）
   * @returns {Promise<boolean>} 导出是否成功
   */
  async exportData(dataType = 'all', filename = null) {
    try {
      let exportData = {}
      let defaultFilename = 'butter-manager-export'

      switch (dataType) {
        case 'games':
          exportData = {
            type: 'games',
            data: await this.loadGames(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-games'
          break
        case 'settings':
          exportData = {
            type: 'settings',
            data: await this.loadSettings(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-settings'
          break
        case 'all':
        default:
          exportData = {
            type: 'all',
            games: await this.loadGames(),
            settings: await this.loadSettings(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-backup'
          break
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `${defaultFilename}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      console.log('数据导出成功:', dataType)
      return true
    } catch (error) {
      console.error('导出数据失败:', error)
      return false
    }
  }

  /**
   * 从文件导入数据
   * @param {File} file - 要导入的文件
   * @returns {Promise<Object>} 导入结果
   */
  async importData(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // 验证数据格式
      if (!data.type && !data.games && !data.settings) {
        throw new Error('无效的数据文件格式')
      }

      let result = {
        success: true,
        imported: {
          games: 0,
          settings: false
        },
        errors: []
      }

      // 导入游戏数据
      if (data.games && Array.isArray(data.games)) {
        if (this.saveGames(data.games)) {
          result.imported.games = data.games.length
        } else {
          result.errors.push('游戏数据导入失败')
        }
      }

      // 导入设置数据
      if (data.settings && typeof data.settings === 'object') {
        if (this.saveSettings(data.settings)) {
          result.imported.settings = true
        } else {
          result.errors.push('设置数据导入失败')
        }
      }

      console.log('数据导入成功:', result)
      return result
    } catch (error) {
      console.error('导入数据失败:', error)
      return {
        success: false,
        error: error.message,
        imported: { games: 0, settings: false },
        errors: [error.message]
      }
    }
  }


  /**
   * 从备份恢复数据
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFromBackup() {
    try {
      const backupData = await this.readJsonFile(this.filePaths.backup)
      if (!backupData) {
        return { success: false, error: '没有找到备份数据' }
      }

      let result = { success: true, restored: { games: 0, settings: false } }

      // 恢复游戏数据
      if (backupData.games) {
        if (await this.saveGames(backupData.games)) {
          result.restored.games = backupData.games.length
        }
      }

      // 恢复设置数据
      if (backupData.settings) {
        if (await this.saveSettings(backupData.settings)) {
          result.restored.settings = true
        }
      }

      console.log('从备份恢复数据成功:', result)
      return result
    } catch (error) {
      console.error('从备份恢复数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清空所有数据
   * @param {string} dataType - 要清空的数据类型 ('games', 'settings', 'all')
   * @returns {Promise<boolean>} 清空是否成功
   */
  async clearData(dataType = 'all') {
    try {
      // 清空缓存
      if (dataType === 'all') {
        this.dataCache = {}
      } else if (this.dataCache[dataType]) {
        delete this.dataCache[dataType]
      }

      if (window.electronAPI && window.electronAPI.deleteFile) {
        switch (dataType) {
          case 'games':
            await window.electronAPI.deleteFile(this.filePaths.games)
            break
          case 'settings':
            await window.electronAPI.deleteFile(this.filePaths.settings)
            break
          case 'all':
            await window.electronAPI.deleteFile(this.filePaths.games)
            await window.electronAPI.deleteFile(this.filePaths.settings)
            await window.electronAPI.deleteFile(this.filePaths.backup)
            break
        }
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        switch (dataType) {
          case 'games':
            localStorage.removeItem(this.filePaths.games)
            break
          case 'settings':
            localStorage.removeItem(this.filePaths.settings)
            break
          case 'all':
            localStorage.removeItem(this.filePaths.games)
            localStorage.removeItem(this.filePaths.settings)
            localStorage.removeItem(this.filePaths.backup)
            break
        }
      }
      console.log('数据清空成功:', dataType)
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Promise<Object>} 存储使用情况
   */
  async getStorageInfo() {
    try {
      const info = {
        games: { size: 0, count: 0 },
        settings: { size: 0, count: 0 },
        backup: { size: 0, count: 0 },
        total: { size: 0, count: 0 }
      }

      // 获取游戏数据信息
      const gamesData = await this.readJsonFile(this.filePaths.games)
      if (gamesData) {
        info.games.size = new Blob([JSON.stringify(gamesData)]).size
        info.games.count = gamesData.games?.length || 0
      }

      // 获取设置数据信息
      const settingsData = await this.readJsonFile(this.filePaths.settings)
      if (settingsData) {
        info.settings.size = new Blob([JSON.stringify(settingsData)]).size
        info.settings.count = 1
      }

      // 获取备份数据信息
      const backupData = await this.readJsonFile(this.filePaths.backup)
      if (backupData) {
        info.backup.size = new Blob([JSON.stringify(backupData)]).size
        info.backup.count = 1
      }

      // 计算总计
      info.total.size = info.games.size + info.settings.size + info.backup.size
      info.total.count = info.games.count + info.settings.count + info.backup.count

      return info
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return null
    }
  }

  /**
   * 解析游戏存档文件（.dat 格式）
   * @param {string} content - 文件内容
   * @returns {Object} 解析后的存档数据
   */
  parseGameSaveFile(content) {
    try {
      const data = JSON.parse(content)
      if (data.dataBlocks && Array.isArray(data.dataBlocks)) {
        const saveManagerBlock = data.dataBlocks.find(block => block.ID === 'SaveManager')
        if (saveManagerBlock) {
          const saveData = JSON.parse(saveManagerBlock.data)
          return {
            success: true,
            data: saveData,
            slots: this.extractSaveSlots(saveData)
          }
        }
      }
      return { success: false, error: '无效的存档文件格式' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 提取存档槽位信息
   * @param {Object} saveData - 存档数据
   * @returns {Array} 存档槽位数组
   */
  extractSaveSlots(saveData) {
    const slots = []
    const slotKeys = Object.keys(saveData).filter(key => key.startsWith('slot'))
    
    slotKeys.forEach(key => {
      const slot = saveData[key]
      if (slot && slot.date) {
        slots.push({
          id: key,
          date: slot.date,
          memo: slot.memo || '',
          day: slot.day || 0,
          playTime: slot.playTime || 0,
          charaLevel: slot.chara_level || 0,
          tameLevel: slot.tameLevel || 0
        })
      }
    })
    
    return slots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * 保存页面排序方式
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @param {string} sortBy - 排序方式
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSortSetting(pageType, sortBy) {
    try {
      const settings = await this.loadSettings()
      if (settings) {
        if (!settings.sortSettings) {
          settings.sortSettings = {}
        }
        settings.sortSettings[pageType] = sortBy
        const success = await this.saveSettings(settings)
        if (success) {
          console.log(`✅ 已保存${pageType}页面排序方式:`, sortBy)
        }
        return success
      }
      return false
    } catch (error) {
      console.error(`保存${pageType}页面排序方式失败:`, error)
      return false
    }
  }

  /**
   * 获取页面排序方式
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @returns {Promise<string|null>} 排序方式。这一页还没存过时返回 null，调用方继续用自己的默认排序。
   */
  async getSortSetting(pageType) {
    try {
      const settings = await this.loadSettings()
      const saved = settings?.sortSettings?.[pageType]
      if (typeof saved === 'string' && saved) {
        console.log(`✅ 加载${pageType}页面排序方式:`, saved)
        return saved
      }
      return null
    } catch (error) {
      console.error(`获取${pageType}页面排序方式失败:`, error)
      return null
    }
  }

  /**
   * 保存页面布局缩放设置
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @param {number} scale - 缩放比例 (50-200)
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveLayoutSetting(pageType, scale) {
    try {
      const settings = await this.loadSettings()
      if (settings) {
        if (!settings.layoutSettings) {
          settings.layoutSettings = {}
        }
        settings.layoutSettings[pageType] = scale
        const success = await this.saveSettings(settings)
        if (success) {
          console.log(`✅ 已保存${pageType}页面布局缩放:`, scale)
        }
        return success
      }
      return false
    } catch (error) {
      console.error(`保存${pageType}页面布局缩放失败:`, error)
      return false
    }
  }

  /**
   * 获取页面布局缩放设置
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @returns {Promise<number>} 缩放比例
   */
  async getLayoutSetting(pageType) {
    try {
      const settings = await this.loadSettings()
      if (settings && settings.layoutSettings && settings.layoutSettings[pageType] !== undefined) {
        console.log(`✅ 加载${pageType}页面布局缩放:`, settings.layoutSettings[pageType])
        return settings.layoutSettings[pageType]
      }
      return 100 // 默认100%
    } catch (error) {
      console.error(`获取${pageType}页面布局缩放失败:`, error)
      return 100
    }
  }

  /**
   * 保存页面显示方式
   * @param {string} pageType - 页面 id，例如 games、images
   * @param {'grid'|'list'} mode - 网格或列表
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveDisplayModeSetting(pageType, mode) {
    try {
      const settings = await this.loadSettings()
      if (!settings) return false
      if (!settings.displayModes) {
        settings.displayModes = {}
      }
      settings.displayModes[pageType] = mode
      return await this.saveSettings(settings)
    } catch (error) {
      console.error(`保存${pageType}页面显示方式失败:`, error)
      return false
    }
  }

  /**
   * 获取页面显示方式。没存过时默认网格。
   * @param {string} pageType - 页面 id，例如 games、images
   * @returns {Promise<'grid'|'list'>} 显示方式
   */
  async getDisplayModeSetting(pageType) {
    try {
      const settings = await this.loadSettings()
      const mode = settings?.displayModes?.[pageType]
      return mode === 'list' ? 'list' : 'grid'
    } catch (error) {
      console.error(`获取${pageType}页面显示方式失败:`, error)
      return 'grid'
    }
  }

  /**
   * 保存页面标签筛选设置
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio' 等)
   * @param {Object} filterData - 筛选数据，格式为 { [filterKey]: { selected: string[], excluded: string[] } }
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveFilterSetting(pageType, filterData) {
    try {
      const settings = await this.loadSettings()
      if (settings) {
        if (!settings.filterSettings) {
          settings.filterSettings = {}
        }
        settings.filterSettings[pageType] = filterData
        const success = await this.saveSettings(settings)
        if (success) {
          console.log(`✅ 已保存${pageType}页面标签筛选设置`)
        }
        return success
      }
      return false
    } catch (error) {
      console.error(`保存${pageType}页面标签筛选设置失败:`, error)
      return false
    }
  }

  /**
   * 获取页面标签筛选设置
   * @param {string} pageType - 页面类型
   * @returns {Promise<Object>} 筛选数据，格式为 { [filterKey]: { selected: string[], excluded: string[] } }，无数据返回 {}
   */
  async getFilterSetting(pageType) {
    try {
      const settings = await this.loadSettings()
      if (settings && settings.filterSettings && settings.filterSettings[pageType]) {
        console.log(`✅ 加载${pageType}页面标签筛选设置`)
        return settings.filterSettings[pageType]
      }
      return {}
    } catch (error) {
      console.error(`获取${pageType}页面标签筛选设置失败:`, error)
      return {}
    }
  }

  /**
   * 保存用户资料数据到 SQLite
   * @param {Object} userProfile - 用户资料数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveUserProfile(userProfile) {
    try {
      // 只保存到 SQLite
      if (!window.electronAPI || !window.electronAPI.sqliteSaveUser) {
        console.error('当前环境无法访问 SQLite 保存功能（请使用 Electron 运行）')
        return false
      }

      // 统计页传来的是 Vue 响应式对象。不先转成普通数据，进程通信会克隆失败，登录日历就写不进去。
      const plainProfile = JSON.parse(JSON.stringify(userProfile))
      const sqliteResult = await window.electronAPI.sqliteSaveUser(plainProfile)
      if (sqliteResult?.ok) {
        console.log('用户资料已保存到 SQLite')
        return true
      } else {
        console.error('保存用户资料到 SQLite 失败:', sqliteResult?.message)
        return false
      }
    } catch (error) {
      console.error('保存用户资料失败:', error)
      return false
    }
  }

  /**
   * 从 SQLite 加载用户资料数据
   * @returns {Promise<Object>} 用户资料数据对象
   */
  async loadUserProfile() {
    // 只从 SQLite 读取
    if (!window.electronAPI || !window.electronAPI.sqliteGetUser) {
      console.error('当前环境无法访问 SQLite（请使用 Electron 运行），返回默认用户资料')
      return {
        name: '',
        joinDate: new Date().toISOString(),
        loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
        checkInDays: [],
        totalUsageTime: 0 // 总使用时长（秒）
      }
    }

    try {
      const result = await window.electronAPI.sqliteGetUser()
      if (result?.ok && result.user) {
        console.log('从 SQLite 加载用户资料成功')
        // 确保所有必需字段存在
        const userProfile = {
          name: result.user.name || '',
          joinDate: result.user.joinDate || new Date().toISOString(),
          loginHistory: result.user.loginHistory || [],
          checkInDays: result.user.checkInDays || [],
          totalUsageTime: result.user.totalUsageTime || 0
        }
        return userProfile
      } else {
        // SQLite 中未找到用户数据，返回默认用户资料
        console.log('SQLite 中未找到用户数据，使用默认用户资料')
        return {
          name: '',
          joinDate: new Date().toISOString(),
          loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
          checkInDays: [],
          totalUsageTime: 0 // 总使用时长（秒）
        }
      }
    } catch (error) {
      console.error('从 SQLite 加载用户资料失败:', error)
      // 出错时返回默认用户资料
      return {
        name: '',
        joinDate: new Date().toISOString(),
        loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
        checkInDays: [],
        totalUsageTime: 0 // 总使用时长（秒）
      }
    }
  }


  /**
   * 从文件导入用户数据
   * @param {File} file - 要导入的文件
   * @returns {Promise<Object>} 导入结果
   */
  async importUserData(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // 验证数据格式
      if (!data.type || data.type !== 'user' || !data.data) {
        throw new Error('无效的用户数据文件格式')
      }

      const result = {
        success: true,
        imported: {
          user: false
        },
        errors: []
      }

      // 导入用户数据
      if (data.data && typeof data.data === 'object') {
        if (await this.saveUserProfile(data.data)) {
          result.imported.user = true
        } else {
          result.errors.push('用户数据导入失败')
        }
      }

      console.log('用户数据导入成功:', result)
      return result
    } catch (error) {
      console.error('导入用户数据失败:', error)
      return {
        success: false,
        error: error.message,
        imported: { user: false },
        errors: [error.message]
      }
    }
  }

  /**
   * 保存成就状态数据到本地 JSON 文件
   * @param {Object} achievementStates - 成就状态数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveAchievementStates(achievementStates) {
    try {
      await this.ensureDataTypeDirectory('settings')
      
      const data = {
        achievements: achievementStates,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.achievements, data)
      if (success) {
        console.log('成就状态保存成功')
      }
      return success
    } catch (error) {
      console.error('保存成就状态失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载成就状态数据
   * @returns {Promise<Object>} 成就状态数据对象
   */
  async loadAchievementStates() {
    try {
      const data = await this.readJsonFile(this.filePaths.achievements)
      if (data && data.achievements) {
        console.log('成就状态加载成功')
        // 将Map对象从普通对象转换回来
        const achievementStates = data.achievements
        if (achievementStates.unlockedAchievements && typeof achievementStates.unlockedAchievements === 'object') {
          achievementStates.unlockedAchievements = new Map(Object.entries(achievementStates.unlockedAchievements))
        } else {
          achievementStates.unlockedAchievements = new Map()
        }
        return achievementStates
      }
      
      // 如果文件不存在，返回默认成就状态
      console.log('成就状态文件不存在，返回默认状态')
      return {
        unlockedAchievements: new Map(),
        lastCheckTime: new Date().toISOString()
      }
    } catch (error) {
      console.error('加载成就状态失败:', error)
      return {
        unlockedAchievements: new Map(),
        lastCheckTime: new Date().toISOString()
      }
    }
  }

  /**
   * 更新单个成就的解锁状态
   * @param {string} achievementId - 成就ID
   * @param {boolean} unlocked - 是否已解锁
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateAchievementState(achievementId, unlocked) {
    try {
      const achievementStates = await this.loadAchievementStates()
      achievementStates.unlockedAchievements.set(achievementId, unlocked)
      achievementStates.lastCheckTime = new Date().toISOString()
      
      return await this.saveAchievementStates(achievementStates)
    } catch (error) {
      console.error('更新成就状态失败:', error)
      return false
    }
  }

  /**
   * 批量更新成就解锁状态
   * @param {Map} newAchievementStates - 新的成就状态Map
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateAchievementStates(newAchievementStates) {
    try {
      const achievementStates = await this.loadAchievementStates()
      
      // 更新所有成就状态
      newAchievementStates.forEach((unlocked, achievementId) => {
        achievementStates.unlockedAchievements.set(achievementId, unlocked)
      })
      
      achievementStates.lastCheckTime = new Date().toISOString()
      
      return await this.saveAchievementStates(achievementStates)
    } catch (error) {
      console.error('批量更新成就状态失败:', error)
      return false
    }
  }

  /**
   * 检查成就是否已解锁
   * @param {string} achievementId - 成就ID
   * @returns {Promise<boolean>} 是否已解锁
   */
  async isAchievementUnlocked(achievementId) {
    try {
      const achievementStates = await this.loadAchievementStates()
      return achievementStates.unlockedAchievements.get(achievementId) || false
    } catch (error) {
      console.error('检查成就状态失败:', error)
      return false
    }
  }

  /**
   * 获取所有已解锁的成就ID列表
   * @returns {Promise<Array>} 已解锁的成就ID数组
   */
  async getUnlockedAchievementIds() {
    try {
      const achievementStates = await this.loadAchievementStates()
      const unlockedIds = []
      
      achievementStates.unlockedAchievements.forEach((unlocked, achievementId) => {
        if (unlocked) {
          unlockedIds.push(achievementId)
        }
      })
      
      return unlockedIds
    } catch (error) {
      console.error('获取已解锁成就列表失败:', error)
      return []
    }
  }

  /**
   * 把某一天记进登录日历。
   * 用本地日期，和统计页日历上的格子是同一天，避免晚上被算成前一天。
   * @param {Object} userProfile 用户资料，会直接改里面的 checkInDays
   * @param {Date} date 要记录的日期
   */
  recordCheckInDay(userProfile, date) {
    if (!userProfile) return
    if (!Array.isArray(userProfile.checkInDays)) {
      userProfile.checkInDays = []
    }
    const day = formatLocalDate(date)
    if (!userProfile.checkInDays.includes(day)) {
      userProfile.checkInDays.push(day)
    }
  }

  /**
   * 开始使用时长跟踪
   * @returns {Promise<boolean>} 开始跟踪是否成功
   */
  async startUsageTracking() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 确保 loginHistory 数组存在
      if (!userProfile.loginHistory) {
        userProfile.loginHistory = []
      }
      
      const now = new Date().toISOString()
      
      // 保存旧的登录时间（用于计算上次会话时长）
      const previousLoginTime = userProfile.loginHistory.length > 0 ? userProfile.loginHistory[0] : null
      
      // 处理会话时长跟踪
      // 如果 previousLoginTime 存在，说明是应用异常关闭后重启，需要累加上次会话时长
      if (previousLoginTime) {
        const previousSessionStart = new Date(previousLoginTime)
        const nowDate = new Date()
        const previousSessionDuration = Math.floor((nowDate.getTime() - previousSessionStart.getTime()) / 1000)
        
        // 如果上次会话时长超过 24 小时，可能是异常情况，只累加最多 24 小时
        const maxSessionDuration = 24 * 3600 // 24 小时
        const sessionDuration = Math.min(previousSessionDuration, maxSessionDuration)
        
        // 累加上次会话时长到总使用时长
        userProfile.totalUsageTime += sessionDuration
      }
      
      // 更新登录历史队列：将旧的 loginHistory[0] 移到 [1]（作为上一次登录时间）
      // 将当前时间设为 loginHistory[0]（作为本次登录时间）
      if (userProfile.loginHistory.length > 0) {
        // 如果有旧的登录时间，将其移到 [1] 位置
        userProfile.loginHistory[1] = userProfile.loginHistory[0]
        // 确保数组长度不超过2
        userProfile.loginHistory = userProfile.loginHistory.slice(0, 2)
      }
      // 将当前登录时间设为 [0]
      userProfile.loginHistory[0] = now
      // 确保数组长度不超过2（防止数组意外扩展）
      if (userProfile.loginHistory.length > 2) {
        userProfile.loginHistory = userProfile.loginHistory.slice(0, 2)
      }

      // 登录日跟应用启动走，不跟统计页走。以前只有打开统计页才记一天，而且那次保存经常失败，日历就永远只有今天。
      this.recordCheckInDay(userProfile, new Date())
      
      await this.saveUserProfile(userProfile)
      return true
    } catch (error) {
      console.error('开始使用时长跟踪失败:', error)
      return false
    }
  }

  /**
   * 结束使用时长跟踪并更新总时长
   * @returns {Promise<boolean>} 结束跟踪是否成功
   */
  async endUsageTracking() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 使用 loginHistory[0] 作为当前会话开始时间
      if (userProfile.loginHistory && userProfile.loginHistory.length > 0 && userProfile.loginHistory[0]) {
        const sessionStart = new Date(userProfile.loginHistory[0])
        const sessionEnd = new Date()
        const sessionDuration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000) // 转换为秒
        
        // 更新总使用时长
        userProfile.totalUsageTime += sessionDuration
        
        await this.saveUserProfile(userProfile)
        console.log(`会话结束，本次使用时长: ${sessionDuration}秒，总使用时长: ${userProfile.totalUsageTime}秒`)
      }
      
      return true
    } catch (error) {
      console.error('结束使用时长跟踪失败:', error)
      return false
    }
  }

  /**
   * 获取当前会话使用时长（秒）
   * @returns {Promise<number>} 当前会话使用时长
   */
  async getCurrentSessionDuration() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 使用 loginHistory[0] 作为当前会话开始时间
      if (userProfile.loginHistory && userProfile.loginHistory.length > 0 && userProfile.loginHistory[0]) {
        const sessionStart = new Date(userProfile.loginHistory[0])
        const now = new Date()
        return Math.floor((now.getTime() - sessionStart.getTime()) / 1000)
      }
      
      return 0
    } catch (error) {
      console.error('获取当前会话时长失败:', error)
      return 0
    }
  }

  /**
   * 获取总使用时长（秒）
   * @returns {Promise<number>} 总使用时长
   */
  async getTotalUsageTime() {
    try {
      const userProfile = await this.loadUserProfile()
      return userProfile.totalUsageTime || 0
    } catch (error) {
      console.error('获取总使用时长失败:', error)
      return 0
    }
  }

  /**
   * 格式化使用时长显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时长字符串
   */
  formatUsageTime(seconds) {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
    } else {
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      return hours > 0 ? `${days}天${hours}小时` : `${days}天`
    }
  }

  /**
   * 备份整个存档目录
   * @param {number} maxBackups - 保留的备份数量，默认5个
   * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>} 备份结果
   */
  async backupEntireSaveData(maxBackups = 5) {
    try {
      if (!window.electronAPI || !window.electronAPI.backupSaveDataDirectory) {
        return { success: false, error: 'Electron API 不可用' }
      }

      const result = await window.electronAPI.backupSaveDataDirectory(this.dataDirectory, maxBackups)
      if (result.success) {
        console.log('✅ 整个存档备份成功:', result.backupPath)
        return { success: true, backupPath: result.backupPath }
      } else {
        console.error('备份整个存档失败:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('备份整个存档失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 加载页面数据（统一路径：SaveData/pages/{pageId}.json）
   * @param {string} pageId - 页面ID
   * @returns {Promise<any[]>} 页面数据
   */
  async loadPageData(pageId) {
    // 检查缓存
    const cacheKey = `page_${pageId}`
    if (this.dataCache[cacheKey]) {
      console.log(`[SaveManager] 从缓存加载页面 ${pageId} 数据`)
      return JSON.parse(JSON.stringify(this.dataCache[cacheKey]))
    }

    // 统一路径：SaveData/pages/{pageId}.json
    const pagePath = `${this.dataDirectory}/pages/${pageId}.json`
    console.log(`[SaveManager] 加载页面数据：${pageId}，路径：${pagePath}`)
    
    const data = await this.readJsonFile(pagePath)
    
    // 页面数据应该是数组
    if (!Array.isArray(data)) {
      console.warn(
        `[SaveManager] 页面数据格式异常：${pageId}，期望为数组，实际为：`,
        typeof data,
        '，返回空数组'
      )
    }
    
    const result = Array.isArray(data) ? data : []
    this.dataCache[cacheKey] = result // 更新缓存
    
    console.log(`[SaveManager] 页面 ${pageId} 数据加载完成，共 ${result.length} 条记录`)
    return JSON.parse(JSON.stringify(result))
  }

  /**
   * 保存页面数据（统一路径：SaveData/pages/{pageId}.json）
   * @param {string} pageId - 页面ID
   * @param {any[]} data - 页面数据
   * @returns {Promise<boolean>} 是否保存成功
   */
  async savePageData(pageId, data) {
    console.log(`[SaveManager] 保存页面数据：${pageId}，共 ${data?.length || 0} 条记录`)
    
    // 统一路径：SaveData/pages/{pageId}.json
    const pagesDir = `${this.dataDirectory}/pages`
    const pagePath = `${pagesDir}/${pageId}.json`
    
    // 确保目录存在
    await this.ensureDirectoryByPath(pagesDir)
    
    // 保存数据
    const success = await this.writeJsonFile(pagePath, data)
    
    if (success) {
      // 更新缓存
      const cacheKey = `page_${pageId}`
      this.dataCache[cacheKey] = JSON.parse(JSON.stringify(data))
      console.log(`[SaveManager] 页面 ${pageId} 数据保存成功`)
    } else {
      console.error(`[SaveManager] 页面 ${pageId} 数据保存失败`)
    }
    
    return success
  }

  /**
   * 删除页面数据
   * @param {string} pageId - 页面ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deletePageData(pageId) {
    // 检查是否为默认页面类型
    if (this.filePaths[pageId]) {
      console.warn('无法删除默认页面数据:', pageId)
      return false
    }

    // 自定义页面
    const customDir = `${this.dataDirectory}/CustomPages/${pageId}`
    
    if (window.electronAPI && window.electronAPI.deleteDirectory) {
      const result = await window.electronAPI.deleteDirectory(customDir)
      return result.success
    }
    
    return false
  }
}

// 创建单例实例
const saveManager = new SaveManager()

export default saveManager
