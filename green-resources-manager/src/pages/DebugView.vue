<template>
  <div class="debug-view">
    <div class="debug-content">
      <div class="debug-header">
        <h2>🐛 Debug 页面</h2>
        <p>用于各种调试和测试</p>
      </div>

      <div class="debug-section">
        <h3>快速测试</h3>
        <div class="test-actions">
          <button @click="testNotification" class="btn btn-primary">测试通知</button>
          <button @click="testAlert" class="btn btn-primary">测试弹窗</button>
          <button @click="testConfirm" class="btn btn-primary">测试确认</button>
        </div>
      </div>

      <div class="debug-section">
        <h3>资源测试</h3>
        <div class="resources-grid">
          <div v-for="(resource, index) in exampleResources" :key="`${resource.type}-${index}`" class="resource-item">
            <h4 class="resource-type-label">{{ resource.typeLabel }}</h4>
            <MediaCard
              :item="resource.item"
              :type="resource.type"
              :is-electron-environment="isElectronEnvironment"
              :file-exists="resource.item.fileExists?.value !== false"
              :scale="100"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue'
import notificationService from '../utils/NotificationService.ts'
import alertService from '../utils/AlertService.ts'
import confirmService from '../utils/ConfirmService.ts'
import MediaCard from '../components/MediaCard.vue'
import { Game } from '@resources/game.ts'
import { Video } from '@resources/video.ts'
import { Audio } from '@resources/audio.ts'
import { Novel } from '@resources/novel.ts'
import { Manga } from '@resources/manga.ts'
import { SingleImage } from '@resources/singleImage.ts'
import { Software } from '@resources/soft.ts'
import { Website } from '@resources/website.ts'
import { VideoFolder } from '@resources/videoFolder.ts'
import {
  FormField,
  FormField_Text,
  FormField_Textarea,
  FormField_Number,
  FormField_Date,
  FormField_Select,
  FormField_Radio,
  FormField_Tags,
  FormField_SelectFile,
  FormField_SelectFolder
} from '@resources/base/FormField.ts'

export default defineComponent({
  name: 'DebugView',
  components: {
    MediaCard
  },
  setup() {
    // 创建 Game 实例
    const game = new Game()
    
    // 检查是否是 Electron 环境
    const isElectronEnvironment = computed(() => {
      return !!(window as any).electronAPI
    })
    
    // 创建各资源类型的示例
    const createExampleResources = () => {
      // 游戏示例
      const exampleGame = new Game()
      exampleGame.name.value = '示例游戏'
      exampleGame.description.value = '这是一个游戏示例，用于测试 MediaCard 组件的显示效果'
      exampleGame.developers.value = ['示例开发商']
      exampleGame.publisher.value = ['示例发行商']
      exampleGame.tags.value = ['动作', '冒险', 'RPG']
      exampleGame.engine.value = 'Unity'
      exampleGame.resourcePath.value = 'G:\\下载的数据\\telegram\\悲剧之森\\悲剧之森\\player.exe'
      exampleGame.coverPath.value = ''
      exampleGame.rating.value = 4.5
      exampleGame.isFavorite.value = true
      exampleGame.addedDate.value = new Date().toISOString()
      exampleGame.fileExists.value = false
      
      // 视频示例
      const exampleVideo = new Video()
      exampleVideo.name.value = '示例视频'
      exampleVideo.description.value = '这是一个视频示例'
      exampleVideo.series.value = '示例系列'
      exampleVideo.tags.value = ['电影', '动作']
      exampleVideo.actors.value = ['演员A', '演员B']
      exampleVideo.resourcePath.value = 'C:\\example\\video.mp4'
      exampleVideo.thumbnail.value = ''
      exampleVideo.rating.value = 4.0
      exampleVideo.addedDate.value = new Date().toISOString()
      exampleVideo.fileExists.value = false
      
      // 音频示例
      const exampleAudio = new Audio()
      exampleAudio.name.value = '示例音频'
      exampleAudio.description.value = '这是一个音频示例'
      exampleAudio.artist.value = '示例艺术家'
      exampleAudio.tags.value = ['流行', '电子']
      exampleAudio.actors.value = ['歌手A']
      exampleAudio.resourcePath.value = 'C:\\example\\audio.mp3'
      exampleAudio.coverPath.value = ''
      exampleAudio.rating.value = 4.2
      exampleAudio.addedDate.value = new Date().toISOString()
      exampleAudio.fileExists.value = false
      
      // 小说示例
      const exampleNovel = new Novel()
      exampleNovel.name.value = '示例小说'
      exampleNovel.description.value = '这是一本小说示例'
      exampleNovel.author.value = '示例作者'
      exampleNovel.genre.value = '科幻'
      exampleNovel.tags.value = ['科幻', '未来']
      exampleNovel.resourcePath.value = 'C:\\example\\novel.epub'
      exampleNovel.coverPath.value = ''
      exampleNovel.publishYear.value = '2024'
      exampleNovel.rating.value = 4.3
      exampleNovel.addedDate.value = new Date().toISOString()
      exampleNovel.fileExists.value = false
      
      // 漫画示例
      const exampleManga = new Manga()
      exampleManga.name.value = '示例漫画'
      exampleManga.description.value = '这是一个漫画示例'
      exampleManga.author.value = '示例漫画家'
      exampleManga.tags.value = ['冒险', '奇幻']
      exampleManga.resourcePath.value = 'C:\\example\\manga'
      exampleManga.coverPath.value = ''
      exampleManga.rating.value = 4.4
      exampleManga.addedDate.value = new Date().toISOString()
      exampleManga.fileExists.value = false
      
      // 单图片示例
      const exampleSingleImage = new SingleImage()
      exampleSingleImage.name.value = '示例图片'
      exampleSingleImage.description.value = '这是一张图片示例'
      exampleSingleImage.author.value = '示例摄影师'
      exampleSingleImage.tags.value = ['风景', '自然']
      exampleSingleImage.resourcePath.value = 'C:\\example\\image.jpg'
      exampleSingleImage.rating.value = 4.1
      exampleSingleImage.addedDate.value = new Date().toISOString()
      exampleSingleImage.fileExists.value = false
      
      // 软件示例
      const exampleSoftware = new Software()
      exampleSoftware.name.value = '示例软件'
      exampleSoftware.description.value = '这是一个软件示例'
      exampleSoftware.developer.value = '示例软件公司'
      exampleSoftware.tags.value = ['工具', '实用']
      exampleSoftware.resourcePath.value = 'C:\\example\\software.exe'
      exampleSoftware.coverPath.value = ''
      exampleSoftware.rating.value = 4.0
      exampleSoftware.addedDate.value = new Date().toISOString()
      exampleSoftware.fileExists.value = false
      
      // 网站示例
      const exampleWebsite = new Website()
      exampleWebsite.name.value = '示例网站'
      exampleWebsite.description.value = '这是一个网站收藏示例'
      exampleWebsite.resourcePath.value = 'https://example.com'
      exampleWebsite.tags.value = ['工具', '学习']
      exampleWebsite.rating.value = 4.5
      exampleWebsite.addedDate.value = new Date().toISOString()
      exampleWebsite.fileExists.value = true
      
      // 视频文件夹示例
      const exampleVideoFolder = new VideoFolder()
      exampleVideoFolder.name.value = '示例视频文件夹'
      exampleVideoFolder.description.value = '这是一个视频文件夹示例'
      exampleVideoFolder.series.value = '示例系列'
      exampleVideoFolder.tags.value = ['动画', '连续剧']
      exampleVideoFolder.actors.value = ['声优A', '声优B']
      exampleVideoFolder.voiceActors.value = ['声优C']
      exampleVideoFolder.productionTeam.value = ['制作组A']
      exampleVideoFolder.resourcePath.value = 'C:\\example\\videoFolder'
      exampleVideoFolder.thumbnail.value = ''
      exampleVideoFolder.rating.value = 4.6
      exampleVideoFolder.addedDate.value = new Date().toISOString()
      exampleVideoFolder.fileExists.value = false
      
      return [
        { item: exampleGame, type: 'game', typeLabel: '游戏 (Game)' },
        { item: exampleVideo, type: 'video', typeLabel: '视频 (Video)' },
        { item: exampleAudio, type: 'audio', typeLabel: '音频 (Audio)' },
        { item: exampleNovel, type: 'novel', typeLabel: '小说 (Novel)' },
        { item: exampleManga, type: 'image', typeLabel: '漫画 (Manga)' },
        { item: exampleSingleImage, type: 'image', typeLabel: '单图片 (SingleImage)' },
        { item: exampleSoftware, type: 'game', typeLabel: '软件 (Software)' },
        { item: exampleWebsite, type: 'image', typeLabel: '网站 (Website)' },
        { item: exampleVideoFolder, type: 'folder', typeLabel: '视频文件夹 (VideoFolder)' }
      ]
    }
    
    const exampleResources = reactive(createExampleResources())
    
    // 提取所有 FormField 类型的字段
    const formFields = computed(() => {
      const fields: Record<string, FormField> = {}
      for (const key in game) {
        const value = (game as any)[key]
        if (value instanceof FormField) {
          fields[key] = value
        }
      }
      return fields
    })
    
    // 初始化表单数据的函数
    const initFormData = () => {
      const data: Record<string, any> = {}
      for (const key in formFields.value) {
        const field = formFields.value[key]
        if (field instanceof FormField_Number) {
          data[key] = 0
        } else if (field instanceof FormField_Tags) {
          data[key] = []
        } else {
          data[key] = ''
        }
      }
      return data
    }
    
    const formData = reactive(initFormData())
    const formResult = reactive<Record<string, any> | null>(null)
    
    return {
      exampleResources,
      formFields,
      formData,
      formResult,
      FormField_Text,
      FormField_Textarea,
      FormField_Number,
      FormField_Date,
      FormField_Select,
      FormField_Radio,
      FormField_Tags,
      FormField_SelectFile,
      FormField_SelectFolder,
      initFormData,
      isElectronEnvironment
    }
  },
  methods: {
    testNotification() {
      notificationService.success('测试通知', '这是一条成功通知')
    },
    async testAlert() {
      await alertService.show({ title: '测试弹窗', message: '这是一个测试弹窗' })
    },
    async testConfirm() {
      const result = await confirmService.show({ title: '测试确认', message: '这是一个测试确认对话框' })
      console.log('确认结果:', result ? '确认' : '取消')
    },
    handleFormSubmit() {
      // 将表单数据转换为普通对象
      const result: Record<string, any> = {}
      for (const key in this.formData) {
        result[key] = this.formData[key]
      }
      this.formResult = result
      console.log('表单提交数据:', result)
      notificationService.success('表单提交成功', '表单数据已提交，请查看控制台和下方结果')
    },
    resetForm() {
      const initData = this.initFormData()
      for (const key in initData) {
        this.formData[key] = initData[key]
      }
      this.formResult = null
    },
    getRadioOptions(key: string, field: FormField): string[] {
      // 必须配置 options 属性（FormField_Radio）
      if ('options' in field && Array.isArray((field as any).options)) {
        return (field as any).options
      }
      // 如果没有配置，返回空数组
      console.warn(`字段 ${key} (${field.fieldName}) 没有配置选项列表`)
      return []
    },
    getSelectOptions(key: string, field: FormField): string[] {
      // 必须配置 options 属性（FormField_Select）
      if ('options' in field && Array.isArray((field as any).options)) {
        return (field as any).options
      }
      // 如果没有配置，返回空数组
      console.warn(`字段 ${key} (${field.fieldName}) 没有配置选项列表`)
      return []
    },
    async handleBrowseFile(key: string, field: FormField) {
      try {
        if (!this.isElectronEnvironment || !(window as any).electronAPI) {
          await alertService.show({ 
            title: '提示', 
            message: '当前环境不支持文件选择功能，请在 Electron 环境中使用' 
          })
          return
        }

        const electronAPI = (window as any).electronAPI

        // 获取过滤器数组（如果 field 是 FormField_SelectFile）
        const filters = ('filters' in field && Array.isArray((field as any).filters)) 
          ? (field as any).filters 
          : []

        // 使用统一的 API，直接传递过滤器数组
        if (!electronAPI.selectFileWithExtensions) {
          await alertService.show({ 
            title: '错误', 
            message: '当前环境不支持根据扩展名选择文件功能' 
          })
          return
        }

        const filePath = await electronAPI.selectFileWithExtensions(filters, null, `选择${field.fieldName}`)

        if (filePath) {
          // 如果配置了过滤器，验证文件扩展名（双重验证，确保符合要求）
          if (filters && filters.length > 0) {
            const fileExt = this.getFileExtension(filePath).toLowerCase()
            
            // 收集所有允许的扩展名（从所有过滤器中）
            const allAllowedExtensions: string[] = []
            let hasWildcard = false
            
            filters.forEach((filter: { name: string; extensions: string[] }) => {
              if (filter.extensions) {
                filter.extensions.forEach(ext => {
                  const normalized = ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase()
                  if (normalized === '*' || normalized === '其他') {
                    hasWildcard = true
                  } else {
                    allAllowedExtensions.push(normalized)
                  }
                })
              }
            })
            
            // 检查扩展名是否在允许列表中（支持 '其他' 和 '*' 作为通配符）
            if (!hasWildcard && !allAllowedExtensions.includes(fileExt)) {
              await alertService.show({ 
                title: '文件类型错误', 
                message: `文件扩展名 .${fileExt} 不在允许的列表中。允许的扩展名: ${allAllowedExtensions.map(e => `.${e}`).join(', ')}` 
              })
              return
            }
          }

          this.formData[key] = filePath
          console.log(`已选择文件 (${key}):`, filePath)
          if (filters && filters.length > 0) {
            console.log(`过滤器配置:`, filters)
          }
        }
      } catch (error: any) {
        console.error('选择文件失败:', error)
        await alertService.show({ 
          title: '错误', 
          message: `选择文件失败: ${error.message || '未知错误'}` 
        })
      }
    },
    getFileExtension(filePath: string): string {
      const lastDot = filePath.lastIndexOf('.')
      if (lastDot === -1 || lastDot === filePath.length - 1) {
        return ''
      }
      return filePath.substring(lastDot + 1)
    },
    async handleBrowseFolder(key: string) {
      try {
        if (!this.isElectronEnvironment || !(window as any).electronAPI) {
          await alertService.show({ 
            title: '提示', 
            message: '当前环境不支持文件夹选择功能，请在 Electron 环境中使用' 
          })
          return
        }

        const electronAPI = (window as any).electronAPI
        if (!electronAPI.selectFolder) {
          await alertService.show({ 
            title: '错误', 
            message: '当前环境不支持文件夹选择功能' 
          })
          return
        }
        
        const result = await electronAPI.selectFolder()
        if (result && result.success && result.path) {
          this.formData[key] = result.path
          console.log(`已选择文件夹 (${key}):`, result.path)
        } else if (result && !result.success) {
          await alertService.show({ 
            title: '错误', 
            message: result.error || '未选择文件夹' 
          })
        }
      } catch (error: any) {
        console.error('选择文件夹失败:', error)
        await alertService.show({ 
          title: '错误', 
          message: `选择文件夹失败: ${error.message || '未知错误'}` 
        })
      }
    },
    isImageFile(filePath: string): boolean {
      if (!filePath) return false
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
      const fileExt = this.getFileExtension(filePath).toLowerCase()
      return imageExtensions.includes(fileExt) || imageExtensions.includes(`.${fileExt}`)
    },
    getImageUrl(filePath: string): string {
      if (!filePath) return ''
      // 如果是 HTTP/HTTPS URL，直接返回
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath
      }
      // 如果是 data URL，直接返回
      if (filePath.startsWith('data:')) {
        return filePath
      }
      // 对于本地文件路径，转换为 file:// URL
      const normalizedPath = filePath.replace(/\\/g, '/')
      return `file:///${normalizedPath}`
    },
    handleImageError(event: Event) {
      console.warn('图片加载失败:', event)
      // 可以在这里添加错误处理逻辑
    }
  }
})
</script>

<style scoped>
.debug-view {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
}

.debug-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-3xl);
}

.debug-header {
  margin-bottom: var(--spacing-3xl);
  text-align: center;
}

.debug-header h2 {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.debug-header p {
  color: var(--text-secondary);
  font-size: 1rem;
  margin: 0;
}

.debug-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
  border: 1px solid var(--border-color);
}

.debug-section h3 {
  font-size: 1.3rem;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xl) 0;
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--border-color);
}

.test-actions {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.btn {
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
  border-color: var(--accent-color);
}

.form-test {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-input,
.form-textarea,
.form-select {
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all var(--transition-base);
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.form-checkbox-group,
.form-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-checkbox-label,
.form-radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-weight: normal;
}

.form-checkbox,
.form-radio {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent-color);
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.form-result {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.form-result h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.form-result pre {
  margin: 0;
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.file-input-group {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
  flex-wrap: wrap;
}

.file-input-group .form-input {
  flex: 1;
  min-width: 200px;
}

.btn-browse {
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.btn-browse:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-browse:disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.image-preview {
  width: 100%;
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: var(--radius-sm);
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-2xl);
  margin-top: var(--spacing-xl);
}

.resource-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.resource-type-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  text-align: center;
}

</style>
