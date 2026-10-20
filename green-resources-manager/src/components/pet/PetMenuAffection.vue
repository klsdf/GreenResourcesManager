<template>
  <div class="menu-affection">
    <div class="affection-header">
      <h3 class="affection-title">{{ $lt('好感度') }}</h3>
      <p class="affection-subtitle">{{ $lt('与桌宠的亲密关系') }}</p>
    </div>
    
    <!-- 好感度显示 -->
    <div class="affection-section">
      <div class="affection-display-card">
        <div class="affection-icon">💕</div>
        <div class="affection-info">
          <div class="affection-label">{{ $lt('当前等级') }}</div>
          <div class="affection-value-large">Lv.{{ level }}</div>
          <div class="affection-exp-info">
            <div class="exp-text">{{ $lt('经验值：') }}{{ exp }} / {{ expRequired }}</div>
            <div class="affection-progress-container">
              <div class="affection-progress-bar" :style="{ width: expProgress + '%' }">
                <span class="affection-progress-text">{{ Math.round(expProgress) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 好感度剧情 -->
    <div class="story-section">
      <div class="section-header">
        <h4 class="section-title">{{ $lt('好感度剧情') }}</h4>
        <p class="section-subtitle">{{ $lt('随着好感度提升，解锁更多剧情') }}</p>
      </div>
      
      <div class="story-list">
        <!-- 占位符：剧情列表 -->
        <div class="story-item" v-for="n in 5" :key="n">
          <div class="story-icon">📖</div>
          <div class="story-info">
            <div class="story-title">{{ $lt('剧情') }} {{ n }}</div>
            <div class="story-description">{{ $lt('需要等级达到 Lv.') }}{{ n }} {{ $lt('解锁') }}</div>
            <div class="story-status" :class="{ unlocked: level >= n }">
              {{ level >= n ? '已解锁' : '未解锁' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  level: number
  exp: number
  expRequired: number
  expProgress: number
  totalExp: number
}>()
</script>

<style scoped>
.menu-affection {
  padding: 10px 0;
}

.affection-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.affection-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.affection-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.affection-section {
  margin-bottom: 30px;
}

.affection-display-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.affection-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.affection-info {
  flex: 1;
}

.affection-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.affection-value-large {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 12px;
}

.affection-exp-info {
  width: 100%;
}

.exp-text {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.affection-progress-container {
  width: 100%;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.affection-progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
  min-width: 60px;
}

.affection-progress-text {
  font-size: 12px;
  font-weight: bold;
  color: #667eea;
}

.story-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.section-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.story-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.story-item:hover {
  background: #f0f0f0;
  border-color: #4a90e2;
}

.story-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.story-info {
  flex: 1;
  min-width: 0;
}

.story-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.story-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.story-status {
  font-size: 11px;
  color: #999;
  font-weight: 500;
}

.story-status.unlocked {
  color: #4a90e2;
  font-weight: bold;
}
</style>

