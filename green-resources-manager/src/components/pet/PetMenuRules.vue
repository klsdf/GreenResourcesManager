<template>
  <div class="menu-rules">
    <div class="rules-header">
      <h3 class="rules-title">{{ $lt('玩法') }}</h3>
      <p class="rules-subtitle">{{ $lt('游戏规则说明') }}</p>
    </div>
    
    <!-- 规则内容区域 -->
    <div class="rules-content">
      <!-- 基本循环 -->
      <div class="rule-section">
        <h4 class="section-title">{{ $lt('基本循环') }}</h4>
        <div class="rule-blocks">
          <div class="rule-block">
            <div class="rule-number">1</div>
            <div class="rule-text">{{ $lt('收集的游戏、漫画、视频等资源会定时产生收益') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">2</div>
            <div class="rule-text">{{ $lt('用这些收益可以购买食物、礼物等物品，提升桌宠的好感度') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">3</div>
            <div class="rule-text">{{ $lt('好感度达到一定程度后，可以解锁好感剧情、开放更多的商店内容等') }}</div>
          </div>
          <div class="rule-block"> 
            <div class="rule-number">4</div>
            <div class="rule-text">{{ $lt('随着内容的开放，你可以购买更加强力的道具来提升收益') }}</div>
          </div>
        </div>
      </div>

      <!-- 宠物养成 -->
      <div class="rule-section">
        <h4 class="section-title">{{ $lt('宠物的欲望') }}</h4>
        <div class="rule-blocks">
          <div class="rule-block">
            <div class="rule-number">1</div>
            <div class="rule-text">{{ $lt('桌宠有三大欲♂望，分别是食欲、睡眠欲和性欲') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">2</div>
            <div class="rule-text">{{ $lt('三大欲望会随着时间推移而不断增加') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">3</div>
            <div class="rule-text">{{ $lt('你需要花钱去购买商品来解决宠物的三大欲望') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">4</div>
            <div class="rule-text">{{ $lt('如果欲望没有被满足，宠物的好感度会下降') }}</div>
          </div>

          <div class="rule-block">
            <div class="rule-number">5</div>
            <div class="rule-text">{{ $lt('食欲需要靠东西来解决，可以在商店购买食物') }}</div>
          </div>
          <div class="rule-block">
            <div class="rule-number">6</div>
            <div class="rule-text">{{ $lt('睡眠欲需要靠睡觉来解决，') }}</div>
          </div>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
// 玩法页面 - 显示游戏规则
</script>

<style scoped>
.menu-rules {
  padding: 10px 0;
}

.rules-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.rules-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.rules-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.rules-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rule-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #4a90e2;
}

.rule-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #4a90e2;
  transition: all 0.2s;
}

.rule-block:hover {
  background: #f0f0f0;
  border-left-color: #357abd;
  transform: translateX(2px);
}

.rule-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
}

.rule-text {
  flex: 1;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  padding-top: 2px;
}
</style>

