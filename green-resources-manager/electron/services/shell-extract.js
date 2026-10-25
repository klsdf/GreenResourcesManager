/**
 * 资源管理器右键解压。
 *
 * 软件里本来就能用密码本解压，但只能在窗口里点。
 * 这里把同一件事接到 Windows 右键：注册表里写一条当前用户的菜单（不需要管理员），
 * 菜单命令启动本程序并带上 `--grm-extract "文件路径"`。
 * 程序只允许一个实例，所以第二次启动不会再开一份，只把路径交回已经在跑的这份。
 *
 * RAR 优先用 unrar.exe，避免加密包弹出密码框。
 * zip、7z 不能交给 UnRAR：它读不了这些格式，退出码 10 会被误当成密码错误。
 */

const { spawn, execFile } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { StringDecoder } = require('string_decoder')

/** 右键菜单在注册表里的键名。换名字等于另做一项，旧项要靠卸载删掉。 */
const MENU_KEY = 'GreenResourcesManager.ExtractHere'

/** 资源管理器里看到的菜单文字。 */
const MENU_LABEL = '用 GreenResourcesManager 解压到此处'

/**
 * 传给已打开程序的参数名。
 * 不用 `--` 开关：Windows 把第二次启动的参数转交给第一个进程时，会丢掉不认识的开关，右键就会毫无反应。
 */
const EXTRACT_FLAG = '--grm-extract'

/** 同一个路径再放一份不带横线的参数，避免被系统当成启动开关吃掉。 */
const EXTRACT_TOKEN = 'grmextract:'

/**
 * 要挂右键菜单的扩展名。
 * 只认最后一段，所以 .tar.gz 记在 .gz 上。
 */
const MENU_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz', '.cbz', '.cbr']

/**
 * 去掉文件名时按长的先匹配，避免 .tar.gz 被当成 .gz 只去掉一层。
 */
const ARCHIVE_EXTENSIONS = ['.tar.gz', '.tar.bz2', '.tar.xz', '.tgz', '.cbz', '.cbr', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']

/** 密码文件不存在时写入的默认密码，和设置页里创建的那份一致。 */
const DEFAULT_PASSWORDS = [
  '123456',
  'password',
  '1234',
  '12345',
  '12345678',
  '123456789',
  '1234567890',
  '000000',
  '888888',
  '666666'
]

/** 进度窗最多保留这么多工具输出。加了 -bb1 后文件多时输出会很长，只留尾部足够判断错误。 */
const MAX_CAPTURE_LENGTH = 64 * 1024

/** 百分比更新最快多久推一次，避免文件很多时把 IPC 刷爆。 */
const PROGRESS_INTERVAL_MS = 80

/** 当前解压文件名的更新间隔。 */
const DETAIL_INTERVAL_MS = 120

/** 还没完成启动时先攒着，等主进程准备好再解压。 */
const pendingJobs = []

/** 解压任务串成一队，避免两个压缩包同时抢同一个解压程序。 */
let queue = Promise.resolve()

/** 启动流程结束后才真正开始解压。 */
let queueStarted = false

/** 关掉进度窗口时加一，旧任务发现对不上就停，不再把窗口重新打开。 */
let runId = 1

/** 当前正在跑的解压进程，关掉窗口时把它停掉。 */
let currentChild = null

/** 进度小窗。 */
let progressWindow = null

/** 进度小窗当前展示的内容。 */
let progressState = {
  fileName: '',
  message: '准备解压',
  status: 'running',
  outputDir: '',
  /** 0-100。状态不是 running 时没有意义。 */
  percent: 0,
  /** 工具还没给出百分比时显示滚动条，让人知道程序还在动。 */
  indeterminate: true,
  /** 正在处理的文件名。 */
  detail: ''
}

/** 进度窗口里「打开主界面」时调用，由主进程传进来。 */
let showMainWindow = null

/**
 * 从启动参数里找出要解压的文件。
 * 资源管理器会按 `"程序" --grm-extract "%1"` 这样启动。
 * @param {string[]} argv 进程参数
 * @returns {string[]} 压缩包路径
 */
function parseExtractPaths(argv) {
  const paths = []
  const args = Array.isArray(argv) ? argv : []
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index])
    if (arg === EXTRACT_FLAG) {
      const next = args[index + 1]
      if (next && !String(next).startsWith('--')) {
        const normalized = normalizeExtractPath(next)
        if (normalized) paths.push(normalized)
        index += 1
      }
    } else if (arg.startsWith(`${EXTRACT_FLAG}=`)) {
      const normalized = normalizeExtractPath(arg.slice(EXTRACT_FLAG.length + 1))
      if (normalized) paths.push(normalized)
    } else if (arg.toLowerCase().startsWith(EXTRACT_TOKEN)) {
      const normalized = normalizeExtractPath(arg.slice(EXTRACT_TOKEN.length))
      if (normalized) paths.push(normalized)
    }
  }
  return paths
}

/**
 * 去掉参数两端可能残留的引号。
 * @param {string} input 原始参数
 * @returns {string}
 */
function normalizeExtractPath(input) {
  if (!input || typeof input !== 'string') return ''
  let value = input.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value.trim()
}

/**
 * 右键启动时，当前目录通常是压缩包所在的文件夹，不是程序目录。
 * 存档位置是按当前目录找的，所以先切回程序所在目录，密码本才能读到。
 */
function ensureAppWorkingDirectory() {
  const { app } = require('electron')
  const root = app.isPackaged
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, '../..')
  try {
    process.chdir(root)
    console.log('[右键解压] 工作目录已切到程序目录:', root)
  } catch (error) {
    console.error('[右键解压] 切换工作目录失败:', error.message)
  }
}

/**
 * 把第二次启动带来的路径收齐。
 * 优先用单实例锁附带的数据，命令行只作备用。系统转发参数时经常把 `--` 开关弄丢。
 * @param {string[]} commandLine 第二次启动的参数
 * @param {{ extractPaths?: string[] } | null | undefined} additionalData 锁上附带的数据
 * @returns {string[]}
 */
function collectExtractPaths(commandLine, additionalData) {
  const fromLock = additionalData && Array.isArray(additionalData.extractPaths)
    ? additionalData.extractPaths
    : []
  const merged = []
  for (const item of [...fromLock, ...parseExtractPaths(commandLine)]) {
    const normalized = normalizeExtractPath(item)
    if (normalized && !merged.includes(normalized)) merged.push(normalized)
  }
  return merged
}

/**
 * 收下要解压的路径。程序还没准备好时先排队。
 * @param {string[]} filePaths 压缩包路径
 */
function acceptPaths(filePaths) {
  const list = (filePaths || []).map(normalizeExtractPath).filter(Boolean)
  if (list.length === 0) return
  const generation = runId
  if (!queueStarted) {
    list.forEach((filePath) => pendingJobs.push({ filePath, generation }))
    return
  }
  list.forEach((filePath) => enqueue(filePath, generation))
}

/**
 * 主进程初始化完成后开始处理积压的解压。
 */
function startQueue() {
  queueStarted = true
  const jobs = pendingJobs.splice(0)
  jobs.forEach((job) => enqueue(job.filePath, job.generation))
}

/**
 * 注册设置页和进度窗口用的 IPC。
 * @param {import('electron').IpcMain} ipcMain IPC 入口
 * @param {{ showMainWindow?: () => void }} hooks 打开主窗口的方法
 */
function registerIpcHandlers(ipcMain, hooks) {
  showMainWindow = hooks && hooks.showMainWindow ? hooks.showMainWindow : null

  ipcMain.handle('get-shell-extract-menu', async () => getMenuStatus())
  ipcMain.handle('set-shell-extract-menu', async (_event, enabled) => setMenuEnabled(enabled === true))
  ipcMain.handle('shell-extract-open-folder', async (_event, folderPath) => openOutputFolder(folderPath))
  ipcMain.handle('shell-extract-close', () => {
    if (progressWindow && !progressWindow.isDestroyed()) progressWindow.close()
  })
  ipcMain.handle('shell-extract-show-main', () => {
    if (typeof showMainWindow === 'function') showMainWindow()
  })
}

/**
 * 把一个压缩包排进队列。
 * @param {string} filePath 压缩包路径
 * @param {number} generation 这一批任务的代号，窗口关掉后旧代号作废
 */
function enqueue(filePath, generation) {
  queue = queue
    .then(() => extractOne(filePath, generation))
    .catch((error) => {
      console.error('[右键解压] 任务失败:', error)
    })
}

/**
 * 解压一个压缩包：先看有没有密码，再按密码本逐个试，最后解到同名文件夹。
 * @param {string} archivePath 压缩包路径
 * @param {number} generation 任务代号
 */
async function extractOne(archivePath, generation) {
  if (generation !== runId) return

  const fileName = path.basename(archivePath)
  publish({
    fileName,
    status: 'running',
    message: '正在准备解压…',
    outputDir: '',
    percent: 0,
    indeterminate: true,
    detail: ''
  }, generation)

  if (!fs.existsSync(archivePath)) {
    publish({ fileName, status: 'error', message: '找不到这个压缩包' }, generation)
    notify('解压失败', `${fileName} 不存在`)
    return
  }

  const tool = findExtractTool(archivePath)
  if (!tool) {
    const message = '没有找到 WinRAR 或 7-Zip，请先安装其中一个'
    publish({ fileName, status: 'error', message }, generation)
    notify('解压失败', message)
    return
  }

  const outputDir = buildOutputDirectory(archivePath)
  publish({
    fileName,
    status: 'running',
    outputDir,
    message: '正在检查是否需要密码…',
    percent: 0,
    indeterminate: true,
    detail: ''
  }, generation)

  const plain = await runTool(tool, buildTestArgs(tool, archivePath, null), {
    onProgress: (percent) => publish({
      fileName,
      status: 'running',
      outputDir,
      message: '正在检查是否需要密码…',
      percent,
      indeterminate: false
    }, generation)
  })
  if (generation !== runId) return

  /** @type {string | null} 空字符串表示没加密；null 表示还没找到密码 */
  let password = ''
  if (!plain.ok) {
    if (!isPasswordFailure(tool, plain)) {
      const message = summarizeToolOutput(plain.output) || `无法读取这个压缩包（退出码 ${plain.code}）`
      publish({ fileName, status: 'error', message, outputDir }, generation)
      notify('解压失败', message)
      return
    }

    const passwords = readPasswords()
    if (passwords.length === 0) {
      const message = '这个压缩包有密码，但密码本是空的'
      publish({ fileName, status: 'error', message, outputDir }, generation)
      notify('解压失败', message)
      return
    }

    let found = false
    const total = passwords.length
    for (let index = 0; index < total; index += 1) {
      if (generation !== runId) return
      const candidate = passwords[index]
      const attemptMessage = `正在试密码本里的第 ${index + 1}/${total} 个密码…`
      publish({
        fileName,
        status: 'running',
        outputDir,
        message: attemptMessage,
        percent: Math.round((index / total) * 100),
        indeterminate: true,
        detail: ''
      }, generation)

      const tested = await runTool(tool, buildTestArgs(tool, archivePath, candidate), {
        onProgress: (percent) => publish({
          fileName,
          status: 'running',
          outputDir,
          message: attemptMessage,
          percent: Math.min(100, Math.round(((index + percent / 100) / total) * 100)),
          indeterminate: false
        }, generation)
      })
      if (generation !== runId) return
      if (tested.ok) {
        password = candidate
        found = true
        break
      }
      if (!isPasswordFailure(tool, tested)) {
        const message = summarizeToolOutput(tested.output) || `解压工具出错（退出码 ${tested.code}）`
        publish({ fileName, status: 'error', message, outputDir }, generation)
        notify('解压失败', message)
        return
      }
    }

    if (!found) {
      const message = `密码本里的 ${passwords.length} 个密码都不对`
      publish({ fileName, status: 'error', message, outputDir }, generation)
      notify('解压失败', message)
      return
    }
  }

  if (generation !== runId) return
  const extractMessage = password ? '密码对上了，正在解压…' : '正在解压…'
  publish({
    fileName,
    status: 'running',
    outputDir,
    message: extractMessage,
    percent: 0,
    indeterminate: true,
    detail: ''
  }, generation)

  fs.mkdirSync(outputDir, { recursive: true })
  /** 工具还没吐出百分比时保持 -1，进度条继续滚动。 */
  let extractionPercent = -1
  const extracted = await runTool(tool, buildExtractArgs(tool, archivePath, outputDir, password || null), {
    onProgress: (percent) => {
      extractionPercent = percent
      publish({
        fileName,
        status: 'running',
        outputDir,
        message: extractMessage,
        percent,
        indeterminate: false
      }, generation)
    },
    onDetail: (detail) => publish({
      fileName,
      status: 'running',
      outputDir,
      message: extractMessage,
      percent: extractionPercent >= 0 ? extractionPercent : 0,
      indeterminate: extractionPercent < 0,
      detail
    }, generation)
  })
  if (generation !== runId) return

  if (!extracted.ok) {
    const message = summarizeToolOutput(extracted.output) || `解压失败（退出码 ${extracted.code}）`
    publish({ fileName, status: 'error', message, outputDir }, generation)
    notify('解压失败', message)
    return
  }

  const message = password ? `已用密码本解压到 ${outputDir}` : `已解压到 ${outputDir}`
  publish({ fileName, status: 'success', message, outputDir, percent: 100, indeterminate: false, detail: '' }, generation)
  // notify('解压完成', message)
}

/**
 * 压缩包旁边的同名文件夹。和软件里「解压到当前目录」一样，避免把文件散在原目录。
 * @param {string} archivePath 压缩包路径
 * @returns {string}
 */
function buildOutputDirectory(archivePath) {
  const directory = path.dirname(archivePath)
  const fileName = path.basename(archivePath)
  const lowerName = fileName.toLowerCase()
  let baseName = fileName
  for (const extension of ARCHIVE_EXTENSIONS) {
    if (lowerName.endsWith(extension)) {
      baseName = fileName.slice(0, fileName.length - extension.length)
      break
    }
  }
  return path.join(directory, baseName)
}

/**
 * 按压缩包类型选工具。
 * UnRAR 只能解 RAR。拿它解 zip 会直接失败，退出码还和密码错误一样，
 * 所以 zip、7z 先找 7-Zip，没有再用 WinRAR 主程序。
 * @param {string} archivePath 压缩包路径
 * @returns {{ command: string, kind: 'unrar' | 'winrar' | '7z' } | null}
 */
function findExtractTool(archivePath) {
  const extension = path.extname(archivePath || '').toLowerCase()
  const rarOnly = extension === '.rar' || extension === '.cbr'

  if (rarOnly) {
    const unrar = findUnrar()
    if (unrar && path.basename(unrar).toLowerCase() === 'unrar.exe') {
      return { command: unrar, kind: 'unrar' }
    }
  }

  const sevenZip = findSevenZip()
  if (sevenZip) return { command: sevenZip, kind: '7z' }

  const winrar = findWinRarExecutable()
  if (winrar) return { command: winrar, kind: 'winrar' }

  if (rarOnly) {
    const fallback = findUnrar()
    if (fallback) {
      const kind = path.basename(fallback).toLowerCase() === 'unrar.exe' ? 'unrar' : 'winrar'
      return { command: fallback, kind }
    }
  }

  return null
}

/**
 * 查找 unrar.exe，找不到再退回 WinRAR.exe。
 * @returns {string | null}
 */
function findUnrar() {
  const candidates = [
    'C:\\Program Files\\WinRAR\\unrar.exe',
    'C:\\Program Files (x86)\\WinRAR\\unrar.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'unrar.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'unrar.exe')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  const winrar = findWinRarExecutable()
  if (winrar) {
    const beside = path.join(path.dirname(winrar), 'unrar.exe')
    if (fs.existsSync(beside)) return beside
    return winrar
  }

  return whichExecutable('unrar.exe')
}

/**
 * 从常见目录和注册表找 WinRAR.exe。
 * @returns {string | null}
 */
function findWinRarExecutable() {
  const candidates = [
    'C:\\Program Files\\WinRAR\\WinRAR.exe',
    'C:\\Program Files (x86)\\WinRAR\\WinRAR.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'WinRAR', 'WinRAR.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'WinRAR', 'WinRAR.exe')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  try {
    const { execFileSync } = require('child_process')
    const output = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\WinRAR', '/v', 'exe64'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    })
    const matched = output.match(/REG_SZ\s+(.+)/i)
    if (matched && matched[1] && fs.existsSync(matched[1].trim())) return matched[1].trim()
  } catch (error) {
    // 没装 WinRAR 时注册表查询会失败，继续看别的工具
  }
  return null
}

/**
 * 查找 7z.exe。
 * @returns {string | null}
 */
function findSevenZip() {
  const candidates = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', '7-Zip', '7z.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', '7-Zip', '7z.exe')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return whichExecutable('7z.exe')
}

/**
 * 在 PATH 里找可执行文件。
 * @param {string} name 文件名，例如 7z.exe
 * @returns {string | null}
 */
function whichExecutable(name) {
  try {
    const { execFileSync } = require('child_process')
    const output = execFileSync('where.exe', [name], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    })
    const found = output.split(/\r?\n/).map((line) => line.trim()).find((line) => line && fs.existsSync(line))
    return found || null
  } catch (error) {
    return null
  }
}

/**
 * 测试密码用的参数。password 为空表示先按「没有密码」试。
 * unrar / WinRAR 用 `-p-`，这样不会弹出输入框。
 * @param {{ command: string, kind: string }} tool 解压工具
 * @param {string} archivePath 压缩包
 * @param {string | null} password 密码；null 表示不提供密码
 * @returns {string[]}
 */
function buildTestArgs(tool, archivePath, password) {
  if (tool.kind === '7z') {
    // -bsp1 把百分比写到输出里，密码本逐个试的时候也能看到进度
    const args = ['t', '-y', '-sccUTF-8', '-bsp1', archivePath]
    if (password) args.splice(1, 0, `-p${password}`)
    return args
  }
  const args = ['t', password ? `-p${password}` : '-p-', archivePath]
  if (tool.kind === 'winrar') args.splice(1, 0, '-ibck', '-inul')
  return args
}

/**
 * 真正解压用的参数。解压到 outputDir，已有文件直接覆盖。
 * @param {{ command: string, kind: string }} tool 解压工具
 * @param {string} archivePath 压缩包
 * @param {string} outputDir 目标文件夹
 * @param {string | null} password 密码；null 表示不提供密码
 * @returns {string[]}
 */
function buildExtractArgs(tool, archivePath, outputDir, password) {
  if (tool.kind === '7z') {
    // -bsp1 输出百分比，-bb1 输出当前文件，进度窗才有东西可动
    const args = ['x', archivePath, `-o${outputDir}`, '-y', '-sccUTF-8', '-bsp1', '-bb1']
    if (password) args.push(`-p${password}`)
    return args
  }
  const args = ['x', '-o+', password ? `-p${password}` : '-p-', archivePath, `${outputDir}\\`]
  if (tool.kind === 'winrar') args.splice(1, 0, '-ibck', '-inul')
  return args
}

/**
 * 跑一次解压工具，把退出码和输出收回来，并解析 7-Zip / UnRAR 的进度。
 * 7-Zip 用 -bsp1 输出百分比、-bb1 输出当前文件；UnRAR 默认就会打印进度。
 * WinRAR 主程序是静默运行，拿不到百分比，调用方会继续显示滚动条。
 * @param {{ command: string, kind: string }} tool 解压工具
 * @param {string[]} args 参数
 * @param {{ onProgress?: (percent: number) => void, onDetail?: (detail: string) => void }} [options] 进度回调
 * @returns {Promise<{ ok: boolean, code: number | null, output: string }>}
 */
function runTool(tool, args, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null
  const onDetail = typeof options.onDetail === 'function' ? options.onDetail : null
  return new Promise((resolve) => {
    const child = spawn(tool.command, args, {
      cwd: path.dirname(tool.command),
      windowsHide: true,
      shell: false
    })
    currentChild = child
    let output = ''
    let pending = ''
    let lastPercent = -1
    let lastPercentAt = 0
    let lastDetail = ''
    let lastDetailAt = 0
    // 一次读到的字节可能把中文切成两半，用 StringDecoder 拼回来
    const decoder = new StringDecoder('utf8')

    const emitPercent = (value) => {
      if (!onProgress) return
      if (!Number.isFinite(value) || value <= 0 || value > 100) return
      // 0% 没有信息量，保持滚动条，等第一个有效百分比再切成确定进度
      // 同一个数值不重复送。RAR 逐个文件解压时百分比会回到 0，跳过即可
      if (value === lastPercent) return
      const now = Date.now()
      if (value < 100 && now - lastPercentAt < PROGRESS_INTERVAL_MS) return
      lastPercent = value
      lastPercentAt = now
      onProgress(value)
    }

    const emitDetail = (value) => {
      if (!onDetail) return
      const detail = String(value || '').trim()
      if (!detail || detail === lastDetail) return
      const now = Date.now()
      if (now - lastDetailAt < DETAIL_INTERVAL_MS) return
      lastDetail = detail
      lastDetailAt = now
      onDetail(detail)
    }

    /**
     * 解析一行输出。7-Zip 和 UnRAR 的进度写法不一样，分开认。
     * @param {string} raw 一行原文
     * @param {boolean} allowDetail 这一行是否已经完整。没等到换行的半截不能拿去当文件名
     */
    const inspect = (raw, allowDetail = true) => {
      // UnRAR 用退格符刷新同一行，先去掉
      const text = raw.replace(/\u0008/g, '').trim()
      if (!text) return

      // 7-Zip -bb1：`- 文件名` 正在解压，`+ 文件名` 正在写入
      const fileLine = text.match(/^[-+]\s+(.+)$/)
      if (fileLine) {
        if (allowDetail) emitDetail(fileLine[1])
        return
      }

      // UnRAR：`Extracting  文件名  45%`，文件名和百分比在同一行
      const unrarLine = text.match(/^Extracting\s{2,}(.+)$/i)
      if (unrarLine) {
        const body = unrarLine[1]
        const percentMatch = body.match(/(\d{1,3})%\s*$/)
        if (allowDetail) {
          emitDetail(body.replace(/\d{1,3}%/g, '').replace(/\s+/g, ' ').trim())
        }
        if (percentMatch) emitPercent(Number(percentMatch[1]))
        return
      }

      // 7-Zip -bsp1：单独一行的 ` 45%`。只认整行，避免文件名里的数字误伤
      const percentMatch = text.match(/^(\d{1,3})%$/)
      if (percentMatch) emitPercent(Number(percentMatch[1]))
    }

    /**
     * 处理一段解出来的文本。进度用 \r 刷新、文件清单用 \n 分行，都当分隔符。
     * @param {string} text 文本
     */
    const feedText = (text) => {
      if (!text) return
      output = (output + text).slice(-MAX_CAPTURE_LENGTH)
      pending += text
      const parts = pending.split(/[\r\n]/)
      pending = parts.pop()
      parts.forEach((part) => inspect(part, true))
      // 最后一段可能还没等到分隔符。只从里面认百分比，不能把半截文件名推出去
      if (pending.length > 4096) pending = pending.slice(-4096)
      inspect(pending, false)
    }

    child.stdout.on('data', (chunk) => feedText(decoder.write(chunk)))
    child.stderr.on('data', (chunk) => feedText(decoder.write(chunk)))
    child.on('error', (error) => {
      if (currentChild === child) currentChild = null
      resolve({ ok: false, code: -1, output: error.message })
    })
    child.on('close', (code) => {
      if (currentChild === child) currentChild = null
      const rest = decoder.end()
      if (rest) feedText(rest)
      // 进程结束时最后一行不会再有换行符，这时才能当成完整内容看
      if (pending) inspect(pending, true)
      resolve({
        ok: code === 0 || code === null,
        code,
        output: output.trim()
      })
    })
  })
}

/**
 * 把工具输出压成一小段。加了 -bb1 之后文件清单很长，错误信息一般在末尾。
 * @param {string} output 工具输出
 * @returns {string}
 */
function summarizeToolOutput(output) {
  const lines = String(output || '')
    .split(/[\r\n]+/)
    .map((line) => line.replace(/\u0008/g, '').trim())
    .filter(Boolean)
  // 优先挑真正说明原因的那一行，找不到再退回最后三行
  const errorLine = [...lines].reverse().find((line) => /error|failed|cannot|wrong|密码|失败/i.test(line))
  const tail = errorLine ? [errorLine] : lines.slice(-3)
  const text = tail.join('\n')
  return text.length > 500 ? text.slice(-500) : text
}

/**
 * 这次失败是不是「密码不对或需要密码」。
 * 退出码 11 是 RAR 密码错误。
 * WinRAR 解加密 zip 时，密码不对是退出码 10，而且静默运行时没有文字提示。
 * UnRAR 读不了 zip 也是 10，那种情况输出里会写「不是 RAR」，不能拿去试密码本。
 * @param {{ kind: string }} tool 解压工具
 * @param {{ code: number | null, output: string }} result 运行结果
 * @returns {boolean}
 */
function isPasswordFailure(tool, result) {
  const output = (result.output || '').toLowerCase()
  /** UnRAR 遇到 zip 会说「不是 RAR 压缩文件」，退出码同样是 10，这不是密码问题。 */
  const unsupportedArchive = output.includes('不是 rar') || output.includes('not rar') || output.includes('not a rar')
  if (unsupportedArchive) return false

  const mentionsPassword = ['password', 'encrypted', '密码', 'wrong password'].some((keyword) => output.includes(keyword))
  if (tool.kind === '7z') {
    return result.code === 2 && mentionsPassword
  }
  /** 11 是 RAR 的密码错误。WinRAR 解加密 zip 时，没给密码或密码不对都是 10，而且 -inul 不留文字。 */
  if (result.code === 11) return true
  if (tool.kind === 'winrar' && result.code === 10) return true
  return mentionsPassword
}

/**
 * 读取密码本。没有文件时建一份默认的，和设置页的行为一致。
 * @returns {string[]}
 */
function readPasswords() {
  const { resolveSaveDataDirectory } = require('../utils/save-location')
  const passwordsPath = path.join(resolveSaveDataDirectory(), 'passwords.txt')
  try {
    if (!fs.existsSync(passwordsPath)) {
      fs.mkdirSync(path.dirname(passwordsPath), { recursive: true })
      fs.writeFileSync(passwordsPath, DEFAULT_PASSWORDS.join('\n'), 'utf8')
    }
    return fs.readFileSync(passwordsPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch (error) {
    console.error('[右键解压] 读取密码本失败:', error)
    return []
  }
}

/**
 * 更新进度小窗。任务已经作废时不再把窗口打开。
 * @param {Partial<typeof progressState>} partial 要改的字段
 * @param {number} generation 任务代号
 */
function publish(partial, generation) {
  if (generation !== runId) return
  const wasRunning = progressState.status === 'running'
  progressState = { ...progressState, ...partial }
  // 结束状态不该再显示滚动条，否则会被误认为还在解压
  if (progressState.status !== 'running') progressState.indeterminate = false
  ensureProgressWindow()
  if (progressWindow && !progressWindow.isDestroyed()) {
    if (progressState.status !== 'running') {
      progressWindow.setAlwaysOnTop(false)
    } else if (!wasRunning) {
      // 队列里的下一个压缩包开始时，重新把进度窗放到前面
      progressWindow.setAlwaysOnTop(true)
    }
    progressWindow.webContents.send('shell-extract-update', progressState)
  }
}

/**
 * 打开或复用进度小窗。
 */
function ensureProgressWindow() {
  if (progressWindow && !progressWindow.isDestroyed()) return
  const { BrowserWindow } = require('electron')
  progressWindow = new BrowserWindow({
    width: 460,
    height: 300,
    minWidth: 420,
    minHeight: 280,
    title: '解压',
    autoHideMenuBar: true,
    resizable: false,
    minimizable: true,
    maximizable: false,
    show: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../shell-extract-preload.js')
    }
  })
  progressWindow.once('ready-to-show', () => {
    if (progressWindow && !progressWindow.isDestroyed()) {
      // 右键之后前台进程马上就退出了，短暂置顶才能把进度窗带到前面
      progressWindow.setAlwaysOnTop(true)
      progressWindow.show()
      progressWindow.focus()
    }
  })
  progressWindow.webContents.on('did-finish-load', () => {
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.webContents.send('shell-extract-update', progressState)
    }
  })
  progressWindow.on('closed', () => {
    progressWindow = null
    cancelRunningJob()
  })
  progressWindow.loadFile(path.join(__dirname, '../shell-extract.html'))
}

/**
 * 用户关掉进度窗口：停掉正在跑的解压，并让还排着的旧任务失效。
 */
function cancelRunningJob() {
  runId += 1
  if (currentChild && !currentChild.killed) {
    currentChild.kill()
  }
}

/**
 * 弹出系统通知。失败不影响解压本身。
 * @param {string} title 标题
 * @param {string} body 内容
 */
function notify(title, body) {
  try {
    const { Notification } = require('electron')
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  } catch (error) {
    console.warn('[右键解压] 通知失败:', error.message)
  }
}

/**
 * 打开解压出来的文件夹。
 * @param {string} folderPath 文件夹
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function openOutputFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: '文件夹不存在' }
  }
  const { shell } = require('electron')
  const error = await shell.openPath(folderPath)
  if (error) return { success: false, error }
  return { success: true }
}

/**
 * 当前右键菜单是否指向现在这份程序。
 * @returns {Promise<{ success: boolean, supported: boolean, enabled: boolean, stale: boolean, error?: string }>}
 */
async function getMenuStatus() {
  if (process.platform !== 'win32') {
    return { success: true, supported: false, enabled: false, stale: false }
  }
  try {
    const command = await readMenuCommand()
    const selectionModel = await readMenuSelectionModel()
    const expected = buildLaunchCommand()
    const commandMatches = command === expected
    /** Single 时资源管理器多选会把菜单藏起来，必须是 Document 才算当前版本。 */
    const allowsMultiple = selectionModel === 'Document'
    return {
      success: true,
      supported: true,
      enabled: commandMatches,
      stale: Boolean(command) && (!commandMatches || !allowsMultiple)
    }
  } catch (error) {
    return { success: false, supported: true, enabled: false, stale: false, error: error.message }
  }
}

/**
 * 添加或移除右键菜单。
 * @param {boolean} enabled 是否显示菜单
 * @returns {Promise<{ success: boolean, enabled: boolean, error?: string }>}
 */
async function setMenuEnabled(enabled) {
  if (process.platform !== 'win32') {
    return { success: false, enabled: false, error: '只有 Windows 可以添加右键菜单' }
  }
  try {
    if (enabled) await installMenu()
    else await uninstallMenu()
    const status = await getMenuStatus()
    return { success: true, enabled: status.enabled }
  } catch (error) {
    console.error('[右键解压] 修改右键菜单失败:', error)
    return { success: false, enabled: false, error: error.message }
  }
}

/**
 * 写入当前用户的右键菜单。
 * 用 HKCU 而不是 HKLM，这样不需要管理员。
 * Windows 11 的新右键菜单不接收这种传统项，所以会出现在「显示更多选项」里。
 * MultiSelectModel 用 Document：多选时每个压缩包各启动一次，再由已经打开的程序排队。
 * 每个包仍然解压到自己旁边的同名文件夹。
 */
async function installMenu() {
  const command = buildLaunchCommand()
  const icon = buildMenuIcon()
  const script = `
$extensions = @(${MENU_EXTENSIONS.map((item) => psLiteral(item)).join(', ')})
$label = ${psLiteral(MENU_LABEL)}
$icon = ${psLiteral(icon)}
$command = ${psLiteral(command)}
foreach ($ext in $extensions) {
  $base = "HKCU:\\Software\\Classes\\SystemFileAssociations\\$ext\\shell\\${MENU_KEY}"
  New-Item -Path $base -Force | Out-Null
  Set-Item -Path $base -Value $label
  New-ItemProperty -Path $base -Name 'Icon' -Value $icon -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $base -Name 'MultiSelectModel' -Value 'Document' -PropertyType String -Force | Out-Null
  $cmdKey = Join-Path $base 'command'
  New-Item -Path $cmdKey -Force | Out-Null
  Set-Item -Path $cmdKey -Value $command
}
`
  await runPowerShell(script)
}

/**
 * 删掉右键菜单。某个扩展名本来就没有这项时忽略。
 */
async function uninstallMenu() {
  const script = `
$extensions = @(${MENU_EXTENSIONS.map((item) => psLiteral(item)).join(', ')})
foreach ($ext in $extensions) {
  $base = "HKCU:\\Software\\Classes\\SystemFileAssociations\\$ext\\shell\\${MENU_KEY}"
  if (Test-Path $base) {
    Remove-Item -Path $base -Recurse -Force
  }
}
`
  await runPowerShell(script)
}

/**
 * 读出多选时这项菜单怎么生效。
 * Single 表示多选时不显示；Document 表示每个选中的文件各执行一次。
 * @returns {Promise<string>}
 */
function readMenuSelectionModel() {
  const script = `
$base = 'HKCU:\\Software\\Classes\\SystemFileAssociations\\.zip\\shell\\${MENU_KEY}'
if (Test-Path $base) {
  $value = (Get-Item -Path $base).GetValue('MultiSelectModel')
  if ($null -eq $value) { Write-Output '' } else { Write-Output $value }
} else {
  Write-Output ''
}
`
  return runPowerShell(script).then((output) => output.trim())
}

/**
 * 读出 .zip 上登记的命令，用来判断开关现在该不该打开。
 * @returns {Promise<string>}
 */
function readMenuCommand() {
  const script = `
$cmdKey = 'HKCU:\\Software\\Classes\\SystemFileAssociations\\.zip\\shell\\${MENU_KEY}\\command'
if (Test-Path $cmdKey) {
  $value = (Get-Item -Path $cmdKey).GetValue('')
  if ($null -eq $value) { Write-Output '' } else { Write-Output $value }
} else {
  Write-Output ''
}
`
  return runPowerShell(script).then((output) => output.trim())
}

/**
 * 右键要启动的命令。
 * 安装包直接启动 exe；开发时还要带上项目目录，否则 Electron 不知道跑哪个程序。
 * `%1` 由资源管理器换成选中的文件。
 * @returns {string}
 */
function buildLaunchCommand() {
  const { app } = require('electron')
  const executable = process.execPath
  // grmextract: 不是系统开关，已经打开的程序也能从命令行里看见文件路径
  if (app.isPackaged) {
    return `"${executable}" "${EXTRACT_TOKEN}%1"`
  }
  const appRoot = path.resolve(__dirname, '../..')
  return `"${executable}" "${appRoot}" "${EXTRACT_TOKEN}%1"`
}

/**
 * 菜单图标。打包后图标在 asar 里，资源管理器读不到，就用 exe 自带图标。
 * @returns {string}
 */
function buildMenuIcon() {
  const { app } = require('electron')
  if (app.isPackaged) return `${process.execPath},0`
  const iconPath = path.resolve(__dirname, '../../public/butter-icon.ico')
  if (fs.existsSync(iconPath)) return iconPath
  return `${process.execPath},0`
}

/**
 * 把字符串放进 PowerShell 单引号里。
 * @param {string} value 原文
 * @returns {string}
 */
function psLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * 跑一段 PowerShell。脚本写到临时文件，避免命令行转义把注册表内容弄坏。
 * @param {string} script 脚本内容
 * @returns {Promise<string>}
 */
function runPowerShell(script) {
  const scriptPath = path.join(os.tmpdir(), `grm-shell-extract-${Date.now()}-${Math.random().toString(16).slice(2)}.ps1`)
  // Windows PowerShell 5 会按系统编码读没有 BOM 的脚本，中文菜单名会被写坏
  fs.writeFileSync(scriptPath, `\uFEFF${script}`, 'utf8')
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, timeout: 20000 },
      (error, stdout, stderr) => {
        fs.unlink(scriptPath, () => {})
        if (error) {
          reject(new Error((stderr || stdout || error.message || '').trim()))
          return
        }
        resolve(stdout || '')
      }
    )
  })
}

/**
 * 菜单已经装过、但命令还是旧写法时，改成当前程序能识别的命令。
 * @returns {Promise<void>}
 */
async function refreshInstalledMenu() {
  const status = await getMenuStatus()
  if (!status.stale) return
  await installMenu()
  console.log('[右键解压] 右键命令已更新为当前程序')
}

module.exports = {
  parseExtractPaths,
  collectExtractPaths,
  ensureAppWorkingDirectory,
  acceptPaths,
  startQueue,
  registerIpcHandlers,
  buildOutputDirectory,
  refreshInstalledMenu
}
