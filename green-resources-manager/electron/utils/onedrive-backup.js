/**
 * 把存档数据库复制进本机 OneDrive 文件夹。
 * OneDrive 客户端会自己上传，程序不登录微软账号，也不调用 Graph API。
 * 只复制 database.db。封面和资源文件留在原来的存档目录，避免把整库游戏目录传上云。
 */

const fs = require('fs')
const path = require('path')
const { resolveSaveDataDirectory } = require('./save-location')

/** OneDrive 里单独放本程序存档的文件夹名，避免和用户自己的文件混在一起。 */
const APP_FOLDER_NAME = 'GreenResourcesManager'
/** 存档数据库文件名，和 sqlite.js 里的文件名一致。 */
const DATABASE_FILE_NAME = 'database.db'
/** 已经探测到的 OneDrive 根目录。换账号后由重新探测清掉。 */
let detectedRoot = null
/** 连续保存时合并成一次复制，避免每改一条资源都拷一整份数据库。 */
let syncTimer = null

/**
 * 当前真正的存档数据库路径。
 * @returns {string}
 */
function getDatabasePath() {
  return path.join(resolveSaveDataDirectory(), DATABASE_FILE_NAME)
}

/**
 * 找本机 OneDrive 同步文件夹。
 * 先看环境变量，再看用户主目录里以 OneDrive 开头的文件夹。没装或没登录时返回空字符串。
 * @param {boolean} force 为 true 时丢掉上次的结果再找一次
 * @returns {string} OneDrive 根目录。没有时为空字符串
 */
function detectOneDriveDir(force = false) {
  if (!force && detectedRoot) return detectedRoot
  if (force) detectedRoot = null
  /** 候选目录。个人版、工作版和「OneDrive - 公司名」都算。 */
  const candidates = []
  if (process.env.OneDrive) candidates.push(process.env.OneDrive)
  if (process.env.OneDriveConsumer) candidates.push(process.env.OneDriveConsumer)
  const home = process.env.USERPROFILE || process.env.HOME || ''
  if (home) {
    try {
      for (const name of fs.readdirSync(home)) {
        if (name.startsWith('OneDrive') && !name.startsWith('OneDriveTemp')) {
          candidates.push(path.join(home, name))
        }
      }
    } catch (error) {
      // 主目录读不到就只靠环境变量
    }
  }
  for (const candidate of candidates) {
    try {
      if (candidate && fs.statSync(candidate).isDirectory()) {
        detectedRoot = candidate
        return candidate
      }
    } catch (error) {
      // 这个候选不存在，试下一个
    }
  }
  return ''
}

/**
 * 云存档开关是否打开。
 * 开关写在设置表里。读失败或没这个字段时当作关闭，避免没点开关就把数据库拷走。
 * @returns {boolean}
 */
function isBackupEnabled() {
  const databasePath = getDatabasePath()
  if (!fs.existsSync(databasePath)) return false
  let db = null
  try {
    const Database = require('better-sqlite3')
    db = new Database(databasePath, { readonly: true, fileMustExist: true })
    const row = db.prepare(`SELECT jsonData FROM settings WHERE id = 'main'`).get()
    if (!row || !row.jsonData) return false
    const settings = JSON.parse(row.jsonData)
    return settings.onedriveBackup === true
  } catch (error) {
    return false
  } finally {
    if (db) db.close()
  }
}

/**
 * 把数据库收成一份完整文件再复制。
 * WAL 里可能还有没写回主文件的内容，先做一次检查点，云端那份才和本地一致。
 * @param {string} source 本地数据库
 * @param {string} dest OneDrive 里的目标文件
 */
function copyDatabase(source, dest) {
  const Database = require('better-sqlite3')
  const db = new Database(source)
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
  } finally {
    db.close()
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(source, dest)
}

/**
 * 立刻同步一次。
 * 开关关着、找不到 OneDrive，或目标和本地是同一个文件时直接返回，不抛给保存流程。
 * @returns {{ ok: boolean, reason?: string, active: string, dest?: string }}
 */
function syncNow() {
  const active = detectOneDriveDir()
  if (!isBackupEnabled()) return { ok: false, reason: 'disabled', active }
  if (!active) return { ok: false, reason: 'missing', active: '' }
  const source = getDatabasePath()
  if (!fs.existsSync(source)) return { ok: false, reason: 'no-database', active }
  const dest = path.join(active, APP_FOLDER_NAME, DATABASE_FILE_NAME)
  if (path.resolve(source) === path.resolve(dest)) {
    return { ok: false, reason: 'same-file', active }
  }
  try {
    copyDatabase(source, dest)
    console.log('[OneDrive] 存档数据库已写入:', dest)
    return { ok: true, active, dest }
  } catch (error) {
    console.error('[OneDrive] 写入失败:', error)
    return { ok: false, reason: error.message, active }
  }
}

/**
 * 等一小会儿再同步。
 * 连续保存会挤在同一次复制里。真正复制时数据库写入已经结束。
 */
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    syncNow()
  }, 1500)
}

/**
 * 给设置页看的探测结果。
 * @returns {{ detected: string, enabled: boolean }}
 */
function status() {
  return {
    detected: detectOneDriveDir(),
    enabled: isBackupEnabled()
  }
}

/**
 * 在资源管理器里打开云存档文件夹。目录不存在时先建出来。
 * @returns {Promise<{ ok: boolean, path?: string, error?: string }>}
 */
async function openFolder() {
  const active = detectOneDriveDir()
  if (!active) return { ok: false, error: '未检测到 OneDrive 文件夹' }
  const dir = path.join(active, APP_FOLDER_NAME)
  fs.mkdirSync(dir, { recursive: true })
  const { shell } = require('electron')
  const error = await shell.openPath(dir)
  if (error) return { ok: false, error, path: dir }
  return { ok: true, path: dir }
}

module.exports = {
  detectOneDriveDir,
  scheduleSync,
  syncNow,
  status,
  openFolder
}
