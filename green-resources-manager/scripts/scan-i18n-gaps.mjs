import fs from 'fs'
import path from 'path'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'locales', 'dist', 'data'].includes(entry.name)) continue
      walk(full, acc)
    } else if (/\.(vue|ts)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

const files = walk('src')
const re = /['"`]([^'"`\n]{0,80}[\u4e00-\u9fff][^'"`\n]{0,80})['"`]/g
const map = new Map()

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    if (trimmed.includes('console.')) continue
    re.lastIndex = 0
    let match
    while ((match = re.exec(line))) {
      const value = match[1].trim()
      if (value.length < 1 || value.length > 40) continue
      if (!/[\u4e00-\u9fff]/.test(value)) continue
      if (value.includes('${') || value.includes('\\')) continue
      map.set(value, (map.get(value) || 0) + 1)
    }
  }
}

const rows = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
console.log('unique', rows.length)
for (const [text, count] of rows) {
  console.log(`${count}\t${text}`)
}
