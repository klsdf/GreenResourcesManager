import fs from 'fs'
import * as OpenCC from 'opencc-js'

const convert = OpenCC.Converter({ from: 'cn', to: 'twp' })
const sources = JSON.parse(fs.readFileSync('scripts/phrase-sources.json', 'utf8'))
const book = {}
for (const source of sources) {
  const parts = source.split(/(\{[^}]+\})/g)
  book[source] = parts.map(part => part.startsWith('{') ? part : convert(part)).join('')
}
fs.mkdirSync('src/locales/phrases', { recursive: true })
fs.writeFileSync('src/locales/phrases/zh-TW.json', JSON.stringify(book, null, 2))
console.log('zh-TW', Object.keys(book).length)
