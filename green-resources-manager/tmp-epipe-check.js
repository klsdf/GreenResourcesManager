const { app } = require('electron')
const fs = require('fs')
const path = require('path')
const reportPath = path.join(__dirname, 'tmp-epipe-report.txt')
const lines = []
function note(message) {
  lines.push(String(message))
  try { fs.writeFileSync(reportPath, lines.join('\n')) } catch (e) {}
}

process.on('uncaughtException', (error) => {
  note('UNCAUGHT ' + (error && error.code) + '\n' + (error && error.stack))
})

app.whenReady().then(() => {
  const handle = process.stdout._handle
  note('handle=' + (handle && handle.constructor && handle.constructor.name))
  try {
    if (handle && typeof handle.close === 'function') handle.close()
    note('handle closed')
  } catch (error) {
    note('handle close failed ' + error.message)
  }
  setTimeout(() => {
    try {
      console.log('after-handle-close')
      note('console.log returned')
    } catch (error) {
      note('console.log threw ' + error.code + ' ' + error.message)
    }
    try {
      process.stdout.write('raw\n', (error) => {
        note('write cb ' + (error && error.code))
      })
      note('write returned')
    } catch (error) {
      note('write threw ' + error.code + ' ' + error.message)
    }
    setTimeout(() => {
      note('done')
      app.exit(0)
    }, 500)
  }, 100)
})
