/**
 * 寻找本机的 ffmpeg 和 ffprobe。
 *
 * 转码程序作为独立进程调用，不链进应用。
 * 优先用环境变量和软件旁边的 third-party/ffmpeg，其次用系统 PATH。
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

/**
 * 可执行文件名。Windows 需要带 .exe。
 * @param {string} name ffmpeg 或 ffprobe
 * @returns {string} 当前系统上的文件名
 */
function executableName(name) {
  return process.platform === 'win32' ? `${name}.exe` : name
}

/**
 * 可能放着 ffmpeg 的目录。
 * 打包后在 resources 里，开发时在项目的 third-party 里。
 * @returns {string[]} 目录列表
 */
function binaryDirectories() {
  const directories = []
  if (process.resourcesPath) directories.push(path.join(process.resourcesPath, 'ffmpeg'))
  // 开发时放在项目的 third-party/ffmpeg。打包后 extraFiles 会把它放到 exe 旁边。
  directories.push(path.join(__dirname, '../../third-party/ffmpeg'))
  directories.push(path.join(path.dirname(process.execPath), 'third-party', 'ffmpeg'))
  try {
    const { app } = require('electron')
    if (app && typeof app.getAppPath === 'function') {
      directories.push(path.join(app.getAppPath(), 'third-party', 'ffmpeg'))
    }
  } catch {
    // 单元测试里没有 Electron，跳过应用目录。
  }
  return directories
}

/**
 * 在已知目录和 PATH 里找一个可执行文件。
 * @param {string} name ffmpeg 或 ffprobe
 * @returns {string} 找到时是绝对路径，找不到是空字符串
 */
function findExecutable(name) {
  const fileName = executableName(name)
  if (name === 'ffmpeg' && process.env.GRM_FFMPEG_PATH && fs.existsSync(process.env.GRM_FFMPEG_PATH)) {
    return process.env.GRM_FFMPEG_PATH
  }
  for (const directory of binaryDirectories()) {
    const candidate = path.join(directory, fileName)
    if (fs.existsSync(candidate)) return candidate
  }
  const pathEnv = process.env.PATH || ''
  for (const directory of pathEnv.split(path.delimiter)) {
    if (!directory) continue
    const candidate = path.join(directory, fileName)
    if (fs.existsSync(candidate)) return candidate
  }
  return ''
}

/**
 * 同时找出 ffmpeg 和 ffprobe。
 * 找到 ffmpeg 时，ffprobe 优先用同一目录里的那一个，避免两个版本不一致。
 * @returns {{ ffmpeg: string, ffprobe: string }} 找不到的项是空字符串
 */
function findFfmpegBinaries() {
  const ffmpeg = findExecutable('ffmpeg')
  let ffprobe = ''
  if (ffmpeg) {
    const sibling = path.join(path.dirname(ffmpeg), executableName('ffprobe'))
    if (fs.existsSync(sibling)) ffprobe = sibling
  }
  if (!ffprobe) ffprobe = findExecutable('ffprobe')
  return { ffmpeg, ffprobe }
}

/**
 * 运行一个命令并收集输出。
 * 用来跑 ffprobe。转码本身不走这里，因为转码要一直开着。
 * @param {string} binary 可执行文件
 * @param {string[]} args 参数
 * @param {number} timeoutMs 超时时间
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
function runCommand(binary, args, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    const child = spawn(binary, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      killProcess(child)
      finish({ code: -1, stdout, stderr: stderr || '命令超时' })
    }, timeoutMs)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      if (stderr.length > 8000) stderr = stderr.slice(-8000)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      finish({ code: -1, stdout, stderr: error.message })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      finish({ code: code == null ? -1 : code, stdout, stderr })
    })
  })
}

/**
 * 结束一个 ffmpeg 进程。
 * Windows 上连同它拉起的子进程一起结束，避免关标签后编码器还在占 CPU。
 * @param {import('child_process').ChildProcess | null} child 要结束的进程
 */
function killProcess(child) {
  if (!child || !child.pid) return
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true })
      return
    }
    child.kill('SIGKILL')
  } catch {
    // 进程已经退出时忽略。
  }
}

module.exports = {
  findFfmpegBinaries,
  runCommand,
  killProcess
}
