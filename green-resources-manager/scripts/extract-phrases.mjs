import fs from 'fs'
import path from 'path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { parse } from '@vue/compiler-dom'
import { NodeTypes } from '@vue/compiler-core'

const ATTRS = new Set([
  'title', 'description', 'placeholder', 'label', 'aria-label', 'alt',
  'text', 'tooltip', 'hint', 'message', 'content', 'confirm-text',
  'cancel-text', 'ok-text', 'empty-text', 'button-text', 'add-title',
  'edit-title', 'add-button-text', 'edit-button-text', 'subtitle'
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

const phrases = new Set()
const files = walkFiles('src')
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const sfc = parseSfc(source, { filename: file })
  const template = sfc.descriptor.template?.content
  if (!template) continue
  let ast
  try {
    ast = parse(template)
  } catch (error) {
    console.error('parse fail', file, error.message)
    continue
  }
  walkAst(ast, (node) => {
    if (node.type === NodeTypes.TEXT) {
      const text = node.content.replace(/\s+/g, ' ').trim()
      if (/[\u4e00-\u9fff]/.test(text)) phrases.add(text)
    }
    if (node.type === NodeTypes.ATTRIBUTE && ATTRS.has(node.name) && node.value?.content && /[\u4e00-\u9fff]/.test(node.value.content)) {
      phrases.add(node.value.content.trim())
    }
  })
}

function collectJson(value, keys) {
  if (Array.isArray(value)) {
    value.forEach(item => collectJson(item, keys))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && keys.has(key) && /[\u4e00-\u9fff]/.test(child)) {
      phrases.add(child.trim())
    } else if (child && typeof child === 'object') {
      collectJson(child, keys)
    }
  }
}

const jsonKeys = new Set(['name', 'description', 'label', 'title', 'buttonText', 'placeholder', 'addTitle', 'editTitle', 'addButtonText', 'editButtonText', 'missingLabel'])
function walkJson(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkJson(full)
    else if (entry.name.endsWith('.json')) {
      collectJson(JSON.parse(fs.readFileSync(full, 'utf8')), jsonKeys)
    }
  }
}
walkJson('configs/pages')

const fieldRe = /new FormField_\w+\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g
function walkTs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walkTs(full)
    } else if (/\.(ts|vue|js)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8')
      let match
      while ((match = fieldRe.exec(text))) phrases.add(match[1])
      const labelRe = /label:\s*'([^'\n]*[\u4e00-\u9fff][^'\n]*)'/g
      while ((match = labelRe.exec(text))) phrases.add(match[1])
      const titleRe = /(?:title|placeholder|message|description|buttonText|addTitle|editTitle):\s*'([^'\n]*[\u4e00-\u9fff][^'\n]*)'/g
      while ((match = titleRe.exec(text))) phrases.add(match[1])
    }
  }
}
walkTs('src')

const list = [...phrases].filter(item => item.length <= 180)
fs.writeFileSync('scripts/phrase-sources.json', JSON.stringify(list, null, 2))
console.log('phrases', list.length, 'skipped long', phrases.size - list.length)
