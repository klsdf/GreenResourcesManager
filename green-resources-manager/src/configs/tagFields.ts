/**
 * 标签字段注册表（前端镜像）
 * ============================================================================
 * 主进程以 electron/database/tagIndex.js 中的 TAG_FIELDS 为准（索引构建依据）。
 * 本文件为前端展示用镜像，新增标签型字段时两处需同步修改。
 *
 * 资源类型与 src/configs/resources/*.ts 的资源类一一对应。
 */

export interface TagFieldMeta {
  /** 字段名 */
  field: string
  /** 中文显示名 */
  label: string
}

export interface TagResourceMeta {
  /** 逻辑资源类型（与资源类名小写一致，也是 tag_refs.resource_type） */
  type: string
  /** 中文显示名 */
  label: string
  /** 标签型字段 */
  fields: TagFieldMeta[]
}

export const TAG_RESOURCE_REGISTRY: TagResourceMeta[] = [
  {
    type: 'game',
    label: '游戏',
    fields: [
      { field: 'tags', label: '标签' },
      { field: 'developers', label: '开发商' },
      { field: 'publisher', label: '发行商' }
    ]
  },
  {
    type: 'manga',
    label: '漫画',
    fields: [
      { field: 'tags', label: '漫画标签' },
      { field: 'author', label: '作者' }
    ]
  },
  {
    type: 'videoFolder',
    label: '番剧',
    fields: [
      { field: 'tags', label: '视频标签' },
      { field: 'actors', label: '演员' },
      { field: 'voiceActors', label: '声优' },
      { field: 'productionTeam', label: '制作组' }
    ]
  },
  {
    type: 'video',
    label: '视频',
    fields: [
      { field: 'tags', label: '视频标签' },
      { field: 'actors', label: '演员' }
    ]
  },
  {
    type: 'novel',
    label: '小说',
    fields: [
      { field: 'tags', label: '小说标签' }
    ]
  },
  {
    type: 'audio',
    label: '音频',
    fields: [
      { field: 'tags', label: '标签' },
      { field: 'actors', label: '演员' }
    ]
  },
  {
    type: 'website',
    label: '网站',
    fields: [
      { field: 'tags', label: '网站标签' }
    ]
  },
  {
    type: 'software',
    label: '软件',
    fields: [
      { field: 'tags', label: '软件标签' }
    ]
  },
  {
    type: 'singleImage',
    label: '单图',
    fields: [
      { field: 'tags', label: '图片标签' }
    ]
  },
  {
    type: 'other',
    label: '其他',
    fields: [
      { field: 'tags', label: '资源标签' }
    ]
  }
]

/** 快速查表：type:field → 中文标签 */
export const FIELD_LABEL_MAP: Record<string, string> = {}
for (const res of TAG_RESOURCE_REGISTRY) {
  for (const f of res.fields) {
    FIELD_LABEL_MAP[`${res.type}:${f.field}`] = f.label
  }
}
