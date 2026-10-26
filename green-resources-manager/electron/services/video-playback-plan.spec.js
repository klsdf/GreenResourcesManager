import { describe, expect, it } from 'vitest'
import { planPlayback, summarizeProbe } from './video-playback-plan'

describe('视频播放计划', () => {
  it('普通 MP4 直接播放', () => {
    expect(planPlayback({
      videoCodec: 'h264',
      audioCodec: 'aac',
      pixFmt: 'yuv420p',
      container: 'mp4'
    }).action).toBe('direct')
  })

  it('MKV 里的 H.264 和 AAC 只重封装', () => {
    expect(planPlayback({
      videoCodec: 'h264',
      audioCodec: 'aac',
      pixFmt: 'yuv420p',
      container: 'mkv'
    }).action).toBe('remux')
  })

  it('H.264 配 AC-3 时保留画面，只转音频', () => {
    expect(planPlayback({
      videoCodec: 'h264',
      audioCodec: 'ac3',
      pixFmt: 'yuv420p',
      container: 'mkv'
    }).action).toBe('audio')
  })

  it('HEVC 和 10 bit H.264 需要转码', () => {
    expect(planPlayback({
      videoCodec: 'hevc',
      audioCodec: 'aac',
      pixFmt: 'yuv420p10le',
      container: 'mkv'
    }).action).toBe('transcode')
    expect(planPlayback({
      videoCodec: 'h264',
      audioCodec: 'aac',
      pixFmt: 'yuv420p10le',
      container: 'mp4'
    }).action).toBe('transcode')
  })

  it('没有视频轨时停下来', () => {
    expect(planPlayback({ videoCodec: '', audioCodec: 'aac', container: 'mp4' }).action).toBe('error')
  })

  it('探测结果会跳过封面图，并读出正片编码', () => {
    const summary = summarizeProbe({
      format: { format_name: 'matroska,webm', duration: '90.5' },
      streams: [
        { codec_type: 'video', codec_name: 'mjpeg', disposition: { attached_pic: 1 } },
        { codec_type: 'video', codec_name: 'hevc', pix_fmt: 'yuv420p10le' },
        { codec_type: 'audio', codec_name: 'aac' }
      ]
    }, 'D:/anime/ep.mkv')
    expect(summary.videoCodec).toBe('hevc')
    expect(summary.audioCodec).toBe('aac')
    expect(summary.container).toBe('mkv')
    expect(summary.duration).toBe(90.5)
  })
})
