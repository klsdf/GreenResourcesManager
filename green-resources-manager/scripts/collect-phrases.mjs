import fs from 'fs'
import path from 'path'

const phrases = new Set()

function add(value) {
  if (!value || !/[\u4e00-\u9fff{]/.test(value)) return
  phrases.add(value)
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'locales', 'dist', 'phrases'].includes(entry.name)) continue
      walk(full, acc)
    } else if (/\.(vue|ts|js)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

  const callRe = /(?:\$lt|\$lf|\blt|\blf)\(\s*'((?:\\'|[^'])*)'/g
for (const file of walk('src')) {
  const text = fs.readFileSync(file, 'utf8')
  let match
  while ((match = callRe.exec(text))) {
    add(match[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'))
  }
  const labelRe = /(?:label|title|placeholder|description|buttonText|addTitle|editTitle|addButtonText|editButtonText|missingLabel|neverAccessed|justAccessed|accessAction|yesterdayAccessed):\s*'([^'\n]*[\u4e00-\u9fff][^'\n]*)'/g
  while ((match = labelRe.exec(text))) add(match[1])
}

const jsonKeys = new Set(['name', 'description', 'label', 'title', 'buttonText', 'placeholder', 'addTitle', 'editTitle', 'addButtonText', 'editButtonText', 'missingLabel'])
function collectJson(value) {
  if (Array.isArray(value)) {
    value.forEach(collectJson)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && jsonKeys.has(key)) add(child.trim())
    else if (child && typeof child === 'object') collectJson(child)
  }
}
function walkJson(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkJson(full)
    else if (entry.name.endsWith('.json')) collectJson(JSON.parse(fs.readFileSync(full, 'utf8')))
  }
}
walkJson('configs/pages')

for (const extra of [
  '{hours}小时 {minutes}分钟 {seconds}秒',
  '{minutes}分钟 {seconds}秒',
  '{seconds}秒',
  '{n}分钟前',
  '{n}小时前',
  '{n}天前',
  '{n}周前',
  '{n}个月前',
  '{n}年前',
  '{minutes} 分钟',
  '{hours} 小时 {mins} 分钟',
  '{days} 天 {hours} 小时',
  '已浏览 {count} 次',
  '等{count}人',
  '选择{name}',
  '请选择{name}',
  '请输入{name}',
  '刚刚{action}',
  '{n}分钟前{action}',
  '{n}小时前{action}',
  '昨天{action}',
  '{n}天前{action}',
  '{n}周前{action}',
  '暂无{name}',
  '{n} 字',
  '{n} 千字',
  '{n} 万字',
  '清除筛选',
  '确定',
  '多选模式',
  '退出多选'
]) add(extra)

const list = [...phrases]
fs.mkdirSync('scripts/phrase-chunks', { recursive: true })
const size = Math.ceil(list.length / 3)
for (let i = 0; i < 3; i++) {
  fs.writeFileSync(`scripts/phrase-chunks/${i}.json`, JSON.stringify(list.slice(i * size, (i + 1) * size), null, 2))
}
fs.writeFileSync('scripts/phrase-sources.json', JSON.stringify(list, null, 2))
console.log('phrases', list.length, 'chunk', size)
