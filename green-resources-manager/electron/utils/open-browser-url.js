const { spawn, execFile } = require('child_process')
const { shell } = require('electron')

/**
 * 整理要打开的网址，并保住用户写上的协议。
 * 已经是 https 的原样返回，不会改成 http。
 * 没写协议的补上 https，避免裸域名被系统当成 http。
 * 规则和渲染进程的 webUrl.ts 保持一致，主进程打开前再检查一次。
 * @param {string | null | undefined} raw 用户保存的网址
 * @returns {string} 可打开的 http 或 https 地址。不是网页地址时返回空字符串
 */
function normalizeWebUrl(raw) {
  /** 去掉首尾空白后的原文。协议大小写保持原样。 */
  const text = String(raw ?? '').trim()
  if (!text) {
    return ''
  }
  if (/^https:\/\//i.test(text) || /^http:\/\//i.test(text)) {
    return text
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    return ''
  }
  if (text.startsWith('//')) {
    return `https:${text}`
  }
  return `https://${text}`
}

/**
 * 读注册表里的一行字符串值。
 * 中文 Windows 的默认值名是「默认」，所以按 REG_SZ 取内容，不依赖值名。
 * @param {string[]} args reg query 的参数
 * @returns {Promise<string>} 读到的字符串。没有或失败时为空
 */
function queryRegistry(args) {
  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true }, (error, stdout) => {
      if (error || !stdout) {
        resolve('')
        return
      }
      const matched = String(stdout).match(/REG_(?:SZ|EXPAND_SZ)\s+(.*)/)
      resolve(matched ? matched[1].trim() : '')
    })
  })
}

/**
 * 把注册表命令里的环境变量展开。
 * %1 是网址占位符，不是环境变量，找不到时保持原样。
 * @param {string} text 注册表里的命令
 * @returns {string} 展开后的命令
 */
function expandEnv(text) {
  return text.replace(/%([^%]+)%/g, (token, name) => {
    if (name === '1' || name === 'L' || name === '*') {
      return token
    }
    return process.env[name] || process.env[name.toUpperCase()] || token
  })
}

/**
 * 把注册表里的打开命令拆成程序和参数。
 * 引号里的空格属于程序路径，不能按空格拆开。
 * @param {string} command 注册表命令
 * @returns {string[]} 程序在第一项，后面是参数
 */
function tokenizeCommand(command) {
  /** 拆出来的参数。 */
  const args = []
  /** 当前正在拼的一段。 */
  let current = ''
  /** 是否还在一对引号里面。 */
  let quoted = false
  for (const ch of command) {
    if (ch === '"') {
      quoted = !quoted
      continue
    }
    if (!quoted && /\s/.test(ch)) {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (current) {
    args.push(current)
  }
  return args
}

/**
 * 查这个协议在 Windows 上注册的默认浏览器命令。
 * 直接启动浏览器并带上原始网址，避开 url.dll。
 * url.dll 的 FileProtocolHandler 会先用 http 明文请求，再靠网站跳回 https。
 * @param {'http' | 'https'} protocol 要查的协议
 * @returns {Promise<string>} 浏览器的打开命令。查不到时为空
 */
async function readBrowserCommand(protocol) {
  /** 用户当前给这个协议选定的程序标识。 */
  const progId = await queryRegistry([
    'query',
    `HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${protocol}\\UserChoice`,
    '/v',
    'ProgId'
  ])
  if (!progId || !/^[A-Za-z0-9._-]+$/.test(progId)) {
    return ''
  }
  /** 先查当前用户的注册，没有再查本机注册。 */
  const userCommand = await queryRegistry([
    'query',
    `HKCU\\Software\\Classes\\${progId}\\shell\\open\\command`,
    '/ve'
  ])
  if (userCommand) {
    return userCommand
  }
  return queryRegistry([
    'query',
    `HKLM\\Software\\Classes\\${progId}\\shell\\open\\command`,
    '/ve'
  ])
}

/**
 * 用查到的浏览器程序打开网址。
 * 网址只作为参数传给浏览器，不拼进 shell 命令。
 * @param {string} command 注册表里的打开命令
 * @param {string} url 要打开的完整网址
 * @returns {boolean} 已经启动浏览器时为 true
 */
function spawnBrowser(command, url) {
  const tokens = tokenizeCommand(expandEnv(command))
  if (tokens.length === 0) {
    return false
  }
  /** 浏览器可执行文件。 */
  const executable = tokens[0]
  /** 是否已经把网址填进某个占位符。 */
  let replaced = false
  /** 交给浏览器的参数。占位符换成原始网址，https 不会被改掉。 */
  const args = tokens.slice(1).map((token) => {
    if (token === '%1' || token === '%L' || token === '%*') {
      replaced = true
      return url
    }
    if (token.includes('%1') || token.includes('%L')) {
      replaced = true
      return token.replace(/%1/g, url).replace(/%L/g, url)
    }
    return token
  })
  if (!replaced) {
    args.push(url)
  }
  const child = spawn(executable, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  child.unref()
  return true
}

/**
 * 用 Windows 的 start 打开网址。
 * 空标题必须单独传，否则 start 会把带引号的网址当成窗口标题丢掉。
 * 这是查不到默认浏览器时的退路，仍然把完整网址交给协议关联。
 * @param {string} url 完整网址
 */
function openWithStart(url) {
  /** 引号里的网址不会被 & 拆开。 */
  const command = `start "" "${url.replace(/"/g, '')}"`
  const child = spawn('cmd.exe', ['/d', '/s', '/c', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  child.unref()
}

/**
 * 用系统默认浏览器打开网页。
 * Windows 上不走 shell.openExternal。那条路径会调用 url.dll，先发一次 http 明文请求。
 * @param {string} rawUrl 用户保存的网址
 * @returns {Promise<{ success: boolean, error?: string, url?: string }>} 打开结果
 */
async function openInDefaultBrowser(rawUrl) {
  /** 保住协议之后的网址。 */
  const url = normalizeWebUrl(rawUrl)
  if (!url) {
    return { success: false, error: '无效的网址' }
  }
  if (process.platform === 'win32') {
    /** 按网址自己的协议查浏览器，https 不会改去查 http。 */
    const protocol = /^https:\/\//i.test(url) ? 'https' : 'http'
    try {
      const command = await readBrowserCommand(protocol)
      if (command && spawnBrowser(command, url)) {
        console.log('已用默认浏览器打开网址:', url)
        return { success: true, url }
      }
    } catch (error) {
      console.warn('读取默认浏览器失败，改用 start 打开:', error)
    }
    openWithStart(url)
    console.log('已用 start 打开网址:', url)
    return { success: true, url }
  }
  await shell.openExternal(url)
  return { success: true, url }
}

module.exports = {
  normalizeWebUrl,
  openInDefaultBrowser
}
