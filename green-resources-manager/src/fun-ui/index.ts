/**
 * Fun UI 组件库
 * 所有组件都以 fun- 开头，如 <fun-button>
 * 
 * 组件分类：
 * - basic: 基本组件（按钮、图标等）
 * - data-input: 数据录入（输入框、评分等）
 * - data-display: 数据展示（卡片、列表等）
 * - navigation: 导航组件（菜单、标签页等）
 * - feedback: 反馈组件（对话框、提示等）
 */

import type { App } from 'vue'

// Basic 基本组件
import FunButton from './basic/Button/FunButton.vue'
import FunTag from './basic/Tag/FunTag.vue'
import FunSwitch from './basic/Switch/FunSwitch.vue'
import FunSlider from './basic/Slider/FunSlider.vue'
import FunInput from './basic/Input/FunInput.vue'

// Data Input 数据录入
import FunRate from './data-input/Rate/FunRate.vue'
import FunTagInput from './data-input/TagInput/FunTagInput.vue'
import FunTextarea from './data-input/Textarea/FunTextarea.vue'
import FunSelect from './data-input/Select/FunSelect.vue'
import FunDropZone from './data-input/DropZone/FunDropZone.vue'

// Data Display 数据展示
import FunBusinessCard from './data-display/BusinessCard/FunBusinessCard.vue'
import FunCard from './data-display/Card/FunCard.vue'
import FunEmptyState from './data-display/EmptyState/FunEmptyState.vue'
import FunStatistic from './data-display/Statistic/FunStatistic.vue'
import FunAchievementItem from './data-display/Achievement/FunAchievementItem.vue'
import FunCarousel from './data-display/Carousel/FunCarousel.vue'

// Navigation 导航组件
import FunPagination from './navigation/Pagination/FunPagination.vue'
import FunMenu from './navigation/Menu/FunMenu.vue'
import FunDropdown from './navigation/Dropdown/FunDropdown.vue'

// Layout 布局组件
import FunGrid from './layout/Grid/FunGrid.vue'

// Feedback 反馈组件
import FunAlert from './feedback/Alert/FunAlert.vue'
import FunConfirmDialog from './feedback/ConfirmDialog/FunConfirmDialog.vue'
import FunModal from './feedback/Modal/FunModal.vue'
import FunNotification from './feedback/Notification/FunNotification.vue'
import FunContextMenu from './feedback/ContextMenu/FunContextMenu.vue'

// 组件列表
const components = {
  // Basic
  FunButton,
  FunTag,
  FunSwitch,
  FunSlider,
  FunInput,
  // Data Input
  FunRate,
  FunTagInput,
  FunTextarea,
  FunSelect,
  FunDropZone,
  // Data Display
  FunBusinessCard,
  FunCard,
  FunEmptyState,
  FunStatistic,
  FunAchievementItem,
  FunCarousel,
  // Navigation
  FunPagination,
  FunMenu,
  FunDropdown,
  // Layout
  FunGrid,
  // Feedback
  FunAlert,
  FunConfirmDialog,
  FunModal,
  FunNotification,
  FunContextMenu
}

/**
 * 全局注册所有组件
 */
export function install(app: App) {
  // 注册为 fun- 格式
  app.component('fun-button', FunButton)
  app.component('fun-tag', FunTag)
  app.component('fun-switch', FunSwitch)
  app.component('fun-slider', FunSlider)
  app.component('fun-input', FunInput)
  app.component('fun-rate', FunRate)
  app.component('fun-tag-input', FunTagInput)
  app.component('fun-textarea', FunTextarea)
  app.component('fun-select', FunSelect)
  app.component('fun-drop-zone', FunDropZone)
  app.component('fun-business-card', FunBusinessCard)
  app.component('fun-card', FunCard)
  app.component('fun-empty-state', FunEmptyState)
  app.component('fun-statistic', FunStatistic)
  app.component('fun-achievement-item', FunAchievementItem)
  app.component('fun-carousel', FunCarousel)
  app.component('fun-pagination', FunPagination)
  app.component('fun-menu', FunMenu)
  app.component('fun-dropdown', FunDropdown)
  app.component('fun-grid', FunGrid)
  app.component('fun-alert', FunAlert)
  app.component('fun-confirm-dialog', FunConfirmDialog)
  app.component('fun-modal', FunModal)
  app.component('fun-notification', FunNotification)
  app.component('fun-context-menu', FunContextMenu)
}

// 导出所有组件
export {
  // Basic
  FunButton,
  FunTag,
  FunSwitch,
  FunSlider,
  FunInput,
  // Data Input
  FunRate,
  FunTagInput,
  FunTextarea,
  FunSelect,
  FunDropZone,
  // Data Display
  FunBusinessCard,
  FunCard,
  FunEmptyState,
  FunStatistic,
  FunAchievementItem,
  FunCarousel,
  // Navigation
  FunPagination,
  FunMenu,
  FunDropdown,
  // Layout
  FunGrid,
  // Feedback
  FunAlert,
  FunConfirmDialog,
  FunModal,
  FunNotification,
  FunContextMenu
}

// 默认导出（支持 app.use(FunUI)）
export default {
  install
}
