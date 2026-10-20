<template>
  <div class="menu-inventory">
    <div class="inventory-header">
      <h3 class="inventory-title">{{ $lt('仓库') }}</h3>
      <p class="inventory-subtitle">{{ $lt('查看你拥有的物品') }}</p>
    </div>
    
    <div class="inventory-items">
      <div class="inventory-item" v-for="item in inventoryItems" :key="item.id">
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-count">{{ $lt('数量：') }}{{ item.count }}</div>
        </div>
        <button 
          class="use-button" 
          v-if="item.usable"
          @click="useItem(item)"
        > {{ $lt('使用') }} </button>
      </div>
    </div>
    
    <div v-if="inventoryItems.length === 0" class="empty-state">
      <p>{{ $lt('仓库是空的') }}</p>
      <p class="empty-hint">{{ $lt('去商店购买物品吧！') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface InventoryItem {
  id: string
  name: string
  count: number
  icon: string
  usable?: boolean
  effect?: {
    affection?: number
    appetite?: number
    sleepiness?: number
    libido?: number
  }
}

const props = defineProps<{
  inventoryItems: InventoryItem[]
}>()

const emit = defineEmits<{
  use: [item: InventoryItem]
}>()

function useItem(item: InventoryItem) {
  if (item.usable && item.count > 0) {
    emit('use', item)
  }
}
</script>

<style scoped>
.menu-inventory {
  padding: 10px 0;
}

.inventory-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.inventory-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.inventory-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.inventory-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inventory-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.inventory-item:hover {
  background: #f0f0f0;
  border-color: #4a90e2;
}

.item-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.item-count {
  font-size: 12px;
  color: #666;
}

.use-button {
  padding: 6px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.use-button:hover {
  background: #357abd;
  transform: translateY(-1px);
}

.use-button:active {
  transform: translateY(0);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  color: #ccc;
}
</style>

