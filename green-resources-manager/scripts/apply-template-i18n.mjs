import fs from 'fs'
import path from 'path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { parse } from '@vue/compiler-dom'
import { NodeTypes } from '@vue/compiler-core'

const ATTRS = new Set([
  'title', 'description', 'placeholder', 'label', 'aria-label', 'alt',
  'text', 'tooltip', 'hint', 'message', 'content', 'subtitle'
])

function walkFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'locales', 'dist'].includes(entry.name)) continue
      walkFiles(full, acc)
    } else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

function walkAst(node, visit) {
  visit(node)
  if (node.children) node.children.forEach(child => walkAst(child, visit))
  if (node.props) node.props.forEach(prop => walkAst(prop, visit))
  if (node.branches) node.branches.forEach(branch => walkAst(branch, visit))
}

function jsString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n')}'`
}

const files = walkFiles('src')
let changed = 0
let replacements = 0

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const sfc = parseSfc(source, { filename: file })
  const block = sfc.descriptor.template
  if (!block) continue
  const template = block.content
  let ast
  try {
    ast = parse(template)
  } catch (error) {
    console.error('parse fail', file, error.message)
    continue
  }

  const edits = []
  walkAst(ast, (node) => {
    if (node.type === NodeTypes.TEXT && /[\u4e00-\u9fff]/.test(node.content)) {
      const trimmed = node.content.replace(/\s+/g, ' ').trim()
      if (!trimmed) return
      const leading = node.content.match(/^\s*/)[0]
      const trailing = node.content.match(/\s*$/)[0]
      edits.push({
        start: node.loc.start.offset,
        end: node.loc.end.offset,
        text: `${leading}{{ $lt(${jsString(trimmed)}) }}${trailing}`
      })
    }
    if (
      node.type === NodeTypes.ATTRIBUTE &&
      ATTRS.has(node.name) &&
      node.value?.content &&
      /[\u4e00-\u9fff]/.test(node.value.content)
    ) {
      edits.push({
        start: node.loc.start.offset,
        end: node.loc.end.offset,
        text: `:${node.name}="$lt(${jsString(node.value.content)})"`
      })
    }
  })

  if (!edits.length) continue
  edits.sort((a, b) => b.start - a.start)
  let next = template
  for (const edit of edits) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end)
  }
  const start = block.loc.start.offset
  const end = block.loc.end.offset
  const updated = source.slice(0, start) + next + source.slice(end)
  fs.writeFileSync(file, updated)
  changed += 1
  replacements += edits.length
}

console.log('files', changed, 'replacements', replacements)
