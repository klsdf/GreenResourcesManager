/**
 * 「怎样才算同一个资源」的判定规则。
 *
 * 这里只做纯数据比较，不碰资源对象和文件系统。导入流程负责提供路径、大小和指纹，
 * 设置页负责编辑规则。完整路径相同永远算同一条，不放进可勾选项。
 */

import { isSameFingerprintIdentity } from './resourceFingerprint'

/** 可勾选的判定条件。 */
export type SameResourceCriterion = 'fileName' | 'parentFolder' | 'pathWithoutDrive' | 'fileSize' | 'fingerprint'

/** 多个条件的组合方式。 */
export type SameResourceMode = 'all' | 'any'

/** 保存到设置里的规则。 */
export interface SameResourceRule {
  version: number
  mode: SameResourceMode
  criteria: SameResourceCriterion[]
}

/**
 * 参与比较的一份资源信息。
 * path 是完整路径，其余字段没有时对应条件判为不满足。
 */
export interface SameResourceDescriptor {
  path: string
  fileName?: string
  parentFolder?: string
  fileSize?: number | null
  fingerprint?: string
}

/** 条件的固定顺序，设置页和摘要都按这个顺序显示。 */
export const SAME_RESOURCE_CRITERIA: SameResourceCriterion[] = [
  'fileName',
  'parentFolder',
  'pathWithoutDrive',
  'fileSize',
  'fingerprint'
]

/** 默认规则：文件名 + 上一级文件夹，全部满足。 */
export const DEFAULT_SAME_RESOURCE_RULE: SameResourceRule = {
  version: 1,
  mode: 'all',
  criteria: ['fileName', 'parentFolder']
}

/** 设置页的快速预设。最终仍然落到同一组条件上。 */
export const SAME_RESOURCE_PRESETS: Array<{ id: string; criteria: SameResourceCriterion[] }> = [
  { id: 'loose', criteria: ['fileName'] },
  { id: 'standard', criteria: ['fileName', 'parentFolder'] },
  { id: 'strict', criteria: ['fileName', 'parentFolder', 'pathWithoutDrive'] },
  { id: 'precise', criteria: ['fileName', 'parentFolder', 'fingerprint'] },
  { id: 'content', criteria: ['fingerprint'] }
]

/**
 * 把设置里读出来的规则整理成合法值。
 * 旧存档没有这个字段时返回默认规则；勾选项为空时也退回默认，避免任何东西都被当成重复。
 */
export function normalizeSameResourceRule(raw: any): SameResourceRule {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SAME_RESOURCE_RULE, criteria: [...DEFAULT_SAME_RESOURCE_RULE.criteria] }
  }

  const requested = new Set(
    (Array.isArray(raw.criteria) ? raw.criteria : []).map((value: any) => String(value || ''))
  )
  const criteria = SAME_RESOURCE_CRITERIA.filter(criterion => requested.has(criterion))

  return {
    version: Number(raw.version) || 1,
    mode: raw.mode === 'any' ? 'any' : 'all',
    criteria: criteria.length > 0 ? criteria : [...DEFAULT_SAME_RESOURCE_RULE.criteria]
  }
}

/**
 * 统一斜杠、大小写和末尾斜杠。不去盘符，盘符差异交给 pathWithoutDrive。
 */
export function normalizeResourcePath(value: string | undefined | null): string {
  let path = String(value || '').trim().replace(/\\/g, '/')
  if (path.startsWith('archive:///')) {
    path = path.slice('archive:///'.length)
  }
  return path
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase()
}

/**
 * 去掉盘符或协议头后的完整目录。D:\Games\Foo 和 E:\Games\Foo 会得到同一个值。
 */
export function pathWithoutDrive(value: string | undefined | null): string {
  return normalizeResourcePath(value)
    .replace(/^[a-z]:/, '')
    .replace(/^\/+/, '')
}

/**
 * 路径最后一段。文件取文件名，文件夹取文件夹名。
 */
export function resourceFileName(value: string | undefined | null): string {
  const normalized = normalizeResourcePath(value)
  if (!normalized) return ''
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

/**
 * 上一级文件夹名。文件取所在文件夹，文件夹取它的上一层。
 * 两者都只需要取倒数第二段。
 */
export function resourceParentFolder(value: string | undefined | null): string {
  const normalized = normalizeResourcePath(value)
  if (!normalized) return ''
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 2] || ''
}

/**
 * 扩展名，带点，小写。没有扩展名时为空字符串。
 */
export function resourceExtension(value: string | undefined | null): string {
  const name = resourceFileName(value)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot) : ''
}

/**
 * 补齐一份比较信息里能从路径推出来的字段。
 */
export function buildSameResourceDescriptor(input: SameResourceDescriptor): SameResourceDescriptor {
  const fileName = input.fileName !== undefined ? String(input.fileName || '') : resourceFileName(input.path)
  const parentFolder = input.parentFolder !== undefined ? String(input.parentFolder || '') : resourceParentFolder(input.path)
  return {
    path: String(input.path || ''),
    fileName,
    parentFolder,
    fileSize: typeof input.fileSize === 'number' && Number.isFinite(input.fileSize) ? input.fileSize : null,
    fingerprint: String(input.fingerprint || '')
  }
}

/**
 * 单条条件是否成立。缺数据一律判为不满足。
 */
export function matchesCriterion(
  left: SameResourceDescriptor,
  right: SameResourceDescriptor,
  criterion: SameResourceCriterion
): boolean {
  const a = buildSameResourceDescriptor(left)
  const b = buildSameResourceDescriptor(right)

  switch (criterion) {
    case 'fileName':
      return !!a.fileName && a.fileName === b.fileName
    case 'parentFolder':
      return !!a.parentFolder && a.parentFolder === b.parentFolder
    case 'pathWithoutDrive': {
      const pathA = pathWithoutDrive(a.path)
      const pathB = pathWithoutDrive(b.path)
      return !!pathA && pathA === pathB
    }
    case 'fileSize':
      return (
        typeof a.fileSize === 'number' &&
        typeof b.fileSize === 'number' &&
        a.fileSize > 0 &&
        a.fileSize === b.fileSize &&
        resourceExtension(a.path) === resourceExtension(b.path)
      )
    case 'fingerprint':
      return !!a.fingerprint && !!b.fingerprint && isSameFingerprintIdentity(a.fingerprint, b.fingerprint)
    default:
      return false
  }
}

/**
 * 按规则比较两份资源信息。
 * all 模式要求每个勾选条件都成立，any 模式任意一条成立即可。
 */
export function matchesSameResource(
  left: SameResourceDescriptor,
  right: SameResourceDescriptor,
  rule: SameResourceRule
): boolean {
  const normalized = normalizeSameResourceRule(rule)
  const checks = normalized.criteria.map(criterion => matchesCriterion(left, right, criterion))
  return normalized.mode === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

/**
 * 从候选里筛出符合规则的项。用于导入时判断重复或找回丢失记录。
 */
export function filterSameResourceCandidates(
  target: SameResourceDescriptor,
  candidates: SameResourceDescriptor[],
  rule: SameResourceRule
): SameResourceDescriptor[] {
  return candidates.filter(candidate => matchesSameResource(target, candidate, rule))
}
