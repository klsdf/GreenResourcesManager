/**
 * 决定一个本地视频怎么播。
 *
 * 浏览器只能稳定解 H.264、VP8、VP9、AV1 和 AAC、MP3、Opus、Vorbis。
 * 容器打得开、音频也能响，但视频轨解不了时，画面就是黑的。
 * 这里只根据 ffprobe 的结果选择直接播、重封装或转码，不启动 ffmpeg。
 */

/** Chromium 可以直接解的视频编码。 */
const DIRECT_VIDEO = new Set(['h264', 'vp8', 'vp9', 'av1'])

/** Chromium 可以直接解的音频编码。没有音频轨也算通过。 */
const DIRECT_AUDIO = new Set(['aac', 'mp3', 'opus', 'vorbis'])

/** 可以直接交给 video 标签的容器。其余容器即使编码对，也先重封装。 */
const DIRECT_CONTAINER = new Set(['mp4', 'webm', 'mov'])

/**
 * 从文件名和 ffprobe 的 format_name 判断容器。
 * format_name 经常是一串别名，例如 "mov,mp4,m4a,3gp,3g2,mj2"，所以按包含关系判断。
 * @param {string} formatName ffprobe format.format_name
 * @param {string} filePath 文件路径，format_name 为空时用扩展名兜底
 * @returns {string} mp4、webm、mkv 或扩展名
 */
function containerKind(formatName, filePath) {
  const name = String(formatName || '').toLowerCase()
  const ext = String(filePath || '').toLowerCase().split('.').pop() || ''
  if (name.includes('mp4') || name.includes('mov') || ext === 'mp4' || ext === 'm4v' || ext === 'mov') return 'mp4'
  if (ext === 'webm' || (name.includes('webm') && !name.includes('matroska'))) return 'webm'
  if (name.includes('matroska') || ext === 'mkv') return 'mkv'
  return ext || 'unknown'
}

/**
 * H.264 的 10 bit 画质 Chromium 经常解不出，要转码。
 * 只检查 H.264。VP9 和 AV1 的高位深先尝试直接播，失败再由播放页降级。
 * @param {string} videoCodec 视频编码
 * @param {string} pixFmt 像素格式，例如 yuv420p10le
 * @returns {boolean} 需要转码时为 true
 */
function isTenBitH264(videoCodec, pixFmt) {
  if (videoCodec !== 'h264') return false
  return /(?:^|[^0-9])(10|12|16)(?:[^0-9]|$)/.test(String(pixFmt || ''))
}

/**
 * 把 ffprobe 的 JSON 收成播放计划用的摘要。
 * 附带的封面图也是 video 流，但不能当成正片。
 * @param {object} json ffprobe 打印的 JSON
 * @param {string} filePath 被探测的文件
 * @returns {{ videoCodec: string, audioCodec: string, pixFmt: string, container: string, duration: number }}
 */
function summarizeProbe(json, filePath) {
  const streams = Array.isArray(json && json.streams) ? json.streams : []
  const video = streams.find((stream) => {
    if (!stream || stream.codec_type !== 'video') return false
    if (stream.codec_name === 'mjpeg' || stream.codec_name === 'png') return false
    if (stream.disposition && stream.disposition.attached_pic === 1) return false
    return true
  })
  const audio = streams.find((stream) => stream && stream.codec_type === 'audio')
  const format = (json && json.format) || {}
  const duration = Number(format.duration) || Number(video && video.duration) || 0
  return {
    videoCodec: String((video && video.codec_name) || '').toLowerCase(),
    audioCodec: String((audio && audio.codec_name) || '').toLowerCase(),
    pixFmt: String((video && video.pix_fmt) || '').toLowerCase(),
    container: containerKind(format.format_name, filePath),
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0
  }
}

/**
 * 选择播放方式。
 * 视频编码不行就转码；只有音频不行就保留视频、重编码音频；只有容器不行就复制两路流。
 * @param {{ videoCodec?: string, audioCodec?: string, pixFmt?: string, container?: string }} probe 探测摘要
 * @returns {{ action: 'direct' | 'remux' | 'audio' | 'transcode' | 'error', reason: string }}
 */
function planPlayback(probe) {
  if (!probe || !probe.videoCodec) {
    return { action: 'error', reason: '没有视频轨' }
  }
  const videoOk = DIRECT_VIDEO.has(probe.videoCodec) && !isTenBitH264(probe.videoCodec, probe.pixFmt)
  const audioOk = !probe.audioCodec || DIRECT_AUDIO.has(probe.audioCodec)
  const containerOk = DIRECT_CONTAINER.has(probe.container)
  if (!videoOk) return { action: 'transcode', reason: probe.videoCodec }
  if (!audioOk) return { action: 'audio', reason: probe.audioCodec }
  if (!containerOk) return { action: 'remux', reason: probe.container }
  return { action: 'direct', reason: '' }
}

module.exports = {
  containerKind,
  isTenBitH264,
  summarizeProbe,
  planPlayback
}
