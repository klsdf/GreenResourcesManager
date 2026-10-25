import { BASIC_RESOURCE_KINDS } from '../configs/resources/resourceKindCatalog'

/** 批量导入结果里使用的图标种类。 */
export type FileIconKind = 'app' | 'archive' | 'terminal' | 'flash' | 'image' | 'video' | 'audio' | 'novel' | 'file'

/** 取文件名最后一段的扩展名，带点并转成小写。 */
export function fileExtensionOf(file: string): string {
  const name = file.split(/[\\/]/).pop() || ''
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(dotIndex).toLowerCase() : ''
}

/**
 * 按文件扩展名选图标。
 * 优先看资源目录里的分类，特殊类型再单独处理，避免两处扩展名名单各写一份。
 */
export function getFileIconKind(file: string): FileIconKind {
  const ext = fileExtensionOf(file)
  if (ext === '.exe' || ext === '.lnk') return 'app'
  if (ext === '.bat' || ext === '.cmd') return 'terminal'
  if (ext === '.swf') return 'flash'
  if (ext === '.pdf') return 'novel'

  const kind = BASIC_RESOURCE_KINDS.find(item => item.extensions.includes(ext))
  switch (kind?.id) {
    case 'executable':
      return 'archive'
    case 'archive':
      return 'archive'
    case 'image':
    case 'imageFolder':
      return 'image'
    case 'video':
    case 'videoFolder':
      return 'video'
    case 'audio':
      return 'audio'
    case 'novel':
      return 'novel'
    default:
      return 'file'
  }
}

/** exe 和快捷方式可以让主进程取程序自带的图标，其他类型用内置 SVG。 */
export function usesNativeFileIcon(file: string): boolean {
  const ext = fileExtensionOf(file)
  return ext === '.exe' || ext === '.lnk'
}
