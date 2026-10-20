import fs from 'fs'
import path from 'path'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'locales', 'dist'].includes(entry.name)) continue
      walk(full, acc)
    } else if (entry.name.endsWith('.vue')) {
      acc.push(full)
    }
  }
  return acc
}

const files = walk('src')
const rows = []
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const match = text.match(/<template>([\s\S]*?)<\/template>/)
  if (!match) continue
  const template = match[1]
  const lines = template.split('\n').filter((line) => /[\u4e00-\u9fff]/.test(line) && !line.trim().startsWith('<!--'))
  if (lines.length) rows.push([lines.length, file])
}
rows.sort((a, b) => b[0] - a[0])
console.log('vue templates with chinese', rows.length, 'lines', rows.reduce((s, r) => s + r[0], 0))
for (const [count, file] of rows.slice(0, 50)) {
  console.log(`${count}\t${file}`)
}
