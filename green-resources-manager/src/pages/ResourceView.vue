<template>
  <div class="resource-view">
    <div class="resource-content">
      <div class="resources-container">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在加载数据...</p>
        </div>

        <div v-else>
          <!-- 硬盘信息总览 -->
          <div class="disk-section">
            <h3 class="section-title">💾 硬盘存储概览</h3>
            <div class="disk-grid">
              <div v-for="disk in diskInfo" :key="disk.drive" class="disk-card">
                <div class="disk-header">
                  <div class="disk-info-left">
                    <span class="disk-icon">{{ getDiskIcon(disk.mediaType) }}</span>
                    <div class="disk-info">
                      <h4 class="disk-name">{{ disk.drive }}</h4>
                    </div>
                  </div>
                </div>

                <!-- 容量条 - Steam 风格 -->
                <div class="storage-bars">
                  <!-- 总容量背景条 -->
                  <div class="storage-bar-container">
                    <div class="storage-bar-total"></div>
                  </div>
                  
                  <!-- 硬盘总占用 -->
                  <div class="storage-bar-container">
                    <div 
                      class="storage-bar-used" 
                      :style="{ width: disk.usagePercent + '%' }"
                    ></div>
                  </div>
                  
                  <!-- 管理器资源占用 -->
                  <div class="storage-bar-container">
                    <div 
                      class="storage-bar-resources" 
                      :style="{ width: getResourceUsagePercent(disk) + '%' }"
                    ></div>
                  </div>
                </div>

                <!-- 容量信息 -->
                <div class="storage-legend">
                  <div class="legend-item">
                    <span class="legend-dot legend-total"></span>
                    <span class="legend-label">总容量: {{ formatBytes(disk.totalBytes) }}</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot legend-used"></span>
                    <span class="legend-label">硬盘已用: {{ formatBytes(disk.usedBytes) }} ({{ disk.usagePercent }}%)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-dot legend-resources"></span>
                    <span class="legend-label">管理器资源: {{ formatBytes(getResourceSizeByDrive(disk.drive)) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 资源分布 -->
          <div class="distribution-section">
            <h3 class="section-title">📊 资源分布</h3>
            
            <!-- 筛选器 -->
            <div class="filter-section">
              <div class="filter-group">
                <label>按硬盘筛选:</label>
                <select v-model="selectedDrive" @change="applyFilters">
                  <option value="all">全部硬盘</option>
                  <option v-for="disk in diskInfo" :key="disk.drive" :value="disk.drive">{{ disk.drive }} - {{ disk.friendlyName }}</option>
                </select>
              </div>
              <div class="filter-group">
                <label>按资源类型筛选:</label>
                <select v-model="selectedResourceType" @change="applyFilters">
                  <option value="all">全部类型</option>
                  <option v-for="type in resourceTypes" :key="type.id" :value="type.id">{{ type.icon }} {{ type.name }}</option>
                </select>
              </div>
            </div>

            <!-- 分布统计 -->
            <div class="distribution-grid">
              <div class="distribution-card">
                <h4>按硬盘分布</h4>
                <div class="distribution-list">
                  <div v-for="item in distributionByDrive" :key="item.drive" class="distribution-item">
                    <span class="distribution-label">{{ item.drive }}</span>
                    <div class="distribution-bar-wrapper">
                      <div 
                        class="distribution-bar" 
                        :style="{ width: (item.percent || 0) + '%' }"
                      ></div>
                    </div>
                    <span class="distribution-value">{{ formatBytes(item.size) }} ({{ item.count }}个)</span>
                  </div>
                </div>
              </div>

              <div class="distribution-card">
                <h4>按类型分布</h4>
                <div class="distribution-list">
                  <div v-for="item in distributionByType" :key="item.type" class="distribution-item">
                    <span class="distribution-label">{{ item.icon }} {{ item.name }}</span>
                    <div class="distribution-bar-wrapper">
                      <div 
                        class="distribution-bar" 
                        :style="{ width: (item.percent || 0) + '%' }"
                      ></div>
                    </div>
                    <span class="distribution-value">{{ formatBytes(item.size) }} ({{ item.count }}个)</span>
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
export default {
  name: 'ResourceView',
  components: {
  },
  data() {
    return {
      isLoading: true,
      diskInfo: [],
      allResources: [],
      filteredResources: [],
      selectedDrive: 'all',
      selectedResourceType: 'all',
      resourceTypes: [
        { id: 'game', name: '游戏', icon: '🎮' },
        { id: 'image', name: '图片', icon: '🖼️' },
        { id: 'video', name: '视频', icon: '🎬' },
        { id: 'anime', name: '动画', icon: '📺' },
        { id: 'novel', name: '小说', icon: '📚' },
        { id: 'website', name: '网站', icon: '🌐' },
        { id: 'audio', name: '音频', icon: '🎵' }
      ]
    }
  },
  computed: {
    distributionByDrive() {
      const driveMap = {}
      
      this.filteredResources.forEach(resource => {
        const drive = resource.drive || '未知'
        if (!driveMap[drive]) {
          driveMap[drive] = { drive, size: 0, count: 0 }
        }
        driveMap[drive].size += resource.size || 0
        driveMap[drive].count += 1
      })
      
      const result = Object.values(driveMap)
      const totalSize = result.reduce((sum, item) => sum + item.size, 0)
      
      return result.map(item => ({
        ...item,
        percent: totalSize > 0 ? Math.round((item.size / totalSize) * 100) : 0
      })).sort((a, b) => b.size - a.size)
    },
    distributionByType() {
      const typeMap = {}
      
      this.filteredResources.forEach(resource => {
        const type = resource.type
        if (!typeMap[type]) {
          const typeInfo = this.resourceTypes.find(t => t.id === type) || { name: type, icon: '📦' }
          typeMap[type] = { type, name: typeInfo.name, icon: typeInfo.icon, size: 0, count: 0 }
        }
        typeMap[type].size += resource.size || 0
        typeMap[type].count += 1
      })
      
      const result = Object.values(typeMap)
      const totalSize = result.reduce((sum, item) => sum + item.size, 0)
      
      return result.map(item => ({
        ...item,
        percent: totalSize > 0 ? Math.round((item.size / totalSize) * 100) : 0
      })).sort((a, b) => b.size - a.size)
    }
  },
  methods: {
    async loadData() {
      try {
        this.isLoading = true
        await Promise.all([
          this.loadDiskInfo(),
          this.loadAllResources()
        ])
        this.applyFilters()
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    async loadDiskInfo() {
      try {
        const api = (window as any).electronAPI
        if (!api?.getLogicalDrivesInfo) {
          return
        }
        
        const result = await api.getLogicalDrivesInfo()
        
        if (result.success && result.drives) {
          this.diskInfo = result.drives.map(drive => ({
            drive: drive.driveLetter,
            friendlyName: drive.friendlyName || drive.driveLetter,
            mediaType: drive.mediaType || '未知',
            deviceId: drive.deviceId,
            busType: drive.busType || '未知',
            totalBytes: drive.totalBytes,
            usedBytes: drive.usedBytes,
            freeBytes: drive.freeBytes,
            usagePercent: drive.usagePercent
          }))
        }
      } catch (error) {
        console.error('加载硬盘信息失败:', error)
      }
    },
    async loadAllResources() {
      try {
        const api = (window as any).electronAPI
        if (!api?.sqliteGetPageData) {
          return
        }
        
        const pageIds = ['games', 'images', 'videos', 'anime-series', 'novels', 'websites', 'audio'] as const
        const results = await Promise.all(pageIds.map((id) => api.sqliteGetPageData(id)))
        
        const [games, images, videos, animeFolders, novels, websites, audios] = results.map((r: any) => (r?.ok ? (r.data ?? []) : []))
        
        this.allResources = [
          ...games.map((g: any) => this.normalizeResource(g, 'game')),
          ...images.map((img: any) => this.normalizeResource(img, 'image')),
          ...videos.map((v: any) => this.normalizeResource(v, 'video')),
          ...animeFolders.map((a: any) => this.normalizeResource(a, 'anime')),
          ...novels.map((n: any) => this.normalizeResource(n, 'novel')),
          ...websites.map((w: any) => this.normalizeResource(w, 'website')),
          ...audios.map((a: any) => this.normalizeResource(a, 'audio'))
        ]
      } catch (error) {
        console.error('加载资源数据失败:', error)
      }
    },
    normalizeResource(item: any, type: string) {
      let size = 0
      let path = ''
      
      if (type === 'game') {
        size = item.folderSize || item.size || 0
        path = item.installPath || item.folderPath || item.path || item.resourcePath || ''
      } else if (type === 'image') {
        size = item.folderSize || item.size || (item.pagesCount ? item.pagesCount * 5 * 1024 * 1024 : 0)
        path = item.folderPath || item.path || item.resourcePath || ''
      } else if (type === 'video' || type === 'anime') {
        size = item.fileSize || item.size || (item.duration ? item.duration * 1024 * 1024 : 0)
        path = item.filePath || item.folderPath || item.path || item.resourcePath || ''
      } else if (type === 'novel') {
        size = item.fileSize || item.size || 2 * 1024 * 1024
        path = item.filePath || item.folderPath || item.path || item.resourcePath || ''
      } else if (type === 'audio') {
        size = item.fileSize || item.size || 10 * 1024 * 1024
        path = item.filePath || item.path || item.resourcePath || ''
      }
      
      const drive = this.extractDriveFromPath(path)
      
      return {
        id: item.id,
        type,
        name: item.name,
        path,
        drive,
        size,
        addedDate: item.addedDate || null
      }
    },
    extractDriveFromPath(path: string) {
      if (!path) return null
      const match = path.match(/^([A-Za-z]):/)
      return match ? match[1].toUpperCase() + ':' : null
    },
    getResourceSizeByDrive(drive: string) {
      return this.allResources
        .filter(r => r.drive === drive)
        .reduce((sum, r) => sum + (r.size || 0), 0)
    },
    getResourceUsagePercent(disk: any) {
      if (!disk.totalBytes) return 0
      const resourceSize = this.getResourceSizeByDrive(disk.drive)
      return Math.min(100, Math.round((resourceSize / disk.totalBytes) * 100))
    },
    applyFilters() {
      this.filteredResources = this.allResources.filter(resource => {
        const driveMatch = this.selectedDrive === 'all' || resource.drive === this.selectedDrive
        const typeMatch = this.selectedResourceType === 'all' || resource.type === this.selectedResourceType
        return driveMatch && typeMatch
      })
    },
    getDiskIcon(mediaType: string) {
      const type = (mediaType || '').toLowerCase()
      if (type.includes('ssd')) return '💿'
      if (type.includes('hdd')) return '💾'
      return '📀'
    },
    getResourceTypeIcon(type: string) {
      const typeInfo = this.resourceTypes.find(t => t.id === type)
      return typeInfo ? typeInfo.icon : '📦'
    },
    getResourceTypeName(type: string) {
      const typeInfo = this.resourceTypes.find(t => t.id === type)
      return typeInfo ? typeInfo.name : type
    },
    formatBytes(bytes: number) {
      if (bytes === 0 || !bytes) return '0B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
    },
    formatDate(dateStr: string) {
      if (!dateStr) return '-'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('zh-CN')
    }
  },
  async mounted() {
    await this.loadData()
  }
}
</script>

<style scoped>
.resource-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.resource-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: var(--bg-primary);
}

.resources-container {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: 0 2px 4px var(--shadow-light);
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-tertiary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-tertiary);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.disk-section,
.distribution-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

.disk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 1.5rem;
}

.disk-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  color: var(--text-primary);
}

.disk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.disk-info-left {
  display: flex;
  align-items: center;
}

.disk-icon {
  font-size: 2.5rem;
  margin-right: 1rem;
}

.disk-info {
  flex: 1;
}

.disk-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--text-primary);
}

.disk-type {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.disk-drive {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
}

.storage-bars {
  position: relative;
  height: 32px;
  margin-bottom: 1rem;
}

.storage-bar-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.storage-bar-total {
  height: 100%;
  background: var(--border-color);
  border-radius: var(--radius-sm);
}

.storage-bar-used {
  height: 100%;
  background: linear-gradient(90deg, var(--success-color), #a4d007);
  border-radius: var(--radius-sm);
  transition: width var(--transition-slow) ease;
}

.storage-bar-resources {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-hover));
  border-radius: var(--radius-sm);
  transition: width var(--transition-slow) ease;
}

.storage-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-total {
  background: var(--border-color);
}

.legend-used {
  background: linear-gradient(90deg, var(--success-color), #a4d007);
}

.legend-resources {
  background: linear-gradient(90deg, var(--accent-color), var(--accent-hover));
}

.legend-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.filter-section {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.filter-group select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.distribution-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.distribution-card h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.distribution-label {
  width: 80px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.distribution-bar-wrapper {
  flex: 1;
  height: 20px;
  background: var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), var(--accent-hover));
  border-radius: 10px;
  transition: width var(--transition-slow) ease;
}

.distribution-value {
  width: 150px;
  text-align: right;
  font-size: 0.85rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}
</style>
