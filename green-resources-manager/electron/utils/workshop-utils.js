/**
 * 创意工坊公共目录的格式校验与版本比较。
 *
 * 目录格式参考 Obsidian 社区插件：一个 JSON 数组，每项只描述
 * 「插件是谁、放在哪个 GitHub 仓库」，真正的 manifest 从仓库的
 * 最新 Release 资源里读取。
 */

const MOD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/
const REPO_PART_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const FILE_NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

function cleanText(value, maxLength) {
  if (typeof value !== 'string') {
    return ''
  }
  const text = value.trim()
  return maxLength ? text.slice(0, maxLength) : text
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    return []
  }
  const tags = []
  for (const item of value) {
    const tag = cleanText(item, 24)
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
    if (tags.length >= 8) {
      break
    }
  }
  return tags
}

function isValidModId(id) {
  return typeof id === 'string' && MOD_ID_PATTERN.test(id)
}

function isValidRepo(repo) {
  if (typeof repo !== 'string') {
    return false
  }
  const parts = repo.split('/')
  if (parts.length !== 2) {
    return false
  }
  return parts.every((part) => REPO_PART_PATTERN.test(part) && part !== '.' && part !== '..')
}

function isSafeFileName(fileName) {
  return (
    typeof fileName === 'string' &&
    fileName !== '.' &&
    fileName !== '..' &&
    FILE_NAME_PATTERN.test(fileName)
  )
}

function parseVersion(value) {
  if (typeof value !== 'string') {
    return null
  }
  const match = VERSION_PATTERN.exec(value.trim())
  if (!match) {
    return null
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || ''
  }
}

function isValidVersion(value) {
  return parseVersion(value) !== null
}

function comparePrerelease(left, right) {
  if (left === right) {
    return 0
  }
  if (!left) {
    return 1
  }
  if (!right) {
    return -1
  }
  const leftParts = left.split('.')
  const rightParts = right.split('.')
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]
    if (leftPart === undefined) {
      return -1
    }
    if (rightPart === undefined) {
      return 1
    }
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null
    if (leftNumber !== null && rightNumber !== null) {
      if (leftNumber !== rightNumber) {
        return leftNumber > rightNumber ? 1 : -1
      }
      continue
    }
    if (leftNumber !== null) {
      return -1
    }
    if (rightNumber !== null) {
      return 1
    }
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1
    }
  }
  return 0
}

/**
 * 比较两个 x.y.z 版本号。格式不合法时返回 0，避免把坏版本误判成更新。
 */
function compareVersions(left, right) {
  const leftVersion = parseVersion(left)
  const rightVersion = parseVersion(right)
  if (!leftVersion || !rightVersion) {
    return 0
  }
  for (const key of ['major', 'minor', 'patch']) {
    if (leftVersion[key] !== rightVersion[key]) {
      return leftVersion[key] > rightVersion[key] ? 1 : -1
    }
  }
  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease)
}

/**
 * 把公共目录 JSON 规范成插件数组。支持直接数组，也支持 { mods: [] }。
 * 无效条目直接跳过，避免一个作者写错字段导致整个工坊打不开。
 */
function normalizeRegistry(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.mods) ? raw.mods : null
  if (!list) {
    throw new Error('公共目录格式不正确，应为插件数组')
  }

  const mods = []
  const seenIds = new Set()
  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const id = cleanText(item.id, 64)
    const repo = cleanText(item.repo, 200)
    if (!isValidModId(id) || !isValidRepo(repo) || seenIds.has(id)) {
      continue
    }
    seenIds.add(id)
    mods.push({
      id,
      repo,
      name: cleanText(item.name, 80) || id,
      author: cleanText(item.author, 80),
      description: cleanText(item.description, 600),
      icon: cleanText(item.icon, 16),
      tags: normalizeTags(item.tags)
    })
  }

  if (list.length > 0 && mods.length === 0) {
    throw new Error('公共目录里没有有效的插件条目')
  }
  return mods
}

/**
 * 校验 Release 里的 manifest.json，并补上默认值。
 */
function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('manifest.json 不是有效的对象')
  }
  const id = cleanText(raw.id, 64)
  if (!isValidModId(id)) {
    throw new Error('manifest.id 不合法，只能使用小写字母、数字、下划线和连字符')
  }
  const name = cleanText(raw.name, 80)
  if (!name) {
    throw new Error('manifest.name 不能为空')
  }
  const version = cleanText(raw.version, 40)
  if (!isValidVersion(version)) {
    throw new Error('manifest.version 必须是 x.y.z 格式')
  }
  const entry = cleanText(raw.entry, 80) || 'index.js'
  if (!isSafeFileName(entry)) {
    throw new Error('manifest.entry 必须是插件目录内的文件名，不能带路径')
  }
  const minAppVersion = cleanText(raw.minAppVersion, 40)
  if (minAppVersion && !isValidVersion(minAppVersion)) {
    throw new Error('manifest.minAppVersion 必须是 x.y.z 格式')
  }

  return {
    id,
    name,
    version,
    entry,
    minAppVersion,
    description: cleanText(raw.description, 600),
    author: cleanText(raw.author, 80),
    icon: cleanText(raw.icon, 16),
    tags: normalizeTags(raw.tags)
  }
}

/**
 * GitHub Release 最新版本的固定资源地址。
 * 作者只要把 manifest.json、入口脚本等文件作为 latest Release 的资源上传即可，
 * 客户端不需要调用 GitHub API，也就不吃 60 次/小时的匿名限额。
 */
function buildReleaseAssetUrl(repo, fileName) {
  if (!isValidRepo(repo)) {
    throw new Error('插件仓库地址不合法')
  }
  if (!isSafeFileName(fileName)) {
    throw new Error('插件资源文件名不合法')
  }
  return `https://github.com/${repo}/releases/latest/download/${fileName}`
}

module.exports = {
  MOD_ID_PATTERN,
  cleanText,
  normalizeTags,
  isValidModId,
  isValidRepo,
  isSafeFileName,
  isValidVersion,
  parseVersion,
  compareVersions,
  normalizeRegistry,
  normalizeManifest,
  buildReleaseAssetUrl
}
