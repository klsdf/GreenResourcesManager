/**
 * 主数据库模块：资源、页面、设置、用户等数据存储
 * 使用 better-sqlite3（原生模块，性能更好）
 */

const path = require('path')
const fs = require('fs')

// 资源表名列表（使用 id + jsonData + timestamp + version 存储）
const RESOURCE_TABLES = [
  'games', 'manga', 'audio', 'novel', 'video',
  'software', 'website', 'singleImage', 'other', 'videoFolder'
]

/**
 * 获取 SaveData 目录路径（考虑自定义路径）
 * @returns {string} SaveData 目录路径
 */
function getSaveDataDirectory() {
  try {
    // 先尝试从设置文件读取自定义路径
    const defaultSaveDataPath = path.join(process.cwd(), 'SaveData')
    const settingsPath = path.join(defaultSaveDataPath, 'Settings', 'settings.json')

    if (fs.existsSync(settingsPath)) {
      try {
        const settingsData = fs.readFileSync(settingsPath, 'utf8')
        const settings = JSON.parse(settingsData)

        if (settings.settings && settings.settings.saveDataLocation === 'custom' && settings.settings.saveDataPath) {
          // 使用自定义路径
          const customPath = path.join(settings.settings.saveDataPath, 'SaveData')
          // 检查自定义路径是否存在或能否创建
          try {
            if (!fs.existsSync(settings.settings.saveDataPath)) {
              console.warn('[SQLite] 自定义存档目录不存在:', settings.settings.saveDataPath)
              console.warn('[SQLite] 回退到默认路径')
              return defaultSaveDataPath
            }
            console.log('[SQLite] 使用自定义 SaveData 路径:', customPath)
            return customPath
          } catch (pathError) {
            console.warn('[SQLite] 检查自定义路径失败，使用默认路径:', pathError)
          }
        }
      } catch (error) {
        console.warn('[SQLite] 读取设置文件失败，使用默认路径:', error)
      }
    }

    // 使用默认路径
    console.log('[SQLite] 使用默认 SaveData 路径:', defaultSaveDataPath)
    return defaultSaveDataPath
  } catch (error) {
    console.error('[SQLite] 获取 SaveData 路径失败:', error)
    // 降级到默认路径
    return path.join(process.cwd(), 'SaveData')
  }
}

/**
 * 获取数据库文件路径
 * @returns {string} 数据库文件路径
 */
function getDatabasePath() {
  let saveDataDir = getSaveDataDirectory()
  
  try {
    // 确保 SaveData 目录存在
    if (!fs.existsSync(saveDataDir)) {
      fs.mkdirSync(saveDataDir, { recursive: true })
      console.log('[SQLite] 已创建 SaveData 目录:', saveDataDir)
    }
  } catch (error) {
    console.error('[SQLite] 无法创建 SaveData 目录:', saveDataDir, error)
    // 回退到默认路径
    const defaultSaveDataPath = path.join(process.cwd(), 'SaveData')
    console.warn('[SQLite] 回退到默认 SaveData 路径:', defaultSaveDataPath)
    saveDataDir = defaultSaveDataPath
    // 确保默认路径存在
    if (!fs.existsSync(saveDataDir)) {
      fs.mkdirSync(saveDataDir, { recursive: true })
    }
  }

  const dbPath = path.join(saveDataDir, 'database.db')
  return dbPath
}


/**
 * 将旧格式行对象转换为前端期望格式（用于迁移）
 * @param {object} row - 旧表的一行数据
 * @param {string} tableName - 表名
 * @returns {object} 转换后的对象
 */
function migrateOldRowToObject(row, tableName) {
  const obj = { ...row }
  const jsonColumns = ['developers', 'tags', 'visitedSessions', 'actors', 'voiceActors', 'productionTeam']
  for (const col of jsonColumns) {
    if (col in obj && typeof obj[col] === 'string') {
      try {
        obj[col] = JSON.parse(obj[col])
      } catch {
        obj[col] = []
      }
    }
  }
  if ('isFavorite' in obj && (obj.isFavorite === 1 || obj.isFavorite === 0)) {
    obj.isFavorite = obj.isFavorite === 1
  }
  return obj
}

/**
 * 检查表是否为旧格式（多列扁平结构，无 jsonData 列）
 * @param {object} db - Database 实例
 * @param {string} tableName - 表名
 * @returns {boolean}
 */
function isOldFormatTable(db, tableName) {
  const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all()
  const colNames = columns.map(c => c.name)
  return !colNames.includes('jsonData')
}

/**
 * 确保资源表存在（新存档格式：id + jsonData + timestamp + version）
 * @param {object} db - Database 实例
 */
function ensureResourceTablesExist(db) {
  for (const tableName of RESOURCE_TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (id TEXT PRIMARY KEY, jsonData TEXT NOT NULL, timestamp TEXT, version TEXT)`)
  }
}

/**
 * 将旧格式 SQL 表（多列）迁移为 id + jsonData + timestamp + version 格式
 * 由用户主动触发，例如在 DatabaseView 中点击按钮
 * @returns {Promise<{ ok: boolean, migratedTables?: string[], message?: string }>}
 */
async function migrateOldSqlToJsonFormat() {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)
    const migratedTables = []

    for (const tableName of RESOURCE_TABLES) {
      const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName)
      if (!exists) continue
      if (!isOldFormatTable(db, tableName)) continue

      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all()
      db.exec(`CREATE TABLE "${tableName}_migrate" (id TEXT PRIMARY KEY, jsonData TEXT NOT NULL, timestamp TEXT, version TEXT)`)
      const insertStmt = db.prepare(`INSERT INTO "${tableName}_migrate" (id, jsonData, timestamp, version) VALUES (?, ?, ?, ?)`)
      for (const row of rows) {
        const obj = migrateOldRowToObject(row, tableName)
        insertStmt.run(row.id, JSON.stringify(obj), null, null)
      }
      db.exec(`DROP TABLE "${tableName}"`)
      db.exec(`ALTER TABLE "${tableName}_migrate" RENAME TO "${tableName}"`)
      migratedTables.push(`${tableName}(${rows.length})`)
    }

    db.close()
    return { ok: true, migratedTables }
  } catch (err) {
    console.error('[SQLite] 迁移到 JSON 格式失败:', err)
    return { ok: false, message: err.message }
  }
}

/**
 * 从资源表读取数据（返回 id + jsonData + timestamp + version，不做解析）
 * 供 DatabaseView 展示原始存储格式
 * @param {object} db - Database 实例
 * @param {string} tableName - 表名
 * @param {object} conditions - 查询条件
 * @returns {Array<{ id: string, jsonData: string, timestamp?: string|null, version?: string|null }>}
 */
function getResourcesFromJsonTable(db, tableName, conditions) {
  let stmt;
  if (tableName === 'games'){
    // 查询游戏时动态组装sql
    // 基础sql
    let sql = `SELECT games.id, games.jsonData, games.timestamp, games.version FROM games`
    let condition_sql = []
    
    // 检查 games_page 表是否存在
    const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get('games_page')
    if (tableExists) {
      condition_sql.push(`EXISTS (SELECT 1 FROM games_page as page WHERE page.resourceId = games.id)`)
    }

    if (conditions) {
      // 条件包含开发商
      if (conditions.developer && typeof conditions.developer === 'string') {
        sql += `, json_each(json_extract(jsonData, '$.developers')) AS dev`;
        condition_sql.push(`dev.value like '%${conditions.developer}%'`);
      }

      // 条件包含发行商
      if (conditions.publisher && typeof conditions.publisher === 'string') {
        sql += `, json_each(json_extract(jsonData, '$.publisher')) AS pub`;
        condition_sql.push(`pub.value like '%${conditions.publisher}%'`)
      }

      // 条件包含游戏名称
      if (conditions.name && typeof conditions.name === 'string') {
        condition_sql.push(`(json_extract(jsonData, '$.name') like '%${conditions.name}%' or
        json_extract(jsonData, '$.nickname') like '%${conditions.name}%' or
        json_extract(jsonData, '$.nameZh') like '%${conditions.name}%' or
        json_extract(jsonData, '$.nameEn') like '%${conditions.name}%' or
        json_extract(jsonData, '$.nameJa') like '%${conditions.name}%')`)
      }
    }

    // 如果有查询条件 sql添加where + 查询条件
    if (condition_sql.length) {
      sql += ` WHERE `
      sql += condition_sql.join(' AND ')
    }

    // 排序
    sql += ` ORDER BY json_extract(jsonData, '$.addedDate') DESC`

    console.log('[SQLite] 查询游戏SQL:', sql)
    stmt = db.prepare(sql)

  } else {
    stmt = db.prepare(`SELECT id, jsonData, timestamp, version FROM "${tableName}" ORDER BY json_extract(jsonData, '$.addedDate') DESC`)
  }
  const rows = stmt.all()
  return rows.map(row => ({
    id: row.id,
    jsonData: row.jsonData,
    timestamp: row.timestamp ?? null,
    version: row.version ?? null
  }))
}

/**
 * 从资源表按 id 列表读取
 * @param {object} db - Database 实例
 * @param {string} tableName - 表名
 * @param {string[]} ids - id 列表
 * @returns {Array<any>}
 */
function getResourcesByIds(db, tableName, ids) {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT id, jsonData, timestamp, version FROM "${tableName}" WHERE id IN (${placeholders})`).all(...ids)
  return rows.map(row => {
    try {
      const parsed = JSON.parse(row.jsonData)
      return {
        id: row.id,
        ...parsed,
        timestamp: row.timestamp ?? undefined,
        version: row.version ?? undefined
      }
    } catch {
      return {
        id: row.id,
        timestamp: row.timestamp ?? undefined,
        version: row.version ?? undefined
      }
    }
  })
}

/**
 * 获取指定资源表的所有记录（解析后的对象数组）
 * @param {string} tableName - 表名（如 'games', 'videoFolder'）
 * @param {object} conditions - 查询条件
 * @returns {Promise<Array<any>>} 资源数组
 */
async function getTableResources(tableName, conditions) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)
    ensureResourceTablesExist(db)
    const rows = getResourcesFromJsonTable(db, tableName, conditions)
    const result = rows.map(row => {
      try {
        const parsed = JSON.parse(row.jsonData)
        return {
          id: row.id,
          ...parsed,
          timestamp: row.timestamp ?? undefined,
          version: row.version ?? undefined
        }
      } catch {
        return {
          id: row.id,
          timestamp: row.timestamp ?? undefined,
          version: row.version ?? undefined
        }
      }
    })
    db.close()
    return result
  } catch (err) {
    console.error(`[SQLite] 获取表 ${tableName} 资源失败:`, err.message)
    throw err
  }
}

/**
 * 根据 ID 获取单个资源
 * @param {string} tableName - 表名
 * @param {string} resourceId - 资源 ID
 * @returns {Promise<Object|null>} 资源对象，不存在则返回 null
 */
async function getResourceById(tableName, resourceId) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)
    ensureResourceTablesExist(db)
    const row = db.prepare(`SELECT id, jsonData, timestamp, version FROM "${tableName}" WHERE id = ?`).get(resourceId)
    db.close()
    if (!row) return null
    try {
      const parsed = JSON.parse(row.jsonData)
      return {
        id: row.id,
        ...parsed,
        timestamp: row.timestamp ?? undefined,
        version: row.version ?? undefined
      }
    } catch {
      return {
        id: row.id,
        timestamp: row.timestamp ?? undefined,
        version: row.version ?? undefined
      }
    }
  } catch (err) {
    console.error(`[SQLite] 获取资源失败:`, err.message)
    throw err
  }
}

/**
 * 获取所有表数据，供前端「数据库」页面展示
 * @returns {Promise<{ ok: boolean, tables?: Array<{ tableName: string, rows: Array<any> }>, message?: string }>}
 */
async function getAllTablesData() {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)
    const tables = []

    ensureResourceTablesExist(db)

    for (const tableName of RESOURCE_TABLES) {
      tables.push({
        tableName,
        rows: getResourcesFromJsonTable(db, tableName)
      })
    }

    // ========== 创建 achievements 表（如果不存在）==========
    db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        achievementId TEXT PRIMARY KEY,
        unlocked INTEGER DEFAULT 0,
        unlockTime TEXT
      )
    `)

    // 读取成就数据
    const selectAllAchievementsStmt = db.prepare('SELECT * FROM achievements ORDER BY achievementId')
    const achievementsRows = selectAllAchievementsStmt.all()
    tables.push({
      tableName: 'achievements',
      rows: achievementsRows.map(row => ({
        achievementId: row.achievementId,
        unlocked: row.unlocked === 1,
        unlockTime: row.unlockTime || null
      }))
    })

    // ========== 创建 settings 表（如果不存在，与资源表统一：id + jsonData + timestamp + version）==========
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    // 读取设置数据
    const selectSettingsStmt = db.prepare('SELECT id, jsonData, timestamp, version FROM settings WHERE id = ?')
    const settingsRow = selectSettingsStmt.get('main')

    if (settingsRow) {
      tables.push({
        tableName: 'settings',
        rows: [{
          id: settingsRow.id,
          jsonData: settingsRow.jsonData,
          timestamp: settingsRow.timestamp || null,
          version: settingsRow.version || null
        }]
      })
    } else {
      tables.push({ tableName: 'settings', rows: [] })
    }

    // ========== 创建 user 表（如果不存在，与资源表统一：id + jsonData + timestamp + version）==========
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    // 读取用户数据
    const selectUserStmt = db.prepare('SELECT id, jsonData, timestamp, version FROM user WHERE id = ?')
    const userRow = selectUserStmt.get('main')

    if (userRow) {
      tables.push({
        tableName: 'user',
        rows: [{
          id: userRow.id,
          jsonData: userRow.jsonData,
          timestamp: userRow.timestamp || null,
          version: userRow.version || null
        }]
      })
    } else {
      tables.push({ tableName: 'user', rows: [] })
    }

    // ========== 创建 pages 表（如果不存在）==========
    db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        addedDate TEXT,
        updatedDate TEXT
      )
    `)
    const selectPagesStmt = db.prepare('SELECT * FROM pages ORDER BY addedDate DESC')
    const pagesRows = selectPagesStmt.all()
    tables.push({
      tableName: 'pages',
      rows: pagesRows
    })

    // ========== 为每个页面创建独立的表 ==========
    // 默认页面列表（从页面配置中获取）
    const defaultPageIds = [
      'games',
      'software',
      'images',
      'single-image',
      'videos',
      'anime-series',
      'novels',
      'websites',
      'audio',
      'other',
      'test-game'
    ]

    // 获取所有已存在的页面ID（从pages表中）
    const existingPageIds = pagesRows.map(row => row.id).filter(Boolean)

    // 合并默认页面和已存在的页面ID
    const allPageIds = [...new Set([...defaultPageIds, ...existingPageIds])]

    // 为每个页面创建独立的表
    for (const pageId of allPageIds) {
      // 将页面ID转换为有效的表名（替换连字符为下划线，确保SQL安全）
      const tableName = `${pageId.replace(/-/g, '_')}_page`
      // 使用双引号包裹表名以确保SQL安全
      const quotedTableName = `"${tableName}"`

      // 创建页面表
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${quotedTableName} (
          id TEXT PRIMARY KEY,
          resourceType TEXT NOT NULL,
          resourceId TEXT NOT NULL
        )
      `)

      // 创建索引以提高查询性能
      db.exec(`
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_resource" ON ${quotedTableName}(resourceType, resourceId)
      `)

      // 查询页面表数据
      const selectPageStmt = db.prepare(`SELECT * FROM ${quotedTableName}`)
      const pageRows = selectPageStmt.all()
      tables.push({
        tableName: tableName,
        rows: pageRows
      })
    }

    db.close()

    // 返回所有表的数据
    return {
      ok: true,
      tables: tables
    }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

/**
 * 获取页面数据（从数据库读取）
 * @param {string} pageId - 页面ID
 * @returns {Promise<{ ok: boolean, data?: Array<any>, message?: string }>}
 */
async function getPageData(pageId) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 将页面ID转换为表名
    const tableName = `${pageId.replace(/-/g, '_')}_page`
    const quotedTableName = `"${tableName}"`

    // 检查页面表是否存在
    const tableExistsStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `)
    const tableExists = tableExistsStmt.get(tableName)

    if (!tableExists) {
      db.close()
      console.log(`[SQLite] 页面表 ${tableName} 不存在，返回空数组`)
      return { ok: true, data: [] }
    }

    // 从页面表读取资源ID列表
    const selectPageStmt = db.prepare(`SELECT * FROM ${quotedTableName}`)
    const pageResources = selectPageStmt.all()

    console.log(`[SQLite] 页面 ${pageId} 的索引记录数: ${pageResources.length}`)

    if (pageResources.length === 0) {
      db.close()
      console.log(`[SQLite] 页面 ${pageId} 没有资源索引，返回空数组`)
      return { ok: true, data: [] }
    }

    // 按资源类型分组（兼容 SQLite 列名小写：resourcetype, resourceid）
    const resourcesByType = {}
    for (const resource of pageResources) {
      const resourceType = resource.resourceType ?? resource.resourcetype
      const resourceId = resource.resourceId ?? resource.resourceid
      if (!resourceType || !resourceId) continue
      const tableName = mapResourceTypeToTableName(resourceType)  // 映射到实际表名，如 'animation' -> 'videoFolder'
      if (!resourcesByType[tableName]) {
        resourcesByType[tableName] = []
      }
      resourcesByType[tableName].push(resourceId)
    }

    // 从各个资源表中查询数据（id + jsonData 格式）
    ensureResourceTablesExist(db)
    const allResources = []
    for (const [tableName, resourceIds] of Object.entries(resourcesByType)) {
      if (resourceIds.length === 0) continue
      const resources = getResourcesByIds(db, tableName, resourceIds)
      allResources.push(...resources)
    }

    // 按照页面表中的顺序排序（保持原始顺序）
    const resourceMap = new Map(allResources.map(r => [r.id, r]))
    const orderedResources = pageResources
      .map(pr => resourceMap.get(pr.resourceId))
      .filter(Boolean)

    console.log(`[SQLite] getPageData 完成: pageId=${pageId}, 返回 ${orderedResources.length} 条`)
    db.close()

    return {
      ok: true,
      data: orderedResources
    }
  } catch (err) {
    console.error(`[SQLite] 获取页面 ${pageId} 数据失败:`, err.message, err.stack)
    return { ok: false, message: err.message }
  }
}

/**
 * 保存资源到对应的资源表（id + jsonData 格式）
 * @param {string} resourceType - 资源类型（表名）
 * @param {any} resource - 资源数据
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function saveResourceToTable(resourceType, resource) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    if (!resource.id) {
      db.close()
      return { ok: false, message: '资源缺少 id 字段' }
    }

    // settings / user 与资源表统一结构 (id, jsonData, timestamp, version)
    if (resourceType === 'settings' || resourceType === 'user') {
      db.exec(`
        CREATE TABLE IF NOT EXISTS "${resourceType}" (
          id TEXT PRIMARY KEY DEFAULT 'main',
          jsonData TEXT NOT NULL,
          timestamp TEXT,
          version TEXT
        )
      `)
      const jsonToStore = (typeof resource.jsonData === 'string')
        ? resource.jsonData
        : JSON.stringify(resource)
      const timestamp = resource.timestamp != null ? resource.timestamp : new Date().toISOString()
      const version = resource.version != null ? resource.version : null
      const insertStmt = db.prepare(`INSERT OR REPLACE INTO "${resourceType}" (id, jsonData, timestamp, version) VALUES (?, ?, ?, ?)`)
      insertStmt.run(resource.id, jsonToStore, timestamp, version)
      db.close()
      return { ok: true }
    }

    ensureResourceTablesExist(db)

    // 若已是 { id, jsonData } 格式（jsonData 为字符串），直接使用；否则序列化整个对象
    const jsonToStore = (typeof resource.jsonData === 'string')
      ? resource.jsonData
      : JSON.stringify(resource)
    const timestamp = resource.timestamp != null ? resource.timestamp : new Date().toISOString()
    const version = resource.version != null ? resource.version : null

    const insertStmt = db.prepare(`INSERT OR REPLACE INTO "${resourceType}" (id, jsonData, timestamp, version) VALUES (?, ?, ?, ?)`)
    insertStmt.run(resource.id, jsonToStore, timestamp, version)

    db.close()
    return { ok: true }
  } catch (err) {
    console.error(`[SQLite] 保存资源到 ${resourceType} 表失败:`, err.message)
    return { ok: false, message: err.message }
  }
}

/**
 * 在页面表中添加资源索引
 * @param {string} pageId - 页面ID
 * @param {string} resourceType - 资源类型
 * @param {string} resourceId - 资源ID
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function addResourceToPage(pageId, resourceType, resourceId) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 将页面ID转换为表名
    const tableName = `${pageId.replace(/-/g, '_')}_page`
    const quotedTableName = `"${tableName}"`

    // 确保页面表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${quotedTableName} (
        id TEXT PRIMARY KEY,
        resourceType TEXT NOT NULL,
        resourceId TEXT NOT NULL
      )
    `)

    // 检查是否已存在
    const checkStmt = db.prepare(`
      SELECT id FROM ${quotedTableName} 
      WHERE resourceType = ? AND resourceId = ?
    `)
    const existing = checkStmt.get(resourceType, resourceId)

    if (!existing) {
      // 生成唯一ID
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 插入新记录
      const insertStmt = db.prepare(`
        INSERT INTO ${quotedTableName} (id, resourceType, resourceId) 
        VALUES (?, ?, ?)
      `)
      insertStmt.run(id, resourceType, resourceId)
    }

    db.close()
    return { ok: true }
  } catch (err) {
    console.error(`[SQLite] 添加资源到页面 ${pageId} 失败:`, err.message)
    return { ok: false, message: err.message }
  }
}

/**
 * 将 resourceType 映射到数据库表名
 * @param {string} resourceType - 资源类型（如 'game', 'audio'）
 * @returns {string} 数据库表名（如 'games', 'audio'）
 */
function mapResourceTypeToTableName(resourceType) {
  const mapping = {
    'game': 'games',
    'games': 'games',
    'software': 'software',
    'soft': 'software',
    'manga': 'manga',
    'image': 'manga',
    'images': 'manga',
    'novel': 'novel',
    'novels': 'novel',
    'video': 'video',
    'videos': 'video',
    'movie': 'video',
    'audio': 'audio',
    'website': 'website',
    'websites': 'website',
    'single-image': 'singleImage',
    'singleImage': 'singleImage',
    'other': 'other',
    'videoFolder': 'videoFolder',
    'video-folder': 'videoFolder',
    'animation': 'videoFolder',  // VideoFolder 类的 defaultValue
    'anime': 'videoFolder',
    'anime-series': 'videoFolder'
  }

  return mapping[resourceType] || resourceType
}

/**
 * 保存页面资源（批量操作：保存所有资源到资源表，并更新页面索引）
 * @param {string} pageId - 页面ID
 * @param {Array<any>} resources - 资源数组
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function savePageResources(pageId, resources) {
  try {
    if (!resources || !Array.isArray(resources)) {
      return { ok: false, message: '未收到任何资源数据' }
    }
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)
    ensureResourceTablesExist(db)

    // 页面ID到资源类型的映射（用于推断资源类型）
    const pageIdToResourceType = {
      'games': 'game',
      'software': 'software',
      'images': 'manga',
      'single-image': 'singleImage',
      'videos': 'video',
      'anime-series': 'videoFolder',
      'novels': 'novel',
      'websites': 'website',
      'audio': 'audio',
      'other': 'other'
    }

    // 实际写入的资源数量（用于检测“全部被跳过”的情况）
    let insertedCount = 0
    // 开始事务
    const transaction = db.transaction(() => {
      // 存储每个资源对应的数据库表名（用于后续插入页面索引）
      const resourceTableMap = new Map()

      // 1. 保存所有资源到对应的资源表（如果有资源的话）
      if (resources.length > 0) {
        for (const resource of resources) {
          console.log(`[SQLite] 处理资源，resource:`, resource)
          
          if (!resource.id) {
            console.warn(`[SQLite] 资源缺少 id 字段，跳过保存:`, resource)
            continue
          }

          // 从资源数据中获取资源类型
          let resourceType = resource.resourceType || resource.resource_type

          console.log(`[SQLite] 资源原始类型 - resourceType: ${resourceType}, resource.resourceType: ${resource.resourceType}, resource.resource_type: ${resource.resource_type}`)

          // 如果资源类型不存在，尝试从页面ID推断
          if (!resourceType) {
            resourceType = pageIdToResourceType[pageId] || pageId
            console.log(`[SQLite] 从页面ID推断资源类型: ${pageId} -> ${resourceType}`)
          }

          // 映射到数据库表名
          const tableName = mapResourceTypeToTableName(resourceType)
          console.log(`[SQLite] 保存资源到表 ${tableName}, resourceType: ${resourceType}, id: ${resource.id}`)

          // 保存映射关系
          resourceTableMap.set(resource.id, tableName)

          const timestamp = resource.timestamp != null ? resource.timestamp : new Date().toISOString()
          const version = resource.version != null ? resource.version : null
          const insertStmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (id, jsonData, timestamp, version) VALUES (?, ?, ?, ?)`)
          insertStmt.run(resource.id, JSON.stringify(resource), timestamp, version)
          insertedCount++
          console.log(`[SQLite] 资源保存成功，insertedCount 现在为: ${insertedCount}`)
        }
      }

      // 2. 清空页面表
      const tableName = `${pageId.replace(/-/g, '_')}_page`
      const quotedTableName = `"${tableName}"`

      // 确保页面表存在
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${quotedTableName} (
          id TEXT PRIMARY KEY,
          resourceType TEXT NOT NULL,
          resourceId TEXT NOT NULL
        )
      `)

      // 清空页面表
      db.exec(`DELETE FROM ${quotedTableName}`)

      // 3. 重新插入页面索引（使用之前保存的映射关系，如果有资源的话）
      if (resources.length > 0) {
        for (let i = 0; i < resources.length; i++) {
          const resource = resources[i]
          if (!resource.id) {
            console.warn(`[SQLite] 资源缺少 id 字段，跳过页面索引:`, resource)
            continue
          }

          // 从映射中获取数据库表名
          const dbTableName = resourceTableMap.get(resource.id)
          if (!dbTableName) {
            console.warn(`[SQLite] 资源 ${resource.id} 没有对应的表名映射，跳过页面索引`)
            continue
          }

          const resourceId = resource.id

          // 生成唯一ID
          const id = `${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`

          console.log(`[SQLite] 添加页面索引: ${quotedTableName}, resourceType: ${dbTableName}, resourceId: ${resourceId}`)

          // 插入页面索引
          const insertPageStmt = db.prepare(`
            INSERT INTO ${quotedTableName} (id, resourceType, resourceId) 
            VALUES (?, ?, ?)
          `)
          insertPageStmt.run(id, dbTableName, resourceId)
        }
      }

      console.log(`[SQLite] 页面 ${pageId} 资源保存完成，共 ${resources.length} 条记录`)
    })

    transaction()
    db.close()

    // 允许空数组的情况（清空页面）
    if (resources.length === 0) {
      return { ok: true }
    }
    if (insertedCount === 0) {
      return { ok: false, message: '所有资源均被跳过，未写入任何数据（请检查资源 id、resourceType 及表结构）' }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[SQLite] 保存页面 ${pageId} 资源失败:`, err.message)
    return { ok: false, message: err.message }
  }
}

/**
 * 删除数据库中的资源记录
 * @param {string} tableName - 表名
 * @param {string} resourceId - 资源ID
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function deleteResourceFromTable(tableName, resourceId) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 1. 从资源表中删除记录
    const deleteStmt = db.prepare(`DELETE FROM "${tableName}" WHERE id = ?`)
    const result = deleteStmt.run(resourceId)

    if (result.changes === 0) {
      db.close()
      return { ok: false, message: '未找到要删除的记录' }
    }

    // 2. 从所有页面索引表中删除该资源的索引
    // 获取所有页面表
    const tablesStmt = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%_page'
    `)
    const pageTables = tablesStmt.all()

    // 从每个页面表中删除该资源的索引
    for (const table of pageTables) {
      const pageTableName = table.name
      const deletePageIndexStmt = db.prepare(`DELETE FROM "${pageTableName}" WHERE resourceId = ?`)
      deletePageIndexStmt.run(resourceId)
    }

    db.close()
    return { ok: true }
  } catch (err) {
    console.error(`[SQLite] 从 ${tableName} 表删除资源 ${resourceId} 失败:`, err.message)
    return { ok: false, message: err.message }
  }
}

/**
 * 从 JSON 文件迁移成就数据到 SQLite
 * @param {string} [customSaveDataPath] - 自定义存档文件夹路径（可选，用于从指定文件夹迁移）
 * @returns {Promise<{ ok: boolean, message?: string, migratedCount?: number }>}
 */
async function migrateAchievementsFromJson(customSaveDataPath) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 achievements 表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        achievementId TEXT PRIMARY KEY,
        unlocked INTEGER DEFAULT 0,
        unlockTime TEXT
      )
    `)

    // 清空现有数据（覆盖模式）
    db.exec('DELETE FROM achievements')

    // 读取 JSON 文件（优先使用自定义路径）
    const saveDataDir = customSaveDataPath || getSaveDataDirectory()
    const achievementsJsonPath = path.join(saveDataDir, 'Settings', 'achievements.json')

    if (!fs.existsSync(achievementsJsonPath)) {
      db.close()
      return { ok: false, message: '未找到成就 JSON 文件' }
    }

    console.log('[SQLite] 开始从 JSON 迁移成就数据...')
    const achievementsData = JSON.parse(fs.readFileSync(achievementsJsonPath, 'utf8'))

    if (!achievementsData || !achievementsData.achievements) {
      db.close()
      return { ok: false, message: 'JSON 文件格式不正确' }
    }

    const unlockedAchievements = achievementsData.achievements.unlockedAchievements || {}
    // 使用 lastCheckTime 作为已解锁成就的解锁时间参考（如果没有更精确的时间）
    const lastCheckTime = achievementsData.achievements.lastCheckTime || achievementsData.timestamp || new Date().toISOString()

    // 插入成就数据
    const insertAchievementStmt = db.prepare(`
      INSERT OR REPLACE INTO achievements (achievementId, unlocked, unlockTime)
      VALUES (?, ?, ?)
    `)

    let migratedCount = 0
    for (const [achievementId, unlocked] of Object.entries(unlockedAchievements)) {
      // 跳过无效的键（如 "[object Object]"）
      if (achievementId && achievementId !== '[object Object]') {
        // 如果成就已解锁，使用 lastCheckTime 作为解锁时间；如果未解锁，unlockTime 为 null
        const unlockTime = unlocked ? lastCheckTime : null
        insertAchievementStmt.run(achievementId, unlocked ? 1 : 0, unlockTime)
        migratedCount++
      }
    }

    db.close()
    console.log(`[SQLite] 成就数据迁移完成，共迁移 ${migratedCount} 个成就`)
    return { ok: true, migratedCount }
  } catch (error) {
    console.error('[SQLite] 迁移成就数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 从 JSON 文件迁移设置数据到 SQLite
 * @param {string} [customSaveDataPath] - 自定义存档文件夹路径（可选，用于从指定文件夹迁移）
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function migrateSettingsFromJson(customSaveDataPath) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 settings 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    // 读取 JSON 文件（优先使用自定义路径）
    const saveDataDir = customSaveDataPath || getSaveDataDirectory()
    const settingsJsonPath = path.join(saveDataDir, 'Settings', 'settings.json')

    if (!fs.existsSync(settingsJsonPath)) {
      db.close()
      return { ok: false, message: '未找到设置 JSON 文件' }
    }

    console.log('[SQLite] 开始从 JSON 迁移设置数据...')
    const settingsData = JSON.parse(fs.readFileSync(settingsJsonPath, 'utf8'))

    if (!settingsData || !settingsData.settings) {
      db.close()
      return { ok: false, message: 'JSON 文件格式不正确' }
    }

    const insertSettingsStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (id, jsonData, timestamp, version)
      VALUES (?, ?, ?, ?)
    `)
    insertSettingsStmt.run(
      'main',
      JSON.stringify(settingsData.settings),
      settingsData.timestamp || new Date().toISOString(),
      settingsData.version || '0.0.0'
    )

    db.close()
    console.log('[SQLite] 设置数据迁移完成')
    return { ok: true }
  } catch (error) {
    console.error('[SQLite] 迁移设置数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 从 SQLite 读取设置数据
 * @returns {Promise<{ ok: boolean, settings?: any, timestamp?: string, version?: string, message?: string }>}
 */
async function getSettingsFromSqlite() {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 settings 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    const selectStmt = db.prepare('SELECT id, jsonData, timestamp, version FROM settings WHERE id = ?')
    const row = selectStmt.get('main')

    db.close()

    if (!row) {
      return { ok: false, message: 'SQLite 中未找到设置数据' }
    }

    let settings = null
    try {
      settings = row.jsonData ? JSON.parse(row.jsonData) : null
    } catch (e) {
      console.warn('[SQLite] 解析 settings jsonData 失败:', e)
      return { ok: false, message: '解析设置数据失败' }
    }

    return {
      ok: true,
      settings: settings,
      timestamp: row.timestamp || null,
      version: row.version || null
    }
  } catch (error) {
    console.error('[SQLite] 读取设置数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 保存设置数据到 SQLite
 * @param {any} settings - 设置对象
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function saveSettingsToSqlite(settings) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 settings 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    let version = '0.6.8'
    try {
      const packageJson = require('../../package.json')
      version = packageJson.version || version
    } catch (e) {
      console.warn('[SQLite] 无法读取版本号，使用默认值')
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (id, jsonData, timestamp, version)
      VALUES (?, ?, ?, ?)
    `)
    insertStmt.run(
      'main',
      JSON.stringify(settings),
      new Date().toISOString(),
      version
    )

    db.close()
    console.log('[SQLite] 设置数据保存成功')
    return { ok: true }
  } catch (error) {
    console.error('[SQLite] 保存设置数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 从 JSON 文件迁移用户数据到 SQLite
 * @param {string} [customSaveDataPath] - 自定义存档文件夹路径（可选，用于从指定文件夹迁移）
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function migrateUserFromJson(customSaveDataPath) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 user 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    const saveDataDir = customSaveDataPath || getSaveDataDirectory()
    const userJsonPath = path.join(saveDataDir, 'Settings', 'user.json')

    if (!fs.existsSync(userJsonPath)) {
      db.close()
      return { ok: false, message: '未找到用户 JSON 文件' }
    }

    console.log('[SQLite] 开始从 JSON 迁移用户数据...')
    const userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'))

    if (!userData || !userData.user) {
      db.close()
      return { ok: false, message: 'JSON 文件格式不正确' }
    }

    const insertUserStmt = db.prepare(`
      INSERT OR REPLACE INTO user (id, jsonData, timestamp, version)
      VALUES (?, ?, ?, ?)
    `)
    insertUserStmt.run(
      'main',
      JSON.stringify(userData.user),
      userData.timestamp || new Date().toISOString(),
      userData.version || '0.0.0'
    )

    db.close()
    console.log('[SQLite] 用户数据迁移完成')
    return { ok: true }
  } catch (error) {
    console.error('[SQLite] 迁移用户数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 从 SQLite 读取用户数据
 * @returns {Promise<{ ok: boolean, user?: any, timestamp?: string, version?: string, message?: string }>}
 */
async function getUserFromSqlite() {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 user 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    const selectStmt = db.prepare('SELECT id, jsonData, timestamp, version FROM user WHERE id = ?')
    const row = selectStmt.get('main')

    db.close()

    if (!row) {
      return { ok: false, message: 'SQLite 中未找到用户数据' }
    }

    let user = null
    try {
      user = row.jsonData ? JSON.parse(row.jsonData) : null
    } catch (e) {
      console.warn('[SQLite] 解析 user jsonData 失败:', e)
      return { ok: false, message: '解析用户数据失败' }
    }

    return {
      ok: true,
      user: user,
      timestamp: row.timestamp || null,
      version: row.version || null
    }
  } catch (error) {
    console.error('[SQLite] 读取用户数据失败:', error)
    return { ok: false, message: error.message }
  }
}

/**
 * 保存用户数据到 SQLite
 * @param {any} user - 用户对象
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function saveUserToSqlite(user) {
  try {
    const Database = require('better-sqlite3')
    const dbPath = getDatabasePath()
    const db = new Database(dbPath)

    // 确保 user 表存在（与资源表统一：id + jsonData + timestamp + version）
    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY DEFAULT 'main',
        jsonData TEXT NOT NULL,
        timestamp TEXT,
        version TEXT
      )
    `    )

    let version = '0.6.8'
    try {
      const packageJson = require('../../package.json')
      version = packageJson.version || version
    } catch (e) {
      console.warn('[SQLite] 无法读取版本号，使用默认值')
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO user (id, jsonData, timestamp, version)
      VALUES (?, ?, ?, ?)
    `)
    insertStmt.run(
      'main',
      JSON.stringify(user),
      new Date().toISOString(),
      version
    )

    db.close()
    console.log('[SQLite] 用户数据保存成功')
    return { ok: true }
  } catch (error) {
    console.error('[SQLite] 保存用户数据失败:', error)
    return { ok: false, message: error.message }
  }
}

module.exports = { getAllTablesData, getPageData, getTableResources, getResourceById, getSaveDataDirectory, getDatabasePath, saveResourceToTable, addResourceToPage, savePageResources, deleteResourceFromTable, migrateOldSqlToJsonFormat, migrateAchievementsFromJson, migrateSettingsFromJson, getSettingsFromSqlite, saveSettingsToSqlite, migrateUserFromJson, getUserFromSqlite, saveUserToSqlite }
