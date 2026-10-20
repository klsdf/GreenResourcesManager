<template>
  <div class="menu-status">
    <div class="status-section">
      <div class="status-item">
        <span class="status-label">{{ $lt('食欲') }}</span>
        <div class="status-bar-container">
          <div class="status-bar appetite" :style="{ width: appetite + '%' }">
            <span class="status-value">{{ appetite }}</span>
          </div>
        </div>
      </div>
      <div class="status-item">
        <span class="status-label">{{ $lt('睡眠欲') }}</span>
        <div class="status-bar-container">
          <div class="status-bar sleepiness" :style="{ width: sleepiness + '%' }">
            <span class="status-value">{{ sleepiness }}</span>
          </div>
        </div>
      </div>
      <div class="status-item">
        <span class="status-label">{{ $lt('性欲') }}</span>
        <div class="status-bar-container">
          <div class="status-bar libido" :style="{ width: libido + '%' }">
            <span class="status-value">{{ libido }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 调试信息面板 -->
    <div v-if="debugMode" class="debug-section">
      <div class="menu-section-title">{{ $lt('调试信息') }}</div>
      <div class="debug-info-panel">
        <div class="debug-info-item">
          <span class="debug-info-label">{{ $lt('调试模式：') }}</span>{{ debugInfo.mode }}
        </div>
        <div v-if="debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('点击坐标：') }}</span>({{ debugInfo.clickData.pixelX.toFixed(0) }},
          {{ debugInfo.clickData.pixelY.toFixed(0) }})
        </div>
        <div v-if="debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('相对坐标：') }}</span>({{ (debugInfo.clickData.relativeX * 100).toFixed(1) }}%,
          {{ (debugInfo.clickData.relativeY * 100).toFixed(1) }}%)
        </div>
        <div v-if="debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('区域：') }}</span>{{ debugInfo.clickData.region.name }}
        </div>
        <div v-if="debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('区域范围：') }}</span>X: [{{ (debugInfo.clickData.region.x[0] * 100).toFixed(1) }}%,
          {{ (debugInfo.clickData.region.x[1] * 100).toFixed(1) }}%], Y: [{{ (debugInfo.clickData.region.y[0] * 100).toFixed(1) }}%,
          {{ (debugInfo.clickData.region.y[1] * 100).toFixed(1) }}%]
        </div>
        <div v-if="!debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('点击坐标：') }}</span>{{ $lt('未点击') }} </div>
        <div v-if="!debugInfo.clickData" class="debug-info-item">
          <span class="debug-info-label">{{ $lt('区域：') }}</span>{{ $lt('无') }} </div>
        <div v-if="debugInfo.message" class="debug-info-item" style="margin-top: 10px; color: #4a90e2">
          {{ debugInfo.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  appetite: number
  sleepiness: number
  libido: number
  debugMode: boolean
  debugInfo: {
    mode: string
    clickData: any
    message?: string
  }
}>()
</script>

<style scoped>
.menu-status {
  padding: 10px 0;
}

.status-section {
  margin-bottom: 20px;
}

.status-item {
  margin-bottom: 20px;
}

.status-label {
  display: block;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}

.status-bar-container {
  width: 100%;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.status-bar {
  height: 100%;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  transition: width 0.3s ease;
  min-width: 30px;
}

.status-bar.appetite {
  background: linear-gradient(90deg, #ff9800 0%, #f57c00 100%);
}

.status-bar.sleepiness {
  background: linear-gradient(90deg, #9c27b0 0%, #7b1fa2 100%);
}

.status-bar.libido {
  background: linear-gradient(90deg, #e91e63 0%, #c2185b 100%);
}

.status-value {
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.debug-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.menu-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #666;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.debug-info-panel {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  font-family: monospace;
  margin-top: 10px;
}

.debug-info-item {
  margin-bottom: 5px;
  line-height: 1.4;
}

.debug-info-label {
  color: #4a90e2;
  font-weight: bold;
}
</style>

