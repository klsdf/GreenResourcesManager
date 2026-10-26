/**
 * 存档目录的归属。
 * 一种资源只用一个文件夹：游戏的截图和封面都在 Game 里，漫画封面在 Image 里，电影在 Video 里，番剧在 AnimeSeries 里。
 * 以前封面写在小写的 games、images、videos 里，和截图所在的文件夹拆开了。启动时把文件和数据库里的路径迁到现在的文件夹。
 */

const fs = require('fs')
const path = require('path')

/**
 * 每种资源对应的存档文件夹名。
 * 键是资源类名，值是 SaveData 下面的那一层目录。
 */
const RESOURCE_SAVE_FOLDERS = {
  Game: 'Game',
  Software: 'Software',
  Image: 'Image',
  Manga: 'Image',
  SingleImage: 'SingleImage',
  Video: 'Video',
  Anime: 'AnimeSeries',
  Novel: 'Novel',
  Website: 'Website',
  Audio: 'Audio',
  Other: 'Other'
}

/**
 * 封面子目录名。和截图用的 Screenshots 一样，放在资源自己的文件夹里面。
 */
const COVER_DIRECTORY_NAME = 'Covers'

/**
 * 各资源表要把旧封面路径改成哪一个文件夹。
 * 电影和番剧以前都写在 videos/covers，这里按表拆开，避免继续混在一起。
 * @type {Record<string, Array<{ from: string, to: string }>>}
 */
const COVER_PATH_RULES = {
  games: [
    { from: 'games/covers/', to: 'Game/Covers/' },
    { from: 'Game/covers/', to: 'Game/Covers/' }
  ],
  manga: [
    { from: 'images/covers/', to: 'Image/Covers/' },
    { from: 'Image/covers/', to: 'Image/Covers/' }
  ],
  video: [
    { from: 'videos/covers/', to: 'Video/Covers/' },
    { from: 'Video/covers/', to: 'Video/Covers/' }
  ],
  videoFolder: [
    { from: 'videos/covers/', to: 'AnimeSeries/Covers/' },
    { from: 'Video/covers/', to: 'AnimeSeries/Covers/' },
    { from: 'Video/Covers/', to: 'AnimeSeries/Covers/' }
  ],
  audio: [
    { from: 'audios/covers/', to: 'Audio/Covers/' },
    { from: 'Audio/covers/', to: 'Audio/Covers/' }
  ],
  novel: [
    { from: 'novels/covers/', to: 'Novel/Covers/' },
    { from: 'Novel/covers/', to: 'Novel/Covers/' }
  ],
  website: [
    { from: 'websites/covers/', to: 'Website/Covers/' },
    { from: 'Website/covers/', to: 'Website/Covers/' }
  ],
  software: [
    { from: 'software/covers/', to: 'Software/Covers/' },
    { from: 'Software/covers/', to: 'Software/Covers/' }
  ],
  singleImage: [
    { from: 'singleImage/covers/', to: 'SingleImage/Covers/' },
    { from: 'SingleImage/covers/', to: 'SingleImage/Covers/' }
  ],
  other: [
    { from: 'other/covers/', to: 'Other/Covers/' },
    { from: 'Other/covers/', to: 'Other/Covers/' }
  ]
}

/** 这些字段才是封面路径。描述文字里碰巧出现同样的字，不能跟着改。 */
const COVER_FIELDS = new Set(['coverPath', 'cover', 'thumbnail', 'thumbnailPath', 'videoThumbnails'])

/** 迁完之后如果空了，就收掉的旧封面目录。里面还有文件时不动。 */
const LEGACY_COVER_DIRECTORIES = ['games', 'images', 'videos', 'audios', 'novels', 'websites', 'software', 'other', 'singleImage']

/**
 * 把存档里记下的路径变成绝对路径，方便搬文件。
 * 相对路径相对于 SaveData。以 SaveData/ 开头的是相对工作目录的旧写法。
 * @param {string} saveDataDir SaveData 的绝对路径
 * @param {string} stored 数据库里的路径
 * @returns {string}
 */
function resolveStoredCoverPath(saveDataDir, stored) {
  const normalized = String(stored || '').replace(/\\/g, '/')
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) {
    return path.normalize(stored)
  }
  if (normalized.startsWith('SaveData/')) {
    return path.join(saveDataDir, normalized.slice('SaveData/'.length))
  }
  return path.join(saveDataDir, normalized)
}

/**
 * 把封面文件从旧位置挪到新位置。
 * 目标已经有同名文件时留下目标，不再覆盖。源文件不在时直接返回，路径仍然可以改。
 * @param {string} sourcePath 旧文件
 * @param {string} targetPath 新文件
 */
function moveCoverFile(sourcePath, targetPath) {
  if (!sourcePath || !targetPath || path.normalize(sourcePath) === path.normalize(targetPath)) return
  if (!fs.existsSync(sourcePath)) return
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  if (!fs.existsSync(targetPath)) {
    fs.renameSync(sourcePath, targetPath)
  }
}

/**
 * 番剧截帧放在 Video/Covers 的子文件夹里。
 * 一条记录被认出来以后，把同一子文件夹里的其他截帧一起带走，避免没写进数据库的帧继续留在电影目录。
 * 封面根目录里的电影封面不搬，那些文件自己有路径。
 * @param {string} sourcePath 已经决定要搬走的那张图
 * @param {string} targetPath 它的新位置
 */
function moveSiblingCovers(sourcePath, targetPath) {
  const sourceDir = path.dirname(sourcePath)
  const targetDir = path.dirname(targetPath)
  if (path.normalize(sourceDir) === path.normalize(targetDir)) return
  if (path.basename(path.dirname(sourceDir)).toLowerCase() !== 'covers') return
  if (!fs.existsSync(sourceDir)) return
  fs.mkdirSync(targetDir, { recursive: true })
  for (const name of fs.readdirSync(sourceDir)) {
    const from = path.join(sourceDir, name)
    if (!fs.statSync(from).isFile()) continue
    const to = path.join(targetDir, name)
    if (!fs.existsSync(to)) fs.renameSync(from, to)
  }
}

/**
 * 按这条资源表的规则改一条封面路径，并把文件挪过去。
 * @param {string} stored 原来的路径
 * @param {Array<{ from: string, to: string }>} rules 这条表适用的替换
 * @param {string} saveDataDir SaveData 的绝对路径
 * @param {boolean} moveSiblings 为真时，把所在子文件夹里的其他截帧一起搬走
 * @returns {string} 新路径。没有匹配时原样返回
 */
function rewriteCoverPath(stored, rules, saveDataDir, moveSiblings = false) {
  const normalized = String(stored).replace(/\\/g, '/')
  for (const rule of rules) {
    if (!normalized.includes(rule.from)) continue
    const nextNormalized = normalized.split(rule.from).join(rule.to)
    const sourcePath = resolveStoredCoverPath(saveDataDir, normalized)
    const targetPath = resolveStoredCoverPath(saveDataDir, nextNormalized)
    moveCoverFile(sourcePath, targetPath)
    if (moveSiblings) moveSiblingCovers(sourcePath, targetPath)
    return nextNormalized
  }
  return stored
}

/**
 * 改一条资源 JSON 里的封面路径。
 * 只有封面字段会改。描述里碰巧写了同样的目录名时保持原样。
 * @param {string} tableName 资源表名
 * @param {object} data 已经解析的资源 JSON
 * @param {string} saveDataDir SaveData 的绝对路径
 * @returns {{ record: object, changed: boolean }} 没改时 record 仍是原来的对象
 */
function rewriteResourceRecord(tableName, data, saveDataDir) {
  const rules = COVER_PATH_RULES[tableName]
  if (!rules || !data || typeof data !== 'object') return { record: data, changed: false }
  const moveSiblings = tableName === 'videoFolder'
  const next = { ...data }
  let changed = false
  for (const field of COVER_FIELDS) {
    if (!(field in next)) continue
    if (field === 'videoThumbnails' && next[field] && typeof next[field] === 'object' && !Array.isArray(next[field])) {
      const thumbs = {}
      for (const [videoPath, coverPath] of Object.entries(next[field])) {
        if (typeof coverPath !== 'string') {
          thumbs[videoPath] = coverPath
          continue
        }
        const rewritten = rewriteCoverPath(coverPath, rules, saveDataDir, moveSiblings)
        if (rewritten !== coverPath) changed = true
        thumbs[videoPath] = rewritten
      }
      next[field] = thumbs
      continue
    }
    if (typeof next[field] === 'string') {
      const rewritten = rewriteCoverPath(next[field], rules, saveDataDir, moveSiblings)
      if (rewritten !== next[field]) changed = true
      next[field] = rewritten
    }
  }
  return { record: changed ? next : data, changed }
}

/**
 * 删掉封面目录里已经搬空的子文件夹。
 * 封面根目录自己留着，下次保存还要用。
 * @param {string} dir 封面根目录，例如 Video/Covers
 */
function removeEmptyChildDirectories(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const child = path.join(dir, entry.name)
    removeEmptyChildDirectories(child)
    if (fs.existsSync(child) && fs.readdirSync(child).length === 0) {
      fs.rmdirSync(child)
    }
  }
}

/**
 * 删掉已经搬空的旧封面目录。
 * 只收以前那套小写目录。目录里还有别的文件时留着。
 * @param {string} saveDataDir SaveData 的绝对路径
 */
function removeEmptyLegacyCoverDirectories(saveDataDir) {
  for (const name of LEGACY_COVER_DIRECTORIES) {
    const coversDir = path.join(saveDataDir, name, 'covers')
    const parentDir = path.join(saveDataDir, name)
    if (fs.existsSync(coversDir) && fs.readdirSync(coversDir).length === 0) {
      fs.rmdirSync(coversDir)
    }
    if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
      fs.rmdirSync(parentDir)
    }
  }
}

/**
 * 把数据库里的旧封面路径改到各自的资源文件夹，并搬走对应文件。
 * 可以重复执行。路径已经是新的时不会再搬一次。
 * @param {string} saveDataDir SaveData 的绝对路径
 * @param {string} databasePath database.db 的绝对路径
 * @returns {{ updated: number }} 改过的资源条数
 */
function migrateResourceFolders(saveDataDir, databasePath) {
  if (!saveDataDir || !databasePath || !fs.existsSync(databasePath)) {
    return { updated: 0 }
  }
  const Database = require('better-sqlite3')
  const db = new Database(databasePath)
  let updated = 0
  try {
    const run = db.transaction(() => {
      for (const tableName of Object.keys(COVER_PATH_RULES)) {
        const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(tableName)
        if (!exists) continue
        const rows = db.prepare(`SELECT id, jsonData FROM ${tableName}`).all()
        const write = db.prepare(`UPDATE ${tableName} SET jsonData = ? WHERE id = ?`)
        for (const row of rows) {
          let data
          try {
            data = JSON.parse(row.jsonData)
          } catch {
            continue
          }
          const { record, changed } = rewriteResourceRecord(tableName, data, saveDataDir)
          if (changed) {
            write.run(JSON.stringify(record), row.id)
            updated += 1
          }
        }
      }
    })
    run()
    removeEmptyChildDirectories(path.join(saveDataDir, 'Video', 'Covers'))
    removeEmptyLegacyCoverDirectories(saveDataDir)
    if (updated > 0) {
      console.log(`[存档目录] 已把 ${updated} 条资源的封面路径收进各自的文件夹`)
    }
    return { updated }
  } finally {
    db.close()
  }
}

module.exports = {
  RESOURCE_SAVE_FOLDERS,
  COVER_DIRECTORY_NAME,
  COVER_PATH_RULES,
  rewriteCoverPath,
  rewriteResourceRecord,
  migrateResourceFolders,
  removeEmptyChildDirectories,
  removeEmptyLegacyCoverDirectories
}
