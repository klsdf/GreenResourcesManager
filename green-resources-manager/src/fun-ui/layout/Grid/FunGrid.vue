<template>
  <div 
    class="fun-grid" 
    :class="gridClasses"
    :style="gridStyles"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 
   * 列数（固定列数模式）
   * 当 mode 为 'fixed' 时使用
   */
  columns?: number
  /** 
   * 最小列宽（px），在 auto-fill/auto-fit 模式下使用
   * 如果同时提供了 scale 和 baseWidth，则会被动态计算的值覆盖
   * 默认: 200
   */
  minWidth?: number | string
  /** 
   * 最大列宽，在 auto-fill/auto-fit 模式下使用
   * 默认: '1fr'
   */
  maxWidth?: string
  /** 
   * 布局模式
   * - 'auto-fill': 自动填充，会创建尽可能多的列（即使为空）
   * - 'auto-fit': 自动适应，只创建有内容的列
   * - 'fixed': 固定列数
   * 默认: 'auto-fill'
   */
  mode?: 'auto-fill' | 'auto-fit' | 'fixed'
  /** 
   * 间距（支持 CSS 值，如 '16px', '1rem', 'var(--spacing-md)'）
   * 默认: 'var(--spacing-md, 16px)'
   */
  gap?: string | number
  /** 
   * 行间距（支持 CSS 值），如果未指定则使用 gap
   */
  rowGap?: string | number
  /** 
   * 列间距（支持 CSS 值），如果未指定则使用 gap
   */
  columnGap?: string | number
  /** 
   * 内边距（支持 CSS 值）
   */
  padding?: string | number
  /** 
   * 是否在移动端自动变为单列
   * 默认: true
   */
  singleColumnOnMobile?: boolean
  /** 
   * 缩放比例（0-100 或更大范围）
   * 当提供了 scale 和 baseWidth 时，minWidth 会根据公式动态计算：
   * minWidth = baseWidth * (scale / 100)
   * 默认: undefined（不使用缩放）
   */
  scale?: number
  /** 
   * 基础宽度（px），用于缩放计算
   * 当提供了 scale 和 baseWidth 时，minWidth 会根据公式动态计算
   * 默认: undefined（不使用缩放）
   */
  baseWidth?: number
  /** 
   * 缩放后的最小宽度限制（px）
   * 防止缩放后宽度过小
   * 默认: 100
   */
  minScaledWidth?: number
  /** 
   * 缩放后的最大宽度限制（px）
   * 防止缩放后宽度过大
   * 默认: undefined（无限制）
   */
  maxScaledWidth?: number
  /** 
   * 水平对齐方式
   * 默认: 'stretch'
   */
  justifyItems?: 'start' | 'end' | 'center' | 'stretch'
  /** 
   * 垂直对齐方式
   * 默认: 'stretch'
   */
  alignItems?: 'start' | 'end' | 'center' | 'stretch'
  /** 
   * 自定义样式对象，会合并到计算后的样式中
   */
  customStyle?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  columns: undefined,
  minWidth: 200,
  maxWidth: '1fr',
  mode: 'auto-fill',
  gap: 'var(--spacing-md, 16px)',
  rowGap: undefined,
  columnGap: undefined,
  padding: undefined,
  singleColumnOnMobile: true,
  scale: undefined,
  baseWidth: undefined,
  minScaledWidth: 100,
  maxScaledWidth: undefined,
  justifyItems: 'stretch',
  alignItems: 'stretch',
  customStyle: undefined
})

// 计算 CSS 类名
const gridClasses = computed(() => {
  const classes: string[] = ['fun-grid']
  
  if (props.mode === 'fixed' && props.columns) {
    classes.push(`fun-grid--fixed`)
    classes.push(`fun-grid--columns-${props.columns}`)
  } else if (props.mode === 'auto-fill') {
    classes.push('fun-grid--auto-fill')
  } else if (props.mode === 'auto-fit') {
    classes.push('fun-grid--auto-fit')
  }
  
  if (props.singleColumnOnMobile) {
    classes.push('fun-grid--responsive')
  }
  
  return classes
})

// 计算动态 minWidth（如果提供了 scale 和 baseWidth）
const computedMinWidth = computed(() => {
  // 如果提供了 scale 和 baseWidth，使用动态计算
  if (props.scale !== undefined && props.baseWidth !== undefined) {
    let scaledWidth = Math.round(props.baseWidth * (props.scale / 100))
    
    // 应用最小宽度限制
    if (props.minScaledWidth !== undefined) {
      scaledWidth = Math.max(scaledWidth, props.minScaledWidth)
    }
    
    // 应用最大宽度限制
    if (props.maxScaledWidth !== undefined) {
      scaledWidth = Math.min(scaledWidth, props.maxScaledWidth)
    }
    
    return scaledWidth
  }
  
  // 否则使用静态的 minWidth
  return props.minWidth
})

// 计算样式
const gridStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  // 处理间距
  if (props.rowGap !== undefined) {
    styles.rowGap = typeof props.rowGap === 'number' ? `${props.rowGap}px` : String(props.rowGap)
  } else if (props.gap !== undefined) {
    const gapValue = typeof props.gap === 'number' ? `${props.gap}px` : String(props.gap)
    styles.gap = gapValue
  }
  
  if (props.columnGap !== undefined) {
    styles.columnGap = typeof props.columnGap === 'number' ? `${props.columnGap}px` : String(props.columnGap)
  }
  
  // 处理内边距
  if (props.padding !== undefined) {
    styles.padding = typeof props.padding === 'number' ? `${props.padding}px` : String(props.padding)
  }
  
  // 处理对齐方式
  if (props.justifyItems !== 'stretch') {
    styles.justifyItems = props.justifyItems
  }
  if (props.alignItems !== 'stretch') {
    styles.alignItems = props.alignItems
  }
  
  // 处理列布局
  if (props.mode === 'fixed' && props.columns !== undefined) {
    styles.gridTemplateColumns = `repeat(${props.columns}, 1fr)`
  } else if (props.mode === 'auto-fill' || props.mode === 'auto-fit') {
    const minWidthValue = typeof computedMinWidth.value === 'number' 
      ? `${computedMinWidth.value}px` 
      : String(computedMinWidth.value)
    styles.gridTemplateColumns = `repeat(${props.mode}, minmax(${minWidthValue}, ${props.maxWidth}))`
  }
  
  // 合并自定义样式
  if (props.customStyle) {
    Object.assign(styles, props.customStyle)
  }
  
  return styles
})
</script>

<style scoped lang="scss">
.fun-grid {
  display: grid;
  width: 100%;
  
  // 响应式：移动端自动单列
  &.fun-grid--responsive {
    @media (max-width: 767px) {
      grid-template-columns: 1fr !important;
    }
  }
}
</style>