 import saveManager from './SaveManager.ts'

class NovelManager {
  novels: any[]
  pageId: string
  dataFile: string
  settingsFile: string
  defaultSettings: any
  settings: any

  constructor(pageId: string = 'novels') {
    this.novels = []
    this.pageId = pageId
    this.dataFile = 'SaveData/novels.json'
    this.settingsFile = 'SaveData/novel-settings.json'
    this.defaultSettings = {
      defaultOpenMode: 'internal', // 'internal' 或 'external'
      readerSettings: {
        fontSize: 16,
        lineHeight: 1.6,
        fontFamily: 'Microsoft YaHei, sans-serif',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        showProgress: true,
        wordsPerPage: 1000,
        readMode: 'paged'
      }
    }
    this.settings = { ...this.defaultSettings }
  }

  // 加载小说数据
  async loadNovels() {
    try {
      this.novels = await saveManager.loadPageData(this.pageId)
      console.log('加载小说数据:', this.novels.length, '本小说')
      return this.novels
    } catch (error) {
      console.error('加载小说数据失败:', error)
      this.novels = []
      return []
    }
  }

  // 保存小说数据
  async saveNovels() {
    try {
      const success = await saveManager.savePageData(this.pageId, this.novels)
      if (success) {
        console.log('小说数据保存成功:', this.novels.length, '本小说')
      }
      return success
    } catch (error) {
      console.error('保存小说数据失败:', error)
      return false
    }
  }

  // 添加小说
  async addNovel(novelData) {
    try {
      const novel = {
        id: Date.now().toString(),
        name: novelData.name || '',
        author: novelData.author || '',
        description: novelData.description || '',
        genre: novelData.genre || '',
        language: novelData.language || 'zh',
        filePath: novelData.filePath || '',
        fileSize: Number(novelData.fileSize) || 0,
        encoding: novelData.encoding || 'utf-8',
        totalWords: Number(novelData.totalWords) || 0,
        totalChapters: Number(novelData.totalChapters) || 0,
        currentChapter: Number(novelData.currentChapter) || 0,
        readProgress: Number(novelData.readProgress) || 0,
        readTime: Number(novelData.readTime) || 0,
        lastRead: novelData.lastRead || null,
        firstRead: novelData.firstRead || null,
        addedDate: novelData.addedDate || new Date().toISOString(),
        rating: Number(novelData.rating) || 0,
        notes: novelData.notes || '',
        tags: Array.isArray(novelData.tags) ? novelData.tags : [],
        status: novelData.status || 'unread', // unread, reading, completed, paused
        isFavorite: Boolean(novelData.isFavorite) || false,
        isPrivate: Boolean(novelData.isPrivate) || false,
        coverImage: novelData.coverImage || '',
        publishYear: novelData.publishYear || '',
        publisher: novelData.publisher || '',
        isbn: novelData.isbn || '',
        series: novelData.series || '',
        volume: novelData.volume || '',
        chapters: Array.isArray(novelData.chapters) ? novelData.chapters : [],
        bookmarks: Array.isArray(novelData.bookmarks) ? novelData.bookmarks : [],
        highlights: Array.isArray(novelData.highlights) ? novelData.highlights : []
      }

      this.novels.push(novel)
      const success = await this.saveNovels()
      
      if (success) {
        console.log('小说添加成功:', novel.name)
        return novel
      } else {
        // 如果保存失败，从数组中移除
        this.novels.pop()
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('添加小说失败:', error)
      throw error
    }
  }

  // 更新小说
  async updateNovel(novelId, updateData) {
    try {
      const index = this.novels.findIndex(novel => novel.id === novelId)
      if (index === -1) {
        throw new Error('小说不存在')
      }

      // 更新小说数据
      this.novels[index] = { ...this.novels[index], ...updateData }
      
      const success = await this.saveNovels()
      if (success) {
        console.log('小说更新成功:', this.novels[index].name)
        return this.novels[index]
      } else {
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('更新小说失败:', error)
      throw error
    }
  }

  // 删除小说
  async deleteNovel(novelId) {
    try {
      const index = this.novels.findIndex(novel => novel.id === novelId)
      if (index === -1) {
        throw new Error('小说不存在')
      }

      const novel = this.novels[index]
      this.novels.splice(index, 1)
      
      const success = await this.saveNovels()
      if (success) {
        console.log('小说删除成功:', novel.name)
        return true
      } else {
        // 如果保存失败，恢复小说
        this.novels.splice(index, 0, novel)
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('删除小说失败:', error)
      throw error
    }
  }

  // 更新阅读进度
  async updateReadProgress(novelId, progress) {
    try {
      const novel = this.novels.find(n => n.id === novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }

      novel.readProgress = Math.max(0, Math.min(100, progress))
      novel.lastRead = new Date().toISOString()
      
      if (!novel.firstRead) {
        novel.firstRead = new Date().toISOString()
      }

      const success = await this.saveNovels()
      if (success) {
        console.log('阅读进度更新成功:', novel.name, '进度:', novel.readProgress + '%')
        return novel
      } else {
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('更新阅读进度失败:', error)
      throw error
    }
  }

  // 添加书签
  async addBookmark(novelId, bookmark) {
    try {
      const novel = this.novels.find(n => n.id === novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }

      const newBookmark = {
        id: Date.now().toString(),
        title: bookmark.title || '书签',
        position: Number(bookmark.position) || 0,
        chapter: Number(bookmark.chapter) || 0,
        note: bookmark.note || '',
        createdAt: new Date().toISOString()
      }

      novel.bookmarks.push(newBookmark)
      
      const success = await this.saveNovels()
      if (success) {
        console.log('书签添加成功:', novel.name)
        return newBookmark
      } else {
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('添加书签失败:', error)
      throw error
    }
  }

  // 删除书签
  async removeBookmark(novelId, bookmarkId) {
    try {
      const novel = this.novels.find(n => n.id === novelId)
      if (!novel) {
        throw new Error('小说不存在')
      }

      const index = novel.bookmarks.findIndex(b => b.id === bookmarkId)
      if (index === -1) {
        throw new Error('书签不存在')
      }

      novel.bookmarks.splice(index, 1)
      
      const success = await this.saveNovels()
      if (success) {
        console.log('书签删除成功:', novel.name)
        return true
      } else {
        throw new Error('保存小说数据失败')
      }
    } catch (error) {
      console.error('删除书签失败:', error)
      throw error
    }
  }

  // 搜索小说
  searchNovels(query) {
    if (!query || query.trim() === '') {
      return this.novels
    }

    const lowerQuery = query.toLowerCase()
    return this.novels.filter(novel => 
      novel.name.toLowerCase().includes(lowerQuery) ||
      novel.author.toLowerCase().includes(lowerQuery) ||
      novel.description.toLowerCase().includes(lowerQuery) ||
      novel.genre.toLowerCase().includes(lowerQuery) ||
      novel.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // 按阅读进度排序
  sortByReadProgress() {
    return [...this.novels].sort((a, b) => (b.readProgress || 0) - (a.readProgress || 0))
  }

  // 按添加时间排序
  sortByAddedDate() {
    return [...this.novels].sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime())
  }

  // 按名称排序
  sortByName() {
    return [...this.novels].sort((a, b) => a.name.localeCompare(b.name))
  }

  // 按作者排序
  sortByAuthor() {
    return [...this.novels].sort((a, b) => a.author.localeCompare(b.author))
  }

  // 按最后阅读时间排序
  sortByLastRead() {
    return [...this.novels].sort((a, b) => {
      if (!a.lastRead && !b.lastRead) return 0
      if (!a.lastRead) return 1
      if (!b.lastRead) return -1
      return new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
    })
  }

  // 按状态分组
  groupByStatus() {
    const groups = {
      unread: [],
      reading: [],
      completed: [],
      paused: []
    }
    
    this.novels.forEach(novel => {
      const status = novel.status || 'unread'
      if (groups[status]) {
        groups[status].push(novel)
      }
    })
    
    return groups
  }

  // 获取统计信息
  getStats() {
    const totalNovels = this.novels.length
    const totalWords = this.novels.reduce((sum, novel) => sum + (novel.totalWords || 0), 0)
    const totalReadTime = this.novels.reduce((sum, novel) => sum + (novel.readTime || 0), 0)
    const completedNovels = this.novels.filter(novel => novel.status === 'completed').length
    const readingNovels = this.novels.filter(novel => novel.status === 'reading').length
    const favoriteNovels = this.novels.filter(novel => novel.isFavorite).length
    const totalBookmarks = this.novels.reduce((sum, novel) => sum + (novel.bookmarks?.length || 0), 0)

    return {
      totalNovels,
      totalWords,
      totalReadTime,
      completedNovels,
      readingNovels,
      favoriteNovels,
      totalBookmarks
    }
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化阅读时间
  formatReadTime(minutes) {
    if (minutes < 60) {
      return `${minutes} 分钟`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours} 小时 ${mins} 分钟`
    } else {
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      return `${days} 天 ${hours} 小时`
    }
  }

  // 计算阅读速度（字/分钟）
  calculateReadingSpeed(novel) {
    if (!novel.readTime || novel.readTime === 0) return 0
    const readWords = (novel.totalWords * novel.readProgress) / 100
    return Math.round(readWords / novel.readTime)
  }

  // 估算剩余阅读时间
  estimateRemainingTime(novel) {
    if (!novel.readProgress || novel.readProgress === 0) return 0
    const remainingWords = (novel.totalWords * (100 - novel.readProgress)) / 100
    const readingSpeed = this.calculateReadingSpeed(novel)
    if (readingSpeed === 0) return 0
    return Math.round(remainingWords / readingSpeed)
  }

  // 导出小说数据
  exportNovels() {
    return {
      novels: this.novels,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  // 导入小说数据
  async importNovels(data) {
    try {
      if (data.novels && Array.isArray(data.novels)) {
        this.novels = [...this.novels, ...data.novels]
        const success = await this.saveNovels()
        if (success) {
          console.log('小说数据导入成功:', data.novels.length, '本小说')
          return true
        } else {
          throw new Error('保存导入数据失败')
        }
      } else {
        throw new Error('无效的导入数据格式')
      }
    } catch (error) {
      console.error('导入小说数据失败:', error)
      throw error
    }
  }

  // 从全局设置中获取小说设置
  async getNovelSettingsFromGlobal() {
    try {
      const allSettings = await saveManager.loadSettings()
      if (allSettings) {
        // 从全局设置中提取小说相关设置
        const novelSettings = {
          defaultOpenMode: allSettings.novelDefaultOpenMode || 'internal',
          readerSettings: {
            fontSize: allSettings.novelFontSize || 16,
            lineHeight: allSettings.novelLineHeight || 1.6,
            fontFamily: allSettings.novelFontFamily || 'Microsoft YaHei, sans-serif',
            backgroundColor: allSettings.novelBackgroundColor || '#ffffff',
            textColor: allSettings.novelTextColor || '#333333',
            showProgress: allSettings.novelShowProgress !== false,
            wordsPerPage: allSettings.novelWordsPerPage || 1000,
            readMode: allSettings.novelReadMode === 'infinite' || allSettings.novel?.readerSettings?.readMode === 'infinite' ? 'infinite' : 'paged'
          }
        }
        return novelSettings
      }
      return this.defaultSettings
    } catch (error) {
      console.error('获取小说设置失败:', error)
      return this.defaultSettings
    }
  }

}

export { NovelManager }
export default new NovelManager()

