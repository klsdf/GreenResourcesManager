/**
 * 视频管理 Composable
 * 负责视频的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import VideoManager from '../../utils/VideoManager'
import notify from '../../utils/NotificationService'
import type { Video } from '../../types/video'

const VIDEO_COLLECTION_ACHIEVEMENTS = [
  { threshold: 50, id: 'video_collector_50' },
  { threshold: 100, id: 'video_collector_100' },
  { threshold: 500, id: 'video_collector_500' },
  { threshold: 1000, id: 'video_collector_1000' }
]

export function useVideoManagement(pageId: string = 'videos') {
  const videos = ref<Video[]>([])
  const videoManager = ref<VideoManager | null>(null)
  const isLoading = ref(false)
  const isUpdatingDurations = ref(false)

  /**
   * 初始化视频管理器
   */
  const initVideoManager = () => {
    if (!videoManager.value) {
      videoManager.value = new VideoManager(pageId)
    }
    return videoManager.value
  }

  /**
   * 加载所有视频
   */
  const loadVideos = async () => {
    try {
      isLoading.value = true
      const manager = initVideoManager()
      await manager.loadVideos()
      videos.value = manager.getVideos()
    } catch (error) {
      console.error('加载视频失败:', error)
      notify.toast('error', '加载失败', '无法加载视频列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有视频
   */
  const saveVideos = async (): Promise<void> => {
    try {
      const manager = initVideoManager()
      if (manager) {
        await manager.saveVideos()
      }
    } catch (error) {
      console.error('保存视频失败:', error)
      throw error
    }
  }

  /**
   * 添加视频
   */
  const addVideo = async (videoData: Partial<Video>): Promise<Video | null> => {
    try {
      const manager = initVideoManager()
      if (!manager) {
        throw new Error('视频管理器未初始化')
      }
      
      // VideoManager.addVideo 接受任意对象并返回 Video
      const newVideo = await (manager as any).addVideo(videoData)
      if (newVideo) {
        await loadVideos()
        return newVideo
      }
      return null
    } catch (error) {
      console.error('添加视频失败:', error)
      throw error
    }
  }

  /**
   * 更新视频
   */
  const updateVideo = async (id: string, videoData: Partial<Video>): Promise<void> => {
    try {
      const manager = initVideoManager()
      if (!manager) {
        throw new Error('视频管理器未初始化')
      }
      
      await manager.updateVideo(id, videoData)
      await loadVideos()
    } catch (error) {
      console.error('更新视频失败:', error)
      throw error
    }
  }

  /**
   * 删除视频
   */
  const deleteVideo = async (id: string): Promise<void> => {
    try {
      const manager = initVideoManager()
      if (!manager) {
        throw new Error('视频管理器未初始化')
      }
      
      await manager.deleteVideo(id)
      await loadVideos()
    } catch (error) {
      console.error('删除视频失败:', error)
      throw error
    }
  }

  /**
   * 增加观看次数
   */
  const incrementWatchCount = async (id: string): Promise<void> => {
    try {
      const manager = initVideoManager()
      if (!manager) {
        throw new Error('视频管理器未初始化')
      }
      
      await manager.incrementWatchCount(id)
      await loadVideos()
    } catch (error) {
      console.error('增加观看次数失败:', error)
      throw error
    }
  }

  /**
   * 检查视频文件存在性
   */
  const checkFileExistence = async (): Promise<void> => {
    console.log('🔍 开始检测视频文件存在性...')
    
    if (!window.electronAPI || !window.electronAPI.checkFileExists) {
      console.log('⚠️ Electron API 不可用，跳过文件存在性检测')
      videos.value.forEach(video => {
        video.fileExists = true
      })
      return
    }
    
    let checkedCount = 0
    let missingCount = 0
    const missingFiles: Array<{ name: string; path: string }> = []
    
    for (const video of videos.value) {
      if (!video.filePath) {
        video.fileExists = false
        missingCount++
        missingFiles.push({
          name: video.name,
          path: '未设置路径'
        })
        continue
      }
      
      try {
        const result = await window.electronAPI.checkFileExists(video.filePath)
        video.fileExists = result.exists       
        if (!result.exists) {
          missingCount++
          missingFiles.push({
            name: video.name,
            path: video.filePath
          })
          console.log(`❌ 视频文件不存在: ${video.name} - ${video.filePath}`)
        } 
      } catch (error) {
        console.error(`❌ 检测视频文件存在性失败: ${video.name}`, error)
        video.fileExists = false
        missingCount++
        missingFiles.push({
          name: video.name,
          path: video.filePath || '路径检测失败'
        })
      }
      
      checkedCount++
    }
    
    console.log(`📊 文件存在性检测完成: 检查了 ${checkedCount} 个视频，${missingCount} 个文件不存在`)
    
    // 如果有丢失的文件，显示提醒
    if (missingCount > 0) {
      const fileList = missingFiles.map(file => 
        `• ${file.name}${file.path !== '未设置路径' && file.path !== '路径检测失败' ? ` (${file.path})` : ''}`
      ).join('\n')
      
      notify.toast(
        'warning',
        '文件丢失提醒', 
        `发现 ${missingFiles.length} 个视频文件丢失：\n${fileList}\n\n请检查文件路径或重新添加这些视频。`
      )
    }
  }

  /**
   * 检查视频收藏成就
   */
  const checkVideoCollectionAchievements = async () => {
    if (!Array.isArray(videos.value)) return

    const totalVideos = videos.value.length
    const unlockPromises = VIDEO_COLLECTION_ACHIEVEMENTS
      .filter(config => totalVideos >= config.threshold)
      .map(config => {
        // 动态导入避免循环依赖
        return import('../../pages/user/AchievementView.vue').then(module => 
          module.unlockAchievement(config.id)
        )
      })

    if (unlockPromises.length === 0) return

    try {
      await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('触发视频收藏成就时出错:', error)
    }
  }

  /**
   * 获取视频管理器实例
   */
  const getVideoManager = (): VideoManager | null => {
    return videoManager.value
  }

  /**
   * Imports new videos from a selected directory.
   */
  const importFromDirectory = async (): Promise<void> => {
    try {
      // 1. Let user select a folder
      // @ts-ignore
      const result = await window.electronAPI.selectFolder();
      if (!result || !result.success || !result.path) {
        console.log('Folder selection cancelled.');
        return;
      }
      const directoryPath = result.path;

      // 2. Scan for new video files
      const manager = initVideoManager();
      if (!manager) {
        throw new Error('Video manager is not initialized.');
      }
      notify.toast('info', '正在扫描文件夹...', `正在扫描 ${directoryPath}`);
      const newFiles = await manager.scanDirectoryForNewVideos(directoryPath);

      // 3. Check results and provide feedback
      if (newFiles.length === 0) {
        notify.toast('info', '扫描完成', '没有发现新的视频或图片文件。');
        return;
      }

      notify.toast('info', '正在导入...', `发现 ${newFiles.length} 个新文件，正在添加到媒体库...`);

      // 4. Batch add new videos
      const addedCount = await manager.addVideosInBatch(newFiles);

      // 5. Reload and provide final feedback
      await loadVideos();
      notify.toast('success', '导入完成', `成功添加 ${addedCount} 个新视频到媒体库。`);

    } catch (error) {
      console.error('Failed to import from directory:', error);
      notify.toast('error', '导入失败', `发生错误: ${error.message}`);
    }
  };

  return {
    videos,
    videoManager,
    isLoading,
    isUpdatingDurations,
    loadVideos,
    saveVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    incrementWatchCount,
    checkFileExistence,
    checkVideoCollectionAchievements,
    getVideoManager,
    initVideoManager,
    importFromDirectory
  }
}

