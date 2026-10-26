/**
 * @module MediaHandlers
 * @description 管理应用程序的媒体文件相关特殊操作的 IPC 处理器。
 *
 * 主要功能:
 * 1. 打开文件夹（使用系统文件管理器）。
 * 2. 读取伪装图片和文本。
 * 3. 注册与媒体相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, shell, pathUtils)`: 注册 IPC 处理器。
 *
 * IPC 处理器:
 * - `open-folder`: 打开文件夹。
 * - `read-disguise-images`: 读取伪装图片和文本。
 */

const fs = require('fs')
const path = require('path')
const { app, shell } = require('electron')
const { isImageFile } = require('../utils/image-file')

/**
 * 注册与媒体相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} shell - Electron 的 shell 对象（可选，如果未提供则使用 require）。
 * @param {Object} pathUtils - path-utils 模块（可选）。
 */
function registerIpcHandlers(ipcMain, shell, pathUtils) {
  // 打开文件夹
  ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
      // 处理空路径或无效路径
      if (!folderPath || folderPath.trim() === '' || folderPath === '.') {
        return { success: false, error: '无效的文件夹路径' }
      }

      // 规范化路径
      let normalizedPath = folderPath.replace(/\\/g, '/')

      // 判断是否为绝对路径
      const isAbsolute = /^[A-Za-z]:/.test(normalizedPath) || path.isAbsolute(normalizedPath)

      // 转换为绝对路径并规范化
      let absolutePath
      if (!isAbsolute) {
        absolutePath = path.resolve(process.cwd(), normalizedPath)
      } else {
        absolutePath = path.normalize(normalizedPath)
      }

      // 在 Windows 上，确保路径格式正确
      if (process.platform === 'win32') {
        absolutePath = absolutePath.replace(/\//g, '\\')
      }


      // 确保文件夹存在
      if (!fs.existsSync(absolutePath)) {
        console.error('文件夹不存在:', absolutePath)
        return { success: false, error: `文件夹不存在: ${absolutePath}` }
      }

      // 检查是否为文件夹
      const stats = fs.statSync(absolutePath)
      if (!stats.isDirectory()) {
        return { success: false, error: '指定路径不是文件夹' }
      }


      // 交给系统默认文件管理器打开，用户使用第三方管理器时也能生效
      const openError = await shell.openPath(absolutePath)
      if (openError) {
        return { success: false, error: openError }
      }

      return { success: true }
    } catch (error) {
      console.error('打开文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 打开某一份 AI Skill 的文件夹。
   * skillName 只能是 ai-handbook 下的一层目录名，避免打开到手册以外的路径。
   * @param {string} skillName skill 目录名，例如 update-local-save
   */
  ipcMain.handle('open-ai-handbook', async (event, skillName) => {
    try {
      /** 全部 skill 所在的目录。 */
      const handbookDir = path.resolve(app.getAppPath(), 'ai-handbook')
      /** 只接受一层目录名，拒绝 .. 和斜杠。 */
      const folderName = String(skillName || '')
      if (!/^[a-z0-9-]+$/.test(folderName)) {
        return { success: false, error: '无效的 skill' }
      }
      /** 这份 skill 的目录，里面应有 SKILL.md。 */
      const targetDir = path.resolve(handbookDir, folderName)
      if (!targetDir.startsWith(handbookDir + path.sep)) {
        return { success: false, error: '无效的 skill' }
      }
      if (!fs.existsSync(targetDir)) {
        return { success: false, error: `文件夹不存在: ${targetDir}` }
      }
      const openError = await shell.openPath(targetDir)
      if (openError) {
        return { success: false, error: openError }
      }
      return { success: true }
    } catch (error) {
      console.error('打开 AI Skill 文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 重命名文件夹
  ipcMain.handle('rename-folder', async (event, oldPath, newPath) => {
    try {
      if (!oldPath || !newPath || oldPath.trim() === '' || newPath.trim() === '') {
        return { success: false, error: '无效的文件夹路径' }
      }

      // 规范化路径
      const normalizedOldPath = path.normalize(oldPath)
      const normalizedNewPath = path.normalize(newPath)

      // 检查旧文件夹是否存在
      if (!fs.existsSync(normalizedOldPath)) {
        return { success: false, error: `源文件夹不存在: ${normalizedOldPath}` }
      }

      // 检查是否为文件夹
      const stats = fs.statSync(normalizedOldPath)
      if (!stats.isDirectory()) {
        return { success: false, error: '源路径不是文件夹' }
      }

      // 检查新路径是否已存在
      if (fs.existsSync(normalizedNewPath)) {
        return { success: false, error: `目标文件夹已存在: ${normalizedNewPath}` }
      }

      // 确保目标目录的父目录存在
      const parentDir = path.dirname(normalizedNewPath)
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }

      // 重命名文件夹
      fs.renameSync(normalizedOldPath, normalizedNewPath)
      console.log(`✅ 文件夹重命名成功: "${normalizedOldPath}" -> "${normalizedNewPath}"`)

      return { success: true }
    } catch (error) {
      console.error('重命名文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  /**
   * 找到存放伪装图片的 disguise 文件夹。
   * 开发时它在项目根目录；打包后会放在程序旁边。优先用已经放了图片的那一个，
   * 避免当前工作目录是空文件夹时，把项目里准备好的图片漏掉。
   * @returns {string} disguise 文件夹路径
   */
  function resolveDisguiseDirectory() {
    const { app } = require('electron')
    /** 可能放着 disguise 文件夹的位置，按常见启动方式排列。 */
    const candidates = [
      path.join(process.cwd(), 'disguise'),
      path.join(app.getAppPath(), 'disguise'),
      path.join(path.dirname(app.getPath('exe')), 'disguise')
    ]
    const withImages = candidates.find((dir) => {
      if (!fs.existsSync(dir)) return false
      try {
        return fs.readdirSync(dir, { withFileTypes: true }).some(
          (entry) => entry.isFile() && isImageFile(path.join(dir, entry.name))
        )
      } catch (error) {
        return false
      }
    })
    if (withImages) return withImages
    const existing = candidates.find((dir) => fs.existsSync(dir))
    return existing || candidates[0]
  }

  /**
   * 返回伪装图片文件夹，不存在就先创建。
   * 设置页用它打开资源管理器，和读取封面用的是同一个目录。
   */
  ipcMain.handle('get-disguise-directory', async () => {
    try {
      const disguiseDir = resolveDisguiseDirectory()
      if (!fs.existsSync(disguiseDir)) {
        fs.mkdirSync(disguiseDir, { recursive: true })
      }
      return { success: true, directory: disguiseDir }
    } catch (error) {
      console.error('获取伪装图片文件夹失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 专门用于读取伪装图片的 API
  ipcMain.handle('read-disguise-images', async () => {
    try {
      const disguiseDir = resolveDisguiseDirectory()

      // 检查目录是否存在，如果不存在则创建
      if (!fs.existsSync(disguiseDir)) {
        console.log('disguise 目录不存在，正在创建...')
        try {
          fs.mkdirSync(disguiseDir, { recursive: true })
          console.log('✅ disguise 目录创建成功')
        } catch (error) {
          console.error('❌ 创建 disguise 目录失败:', error)
          return { success: false, error: '创建 disguise 目录失败: ' + error.message, images: [] }
        }
      }

      // 读取目录内容，按文件头筛选真实图片，避免改过后缀的文件被误判
      const entries = fs.readdirSync(disguiseDir, { withFileTypes: true })
      const imageFiles = entries
        .filter((entry) => entry.isFile() && isImageFile(path.join(disguiseDir, entry.name)))
        .map((entry) => entry.name)


      // 尝试读取 disguise.txt 文件
      let disguiseTexts = []
      const disguiseTextPath = path.join(disguiseDir, 'disguise.txt')
      try {
        if (fs.existsSync(disguiseTextPath)) {
          // console.log('发现 disguise.txt 文件，正在读取...')
          const textContent = fs.readFileSync(disguiseTextPath, 'utf8')
          // 按行分割，过滤空行和空白字符
          disguiseTexts = textContent
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
          // console.log(`✅ 从 disguise.txt 读取了 ${disguiseTexts.length} 条伪装文字`)
        } else {
          console.log('disguise.txt 文件不存在，将使用默认伪装文字')
        }
      } catch (textError) {
        console.warn('读取 disguise.txt 失败:', textError.message)
        console.log('将使用默认伪装文字')
      }

      return {
        success: true,
        images: imageFiles,
        texts: disguiseTexts,
        directory: disguiseDir,
        hasImages: imageFiles.length > 0,
        hasTexts: disguiseTexts.length > 0
      }
    } catch (error) {
      console.error('❌ 读取伪装图片失败:', error)
      return { success: false, error: error.message, images: [], texts: [] }
    }
  })
}

module.exports = {
  registerIpcHandlers
}

