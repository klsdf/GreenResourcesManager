<template>
  <div class="fun-rate">
    <div 
      class="fun-rate__stars" 
      @mouseleave="handleStarMouseLeave"
    >
      <span 
        v-for="star in maxStars" 
        :key="star"
        class="fun-rate__star"
        :class="{ 'fun-rate__star--filled': star <= currentRating }"
        @mouseenter="handleStarMouseEnter(star)"
        @click="handleStarClick(star)"
      >
        {{ starIcon }}
      </span>
      <span 
        v-if="showText" 
        class="fun-rate__text" 
        :class="{ 'fun-rate__text--no-rating': currentRating === 0 }"
      >
        {{ currentRating > 0 ? getRatingText(currentRating) : noRatingText }}
      </span>
    </div>
    <div v-if="showComment" class="fun-rate__comment">
      <textarea
        class="fun-rate__comment-input"
        :value="comment"
        @input="handleCommentInput"
        @blur="handleCommentBlur"
        :placeholder="commentPlaceholder"
        :rows="commentRows"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  /** 当前评分值（0-5） */
  modelValue?: number
  /** 最大星级数 */
  maxStars?: number
  /** 是否显示文字说明 */
  showText?: boolean
  /** 是否显示评论输入框 */
  showComment?: boolean
  /** 评论内容 */
  comment?: string
  /** 评论输入框占位符 */
  commentPlaceholder?: string
  /** 评论输入框行数 */
  commentRows?: number
  /** 未评分时的文字 */
  noRatingText?: string
  /** 星级图标 */
  starIcon?: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  maxStars: 5,
  showText: true,
  showComment: false,
  comment: '',
  commentPlaceholder: '在此输入你的评价...',
  commentRows: 4,
  noRatingText: '未评价',
  starIcon: '★',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'update:comment': [value: string]
  change: [rating: number]
  'comment-change': [comment: string]
}>()

const hoverRating = ref(0)

const currentRating = computed(() => {
  return hoverRating.value > 0 ? hoverRating.value : (props.modelValue || 0)
})

function handleStarMouseEnter(star: number) {
  if (!props.disabled) {
    hoverRating.value = star
  }
}

function handleStarMouseLeave() {
  hoverRating.value = 0
}

function handleStarClick(star: number) {
  if (props.disabled) return
  
  emit('update:modelValue', star)
  emit('change', star)
  hoverRating.value = 0
}

function getRatingText(rating: number): string {
  const ratingMap: Record<number, string> = {
    1: '劣作',
    2: '庸作',
    3: '良作',
    4: '佳作',
    5: '神作'
  }
  return ratingMap[rating] || ''
}

function handleCommentInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:comment', target.value)
  emit('comment-change', target.value)
}

function handleCommentBlur(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:comment', target.value)
  emit('comment-change', target.value)
}
</script>

<style scoped lang="scss">
.fun-rate {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fun-rate__stars {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.fun-rate__star {
  font-size: 1.5rem;
  color: var(--text-tertiary);
  transition: all var(--transition-base);
  line-height: 1;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    transform: scale(1.1);
  }
  
  &--filled {
    color: #fbbf24;
  }
}

.fun-rate__text {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-left: var(--spacing-xs);
  transition: color var(--transition-base);
  
  &--no-rating {
    color: var(--text-tertiary);
    font-style: italic;
    margin-left: 0;
  }
}

.fun-rate__comment {
  margin-top: var(--spacing-md);
}

.fun-rate__comment-input {
  width: 100%;
  min-height: 80px;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  transition: all var(--transition-base);
  
  &:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-color-20);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}
</style>
