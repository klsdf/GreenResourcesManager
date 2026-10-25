/**
 * 资源指纹在界面侧的辅助方法。
 *
 * 真正扫描文件在主进程里做。这里只决定用哪种算法，以及怎么把指纹放进资源对象。
 * 游戏和软件看项目文件名，漫画看页数和图片名，单个文件看大小。网站没有本地文件，不记指纹。
 */

/**
 * 用项目内文件名认身份的类型。
 */
const NAME_TYPES = new Set([
  'game',
  'software',
  'soft',
  'videofolder',
  'audiofolder',
  'anime',
  'animation'
])

/**
 * 用漫画页数和图片名认身份的类型。
 */
const PAGE_TYPES = new Set(['manga', 'image'])

/**
 * 不记指纹的类型。
 */
const SKIP_TYPES = new Set(['website'])

/**
 * 指纹算法。
 * names 是项目文件名，pages 是漫画页，size 是单个文件的大小。
 */
export type FingerprintKind = 'names' | 'pages' | 'size'

/**
 * 根据资源类型选出指纹算法。
 * @param typeName 页面类型或资源类名，例如 Game、Manga、Video
 * @returns 算法；网站返回 null
 */
export function fingerprintKindForResource(typeName: string | undefined | null): FingerprintKind | null {
  const key = String(typeName || '').toLowerCase()
  if (!key || SKIP_TYPES.has(key)) return null
  if (PAGE_TYPES.has(key)) return 'pages'
  if (NAME_TYPES.has(key)) return 'names'
  return 'size'
}

/**
 * 读取资源上已经记下的指纹。
 * @param item 资源对象
 * @returns 指纹字符串，没有时为空字符串
 */
export function readFingerprint(item: any): string {
  const field = item?.fingerprint
  if (field && typeof field === 'object' && 'value' in field) {
    return typeof field.value === 'string' ? field.value : ''
  }
  return typeof field === 'string' ? field : ''
}

/**
 * 把指纹写回资源。字段可能是 ResourceField，也可能是普通字符串。
 * @param item 资源对象
 * @param fingerprint 指纹字符串
 */
export function writeFingerprint(item: any, fingerprint: string): void {
  if (!item || !fingerprint) return
  if (item.fingerprint && typeof item.fingerprint === 'object' && 'value' in item.fingerprint) {
    item.fingerprint.value = fingerprint
    return
  }
  item.fingerprint = fingerprint
}

/**
 * 比较两条指纹是不是同一个资源。启动文件名那一段不参与比较。
 * @param left 指纹一
 * @param right 指纹二
 * @returns 是否同一身份
 */
export function isSameFingerprintIdentity(left: string, right: string): boolean {
  const a = parseIdentity(left)
  const b = parseIdentity(right)
  return !!a && a === b
}

/**
 * 取出用来比较的那一段。names 去掉启动文件名，避免 exe 改名后对不上。
 * @param fingerprint 完整指纹
 * @returns 身份片段
 */
function parseIdentity(fingerprint: string): string {
  const parts = String(fingerprint || '').split('|')
  if (parts[0] !== 'v1') return ''
  if (parts[1] === 'names') {
    if (!parts[2] || parts[2] === '0' || !parts[3] || parts[4] === 'partial') return ''
    return `names|${parts[2]}|${parts[3]}`
  }
  if (parts[1] === 'pages') {
    if (!parts[2] || parts[2] === '0' || !parts[3]) return ''
    return `pages|${parts[2]}|${parts[3]}`
  }
  if (parts[1] === 'size') {
    if (!parts[2] || parts[2] === '0') return ''
    return `size|${parts[2]}|${parts[3] || ''}`
  }
  return ''
}

/**
 * 漫画指纹里的页数。不是漫画指纹时返回 0。
 * @param fingerprint 指纹字符串
 * @returns 页数
 */
export function fingerprintPageCount(fingerprint: string): number {
  const parts = String(fingerprint || '').split('|')
  if (parts[0] !== 'v1' || parts[1] !== 'pages') return 0
  const count = Number(parts[2])
  return Number.isFinite(count) ? count : 0
}

/**
 * 单文件指纹里记下的大小。不是大小指纹时返回 0。
 * @param fingerprint 指纹字符串
 * @returns 字节数
 */
export function fingerprintFileSize(fingerprint: string): number {
  const parts = String(fingerprint || '').split('|')
  if (parts[0] !== 'v1' || parts[1] !== 'size') return 0
  const size = Number(parts[2])
  return Number.isFinite(size) ? size : 0
}
