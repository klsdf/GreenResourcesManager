<template>
  <div class="statistics-view">
    <div class="statistics-content">

      
      <div class="statistics-body">
        <!-- 时间统计 -->
        <div class="statistics-section">
          <h5>{{ $lt('⏰ 时间统计') }}</h5>
          <div class="time-statistics-grid">
            <div class="time-statistics-card">
              <div class="time-statistics-icon">📅</div>
              <div class="time-statistics-content">
                <div class="time-statistics-label">{{ $lt('第一次使用时间') }}</div>
                <div class="time-statistics-value">{{ formatJoinDate }}</div>
              </div>
            </div>
            <div class="time-statistics-card">
              <div class="time-statistics-icon">🕒</div>
              <div class="time-statistics-content">
                <div class="time-statistics-label">{{ $lt('本次登录时间') }}</div>
                <div class="time-statistics-value">{{ formatCurrentLogin }}</div>
              </div>
            </div>
            <div class="time-statistics-card">
              <div class="time-statistics-icon">🕐</div>
              <div class="time-statistics-content">
                <div class="time-statistics-label">{{ $lt('上一次登录时间') }}</div>
                <div class="time-statistics-value">{{ formatLastActive }}</div>
              </div>
            </div>
            <div class="time-statistics-card">
              <div class="time-statistics-icon">⏱️</div>
              <div class="time-statistics-content">
                <div class="time-statistics-label">{{ $lt('总使用时长') }}</div>
                <div class="time-statistics-value">{{ formatTotalUsageTimeWithSession }}</div>
              </div>
            </div>
            <div class="time-statistics-card">
              <div class="time-statistics-icon">🕐</div>
              <div class="time-statistics-content">
                <div class="time-statistics-label">{{ $lt('本次会话时长') }}</div>
                <div class="time-statistics-value">{{ formatCurrentSessionTime }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 登录日历 -->
        <div class="statistics-section">
          <h5>{{ $lt('📅 登录日历') }}</h5>
          <div class="calendar-container">
            <div class="calendar-header">
              <button @click="previousMonth" class="calendar-nav-btn">‹</button>
              <h6 class="calendar-title">{{ currentMonthYear }}</h6>
              <button @click="nextMonth" class="calendar-nav-btn">›</button>
            </div>
            <div class="calendar-grid">
              <div class="calendar-weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
              <div 
                v-for="day in calendarDays" 
                :key="day.key"
                :class="['calendar-day', { 
                  'other-month': !day.isCurrentMonth,
                  'today': day.isToday,
                  'checked': day.isChecked,
                  'current-month': day.isCurrentMonth
                }]"
              >
                <span class="day-number">{{ day.day }}</span>
                <span v-if="day.isChecked" class="check-mark">✓</span>
              </div>
            </div>
            <div class="calendar-stats">
              <div class="stat-item">
                <span class="stat-number">{{ totalCheckDays }}</span>
                <span class="stat-label">{{ $lt('总登录天数') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ currentMonthCheckDays }}</span>
                <span class="stat-label">{{ $lt('本月登录') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ currentStreak }}</span>
                <span class="stat-label">{{ $lt('连续登录') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 媒体数量总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('📈 媒体数量总览') }}</h5>
          <div class="stats-grid">
            <div class="stat-card" :class="{ loading: isLoading }" v-for="stat in mediaStats" :key="stat.type">
              <fun-statistic
                :value="stat.count"
                :label="stat.label"
                :icon="stat.icon"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 游戏数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('🎮 游戏数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="gameStats.count"
                :label="$lt('游戏总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="gameStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="gameStats.totalTime"
                :label="$lt('总游戏时长')"
                icon="⏱️"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="gameStats.playedCount"
                :label="$lt('已启动游戏')"
                icon="🎯"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 图片数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('🖼️ 图片数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="imageStats.count"
                :label="$lt('图片总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="imageStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 视频数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('🎬 视频数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="videoStats.count"
                :label="$lt('视频总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="videoStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 小说数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('📚 小说数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="novelStats.count"
                :label="$lt('小说总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="novelStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 网站数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('🌐 网站数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="websiteStats.count"
                :label="$lt('网站总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="websiteStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 音频数据总览 -->
        <div class="statistics-section">
          <h5>{{ $lt('🎵 音频数据总览') }}</h5>
          <div class="media-overview-grid">
            <div class="media-overview-card">
              <fun-statistic
                :value="audioStats.count"
                :label="$lt('音频总数')"
                icon="📊"
                :loading="isLoading"
              />
            </div>
            <div class="media-overview-card">
              <fun-statistic
                :value="audioStats.storage"
                :label="$lt('空间占用')"
                icon="💾"
                :loading="isLoading"
              />
            </div>
          </div>
        </div>

        <!-- 月度报告 -->
        <div class="statistics-section">
          <h5>{{ $lt('📅 月度报告') }}</h5>
          <div class="report-container">
            <div class="report-header">
              <div class="report-title">
                <h6>{{ currentMonthReport.title }}</h6>
                <p>{{ currentMonthReport.subtitle }}</p>
              </div>
              <div class="report-actions">
                <button @click="refreshMonthlyReport" class="refresh-btn" :disabled="isLoadingReport">
                  <span class="btn-icon">🔄</span>
                  <span>{{ $lt('刷新') }}</span>
                </button>
              </div>
            </div>
            
            <div class="report-content">
              <!-- 使用概览 -->
              <div class="report-section">
                <h7>{{ $lt('📊 使用概览') }}</h7>
                <div class="overview-grid">
                  <div class="overview-item">
                    <div class="overview-number">{{ currentMonthReport.overview.newMediaCount }}</div>
                    <div class="overview-label">{{ $lt('新增媒体') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../../utils/SaveManager.ts'

export default {
  name: 'StatisticsView',
  data() {
    return {
      userProfile: {
        name: '',
        joinDate: null,
        loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
        checkInDays: [], // 登录日期数组，格式：['2024-01-15', '2024-01-16']
        totalUsageTime: 0 // 总使用时长（秒）
      },
      currentDate: new Date(),
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      currentSessionTime: 0, // 当前会话使用时长（秒）
      usageTimer: null, // 定时器引用
      mediaStats: [
        { type: 'games', label: '游戏', icon: '🎮', count: 0 },
        { type: 'images', label: '图片', icon: '🖼️', count: 0 },
        { type: 'videos', label: '视频', icon: '🎬', count: 0 },
        { type: 'novels', label: '小说', icon: '📚', count: 0 },
        { type: 'websites', label: '网站', icon: '🌐', count: 0 },
        { type: 'audios', label: '音频', icon: '🎵', count: 0 }
      ],
      isLoading: true,
      isLoadingReport: false,
      // 各媒体类型的详细统计
      gameStats: {
        count: 0,
        storage: '0B',
        totalTime: '0小时',
        playedCount: 0
      },
      imageStats: {
        count: 0,
        storage: '0B',
        clickCount: 0
      },
      videoStats: {
        count: 0,
        storage: '0B',
        clickCount: 0
      },
      novelStats: {
        count: 0,
        storage: '0B'
      },
      websiteStats: {
        count: 0,
        storage: '0B'
      },
      audioStats: {
        count: 0,
        storage: '0B'
      },
      currentMonthReport: {
        title: '',
        subtitle: '',
        overview: {
          newMediaCount: 0
        }
      }
    }
  },
  computed: {
    formatJoinDate() {
      if (!this.userProfile.joinDate) return '未知'
      const date = new Date(this.userProfile.joinDate)
      if (isNaN(date.getTime())) return '未知'
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
    },
    formatCurrentLogin() {
      // 从登录队列读取本次登录时间（第一个元素）
      const loginTime = (this.userProfile.loginHistory && this.userProfile.loginHistory.length > 0) 
        ? this.userProfile.loginHistory[0] 
        : null
      
      if (!loginTime) return '未知'
      const date = new Date(loginTime)
      if (isNaN(date.getTime())) return '未知'
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
    },
    formatLastActive() {
      // 从登录队列读取上一次登录时间（第二个元素），如果队列只有一个元素或为空，则显示"无记录"
      if (!this.userProfile.loginHistory || this.userProfile.loginHistory.length < 2) {
        return '无记录'
      }
      const lastLoginTime = this.userProfile.loginHistory[1]
      if (!lastLoginTime) return '无记录'
      const date = new Date(lastLoginTime)
      if (isNaN(date.getTime())) return '无记录'
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
    },
    currentMonthYear() {
      return this.currentDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long'
      })
    },
    calendarDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      
      // 获取当月第一天和最后一天
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      // 获取第一天是星期几
      const firstDayWeek = firstDay.getDay()
      
      // 获取上个月最后几天
      const prevMonth = new Date(year, month, 0)
      const prevMonthLastDay = prevMonth.getDate()
      
      const days = []
      
      // 添加上个月的末尾几天
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i
        days.push({
          day,
          key: `${year}-${month}-${day}`,
          isCurrentMonth: false,
          isToday: false,
          isChecked: false
        })
      }
      
      // 添加当月的所有天
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isToday = this.isToday(year, month + 1, day)
        const isChecked = this.userProfile.checkInDays.includes(dateStr)
        
        days.push({
          day,
          key: dateStr,
          isCurrentMonth: true,
          isToday,
          isChecked
        })
      }
      
      // 添加下个月的开头几天，补齐6行
      const remainingDays = 42 - days.length
      for (let day = 1; day <= remainingDays; day++) {
        days.push({
          day,
          key: `${year}-${month + 2}-${day}`,
          isCurrentMonth: false,
          isToday: false,
          isChecked: false
        })
      }
      
      return days
    },
    totalCheckDays() {
      return this.userProfile.checkInDays.length
    },
    currentMonthCheckDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`
      
      return this.userProfile.checkInDays.filter(date => date.startsWith(monthPrefix)).length
    },
    currentStreak() {
      if (this.userProfile.checkInDays.length === 0) return 0
      
      const sortedDays = [...this.userProfile.checkInDays].sort()
      let streak = 0
      const today = new Date()
      const todayStr = this.formatDate(today)
      
      // 从今天开始往前计算连续登录天数
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)
        const checkDateStr = this.formatDate(checkDate)
        
        if (sortedDays.includes(checkDateStr)) {
          streak++
        } else {
          break
        }
      }
      
      return streak
    },
    // 格式化当前会话时长显示
    formatCurrentSessionTime() {
      return this.formatUsageTime(this.currentSessionTime)
    },
    // 格式化总使用时长（包含当前会话）
    formatTotalUsageTimeWithSession() {
      const totalWithSession = this.userProfile.totalUsageTime + this.currentSessionTime
      return this.formatUsageTime(totalWithSession)
    }
  },
  methods: {
    async loadUserProfile() {
      try {
        console.log('加载用户资料...')
        const profile = await saveManager.loadUserProfile()
        if (profile) {
          this.userProfile = { ...this.userProfile, ...profile }
          // 确保 joinDate 有值
          if (!this.userProfile.joinDate) {
            this.userProfile.joinDate = new Date().toISOString()
          }
          // 确保 loginHistory 数组存在
          if (!this.userProfile.loginHistory) {
            this.userProfile.loginHistory = []
          }
          // 确保 checkInDays 数组存在
          if (!this.userProfile.checkInDays) {
            this.userProfile.checkInDays = []
          }
          // 如果之前没有设置过这些字段，现在需要保存
          if (!profile.joinDate) {
            await this.saveUserProfile()
          }
          console.log('用户资料加载成功:', this.userProfile)
        } else {
          // 如果是新用户，设置加入日期
          this.userProfile.joinDate = new Date().toISOString()
          // 确保 loginHistory 数组存在
          if (!this.userProfile.loginHistory) {
            this.userProfile.loginHistory = []
          }
          // 确保 checkInDays 数组存在
          if (!this.userProfile.checkInDays) {
            this.userProfile.checkInDays = []
          }
          await this.saveUserProfile()
        }
      } catch (error) {
        console.error('加载用户资料失败:', error)
        // 即使出错，也设置默认值
        if (!this.userProfile.joinDate) {
          this.userProfile.joinDate = new Date().toISOString()
        }
        // 确保 loginHistory 数组存在
        if (!this.userProfile.loginHistory) {
          this.userProfile.loginHistory = []
        }
        // 确保 checkInDays 数组存在
        if (!this.userProfile.checkInDays) {
          this.userProfile.checkInDays = []
        }
      }
    },
    async saveUserProfile() {
      try {
        // 确保 joinDate 有值（如果是新用户）
        if (!this.userProfile.joinDate) {
          this.userProfile.joinDate = new Date().toISOString()
        }
        const latest = await saveManager.loadUserProfile()
        const latestDays = Array.isArray(latest?.checkInDays) ? latest.checkInDays : []
        const localDays = Array.isArray(this.userProfile.checkInDays) ? this.userProfile.checkInDays : []
        // 启动时已经记过的日期留在磁盘上。页面如果拿着旧名单整份覆盖，之前的登录日会丢，日历就只剩今天。
        this.userProfile.checkInDays = Array.from(new Set([...latestDays, ...localDays]))
        if (Array.isArray(latest?.loginHistory) && latest.loginHistory.length > 0) {
          this.userProfile.loginHistory = latest.loginHistory
        }
        if (typeof latest?.totalUsageTime === 'number') {
          this.userProfile.totalUsageTime = Math.max(latest.totalUsageTime, this.userProfile.totalUsageTime || 0)
        }
        
        // 自动记录登录日期：如果今天还没有记录，则自动记录
        await this.autoRecordLogin()
        
        await saveManager.saveUserProfile(this.userProfile)
        console.log('用户资料保存成功')
      } catch (error) {
        console.error('保存用户资料失败:', error)
      }
    },
    async autoRecordLogin() {
      const today = new Date()
      const todayStr = this.formatDate(today)
      
      // 如果今天还没有记录登录，则自动记录
      if (!this.userProfile.checkInDays.includes(todayStr)) {
        this.userProfile.checkInDays.push(todayStr)
        console.log('自动记录登录日期:', todayStr)
      }
    },
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    isToday(year, month, day) {
      const today = new Date()
      return today.getFullYear() === year && 
             today.getMonth() + 1 === month && 
             today.getDate() === day
    },
    previousMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    },
    nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    },
    // 格式化使用时长显示（精确到秒）
    formatUsageTime(seconds) {
      const totalSeconds = Math.floor(seconds)
      if (totalSeconds < 60) {
        return `${totalSeconds}秒`
      } else if (totalSeconds < 3600) {
        const minutes = Math.floor(totalSeconds / 60)
        const remainingSeconds = totalSeconds % 60
        return `${minutes}分${remainingSeconds}秒`
      } else if (totalSeconds < 86400) {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const remainingSeconds = totalSeconds % 60
        return `${hours}小时${minutes}分${remainingSeconds}秒`
      } else {
        const days = Math.floor(totalSeconds / 86400)
        const hours = Math.floor((totalSeconds % 86400) / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const remainingSeconds = totalSeconds % 60
        return `${days}天${hours}小时${minutes}分${remainingSeconds}秒`
      }
    },
    // 初始化使用时长跟踪（仅同步数据，不调用 startUsageTracking，因为已在 App.vue 中调用）
    async initializeUsageTracking() {
      try {
        // 同步更新本地 userProfile（可能已经处理了未结束的会话）
        const profile = await saveManager.loadUserProfile()
        if (profile) {
          this.userProfile.loginHistory = profile.loginHistory || []
          this.userProfile.totalUsageTime = profile.totalUsageTime
        }
        // 重置当前会话时长为0（新的会话开始）
        this.currentSessionTime = 0
        this.startUsageTimer()
        console.log('使用时长跟踪已初始化')
      } catch (error) {
        console.error('初始化使用时长跟踪失败:', error)
      }
    },
    // 开始定时器更新当前会话时长
    startUsageTimer() {
      this.updateCurrentSessionTime()
      this.usageTimer = setInterval(() => {
        this.updateCurrentSessionTime()
      }, 1000) // 每秒更新一次
    },
    // 更新当前会话时长
    async updateCurrentSessionTime() {
      try {
        this.currentSessionTime = await saveManager.getCurrentSessionDuration()
      } catch (error) {
        console.error('更新当前会话时长失败:', error)
      }
    },
    async loadMediaStatistics() {
      try {
        this.isLoading = true
        console.log('开始加载媒体统计数据...')
        
        const api = (window as any).electronAPI
        if (!api?.sqliteGetPageData) {
          this.isLoading = false
          return
        }
        const pageIds = ['games', 'images', 'videos', 'anime-series', 'novels', 'websites', 'audio'] as const
        const results = await Promise.all(pageIds.map((id) => api.sqliteGetPageData(id)))
        const [games, images, videos, animeFolders, novels, websites, audios] = results.map((r: any) => (r?.ok ? (r.data ?? []) : []))
        
        this.updateMediaCount('games', games.length)
        this.updateMediaCount('images', images.length)
        this.updateMediaCount('videos', videos.length + animeFolders.length)
        this.updateMediaCount('novels', novels.length)
        this.updateMediaCount('websites', websites.length)
        this.updateMediaCount('audios', audios.length)
        
        this.calculateDetailedStats(games, images, [...videos, ...animeFolders], novels, websites, audios)
        
        console.log('媒体统计数据加载完成:', {
          游戏: games.length,
          图片: images.length,
          视频: videos.length,
          小说: novels.length,
          网站: websites.length,
          音频: audios.length
        })
        
      } catch (error) {
        console.error('加载媒体统计数据失败:', error)
        // 显示错误状态
        this.mediaStats.forEach(stat => {
          stat.count = '?'
        })
      } finally {
        this.isLoading = false
      }
    },
    updateMediaCount(type, count) {
      const stat = this.mediaStats.find(s => s.type === type)
      if (stat) {
        stat.count = count
      }
    },
    async refreshStatistics() {
      await this.loadMediaStatistics()
    },
    calculateDetailedStats(games, images, videos, novels, websites, audios) {
      // 游戏统计
      this.gameStats = {
        count: games.length,
        storage: this.calculateMediaStorage('games', games),
        totalTime: this.calculateTotalGameTime(games),
        playedCount: games.filter(g => g.playCount > 0).length
      }
      
      // 图片统计
      this.imageStats = {
        count: images.length,
        storage: this.calculateMediaStorage('images', images),
        clickCount: this.calculateClickCount(images)
      }
      
      // 视频统计
      this.videoStats = {
        count: videos.length,
        storage: this.calculateMediaStorage('videos', videos),
        clickCount: this.calculateClickCount(videos)
      }
      
      // 小说统计
      this.novelStats = {
        count: novels.length,
        storage: this.calculateMediaStorage('novels', novels)
      }
      
      // 网站统计
      this.websiteStats = {
        count: websites.length,
        storage: this.calculateMediaStorage('websites', websites)
      }
      
      // 音频统计
      this.audioStats = {
        count: audios.length,
        storage: this.calculateMediaStorage('audios', audios)
      }
    },
    calculateMediaStorage(type, mediaList) {
      let totalBytes = 0
      
      mediaList.forEach(item => {
        if (type === 'games' && item.folderSize) {
          // 游戏使用真实的文件夹大小
          totalBytes += item.folderSize
        } else {
          // 其他媒体类型使用估算大小
          const estimatedSizes = {
            'images': 5 * 1024 * 1024,    // 图片: 5MB
            'videos': 500 * 1024 * 1024,  // 视频: 500MB
            'novels': 2 * 1024 * 1024,    // 小说: 2MB
            'websites': 0,                 // 网站: 0MB (只是链接)
            'audios': 10 * 1024 * 1024    // 音频: 10MB
          }
          totalBytes += estimatedSizes[type] || 0
        }
      })
      
      return this.formatBytes(totalBytes)
    },
    calculateClickCount(mediaList) {
      let totalClicks = 0
      mediaList.forEach(item => {
        if (item.clickCount) {
          totalClicks += item.clickCount
        }
      })
      return totalClicks
    },
    calculateTotalStorageUsage(allMedia) {
      let totalBytes = 0
      
      allMedia.forEach((mediaList, index) => {
        mediaList.forEach(item => {
          // 游戏使用 folderSize 字段
          if (index === 0 && item.folderSize) { // games
            totalBytes += item.folderSize
          } else {
            // 其他媒体类型使用估算大小
            const estimatedSizes = {
              1: 5 * 1024 * 1024,    // 图片: 5MB
              2: 500 * 1024 * 1024,  // 视频: 500MB
              3: 2 * 1024 * 1024,    // 小说: 2MB
              4: 0,                   // 网站: 0MB (只是链接)
              5: 10 * 1024 * 1024    // 音频: 10MB
            }
            totalBytes += estimatedSizes[index] || 0
          }
        })
      })
      
      return this.formatBytes(totalBytes)
    },
    calculateTotalGameTime(games) {
      let totalSeconds = 0
      games.forEach(game => {
        if (game.playTime) {
          totalSeconds += game.playTime
        }
      })
      
      return this.formatTime(totalSeconds)
    },
    formatBytes(bytes) {
      if (bytes === 0) return '0B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
    },
    formatTime(totalSeconds) {
      if (totalSeconds === 0) return '0分钟'
      
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      
      if (hours > 0) {
        if (minutes > 0) {
          return `${hours}小时${minutes}分钟`
        } else {
          return `${hours}小时`
        }
      } else if (minutes > 0) {
        return `${minutes}分钟`
      } else {
        return `${seconds}秒`
      }
    },
    async generateMonthlyReport() {
      try {
        this.isLoadingReport = true
        console.log('开始生成月度报告...')
        
        // 获取当前月份信息
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                           '七月', '八月', '九月', '十月', '十一月', '十二月']
        
        // 设置报告标题
        this.currentMonthReport.title = `${currentYear}年${monthNames[currentMonth - 1]}月度报告`
        this.currentMonthReport.subtitle = `数据统计时间：${currentYear}年${currentMonth}月1日 - ${now.getDate()}日`
        
        // 并行加载所有媒体数据
        const [games, images, videos, novels, websites, audios] = await Promise.all([
          saveManager.loadGames(),
          saveManager.loadImages(),
          saveManager.loadVideos(),
          saveManager.loadNovels(),
          saveManager.loadWebsites(),
          saveManager.loadAudios()
        ])
        
        // 计算本月新增媒体数量
        const currentMonthStart = new Date(currentYear, currentMonth - 1, 1)
        const newMediaCount = this.calculateNewMediaCount([games, images, videos, novels, websites, audios], currentMonthStart)
        
        // 更新报告数据
        this.currentMonthReport.overview = {
          newMediaCount
        }
        
        console.log('月度报告生成完成:', this.currentMonthReport)
        
      } catch (error) {
        console.error('生成月度报告失败:', error)
      } finally {
        this.isLoadingReport = false
      }
    },
    calculateNewMediaCount(allMedia, monthStart) {
      let totalNew = 0
      allMedia.forEach(mediaList => {
        mediaList.forEach(item => {
          if (item.addedDate) {
            const addedDate = new Date(item.addedDate)
            if (addedDate >= monthStart) {
              totalNew++
            }
          }
        })
      })
      return totalNew
    },
    async refreshMonthlyReport() {
      await this.generateMonthlyReport()
    }
  },
  async mounted() {
    console.log('统计页面已加载')
    await this.loadUserProfile()
    // 自动记录登录并保存（每次打开页面时，saveUserProfile 内部会调用 autoRecordLogin）
    await this.saveUserProfile()
    // 初始化使用时长跟踪（仅同步数据，startUsageTracking 已在 App.vue 中调用）
    await this.initializeUsageTracking()
    await this.loadMediaStatistics()
    await this.generateMonthlyReport()
  },
  beforeUnmount() {
    // 页面卸载时停止使用时长跟踪
    if (this.usageTimer) {
      clearInterval(this.usageTimer)
      this.usageTimer = null
    }
  }
}
</script>

<style scoped>
.statistics-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.statistics-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.statistics-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.placeholder-content {
  text-align: center;
  color: var(--text-secondary);
  max-width: 500px;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.placeholder-content h5 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.placeholder-content p {
  margin: 0 0 24px 0;
  font-size: 0.9rem;
  opacity: 0.8;
}


/* 统计区域样式 - 卡片包裹 */
.statistics-section {
  margin-bottom: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.statistics-section:hover {
  border-color: var(--accent-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.statistics-section h5 {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-color);
}

/* 统计网格样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-color-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-icon {
  font-size: 2.5rem;
  margin-right: 16px;
  opacity: 0.8;
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 加载状态 */
.stat-card.loading .stat-number {
  color: var(--text-secondary);
  opacity: 0.6;
}

.stat-card.loading .stat-icon {
  opacity: 0.4;
}

/* 媒体总览网格样式 - 改为竖向排列 */
.media-overview-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.media-overview-card {
  display: flex;
  align-items: center;
  padding: 18px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.media-overview-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.media-overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, var(--accent-color), var(--accent-color-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.media-overview-card:hover::before {
  opacity: 1;
}

.media-overview-icon {
  font-size: 2rem;
  margin-right: 16px;
  opacity: 0.9;
  transition: transform 0.3s ease;
  min-width: 40px;
  text-align: center;
}

.media-overview-card:hover .media-overview-icon {
  transform: scale(1.1);
}

.media-overview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-overview-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1.2;
}

.media-overview-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 月度报告样式 */
.report-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.report-container:hover {
  border-color: var(--accent-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.report-title h6 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.report-title p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.report-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--accent-color-dark);
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 0.9rem;
}

.report-content {
  padding: 20px;
}

.report-section {
  margin-bottom: 24px;
}

.report-section:last-child {
  margin-bottom: 0;
}

.report-section h7 {
  display: block;
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 使用概览样式 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.overview-item {
  text-align: center;
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.overview-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.overview-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 媒体分析样式 */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.analysis-card {
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.analysis-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.analysis-title {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.analysis-value {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

/* 活动统计样式 */
.activity-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.activity-icon {
  font-size: 1.5rem;
  margin-right: 12px;
  opacity: 0.8;
}

.activity-info {
  flex: 1;
}

.activity-name {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 2px;
}

.activity-stats {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 时间统计样式 */
.time-statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.time-statistics-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.time-statistics-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.time-statistics-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-color-dark));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.time-statistics-card:hover::before {
  opacity: 1;
}

.time-statistics-icon {
  font-size: 2rem;
  margin-right: 16px;
  opacity: 0.8;
}

.time-statistics-content {
  flex: 1;
}

.time-statistics-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
}

.time-statistics-value {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

/* 登录日历样式 */
.calendar-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  max-width: 400px;
}

.calendar-container:hover {
  border-color: var(--accent-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.calendar-nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-nav-btn:hover {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-color: var(--accent-color);
}

.calendar-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 12px;
}

.calendar-weekday {
  text-align: center;
  padding: 6px 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border-radius: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background: var(--bg-primary);
  border: 1px solid transparent;
  min-height: 32px;
}

.calendar-day.other-month {
  opacity: 0.3;
  cursor: default;
}

.calendar-day.current-month {
  opacity: 1;
}

.calendar-day.today {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-color: var(--accent-color);
}

.calendar-day.checked {
  background: var(--accent-color, #10b981);
  color: white;
  border-color: var(--success-color, #10b981);
}

.calendar-day.current-month:hover:not(.other-month) {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  transform: scale(1.05);
}

.day-number {
  font-size: 0.8rem;
  font-weight: 500;
}

.check-mark {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 0.6rem;
  font-weight: bold;
}

.calendar-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.calendar-stats .stat-item {
  text-align: center;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.calendar-stats .stat-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
}

.calendar-stats .stat-number {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1;
  margin-bottom: 2px;
}

.calendar-stats .stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
