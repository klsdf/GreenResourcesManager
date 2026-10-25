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
 * - countNovelWords()     统计小说字数（不把正文传回页面）
 * 
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
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
    // 异步读取，避免大目录阻塞主进程
    const stats = await fs.promises.stat(dirPath)
    if (!stats.isDirectory()) {
      return { success: false, error: '路径不是文件夹', files: [] }
    }

    const files = await fs.promises.readdir(dirPath)
    return { success: true, files }
  } catch (error) {
    console.warn('目录不存在或无法读取:', dirPath)
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

    let stats
    try {
      stats = await fs.promises.stat(filePath)
    } catch {
      return { success: false, error: '文件不存在' }
    }
    
    return {
      success: true,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100,
      sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
      birthtime: stats.birthtime,
      mtime: stats.mtime,
      atime: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
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
 * 判断缓冲区是不是合法的 UTF-8。
 * 中文小说经常是 GBK。用 UTF-8 硬读会得到乱码，字数也不准。
 * @param {Buffer} buffer - 文件内容
 * @returns {boolean} 能按 UTF-8 严格解码时为 true
 */
function isValidUtf8(buffer) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    return true
  } catch {
    return false
  }
}

/**
 * 把小说文本解码成字符串。
 * 先认 BOM，再认合法 UTF-8，剩下的按 GB18030。这样 GBK 小说也能数出字数。
 * @param {Buffer} buffer - 文件内容
 * @returns {string} 解码后的文本
 */
function decodeNovelText(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.subarray(3).toString('utf8')
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return buffer.subarray(2).toString('utf16le')
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    const swapped = Buffer.from(buffer.subarray(2))
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const byte = swapped[i]
      swapped[i] = swapped[i + 1]
      swapped[i + 1] = byte
    }
    return swapped.toString('utf16le')
  }
  if (isValidUtf8(buffer)) {
    return buffer.toString('utf8')
  }
  return new TextDecoder('gb18030').decode(buffer)
}

/**
 * 统计正文里的字数。去掉空白后按字符计，中文一字算一字。
 * @param {string} text - 正文
 * @returns {number} 字数
 */
function countTextWords(text) {
  if (!text) return 0
  return text.replace(/\s+/g, '').length
}

/**
 * 从 HTML 里抽出可见文字，避免把标签也算进字数。
 * @param {string} html - 章节 HTML
 * @returns {string} 纯文本
 */
function stripHtmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const value = Number(code)
      return Number.isFinite(value) ? String.fromCharCode(value) : ''
    })
}

/**
 * 统计 epub 里各章节的字数。目录和封面页不计入，免得把书名重复算一遍。
 * @param {string} filePath - epub 路径
 * @returns {number} 字数
 */
function countEpubWords(filePath) {
  const AdmZip = require('adm-zip')
  const zip = new AdmZip(filePath)
  let total = 0
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const name = entry.entryName.replace(/\\/g, '/').toLowerCase()
    if (!/\.(xhtml|html|htm)$/.test(name)) continue
    if (/(^|\/)(nav|toc|cover)[^/]*\.(xhtml|html|htm)$/.test(name)) continue
    const html = decodeNovelText(entry.getData())
    total += countTextWords(stripHtmlToText(html))
  }
  return total
}

/**
 * 统计小说文件的字数，只返回数字，不把正文传回页面。
 * 支持 txt、md 和 epub。pdf 先不算，避免把二进制当成文字。
 * @param {string} filePath - 小说文件路径
 * @returns {Promise<{ success: boolean, wordCount?: number, error?: string }>}
 */
async function countNovelWords(filePath) {
  try {
    if (!filePath) {
      return { success: false, error: '文件路径不能为空' }
    }
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.epub') {
      const wordCount = countEpubWords(filePath)
      return { success: wordCount > 0, wordCount }
    }
    if (ext === '.txt' || ext === '.md' || ext === '.text') {
      const buffer = fs.readFileSync(filePath)
      const wordCount = countTextWords(decodeNovelText(buffer))
      return { success: wordCount > 0, wordCount }
    }
    return { success: false, error: '这个格式暂时不能统计字数' }
  } catch (error) {
    console.error('统计小说字数失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 在选定目录里找出扩展名符合的文件。
 * 同一层里符合的文件都会列出来，交给导入窗口勾选，不再碰到第一个就停。
 * 名字命中排除名单的文件不收录，同名文件夹也不再进去，用来跳过 Unity 的崩溃处理程序这类附属 exe。
 * 符号链接不跟进去，避免「不限制层数」时在目录环里转圈。
 * @param {string} rootDir 要搜索的根目录
 * @param {string[]} extensions 要匹配的扩展名，例如 ['.exe', '.zip']
 * @param {{ maxDepth?: number | null, excludePatterns?: string[], stopAtFirstMatch?: boolean }} [options]
 *   maxDepth 是往下进入的子文件夹层数，0 只看根目录，null 表示不限制。
 *   stopAtFirstMatch 为 true 时，某个文件夹本层找到符合的文件后就不再进入它的子文件夹；
 *   同一层的文件仍会全部列出，比如 game.exe 和同目录的启动器都在。
 * @returns {Promise<{ success: boolean, files?: string[], error?: string }>} 相对根目录的路径
 */
async function searchMatchingFiles(rootDir, extensions, options = {}) {
  try {
    if (!rootDir || !fs.existsSync(rootDir)) {
      return { success: false, error: '目录不存在' }
    }

    /** 符合条件的相对路径。导入时再拼回根目录。 */
    const matchedFiles = []
    /** 小写扩展名，比较时不再重复转换。 */
    const lowerExtensions = (Array.isArray(extensions) ? extensions : [])
      .map(ext => String(ext).toLowerCase())
      .filter(Boolean)
    /** 不限制时为 null。非法数字按 3 层，和窗口里的默认值一致。 */
    const rawDepth = options.maxDepth
    /** 允许进入的最深子文件夹层数。根目录本身不算一层。 */
    const maxDepth = rawDepth == null || rawDepth === ''
      ? null
      : (Number.isFinite(Number(rawDepth)) ? Math.max(0, Math.floor(Number(rawDepth))) : 3)
    /**
     * 排除片段。默认按「文件或文件夹名里包含这段」跳过。
     * 写成 folder:xxx 只匹配文件夹；folder:=xxx 只匹配名字完全等于 xxx 的文件夹。
     */
    const excludePatterns = (Array.isArray(options.excludePatterns) ? options.excludePatterns : [])
      .map(item => String(item).trim().toLowerCase())
      .filter(Boolean)
    /** 本层找到匹配后是否还进子文件夹。默认继续往下找。 */
    const stopAtFirstMatch = options.stopAtFirstMatch === true
    /** 已经走进去的真实路径，用来挡住目录联接造成的环。 */
    const seenDirs = new Set()
    /** 已查看的目录数。每隔一段让出主线程，大目录搜索时窗口还能动。 */
    let visitedDirs = 0

    /**
     * 单个名字是否命中一条排除规则。
     * @param {string} name 文件或文件夹名
     * @param {boolean} isDirectory 是不是文件夹
     * @param {string} pattern 已经转成小写的排除片段
     * @returns {boolean} 命中时为 true
     */
    const matchesExcludePattern = (name, isDirectory, pattern) => {
      if (!pattern.startsWith('folder:')) {
        return name.includes(pattern)
      }
      if (!isDirectory) return false

      const folderPattern = pattern.slice('folder:'.length)
      if (folderPattern.startsWith('=')) {
        const exactName = folderPattern.slice(1)
        return !!exactName && name === exactName
      }
      return !!folderPattern && name.includes(folderPattern)
    }

    /**
     * 名字是否命中排除名单。
     * @param {string} name 文件或文件夹名
     * @param {boolean} isDirectory 是不是文件夹
     * @returns {boolean} 应该跳过时为 true
     */
    const isExcluded = (name, isDirectory) => {
      const lower = name.toLowerCase()
      return excludePatterns.some(pattern => matchesExcludePattern(lower, isDirectory, pattern))
    }

    /**
     * 从某一层开始收集文件。
     * @param {string} dirPath 当前目录
     * @param {number} depth 已经往下走了几层。根目录是 0
     */
    const walk = async (dirPath, depth) => {
      if (maxDepth != null && depth > maxDepth) return
      /** 解析后的真实路径。解析失败时用原路径，避免一个坏链接中断整次搜索。 */
      let realPath = dirPath
      try {
        realPath = fs.realpathSync(dirPath)
      } catch (error) {
        realPath = dirPath
      }
      const seenKey = realPath.toLowerCase()
      if (seenDirs.has(seenKey)) return
      seenDirs.add(seenKey)

      /** 当前目录的子项。读不到就跳过这一层，例如没有权限的文件夹。 */
      let entries = []
      try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch (error) {
        return
      }

      visitedDirs += 1
      if (visitedDirs % 80 === 0) {
        await new Promise(resolve => setImmediate(resolve))
      }

      // 先收本层的文件，再看要不要进子文件夹。
      // 勾了「找到后不再往下」时，本层已经有结果就不再展开这一支，
      // 避免游戏目录里 bin、tool 里的附属 exe 也被当成一个资源。
      let matchedInThisDir = false
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue
        if (isExcluded(entry.name, entry.isDirectory())) continue
        if (!entry.isFile()) continue
        const lowerName = entry.name.toLowerCase()
        if (!lowerExtensions.some(ext => lowerName.endsWith(ext))) continue
        matchedFiles.push(path.relative(rootDir, path.join(dirPath, entry.name)))
        matchedInThisDir = true
      }

      if (stopAtFirstMatch && matchedInThisDir) return
      if (maxDepth != null && depth >= maxDepth) return

      for (const entry of entries) {
        if (entry.isSymbolicLink() || !entry.isDirectory()) continue
        if (isExcluded(entry.name, true)) continue
        await walk(path.join(dirPath, entry.name), depth + 1)
      }
    }

    await walk(rootDir, 0)
    return { success: true, files: matchedFiles }
  } catch (error) {
    console.error('搜索匹配文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 保存封面图片到指定的 cover 文件夹
 * @param {string} sourceImagePath - 源图片路径
 * @param {string} saveDataDir - SaveData 目录路径
 * @param {string} resourceType - 资源类型 (games, images, videos, novels, audio, software, website, other)
 * @param {string} resourceId - 资源 ID
 * @returns {Promise<Object>} { success: boolean, coverPath?: string, error?: string }
 */
async function saveCoverToFolder(sourceImagePath, saveDataDir, resourceType, resourceId) {
  try {
    if (!sourceImagePath || !saveDataDir || !resourceType || !resourceId) {
      return { success: false, error: '缺少必要参数' }
    }

    // 检查源文件是否存在
    if (!fs.existsSync(sourceImagePath)) {
      return { success: false, error: '源图片文件不存在' }
    }

    // 构建目标封面文件夹路径
    const coverDir = path.join(saveDataDir, resourceType, 'covers')
    
    // 确保封面文件夹存在
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true })
    }

    // 获取源文件的扩展名
    const ext = path.extname(sourceImagePath) || '.jpg'
    
    // 构建目标文件路径（使用资源 ID + 时间戳 + 扩展名）
    const timestamp = Date.now()
    const targetFileName = `${resourceId}_${timestamp}${ext}`
    const targetFilePath = path.join(coverDir, targetFileName)

    // 复制文件
    fs.copyFileSync(sourceImagePath, targetFilePath)

    // 验证复制是否成功
    if (!fs.existsSync(targetFilePath)) {
      return { success: false, error: '封面文件复制失败' }
    }

    // 返回相对路径（相对于 SaveData 目录）
    const relativePath = path.join(resourceType, 'covers', targetFileName).replace(/\\/g, '/')
    
    return { success: true, coverPath: relativePath }
  } catch (error) {
    console.error('保存封面失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 从 DataURL 保存封面图片到指定的 cover 文件夹
 * @param {string} dataUrl - base64 dataURL
 * @param {string} saveDataDir - SaveData 目录路径
 * @param {string} resourceType - 资源类型
 * @param {string} resourceId - 资源 ID
 * @returns {Promise<Object>} { success: boolean, coverPath?: string, error?: string }
 */
async function saveCoverFromDataUrl(dataUrl, saveDataDir, resourceType, resourceId) {
  try {
    if (!dataUrl || !saveDataDir || !resourceType || !resourceId) {
      return { success: false, error: '缺少必要参数' }
    }

    // 解析 dataURL 获取扩展名
    let ext = '.jpg'
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);/)
    if (match && match[1]) {
      ext = '.' + match[1].toLowerCase()
      if (ext === '.jpeg') ext = '.jpg'
    }

    // 构建目标封面文件夹路径
    const coverDir = path.join(saveDataDir, resourceType, 'covers')
    
    // 确保封面文件夹存在
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true })
    }

    // 构建目标文件路径
    const timestamp = Date.now()
    const targetFileName = `${resourceId}_${timestamp}${ext}`
    const targetFilePath = path.join(coverDir, targetFileName)

    // 提取 base64 数据并保存
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) {
      return { success: false, error: '无效的 dataURL 格式' }
    }

    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(targetFilePath, buffer)

    // 验证保存是否成功
    if (!fs.existsSync(targetFilePath)) {
      return { success: false, error: '封面文件保存失败' }
    }

    // 返回相对路径
    const relativePath = path.join(resourceType, 'covers', targetFileName).replace(/\\/g, '/')
    
    return { success: true, coverPath: relativePath }
  } catch (error) {
    console.error('从 dataURL 保存封面失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 读取 Windows 程序的产品名。
 * 版本信息里的 ProductName 是程序自己写的，不随 exe 改名而变。Kirikiri Z 的内核固定写着 TVP(KIRIKIRI) Z core。
 * @param {string} filePath 可执行文件路径
 * @returns {Promise<{ success: boolean, productName?: string, error?: string }>}
 */
function getFileProductName(filePath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, error: '仅 Windows 可以读取程序产品名' })
      return
    }
    if (!filePath || !fs.existsSync(filePath)) {
      resolve({ success: false, error: '文件不存在' })
      return
    }
    const escapedPath = String(filePath).replace(/'/g, "''")
    const powershell = spawn('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-Item -LiteralPath '${escapedPath}').VersionInfo.ProductName`
    ])
    const timeout = setTimeout(() => {
      if (!powershell.killed) powershell.kill()
      resolve({ success: false, error: '读取产品名超时' })
    }, 8000)
    let output = ''
    powershell.stdout.on('data', (data) => {
      output += data.toString()
    })
    powershell.on('error', (error) => {
      clearTimeout(timeout)
      resolve({ success: false, error: error.message })
    })
    powershell.on('close', () => {
      clearTimeout(timeout)
      const productName = output.replace(/\r/g, '').trim()
      if (!productName) {
        resolve({ success: false, error: '没有产品名' })
        return
      }
      resolve({ success: true, productName })
    })
  })
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
  getFileProductName,
  getFileStats,
  readTextFile,
  countNovelWords,
  searchMatchingFiles,
  saveCoverToFolder,
  saveCoverFromDataUrl
}

