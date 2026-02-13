/**
 * Game engine detector (Main process / Node.js version)
 *
 * Why this file exists:
 * - Electron main process uses CommonJS `require()` and cannot import TS directly.
 * - electron-builder packaging includes `electron/**` but not `src/**` (so main-process code must live under `electron/`).
 *
 * This implementation detects common engines by inspecting the game directory
 * using Node's fs APIs (no `window.electronAPI`).
 *
 * generate by Cursor(GPT-5.2)
 */

const fs = require('fs')
const path = require('path')

function exists(p) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

function safeReaddir(dirPath) {
  try {
    if (!dirPath || !exists(dirPath)) return []
    return fs.readdirSync(dirPath)
  } catch {
    return []
  }
}

function lowerList(list) {
  return Array.isArray(list) ? list.map(s => String(s).toLowerCase()) : []
}

function buildContext(gamePath) {
  const stat = (() => {
    try {
      return fs.statSync(gamePath)
    } catch {
      return null
    }
  })()

  const isDir = !!(stat && typeof stat.isDirectory === 'function' && stat.isDirectory())
  const gameDir = isDir ? gamePath : path.dirname(gamePath)
  const gameFileName = isDir ? path.basename(gamePath) : path.parse(gamePath).name

  const files = safeReaddir(gameDir)
  const fileNames = lowerList(files)
  const filePaths = fileNames.map(f => path.join(gameDir, f).toLowerCase())

  return {
    gamePath,
    gameDir,
    gameFileName,
    files,
    fileNames,
    filePaths
  }
}

// --- detectors ---

function detectFlash(ctx) {
  return ctx.gamePath.toLowerCase().endsWith('.swf') ? 'Flash/ActionScript' : null
}

function detectUnity(ctx) {
  const gameName = ctx.gameFileName.toLowerCase()
  const hasUnityPlayer = ctx.fileNames.some(f => f === 'unityplayer.dll')
  const hasUnityDataFolder = ctx.fileNames.some(
    f => f === `${gameName}_data` || f.endsWith('_data')
  )
  return hasUnityPlayer || hasUnityDataFolder ? 'Unity' : null
}

function detectUnrealEngine(ctx) {
  const hasUproject = ctx.fileNames.some(f => f.endsWith('.uproject'))
  const hasEngineFolder = ctx.fileNames.some(f => f === 'engine')
  return hasUproject || hasEngineFolder ? 'Unreal Engine' : null
}

function detectGodot(ctx) {
  const hasPck = ctx.fileNames.some(f => f.endsWith('.pck'))
  const hasGodotExe = ctx.fileNames.some(f => f.includes('godot'))
  return hasPck || hasGodotExe ? 'Godot' : null
}

async function detectWolfRPG(ctx) {
  const hasConfigExe = ctx.fileNames.some(f => f === 'config.exe')
  if (!hasConfigExe) return null

  if (ctx.fileNames.some(f => f === 'data.wolf')) return 'Wolf RPG'

  if (ctx.fileNames.some(f => f === 'data')) {
    const dataDir = path.join(ctx.gameDir, 'data')
    const dataFiles = lowerList(safeReaddir(dataDir))
    if (dataFiles.some(f => f.endsWith('.wolf'))) return 'Wolf RPG'
  }

  return null
}

async function detectRPGMaker(ctx) {
  // project files (most reliable)
  if (ctx.fileNames.some(f => f.endsWith('.rmmzproject'))) return 'RPG Maker MZ'
  if (ctx.fileNames.some(f => f.endsWith('.rpgproject'))) return 'RPG Maker MV'

  const hasPackageJson = ctx.fileNames.includes('package.json')
  if (!hasPackageJson) return null

  const hasWwwFolder = ctx.fileNames.includes('www')
  const hasJsFolder = ctx.fileNames.includes('js')

  // MV: www/js/rpg_core.js
  if (hasWwwFolder) {
    const wwwJs = path.join(ctx.gameDir, 'www', 'js')
    const jsFiles = lowerList(safeReaddir(wwwJs))
    if (jsFiles.some(f => f === 'rpg_core.js' || f.includes('rpg_core.js'))) return 'RPG Maker MV'
  }

  // MZ: js/rmmz_core.js (no www)
  if (!hasWwwFolder && hasJsFolder) {
    const jsDir = path.join(ctx.gameDir, 'js')
    const jsFiles = lowerList(safeReaddir(jsDir))
    if (jsFiles.some(f => f === 'rmmz_core.js' || f.includes('rmmz_core.js'))) return 'RPG Maker MZ'
  }

  return null
}

function detectRPGMakerOldVersions(ctx) {
  // RMXP: .rxproj or .rgssad
  if (ctx.fileNames.some(f => f.endsWith('.rxproj') || f.endsWith('.rgssad'))) return 'RPG Maker XP'
  // RMVX: .rvproj or .rgss2a
  if (ctx.fileNames.some(f => f.endsWith('.rvproj') || f.endsWith('.rgss2a'))) return 'RPG Maker VX'
  // RMVX Ace: .rvproj2 or .rgss3a
  if (ctx.fileNames.some(f => f.endsWith('.rvproj2') || f.endsWith('.rgss3a'))) return 'RPG Maker VX Ace'

  const hasIni = ctx.fileNames.some(f => f.endsWith('.ini'))
  const hasLdb = ctx.fileNames.some(f => f.endsWith('.ldb'))
  const hasLmt = ctx.fileNames.some(f => f.endsWith('.lmt'))
  return hasIni && hasLdb && hasLmt ? 'RPG Maker 2000/2003' : null
}

function detectSRPGStudio(ctx) {
  const hasDataDts = ctx.fileNames.includes('data.dts')
  const hasEnvEvs = ctx.fileNames.includes('environment.evs')
  const hasRuntimeRts = ctx.fileNames.includes('runtime.rts')
  return hasDataDts && hasEnvEvs && hasRuntimeRts ? 'SRPG Studio' : null
}

async function detectRPGDeveloperBakin(ctx) {
  if (!ctx.fileNames.includes('data')) return null
  const dataDir = path.join(ctx.gameDir, 'data')
  const dataFiles = lowerList(safeReaddir(dataDir))
  const hasBakinPlayer = dataFiles.some(f => f === 'bakinplayer.exe')
  const hasBakinConfig = dataFiles.some(f => f === 'bakinplayer.exe.config')
  return hasBakinPlayer && hasBakinConfig ? 'RPG Developer Bakin' : null
}

function detectGameMaker(ctx) {
  const hasDataWin = ctx.fileNames.includes('data.win') || ctx.fileNames.includes('game.unx')
  const hasOptionsIni = ctx.fileNames.includes('options.ini')
  return hasDataWin || hasOptionsIni ? 'GameMaker Studio' : null
}

function detectTyranoBuilder(ctx) {
  return ctx.fileNames.some(f => f.includes('tyrano_data') || f.includes('tyranodata')) ? 'TyranoBuilder' : null
}

function detectRenpy(ctx) {
  const hasRenpyFolder = ctx.fileNames.includes('renpy') || ctx.fileNames.some(f => f.startsWith('renpy'))
  const hasGameFolder = ctx.fileNames.includes('game')
  return hasRenpyFolder && hasGameFolder ? "Ren'Py" : null
}

function detectConstruct(ctx) {
  const hasConstruct = ctx.fileNames.some(f => f.includes('construct'))
  const hasDataMain = ctx.fileNames.includes('data.js') && ctx.fileNames.includes('main.js')
  return hasConstruct || hasDataMain ? 'Construct' : null
}

function detectLove2D(ctx) {
  return ctx.fileNames.includes('main.lua') ? 'Love2D' : null
}

function detectPythonPygame(ctx) {
  const hasPy = ctx.fileNames.some(f => f.endsWith('.py'))
  const hasPygame = ctx.fileNames.some(f => f.includes('pygame'))
  return hasPy && hasPygame ? 'Python/Pygame' : null
}

function detectJava(ctx) {
  return ctx.fileNames.some(f => f.endsWith('.jar')) ? 'Java' : null
}

function detectKirikiri(ctx) {
  const hasXp3 = ctx.fileNames.some(f => f.endsWith('.xp3') || f === 'data.xp3')
  const hasKrkr = ctx.fileNames.some(f => f.includes('krkr') || f.includes('kag'))
  return hasXp3 || hasKrkr ? 'Kirikiri / 吉里吉里' : null
}

function detectCatSystem2(ctx) {
  const hasCs2Exe = ctx.fileNames.includes('cs2.exe')
  if (hasCs2Exe) return 'CatSystem2'

  const hasStartupXml = ctx.fileNames.includes('startup.xml')
  const hasIntFiles = ctx.fileNames.some(f => f.endsWith('.int'))
  const hasDirectDat = ctx.fileNames.includes('direct.dat')
  const hasKeyDat = ctx.fileNames.includes('key.dat')

  if (hasStartupXml && hasIntFiles) return 'CatSystem2'
  if ((hasDirectDat || hasKeyDat) && hasIntFiles) return 'CatSystem2'
  return null
}

async function detectElectron(ctx) {
  const hasWwwFolder = ctx.fileNames.includes('www')
  const hasPackageJson = ctx.fileNames.includes('package.json')
  const hasResourcesFolder = ctx.fileNames.includes('resources')

  const hasAsarPathMatch = ctx.filePaths.some(p => p.includes('resources') && (p.endsWith('app.asar') || p.endsWith('electron.asar')))
  if (hasAsarPathMatch) return 'Electron'

  if (hasResourcesFolder && hasPackageJson && !hasWwwFolder) {
    const resourcesDir = path.join(ctx.gameDir, 'resources')
    const resFiles = lowerList(safeReaddir(resourcesDir))
    if (resFiles.some(f => f.endsWith('.asar'))) return 'Electron'
  }

  return null
}

function detectEthornell(ctx) {
  const hasBgiExe = ctx.fileNames.includes('bgi.exe')
  const hasBgiGdb = ctx.fileNames.includes('bgi.gdb')
  const hasArc = ctx.fileNames.some(f => f.endsWith('.arc'))
  if (hasBgiExe) return 'Ethornell (BGI)'
  if (hasBgiGdb && hasArc) return 'Ethornell (BGI)'
  return null
}

function detectEntis(ctx) {
  const hasNoa = ctx.fileNames.some(f => f.endsWith('.noa'))
  const hasEri = ctx.fileNames.some(f => f.endsWith('.eri'))
  const hasMio = ctx.fileNames.some(f => f.endsWith('.mio'))
  if (hasNoa) return 'Entis'
  if (hasEri && hasMio) return 'Entis'
  return null
}

const detectors = [
  detectFlash,
  detectUnity,
  detectUnrealEngine,
  detectGodot,
  detectRPGMaker,
  detectRPGMakerOldVersions,
  detectWolfRPG,
  detectSRPGStudio,
  detectRPGDeveloperBakin,
  detectGameMaker,
  detectTyranoBuilder,
  detectRenpy,
  detectConstruct,
  detectLove2D,
  detectPythonPygame,
  detectJava,
  detectKirikiri,
  detectCatSystem2,
  detectEthornell,
  detectEntis,
  detectElectron
]

/**
 * Detect engine by inspecting the game directory.
 * @param {string} gamePath executable path or directory path
 * @returns {Promise<string|null>}
 */
async function detectGameEngine(gamePath) {
  try {
    if (!gamePath || typeof gamePath !== 'string') return null
    if (!exists(gamePath)) return null

    const ctx = buildContext(gamePath)

    for (const detector of detectors) {
      // detector may be sync or async
      const result = await detector(ctx)
      if (result) return result
    }

    return null
  } catch (err) {
    console.error('detectGameEngine failed:', err)
    return null
  }
}

module.exports = {
  detectGameEngine
}

