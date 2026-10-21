<template>
  <div class="message-center-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h3>{{ $lt('信息中心') }}</h3>
        <p>{{ $lt('查看系统通知和操作历史') }}</p>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="testNotifications">
          <span class="btn-icon">🧪</span> {{ $lt('测试通知') }} </button>
        <button class="btn btn-secondary" @click="clearAllMessages" :disabled="messages.length === 0">
          <span class="btn-icon">🗑️</span> {{ $lt('清空所有') }} </button>
        <button class="btn btn-primary" @click="refreshMessages">
          <span class="btn-icon">🔄</span> {{ $lt('刷新') }} </button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-container">
      <div class="filter-tabs">
        <button 
          v-for="tab in messageTabs" 
          :key="tab.type"
          :class="['tab-btn', { active: activeTab === tab.type }]"
          @click="activeTab = tab.type"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          {{ tab.label }}
          <span class="tab-count">({{ getMessagesByType(tab.type).length }})</span>
        </button>
      </div>
      
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          :placeholder="$lt('搜索消息内容...')"
          class="search-input"
        >
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container">
      <div v-if="paginatedMessages.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h4>{{ $lt('暂无消息') }}</h4>
        <p>{{ getEmptyMessage() }}</p>
      </div>
      
      <div v-else class="message-list">
        <div 
          v-for="message in paginatedMessages" 
          :key="message.id"
          :class="['message-item', `message-${message.type}`]"
        >
          <div class="message-icon">
            <span v-if="message.type === 'success'">✅</span>
            <span v-else-if="message.type === 'error'">❌</span>
            <span v-else-if="message.type === 'warning'">⚠️</span>
            <span v-else-if="message.type === 'info'">ℹ️</span>
            <span v-else">📢</span>
          </div>
          
          <div class="message-content">
            <div class="message-header">
              <h4 class="message-title">{{ message.title }}</h4>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            
            <div class="message-text" v-if="message.content">{{ message.content }}</div>
          </div>
          
          <div class="message-actions">
            <button class="action-btn" @click="removeMessage(message.id)" :title="$lt('删除消息')">
              <span>🗑️</span>
            </button>
            <button class="action-btn" @click="copyMessage(message)" :title="$lt('复制消息')">
              <span>📋</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="currentPage = 1"
      > {{ $lt('首页') }} </button>
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="currentPage--"
      > {{ $lt('上一页') }} </button>
      
      <span class="page-info"> {{ $lt('第') }} {{ currentPage }} {{ $lt('页，共') }} {{ totalPages }} {{ $lt('页') }} </span>
      
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      > {{ $lt('下一页') }} </button>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage = totalPages"
      > {{ $lt('末页') }} </button>
    </div>
  </div>
</template>

<script lang="ts">
import notificationService from '../utils/NotificationService.ts'
import notificationStore from '../fun-ui/feedback/Notification/NotificationStore'

export default {
  name: 'MessageCenterView',
  data() {
    return {
      activeTab: 'all',
      searchQuery: '',
      currentPage: 1,
      pageSize: 20,
      messageTabs: [
        { type: 'all', label: '全部', icon: '📋' },
        { type: 'success', label: '成功', icon: '✅' },
        { type: 'error', label: '错误', icon: '❌' },
        { type: 'warning', label: '警告', icon: '⚠️' },
        { type: 'info', label: '信息', icon: 'ℹ️' }
      ],
      unsubscribe: null,
      localMessages: []
    }
  },
  computed: {
    // 使用本地消息副本
    messages() {
      return this.localMessages
    },
    
    // 根据类型筛选消息
    messagesByType() {
      return this.getMessagesByType(this.activeTab)
    },
    
    // 搜索筛选
    filteredMessages() {
      let messages = this.messagesByType
      
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        messages = messages.filter(message => 
          message.title.toLowerCase().includes(query) ||
          (message.content && message.content.toLowerCase().includes(query))
        )
      }
      
      // 按时间倒序排列
      messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      return messages
    },
    
    // 分页
    totalPages() {
      return Math.ceil(this.filteredMessages.length / this.pageSize)
    },
    
    paginatedMessages() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredMessages.slice(start, end)
    }
  },
  methods: {
    // 根据类型获取消息
    getMessagesByType(type) {
      if (type === 'all') {
        return this.messages
      }
      return this.messages.filter(msg => msg.type === type)
    },
    
    // 获取空状态消息
    getEmptyMessage() {
      if (this.activeTab !== 'all') {
        const tab = this.messageTabs.find(t => t.type === this.activeTab)
        return `暂无${tab ? tab.label : ''}消息`
      }
      if (this.searchQuery.trim()) {
        return '没有找到匹配的消息'
      }
      return '还没有任何系统消息'
    },
    
    // 格式化时间
    formatTime(timestamp) {
      const now = Date.now()
      const msgTime = new Date(timestamp).getTime()
      const diff = now - msgTime
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        const date = new Date(timestamp)
        return date.toLocaleString()
      }
    },
    
    // 删除消息
    removeMessage(id) {
      try {
        console.log('=== 删除消息 ===')
        console.log('Message ID:', id)
        notificationStore.removeMessage(id)
        console.log('消息删除成功')
        console.log('=== 删除消息结束 ===')
      } catch (error) {
        console.error('删除消息失败:', error)
      }
    },
    
    // 清空所有消息
    clearAllMessages() {
      try {
        console.log('=== 清空所有消息 ===')
        notificationStore.clearAllMessages()
        console.log('消息清空成功')
        console.log('=== 清空所有消息结束 ===')
      } catch (error) {
        console.error('清空消息失败:', error)
      }
    },
    
    // 复制消息
    async copyMessage(message) {
      const text = `${message.title}\n${message.content || ''}\n时间: ${this.formatTime(message.timestamp)}`
      try {
        await navigator.clipboard.writeText(text)
        // 显示复制成功提示
        console.log('=== 复制消息 ===')
        console.log('Message:', message)
        notificationService.success('复制成功', '消息已复制到剪贴板', { silent: true })
        console.log('复制成功提示已发送')
      } catch (error) {
        console.error('复制失败:', error)
        notificationService.error('复制失败', '无法复制到剪贴板')
      }
    },
    
    // 刷新消息
    refreshMessages() {
      try {
        console.log('=== 刷新消息 ===')
        this.$forceUpdate()
        notificationService.info('刷新完成', '消息列表已更新', { silent: true })
        console.log('刷新完成提示已发送')
      } catch (error) {
        console.error('刷新消息失败:', error)
        notificationService.error('刷新失败', '无法刷新消息列表')
      }
    },
    
    // 测试通知
    async testNotifications() {
      try {
        console.log('=== 测试通知 ===')
        console.log('NotificationService:', notificationService)
        notificationService.testNotifications()
        console.log('测试通知已发送')
      } catch (error) {
        console.error('测试通知失败:', error)
      }
    }
  },
  
  // 监听搜索和分页变化
  watch: {
    searchQuery() {
      this.currentPage = 1
    },
    activeTab() {
      this.currentPage = 1
    }
  },

  mounted() {
    // 初始化本地消息
    this.localMessages = [...notificationStore.getMessages()]
    // 订阅消息变化
    this.unsubscribe = notificationStore.subscribe(() => {
      console.log('=== 收到消息更新通知 ===')
      this.localMessages = [...notificationStore.getMessages()]
      console.log('本地消息已更新:', this.localMessages)
    })
  },

  beforeDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}
</script>

<style scoped>
.message-center-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.toolbar-left h3 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.toolbar-left p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn:hover {
  background: var(--bg-tertiary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-color: var(--accent-color);
}

.btn-primary:hover {
  background: var(--accent-color-dark);
}

.btn-icon {
  font-size: 16px;
}

/* 筛选和搜索 */
.filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
  border-color: var(--accent-color);
}

.tab-icon {
  font-size: 16px;
}

.tab-count {
  font-size: 12px;
  opacity: 0.8;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 16px 8px 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  width: 300px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  color: var(--text-tertiary);
}

/* 消息列表 */
.messages-container {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.message-list {
  max-height: 600px;
  overflow-y: auto;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.message-item:hover {
  background: var(--bg-tertiary);
}

.message-item:last-child {
  border-bottom: none;
}

.message-success {
  border-left: 4px solid #10b981;
}

.message-error {
  border-left: 4px solid #ef4444;
}

.message-warning {
  border-left: 4px solid #f59e0b;
}

.message-info {
  border-left: 4px solid #3b82f6;
}

.message-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.message-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.message-time {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  margin-left: 12px;
}

.message-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  white-space: pre-line;
  word-break: break-word;
}

.message-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.meta-label {
  color: var(--text-tertiary);
  font-weight: 500;
  min-width: 60px;
}

.meta-value {
  color: var(--text-secondary);
  font-family: monospace;
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.message-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .message-center-view {
    padding: 12px;
  }
  
  .toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .toolbar-right {
    justify-content: center;
  }
  
  .filter-container {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-tabs {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .search-input {
    width: 100%;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .message-time {
    margin-left: 0;
  }
}
</style>
