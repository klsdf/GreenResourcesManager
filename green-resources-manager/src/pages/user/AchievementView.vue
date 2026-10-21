<template>
  <div class="achievement-view">
    <div class="achievement-content">
      <div class="achievement-header">
        <!-- <div class="test-buttons">
          <button @click="resetAchievementStates" class="test-button reset-button">
            重置成就状态
          </button>
        </div> -->
      </div>
      
      <div class="achievement-body">
        <!-- 成就统计 -->
        <div class="achievement-stats">
          <div class="stat-item">
            <div class="stat-number">{{ unlockedAchievements }}</div>
            <div class="stat-label">{{ $lt('已解锁') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ totalAchievements }}</div>
            <div class="stat-label">{{ $lt('总成就') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ achievementProgress }}%</div>
            <div class="stat-label">{{ $lt('完成度') }}</div>
          </div>
        </div>

        <!-- 成就列表 -->
        <div class="achievement-list">
          <fun-achievement-item
            v-for="achievement in allAchievements"
            :key="achievement.id"
            :achievement="achievement"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../../utils/SaveManager.ts'
import  notify  from '../../utils/NotificationService.ts'

const ACHIEVEMENT_SOUND_PATH = '/achievement.mp3'


type AchievementKind = 'progress' | 'trigger'

class BaseAchievementType
{
  kind: AchievementKind
  constructor(kind: AchievementKind)
  {
    this.kind = kind
  }
}


class ProgressAchievementType extends BaseAchievementType
{
  target: number 
  constructor(target: number) 
  {
    super('progress')
    this.target = target
  }
}


class TriggerAchievementType extends BaseAchievementType
{
  constructor()
  {
    super('trigger')
  }
}

export class Achievement {
  id: string
  title: string
  description: string
  target: number | null
  group: string
  type: BaseAchievementType
  kind: AchievementKind
  current: number | null
  unlocked: boolean

  /**
   * 是否隐藏
   * 如果隐藏，则显示？？？作为标题，描述部分则显示提示
   */
  isHidden: boolean

  /**
   * 隐藏提示
   * 如果隐藏，则显示提示
   */
  hiddenTip: string

  constructor(
    {
    id,
    title,
    description,
    group,
    type,
    isHidden = false,
    hiddenTip = ''
  }: AchievementOptions) {
    this.id = id
    this.title = title
    this.description = description
    this.group = group
    this.type = type
    this.kind = type.kind
    this.target = type instanceof ProgressAchievementType ? type.target : null
    this.current = type instanceof ProgressAchievementType ? 0 : null
    this.unlocked = false
    this.isHidden = isHidden
    this.hiddenTip = hiddenTip
  }
}

interface AchievementOptions {
  id: string
  title: string
  description: string
  group: string
  type: BaseAchievementType

  isHidden?: boolean
  hiddenTip?: string
}


const allAchievementDefinitions: Achievement[] = [
  // 图片收藏成就
  new Achievement({
    id: 'image_collector_50',
    title: '图片新手',
    description: '收藏50张图片',
    group: 'imageCollector',
    type: new ProgressAchievementType(50)

  }),
  new Achievement({
    id: 'image_collector_100',
    title: '图片爱好者',
    description: '收藏100张图片',
    group: 'imageCollector',
    type: new ProgressAchievementType(100)
  }),
  new Achievement({
    id: 'image_collector_500',
    title: '图片收藏家',
    description: '收藏500张图片',
    group: 'imageCollector',
    type: new ProgressAchievementType(500)
  }),
  new Achievement({
    id: 'image_collector_1000',
    title: '图片大师',
    description: '收藏1000张图片',
    group: 'imageCollector',
    type: new ProgressAchievementType(1000)
  }),

  // 游戏收藏成就
  new Achievement({
    id: 'game_collector_50',
    title: '游戏新手',
    description: '收藏50个游戏',
    group: 'gameCollector',
    type: new ProgressAchievementType(50)
  }),
  new Achievement({
    id: 'game_collector_100',
    title: '游戏爱好者',
    description: '收藏100个游戏',
    group: 'gameCollector',
    type: new ProgressAchievementType(100)
  }),
  new Achievement({
    id: 'game_collector_500',
    title: '游戏收藏家',
    description: '收藏500个游戏',
    group: 'gameCollector',
    type: new ProgressAchievementType(500)
  }),
  new Achievement({
    id: 'game_collector_1000',
    title: '游戏大师',
    description: '收藏1000个游戏',
    group: 'gameCollector',
    type: new ProgressAchievementType(1000)
  }),

  // 视频收藏成就
  new Achievement({
    id: 'video_collector_50',
    title: '视频新手',
    description: '收藏50个视频',
    group: 'videoCollector',
    type: new ProgressAchievementType(50)
  }),
  new Achievement({
    id: 'video_collector_100',
    title: '视频爱好者',
    description: '收藏100个视频',
    group: 'videoCollector',
    type: new ProgressAchievementType(100)
  }),
  new Achievement({
    id: 'video_collector_500',
    title: '视频收藏家',
    description: '收藏500个视频',
    group: 'videoCollector',
    type: new ProgressAchievementType(500)
  }),
  new Achievement({
    id: 'video_collector_1000',
    title: '视频大师',
    description: '收藏1000个视频',
    group: 'videoCollector',
    type: new ProgressAchievementType(1000)
  }),

  // 游戏时长成就
  new Achievement({
    id: 'game_time_1',
    title: '游戏新手',
    description: '游戏时长达到1小时',
    group: 'gameTime',
    type: new ProgressAchievementType(1)
  }),
  new Achievement({
    id: 'game_time_10',
    title: '游戏爱好者',
    description: '游戏时长达到10小时',
    group: 'gameTime',
    type: new ProgressAchievementType(10)
  }),
  new Achievement({
    id: 'game_time_20',
    title: '游戏玩家',
    description: '游戏时长达到20小时',
    group: 'gameTime',
    type: new ProgressAchievementType(20)
  }),
  new Achievement({
    id: 'game_time_50',
    title: '游戏达人',
    description: '游戏时长达到50小时',
    group: 'gameTime',
    type: new ProgressAchievementType(50)
  }),
  new Achievement({
    id: 'game_time_100',
    title: '游戏专家',
    description: '游戏时长达到100小时',
    group: 'gameTime',
    type: new ProgressAchievementType(100)
  }),
  new Achievement({
    id: 'game_time_500',
    title: '游戏大师',
    description: '游戏时长达到500小时',
    group: 'gameTime',
    type: new ProgressAchievementType(500)
  }),
  new Achievement({
    id: 'game_time_1000',
    title: '游戏传奇',
    description: '游戏时长达到1000小时',
    group: 'gameTime',
    type: new ProgressAchievementType(1000)
  }),


  new Achievement({
    id: 'first_login',
    title: '值得纪念的一天',
    description: '首次使用本软件，值得纪念！',
    group: 'firstLogin',
    type: new TriggerAchievementType()
  }),


  new Achievement({
    id: 'serect_click',
    title: '没有人不喜欢美少女吧？',
    description: '点击一次logo，显示美少女的隐藏logo',
    group: 'serectClick',
    type: new TriggerAchievementType(),
    isHidden: true,
    hiddenTip: '也许点击哪里之后可以解锁？'
  }),

  new Achievement({
    id: 'nocturne',
    title: '夜曲',
    description: '在半夜1点之后播放音乐',
    group: 'nocturne',
    type: new TriggerAchievementType(),
    isHidden: true,
    hiddenTip: '唯歌声与月夜相伴...'
  }),

  new Achievement({
    id: 'flash_game_collector',
    title: '老资历',
    description: '添加了一个Flash游戏',
    group: 'flashGameCollector',
    type: new TriggerAchievementType(),
    isHidden: true,
    hiddenTip: '游戏界曾经的辉煌'
  }),

]

const achievementDefinitionMap = new Map(
  allAchievementDefinitions.map(achievement => [achievement.id, achievement])
)

function playAchievementSoundEffect() {
  try {
    const audio = new Audio(ACHIEVEMENT_SOUND_PATH)
    audio.volume = 1
    audio.play().catch(error => {
      console.warn('播放成就音效失败:', error)
    })
  } catch (error) {
    console.warn('创建音频对象失败:', error)
  }
}


/*
**给外部使用的解锁逻辑
***/
export async function unlockAchievement(achievementId) {
  try {
    const definition = achievementDefinitionMap.get(achievementId)

    if (!definition) {
      console.warn('未找到对应的成就定义:', achievementId)
      return { success: false, reason: 'UNKNOWN_ACHIEVEMENT' }
    }

    const achievementStates = await saveManager.loadAchievementStates()

    if (!achievementStates.unlockedAchievements) {
      achievementStates.unlockedAchievements = new Map()
    }

    const alreadyUnlocked = achievementStates.unlockedAchievements.get(achievementId)

    if (alreadyUnlocked) {
      return {
        success: true,
        alreadyUnlocked: true,
        achievement: definition
      }
    }

    achievementStates.unlockedAchievements.set(achievementId, true)
    achievementStates.lastCheckTime = new Date().toISOString()

    const saveSuccess = await saveManager.saveAchievementStates(achievementStates)

    if (!saveSuccess) {
      return { success: false, reason: 'SAVE_FAILED', achievement: definition }
    }

    playAchievementSoundEffect()
    notify.achievement({
      id: definition.id,
      title: definition.title,
      description: definition.description
    })

    return {
      success: true,
      alreadyUnlocked: false,
      achievement: definition
    }
  } catch (error) {
    console.error('主动解锁成就失败:', error)
    return {
      success: false,
      reason: 'UNEXPECTED_ERROR',
      error
    }
  }
}

export default {
  name: 'AchievementView',
  data() {
    return {
      isLoading: true,
      imageCount: 0,
      gameCount: 0,
      videoCount: 0,
      totalGameTime: 0, // 总游戏时长（秒）
      savedAchievementStates: new Map(), // 存储已保存的成就状态，用于检测新解锁的成就
      achievementStates: allAchievementDefinitions
    }
  },
  computed: {
    allAchievements() {
      return this.achievementStates
    },
    unlockedAchievements(): number {
      return this.allAchievements.filter(a => a.unlocked).length
    },
    totalAchievements() {
      return this.allAchievements.length
    },
    achievementProgress() {
      if (this.totalAchievements === 0) return 0
      return Math.round((this.unlockedAchievements / this.totalAchievements) * 100)
    }
  },
  methods: {
    async loadAchievementData() {
      try {
        this.isLoading = true
        console.log('开始加载成就数据...')
        
        const api = (window as any).electronAPI
        const [imgRes, gamesRes, vidRes, animeRes, achievementStates] = await Promise.all([
          api?.sqliteGetPageData?.('images') ?? Promise.resolve({ ok: false }),
          api?.sqliteGetPageData?.('games') ?? Promise.resolve({ ok: false }),
          api?.sqliteGetPageData?.('videos') ?? Promise.resolve({ ok: false }),
          api?.sqliteGetPageData?.('anime-series') ?? Promise.resolve({ ok: false }),
          saveManager.loadAchievementStates()
        ])
        const images = (imgRes as any)?.ok ? ((imgRes as any).data ?? []) : []
        const games = (gamesRes as any)?.ok ? ((gamesRes as any).data ?? []) : []
        const videos = [
          ...((vidRes as any)?.ok ? ((vidRes as any).data ?? []) : []),
          ...((animeRes as any)?.ok ? ((animeRes as any).data ?? []) : [])
        ]
        
        // 加载已保存的成就状态
        this.savedAchievementStates = achievementStates.unlockedAchievements || new Map()
        console.log('已加载成就状态:', this.savedAchievementStates.size, '个成就')
        
        this.imageCount = images.length
        this.gameCount = games.length
        this.videoCount = videos.length
        
        // 计算总游戏时长
        this.totalGameTime = this.calculateTotalGameTime(games)
        
        // 更新所有成就
        this.updateAchievementProgress()
        
        // 检测新解锁的成就并发送通知
        this.checkNewlyUnlockedAchievements()
        
        console.log('成就数据加载完成:', {
          图片数量: this.imageCount,
          游戏数量: this.gameCount,
          视频数量: this.videoCount,
          总游戏时长: Math.floor(this.totalGameTime / 3600) + '小时',
          已解锁成就: this.unlockedAchievements
        })
        
      } catch (error) {
        console.error('加载成就数据失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    calculateTotalGameTime(games) {
      let totalSeconds = 0
      games.forEach(game => {
        if (game.playTime) {
          totalSeconds += game.playTime
        }
      })
      return totalSeconds
    },
    updateAchievementProgress() {
      const totalHours = Math.floor(this.totalGameTime / 3600) // 转换为小时
      const currentValuesByGroup = {
        imageCollector: this.imageCount,
        gameCollector: this.gameCount,
        videoCollector: this.videoCount,
        gameTime: totalHours
      }

      this.achievementStates.forEach(achievement => {
        const savedState = this.savedAchievementStates.get(achievement.id)
        const isSavedUnlocked = savedState === true
        
        if (achievement.kind === 'progress') {
          achievement.current = currentValuesByGroup[achievement.group] ?? 0
          const target = achievement.target ?? 0
          achievement.unlocked = isSavedUnlocked || achievement.current >= target
        } else {
          achievement.current = null
          achievement.unlocked = isSavedUnlocked
        }
      })
    },
    async refreshAchievements() {
      await this.loadAchievementData()
    },
    
    // 播放成就解锁音效
    playAchievementSound() {
      playAchievementSoundEffect()
    },
    // 检测新解锁的成就
    async checkNewlyUnlockedAchievements() {
      const newlyUnlocked = []
      const currentAchievementStates = new Map()
      
      this.allAchievements.forEach(achievement => {
        const savedState = this.savedAchievementStates.get(achievement.id)
        
        // 如果之前未解锁，现在解锁了，则认为是新解锁的成就
        if (!savedState && achievement.unlocked) {
          newlyUnlocked.push(achievement)
        }
        
        // 记录当前成就状态
        currentAchievementStates.set(achievement.id, achievement.unlocked)
      })
      
      // 发送成就解锁通知 - 一个一个弹出
      if (newlyUnlocked.length > 0) {
        console.log('检测到新解锁的成就:', newlyUnlocked.map(a => a.title))
        
        // 每个成就单独弹出通知，添加延迟避免重叠
        newlyUnlocked.forEach((achievement, index) => {
          setTimeout(() => {
            // 播放成就解锁音效
            this.playAchievementSound()
            notify.achievement(achievement)
          }, index * 1000) // 每个成就间隔1秒弹出
        })
        
        // 保存新的成就状态到文件
        await saveManager.updateAchievementStates(currentAchievementStates)
        console.log('成就状态已保存到文件')
      } else {
        // 即使没有新解锁的成就，也要更新保存的状态（以防数据不同步）
        await saveManager.updateAchievementStates(currentAchievementStates)
      }
    },
    
    // 重置成就状态（用于测试）
    async resetAchievementStates() {
      try {
        // 清空保存的成就状态
        this.savedAchievementStates.clear()
        
        // 重置文件中的成就状态
        const emptyStates = new Map()
        await saveManager.updateAchievementStates(emptyStates)
        
        console.log('成就状态已重置')
        notify.success('成就状态已重置', '下次进入成就页面时会重新检测解锁的成就')
        
        // 重新加载成就数据以触发通知
        await this.loadAchievementData()
      } catch (error) {
        console.error('重置成就状态失败:', error)
        notify.error('重置失败', '无法重置成就状态')
      }
    }
  },
  async mounted() {
    console.log('成就页面已加载')
    await this.loadAchievementData()
  }
}
</script>

<style scoped>
.achievement-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.achievement-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}



.test-buttons {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.test-button {
  padding: 8px 16px;
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-button:hover {
  background: var(--accent-color-dark, #0056b3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.test-button.reset-button {
  background: #dc3545;
}

.test-button.reset-button:hover {
  background: #c82333;
}

.achievement-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 成就统计样式 */
.achievement-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 成就列表样式 */
.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

</style>
