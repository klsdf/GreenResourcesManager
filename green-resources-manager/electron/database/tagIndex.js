/**
 * 标签索引模块（Tag Index）
 * ============================================================================
 * 用 SQLite 关系表 tag_refs 维护"资源 × 字段 × 标签"的引用关系，
 * 取代前端全量遍历资源统计标签的做法。
 *
 * 关键约定：
 * 1. tag_refs 是派生索引：随资源写入在同一事务内增量 diff 更新，可随时全量重建。
 * 2. 标签数量不落地存储，永远由 tag_refs COUNT(*) 实时得出。
 * 3. 资源 JSON 中的标签仍是普通字符串数组，删除/重命名标签时由本模块回写资源。
 * 4. 本模块所有 InTx 函数都接收外部已打开的 db，必须在 better-sqlite3 事务中调用。
 */

const TAG_INDEX_VERSION = '1'

/**
 * 标签字段注册表：逻辑资源类型（与前端资源类名一致）→ 标签型字段列表
 * 与 src/configs/resources/*.ts 中的 FormField_Tags 保持一致（单一登记处）
 */
const TAG_FIELDS = {
  game: ['tags', 'developers', 'publisher'],
  manga: ['tags', 'author'],
  video: ['tags', 'actors'],
  videoFolder: ['tags', 'actors', 'voiceActors', 'productionTeam'],
  novel: ['tags'],
  audio: ['tags', 'actors'],
  website: ['tags'],
  software: ['tags'],
  singleImage: ['tags'],
  other: ['tags'],
  collection: ['tags']
}

/** 逻辑资源类型 → 数据库物理表名 */
const TYPE_TO_TABLE = {
  game: 'games',
  manga: 'manga',
  video: 'video',
  videoFolder: 'videoFolder',
  novel: 'novel',
  audio: 'audio',
  website: 'website',
  software: 'software',
  singleImage: 'singleImage',
  other: 'other',
  collection: 'collection'
}

/** 物理表名 → 逻辑资源类型 */
const TABLE_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_TO_TABLE).map(([type, table]) => [table, type])
)

/** 全局广播钩子（由 main.js 注入：向所有渲染进程推送标签变更事件） */
let broadcastHandler = null
function setBroadcastHandler(fn) {
  broadcastHandler = typeof fn === 'function' ? fn : null
}
function broadcast(channel, payload) {
  try {
    if (broadcastHandler) broadcastHandler(channel, payload)
  } catch (err) {
    console.warn('[TagIndex] 广播失败:', err.message)
  }
}

/** 标签归一化：仅做 trim + 小写（不做更激进转换，避免误伤） */
function normalizeTag(tag) {
  return String(tag == null ? '' : tag).trim().toLowerCase()
}

/**
 * 从资源对象中提取某字段的标签
 * 兼容旧存档：字符串值视为单元素数组
 * @returns {Array<{raw: string, norm: string}>}
 */
function extractFieldTags(obj, field) {
  if (!obj || obj[field] == null) return []
  const value = obj[field]
  const rawList = Array.isArray(value) ? value : (value === '' ? [] : [value])
  const result = []
  const seen = new Set()
  for (const raw of rawList) {
    const text = String(raw == null ? '' : raw).trim()
    if (!text) continue
    const norm = text.toLowerCase()
    // 同一资源同字段 norm 去重，保留第一个原文
    if (seen.has(norm)) continue
    seen.add(norm)
    result.push({ raw: text, norm })
  }
  return result
}

/** 提取一个资源所有注册字段：Map<field, Map<norm, raw>> */
function extractResourceTags(obj, resourceType) {
  const fields = TAG_FIELDS[resourceType]
  const map = new Map()
  if (!fields || !obj) return map
  for (const field of fields) {
    const fieldMap = new Map()
    for (const { raw, norm } of extractFieldTags(obj, field)) {
      if (!fieldMap.has(norm)) fieldMap.set(norm, raw)
    }
    map.set(field, fieldMap)
  }
  return map
}

/** 建表（幂等） */
function ensureTagTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tag_refs (
      resource_type TEXT NOT NULL,
      resource_id   TEXT NOT NULL,
      field         TEXT NOT NULL,
      tag           TEXT NOT NULL,
      tag_norm      TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      PRIMARY KEY (resource_type, resource_id, field, tag_norm)
    );
    CREATE INDEX IF NOT EXISTS idx_tag_refs_lookup
      ON tag_refs (resource_type, field, tag_norm);
    CREATE INDEX IF NOT EXISTS idx_tag_refs_resource
      ON tag_refs (resource_type, resource_id);

    CREATE TABLE IF NOT EXISTS tag_meta (
      resource_type TEXT NOT NULL,
      field         TEXT NOT NULL,
      tag_norm      TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      PRIMARY KEY (resource_type, field, tag_norm)
    );

    CREATE TABLE IF NOT EXISTS tag_index_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

/* =========================================================================
 * 事务内维护函数（由 sqlite.js 写入点调用）
 * ========================================================================= */

const stmtCache = new WeakMap()
function stmts(db) {
  let s = stmtCache.get(db)
  if (!s) {
    s = {
      deleteRef: db.prepare(
        'DELETE FROM tag_refs WHERE resource_type=? AND resource_id=? AND field=? AND tag_norm=?'
      ),
      updateRefRaw: db.prepare(
        'UPDATE tag_refs SET tag=?, updated_at=? WHERE resource_type=? AND resource_id=? AND field=? AND tag_norm=?'
      ),
      insertRef: db.prepare(
        `INSERT OR IGNORE INTO tag_refs (resource_type, resource_id, field, tag, tag_norm, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ),
      upsertMeta: db.prepare(
        `INSERT INTO tag_meta (resource_type, field, tag_norm, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_type, field, tag_norm) DO UPDATE SET updated_at = excluded.updated_at`
      )
    }
    stmtCache.set(db, s)
  }
  return s
}

/**
 * 资源保存时增量同步标签索引（必须在事务内）
 * @param {object} db better-sqlite3 实例
 * @param {string} resourceType 逻辑资源类型
 * @param {string} resourceId 资源 id
 * @param {object|null} oldObj 保存前的资源对象（新建时为 null）
 * @param {object} newObj 保存后的资源对象
 * @returns {{adds: Array, removes: Array}} 变更明细（供广播/前端增量更新）
 */
function syncTagRefsInTx(db, resourceType, resourceId, oldObj, newObj) {
  const changes = { adds: [], removes: [] }
  const fields = TAG_FIELDS[resourceType]
  if (!fields || !resourceId) return changes

  ensureTagTables(db)
  const s = stmts(db)
  const now = new Date().toISOString()
  const oldMap = extractResourceTags(oldObj, resourceType)
  const newMap = extractResourceTags(newObj, resourceType)

  for (const field of fields) {
    const oldField = oldMap.get(field) || new Map()
    const newField = newMap.get(field) || new Map()

    // 删除与大小写原文更新
    for (const [norm, oldRaw] of oldField) {
      if (!newField.has(norm)) {
        s.deleteRef.run(resourceType, resourceId, field, norm)
        changes.removes.push({ field, tag: oldRaw, norm })
      } else if (newField.get(norm) !== oldRaw) {
        // norm 不变但原文变化（如手动改了大小写）
        s.updateRefRaw.run(newField.get(norm), now, resourceType, resourceId, field, norm)
      }
    }

    // 新增
    for (const [norm, raw] of newField) {
      if (!oldField.has(norm)) {
        s.insertRef.run(resourceType, resourceId, field, raw, norm, now)
        s.upsertMeta.run(resourceType, field, norm, raw, now, now)
        changes.adds.push({ field, tag: raw, norm })
      }
    }
  }
  return changes
}

/**
 * 删除资源时清理其全部标签引用（必须在事务内）
 * @returns {Array<{field: string, tag: string, norm: string}>} 被删除的引用
 */
function removeAllRefsInTx(db, resourceType, resourceId) {
  const removed = []
  if (!TAG_FIELDS[resourceType] || !resourceId) return removed
  ensureTagTables(db)
  const rows = db.prepare(
    'SELECT field, tag, tag_norm FROM tag_refs WHERE resource_type=? AND resource_id=?'
  ).all(resourceType, resourceId)
  db.prepare('DELETE FROM tag_refs WHERE resource_type=? AND resource_id=?').run(resourceType, resourceId)
  for (const r of rows) removed.push({ field: r.field, tag: r.tag, norm: r.tag_norm })
  return removed
}

/* =========================================================================
 * 查询函数
 * ========================================================================= */

/**
 * 按字段查询标签候选及计数。
 * 从标签名册出发，没有引用的也返回，数量是 0。左侧和标签管理都要留着这个名字，不能因为没人用就消失。
 */
function getTagsByField(db, resourceType, field, options = {}) {
  ensureTagTables(db)
  const { keyword, limit = 500, offset = 0 } = options
  const where = ['m.resource_type = ?', 'm.field = ?']
  const params = [resourceType, field]
  if (keyword && keyword.trim()) {
    where.push('m.display_name LIKE ?')
    params.push(`%${keyword.trim()}%`)
  }
  return db.prepare(`
    SELECT m.display_name AS name, m.tag_norm AS norm, COUNT(r.resource_id) AS count
    FROM tag_meta m
    LEFT JOIN tag_refs r ON r.resource_type = m.resource_type
      AND r.field = m.field AND r.tag_norm = m.tag_norm
    WHERE ${where.join(' AND ')}
    GROUP BY m.tag_norm
    ORDER BY count DESC, name COLLATE NOCASE
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
}

/**
 * 批量查询多个字段的候选（供页面侧边栏一次拉全）
 * @param {Array<{key: string, resourceType: string, field: string}>} queries
 * @returns {Object<string, Array<{name: string, norm: string, count: number}>>} 按 key 索引
 */
function getTagsByFields(db, queries) {
  ensureTagTables(db)
  const result = {}
  if (!Array.isArray(queries)) return result
  for (const q of queries) {
    if (!q || !q.resourceType || !q.field) {
      if (q && q.key) result[q.key] = []
      continue
    }
    result[q.key] = getTagsByField(db, q.resourceType, q.field)
  }
  return result
}

/** 查询某标签的引用资源 id（分页） */
function getTagRefs(db, resourceType, field, tagNorm, options = {}) {
  ensureTagTables(db)
  const { limit = 200, offset = 0 } = options
  return db.prepare(`
    SELECT resource_id AS resourceId
    FROM tag_refs
    WHERE resource_type=? AND field=? AND tag_norm=?
    ORDER BY resource_id
    LIMIT ? OFFSET ?
  `).all(resourceType, field, tagNorm, limit, offset)
}

/** 管理页：字段下全部标签（LEFT JOIN，包含零引用；可选仅看零引用/疑似重复） */
function listTagsForManage(db, resourceType, field, options = {}) {
  ensureTagTables(db)
  const { keyword, unusedOnly = false, duplicatesOnly = false, limit = 1000, offset = 0 } = options
  const where = ['m.resource_type = ?', 'm.field = ?']
  const params = [resourceType, field]
  if (keyword && keyword.trim()) {
    where.push('m.display_name LIKE ?')
    params.push(`%${keyword.trim()}%`)
  }
  const havingClauses = []
  if (unusedOnly) havingClauses.push('COUNT(r.resource_id) = 0')
  if (duplicatesOnly) havingClauses.push('COUNT(DISTINCT r.tag) > 1')
  const having = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : ''
  return db.prepare(`
    SELECT m.display_name AS name, m.tag_norm AS norm,
           COUNT(r.resource_id) AS count,
           COUNT(DISTINCT r.tag) AS rawVariants,
           m.created_at AS createdAt, m.updated_at AS updatedAt
    FROM tag_meta m
    LEFT JOIN tag_refs r ON r.resource_type = m.resource_type
      AND r.field = m.field AND r.tag_norm = m.tag_norm
    WHERE ${where.join(' AND ')}
    GROUP BY m.tag_norm
    ${having}
    ORDER BY count DESC, name COLLATE NOCASE
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)
}

/* =========================================================================
 * 标签管理写操作（回写资源 + 更新索引，单事务；自带广播）
 * ========================================================================= */

function openDb() {
  // 延迟 require，避免循环依赖
  const sqlite = require('./sqlite')
  const Database = require('better-sqlite3')
  return { db: new Database(sqlite.getDatabasePath()), sqlite }
}

function tableExists(db, table) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)
}

/**
 * 标签写操作的统一实现：
 * 查出引用资源 → 回写 jsonData → 重建该字段相关索引行
 * @param {string} mode 'rename' | 'merge' | 'remove'
 */
function mutateTag({ mode, resourceType, field, sourceNorms, targetName }) {
  const table = TYPE_TO_TABLE[resourceType]
  if (!table) return { ok: false, message: `未知资源类型: ${resourceType}` }
  if (!TAG_FIELDS[resourceType]?.includes(field)) {
    return { ok: false, message: `字段 ${field} 不是标签字段` }
  }
  const sources = (Array.isArray(sourceNorms) ? sourceNorms : [sourceNorms])
    .map(n => normalizeTag(n)).filter(Boolean)
  if (sources.length === 0) return { ok: false, message: '未指定源标签' }

  const targetNorm = mode === 'remove' ? null : normalizeTag(targetName)
  if (mode !== 'remove' && !targetNorm) return { ok: false, message: '目标标签名不能为空' }
  const targetDisplay = mode === 'remove' ? null : String(targetName).trim()

  const { db } = openDb()
  try {
    ensureTagTables(db)
    if (!tableExists(db, table)) {
      db.close()
      return { ok: false, message: `资源表 ${table} 不存在` }
    }

    let affected = 0
    const now = new Date().toISOString()
    const run = db.transaction(() => {
      // 1. 定位受影响资源（按 norm）
      const placeholders = sources.map(() => '?').join(',')
      const rows = db.prepare(`
        SELECT DISTINCT resource_id FROM tag_refs
        WHERE resource_type=? AND field=? AND tag_norm IN (${placeholders})
      `).all(resourceType, field, ...sources)

      const selectResource = db.prepare(`SELECT id, jsonData, timestamp FROM "${table}" WHERE id=?`)
      const updateResource = db.prepare(
        `UPDATE "${table}" SET jsonData=?, timestamp=? WHERE id=?`
      )
      const deleteRefsForResource = db.prepare(
        `DELETE FROM tag_refs WHERE resource_type=? AND resource_id=? AND field=? AND tag_norm IN (${placeholders})`
      )
      const insertRef = db.prepare(
        `INSERT OR IGNORE INTO tag_refs (resource_type, resource_id, field, tag, tag_norm, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )

      // 2. 逐个回写资源 JSON；只有真正改动的资源才动它的索引行
      for (const { resource_id: id } of rows) {
        const row = selectResource.get(id)
        if (!row) continue // 资源行不存在（脏索引）：后续 rebuild 兜底，此处不删 refs
        let obj
        try { obj = JSON.parse(row.jsonData) } catch { continue }

        const isArr = Array.isArray(obj[field])
        const oldList = isArr
          ? obj[field].map(v => String(v == null ? '' : v).trim()).filter(Boolean)
          : (obj[field] != null && obj[field] !== '' ? [String(obj[field]).trim()] : [])

        const newList = []
        let changed = false
        for (const t of oldList) {
          if (sources.includes(t.toLowerCase())) {
            changed = true
            if (mode === 'remove') continue // 删除：直接丢弃
            // rename/merge：替换为目标名并按 norm 去重
            if (!newList.some(x => x.toLowerCase() === targetNorm)) newList.push(targetDisplay)
          } else {
            if (!newList.some(x => x.toLowerCase() === t.toLowerCase())) newList.push(t)
          }
        }
        if (!changed) continue

        if (isArr) obj[field] = newList
        else obj[field] = newList.length > 0 ? newList[0] : ''
        // 保留原 timestamp：标签批量操作不应改变资源本身的时间排序
        updateResource.run(JSON.stringify(obj), row.timestamp, id)

        // 3. 与回写同事务更新该资源的索引：先删源引用，再补目标引用
        deleteRefsForResource.run(resourceType, id, field, ...sources)
        if (mode !== 'remove' && newList.some(t => t.toLowerCase() === targetNorm)) {
          insertRef.run(resourceType, id, field, targetDisplay, targetNorm, now)
        }
        affected++
      }

      // 4. meta 维护
      if (mode !== 'remove') {
        db.prepare(`
          INSERT INTO tag_meta (resource_type, field, tag_norm, display_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(resource_type, field, tag_norm)
          DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at
        `).run(resourceType, field, targetNorm, targetDisplay, now, now)
      }
      for (const norm of sources) {
        if (mode === 'remove' || norm !== targetNorm) {
          db.prepare('DELETE FROM tag_meta WHERE resource_type=? AND field=? AND tag_norm=?')
            .run(resourceType, field, norm)
        }
      }
    })

    run()
    db.close()
    broadcast('tags:rebuilt', { resourceTypes: [resourceType], fields: [field] })
    return { ok: true, affected }
  } catch (err) {
    console.error('[TagIndex] 标签写操作失败:', err)
    try { db.close() } catch {}
    return { ok: false, message: err.message }
  }
}

/* =========================================================================
 * 全量重建与迁移
 * ========================================================================= */

/** 全量重建标签索引（独立事务），返回统计信息 */
function rebuildTagIndex(db) {
  ensureTagTables(db)
  const startedAt = Date.now()
  let refCount = 0
  const tx = db.transaction(() => {
    db.exec('DELETE FROM tag_refs')
    // meta 不清空：保留用户重命名后的 display_name；零引用 meta 由管理页清理
    const now = new Date().toISOString()
    const insertRef = db.prepare(
      `INSERT OR IGNORE INTO tag_refs (resource_type, resource_id, field, tag, tag_norm, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    const upsertMeta = db.prepare(
      `INSERT INTO tag_meta (resource_type, field, tag_norm, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(resource_type, field, tag_norm) DO UPDATE SET updated_at = excluded.updated_at`
    )

    for (const [resourceType, table] of Object.entries(TYPE_TO_TABLE)) {
      if (!tableExists(db, table)) continue
      const fields = TAG_FIELDS[resourceType]
      if (!fields) continue
      const rows = db.prepare(`SELECT id, jsonData FROM "${table}"`).all()
      for (const row of rows) {
        let obj
        try { obj = JSON.parse(row.jsonData) } catch { continue }
        const tagMap = extractResourceTags(obj, resourceType)
        for (const field of fields) {
          for (const [norm, raw] of (tagMap.get(field) || new Map())) {
            insertRef.run(resourceType, row.id, field, raw, norm, now)
            upsertMeta.run(resourceType, field, norm, raw, now, now)
            refCount++
          }
        }
      }
    }

    db.prepare('INSERT OR REPLACE INTO tag_index_meta (key, value) VALUES (?, ?)')
      .run('version', TAG_INDEX_VERSION)
  })
  tx()
  const durationMs = Date.now() - startedAt
  broadcast('tags:rebuilt', { reason: 'rebuild' })
  return { ok: true, refCount, durationMs }
}

/**
 * 启动时确保索引就绪：版本不符则全量重建一次
 * @param {object} db 已打开的数据库连接
 */
function ensureTagIndexReady(db) {
  try {
    ensureTagTables(db)
    const row = db.prepare('SELECT value FROM tag_index_meta WHERE key=?').get('version')
    if (!row || row.value !== TAG_INDEX_VERSION) {
      console.log('[TagIndex] 索引版本缺失或过期，开始全量构建...')
      const result = rebuildTagIndex(db)
      console.log(`[TagIndex] 全量构建完成：${result.refCount} 条引用，耗时 ${result.durationMs}ms`)
    }
  } catch (err) {
    console.error('[TagIndex] 初始化失败:', err)
  }
}

/* =========================================================================
 * 面向 IPC/HTTP 的自开连接包装
 * ========================================================================= */

function withDb(fn) {
  const { db } = openDb()
  try {
    return { ok: true, data: fn(db) }
  } catch (err) {
    console.error('[TagIndex] 查询失败:', err)
    return { ok: false, message: err.message }
  } finally {
    try { db.close() } catch {}
  }
}

/** 批量按字段查候选（页面侧边栏） */
function queryByFields(queries) {
  return withDb(db => getTagsByFields(db, queries))
}

/** 单字段候选查询 */
function queryByField(resourceType, field, options) {
  return withDb(db => getTagsByField(db, resourceType, field, options || {}))
}

/** 查询标签引用的资源 */
function queryRefs(resourceType, field, tagNorm, options) {
  return withDb(db => getTagRefs(db, resourceType, field, tagNorm, options || {}))
}

/** 管理页列表（含零引用/重复检测） */
function listForManage(resourceType, field, options) {
  return withDb(db => listTagsForManage(db, resourceType, field, options || {}))
}

/** 重命名标签（同步所有资源） */
function renameTag(resourceType, field, sourceNorm, targetName) {
  return mutateTag({ mode: 'rename', resourceType, field, sourceNorms: [sourceNorm], targetName })
}

/** 合并标签（多个源 → 一个目标） */
function mergeTags(resourceType, field, sourceNorms, targetName) {
  return mutateTag({ mode: 'merge', resourceType, field, sourceNorms, targetName })
}

/** 删除标签（从所有资源移除） */
function removeTag(resourceType, field, tagNorm) {
  return mutateTag({ mode: 'remove', resourceType, field, sourceNorms: [tagNorm] })
}

/** 全量重建（IPC 入口，自开连接） */
function rebuild() {
  const { db } = openDb()
  try {
    return rebuildTagIndex(db)
  } catch (err) {
    console.error('[TagIndex] 重建失败:', err)
    return { ok: false, message: err.message }
  } finally {
    try { db.close() } catch {}
  }
}

/**
 * 清掉已经没有对应资源的标签引用。
 * 以前删除资源只改页面名单，引用留在 tag_refs 里。重启后使用数还是删之前的数字。
 * @param {object} db better-sqlite3 实例
 * @returns {string[]} 清过引用的逻辑资源类型
 */
function removeDanglingTagRefs(db) {
  ensureTagTables(db)
  const affected = []
  const tx = db.transaction(() => {
    for (const [resourceType, table] of Object.entries(TYPE_TO_TABLE)) {
      if (!tableExists(db, table)) continue
      const result = db.prepare(
        `DELETE FROM tag_refs WHERE resource_type = ? AND resource_id NOT IN (SELECT id FROM "${table}")`
      ).run(resourceType)
      if (result.changes > 0) affected.push(resourceType)
    }
  })
  tx()
  return affected
}

/** 应用启动时调用：自开连接，版本不符则全量构建一次 */
function initOnStartup() {
  const { db } = openDb()
  try {
    ensureTagIndexReady(db)
    const affected = removeDanglingTagRefs(db)
    if (affected.length > 0) {
      console.log('[TagIndex] 已清掉失效标签引用:', affected.join(', '))
    }
  } catch (err) {
    console.error('[TagIndex] 启动初始化失败:', err)
  } finally {
    try { db.close() } catch {}
  }
}

module.exports = {
  TAG_FIELDS,
  TYPE_TO_TABLE,
  TABLE_TO_TYPE,
  normalizeTag,
  setBroadcastHandler,
  broadcast,
  ensureTagTables,
  ensureTagIndexReady,
  syncTagRefsInTx,
  removeAllRefsInTx,
  getTagsByField,
  getTagsByFields,
  getTagRefs,
  listTagsForManage,
  mutateTag,
  rebuildTagIndex,
  queryByFields,
  queryByField,
  queryRefs,
  listForManage,
  renameTag,
  mergeTags,
  removeTag,
  rebuild,
  initOnStartup
}
