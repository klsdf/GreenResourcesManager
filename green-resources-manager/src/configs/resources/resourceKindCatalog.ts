import { Game } from './game'
import { Software } from './soft'
import { Manga } from './manga'
import { SingleImage } from './singleImage'
import { Video } from './video'
import { VideoFolder } from './videoFolder'
import { Novel } from './novel'
import { Website } from './website'
import { Audio } from './audio'
import { Other } from './other'
import { ResourceField } from './base/ResourceField'
import { FormField, FormField_Date, FormField_Tags, FormField_Text, FormField_YesNo } from './base/FormField'
import { createFormField, editorKindOf, isSimpleEditor, type PageFieldDef, type PageFieldEditor } from '../pages/pageFieldSchema'

/**
 * 资源本身只有这几种。
 * 它只描述文件是什么、应该怎么打开，不描述页面上有没有发行商、标签这些字段。
 */
export interface BasicResourceKind {
  /** 写入页面配置 acceptedKinds 的标识 */
  id: string
  /** 给用户看的名称 */
  label: string
  /** 这种文件长什么样 */
  description: string
  /** 用来判断拖进来的文件。`<folder>` 表示文件夹 */
  extensions: string[]
  /** 打开方式和存档结构仍用现有资源类，这样不会改写旧数据 */
  resourceClass: any
  /** 旧页面配置里的类型。没有 acceptedKinds 时，用它推出默认接受哪些基本类型 */
  legacyPageTypes: string[]
}

/** 基本资源类型。页面从这里挑选自己接受什么，不能再选「游戏」「软件」这种字段方案。 */
export const BASIC_RESOURCE_KINDS: BasicResourceKind[] = [
  {
    id: 'executable',
    label: '可执行文件',
    description: 'exe、bat、快捷方式、Flash 和安装包',
    extensions: ['.exe', '.swf', '.bat', '.lnk', '.msi'],
    resourceClass: Game,
    legacyPageTypes: ['Game', 'Software']
  },
  {
    id: 'executableFolder',
    label: '包含可执行文件的文件夹',
    description: '一个文件夹，里面有可以启动的程序',
    extensions: ['<folder>'],
    resourceClass: Game,
    legacyPageTypes: []
  },
  {
    id: 'archive',
    label: '压缩包',
    description: 'zip、rar、7z、cbz、cbr 等。和可执行文件、图片文件夹分开，页面可以单独勾选',
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz', '.cbz', '.cbr'],
    resourceClass: Other,
    legacyPageTypes: ['Game', 'Software', 'Image', 'Manga']
  },
  {
    id: 'image',
    label: '图片',
    description: '单张 png、jpg 等，用图片阅读器打开',
    extensions: ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.gif', '.bmp', '.webp', '.avif', '.svg', '.ico', '.tiff', '.tif', '.heic', '.heif'],
    resourceClass: SingleImage,
    legacyPageTypes: ['SingleImage']
  },
  {
    id: 'imageFolder',
    label: '图片文件夹',
    description: '一叠图片，用漫画阅读器打开',
    extensions: ['<folder>', '.pdf'],
    resourceClass: Manga,
    legacyPageTypes: ['Image', 'Manga']
  },
  {
    id: 'video',
    label: '视频',
    description: '单个视频文件',
    extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts'],
    resourceClass: Video,
    legacyPageTypes: ['Video']
  },
  {
    id: 'videoFolder',
    label: '视频文件夹',
    description: '一个文件夹里的多集视频',
    extensions: ['<folder>'],
    resourceClass: VideoFolder,
    legacyPageTypes: ['Anime']
  },
  {
    id: 'novel',
    label: '小说文件',
    description: 'txt、pdf、epub 等',
    extensions: ['.txt', '.epub', '.pdf', '.mobi', '.azw', '.azw3', '.doc', '.docx', '.rtf', '.md'],
    resourceClass: Novel,
    legacyPageTypes: ['Novel']
  },
  {
    id: 'audio',
    label: '音频',
    description: 'mp3、wav、flac 等',
    extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus', '.ape', '.alac', '.aiff'],
    resourceClass: Audio,
    legacyPageTypes: ['Audio']
  },
  {
    id: 'website',
    label: '网址',
    description: '一条网址，用浏览器打开',
    extensions: [],
    resourceClass: Website,
    legacyPageTypes: ['Website']
  }
]

/** 旧存档 resourceType 到原来的资源类。只用于把已经保存的记录读回来，不出现在页面设置里。 */
const SAVED_TYPE_TO_CLASS: Record<string, any> = {
  game: Game,
  software: Software,
  manga: Manga,
  image: Manga,
  'single-image': SingleImage,
  singleimage: SingleImage,
  movie: Video,
  video: Video,
  animation: VideoFolder,
  videofolder: VideoFolder,
  anime: VideoFolder,
  novel: Novel,
  website: Website,
  audio: Audio,
  other: Other
}

/** 旧页面类型对应的资源类，用来给还没配过字段的页面生成默认字段。 */
const LEGACY_PAGE_TYPE_TO_CLASS: Record<string, any> = {
  Game,
  Software,
  Image: Manga,
  Manga,
  SingleImage,
  Video,
  Anime: VideoFolder,
  Novel,
  Website,
  Audio,
  Other
}

/** 卡片类型。仍按存档里的旧类型显示，避免改页面设置时把卡片样式换掉。 */
const SAVED_TYPE_TO_CARD: Record<string, string> = {
  game: 'game',
  software: 'software',
  manga: 'image',
  image: 'image',
  'single-image': 'singleimage',
  singleimage: 'singleimage',
  movie: 'video',
  video: 'video',
  animation: 'anime',
  videofolder: 'anime',
  anime: 'anime',
  novel: 'novel',
  website: 'website',
  audio: 'audio',
  other: 'other'
}

/** 页面可以勾选的字段。来自现有资源类里已经有编辑框的字段，按字段名合并。 */
export interface PageFieldOption {
  /** 存档里的字段名 */
  key: string
  /** 编辑框上的名字 */
  label: string
  /** 能不能做成侧边栏筛选 */
  filterable: boolean
  /** 筛选时是不是多值 */
  isArray: boolean
  /** 日期字段走日期筛选，侧栏按具体日期列出，而不是当普通文本 */
  dateFilter?: boolean
  /** 编辑框种类。页面新增字段时沿用这个，而不是再猜一次 */
  editor: PageFieldEditor
}

/**
 * 按标识找到基本资源类型。
 */
export function findBasicKind(kindId: string): BasicResourceKind | undefined {
  return BASIC_RESOURCE_KINDS.find(kind => kind.id === kindId)
}

/**
 * 旧页面没有 acceptedKinds 时，按它原来的资源类推出默认接受的基本类型。
 * 不把「包含可执行文件的文件夹」自动打开，避免原来不收文件夹的页面突然开始收。
 */
export function defaultAcceptedKindIds(legacyPageTypes: string[]): string[] {
  const ids: string[] = []
  for (const kind of BASIC_RESOURCE_KINDS) {
    if (kind.legacyPageTypes.some(typeName => legacyPageTypes.includes(typeName)) && !ids.includes(kind.id)) {
      ids.push(kind.id)
    }
  }
  return ids.length > 0 ? ids : ['executable']
}

/**
 * 新建一条资源时用哪个类来保存。
 * 可执行文件在「只有软件、没有游戏」的旧页面里继续用软件类，这样不会把旧的软件记录换成游戏结构。
 */
export function classForKind(kindId: string, legacyPageTypes: string[] = []): any {
  if (kindId === 'executable' || kindId === 'executableFolder') {
    if (legacyPageTypes.includes('Software') && !legacyPageTypes.includes('Game')) {
      return Software
    }
    return Game
  }
  // 压缩包没有自己的存档结构。放进哪一页，就沿用那一页原来的打开方式。
  if (kindId === 'archive') {
    if (legacyPageTypes.includes('Image') || legacyPageTypes.includes('Manga')) return Manga
    if (legacyPageTypes.includes('Video')) return Video
    if (legacyPageTypes.includes('Anime')) return VideoFolder
    if (legacyPageTypes.includes('Novel')) return Novel
    if (legacyPageTypes.includes('Audio')) return Audio
    if (legacyPageTypes.includes('Software') && !legacyPageTypes.includes('Game')) return Software
    if (legacyPageTypes.includes('Game')) return Game
    return Other
  }
  return findBasicKind(kindId)?.resourceClass
}

/**
 * 按页面接受的顺序，判断这个文件属于哪一种基本类型。
 * 同一种扩展名只命中靠前的那一种。
 */
export function matchAcceptedKind(fileExt: string, isFolder: boolean, kindIds: string[]): BasicResourceKind | undefined {
  const ext = fileExt.toLowerCase()
  for (const kindId of kindIds) {
    const kind = findBasicKind(kindId)
    if (!kind) continue
    if (isFolder && kind.extensions.includes('<folder>')) return kind
    if (!isFolder && kind.extensions.some(item => item !== '<folder>' && item.toLowerCase() === ext)) return kind
  }
  return undefined
}

/**
 * 批量搜索时用的扩展名。文件夹标记不能传给文件搜索。
 */
export function extensionsForSearch(kindIds: string[]): string[] {
  const extensions = new Set<string>()
  for (const kindId of kindIds) {
    const kind = findBasicKind(kindId)
    if (!kind) continue
    for (const ext of kind.extensions) {
      if (ext !== '<folder>' && ext !== '*') extensions.add(ext)
    }
  }
  return [...extensions]
}

/** 文件夹模式里可选的一种文件夹。勾选后，搜索只收含有这类内容的目录。 */
export interface FolderImportOption {
  /** 导入时使用的基本类型。音频和小说没有单独的文件夹类，仍用原来的类型，路径指向整个文件夹。 */
  id: string
  /** 窗口里显示的名称 */
  label: string
  /** 这一层里出现这些扩展名，就把当前文件夹收成一条资源，不再往下找 */
  extensions: string[]
}

/**
 * 页面能按文件夹导入的类型。
 * 内容扩展名取自对应的单文件类型：图片文件夹看的是图片，不是 pdf。
 * 只在页面本来就接受这种文件夹时出现，避免把漫画写进只收单张图片的页面。
 * 音频和小说没有单独的文件夹类，仍用原来的类型，路径指向整个文件夹。
 */
const FOLDER_IMPORT_PROFILES: { id: string; label: string; triggers: string[]; contentKindId: string }[] = [
  { id: 'imageFolder', label: '图片文件夹', triggers: ['imageFolder'], contentKindId: 'image' },
  { id: 'videoFolder', label: '视频文件夹', triggers: ['videoFolder'], contentKindId: 'video' },
  { id: 'audio', label: '音频文件夹', triggers: ['audio'], contentKindId: 'audio' },
  { id: 'executableFolder', label: '程序文件夹', triggers: ['executableFolder'], contentKindId: 'executable' },
  { id: 'novel', label: '小说文件夹', triggers: ['novel'], contentKindId: 'novel' }
]

/**
 * 按当前页面接受的类型，列出文件夹模式可以勾选的项。
 * 合集目录本身往往没有图片，要靠搜索时「这一层没有才继续往下」找到真正的图片文件夹。
 * @param kindIds 页面接受的基本类型
 */
export function folderImportOptions(kindIds: string[]): FolderImportOption[] {
  /** 这一页接受的类型，用来决定要不要出现对应的文件夹选项。 */
  const accepted = new Set(kindIds)
  /** 窗口里按固定顺序展示的文件夹类型。 */
  const options: FolderImportOption[] = []
  for (const profile of FOLDER_IMPORT_PROFILES) {
    if (!profile.triggers.some(id => accepted.has(id))) continue
    const content = findBasicKind(profile.contentKindId)
    const extensions = (content?.extensions || []).filter(ext => ext !== '<folder>' && ext !== '*')
    if (extensions.length === 0) continue
    options.push({ id: profile.id, label: profile.label, extensions: [...extensions] })
  }
  return options
}

/**
 * 按存档里的 resourceType 找回原来的资源类。
 * 认不出来就返回空，调用方不要拿别的类型去套。
 */
export function getResourceClassBySavedType(savedType: unknown): any | undefined {
  if (typeof savedType !== 'string' || !savedType) return undefined
  return SAVED_TYPE_TO_CLASS[savedType.trim().toLowerCase()]
}

/**
 * 读取资源类自己声明的存档类型。
 */
export function savedTypeOfClass(resourceClass: any): string {
  if (typeof resourceClass !== 'function') return ''
  const instance = new resourceClass()
  const value = instance?.resourceType?.value ?? instance?.resourceType
  return typeof value === 'string' ? value : ''
}

/**
 * 卡片展示用的类型名，只看这条资源自己的存档类型。
 */
export function cardTypeForResource(resource: any, fallback = 'game'): string {
  const savedType = resource?.resourceType?.value ?? resource?.resourceType
  if (typeof savedType === 'string') {
    return SAVED_TYPE_TO_CARD[savedType.trim().toLowerCase()] || fallback
  }
  return fallback
}

/**
 * 汇总所有资源类上可以编辑的字段，同名字段只保留第一次出现的名称。
 */
export function collectFieldCatalog(): PageFieldOption[] {
  const classes = [Game, Software, Manga, SingleImage, Video, VideoFolder, Novel, Website, Audio, Other]
  const seen = new Map<string, PageFieldOption>()
  for (const ResourceClass of classes) {
    const instance = new ResourceClass()
    for (const key of Object.keys(instance)) {
      if (seen.has(key)) continue
      const field = (instance as any)[key]
      if (!(field instanceof ResourceField) || !field.editType) continue
      const isTags = field.editType instanceof FormField_Tags
      const isText = field.editType instanceof FormField_Text
      const isDate = field.editType instanceof FormField_Date
      const isYesNo = field.editType instanceof FormField_YesNo
      seen.set(key, {
        key,
        label: field.editType.fieldName || key,
        filterable: isTags || isText || isDate || isYesNo,
        isArray: isTags,
        dateFilter: isDate,
        editor: editorKindOf(field.editType)
      })
    }
  }
  return [...seen.values()]
}

/**
 * 还没保存过页面字段时，用旧资源类上的编辑字段作为默认勾选。
 */
export function defaultFieldKeys(legacyPageTypes: string[]): string[] {
  const keys: string[] = []
  const types = legacyPageTypes.length > 0 ? legacyPageTypes : ['Game']
  for (const typeName of types) {
    const ResourceClass = LEGACY_PAGE_TYPE_TO_CLASS[typeName]
    if (!ResourceClass) continue
    const instance = new ResourceClass()
    for (const key of Object.keys(instance)) {
      const field = (instance as any)[key]
      if (field instanceof ResourceField && field.editType && !keys.includes(key)) {
        keys.push(key)
      }
    }
  }
  return keys
}

/**
 * 从任意资源类上借这个键原来的编辑框。
 * 同一条压缩包可能出现在游戏页或音声页，当前资源类不一定声明了这个字段，但编辑框仍然该用原来的那种。
 * @param key 字段键
 */
export function borrowEditType(key: string): FormField | null {
  const classes = [Game, Software, Manga, SingleImage, Video, VideoFolder, Novel, Website, Audio, Other]
  for (const ResourceClass of classes) {
    const instance = new ResourceClass()
    const field = (instance as any)[key]
    if (field instanceof ResourceField && field.editType) return field.editType
  }
  return null
}

/**
 * 决定编辑窗口里这个键用哪一个框。
 * 当前类有就用当前类的，这样封面和路径还带着原来的选文件逻辑。没有时再借别的类，最后才按页面自己的定义造一个普通框。
 * @param key 字段键
 * @param resourceInstance 当前这条资源的实例
 * @param def 页面上的字段定义。有显示名时盖掉资源类上的旧名字
 */
export function resolvePageEditType(key: string, resourceInstance: any, def?: PageFieldDef): FormField | null {
  const own = resourceInstance?.[key]
  const ownEdit = own instanceof ResourceField ? own.editType : null
  // 页面把普通字段改成文本或标签时，以页面为准。类上原来的框不再挡住这次修改。
  if (def && isSimpleEditor(def.editor)) {
    const edit = createFormField(def)
    if (ownEdit?.required) edit.required = true
    return edit
  }
  const edit = ownEdit || borrowEditType(key) || (def ? createFormField(def) : null)
  if (edit && def?.label) edit.fieldName = def.label
  return edit
}

/**
 * 给一个字段生成侧边栏筛选配置。
 */
export function makeFieldFilter(field: PageFieldOption) {
  if (field.dateFilter) {
    return {
      key: field.key,
      title: `${field.label}筛选`,
      filterType: 'dateField',
      params: {
        field: field.key
      },
      isArray: false
    }
  }
  // 是/否不能走普通文本筛选。普通筛选会丢掉空值，旧游戏没填过就不会出现在「否」里。
  if (field.editor === 'yesno') {
    return {
      key: field.key,
      title: `${field.label}筛选`,
      filterType: 'yesNo',
      params: {
        field: field.key
      },
      isArray: false
    }
  }
  return {
    key: field.key,
    title: `${field.label}筛选`,
    filterType: 'resourceField',
    params: {
      resource: 'page',
      field: field.key
    },
    isArray: field.isArray
  }
}
