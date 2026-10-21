/**
 * 完成标记点亮时的烟花和彩带。
 * 单独画在一层盖住全屏的画布上，播完就拆掉。画布不接收点击，所以不会挡住详情页。
 */

/** 烟花和彩带共用的颜色。偏亮，深色和浅色背景上都能看见。 */
const BURST_COLORS = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#ff9f1c', '#f72585', '#80ffdb']

/**
 * 一颗烟花火星。
 */
interface FireworkSpark {
  /** 当前横坐标 */
  x: number
  /** 当前纵坐标 */
  y: number
  /** 水平速度 */
  vx: number
  /** 垂直速度 */
  vy: number
  /** 剩余亮度，从 1 减到 0 */
  life: number
  /** 每帧衰减多少亮度 */
  decay: number
  /** 填充颜色 */
  color: string
  /** 圆点半径 */
  size: number
}

/**
 * 一条下落的彩带。
 */
interface ConfettiRibbon {
  /** 当前横坐标 */
  x: number
  /** 当前纵坐标 */
  y: number
  /** 水平速度 */
  vx: number
  /** 垂直速度 */
  vy: number
  /** 彩带宽度 */
  width: number
  /** 彩带高度 */
  height: number
  /** 当前旋转角 */
  rotation: number
  /** 每帧旋转增量 */
  spin: number
  /** 填充颜色 */
  color: string
  /** 左右摆动的相位 */
  sway: number
  /** 摆动速度 */
  swaySpeed: number
}

/**
 * 在指定位置炸开一团烟花。
 * @param sparks 正在飞行的火星列表
 * @param x 爆炸中心横坐标
 * @param y 爆炸中心纵坐标
 */
function spawnFirework(sparks: FireworkSpark[], x: number, y: number): void {
  const count = 58
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.25
    const speed = 2.4 + Math.random() * 4.6
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.011 + Math.random() * 0.012,
      color: BURST_COLORS[index % BURST_COLORS.length],
      size: 1.6 + Math.random() * 1.8
    })
  }
}

/**
 * 放一条彩带。从烟花中心扔出的会先向上冲，从屏幕外落下的只负责铺满画面。
 * @param ribbons 正在下落的彩带列表
 * @param x 出现位置的横坐标
 * @param y 出现位置的纵坐标
 * @param fromBurst 是否从烟花中心抛出
 */
function spawnRibbon(ribbons: ConfettiRibbon[], x: number, y: number, fromBurst: boolean): void {
  ribbons.push({
    x,
    y,
    vx: (Math.random() - 0.5) * (fromBurst ? 9 : 3.2),
    vy: fromBurst ? -2.4 - Math.random() * 4 : 1.2 + Math.random() * 2.2,
    width: 7 + Math.random() * 8,
    height: 12 + Math.random() * 10,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.28,
    color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.05 + Math.random() * 0.07
  })
}

/**
 * 播放一次完成庆祝。
 * 先从屏幕上方落下彩带，再在画面上半部连放几团烟花，大约三秒后淡出。
 */
export function playCompletionCelebration(): void {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10000;'
  document.body.appendChild(canvas)

  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    return
  }

  /** 按屏幕像素比绘制，避免烟花发糊。上限 2，避免大屏把粒子画得太贵。 */
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const fitCanvas = () => {
    canvas.width = window.innerWidth * pixelRatio
    canvas.height = window.innerHeight * pixelRatio
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  }
  fitCanvas()

  const sparks: FireworkSpark[] = []
  const ribbons: ConfettiRibbon[] = []
  const viewWidth = () => window.innerWidth
  const viewHeight = () => window.innerHeight

  for (let index = 0; index < 96; index += 1) {
    spawnRibbon(ribbons, Math.random() * viewWidth(), -30 - Math.random() * viewHeight() * 0.45, false)
  }

  /** 烟花相对画面的位置。错开时间放，避免一下炸完。 */
  const burstPlan: Array<[number, number, number]> = [
    [0.5, 0.28, 60],
    [0.24, 0.4, 240],
    [0.76, 0.36, 420],
    [0.38, 0.52, 620],
    [0.64, 0.48, 820]
  ]
  const timers = burstPlan.map(([xRatio, yRatio, delay]) => window.setTimeout(() => {
    const originX = xRatio * viewWidth()
    const originY = yRatio * viewHeight()
    spawnFirework(sparks, originX, originY)
    for (let index = 0; index < 16; index += 1) {
      spawnRibbon(ribbons, originX, originY, true)
    }
  }, delay))

  const startedAt = performance.now()
  /** 整场庆祝的时长，毫秒。最后半秒用来淡出。 */
  const duration = 3400
  let frameId = 0

  const drawFrame = (now: number) => {
    const elapsed = now - startedAt
    context.clearRect(0, 0, viewWidth(), viewHeight())
    const fade = elapsed > duration - 520 ? Math.max(0, (duration - elapsed) / 520) : 1

    sparks.forEach((spark) => {
      spark.x += spark.vx
      spark.y += spark.vy
      spark.vy += 0.048
      spark.vx *= 0.986
      spark.life -= spark.decay
      if (spark.life <= 0) return
      context.globalAlpha = fade * spark.life
      context.strokeStyle = spark.color
      context.fillStyle = spark.color
      context.lineWidth = 1.4
      context.beginPath()
      context.moveTo(spark.x, spark.y)
      context.lineTo(spark.x - spark.vx * 3.2, spark.y - spark.vy * 3.2)
      context.stroke()
      context.beginPath()
      context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2)
      context.fill()
    })

    context.globalAlpha = fade
    ribbons.forEach((ribbon) => {
      ribbon.sway += ribbon.swaySpeed
      ribbon.x += ribbon.vx + Math.sin(ribbon.sway) * 0.7
      ribbon.y += ribbon.vy
      ribbon.vy += 0.085
      ribbon.vx *= 0.992
      ribbon.rotation += ribbon.spin
      context.save()
      context.translate(ribbon.x, ribbon.y)
      context.rotate(ribbon.rotation)
      context.fillStyle = ribbon.color
      context.fillRect(-ribbon.width / 2, -ribbon.height / 2, ribbon.width, ribbon.height)
      context.restore()
    })

    if (elapsed < duration) {
      frameId = requestAnimationFrame(drawFrame)
      return
    }
    timers.forEach((timer) => window.clearTimeout(timer))
    canvas.remove()
  }

  frameId = requestAnimationFrame(drawFrame)
  window.setTimeout(() => {
    cancelAnimationFrame(frameId)
    if (canvas.isConnected) canvas.remove()
  }, duration + 200)
}
