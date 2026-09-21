/**
 * 音频播放 Composable
 * 负责音频播放、添加到播放列表、打开文件夹等播放相关操作
 */
import { type Ref } from 'vue'
import notify from '../../utils/NotificationService'
import type { Audio } from '../../types/audio'

export interface AudioPlaybackOptions {
  /**
   * 音频列表的响应式引用（用于更新播放次数）
   */
  audios: Ref<Audio[]> | Audio[]
  
  /**
   * 增加播放次数的回调函数
   */
  onIncrementPlayCount: (audioId: string) => Promise<Audio | null>
}

/**
 * 音频播放 Composable
 */
export function useAudioPlayback(options: AudioPlaybackOptions) {
  const { audios, onIncrementPlayCount } = options

  /**
   * 播放音频
   * @param audio - 要播放的音频对象
   */
  const playAudio = async (audio: Audio): Promise<void> => {
    try {
      // 增加播放次数并获取更新后的音频对象
      const updatedAudio = await onIncrementPlayCount(audio.id)
      
      // 更新本地数据
      const audiosArray = Array.isArray(audios) ? audios : audios.value
      const index = audiosArray.findIndex(a => a.id === audio.id)
      if (index !== -1 && updatedAudio) {
        if (Array.isArray(audios)) {
          audios[index] = updatedAudio
        } else {
          audios.value[index] = updatedAudio
        }
      }
      
      // 使用全局音频播放器播放
      console.log('🎵 通过全局播放器播放音频:', audio.name)
      window.dispatchEvent(new CustomEvent('global-play-audio', { detail: audio }))
      
      // notify.native('开始播放', `正在播放: ${audio.name}`)
      
    } catch (error: any) {
      console.error('播放音频失败:', error)
      notify.toast('error', '播放失败', '播放音频失败: ' + error.message)
    }
  }

  /**
   * 添加音频到播放列表
   * @param audio - 要添加的音频对象
   */
  const addToPlaylist = (audio: Audio): void => {
    console.log('➕ 添加音频到播放列表:', audio.name)
    window.dispatchEvent(new CustomEvent('global-add-to-playlist', { detail: audio }))
    notify.native('已添加', `已将 "${audio.name}" 添加到播放列表`)
  }

  /**
   * 打开音频文件所在的文件夹
   * @param audio - 音频对象
   */
  const openAudioFolder = async (audio: Audio): Promise<void> => {
    try {
      if (!audio.filePath) {
        notify.toast('error', '打开失败', '音频文件路径不存在')
        return
      }
      
      if (window.electronAPI && window.electronAPI.openFileFolder) {
        const result = await window.electronAPI.openFileFolder(audio.filePath)
        if (result.success) {
          console.log('已打开音频文件夹:', result.folderPath)
          notify.toast('success', '文件夹已打开', `已打开音频文件夹: ${result.folderPath}`)
        } else {
          console.error('打开文件夹失败:', result.error)
          notify.toast('error', '打开失败', `打开文件夹失败: ${result.error}`)
        }
      } else {
        // 降级处理：在浏览器中显示路径
        notify.toast('info', '文件位置', `音频文件位置:\n${audio.filePath}`)
      }
    } catch (error: any) {
      console.error('打开音频文件夹失败:', error)
      notify.toast('error', '打开失败', `打开文件夹失败: ${error.message}`)
    }
  }

  return {
    playAudio,
    addToPlaylist,
    openAudioFolder
  }
}

