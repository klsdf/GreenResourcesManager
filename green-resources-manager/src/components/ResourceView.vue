<template>
  <div class="resource-view-wrapper">
    <!-- 所有页面都使用通用组件（根据配置自动生成） -->
    <GenericResourceView 
      ref="innerView"
      :key="pageConfig.id"
      :page-config="pageConfig"
      @filter-data-updated="$emit('filter-data-updated', $event)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { PageConfig } from '../types/page';
import GenericResourceView from './GenericResourceView.vue';

export default defineComponent({
  name: 'ResourceView',
  components: {
    GenericResourceView
  },
  props: {
    pageConfig: {
      type: Object as PropType<PageConfig>,
      required: true
    }
  },
  emits: ['filter-data-updated'],
  setup(props, { emit, expose: exposeFn }) {
    const innerView = ref(null);

    // Expose updateFilterData method to parent
    const updateFilterData = () => {
      if (innerView.value && (innerView.value as any).updateFilterData) {
        (innerView.value as any).updateFilterData();
      }
    };

    // Expose handleFilterEvent method to parent
    const handleFilterEvent = (event: string, data: any) => {
      if (innerView.value && (innerView.value as any).handleFilterEvent) {
        (innerView.value as any).handleFilterEvent(event, data);
      }
    };

    watch(
      () => innerView.value,
      (v) => {
        if (v && (v as any).updateFilterData) {
          nextTick(() => {
            try {
              (v as any).updateFilterData();
            } catch (e) {
              console.warn('[ResourceView] 初始化过滤失败:', e);
            }
          });
        }
      },
      { flush: 'post' }
    );

    // 监听全局筛选器事件（避免通过 ref 访问的问题）
    const handleGlobalFilterEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, detail } = customEvent;
      if (innerView.value && (innerView.value as any).handleFilterEvent) {
        (innerView.value as any).handleFilterEvent(type, detail);
      }
    };

    // 监听全局筛选器数据更新请求
    const handleFilterUpdateRequest = () => {
      if (innerView.value && (innerView.value as any).updateFilterData) {
        (innerView.value as any).updateFilterData();
      }
    };

    /**
     * 筛选栏顶部的搜索词变了，交给这一页原来的搜索。
     * @param event 带当前搜索词的事件
     */
    const handleResourceSearch = (event: Event) => {
      const text = (event as CustomEvent).detail
      const view = innerView.value as { handleSearchQueryChanged?: (value: string) => void } | null
      if (view?.handleSearchQueryChanged) {
        view.handleSearchQueryChanged(typeof text === 'string' ? text : '')
      }
    };

    // 在组件挂载时添加事件监听
    onMounted(() => {
      window.addEventListener('filter-select', handleGlobalFilterEvent);
      window.addEventListener('filter-exclude', handleGlobalFilterEvent);
      window.addEventListener('filter-clear', handleGlobalFilterEvent);
      window.addEventListener('filter-request-update', handleFilterUpdateRequest);
      window.addEventListener('resource-search', handleResourceSearch);
    });

    onUnmounted(() => {
      window.removeEventListener('filter-select', handleGlobalFilterEvent);
      window.removeEventListener('filter-exclude', handleGlobalFilterEvent);
      window.removeEventListener('filter-clear', handleGlobalFilterEvent);
      window.removeEventListener('filter-request-update', handleFilterUpdateRequest);
      window.removeEventListener('resource-search', handleResourceSearch);
    });

    // 使用 expose API 显式暴露方法给父组件
    exposeFn({
      updateFilterData,
      handleFilterEvent
    });

    return {
      innerView,
      updateFilterData,
      handleFilterEvent
    };
  }
});
</script>

<style scoped>
.resource-view-wrapper {
  height: 100%;
  width: 100%;
}
</style>
