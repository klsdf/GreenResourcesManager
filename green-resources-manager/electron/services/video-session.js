/**
 * 一次视频播放会话。
 *
 * 能直接播的文件只返回 file 地址。
 * 需要重封装或转码时，ffmpeg 把画面写成 HLS，本机 HTTP 服务只对 127.0.0.1 提供切片。
 * 拖动进度会停掉当前 ffmpeg，从新的秒数再开一条，避免后台把整部片转完。
 */

const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { planPlayback, summarizeProbe } = require('./video-playback-plan')
const { findFfmpegBinaries, runCommand, killProcess } = require('./ffmpeg-bin')
const { getFileUrl } = require('../utils/path-utils')

/** 和视频资源接受的扩展名一致，用来列同一目录的选集。 */
const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts'
])

/** 正在播放的会话。键是会话编号。 */
const sessions = new Map()

/** 探测缓存。文件大小和修改时间变了就重新探测。 */
const probeCache = new Map()

/** 本机切片服务。第一次需要转码时才启动。 */
let mediaServer = null

/**
 * 保证临时目录存在。
 * @param {string} directory 目录
 */
function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true })
}

/**
 * 删掉会话的临时切片。
 * 拖动进度后旧切片不能留着，否则播放器会接着读上一段。
 * @param {string} directory 会话目录
 */
function emptyDir(directory) {
  fs.rmSync(directory, { recursive: true, force: true })
  ensureDir(directory)
}

/**
 * 启动只监听本机的切片服务。
 * 播放页和这个服务不同源，所以要允许跨域读取播放列表。
 * @returns {Promise<number>} 监听端口
 */
function ensureMediaServer() {
  if (mediaServer) return Promise.resolve(mediaServer.port)
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] !== 's' || !parts[1] || !parts[2]) {
        response.writeHead(404)
        response.end()
        return
      }
      const session = sessions.get(parts[1])
      if (!session) {
        response.writeHead(404)
        response.end()
        return
      }
      const fileName = parts[2]
      if (fileName !== path.basename(fileName) || fileName === '.' || fileName === '..') {
        response.writeHead(404)
        response.end()
        return
      }
      const filePath = path.join(session.directory, fileName)
      if (!fs.existsSync(filePath)) {
        response.writeHead(404)
        response.end()
        return
      }
      const ext = path.extname(fileName).toLowerCase()
      const type = ext === '.m3u8'
        ? 'application/vnd.apple.mpegurl'
        : ext === '.ts'
          ? 'video/mp2t'
          : 'video/mp4'
      response.writeHead(200, {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      })
      fs.createReadStream(filePath).pipe(response)
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      mediaServer = { server, port: address.port }
      resolve(address.port)
    })
  })
}

/**
 * 读取视频轨信息。同一文件没变过就用上次的结果。
 * @param {string} filePath 视频文件
 * @param {string} ffprobe ffprobe 路径
 * @returns {Promise<object>} 播放计划用的摘要
 */
async function probeFile(filePath, ffprobe) {
  const stat = fs.statSync(filePath)
  const cacheKey = `${filePath}|${stat.size}|${stat.mtimeMs}`
  if (probeCache.has(cacheKey)) return probeCache.get(cacheKey)
  const result = await runCommand(ffprobe, [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ])
  if (result.code !== 0) {
    throw new Error(result.stderr || '无法读取视频信息')
  }
  const summary = summarizeProbe(JSON.parse(result.stdout || '{}'), filePath)
  probeCache.set(cacheKey, summary)
  return summary
}

/**
 * 按播放方式拼 ffmpeg 参数。
 * 流畅档降低分辨率和编码速度，标准档尽量保住 1080p。
 * @param {{ action: string, quality: string, filePath: string, startSeconds: number, directory: string, hasAudio: boolean }} options 这次转码的选择
 * @returns {string[]} ffmpeg 参数
 */
function buildFfmpegArgs(options) {
  const fast = options.quality === 'fast'
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  if (options.startSeconds > 0.3) {
    args.push('-ss', options.startSeconds.toFixed(3))
  }
  args.push('-i', options.filePath, '-map', '0:v:0')
  if (options.hasAudio) args.push('-map', '0:a:0')
  if (options.action === 'transcode') {
    args.push(
      '-c:v', 'libx264',
      '-preset', fast ? 'ultrafast' : 'veryfast',
      '-crf', fast ? '28' : '20',
      '-pix_fmt', 'yuv420p',
      '-vf', fast ? "scale='min(1280,iw)':-2" : "scale='min(1920,iw)':-2"
    )
  } else {
    args.push('-c:v', 'copy')
  }
  if (options.hasAudio) {
    if (options.action === 'remux') args.push('-c:a', 'copy')
    else args.push('-c:a', 'aac', '-ac', '2', '-b:a', '160k')
  }
  args.push(
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '0',
    '-hls_playlist_type', 'event',
    '-hls_segment_type', 'fmp4',
    '-hls_flags', 'independent_segments+append_list',
    '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_segment_filename', 'seg_%05d.m4s',
    'index.m3u8'
  )
  return args
}

/**
 * 等播放列表出现。ffmpeg 刚启动时文件还没写出来。
 * @param {string} playlist 播放列表路径
 * @param {import('child_process').ChildProcess} child ffmpeg 进程
 * @param {number} generation 这次启动的代数，过期就不再等
 * @param {object} session 会话
 * @returns {Promise<boolean>} 列表可用时为 true
 */
function waitForPlaylist(playlist, child, generation, session) {
  return new Promise((resolve) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (session.generation !== generation) {
        clearInterval(timer)
        resolve(false)
        return
      }
      if (fs.existsSync(playlist) && fs.statSync(playlist).size > 0) {
        clearInterval(timer)
        resolve(true)
        return
      }
      if (child.exitCode != null || Date.now() - started > 12000) {
        clearInterval(timer)
        resolve(false)
      }
    }, 200)
  })
}

/**
 * 停掉会话里正在跑的 ffmpeg，并清掉切片。
 * @param {object} session 会话
 */
function stopEncoding(session) {
  killProcess(session.child)
  session.child = null
  if (session.directory && fs.existsSync(session.directory)) emptyDir(session.directory)
}

/**
 * 按计划启动 ffmpeg，成功后返回 HLS 地址。
 * 重封装失败时自动改成转码再试一次，因为有些编码不能原样放进切片。
 * @param {object} session 会话
 * @param {string} action remux、audio 或 transcode
 * @param {number} startSeconds 从这一秒开始
 * @returns {Promise<{ url: string, action: string }>}
 */
async function startEncoding(session, action, startSeconds) {
  const binaries = findFfmpegBinaries()
  if (!binaries.ffmpeg) {
    throw new Error('找不到 ffmpeg。把 ffmpeg.exe 和 ffprobe.exe 放到 third-party/ffmpeg，或加入系统 PATH')
  }
  stopEncoding(session)
  session.generation += 1
  const generation = session.generation
  session.offset = startSeconds
  ensureDir(session.directory)
  const args = buildFfmpegArgs({
    action,
    quality: session.quality,
    filePath: session.filePath,
    startSeconds,
    directory: session.directory,
    hasAudio: !!session.probe.audioCodec
  })
  const child = spawn(binaries.ffmpeg, args, { windowsHide: true, cwd: session.directory })
  session.child = child
  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk
    if (stderr.length > 4000) stderr = stderr.slice(-4000)
  })
  const playlist = path.join(session.directory, 'index.m3u8')
  const ready = await waitForPlaylist(playlist, child, generation, session)
  if (session.generation !== generation) {
    throw new Error('播放已切换')
  }
  if (!ready) {
    killProcess(child)
    if (action !== 'transcode') {
      return startEncoding(session, 'transcode', startSeconds)
    }
    throw new Error(stderr.trim() || '转码没有产生可以播放的数据')
  }
  const port = await ensureMediaServer()
  session.mode = action
  return {
    action,
    url: `http://127.0.0.1:${port}/s/${session.id}/index.m3u8?g=${generation}`
  }
}

/**
 * 打开一个播放会话。
 * 直接播放不启动 ffmpeg。调用方如果发现黑屏，再用 escalate 降级。
 * @param {{ filePath: string, startSeconds?: number, quality?: string }} request 播放请求
 * @returns {Promise<object>} 给播放页的结果
 */
async function openSession(request) {
  const filePath = request && request.filePath
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: '视频文件不存在' }
  }
  const binaries = findFfmpegBinaries()
  let probe = { videoCodec: '', audioCodec: '', pixFmt: '', container: 'unknown', duration: 0 }
  if (binaries.ffprobe) {
    try {
      probe = await probeFile(filePath, binaries.ffprobe)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  const plan = binaries.ffprobe ? planPlayback(probe) : { action: 'direct', reason: '' }
  const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session = {
    id,
    filePath,
    quality: request.quality === 'fast' ? 'fast' : 'standard',
    probe,
    mode: plan.action,
    generation: 0,
    offset: 0,
    child: null,
    directory: path.join(os.tmpdir(), 'grm-video', id)
  }
  sessions.set(id, session)
  const startSeconds = Math.max(0, Number(request.startSeconds) || 0)
  if (plan.action === 'error') {
    return {
      success: false,
      sessionId: id,
      error: plan.reason,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      container: probe.container
    }
  }
  if (plan.action === 'direct' || !binaries.ffmpeg) {
    if (plan.action !== 'direct' && !binaries.ffmpeg) {
      return {
        success: false,
        sessionId: id,
        error: '这个视频需要 ffmpeg 才能播放',
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        container: probe.container,
        duration: probe.duration
      }
    }
    session.mode = 'direct'
    return {
      success: true,
      sessionId: id,
      mode: 'direct',
      url: getFileUrl(filePath),
      duration: probe.duration,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      container: probe.container,
      startSeconds: 0
    }
  }
  try {
    const encoded = await startEncoding(session, plan.action, startSeconds)
    return {
      success: true,
      sessionId: id,
      mode: encoded.action,
      url: encoded.url,
      duration: probe.duration,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      container: probe.container,
      startSeconds
    }
  } catch (error) {
    return {
      success: false,
      sessionId: id,
      error: error.message,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      container: probe.container,
      duration: probe.duration
    }
  }
}

/**
 * 直接播放黑屏时，改成转码再试一次。
 * @param {string} sessionId 会话编号
 * @param {number} startSeconds 从这一秒继续
 * @returns {Promise<object>} 新的播放地址
 */
async function escalateSession(sessionId, startSeconds) {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '播放会话不存在' }
  try {
    const encoded = await startEncoding(session, 'transcode', Math.max(0, Number(startSeconds) || 0))
    return {
      success: true,
      sessionId,
      mode: encoded.action,
      url: encoded.url,
      duration: session.probe.duration,
      startSeconds: session.offset
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 转码播放时拖动进度。直接播放由页面自己改 currentTime。
 * @param {string} sessionId 会话编号
 * @param {number} seconds 目标秒数
 * @returns {Promise<object>} 新的播放地址
 */
async function seekSession(sessionId, seconds) {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '播放会话不存在' }
  if (session.mode === 'direct') return { success: true, handled: false }
  try {
    const encoded = await startEncoding(session, session.mode === 'direct' ? 'transcode' : session.mode, Math.max(0, Number(seconds) || 0))
    return { success: true, handled: true, url: encoded.url, startSeconds: session.offset, mode: encoded.action }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 暂停时停掉 ffmpeg，但留下已经写出的切片。
 * 继续播放时从当前秒数重新开一条，避免暂停期间还在占 CPU。
 * @param {string} sessionId 会话编号
 * @returns {{ success: boolean, error?: string }}
 */
function pauseEncoding(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '播放会话不存在' }
  if (session.mode === 'direct') return { success: true }
  killProcess(session.child)
  session.child = null
  session.generation += 1
  return { success: true }
}
function closeSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return { success: true }
  killProcess(session.child)
  session.child = null
  session.generation += 1
  fs.rmSync(session.directory, { recursive: true, force: true })
  sessions.delete(sessionId)
  return { success: true }
}

/**
 * 退出应用时结束全部转码。
 */
function closeAllSessions() {
  for (const sessionId of Array.from(sessions.keys())) closeSession(sessionId)
  if (mediaServer) {
    mediaServer.server.close()
    mediaServer = null
  }
}

/**
 * 用 ffmpeg 抓当前画面，存到存档的 Video/screenshots 里。
 * 不从网页画布截，是因为转码地址和播放页不同源，画布会被浏览器拦住。
 * @param {string} sessionId 会话编号
 * @param {number} seconds 画面所在的秒数
 * @returns {Promise<{ success: boolean, filepath?: string, error?: string }>}
 */
async function captureFrame(sessionId, seconds) {
  const session = sessions.get(sessionId)
  if (!session) return { success: false, error: '播放会话不存在' }
  const binaries = findFfmpegBinaries()
  if (!binaries.ffmpeg) return { success: false, error: '找不到 ffmpeg，无法截图' }
  const { getSaveDataDirectory } = require('../database/sqlite')
  const baseName = path.basename(session.filePath, path.extname(session.filePath)).replace(/[<>:"/\\|?*]/g, '_') || 'video'
  const directory = path.join(getSaveDataDirectory(), 'Video', 'screenshots', baseName)
  ensureDir(directory)
  const stamp = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const filename = `shot-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.jpg`
  const filepath = path.join(directory, filename)
  const at = Math.max(0, Number(seconds) || 0).toFixed(3)
  const result = await runCommand(binaries.ffmpeg, [
    '-y', '-ss', at, '-i', session.filePath, '-frames:v', '1', '-q:v', '3', filepath
  ], 20000)
  if (result.code !== 0 || !fs.existsSync(filepath)) {
    return { success: false, error: result.stderr || '截图失败' }
  }
  return { success: true, filepath }
}

/**
 * 列出同一目录里的视频，按文件名排序。
 * 番剧换集用这份列表，不把整份列表塞进网址。
 * @param {string} filePath 当前正在播的文件
 * @returns {{ success: boolean, files?: Array<{ name: string, path: string }>, error?: string }}
 */
function listSiblings(filePath) {
  if (!filePath) return { success: false, error: '未提供视频路径' }
  const directory = path.dirname(filePath)
  if (!fs.existsSync(directory)) return { success: false, error: '视频所在目录不存在' }
  const files = fs.readdirSync(directory)
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right, 'zh', { numeric: true, sensitivity: 'base' }))
    .map((name) => ({
      name: path.basename(name, path.extname(name)),
      path: path.join(directory, name)
    }))
  return { success: true, files }
}

module.exports = {
  openSession,
  escalateSession,
  seekSession,
  pauseEncoding,
  closeSession,
  closeAllSessions,
  captureFrame,
  listSiblings,
  buildFfmpegArgs
}
