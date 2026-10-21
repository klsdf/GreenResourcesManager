import {
  FormField,
  FormField_Checkbox,
  FormField_Date,
  FormField_Number,
  FormField_Select,
  FormField_SelectEngine,
  FormField_SelectFile,
  FormField_SelectFolder,
  FormField_SelectGameCover,
  FormField_SelectMangaCover,
  FormField_SelectSingleImageFile,
  FormField_SelectVideoThumbnail,
  FormField_Tags,
  FormField_Text,
  FormField_Textarea
} from '../resources/base/FormField'

/**
 * 页面可以自己增加的编辑方式。
 * 引擎、文件、封面仍从原有资源类借编辑框，因为那些框带着检测和选文件，不能当成普通文本。
 */
export type PageFieldEditor =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'engine'
  | 'file'
  | 'folder'
  | 'cover'
  | 'select'

/**
 * 某一页自己的字段定义。
 * 值不存在这里，值写在资源记录上。这里只决定这一页显示什么、用哪种编辑框。
 */
export interface PageFieldDef {
  /** 写进资源记录的键。改显示名不改键，旧值才还读得到 */
  key: string
  /** 这一页上给用户看的名字 */
  label: string
  /** 编辑框种类 */
  editor: PageFieldEditor
}

/**
 * 新建字段时可以选的种类。
 * 文件、封面、引擎不放进来，那些必须沿用已有字段，避免造出一个没有选文件能力的假封面框。
 */
export const SIMPLE_PAGE_FIELD_EDITORS: Array<{ id: PageFieldEditor; label: string }> = [
  { id: 'text', label: '文本' },
  { id: 'textarea', label: '多行文本' },
  { id: 'tags', label: '标签' },
  { id: 'number', label: '数字' },
  { id: 'date', label: '日期' }
]

/**
 * 不能当成页面自定义字段的键。
 * 这些键被存档或类自己占用，写进去会把 id、类型或保留袋盖掉。
 */
export const RESERVED_FIELD_KEYS = new Set(['id', 'resourceType', 'retainedFields', 'fileExists', 'fingerprint'])

/**
 * 判断是不是页面可以随意改类型的普通字段。
 * @param editor 编辑框种类
 */
export function isSimpleEditor(editor: string): boolean {
  return SIMPLE_PAGE_FIELD_EDITORS.some(item => item.id === editor)
}

/**
 * 编辑框种类对应的中文名。
 * @param editor 编辑框种类
 */
export function editorLabel(editor: string): string {
  const simple = SIMPLE_PAGE_FIELD_EDITORS.find(item => item.id === editor)
  if (simple) return simple.label
  if (editor === 'engine') return '引擎'
  if (editor === 'file') return '文件'
  if (editor === 'folder') return '文件夹'
  if (editor === 'cover') return '封面'
  if (editor === 'checkbox') return '勾选'
  if (editor === 'select') return '选项'
  return '文本'
}

/**
 * 按编辑框给出空值。
 * 标签必须是数组，数字必须是 0，这样编辑框不会在第一次打开时拿到 undefined。
 * @param editor 编辑框种类
 */
export function defaultValueForEditor(editor: string): any {
  if (editor === 'tags') return []
  if (editor === 'number') return 0
  if (editor === 'checkbox') return false
  return ''
}

/**
 * 生成一个不会和已有字段撞车的键。
 * 显示名可以是中文，键不用中文，避免存档键里夹杂空格和标点。
 */
export function createCustomFieldKey(): string {
  return `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 记录上本来就有、但不一定出现在编辑框里的排序项。
 * 排序下拉用显示名，不再让人填写 addedDate 这种键。页面字段里已有的同名键以页面上的名字为准。
 */
export const BUILTIN_SORT_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'addedDate', label: '添加时间' },
  { field: 'rating', label: '星级' },
  { field: 'playTime', label: '使用时长' },
  { field: 'lastPlayed', label: '最后使用时间' },
  { field: 'lastRead', label: '最后阅读' },
  { field: 'lastViewed', label: '最后查看' },
  { field: 'pagesCount', label: '页数' },
  { field: 'viewCount', label: '查看次数' },
  { field: 'readProgress', label: '阅读进度' }
]

/**
 * 编辑页里的一条排序。
 * 只记字段和显示名。升序、降序在保存时各写一条，工具栏用旁边的箭头切换。
 */
export interface SortChoice {
  /** 用来比较大小的字段键 */
  field: string
  /** 下拉里给用户看的名字，不含升序或降序 */
  label: string
}

/**
 * 去掉标签里的升序、降序，留下字段名。
 * @param label 原来的排序标签
 */
export function stripSortOrderLabel(label: string): string {
  return String(label || '').replace(/（(升序|降序)）/g, '').replace(/\((升序|降序)\)/g, '').trim()
}

/**
 * 把成对的升序、降序收成一条，方便在页面配置里只选字段。
 * @param options 页面配置里的排序选项
 */
export function collapseSortOptions(options: Array<{ label?: string; field?: string }> | undefined): SortChoice[] {
  const seen = new Map<string, SortChoice>()
  for (const option of options || []) {
    const field = String(option?.field || '').trim()
    if (!field) continue
    const raw = String(option?.label || field)
    const stripped = stripSortOrderLabel(raw) || field
    const current = seen.get(field)
    if (!current) {
      seen.set(field, { field, label: stripped })
      continue
    }
    if (!/升序|降序/.test(raw)) current.label = stripped
  }
  return [...seen.values()]
}

/**
 * 每种排序写成升序和降序两条。
 * 工具栏仍然按原来的 id 切换方向，页面配置不用再让人各填一遍。
 * @param choices 编辑页里每种排序一条
 */
export function expandSortOptions(choices: SortChoice[]): Array<{ id: string; label: string; field: string; order: 'asc' | 'desc' }> {
  const result: Array<{ id: string; label: string; field: string; order: 'asc' | 'desc' }> = []
  const used = new Set<string>()
  for (const choice of choices) {
    const field = String(choice?.field || '').trim()
    if (!field || used.has(field)) continue
    used.add(field)
    const label = String(choice.label || '').trim() || field
    result.push({ id: `${field}-asc`, label, field, order: 'asc' })
    result.push({ id: `${field}-desc`, label: `${label}（降序）`, field, order: 'desc' })
  }
  return result
}

/**
 * 从编辑框实例看出它属于哪一种。
 * 页面配置要记下种类，下次打开才能画出同样的框，而不是退回普通文本。
 * @param editType 资源类上的编辑框
 */
export function editorKindOf(editType: FormField | null): PageFieldEditor {
  if (editType instanceof FormField_SelectEngine) return 'engine'
  if (editType instanceof FormField_SelectGameCover || editType instanceof FormField_SelectMangaCover || editType instanceof FormField_SelectVideoThumbnail) return 'cover'
  if (editType instanceof FormField_SelectFile || editType instanceof FormField_SelectSingleImageFile) return 'file'
  if (editType instanceof FormField_SelectFolder) return 'folder'
  if (editType instanceof FormField_Tags) return 'tags'
  if (editType instanceof FormField_Date) return 'date'
  if (editType instanceof FormField_Number) return 'number'
  if (editType instanceof FormField_Checkbox) return 'checkbox'
  if (editType instanceof FormField_Textarea) return 'textarea'
  if (editType instanceof FormField_Select) return 'select'
  return 'text'
}

/**
 * 按页面字段定义做一个新的编辑框。
 * 只用于这一页新加的普通字段。引擎和封面要去资源类上借原有的框。
 * @param def 页面字段定义
 */
export function createFormField(def: PageFieldDef): FormField {
  const label = def.label || def.key
  if (def.editor === 'textarea') return new FormField_Textarea(label, false)
  if (def.editor === 'tags') return new FormField_Tags(label, false)
  if (def.editor === 'number') return new FormField_Number(label, false)
  if (def.editor === 'date') return new FormField_Date(label, false)
  if (def.editor === 'checkbox') return new FormField_Checkbox(label, false)
  return new FormField_Text(label, false)
}

/**
 * 把存档里的编辑框种类收成已知值。
 * 旧配置或写坏的配置不会因此画出一个不存在的框。
 * @param editor 读到的种类
 */
export function normalizeEditor(editor: unknown): PageFieldEditor {
  const text = String(editor || '')
  const known: PageFieldEditor[] = ['text', 'textarea', 'tags', 'number', 'date', 'checkbox', 'engine', 'file', 'folder', 'cover', 'select']
  return known.includes(text as PageFieldEditor) ? text as PageFieldEditor : 'text'
}

/**
 * 判断一段配置是不是字段定义。
 * @param value 页面配置里的一项
 */
function isFieldDef(value: any): value is PageFieldDef {
  return !!value && typeof value.key === 'string' && value.key.trim() !== ''
}

/**
 * 目录里一条已有字段，用来给没单独存过定义的旧页面补上名字和编辑框。
 */
export interface CatalogFieldSeed {
  /** 字段键 */
  key: string
  /** 原来的显示名 */
  label: string
  /** 原来的编辑框种类 */
  editor: PageFieldEditor
}

/**
 * 按页面字段名单整理出这一页的字段定义。
 * 旧页面只有键没有定义时，用资源类目录里的名字补上。页面之后改过的名字以页面自己存的定义为准。
 * @param keys 这一页要显示的字段键，顺序就是编辑框顺序
 * @param saved 页面配置里已经存下的定义
 * @param catalog 资源类上已有字段的目录
 */
export function defsForPage(keys: string[], saved: unknown, catalog: CatalogFieldSeed[]): PageFieldDef[] {
  const savedDefs = Array.isArray(saved) ? saved.filter(isFieldDef) : []
  return keys.filter(key => typeof key === 'string' && key && !RESERVED_FIELD_KEYS.has(key)).map(key => {
    const found = savedDefs.find(item => item.key === key)
    if (found) {
      return {
        key,
        label: String(found.label || key),
        editor: normalizeEditor(found.editor)
      }
    }
    const known = catalog.find(item => item.key === key)
    return {
      key,
      label: known?.label || key,
      editor: known?.editor || 'text'
    }
  })
}
