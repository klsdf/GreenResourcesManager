<template>
  <div class="workshop-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h3>{{ $lt('创意工坊') }}</h3>
        <p>{{ $lt('浏览公共工坊，或管理 mods 文件夹里的本地插件') }}</p>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="openModsFolder">
          <span class="btn-icon">📁</span> {{ $lt('打开mods文件夹') }} </button>
        <button class="btn btn-primary" :disabled="isRefreshing" @click="refreshAll">
          <span class="btn-icon">🔄</span> {{ isRefreshing ? $lt('刷新中...') : $lt('刷新') }} </button>
      </div>
    </div>

    <!-- 在线工坊 / 已安装 -->
    <div class="workshop-tabs">
      <button
        class="workshop-tab"
        :class="{ active: activeTab === 'online' }"
        @click="activeTab = 'online'"
      >
        {{ $lt('在线工坊') }}
        <span class="tab-count">{{ onlineMods.length }}</span>
      </button>
      <button
        class="workshop-tab"
        :class="{ active: activeTab === 'local' }"
        @click="activeTab = 'local'"
      >
        {{ $lt('已安装') }}
        <span class="tab-count">{{ plugins.length }}</span>
      </button>
      <div class="tab-spacer"></div>
      <div v-if="activeTab === 'online'" class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="search"
          type="text"
          :placeholder="$lt('搜索插件、作者或标签')"
        >
        <button v-if="search" class="search-clear" @click="search = ''">×</button>
      </div>
    </div>

    <!-- 在线工坊 -->
    <div v-if="activeTab === 'online'" class="plugins-container">
      <div v-if="registryWarning" class="registry-warning">
        ⚠️ {{ registryWarning }}
      </div>

      <FunLoading v-if="registryLoading" :text="$lt('正在读取公共工坊...')" />

      <div v-else-if="registryError" class="empty-state">
        <div class="empty-icon">📡</div>
        <h3>{{ $lt('暂时打不开公共工坊') }}</h3>
        <p>{{ registryError }}</p>
        <button class="btn btn-primary retry-btn" @click="loadRegistry(true)">
          {{ $lt('重试') }}
        </button>
      </div>

      <div v-else-if="filteredOnlineMods.length === 0" class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>{{ search ? $lt('没有找到匹配的插件') : $lt('公共工坊还没有收录插件') }}</h3>
        <p v-if="search">{{ $lt('换个关键词试试') }}</p>
        <p v-else>{{ $lt('插件作者可以按照 workshop/README.md 的说明提交自己的仓库') }}</p>
      </div>

      <div v-else class="plugins-grid">
        <div v-for="mod in filteredOnlineMods" :key="mod.id" class="plugin-card online-card">
          <div class="plugin-header">
            <div class="plugin-icon">{{ mod.icon || '🧩' }}</div>
            <div class="plugin-info">
              <h4 class="plugin-name">{{ mod.name }}</h4>
              <p class="plugin-version" :title="mod.repo">{{ mod.repo }}</p>
            </div>
            <span v-if="isWorkshopInstalled(mod.id)" class="source-badge source-workshop">
              {{ $lt('已安装') }}
            </span>
          </div>

          <div class="plugin-body">
            <p v-if="mod.description" class="plugin-description">
              {{ mod.description }}
            </p>
            <div v-if="mod.author" class="plugin-meta">
              <span class="meta-item">
                <span class="meta-label">{{ $lt('作者:') }}</span>
                <span class="meta-value">{{ mod.author }}</span>
              </span>
            </div>
            <div v-if="mod.tags && mod.tags.length > 0" class="plugin-tags">
              <span v-for="tag in mod.tags" :key="tag" class="plugin-tag">
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="plugin-footer online-footer">
            <div class="plugin-status">
              <span v-if="getUpdate(mod.id)" class="status-badge status-update">
                {{ $lt('可更新到') }} v{{ getUpdate(mod.id).latestVersion }}
              </span>
              <span v-else-if="getLocalVersion(mod.id)" class="status-badge status-enabled">
                {{ $lt('已安装') }} v{{ getLocalVersion(mod.id) }}
              </span>
              <span v-else-if="hasLocalPlugin(mod.id)" class="status-badge status-disabled">
                {{ $lt('本地已有同名插件') }}
              </span>
              <span v-else class="status-badge status-disabled">
                {{ $lt('未安装') }}
              </span>
            </div>
            <button
              class="btn btn-primary btn-install"
              :disabled="isInstallDisabled(mod)"
              @click="installMod(mod)"
            >
              {{ installButtonText(mod) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已安装 -->
    <div v-else class="plugins-container">
      <FunLoading v-if="isLoading" :text="$lt('正在加载插件...')" />

      <div v-else-if="plugins.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>{{ $lt('暂无插件') }}</h3>
        <p>{{ $lt('从在线工坊安装，或把插件文件夹放进 mods 目录') }}</p>
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
              <span v-for="tag in plugin.tags" :key="tag" class="plugin-tag">
                {{ tag }}
              </span>
            </div>
            <div class="plugin-source">
              <span
                :class="['source-badge', isWorkshopInstalled(plugin.id) ? 'source-workshop' : 'source-local']"
              >
                {{ isWorkshopInstalled(plugin.id) ? $lt('工坊安装') : $lt('本地安装') }}
              </span>
              <span v-if="getUpdate(plugin.id)" class="source-badge source-update">
                {{ $lt('有新版本') }} v{{ getUpdate(plugin.id).latestVersion }}
              </span>
            </div>
          </div>

          <div class="plugin-footer">
            <div class="plugin-status">
              <span :class="['status-badge', plugin.enabled ? 'status-enabled' : 'status-disabled']">
                {{ plugin.enabled ? '已启用' : '未启用' }}
              </span>
            </div>
            <div class="plugin-actions">
              <button
                v-if="getUpdate(plugin.id)"
                class="btn btn-primary btn-small"
                :disabled="Boolean(installingId)"
                @click="updateInstalled(plugin)"
              >
                {{ $lt('更新') }}
              </button>
              <button
                v-if="isWorkshopInstalled(plugin.id)"
                class="btn btn-danger btn-small"
                :disabled="Boolean(installingId)"
                @click="uninstallMod(plugin)"
              >
                {{ $lt('卸载') }}
              </button>
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
      activeTab: 'online',
      plugins: [],
      onlineMods: [],
      installedMeta: {},
      updates: [],
      search: '',
      isLoading: true,
      registryLoading: true,
      registryError: '',
      registryWarning: '',
      isRefreshing: false,
      installingId: ''
    }
  },
  computed: {
    filteredOnlineMods() {
      const keyword = this.search.trim().toLowerCase()
      if (!keyword) {
        return this.onlineMods
      }
      return this.onlineMods.filter((mod) => {
        const haystack = [
          mod.id,
          mod.name,
          mod.author,
          mod.description,
          ...(mod.tags || [])
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(keyword)
      })
    }
  },
  async mounted() {
    await Promise.all([this.loadLocalPlugins(), this.loadRegistry(false)])
  },
  methods: {
    notify(type: string, title: string, message: string) {
      const parent = this.$parent as any
      if (parent && parent.$refs && parent.$refs.toastNotification) {
        parent.$refs.toastNotification.show(type, title, message)
      }
    },

    async loadLocalPlugins() {
      this.isLoading = true
      try {
        this.plugins = await pluginManager.scanPlugins()
      } catch (error) {
        console.error('加载插件失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    async loadInstalledMeta() {
      if (!window.electronAPI || !window.electronAPI.workshopGetInstalled) {
        return
      }
      try {
        const result = await window.electronAPI.workshopGetInstalled()
        if (!result.success) {
          return
        }
        const map: Record<string, any> = {}
        for (const mod of result.mods || []) {
          map[mod.id] = mod
        }
        this.installedMeta = map
      } catch (error) {
        console.warn('读取工坊安装记录失败:', error)
      }
    },

    async checkUpdates() {
      if (!window.electronAPI || !window.electronAPI.workshopCheckUpdates) {
        return
      }
      try {
        const result = await window.electronAPI.workshopCheckUpdates()
        if (result.success) {
          this.updates = result.updates || []
        }
      } catch (error) {
        console.warn('检查工坊更新失败:', error)
      }
    },

    async loadRegistry(force = false) {
      if (this.onlineMods.length === 0) {
        this.registryLoading = true
      }
      this.registryError = ''
      this.registryWarning = ''

      if (!window.electronAPI || !window.electronAPI.workshopGetRegistry) {
        this.registryError = '当前环境不支持公共工坊'
        this.registryLoading = false
        return
      }

      try {
        const result = await window.electronAPI.workshopGetRegistry(force)
        if (!result.success) {
          if (this.onlineMods.length === 0) {
            this.registryError = result.error || '读取公共目录失败'
          } else {
            this.registryWarning = result.error || '刷新失败，正在显示上一次的列表'
          }
          return
        }

        this.onlineMods = result.mods || []
        this.registryWarning = result.warning || ''
        await this.loadInstalledMeta()
        await this.checkUpdates()
      } catch (error: any) {
        this.registryError = error && error.message ? error.message : String(error)
      } finally {
        this.registryLoading = false
      }
    },

    async refreshAll() {
      if (this.isRefreshing) {
        return
      }
      this.isRefreshing = true
      try {
        await Promise.all([
          this.loadLocalPlugins(),
          this.loadRegistry(true)
        ])
      } finally {
        this.isRefreshing = false
      }
    },

    getLocalPlugin(pluginId: string) {
      return this.plugins.find((plugin: any) => plugin.id === pluginId)
    },

    getLocalVersion(pluginId: string) {
      const plugin = this.getLocalPlugin(pluginId)
      return plugin ? plugin.version : ''
    },

    hasLocalPlugin(pluginId: string) {
      return Boolean(this.getLocalPlugin(pluginId))
    },

    isWorkshopInstalled(pluginId: string) {
      return Boolean(this.installedMeta[pluginId] && this.getLocalPlugin(pluginId))
    },

    getUpdate(pluginId: string) {
      return this.updates.find((update: any) => update.id === pluginId)
    },

    installButtonText(mod: any) {
      if (this.installingId === mod.id) {
        return '安装中...'
      }
      const update = this.getUpdate(mod.id)
      if (update) {
        return `更新到 v${update.latestVersion}`
      }
      if (this.isWorkshopInstalled(mod.id)) {
        return '已安装'
      }
      if (this.hasLocalPlugin(mod.id)) {
        return '本地已有'
      }
      return '安装'
    },

    isInstallDisabled(mod: any) {
      if (this.installingId) {
        return true
      }
      if (this.getUpdate(mod.id)) {
        return false
      }
      return this.hasLocalPlugin(mod.id)
    },

    async installMod(mod: any) {
      await this.doInstall(mod.id, mod.repo, mod.name)
    },

    async updateInstalled(plugin: any) {
      const meta = this.installedMeta[plugin.id]
      if (!meta) {
        this.notify('error', '无法更新', '没有找到这个插件的工坊安装记录')
        return
      }
      await this.doInstall(plugin.id, meta.repo, plugin.name)
    },

    async doInstall(pluginId: string, repo: string, name: string) {
      if (this.installingId) {
        return
      }
      if (!window.electronAPI || !window.electronAPI.workshopInstallMod) {
        this.notify('error', '安装失败', '当前环境不支持安装插件')
        return
      }

      const enabledBeforeInstall = Boolean(this.getLocalPlugin(pluginId)?.enabled)
      this.installingId = pluginId

      try {
        if (enabledBeforeInstall) {
          await pluginManager.setPluginEnabled(pluginId, false)
        }

        const result = await window.electronAPI.workshopInstallMod({
          id: pluginId,
          repo
        })

        if (!result.success) {
          if (enabledBeforeInstall) {
            await pluginManager.setPluginEnabled(pluginId, true)
          }
          this.notify('error', '安装失败', result.error || '未知错误')
          return
        }

        await this.loadLocalPlugins()
        if (enabledBeforeInstall) {
          await pluginManager.setPluginEnabled(pluginId, true)
        }
        await this.loadInstalledMeta()
        await this.checkUpdates()

        this.notify(
          'success',
          '安装完成',
          `${name || pluginId} 已放进 mods 文件夹，打开开关后生效`
        )
      } catch (error: any) {
        if (enabledBeforeInstall) {
          await pluginManager.setPluginEnabled(pluginId, true).catch(() => {})
        }
        this.notify('error', '安装失败', error && error.message ? error.message : String(error))
      } finally {
        this.installingId = ''
      }
    },

    async uninstallMod(plugin: any) {
      if (!window.electronAPI || !window.electronAPI.workshopUninstallMod) {
        return
      }
      const name = plugin.name || plugin.id
      if (!window.confirm(`确定卸载「${name}」吗？\n插件文件夹会从 mods 目录中删除。`)) {
        return
      }

      this.installingId = plugin.id
      try {
        if (plugin.enabled) {
          await pluginManager.setPluginEnabled(plugin.id, false)
        }
        const result = await window.electronAPI.workshopUninstallMod(plugin.id)
        if (!result.success) {
          this.notify('error', '卸载失败', result.error || '未知错误')
          return
        }
        await this.loadLocalPlugins()
        await this.loadInstalledMeta()
        await this.checkUpdates()
        this.notify('success', '已卸载', `${name} 已从 mods 目录删除`)
      } catch (error: any) {
        this.notify('error', '卸载失败', error && error.message ? error.message : String(error))
      } finally {
        this.installingId = ''
      }
    },

    async togglePlugin(pluginId: string, event: Event) {
      const target = event.target as HTMLInputElement
      const enabled = target.checked

      const success = await pluginManager.setPluginEnabled(pluginId, enabled)

      if (success) {
        const plugin = this.plugins.find((item: any) => item.id === pluginId) as any
        if (plugin) {
          plugin.enabled = enabled
        }
        const pluginName = plugin?.name || pluginId
        this.notify(
          'success',
          enabled ? '插件已启用' : '插件已禁用',
          `${pluginName} ${enabled ? '已启用' : '已禁用'}`
        )
      } else {
        target.checked = !enabled
        this.notify('error', '操作失败', '无法更改插件状态')
      }
    },

    async openModsFolder() {
      try {
        if (!window.electronAPI || !window.electronAPI.openFolder) {
          this.notify('error', '操作失败', '无法打开文件夹（Electron API 不可用）')
          return
        }

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

        const modsPath = appRootPath ? `${appRootPath}/mods` : 'mods'

        if (window.electronAPI.ensureDirectory) {
          try {
            await window.electronAPI.ensureDirectory(modsPath)
          } catch (error) {
            console.warn('创建 mods 目录失败:', error)
          }
        }

        const result = await window.electronAPI.openFolder(modsPath)
        if (result.success) {
          this.notify('success', '文件夹已打开', '已打开 mods 文件夹')
        } else {
          this.notify('error', '打开失败', `无法打开 mods 文件夹: ${result.error}`)
        }
      } catch (error: any) {
        this.notify('error', '打开失败', `打开 mods 文件夹时发生错误: ${error.message}`)
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
  margin-bottom: 16px;
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
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.btn-primary {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
  transform: translateY(-1px);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}

.btn-small {
  padding: 7px 14px;
  font-size: 13px;
}

.btn-install {
  padding: 7px 18px;
  font-size: 13px;
}

.btn-icon {
  font-size: 16px;
}

/* 标签栏 */
.workshop-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.workshop-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.workshop-tab:hover {
  color: var(--text-primary);
}

.workshop-tab.active {
  color: var(--text-on-accent, #1a1a1a);
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.tab-count {
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(127, 127, 127, 0.18);
  font-size: 12px;
}

.tab-spacer {
  flex: 1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  padding: 7px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.search-icon {
  font-size: 13px;
  opacity: 0.7;
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
}

.search-box input::placeholder {
  color: var(--text-secondary);
}

.search-clear {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

/* 插件容器 */
.plugins-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

/* 索引提示 */
.registry-warning {
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  font-size: 13px;
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

.retry-btn {
  margin-top: 20px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.plugin-source {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.source-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid transparent;
}

.source-workshop {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.3);
}

.source-local {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.source-update {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
}

/* 插件底部 */
.plugin-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.online-footer {
  justify-content: space-between;
}

.plugin-actions {
  display: flex;
  gap: 8px;
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

.status-update {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
</style>
