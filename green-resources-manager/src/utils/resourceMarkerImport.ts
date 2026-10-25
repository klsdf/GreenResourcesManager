/**
 * 导入时按标记文件里的资源 ID 判断该新建、更新路径还是跳过。
 * 这里只做判定，不读文件、不查数据库，方便单独验证边界情况。
 */

export interface MarkerImportCandidate {
  /** 标记文件里记录的资源 ID */
  resourceId: string
  /** 标记是不是直接对着这次导入的文件（文件夹标记、或文件名完全一致） */
  exact: boolean
  /** 数据库里是否已经有这个 ID 的记录 */
  known: boolean
  /** 旧记录上的路径现在还在不在 */
  oldPathExists: boolean
  /** 旧记录的类型和这次导入的类型是否一致 */
  typeMatches: boolean
}

export type MarkerImportDecision =
  | { action: 'none' }
  | { action: 'adopt'; resourceId: string }
  | { action: 'duplicate'; resourceId: string }
  | { action: 'relocate'; resourceId: string }
  | { action: 'ambiguous'; count: number }

/**
 * 决定这次导入怎么处理标记。
 *
 * 直接对着文件的标记优先级最高：库里有记录就按旧路径是否存在决定更新或跳过，
 * 库里没有就沿用这个 ID 新建，避免以后再也认不出来。
 * 文件名对不上的标记（文件改过名）只在不产生歧义时使用。
 *
 * @param candidates 读取到的标记对应的数据库状态
 * @returns 处理方式
 */
export function decideMarkerImport(candidates: MarkerImportCandidate[]): MarkerImportDecision {
  const exactKnown = candidates.find(candidate => candidate.exact && candidate.known)
  if (exactKnown) {
    if (!exactKnown.typeMatches || exactKnown.oldPathExists) {
      return { action: 'duplicate', resourceId: exactKnown.resourceId }
    }
    return { action: 'relocate', resourceId: exactKnown.resourceId }
  }

  const exactUnknown = candidates.find(candidate => candidate.exact && !candidate.known)
  if (exactUnknown) {
    return { action: 'adopt', resourceId: exactUnknown.resourceId }
  }

  const compatible = candidates.filter(candidate => candidate.known && candidate.typeMatches)
  const existing = compatible.filter(candidate => candidate.oldPathExists)
  if (existing.length > 0) {
    return { action: 'duplicate', resourceId: existing[0].resourceId }
  }

  const missing = compatible.filter(candidate => !candidate.oldPathExists)
  if (missing.length === 1) return { action: 'relocate', resourceId: missing[0].resourceId }
  if (missing.length > 1) return { action: 'ambiguous', count: missing.length }
  return { action: 'none' }
}
