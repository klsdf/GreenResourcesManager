<template>
  <div class="workshop-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h3>{{ $lt('创意工坊') }}</h3>
        <p>{{ $lt('管理和启用插件（目前仅作为展示，功能还在开发中）') }}</p>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="openModsFolder">
          <span class="btn-icon">📁</span> {{ $lt('打开mods文件夹') }} </button>
        <button class="btn btn-primary" @click="refreshPlugins">
          <span class="btn-icon">🔄</span> {{ $lt('刷新') }} </button>
      </div>
    </div>

    <!-- 插件列表 -->
    <div class="plugins-container">
      <FunLoading v-if="isLoading" :text="$lt('正在加载插件...')" />

      <div v-else-if="plugins.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>{{ $lt('暂无插件') }}</h3>
        <p>{{ $lt('将插件文件夹放置在 mods 目录下即可显示') }}</p>
      </div>

      <div v-else class="plugins-grid">
        <div 
          v-for="plugin in plugins" 
          :key="plugin.id"
          class="plugin-card"
          :class="{ 'plugin-enabled': plugin.enabled }"
        >
          <div class="plugin-header">
            <div class="plugin-icon">{{ plugin.icon || '📦' }}</div>
            <div class="plugin-info">
              <h4 class="plugin-name">{{ plugin.name }}</h4>
              <p class="plugin-version">v{{ plugin.version }}</p>
            </div>
            <div class="plugin-toggle">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  :checked="plugin.enabled"
                  @change="togglePlugin(plugin.id, $event)"
                >
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="plugin-body">
            <p v-if="plugin.description" class="plugin-description">
              {{ plugin.description }}
            </p>
            <div v-if="plugin.author" class="plugin-meta">
              <span class="meta-item">
                <span class="meta-label">{{ $lt('作者:') }}</span>
                <span class="meta-value">{{ plugin.author }}</span>
              </span>
            </div>
            <div v-if="plugin.tags && plugin.tags.length > 0" class="plugin-tags">
              <span 
                v-for="tag in plugin.tags" 
                :key="tag"
                class="plugin-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="plugin-footer">
            <div class="plugin-status">
              <span :class="['status-badge', plugin.enabled ? 'status-enabled' : 'status-disabled']">
                {{ plugin.enabled ? '已启用' : '未启用' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import pluginManager from '../utils/PluginManager'
import FunLoading from '../fun-ui/feedback/Loading/FunLoading.vue'

export default {
  name: 'WorkshopView',
  components: {
    FunLoading
  },
  data() {
    return {
      plugins: [],
      isLoading: true
    }
  },
  async mounted() {
    await this.loadPlugins()
  },
  methods: {
    async loadPlugins() {
      this.isLoading = true
      try {
        const plugins = await pluginManager.scanPlugins()
        this.plugins = plugins
      } catch (error) {
        console.error('加载插件失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    async refreshPlugins() {
      await this.loadPlugins()
      // 显示通知（如果可用）
      if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
        this.$parent.$refs.toastNotification.show('success', '刷新成功', '插件列表已更新')
      }
    },
    async togglePlugin(pluginId: string, event: Event) {
      const target = event.target as HTMLInputElement
      const enabled = target.checked
      
      const success = await pluginManager.setPluginEnabled(pluginId, enabled)
      
      if (success) {
        // 更新本地数据
        const plugin = this.plugins.find(p => p.id === pluginId)
        if (plugin) {
          plugin.enabled = enabled
        }
        
        // 显示通知
        if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
          const pluginName = plugin?.name || pluginId
          this.$parent.$refs.toastNotification.show(
            'success', 
            enabled ? '插件已启用' : '插件已禁用',
            `${pluginName} ${enabled ? '已启用' : '已禁用'}（功能暂未实现）`
          )
        }
      } else {
        // 恢复复选框状态
        target.checked = !enabled
        
        // 显示错误通知
        if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
          this.$parent.$refs.toastNotification.show('error', '操作失败', '无法更改插件状态')
        }
      }
    },
    async openModsFolder() {
      try {
        if (!window.electronAPI || !window.electronAPI.openFolder) {
          // 显示错误通知
          if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
            this.$parent.$refs.toastNotification.show('error', '操作失败', '无法打开文件夹（Electron API 不可用）')
          }
          return
        }

        // 获取应用根路径
        let appRootPath = ''
        if (window.electronAPI.getAppRootPath) {
          try {
            const rootResult = await window.electronAPI.getAppRootPath() as any
            if (rootResult && (rootResult.success || typeof rootResult === 'string')) {
              appRootPath = typeof rootResult === 'string' ? rootResult : (rootResult.path || '')
            }
          } catch (error) {
            console.warn('获取应用根路径失败:', error)
          }
        }

        // 构建 mods 目录路径
        const modsPath = appRootPath ? `${appRootPath}/mods` : 'mods'

        // 确保目录存在
        if (window.electronAPI.ensureDirectory) {
          try {
            const ensureResult = await window.electronAPI.ensureDirectory(modsPath)
            if (ensureResult.success) {
              console.log('mods 目录已确保存在:', modsPath)
            }
          } catch (error) {
            console.warn('创建 mods 目录失败:', error)
          }
        }

        // 打开文件夹
        const result = await window.electronAPI.openFolder(modsPath)
        if (result.success) {
          console.log('mods 文件夹已打开:', modsPath)
          // 显示成功通知
          if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
            this.$parent.$refs.toastNotification.show('success', '文件夹已打开', `已打开 mods 文件夹`)
          }
        } else {
          console.error('打开 mods 文件夹失败:', result.error)
          // 显示错误通知
          if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
            this.$parent.$refs.toastNotification.show('error', '打开失败', `无法打开 mods 文件夹: ${result.error}`)
          }
        }
      } catch (error) {
        console.error('打开 mods 文件夹失败:', error)
        // 显示错误通知
        if (this.$parent && this.$parent.$refs && this.$parent.$refs.toastNotification) {
          this.$parent.$refs.toastNotification.show('error', '打开失败', `打开 mods 文件夹时发生错误: ${error.message}`)
        }
      }
    }
  }
}
</script>

<style scoped>
.workshop-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  margin-bottom: 20px;
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
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 16px;
}

/* 插件容器 */
.plugins-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 40px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

/* 插件网格 */
.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding-bottom: 20px;
}

/* 插件卡片 */
.plugin-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.plugin-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.plugin-card.plugin-enabled {
  border-color: var(--accent-color);
  background: var(--bg-secondary);
}

/* 插件头部 */
.plugin-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.plugin-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
}

.plugin-version {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 切换开关 */
.plugin-toggle {
  flex-shrink: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 插件内容 */
.plugin-body {
  flex: 1;
  margin-bottom: 16px;
}

.plugin-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  word-break: break-word;
}

.plugin-meta {
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.meta-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.meta-value {
  color: var(--text-primary);
}

.plugin-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.plugin-tag {
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid var(--border-color);
}

/* 插件底部 */
.plugin-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-enabled {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-disabled {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.3);
}
</style>