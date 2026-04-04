<template>
  <fun-card
    class="media-card"
    :class="[ratingBorderClass, { 'selected': isSelected }]"
    :data-type="type"
    :style="{ '--card-scale': scale / 100 }"
    :bordered="false"
    :shadow="false"
    :clickable="true"
    @click="handleCardClick"
    @contextmenu="$emit('contextmenu', $event, item)"
  >
    <div class="media-image">
      <img 
        :src="resolveImage(coverImagePath)" 
        :alt="itemName"
        loading="lazy"
        @error="handleImageError"
      >
      <!-- 多选框 -->
      <div v-if="isMultiSelectMode" class="multi-select-checkbox">
        <input 
          type="checkbox" 
          :checked="isSelected"
          @click.stop
        >
      </div>
      <!-- 动态徽章 -->
      <div v-if="badgeText && scale >= 30" class="media-badge">
        {{ badgeText }}
      </div>
      <!-- 左上角标识容器（文件丢失 + 压缩包） -->
      <div v-if="showFileError || showArchiveIcon" class="top-left-indicators">
        <!-- 文件不存在错误图标 -->
        <div v-if="showFileError" class="file-error-icon" title="本地文件不存在">
          ⚠️
        </div>
        <!-- 压缩包标识 -->
        <div v-if="showArchiveIcon" class="archive-icon" title="压缩包文件">
          📦
        </div>
      </div>
      <!-- 文件夹标识 -->
      <div v-if="type === 'folder'" class="folder-indicator" title="文件夹">
        📁
      </div>
      <!-- 收藏标识 -->
      <div v-if="itemIsFavorite && !isMultiSelectMode" class="favorite-indicator" title="已收藏">
        ⭐
      </div>
      <div class="media-overlay" v-if="showActionButton && !isMultiSelectMode">
        <div class="action-button" @click.stop="$emit('action', item)">
          <span class="action-icon">{{ actionIcon }}</span>
        </div>
      </div>
    </div>
    <div class="media-info">
      <h3 class="media-title" v-if="scale >= 30 || (cardDisplayConfig?.showExeIcon && exeIcon && scale >= 20)">
        <img 
          v-if="cardDisplayConfig?.showExeIcon && exeIcon && scale >= 20" 
          :src="exeIcon" 
          class="exe-icon"
          alt=""
          loading="lazy"
        >
        <span v-if="scale >= 30" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">{{ cardTitle || displayName }}</span>
      </h3>
      
      <!-- 配置驱动的通用信息显示 -->
      <!-- 副标题 -->
      <!-- 如果是数组，用标签显示 -->
      <div class="media-tags" v-if="Array.isArray(cardSubtitle) && cardSubtitle.length > 0 && scale >= 50">
        <fun-tag 
          v-for="(item, index) in cardSubtitle" 
          :key="index" 
          :text="item"
        />
      </div>
      <!-- 如果是字符串，正常显示 -->
      <p class="media-subtitle" v-else-if="cardSubtitle && !Array.isArray(cardSubtitle) && scale >= 50">{{ cardSubtitle }}</p>
      
      <!-- 额外信息 -->
      <!-- 如果是数组，用标签显示 -->
      <div class="media-tags" v-if="Array.isArray(cardExtra) && cardExtra.length > 0 && scale >= 50">
        <fun-tag 
          v-for="(item, index) in cardExtra" 
          :key="index" 
          :text="item"
        />
      </div>
      <!-- 如果是字符串，正常显示 -->
      <p class="media-tertiary" v-else-if="cardExtra && !Array.isArray(cardExtra) && scale >= 50">{{ cardExtra }}</p>
      
      <!-- 描述（如果 subtitle 和 extra 都不是 description，则显示 description） -->
      <p class="media-description" v-if="cardDescription && scale >= 50">{{ cardDescription }}</p>
      
      <!-- 标签 -->
      <div class="media-tags" v-if="displayTags.length > 0 && scale >= 40">
        <fun-tag 
          v-for="tag in displayTags.slice(0, maxDisplayTags)" 
          :key="tag" 
          :text="tag"
        />
        <span v-if="displayTags.length > maxDisplayTags" class="media-tag-more">+{{ displayTags.length - maxDisplayTags }}</span>
      </div>
      
      <!-- 特殊项（如演员列表等） -->
      <template v-for="specialItem in cardSpecialItems" :key="specialItem.field">
        <div class="media-actors" v-if="getSpecialItemValue(specialItem) && scale >= 50">
          <span class="actors-label">{{ specialItem.label }}</span>
          <span class="actors-list">{{ formatSpecialItem(specialItem) }}</span>
        </div>
      </template>
      
      <!-- 进度条（如果有配置） -->
      <div class="media-stats" v-if="cardProgress && scale >= 40">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (cardProgressValue || 0) + '%' }"></div>
        </div>
        <div class="stats-row" v-if="cardProgressText">
          <span class="stat-item">{{ cardProgressText }}</span>
        </div>
      </div>
      
      <!-- 统计信息（根据配置动态渲染） -->
      <div class="media-stats" v-if="cardStats.length > 0 && scale >= 40">
        <template v-for="(stat, index) in cardStats" :key="index">
          <span 
            v-if="stat.rendered" 
            class="stat-item" 
            :class="{ 'running-status': stat.showRunningStatus && isRunning }"
          >
            <span v-if="stat.label" class="stat-label">{{ stat.label }}</span>
            <span v-if="stat.showRunningStatus && isRunning" class="running-info">
              <span class="running-indicator">
                <span class="running-icon">▶️</span>
                <span class="running-text">运行中</span>
              </span>
              <span class="session-time" v-if="sessionDuration > 0">
                本次: {{ formatPlayTime(sessionDuration) }}
              </span>
            </span>
            <span v-else>{{ stat.rendered }}</span>
          </span>
        </template>
      </div>
    </div>
  </fun-card>
</template>

<script>
import { formatPlayTime, formatLastPlayed, formatDuration, formatVideoDuration } from '../utils/formatters'
import { useGameRunningStore } from '../stores/game-running'
import disguiseManager from '../utils/DisguiseManager'
import { isDisguiseModeEnabled } from '../utils/disguiseMode'
import { getGameScreenshotFolderPath } from '../composables/game/useGameScreenshot'
import { ResourceField } from '@resources/base/ResourceField.ts'
import { BaseResources } from '@resources/base/ResourcesDataBase.ts'
import coverManager from '../utils/CoverManager.ts'

/**
 * 安全获取资源属性值的辅助函数
 * 如果属性是 ResourceField，返回其 value；否则直接返回属性值
 * @param {any} field - 可能是 ResourceField 或普通值
 * @returns {any} 字段的实际值
 */
function getFieldValue(field) {
  if (field instanceof ResourceField) {
    let result = field.value
    
    // 如果提取的值仍然是 ResourceField 对象，递归提取（处理嵌套情况）
    if (result instanceof ResourceField) {
      console.warn('[getFieldValue] 检测到嵌套 ResourceField，递归提取')
      result = getFieldValue(result)
    }
    
    return result
  }
  
  return field
}

/**
 * 获取游戏的可执行路径（使用 resourcePath）
 */
function getExecutablePath(item) {
  return getFieldValue(item?.resourcePath)
}

/**
 * 获取资源类的显示文本配置
 * 注意：虽然静态方法的多态由编译时类型决定，但这里通过 item.constructor
 * 获取的是运行时的实际构造函数，所以能正确调用子类的静态方法
 * 
 * 这是因为：
 * - item.constructor 指向创建该实例的实际类（运行时类型）
 * - 例如：new Game() 创建的实例，item.constructor 就是 Game
 * - 调用 item.constructor.getDisplayTexts() 等同于调用 Game.getDisplayTexts()
 * 
 * @param item - 资源实例
 * @returns 显示文本配置
 */
function getDisplayTexts(item) {
  // 通过 item.constructor 获取运行时的实际构造函数
  // 这样可以绕过 TypeScript 的编译时类型检查，实现真正的运行时多态
  if (item && item.constructor && typeof item.constructor.getDisplayTexts === 'function') {
    // 直接调用构造函数上的静态方法（运行时类型）
    return item.constructor.getDisplayTexts()
  }
  // 否则返回默认配置
  return BaseResources.getDisplayTexts()
}

/**
 * 获取资源类的卡片显示配置
 * @param item - 资源实例
 * @returns 卡片显示配置
 */
function getCardDisplayConfig(item) {
  if (!item) {
    return null
  }
  
  if (item.constructor) {
    // 优先使用 getCardDisplayConfig 静态方法
    if (typeof item.constructor.getCardDisplayConfig === 'function') {
      const methodResult = item.constructor.getCardDisplayConfig()
      // 如果方法返回的不是 null，使用方法的返回值
      if (methodResult !== null) {
        return methodResult
      }
    }
    // 如果方法返回 null 或不存在，尝试直接访问 cardDisplayConfig 静态属性
    if (item.constructor.cardDisplayConfig) {
      return item.constructor.cardDisplayConfig
    }
    // 检查原型链
    let proto = Object.getPrototypeOf(item.constructor)
    while (proto && proto !== Object) {
      if (proto.cardDisplayConfig) {
        return proto.cardDisplayConfig
      }
      proto = Object.getPrototypeOf(proto)
    }
  }
  return null
}

/**
 * 获取嵌套字段值（支持 'developers.0' 这样的路径）
 * @param item - 资源实例
 * @param fieldPath - 字段路径
 * @returns 字段值
 */
function getNestedFieldValue(item, fieldPath) {
  if (!item || !fieldPath) return null
  
  const parts = fieldPath.split('.')
  let value = item
  
  for (const part of parts) {
    if (value == null) return null
    value = getFieldValue(value[part])
  }
  
  return value
}

/**
 * 从字段列表中获取第一个有值的字段
 * @param item - 资源实例
 * @param fields - 字段名列表
 * @returns 第一个有值的字段值
 */
function getFirstAvailableField(item, fields) {
  if (!fields || !Array.isArray(fields)) return null
  
  for (const field of fields) {
    const value = getNestedFieldValue(item, field)
    if (value != null && value !== '') {
      return value
    }
  }
  return null
}

export default {
  name: 'MediaCard',
  props: {
    item: {
      type: Object,
      required: true
    },
    type: {
      type: String,
      required: true,
      validator: value => ['game', 'image', 'singleimage', 'novel', 'video', 'audio', 'folder', 'anime'].includes(value)
    },
    isRunning: {
      type: Boolean,
      default: false
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    fileExists: {
      type: Boolean,
      default: true
    },
    scale: {
      type: Number,
      default: 100
    },
    isMultiSelectMode: {
      type: Boolean,
      default: false
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'contextmenu', 'action', 'toggle-select'],
  data() {
    return {
      imageCache: {},
      disguiseImageCache: {}, // 伪装图片缓存
      disguiseTextCache: {}, // 伪装文字缓存
      disguiseTagCache: {}, // 伪装标签缓存
      disguiseModeState: false, // 伪装模式状态，用于触发响应式更新
      exeIconCache: {}, // exe 图标缓存
      exeIconLoaded: false, // 图标加载状态，用于触发响应式更新
      exeIconLoading: false, // 图标加载中标志，避免重复加载
      gameRunningStore: null, // 游戏运行状态 store
      sessionUpdateTimer: null, // 会话时长更新定时器
      updateTrigger: 0, // 用于触发响应式更新的时间戳
      screenshotCoverPath: null // 从截图文件夹读取的第一张图片路径（仅用于游戏类型）
    }
  },
  computed: {
    actionIcon() {
      if (this.type === 'game' && this.isRunning) {
        return '⏹️'
      }
      const configIcon = this.item?.constructor?.actionConfig?.icon
      return configIcon ?? '▶️'
    },
    showActionButton() {
      // 对于压缩包类型的游戏，不显示 action 按钮
      if (this.type === 'game') {
        return !this.isArchive
      }
      return true
    },
    
    // 获取显示的名称（支持伪装模式）
    displayName() {
      // 依赖 disguiseModeState 以确保响应式更新
      const disguiseModeEnabled = this.disguiseModeState
      
      if (disguiseModeEnabled) {
        // 检查伪装文字缓存
        const itemId = getFieldValue(this.item.id)
        if (this.disguiseTextCache[itemId]) {
          return this.disguiseTextCache[itemId]
        }
        
        // 异步获取伪装文字
        this.loadDisguiseText(itemId)
        return getFieldValue(this.item.name) // 先返回原始名称，等异步加载完成
      }
      return getFieldValue(this.item.name)
    },
    
    // 获取卡片显示配置
    cardDisplayConfig() {
      return getCardDisplayConfig(this.item)
    },
    
    // 获取标题（根据配置，默认使用 name）
    cardTitle() {
      const config = this.cardDisplayConfig
      if (config && config.title) {
        return getNestedFieldValue(this.item, config.title)
      }
      // 默认使用 name 字段
      return getFieldValue(this.item.name)
    },
    
    // 获取副标题（根据配置）
    cardSubtitle() {
      const config = this.cardDisplayConfig
      if (!config || !config.subtitle) return null
      const value = getNestedFieldValue(this.item, config.subtitle)
      
      // 如果没有值或值为空，返回 null（不显示）
      if (value == null || value === '') return null
      
      // 如果是数组，返回数组（用于标签显示）
      if (Array.isArray(value)) {
        return value.length > 0 ? value : null
      }
      
      // 字符串直接返回
      return String(value)
    },
    
    // 获取额外信息（根据配置，替代原来的 tertiary）
    cardExtra() {
      const config = this.cardDisplayConfig
      if (!config || !config.extra) return null
      
      const value = getNestedFieldValue(this.item, config.extra)
      
      // 如果没有值或值为空，返回 null（不显示）
      if (value == null || value === '') return null
      
      // 如果是数组，返回数组（用于标签显示）
      if (Array.isArray(value)) {
        return value.length > 0 ? value : null
      }
      
      // 字符串直接返回
      return String(value)
    },
    
    // 获取描述（根据配置，如果 subtitle 或 extra 不是 description，则显示 description）
    cardDescription() {
      const config = this.cardDisplayConfig
      // 如果没有配置，使用默认的 description 字段
      if (!config) {
        return getFieldValue(this.item.description)
      }
      
      // 如果 subtitle 或 extra 已经是 description，就不重复显示
      if (config.subtitle === 'description' || config.extra === 'description') {
        return null
      }
      
      // 否则显示 description 字段
      const desc = getFieldValue(this.item.description)
      return desc && desc !== '' ? desc : null
    },
    
    // 获取最大标签显示数量
    maxDisplayTags() {
      const config = this.cardDisplayConfig
      return config?.maxTags || 3
    },
    
    // 获取特殊项列表
    cardSpecialItems() {
      const config = this.cardDisplayConfig
      return config?.specialItems || []
    },
    
    // 获取进度条配置
    cardProgress() {
      const config = this.cardDisplayConfig
      return config?.progress || null
    },
    
    // 获取进度条值
    cardProgressValue() {
      const progress = this.cardProgress
      if (!progress) return null
      const value = getNestedFieldValue(this.item, progress.field)
      return value != null ? Number(value) : 0
    },
    
    // 获取进度条文本
    cardProgressText() {
      const progress = this.cardProgress
      if (!progress || !progress.textField) return null
      const value = getNestedFieldValue(this.item, progress.textField)
      const progressValue = this.cardProgressValue
      const unit = progress.unit || '%'
      return value || `${progressValue}${unit}`
    },
    
    // 获取统计信息列表（已渲染）
    cardStats() {
      const config = this.cardDisplayConfig
      if (!config || !config.stats || !Array.isArray(config.stats)) {
        return []
      }
      
      return config.stats.map(statConfig => {
        const fieldValue = getNestedFieldValue(this.item, statConfig.field)
        let rendered = ''
        
        if (statConfig.render) {
          // 使用自定义渲染函数
          rendered = statConfig.render(fieldValue, this.item)
        } else if (statConfig.formatter) {
          // 使用格式化函数
          const formatter = this[statConfig.formatter]
          if (typeof formatter === 'function') {
            rendered = formatter(fieldValue)
          } else {
            rendered = String(fieldValue || '')
          }
        } else {
          // 默认显示
          rendered = String(fieldValue || '')
        }
        
        return {
          ...statConfig,
          rendered,
          value: fieldValue
        }
      }).filter(stat => stat.rendered !== '' && stat.rendered != null)
    },
    
    // 获取显示的标签（支持伪装模式和配置）
    displayTags() {
      const config = this.cardDisplayConfig
      const tagsField = config?.tags || 'tags'
      const tags = getNestedFieldValue(this.item, tagsField)
      
      if (!tags || tags.length === 0) {
        return []
      }
      
      // 依赖 disguiseModeState 以确保响应式更新
      const disguiseModeEnabled = this.disguiseModeState
      //console.log(`[displayTags] 伪装模式状态: ${disguiseModeEnabled}, 项目ID: ${getFieldValue(this.item.id)}, 原始标签:`, tags)
      
      if (disguiseModeEnabled) {
        // 为每个标签使用全局伪装方法（确保在所有地方显示一致）
        // 使用缓存，如果缓存中没有则异步加载
        const disguisedTags = tags.map(tag => {
          // 检查标签缓存
          if (this.disguiseTagCache[tag]) {
            return this.disguiseTagCache[tag]
          }
          
          // 异步加载标签伪装（不阻塞渲染）
          this.loadDisguiseTag(tag)
          return tag // 先返回原始标签，等异步加载完成后再更新
        })
        
        // console.log(`[displayTags] 最终伪装标签:`, disguisedTags)
        return disguisedTags
      }
      
      // console.log(`[displayTags] 伪装模式未启用，返回原始标签:`, tags)
      return tags
    },
    badgeText() {
      const config = this.cardDisplayConfig
      
      // 优先使用配置的 badge
      if (config && config.badge) {
        // folderSize 可能是普通属性，不是 ResourceField
        // 先尝试直接访问，如果是 ResourceField 就用 getFieldValue，否则直接使用
        let fieldValue = null
        const rawField = this.item[config.badge.field]
        
        if (rawField != null) {
          // 如果是 ResourceField，使用 getFieldValue 提取值
          if (rawField instanceof ResourceField) {
            fieldValue = getFieldValue(rawField)
          } else {
            // 否则直接使用
            fieldValue = rawField
          }
        }
        
        // 如果直接访问失败，尝试用 getNestedFieldValue（支持嵌套路径）
        if (fieldValue == null) {
          fieldValue = getNestedFieldValue(this.item, config.badge.field)
        }
        
        if (config.badge.render) {
          // 使用自定义渲染函数
          const result = config.badge.render(fieldValue, this.item)
          return result
        } else if (config.badge.formatter) {
          // 使用格式化函数
          const formatter = this[config.badge.formatter]
          if (typeof formatter === 'function') {
            return formatter(fieldValue)
          }
        }
        
        // 如果没有格式化函数，返回字段值
        return fieldValue != null ? String(fieldValue) : ''
      }
      
      // 如果没有配置 badge，则不显示徽章
      return ''
    },
    showFileError() {
      // 优先使用 item.fileExists（如果存在），否则使用 prop 的 fileExists
      // 这样可以避免 prop 默认值导致的误判
      const itemFileExists = getFieldValue(this.item?.fileExists)
      const fileExistsValue = itemFileExists !== undefined ? itemFileExists : this.fileExists
      const shouldShow = ['game', 'audio', 'image', 'singleimage', 'novel', 'video', 'folder', 'anime'].includes(this.type) && fileExistsValue === false
      return shouldShow
    },
    isArchive() {
      if (this.type === 'game') {
        const isArchive = getFieldValue(this.item?.isArchive)
        const executablePath = getExecutablePath(this.item)
        return isArchive || (executablePath && this.isArchiveFile(executablePath))
      } else if (this.type === 'image') {
        const isArchive = getFieldValue(this.item?.isArchive)
        const folderPath = getFieldValue(this.item?.folderPath)
        return isArchive || (folderPath && this.isArchiveFile(folderPath))
      }
      return false
    },
    showArchiveIcon() {
      return (this.type === 'game' || this.type === 'image') && this.isArchive
    },
    // 获取 exe 图标
    exeIcon() {
      const config = this.cardDisplayConfig
      // 只有配置了 showExeIcon 才显示
      if (!config?.showExeIcon) {
        return null
      }
      
      const executablePath = getExecutablePath(this.item)
      if (!executablePath) {
        return null
      }
      
      // 检查是否为 exe 文件
      const ext = executablePath.toLowerCase().split('.').pop()
      if (ext !== 'exe') {
        return null
      }
      
      // 检查缓存
      const cacheKey = executablePath
      if (this.exeIconCache[cacheKey]) {
        return this.exeIconCache[cacheKey]
      }
      
      // 不在 computed 中触发加载，避免重复调用
      // 加载逻辑移到 mounted 和 watch 中
      return null
    },
    // 获取本次游玩时间（仅在资源运行时且配置了运行状态显示）
    sessionDuration() {
      // 依赖 updateTrigger 确保响应式更新
      void this.updateTrigger
      
      const config = this.cardDisplayConfig
      const hasRunningStatus = config?.stats?.some(stat => stat.showRunningStatus)
      if (!hasRunningStatus || !this.isRunning || !this.item?.id || !this.gameRunningStore) {
        return 0
      }
      
      return this.gameRunningStore.getSessionDuration(getFieldValue(this.item.id))
    },
    // 根据评分获取边框类名
    ratingBorderClass() {
      const rating = getFieldValue(this.item?.rating)
      if (!rating || rating < 1 || rating > 5) {
        return '' // 没有评分或评分无效时返回空，保持原样
      }
      return `rating-border-${rating}`
    },
    // 获取封面图片路径
    // 优先使用 coverPath，如果没有则从截图文件夹读取第一张图片，最后使用默认图片
    coverImagePath() {
      // 单图类型：直接使用图片自身（resourcePath）作为封面
      if (this.type === 'singleimage') {
        const resourcePath = getFieldValue(this.item.resourcePath)
        return resourcePath || ''
      }
      
      // 优先使用 coverPath
      const coverPath = getFieldValue(this.item.coverPath)
      
      if (coverPath) {
        return coverPath
      }
      
      // 如果是游戏类型且没有封面，尝试使用从截图文件夹读取的图片
      if (this.type === 'game' && this.screenshotCoverPath) {
        return this.screenshotCoverPath
      }
      
      // 其他类型的资源使用各自的字段
      if (this.type !== 'game') {
        const cover = getFieldValue(this.item.cover)
        const thumbnail = getFieldValue(this.item.thumbnail)
        const thumbnailPath = getFieldValue(this.item.thumbnailPath)
        return cover || thumbnail || thumbnailPath || ''
      }
      
      // 游戏类型且没有封面和截图，返回空字符串（会在 resolveImage 中处理为默认图片）
      return ''
    },
    // 用于模板中访问 item 字段的辅助 computed 属性
    itemName() {
      return getFieldValue(this.item.name)
    },
    itemIsFavorite() {
      return getFieldValue(this.item.isFavorite)
    },
    itemDeveloper() {
      return getFieldValue(this.item.developer)
    },
    itemPublisher() {
      return getFieldValue(this.item.publisher)
    },
    itemDescription() {
      return getFieldValue(this.item.description)
    },
    itemAuthor() {
      return getFieldValue(this.item.author)
    },
    itemGenre() {
      return getFieldValue(this.item.genre)
    },
    itemSeries() {
      return getFieldValue(this.item.series)
    }
  },
  methods: {
    handleCardClick() {
      if (this.isMultiSelectMode) {
        this.$emit('toggle-select')
      } else {
        this.$emit('click', this.item)
      }
    },
    // 获取特殊项的值
    getSpecialItemValue(specialItem) {
      const value = getNestedFieldValue(this.item, specialItem.field)
      if (specialItem.isArray) {
        return Array.isArray(value) && value.length > 0 ? value : null
      }
      return value != null && value !== '' ? value : null
    },
    
    // 格式化特殊项显示
    formatSpecialItem(specialItem) {
      const value = getNestedFieldValue(this.item, specialItem.field)
      if (!value) return ''
      
      if (specialItem.isArray && Array.isArray(value)) {
        const maxItems = specialItem.maxArrayItems || 2
        const join = specialItem.arrayJoin || ', '
        const displayItems = value.slice(0, maxItems)
        let result = displayItems.join(join)
        if (value.length > maxItems) {
          result += `等${value.length}人`
        }
        return result
      }
      
      return String(value)
    },
    formatPlayTime,
    // 包装 formatLastPlayed，使其使用配置
    formatLastPlayed(dateString) {
      const texts = getDisplayTexts(this.item)
      if (!dateString) return texts.neverAccessed
      return formatLastPlayed(dateString, texts)
    },
    formatReadTime(minutes) {
      if (!minutes) return '未阅读'
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
    },
    formatLastRead(dateString) {
      const texts = getDisplayTexts(this.item)
      if (!dateString) return texts.neverAccessed
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      
      if (diffDays === 0) {
        if (diffMinutes < 1) return texts.justAccessed
        if (diffMinutes < 60) return `${diffMinutes}分钟前`
        if (diffHours < 24) return `${diffHours}小时前`
      }
      
      if (diffDays === 1) return texts.yesterdayAccessed
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
      return this.formatDateTime(date)
    },
    formatViewCount(count) {
      if (!count || count === 0) return '未浏览'
      return `已浏览 ${count} 次`
    },
    formatLastViewed(dateString) {
      const texts = getDisplayTexts(this.item)
      if (!dateString) return texts.neverAccessed
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      
      if (diffDays === 0) {
        if (diffMinutes < 1) return `刚刚${texts.accessAction}`
        if (diffMinutes < 60) return `${diffMinutes}分钟前${texts.accessAction}`
        if (diffHours < 24) return `${diffHours}小时前${texts.accessAction}`
      }
      
      if (diffDays === 1) return `昨天${texts.accessAction}`
      if (diffDays < 7) return `${diffDays}天前${texts.accessAction}`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前${texts.accessAction}`
      return this.formatDateTime(date)
    },
    formatLastWatched(dateString) {
      const texts = getDisplayTexts(this.item)
      if (!dateString) return texts.neverAccessed
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      
      if (diffDays === 0) {
        if (diffMinutes < 1) return `刚刚${texts.accessAction}`
        if (diffMinutes < 60) return `${diffMinutes}分钟前${texts.accessAction}`
        if (diffHours < 24) return `${diffHours}小时前${texts.accessAction}`
      }
      
      if (diffDays === 1) return `昨天${texts.accessAction}`
      if (diffDays < 7) return `${diffDays}天前${texts.accessAction}`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前${texts.accessAction}`
      return this.formatDateTime(date)
    },
    formatAddedDate(dateString) {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)}个月前`
      return `${Math.ceil(diffDays / 365)}年前`
    },
    formatDuration(minutes) {
      return formatVideoDuration(minutes, '未知时长')
    },
    formatAudioDuration(seconds) {
      return formatDuration(seconds, '未知时长')
    },
    formatDateTime(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    },
    formatWordCount(wordCount) {
      if (!wordCount || wordCount === 0) return '未知字数'
      
      if (wordCount < 1000) {
        return `${wordCount} 字`
      } else if (wordCount < 10000) {
        return `${(wordCount / 1000).toFixed(1)} 千字`
      } else if (wordCount < 100000) {
        return `${(wordCount / 10000).toFixed(1)} 万字`
      } else {
        return `${(wordCount / 10000).toFixed(0)} 万字`
      }
    },
    formatFolderSize(sizeInBytes) {
      if (!sizeInBytes || sizeInBytes === 0) return '未知大小'
      
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let size = sizeInBytes
      let unitIndex = 0
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      
      // 保留1位小数，但如果是整数则不显示小数
      const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1)
      return `${formattedSize} ${units[unitIndex]}`
    },
    // 加载 exe 图标（使用全局缓存避免重复加载）
    async loadExeIcon() {
      const executablePath = getExecutablePath(this.item)
      if (this.type !== 'game' || !executablePath) {
        return
      }
      
      // 检查是否为 exe 文件
      const ext = executablePath.toLowerCase().split('.').pop()
      if (ext !== 'exe') {
        return
      }
      
      const cacheKey = executablePath
      
      // 检查全局缓存（如果存在）
      if (window.__exeIconCache && window.__exeIconCache[cacheKey]) {
        this.exeIconCache[cacheKey] = window.__exeIconCache[cacheKey]
        this.exeIconLoaded = !this.exeIconLoaded
        return
      }
      
      // 如果已经在本地缓存中，直接返回
      if (this.exeIconCache[cacheKey]) {
        return
      }
      
      // 如果正在加载中，避免重复加载
      if (this.exeIconLoading) {
        return
      }
      
      // 如果不在 Electron 环境中，无法获取图标
      if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.getFileIcon) {
        return
      }
      
      // 检查全局加载队列，避免同时加载太多图标
      if (!window.__exeIconLoadingQueue) {
        window.__exeIconLoadingQueue = new Set()
      }
      
      // 如果该图标正在全局加载队列中，等待
      if (window.__exeIconLoadingQueue.has(cacheKey)) {
        // 等待最多 5 秒
        let waitCount = 0
        while (window.__exeIconLoadingQueue.has(cacheKey) && waitCount < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
          // 检查是否已经加载完成
          if (window.__exeIconCache && window.__exeIconCache[cacheKey]) {
            this.exeIconCache[cacheKey] = window.__exeIconCache[cacheKey]
            this.exeIconLoaded = !this.exeIconLoaded
            return
          }
        }
        return
      }
      
      // 添加到全局加载队列
      window.__exeIconLoadingQueue.add(cacheKey)
      this.exeIconLoading = true
      
      try {
        const result = await window.electronAPI.getFileIcon(executablePath, 32)
        if (result.success && result.icon) {
          // 初始化全局缓存
          if (!window.__exeIconCache) {
            window.__exeIconCache = {}
          }
          
          // 保存到全局缓存
          window.__exeIconCache[cacheKey] = result.icon
          
          // 保存到本地缓存
          if (this.$set) {
            this.$set(this.exeIconCache, cacheKey, result.icon)
          } else {
            this.exeIconCache[cacheKey] = result.icon
          }
          
          // 更新加载状态以触发 computed 重新计算
          this.exeIconLoaded = !this.exeIconLoaded
        }
      } catch (error) {
        console.warn('加载 exe 图标失败:', error)
      } finally {
        // 从全局加载队列中移除
        window.__exeIconLoadingQueue.delete(cacheKey)
        this.exeIconLoading = false
      }
    },
    resolveImage(imagePath) {
      // 如果传入的是 ResourceField 对象，提取其 value
      if (imagePath instanceof ResourceField) {
        imagePath = imagePath.value
      }
      
      // 确保 imagePath 是字符串类型
      if (imagePath && typeof imagePath !== 'string') {
        console.warn('[resolveImage] imagePath 不是字符串，尝试转换:', typeof imagePath)
        imagePath = String(imagePath)
      }
      
      // 空值返回默认
      if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
        return this.getDefaultImage()
      }
      
      // 对于图片类型，如果文件不存在，直接返回默认图片（感叹号会通过 showFileError 显示）
      if (this.type === 'image' && this.fileExists === false) {
        return this.getDefaultImage()
      }
      
      // 检查是否启用伪装模式（对所有类型有效）
      // 依赖 disguiseModeState 以确保响应式更新
      if (this.disguiseModeState) {
        // 检查伪装图片缓存
        if (this.disguiseImageCache[imagePath]) {
          return this.disguiseImageCache[imagePath]
        }
        
        // 异步获取伪装图片
        this.loadDisguiseImage(imagePath)
        return this.getDefaultImage() // 先返回默认图片，等异步加载完成
      }
      
      // 网络资源直接返回
      if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      // 已是 data: 或 file: 直接返回
      if (typeof imagePath === 'string' && (imagePath.startsWith('data:') || imagePath.startsWith('file:'))) {
        return imagePath
      }
      // 命中缓存
      if (this.imageCache[imagePath]) return this.imageCache[imagePath]
      
      // 检查是否是相对路径（使用 coverManager 检查）
      const isRelativePath = !imagePath.includes(':') && !imagePath.startsWith('archive://')
      
      if (isRelativePath) {
        // 相对路径，异步使用 CoverManager 处理
        if (this.isElectronEnvironment && window.electronAPI) {
          coverManager.getCoverUrl(imagePath).then((coverUrl) => {
            this.processImageUrl(coverUrl, imagePath)
          }).catch((error) => {
            console.error('[resolveImage] 获取封面 URL 失败:', error)
            this.processImageUrl(imagePath, imagePath)
          })
        } else {
          this.processImageUrl(imagePath, imagePath)
        }
      } else {
        // 绝对路径，直接处理
        this.processImageUrl(imagePath, imagePath)
      }
      
      // 初次返回默认图，待异步完成后会自动刷新
      return this.imageCache[imagePath] || this.getDefaultImage()
    },
    processImageUrl(coverUrl, cacheKey) {
      // 网络资源直接返回
      if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
        this.$set ? this.$set(this.imageCache, cacheKey, coverUrl) : (this.imageCache[cacheKey] = coverUrl)
        return
      }
      
      // 已是 data: 或 file: 直接返回
      if (coverUrl.startsWith('data:') || coverUrl.startsWith('file:')) {
        this.$set ? this.$set(this.imageCache, cacheKey, coverUrl) : (this.imageCache[cacheKey] = coverUrl)
        return
      }
      
      // 对于视频和音频，使用专门的缩略图处理方法
      if (this.type === 'video' || this.type === 'audio') {
        // 使用 Electron API 处理缩略图
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          window.electronAPI.readFileAsDataUrl(coverUrl).then((dataUrl) => {
            if (dataUrl) {
              this.$set ? this.$set(this.imageCache, cacheKey, dataUrl) : (this.imageCache[cacheKey] = dataUrl)
            } else {
              const defaultImage = this.getDefaultImage()
              this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
            }
          }).catch(() => {
            const defaultImage = this.getDefaultImage()
            this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
          })
        } else if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.getFileUrl) {
          // 使用 getFileUrl API
          window.electronAPI.getFileUrl(coverUrl).then((result) => {
            if (result && result.success) {
              this.$set ? this.$set(this.imageCache, cacheKey, result.url) : (this.imageCache[cacheKey] = result.url)
            } else {
              const defaultImage = this.getDefaultImage()
              this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
            }
          }).catch(() => {
            const defaultImage = this.getDefaultImage()
            this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
          })
        } else {
          // 降级处理：构建 file:// URL
          const normalizedPath = String(coverUrl).replace(/\\/g, '/')
          const fileUrl = `file:///${normalizedPath}`
          this.$set ? this.$set(this.imageCache, cacheKey, fileUrl) : (this.imageCache[cacheKey] = fileUrl)
        }
      } else {
        // 其他类型的媒体使用原有逻辑
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          window.electronAPI.readFileAsDataUrl(coverUrl).then((dataUrl) => {
            if (dataUrl) {
              this.$set ? this.$set(this.imageCache, cacheKey, dataUrl) : (this.imageCache[cacheKey] = dataUrl)
            } else {
              const defaultImage = this.getDefaultImage()
              this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
            }
          }).catch(() => {
            const defaultImage = this.getDefaultImage()
            this.$set ? this.$set(this.imageCache, cacheKey, defaultImage) : (this.imageCache[cacheKey] = defaultImage)
          })
        } else {
          // 回退：尝试 file://
          const normalizedPath = String(coverUrl).replace(/\\/g, '/')
          const fileUrl = `file:///${normalizedPath}`
          this.$set ? this.$set(this.imageCache, cacheKey, fileUrl) : (this.imageCache[cacheKey] = fileUrl)
        }
      }
    },
    getDefaultImage() {
      // 使用资源类的配置，如果没有配置则使用基类的默认值
      if (this.item && this.item.constructor && typeof this.item.constructor.getDefaultIcon === 'function') {
        return this.item.constructor.getDefaultIcon()
      }
      // 使用基类的默认值
      return BaseResources.getDefaultIcon()
    },
    handleImageError(event) {
      const defaultImage = this.getDefaultImage()
      event.target.src = defaultImage
    },
    
    /**
     * 异步加载伪装图片
     * @param {string} imagePath - 原始图片路径
     */
    async loadDisguiseImage(imagePath) {
      try {
        const disguiseImage = await disguiseManager.getRandomDisguiseImage(imagePath)
        // 使用Vue的响应式更新
        this.$set ? this.$set(this.disguiseImageCache, imagePath, disguiseImage) : (this.disguiseImageCache[imagePath] = disguiseImage)
        // 强制更新组件
        this.$forceUpdate()
      } catch (error) {
        console.error('MediaCard: 加载伪装图片失败:', error)
      }
    },
    
    /**
     * 异步加载伪装文字
     * @param {string} itemId - 项目ID
     */
    async loadDisguiseText(itemId) {
      // console.log('MediaCard: 开始加载伪装文字，项目ID:', itemId)
      try {
        const disguiseText = await disguiseManager.getRandomDisguiseText()
        // console.log('MediaCard: 获取到伪装文字:', disguiseText)
        // 使用Vue的响应式更新
        this.$set ? this.$set(this.disguiseTextCache, itemId, disguiseText) : (this.disguiseTextCache[itemId] = disguiseText)
        // 强制更新组件
        this.$forceUpdate()
        // console.log('MediaCard: 伪装文字已更新到缓存')
      } catch (error) {
        console.error('MediaCard: 加载伪装文字失败:', error)
      }
    },
    
    /**
     * 异步加载标签伪装
     * @param {string} tagName - 标签名称
     */
    async loadDisguiseTag(tagName) {
      // console.log('MediaCard: 开始加载标签伪装，标签:', tagName)
      try {
        const disguiseTag = await disguiseManager.getDisguiseTag(tagName)
        // console.log('MediaCard: 获取到标签伪装:', disguiseTag)
        // 使用Vue的响应式更新
        this.$set ? this.$set(this.disguiseTagCache, tagName, disguiseTag) : (this.disguiseTagCache[tagName] = disguiseTag)
        // 强制更新组件
        this.$forceUpdate()
        // console.log('MediaCard: 标签伪装已更新到缓存')
      } catch (error) {
        console.error('MediaCard: 加载标签伪装失败:', error)
      }
    },
    
    /**
     * 更新伪装模式状态
     */
    updateDisguiseModeState() {
      const newState = isDisguiseModeEnabled()
      if (this.disguiseModeState !== newState) {
        //console.log('MediaCard: 伪装模式状态变化:', this.disguiseModeState, '->', newState)
        this.disguiseModeState = newState
        
        // 清除所有伪装缓存
        this.clearDisguiseCaches()
      }
    },
    
    /**
     * 清除所有伪装相关的缓存
     */
    clearDisguiseCaches() {
      this.disguiseImageCache = {}
      this.disguiseTextCache = {}
      this.disguiseTagCache = {}
      // 强制组件重新渲染
      this.$forceUpdate()
    },
    
    /**
     * 监听 localStorage 变化
     */
    handleStorageChange(event) {
      if (event.key === 'butter-manager-settings') {
        //console.log('MediaCard: 检测到设置变化，更新伪装模式状态')
        this.updateDisguiseModeState()
      }
    },
    
    /**
     * 检查文件是否为压缩包
     */
    isArchiveFile(filePath) {
      if (!filePath) {
        return false
      }
      
      if (typeof filePath !== 'string') {
        console.error('[isArchiveFile] filePath 不是字符串类型:', typeof filePath)
        return false
      }
      
      const fileName = filePath.toLowerCase()
      const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz']
      return archiveExtensions.some(ext => fileName.endsWith(ext))
    },
    
    /**
     * 从截图文件夹读取第一张图片作为封面
     * 仅用于游戏类型，且没有 coverPath 时
     */
    async loadScreenshotAsCover() {
      // 只处理游戏类型
      if (this.type !== 'game') {
        return
      }
      
      // 如果已有封面，不需要读取截图
      const coverPath = getFieldValue(this.item.coverPath)
      if (coverPath) {
        return
      }
      
      // 需要 Electron 环境
      if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.listImageFiles) {
        return
      }
      
      try {
        // 获取游戏截图文件夹路径
        const itemId = getFieldValue(this.item.id)
        const itemName = getFieldValue(this.item.name)
        const screenshotFolderPath = await getGameScreenshotFolderPath(
          itemId,
          itemName,
          this.isElectronEnvironment
        )
        
        // 列出截图文件夹中的图片文件
        const result = await window.electronAPI.listImageFiles(screenshotFolderPath)
        
        if (result.success && result.files && result.files.length > 0) {
          // 使用第一张图片作为封面
          const firstImage = result.files[0]
          this.screenshotCoverPath = firstImage
        } else {
          // 截图文件夹不存在或为空，使用默认图片（screenshotCoverPath 保持为 null）
          this.screenshotCoverPath = null
        }
      } catch (error) {
        console.warn('[MediaCard] 读取截图文件夹失败:', error)
        this.screenshotCoverPath = null
      }
    }
    
  },
  mounted() {
    // 初始化游戏运行状态 store
    this.gameRunningStore = useGameRunningStore()
    
    // 初始化伪装模式状态
    this.disguiseModeState = isDisguiseModeEnabled()
    
    // 监听 storage 事件以响应设置变化
    window.addEventListener('storage', this.handleStorageChange)
    
    // 由于 storage 事件不会在同一标签页触发，我们需要使用自定义事件
    window.addEventListener('disguise-mode-changed', this.updateDisguiseModeState)
    
    // 延迟加载 exe 图标，避免同时加载太多图标导致卡顿
    // 使用 setTimeout 分批加载，减少并发压力
    const cardConfig = getCardDisplayConfig(this.item)
    if (cardConfig?.showExeIcon) {
      const executablePath = getExecutablePath(this.item)
      if (executablePath) {
        const ext = executablePath.toLowerCase().split('.').pop()
        if (ext === 'exe') {
          // 随机延迟 0-500ms，分散加载时间
          const delay = Math.random() * 500
          setTimeout(() => {
            this.loadExeIcon()
          }, delay)
        }
      }
    }
    
    // 如果资源正在运行且配置了运行状态显示，启动定时器实时更新会话时长显示
    const hasRunningStatus = cardConfig?.stats?.some(stat => stat.showRunningStatus)
    if (hasRunningStatus && this.isRunning) {
      this.sessionUpdateTimer = setInterval(() => {
        this.updateTrigger = Date.now()
      }, 1000) // 每秒更新一次
    }
    
    // 如果游戏没有封面，尝试从截图文件夹读取第一张图片（保持向后兼容）
    if (this.type === 'game' && !getFieldValue(this.item.coverPath)) {
      // 延迟加载，避免阻塞渲染
      setTimeout(() => {
        this.loadScreenshotAsCover()
      }, 100)
    }
  },
  beforeUnmount() {
    // 清理事件监听器
    window.removeEventListener('storage', this.handleStorageChange)
    window.removeEventListener('disguise-mode-changed', this.updateDisguiseModeState)
    
    // 清理会话时长更新定时器
    if (this.sessionUpdateTimer) {
      clearInterval(this.sessionUpdateTimer)
      this.sessionUpdateTimer = null
    }
  },
  watch: {
    // 监听 isRunning 变化，动态启动/停止定时器
    isRunning(newVal) {
      const config = getCardDisplayConfig(this.item)
      const hasRunningStatus = config?.stats?.some(stat => stat.showRunningStatus)
      if (hasRunningStatus) {
        if (newVal && !this.sessionUpdateTimer) {
          // 资源开始运行，启动定时器
          this.sessionUpdateTimer = setInterval(() => {
            this.updateTrigger = Date.now()
          }, 1000)
        } else if (!newVal && this.sessionUpdateTimer) {
          // 资源停止运行，清理定时器
          clearInterval(this.sessionUpdateTimer)
          this.sessionUpdateTimer = null
        }
      }
    },
    // 监听 item 变化，重新加载截图封面
    item: {
      handler(newItem) {
        if (this.type === 'game' && newItem && !newItem.coverPath) {
          // 重置截图封面路径
          this.screenshotCoverPath = null
          // 延迟加载，避免阻塞
          setTimeout(() => {
            this.loadScreenshotAsCover()
          }, 100)
        } else if (this.type === 'game' && newItem && newItem.coverPath) {
          // 如果有封面了，清除截图封面
          this.screenshotCoverPath = null
        }
      },
      immediate: false
    }
  }
}
</script>

<style lang="scss" scoped>
// 卡片背景透明度变量
$card-bg-opacity: 0.3;
$card-bg-light: rgba(255, 255, 255, $card-bg-opacity);
$card-bg-dark: rgba(30, 30, 30, $card-bg-opacity);

// 毛玻璃效果变量
$backdrop-blur: 5px;
$backdrop-blur-small: 4px;

// 其他透明度变量
$overlay-opacity: 0.5;
$badge-bg-opacity: 0.8;
$indicator-bg-opacity: 0.9;
$shadow-opacity: 0.2;

// 颜色变量
$error-color: rgba(239, 68, 68, $indicator-bg-opacity);
$info-color: rgba(59, 130, 246, $indicator-bg-opacity);
$running-color-light: #059669;
$running-color-dark: #10b981;

.media-card {
  background-color: $card-bg-light;
  backdrop-filter: blur($backdrop-blur);
  -webkit-backdrop-filter: blur($backdrop-blur);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  position: relative;
  padding: 0 !important; /* 覆盖 fun-card 的默认 padding */
}

[data-theme="dark"] .media-card {
  background-color: $card-bg-dark;
}

.media-card:hover,
.media-card.selected {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px var(--shadow-medium);
  border-color: var(--accent-color);
}

.multi-select-checkbox {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.multi-select-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 评分边框样式 */
.media-card.rating-border-5 {
  border: 2px solid #FFD700; /* 金色 - 5星 */
  background-color: rgba(255, 215, 0, 0.08); /* 淡金色背景 */
}

.media-card.rating-border-4 {
  border: 2px solid #9D4EDD; /* 紫色 - 4星 */
  background-color: rgba(157, 78, 221, 0.08); /* 淡紫色背景 */
}

.media-card.rating-border-3 {
  border: 2px solid #EF4444; /* 红色 - 3星 */
  background-color: rgba(239, 68, 68, 0.08); /* 淡红色背景 */
}

.media-card.rating-border-2 {
  border: 2px solid #10B981; /* 绿色 - 2星 */
  background-color: rgba(16, 185, 129, 0.08); /* 淡绿色背景 */
}

.media-card.rating-border-1 {
  border: 2px solid #3B82F6; /* 蓝色 - 1星 */
  background-color: rgba(59, 130, 246, 0.08); /* 淡蓝色背景 */
}

/* 深色主题下的评分背景色调整 */
[data-theme="dark"] .media-card.rating-border-5 {
  background-color: rgba(255, 215, 0, 0.12); /* 深色主题下稍微明显一点 */
}

[data-theme="dark"] .media-card.rating-border-4 {
  background-color: rgba(157, 78, 221, 0.12);
}

[data-theme="dark"] .media-card.rating-border-3 {
  background-color: rgba(239, 68, 68, 0.12);
}

[data-theme="dark"] .media-card.rating-border-2 {
  background-color: rgba(16, 185, 129, 0.12);
}

[data-theme="dark"] .media-card.rating-border-1 {
  background-color: rgba(59, 130, 246, 0.12);
}

/* hover 时保持评分边框颜色，但可以使用更亮的颜色 */
.media-card.rating-border-5:hover {
  border-color: #FFED4E;
  background-color: rgba(255, 215, 0, 0.15); /* hover 时背景色稍微增强 */
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.media-card.rating-border-4:hover {
  border-color: #C77DFF;
  background-color: rgba(157, 78, 221, 0.15);
  box-shadow: 0 8px 25px rgba(157, 78, 221, 0.3);
}

.media-card.rating-border-3:hover {
  border-color: #F87171;
  background-color: rgba(239, 68, 68, 0.15);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

.media-card.rating-border-2:hover {
  border-color: #34D399;
  background-color: rgba(16, 185, 129, 0.15);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.media-card.rating-border-1:hover {
  border-color: #60A5FA;
  background-color: rgba(59, 130, 246, 0.15);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

/* 深色主题下的 hover 背景色 */
[data-theme="dark"] .media-card.rating-border-5:hover {
  background-color: rgba(255, 215, 0, 0.18);
}

[data-theme="dark"] .media-card.rating-border-4:hover {
  background-color: rgba(157, 78, 221, 0.18);
}

[data-theme="dark"] .media-card.rating-border-3:hover {
  background-color: rgba(239, 68, 68, 0.18);
}

[data-theme="dark"] .media-card.rating-border-2:hover {
  background-color: rgba(16, 185, 129, 0.18);
}

[data-theme="dark"] .media-card.rating-border-1:hover {
  background-color: rgba(59, 130, 246, 0.18);
}

.media-image {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  overflow: hidden;
}

/* 图片类型使用更适合竖向图片的宽高比 */
.media-card[data-type="image"] .media-image {
  aspect-ratio: 3/4;
}

.media-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.media-badge {
  position: absolute;
  bottom: calc(8px * var(--card-scale, 1));
  right: calc(8px * var(--card-scale, 1));
  background: rgba(0, 0, 0, $badge-bg-opacity);
  color: white;
  padding: calc(4px * var(--card-scale, 1)) calc(8px * var(--card-scale, 1));
  border-radius: calc(4px * var(--card-scale, 1));
  font-size: calc(12px * var(--card-scale, 1));
  font-weight: 500;
  font-family: 'Courier New', monospace;
  z-index: 10;
  backdrop-filter: blur($backdrop-blur-small);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.media-card:hover .media-image img {
  transform: scale(1.05);
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, $overlay-opacity);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.media-card:hover .media-overlay {
  opacity: 1;
}

.action-button {
  background: var(--accent-color);
  color: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s ease;
}

.action-button:hover {
  background: var(--accent-hover);
  transform: scale(1.1);
}

.media-info {
  padding: calc(15px * var(--card-scale, 1));
}

.media-title {
  color: var(--text-primary);
  font-size: calc(1.1rem * var(--card-scale, 1));
  font-weight: 600;
  margin-bottom: calc(5px * var(--card-scale, 1));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: calc(8px * var(--card-scale, 1));
}

.exe-icon {
  width: calc(20px * var(--card-scale, 1));
  height: calc(20px * var(--card-scale, 1));
  flex-shrink: 0;
  object-fit: contain;
  display: var(--show-icon, block);
}

.media-subtitle {
  color: var(--text-secondary);
  font-size: calc(0.9rem * var(--card-scale, 1));
  margin-bottom: calc(6px * var(--card-scale, 1));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.media-tertiary {
  color: var(--text-tertiary);
  font-size: calc(0.85rem * var(--card-scale, 1));
  margin-bottom: calc(8px * var(--card-scale, 1));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
  font-style: italic;
}

.media-description {
  color: var(--text-tertiary);
  font-size: calc(0.8rem * var(--card-scale, 1));
  margin-bottom: calc(8px * var(--card-scale, 1));
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.media-tags {
  display: var(--show-stats, flex);
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}


.media-tag-more {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  padding: calc(2px * var(--card-scale, 1)) calc(6px * var(--card-scale, 1));
  border-radius: calc(8px * var(--card-scale, 1));
  font-size: calc(0.7rem * var(--card-scale, 1));
  font-weight: 500;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.media-stats {
  display: var(--show-stats, flex);
  flex-direction: column;
  gap: calc(3px * var(--card-scale, 1));
}

.media-meta {
  display: flex;
  flex-direction: column;
  gap: calc(3px * var(--card-scale, 1));
}

.stat-item, .meta-item {
  color: var(--text-tertiary);
  font-size: calc(0.8rem * var(--card-scale, 1));
  transition: color 0.3s ease;
}

.play-time-label {
  font-weight: 500;
  margin-right: 4px;
}

.running-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* 小说进度条样式 */
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.last-read {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  transition: color 0.3s ease;
}

/* 游戏运行状态指示器 */
.running-status {
  color: $running-color-light !important;
  font-weight: 600;
}

/* 左上角标识容器 */
.top-left-indicators {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  z-index: 10;
  align-items: center;
}

/* 文件错误图标样式 */
.file-error-icon {
  background: $error-color;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, $shadow-opacity);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

/* 压缩包图标样式 */
.archive-icon {
  background: $info-color;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, $shadow-opacity);
  flex-shrink: 0;
}

.folder-indicator {
  position: absolute;
  bottom: calc(8px * var(--card-scale, 1));
  left: calc(8px * var(--card-scale, 1));
  background: $info-color;
  color: white;
  border-radius: calc(6px * var(--card-scale, 1));
  padding: calc(4px * var(--card-scale, 1)) calc(8px * var(--card-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(14px * var(--card-scale, 1));
  font-weight: bold;
  z-index: 10;
  backdrop-filter: blur($backdrop-blur-small);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, $shadow-opacity);
}

.favorite-indicator {
  position: absolute;
  top: calc(8px * var(--card-scale, 1));
  right: calc(8px * var(--card-scale, 1));
  background: rgba(251, 191, 36, $indicator-bg-opacity);
  color: white;
  border-radius: 50%;
  width: calc(28px * var(--card-scale, 1));
  height: calc(28px * var(--card-scale, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(16px * var(--card-scale, 1));
  z-index: 10;
  backdrop-filter: blur($backdrop-blur-small);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, $shadow-opacity);
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

[data-theme="dark"] .running-status {
  color: $running-color-dark !important;
}

.running-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  animation: pulse 2s infinite;
}

.running-icon {
  font-size: 0.8rem;
  animation: bounce 1s infinite;
}

.running-text {
  letter-spacing: 0.5px;
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 弹跳动画 */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-1px);
  }
  60% {
    transform: translateY(-0.5px);
  }
}

/* 视频和音频特有样式 */
.media-actors {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.actors-label {
  font-weight: 500;
  margin-right: 4px;
}

.actors-list {
  color: var(--text-primary);
}

.actors-more {
  color: var(--text-tertiary);
  font-style: italic;
}

.watch-count, .play-count {
  font-weight: 500;
  color: var(--text-primary);
}

.last-watched, .last-played {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .media-image {
    height: 200px;
  }
}
</style>
