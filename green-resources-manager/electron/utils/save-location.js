/**
 * 存档位置记录。
 * 这个文件只放在项目根目录，只回答「真正的存档在哪」。
 * 主题、截图目录和资源都在那份存档里，不写回这里，换位置时直接搬走存档即可。
 */

const fs = require('fs')
const path = require('path')

/** 项目根目录下的位置记录文件名。 */
const POINTER_FILE_NAME = 'save-location.json'

/**
 * 位置记录文件的绝对路径。
 * @returns {string}
 */
function getPointerFilePath() {
  return path.join(process.cwd(), POINTER_FILE_NAME)
}

/**
 * 程序旁边的本地存档目录。位置记录为空时用这一份。
 * @returns {string}
 */
function getLocalSaveDataDirectory() {
  return path.join(process.cwd(), 'SaveData')
}

/**
 * 读取存档位置。没有记录或内容坏了时，当作使用本地存档。
 * @returns {{ saveDataPath: string }} saveDataPath 为空表示本地存档
 */
function readSaveLocationPointer() {
  const filePath = getPointerFilePath()
  if (!fs.existsSync(filePath)) return { saveDataPath: '' }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const saveDataPath = typeof data.saveDataPath === 'string' ? data.saveDataPath.trim() : ''
    return { saveDataPath }
  } catch (error) {
    console.warn('[存档位置] 读取失败，使用本地存档:', error.message)
    return { saveDataPath: '' }
  }
}

/**
 * 把存档位置写进项目根目录。只写路径，不写主题或其他设置。
 * @param {string} saveDataPath 自定义存档的父目录；空字符串表示改回本地
 */
function writeSaveLocationPointer(saveDataPath) {
  const payload = { saveDataPath: saveDataPath ? String(saveDataPath).trim() : '' }
  fs.writeFileSync(getPointerFilePath(), JSON.stringify(payload, null, 2), 'utf8')
}

/**
 * 根据位置记录得到真正的存档目录。
 * 记录的目录当前不存在时，用本地存档，避免再去读写一块已经不在的盘。
 * @returns {string}
 */
function resolveSaveDataDirectory() {
  const { saveDataPath } = readSaveLocationPointer()
  if (!saveDataPath) return getLocalSaveDataDirectory()
  if (!fs.existsSync(saveDataPath)) {
    console.warn('[存档位置] 记录的目录不存在，改用本地存档:', saveDataPath)
    return getLocalSaveDataDirectory()
  }
  return path.join(saveDataPath, 'SaveData')
}

module.exports = {
  readSaveLocationPointer,
  writeSaveLocationPointer,
  resolveSaveDataDirectory,
  getLocalSaveDataDirectory
}
