/**
 * ============================================================================
 * 文件操作工具模块 (File Utilities)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块提供了文件操作相关的工具函数，包括读写 JSON 文件、普通文件、
 * 目录操作等功能。所有文件操作都包含错误处理和验证。
 * 
 * 主要功能：
 * 1. JSON 文件读写（带原子性写入和备份机制）
 * 2. 普通文件读写
 * 3. 文件删除
 * 4. 目录创建和管理
 * 5. 文件统计信息获取
 * 6. 缩略图保存（base64 转图片）
 * 7. 文本文件读取
 * 
 * 导出的函数：
 * - writeJsonFile()       写入 JSON 文件（带原子性写入和备份）
 * - readJsonFile()        读取 JSON 文件
 * - writeFile()           写入普通文件（Buffer）
 * - saveThumbnail()       保存缩略图（base64 dataURL 转图片）
 * - deleteFile()          删除文件
 * - ensureDirectory()     确保目录存在（不存在则创建）
 * - listFiles()           列出目录中的文件
 * - getFileStats()        获取文件统计信息
 * - readTextFile()        读取文本文件内容
 * 
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const { MAX_BACKUP_FILES } = require('./constants')

/**
 * 写入 JSON 文件（带原子性写入和备份机制）
 * @param {string} filePath - 文件路径
 * @param {Object|string} data - 要写入的数据（对象或 JSON 字符串）
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function writeJsonFile(filePath, data) {
  let tempFilePath = null
  
  try {
    // 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // 生成临时文件路径
    tempFilePath = filePath + '.tmp'
    
    // 验证数据是否可以序列化
    let jsonString
    try {
      if (typeof data === 'string') {
        jsonString = data
      } else {
        jsonString = JSON.stringify(data, null, 2)
      }
    } catch (serializeError) {
      console.error('数据序列化失败:', serializeError)
      return { success: false, error: `数据序列化失败: ${serializeError.message}` }
    }
    
    // 第一步：先写入临时文件，并使用 fsync 确保数据真正写入磁盘
    const tempFileHandle = fs.openSync(tempFilePath, 'w')
    try {
      const buffer = Buffer.from(jsonString, 'utf8')
      fs.writeSync(tempFileHandle, buffer, 0, buffer.length)
      // 强制同步到磁盘
      fs.fsyncSync(tempFileHandle)
      fs.closeSync(tempFileHandle)
    } catch (writeError) {
      try {
        fs.closeSync(tempFileHandle)
      } catch (closeError) {
        // 忽略关闭错误
      }
      throw writeError
    }
    
    // 第二步：验证临时文件写入成功
    if (!fs.existsSync(tempFilePath)) {
      console.error('临时文件写入后不存在!')
      return { success: false, error: '临时文件写入失败' }
    }
    
    const tempStats = fs.statSync(tempFilePath)
    if (tempStats.size === 0) {
      console.error('临时文件大小为0，写入失败')
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        // 忽略清理错误
      }
      return { success: false, error: '临时文件写入失败（文件大小为0）' }
    }
    
    // 验证临时文件的 JSON 格式是否正确
    try {
      const testData = fs.readFileSync(tempFilePath, 'utf8')
      JSON.parse(testData)
    } catch (parseError) {
      console.error('临时文件 JSON 格式验证失败:', parseError)
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        // 忽略清理错误
      }
      return { success: false, error: `临时文件 JSON 格式验证失败: ${parseError.message}` }
    }
    
    // 第三步：创建备份文件（.backup.时间戳）
    if (fs.existsSync(filePath)) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = `${filePath}.backup.${timestamp}`
        fs.copyFileSync(filePath, backupPath)
        console.log('✅ 已创建备份文件:', backupPath)
        
        // 清理旧备份（后台异步执行，不阻塞主线程）
        setImmediate(() => {
          try {
            const dir = path.dirname(filePath)
            const fileName = path.basename(filePath)
            const backupPattern = `${fileName}.backup.`
            
            const files = fs.readdirSync(dir)
            const backups = files
              .filter(file => file.startsWith(backupPattern))
              .map(file => {
                const filePath = path.join(dir, file)
                const stats = fs.statSync(filePath)
                return {
                  name: file,
                  path: filePath,
                  mtime: stats.mtime.getTime()
                }
              })
              .sort((a, b) => b.mtime - a.mtime)
            
            // 删除超出数量的旧备份
            if (backups.length > MAX_BACKUP_FILES) {
              const toDelete = backups.slice(MAX_BACKUP_FILES)
              for (const backup of toDelete) {
                try {
                  fs.unlinkSync(backup.path)
                  console.log('🗑️ 已删除旧备份:', backup.name)
                } catch (deleteError) {
                  console.warn('删除旧备份失败:', backup.name, deleteError.message)
                }
              }
            }
          } catch (cleanupError) {
            console.warn('清理旧备份失败（不影响使用）:', cleanupError.message)
          }
        })
      } catch (backupError) {
        console.warn('创建备份文件失败，继续执行:', backupError.message)
      }
    }
    
    // 第四步：创建 .old 文件（用于写入失败时的快速恢复）
    let oldBackupPath = null
    if (fs.existsSync(filePath)) {
      oldBackupPath = filePath + '.old'
      try {
        if (fs.existsSync(oldBackupPath)) {
          fs.unlinkSync(oldBackupPath)
        }
        fs.renameSync(filePath, oldBackupPath)
      } catch (backupError) {
        console.warn('创建旧文件备份失败，继续执行:', backupError.message)
      }
    }
    
    // 第五步：原子性替换 - 使用 renameSync 将临时文件重命名为目标文件
    try {
      fs.renameSync(tempFilePath, filePath)
      tempFilePath = null // 标记已成功，不需要清理
      
      // 写入成功后，删除 .old 备份文件
      if (oldBackupPath && fs.existsSync(oldBackupPath)) {
        try {
          fs.unlinkSync(oldBackupPath)
        } catch (deleteError) {
          console.warn('删除 .old 备份文件失败（不影响使用）:', deleteError.message)
        }
      }
    } catch (renameError) {
      // 如果重命名失败，尝试恢复原文件
      if (oldBackupPath && fs.existsSync(oldBackupPath)) {
        try {
          fs.renameSync(oldBackupPath, filePath)
          console.log('重命名失败，已恢复原文件')
        } catch (restoreError) {
          console.error('恢复原文件失败:', restoreError)
        }
      }
      throw renameError
    }
    
    // 最终验证：确认目标文件存在且有效
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      if (stats.size === 0) {
        console.error('目标文件大小为0!')
        return { success: false, error: '目标文件写入失败（文件大小为0）' }
      }
    } else {
      console.error('目标文件写入后不存在!')
      return { success: false, error: '目标文件写入失败' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('写入 JSON 文件失败:', error)
    console.error('错误堆栈:', error.stack)
    
    // 清理临时文件（如果存在）
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log('已清理临时文件:', tempFilePath)
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError)
      }
    }
    
    return { success: false, error: error.message }
  }
}

/**
 * 读取 JSON 文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} { success: boolean, data?: any, error?: string }
 */
async function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 写入普通文件（Buffer）
 * @param {string} filePath - 文件路径
 * @param {Buffer|ArrayBuffer|Uint8Array} buffer - 要写入的数据
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function writeFile(filePath, buffer) {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // 写入文件
    fs.writeFileSync(filePath, buffer)
    
    // 验证文件是否真的写入了
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      // 文件写入成功
    } else {
      console.error('文件写入后不存在!')
    }
    
    return { success: true }
  } catch (error) {
    console.error('写入文件失败:', error)
    console.error('错误堆栈:', error.stack)
    return { success: false, error: error.message }
  }
}

/**
 * 保存缩略图（base64 dataURL 转图片）
 * @param {string} filePath - 文件路径
 * @param {string} dataUrl - base64 dataURL
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function saveThumbnail(filePath, dataUrl) {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // 解析 base64 数据
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      throw new Error('无效的 dataURL 格式')
    }
    
    // 提取 base64 数据部分
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('无法从 dataURL 中提取 base64 数据')
    }
    
    // 转换为 Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // 写入文件
    fs.writeFileSync(filePath, buffer)
    
    // 验证文件是否真的写入了
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      // 缩略图保存成功
    } else {
      console.error('缩略图文件写入后不存在!')
    }
    
    return { success: true }
  } catch (error) {
    console.error('保存缩略图失败:', error)
    console.error('错误堆栈:', error.stack)
    return { success: false, error: error.message }
  }
}

/**
 * 删除文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (error) {
    console.error('删除文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 删除目录
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Object>} { success: boolean, error?: string }
 * @throws 如果尝试删除受保护的关键目录会抛出错误
 */
async function deleteDirectory(dirPath) {
  try {
    // 验证输入
    if (!dirPath || typeof dirPath !== 'string') {
      return { success: false, error: '无效的目录路径' }
    }

    // 规范化路径以进行安全比较
    const normalizedPath = path.resolve(dirPath)
    const appRootPath = path.resolve(__dirname, '../../..')

    // 定义受保护的关键目录
    const protectedPatterns = [
      // 根目录
      appRootPath,
      // SaveData 根目录
      path.resolve(appRootPath, 'SaveData'),
      // 系统路径
      path.resolve('C:\\'),
      path.resolve('C:\\Windows'),
      path.resolve('C:\\Program Files'),
      path.resolve('C:\\Program Files (x86)'),
      // Unix 系统路径
      '/',
      '/bin',
      '/sbin',
      '/usr',
      '/usr/bin',
      '/usr/local',
      '/etc',
      '/var',
      '/home',
      '/root'
    ]

    // 检查路径是否为受保护的关键目录或其父目录
    const isProtected = protectedPatterns.some(pattern => {
      const normalizedPattern = path.resolve(pattern)
      // 如果要删除的路径是保护路径本身或保护路径的父路径，则阻止
      return (
        normalizedPath === normalizedPattern ||
        normalizedPath.startsWith(normalizedPattern + path.sep)
      )
    })

    if (isProtected) {
      return {
        success: false,
        error: `无法删除受保护的目录: ${dirPath}。此目录是系统关键目录或应用数据目录。`
      }
    }

    // 检查目录是否存在
    if (!fs.existsSync(normalizedPath)) {
      return {
        success: false,
        error: `目录不存在: ${dirPath}`
      }
    }

    // 检查目录权限（可选）
    try {
      fs.accessSync(normalizedPath, fs.constants.W_OK)
    } catch (accessError) {
      return {
        success: false,
        error: `无权限删除目录: ${dirPath}`
      }
    }

    // 执行删除操作
    fs.rmSync(normalizedPath, { recursive: true, force: false })
    
    return { success: true }
  } catch (error) {
    console.error('删除目录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 确保目录存在（不存在则创建）
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
async function ensureDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    return { success: true }
  } catch (error) {
    console.error('创建目录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 列出目录中的文件
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Object>} { success: boolean, files?: string[], error?: string }
 */
async function listFiles(dirPath) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      console.warn('目录不存在:', dirPath)
      return { success: false, error: '目录不存在', files: [] }
    }
    
    // 读取目录内容
    const files = fs.readdirSync(dirPath)
    return { success: true, files: files }
  } catch (error) {
    console.error('列出目录文件失败:', error)
    return { success: false, error: error.message, files: [] }
  }
}

/**
 * 获取文件统计信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} { success: boolean, stats?: Object, error?: string }
 */
async function getFileStats(filePath) {
  try {
    if (!filePath) {
      return { success: false, error: '文件路径不能为空' }
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }
    
    // 获取文件统计信息
    const stats = fs.statSync(filePath)
    
    return {
      success: true,
      stats: {
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024 * 100) / 100,
        sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    }
  } catch (error) {
    console.error('获取文件统计信息失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 读取文本文件内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} { success: boolean, content?: string, fileSize?: number, wordCount?: number, encoding?: string, error?: string }
 */
async function readTextFile(filePath) {
  try {
    if (!filePath) {
      return { success: false, error: '文件路径不能为空' }
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }
    
    // 获取文件信息
    const stats = fs.statSync(filePath)
    const fileSize = stats.size
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8')
    
    // 计算字数（更适合中文文本的统计）
    // 移除空白字符和换行符，然后统计字符数
    const cleanContent = content.replace(/\s+/g, '')
    const wordCount = cleanContent.length
    
    console.log('文本文件分析:', {
      filePath: filePath,
      totalChars: content.length,
      cleanChars: wordCount,
      fileSize: fileSize
    })
    
    return {
      success: true,
      content: content,
      fileSize: fileSize,
      wordCount: wordCount,
      encoding: 'utf-8'
    }
  } catch (error) {
    console.error('读取文本文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 递归搜索目录，找到匹配扩展名的文件
 * 搜索规则：
 * - 根目录：遍历所有内容
 *   - 如果是文件：检查扩展名，匹配则加入结果
 *   - 如果是文件夹：递归搜索，一旦找到匹配文件则停止该文件夹的搜索
 * @param {string} rootDir - 根目录路径
 * @param {string[]} extensions - 要匹配的扩展名数组（如 ['.exe', '.zip']）
 * @returns {Promise<Object>} { success: boolean, files?: string[], error?: string }
 */
async function searchMatchingFiles(rootDir, extensions) {
  try {
    if (!fs.existsSync(rootDir)) {
      return { success: false, error: '目录不存在' }
    }

    const matchedFiles = []
    const lowerExtensions = extensions.map(ext => ext.toLowerCase())

    // 辅助函数：递归搜索文件夹（广度优先）
    const searchFolder = (dirPath) => {
      const items = fs.readdirSync(dirPath)
      
      // 第一遍：先检查当前文件夹下的所有文件
      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stats = fs.statSync(itemPath)

        if (stats.isFile()) {
          // 检查文件扩展名
          const lowerItem = item.toLowerCase()
          const matches = lowerExtensions.some(ext => lowerItem.endsWith(ext))
          if (matches) {
            // 找到匹配文件，返回相对于根目录的路径
            const relativePath = path.relative(rootDir, itemPath)
            matchedFiles.push(relativePath)
            return true // 找到匹配文件，停止该文件夹的搜索
          }
        }
      }
      
      // 第二遍：如果没有找到匹配文件，才递归搜索子文件夹
      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stats = fs.statSync(itemPath)

        if (stats.isDirectory()) {
          // 递归搜索子文件夹
          const found = searchFolder(itemPath)
          if (found) {
            return true // 子文件夹找到匹配文件，停止当前文件夹搜索
          }
        }
      }
      
      return false // 该文件夹没有找到匹配文件
    }

    // 遍历根目录
    const rootItems = fs.readdirSync(rootDir)
    
    // 根目录第一遍：先检查所有文件
    for (const item of rootItems) {
      const itemPath = path.join(rootDir, item)
      const stats = fs.statSync(itemPath)

      if (stats.isFile()) {
        // 根目录的文件：直接检查扩展名
        const lowerItem = item.toLowerCase()
        const matches = lowerExtensions.some(ext => lowerItem.endsWith(ext))
        if (matches) {
          matchedFiles.push(item)
        }
      }
    }
    
    // 根目录第二遍：处理子文件夹
    for (const item of rootItems) {
      const itemPath = path.join(rootDir, item)
      const stats = fs.statSync(itemPath)

      if (stats.isDirectory()) {
        // 根目录的子文件夹：递归搜索
        searchFolder(itemPath)
      }
    }

    return { success: true, files: matchedFiles }
  } catch (error) {
    console.error('搜索匹配文件失败:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  writeJsonFile,
  readJsonFile,
  writeFile,
  saveThumbnail,
  deleteFile,
  deleteDirectory,
  ensureDirectory,
  listFiles,
  getFileStats,
  readTextFile,
  searchMatchingFiles
}

