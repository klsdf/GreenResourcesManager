<template>
  <aside class="collection-panel">
    <div class="collection-panel__cover">
      <img v-if="coverUrl" :src="coverUrl" alt="" @error="coverFailed = true" v-show="!coverFailed">
      <span v-if="!coverUrl || coverFailed">{{ nameInitial }}</span>
    </div>
    <label class="collection-panel__field">
      <span>名称</span>
      <input v-model="draftName" type="text" class="collection-panel__input">
    </label>
    <label class="collection-panel__field">
      <span>简介</span>
      <textarea v-model="draftDescription" rows="3" class="collection-panel__input"></textarea>
    </label>
    <div class="collection-panel__field">
      <span>标签</span>
      <div class="collection-panel__tags">
        <button v-for="tag in draftTags" :key="tag" type="button" class="collection-panel__tag" @click="removeTag(tag)">{{ tag }} ×</button>
      </div>
      <input v-model="tagDraft" type="text" class="collection-panel__input" placeholder="输入后回车添加" @keyup.enter="addTag">
    </div>
    <label v-for="field in extraDrafts" :key="field.key" class="collection-panel__field">
      <span>{{ field.label }}</span>
      <input v-if="field.kind === 'text'" v-model="field.text" type="text" class="collection-panel__input">
      <input v-else v-model="field.text" type="text" class="collection-panel__input" placeholder="多个用顿号分隔">
    </label>
    <button type="button" class="collection-panel__save" @click="submit">保存资料</button>
    <div class="collection-panel__rating">
      <h4>评价</h4>
      <fun-rate
        :model-value="rating"
        :comment="comment"
        show-comment
        :comment-rows="3"
        @update:model-value="emit('rate', $event)"
        @update:comment="emit('comment', $event)"
      />
    </div>
    <div class="collection-panel__totals">
      <h4>总数据</h4>
      <p><span>成员</span><strong>{{ memberCount }}</strong></p>
      <p v-for="row in totals" :key="row.label"><span>{{ row.label }}</span><strong>{{ row.text }}</strong></p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 合集自己的一项资料。
 * text 是单行，tags 在输入框里用顿号隔开，保存时再拆回数组。
 */
export interface CollectionProfileField {
	/** 写回合集的字段名 */
	key: string
	/** 输入框前的名称 */
	label: string
	/** 文本或标签 */
	kind: 'text' | 'tags'
	/** 当前值 */
	value: string | string[]
}

/**
 * 已经格式化好的一行合计。
 */
export interface CollectionTotalRow {
	/** 行名，例如游玩时长 */
	label: string
	/** 给人看的数字或时长 */
	text: string
}

const props = defineProps<{
	/** 当前合集 id。换一层时用它把输入框刷成新合集的值。 */
	collectionId: string
	/** 合集名称 */
	name: string
	/** 合集简介 */
	description: string
	/** 合集标签 */
	tags: string[]
	/** 这一页额外要编辑的系列、演员等 */
	extraFields: CollectionProfileField[]
	/** 只读总数据 */
	totals: CollectionTotalRow[]
	/** 子树里的普通资源数量 */
	memberCount: number
	/** 封面地址。空着就显示名称首字。 */
	coverUrl: string
	/** 合集自己的星级，0 表示还没评。 */
	rating: number
	/** 合集自己的短评。 */
	comment: string
}>()

const emit = defineEmits<{
	/**
	 * 把改过的资料交出去保存。
	 * 总数据不在这里，它由成员算出，不能手改。
	 */
	save: [payload: { name: string, description: string, tags: string[], extras: Record<string, string | string[]> }]
	/**
	 * 点了星。星级马上保存，不跟下面的「保存资料」绑在一起。
	 */
	rate: [rating: number]
	/**
	 * 短评内容变了。松开输入框时由父组件写入合集。
	 */
	comment: [comment: string]
}>()

/** 名称草稿。和合集记录分开，避免每敲一个字就写进存档。 */
const draftName = ref('')
/** 简介草稿。 */
const draftDescription = ref('')
/** 标签草稿。 */
const draftTags = ref<string[]>([])
/** 还没回车的那一个标签。 */
const tagDraft = ref('')
/** 封面加载失败时改显示首字。 */
const coverFailed = ref(false)
/**
 * 系列名、演员等草稿。
 * text 统一用字符串，标签在保存时按顿号拆开。
 */
const extraDrafts = ref<{ key: string, label: string, kind: 'text' | 'tags', text: string }[]>([])

/** 封面上的字。没有图时用名称的第一个字。 */
const nameInitial = computed(() => (draftName.value || props.name || '合').slice(0, 1))

/**
 * 把父组件传来的合集抄进草稿。
 * 只在换合集时抄，避免保存后父组件刷新把用户正在输入的字盖掉。
 */
const loadDraft = () => {
	draftName.value = props.name || ''
	draftDescription.value = props.description || ''
	draftTags.value = [...(props.tags || [])]
	tagDraft.value = ''
	coverFailed.value = false
	extraDrafts.value = (props.extraFields || []).map(field => ({
		key: field.key,
		label: field.label,
		kind: field.kind,
		text: Array.isArray(field.value) ? field.value.join('、') : String(field.value || '')
	}))
}

watch(() => props.collectionId, loadDraft, { immediate: true })
watch(() => props.coverUrl, () => {
	coverFailed.value = false
})

/**
 * 加一个标签。空白和重复的不加。
 */
const addTag = () => {
	const tag = tagDraft.value.trim()
	tagDraft.value = ''
	if (!tag || draftTags.value.includes(tag)) return
	draftTags.value = [...draftTags.value, tag]
}

/**
 * 去掉一个标签。
 * @param tag 要去掉的文字
 */
const removeTag = (tag: string) => {
	draftTags.value = draftTags.value.filter(item => item !== tag)
}

/**
 * 提交草稿。
 * 标签按顿号、逗号拆开，空段丢掉。
 */
const submit = () => {
	/** 系列、演员等写回用的值。 */
	const extras: Record<string, string | string[]> = {}
	for (const field of extraDrafts.value) {
		if (field.kind === 'tags') {
			extras[field.key] = field.text.split(/[、,，]/).map(item => item.trim()).filter(Boolean)
		} else {
			extras[field.key] = field.text.trim()
		}
	}
	emit('save', {
		name: draftName.value.trim(),
		description: draftDescription.value.trim(),
		tags: [...draftTags.value],
		extras
	})
}
</script>

<style scoped>
.collection-panel {
  width: 260px;
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 16px 16px 0;
  border-right: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.collection-panel__cover {
  height: 140px;
  border-radius: 12px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 2rem;
}

.collection-panel__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collection-panel__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.collection-panel__input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: vertical;
}

.collection-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.collection-panel__tag {
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 2px 8px;
  cursor: pointer;
}

.collection-panel__save {
  border: none;
  background: var(--accent-color, #3b82f6);
  color: white;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.collection-panel__rating h4 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.collection-panel__totals {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.collection-panel__totals h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.collection-panel__totals p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  color: var(--text-secondary);
}

.collection-panel__totals strong {
  color: var(--text-primary);
  font-weight: 600;
}

@media (max-width: 800px) {
  .collection-panel {
    width: 100%;
    flex-basis: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 0 0 16px;
    max-height: none;
    position: static;
  }
}
</style>
