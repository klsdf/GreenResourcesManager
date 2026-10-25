#!/usr/bin/env node
/**
 * 校验 workshop/community-mods.json。
 *
 * 默认会联网检查每个插件仓库的 latest Release：
 * - manifest.json 是否存在、格式是否合法
 * - manifest.id 是否和索引一致
 * - 入口脚本是否存在
 *
 * 离线模式只检查索引本身：node scripts/validate-workshop-registry.mjs --offline
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  normalizeRegistry,
  normalizeManifest,
  buildReleaseAssetUrl
} = require('../electron/utils/workshop-utils.js')

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(scriptDir, '..')
const registryPath = path.join(projectDir, 'workshop', 'community-mods.json')
const offline = process.argv.includes('--offline')

const errors = []
const warnings = []

function fail(message) {
  errors.push(message)
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  return fetch(url, {
    ...options,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  })
}

async function checkRemote(mod) {
  let manifest
  try {
    const response = await fetchWithTimeout(buildReleaseAssetUrl(mod.repo, 'manifest.json'))
    if (!response.ok) {
      fail(`${mod.id}: 读取 ${mod.repo} 的 latest Release 失败（HTTP ${response.status}）。请先发布包含 manifest.json 的 Release。`)
      return
    }
    manifest = normalizeManifest(await response.json())
  } catch (error) {
    fail(`${mod.id}: 读取 ${mod.repo} 的 manifest.json 失败：${error.message}`)
    return
  }

  if (manifest.id !== mod.id) {
    fail(`${mod.id}: Release 里的 manifest.id 是 "${manifest.id}"，与索引不一致`)
  }

  try {
    const response = await fetchWithTimeout(
      buildReleaseAssetUrl(mod.repo, manifest.entry),
      { method: 'HEAD' }
    )
    if (!response.ok) {
      fail(`${mod.id}: latest Release 里找不到入口文件 ${manifest.entry}（HTTP ${response.status}）`)
    }
  } catch (error) {
    fail(`${mod.id}: 检查入口文件 ${manifest.entry} 失败：${error.message}`)
  }

  if (manifest.minAppVersion) {
    warnings.push(`${mod.id}: 需要应用版本 ${manifest.minAppVersion} 或更高`)
  }
}

async function main() {
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  } catch (error) {
    console.error(`无法读取 ${registryPath}：${error.message}`)
    process.exit(1)
  }

  let mods
  try {
    mods = normalizeRegistry(raw)
  } catch (error) {
    console.error(`索引格式不正确：${error.message}`)
    process.exit(1)
  }

  const seenRepos = new Map()
  for (const mod of mods) {
    if (seenRepos.has(mod.repo)) {
      fail(`${mod.id}: 仓库 ${mod.repo} 已经被 ${seenRepos.get(mod.repo)} 使用，一个仓库只能收录一个插件`)
    } else {
      seenRepos.set(mod.repo, mod.id)
    }
  }

  if (Array.isArray(raw)) {
    const validIds = new Set(mods.map((mod) => mod.id))
    const invalidCount = raw.length - mods.length
    if (invalidCount > 0) {
      warnings.push(`索引里有 ${invalidCount} 条记录因为字段不合法被忽略`)
    }
    for (const item of raw) {
      if (item && typeof item === 'object' && item.id && !validIds.has(item.id)) {
        warnings.push(`被忽略的条目：${String(item.id)}`)
      }
    }
  }

  if (!offline) {
    for (const mod of mods) {
      await checkRemote(mod)
    }
  }

  for (const warning of warnings) {
    console.warn(`警告：${warning}`)
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`错误：${error}`)
    }
    console.error(`\n校验失败：${errors.length} 个问题`)
    process.exit(1)
  }

  console.log(`校验通过：${mods.length} 个插件${offline ? '（仅检查索引格式）' : ''}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
