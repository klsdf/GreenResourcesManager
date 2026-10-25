/**
 * ============================================================================
 * Windows 特定工具模块 (Windows Utilities)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块提供了 Windows 平台特定的工具函数，包括进程管理、窗口操作等功能。
 * 使用 PowerShell 和 Win32 API 来实现这些功能。
 * 
 * 主要功能：
 * 1. 获取活跃窗口的进程 ID (PID)
 * 2. 通过 PID 获取窗口标题
 * 3. 通过 PID 获取进程的所有窗口标题
 * 4. 获取进程的父进程 ID
 * 5. 通过 PID 最小化窗口
 * 6. 获取磁盘类型信息
 * 
 * 导出的函数：
 * - getActiveWindowPID()         获取当前活跃窗口的进程 ID
 * - getWindowTitleByPID()        通过 PID 获取进程的主窗口标题
 * - getAllWindowTitlesByPID()    通过 PID 获取进程的所有窗口标题
 * - getParentProcessID()         获取进程的父进程 ID
 * - minimizeWindowByPID()        通过 PID 最小化窗口
 * - getDiskType()                获取磁盘类型信息（SSD/HDD）
 * - captureWindowImageByPid()   按进程号从屏幕上拷下窗口区域
 * 
 * 注意：所有函数仅支持 Windows 平台
 * 
 * ============================================================================
 */

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

/**
 * 检查是否为 Windows 平台
 * @returns {boolean}
 */
function isWindows() {
  return process.platform === 'win32'
}

/**
 * 获取当前活跃窗口的进程 ID (PID)
 * @returns {Promise<number>} 进程 ID
 */
async function getActiveWindowPID() {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }
    
    // 使用临时文件执行 PowerShell 脚本，避免命令行转义问题
    const psScript = `Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    public static uint GetForegroundWindowProcessId() {
        IntPtr hWnd = GetForegroundWindow();
        uint processId;
        GetWindowThreadProcessId(hWnd, out processId);
        return processId;
    }
}
"@
[Win32]::GetForegroundWindowProcessId()`
    
    const tempScriptPath = path.join(os.tmpdir(), `get_active_pid_${Date.now()}.ps1`)
    
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      
      // 使用 chcp 65001 设置代码页为 UTF-8，确保输出编码正确
      exec(`chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath)
          }
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        if (error) {
          console.warn('获取活跃窗口 PID 失败:', error)
          reject(error)
          return
        }
        
        const pid = parseInt(stdout.trim(), 10)
        if (isNaN(pid)) {
          reject(new Error('无法解析 PID'))
          return
        }
        
        resolve(pid)
      })
    } catch (writeError) {
      console.error('写入临时脚本失败:', writeError)
      reject(writeError)
    }
  })
}

/**
 * 一次拿出前台窗口的进程号和标题。
 * 截图认窗口时如果分两次开 PowerShell，光是进程启动就要一两秒。合成一次调用，只在多个游戏或标题对不上时用。
 * @returns {Promise<{pid: number|null, title: string|null}>}
 */
async function getForegroundWindowInfo() {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }

    const psScript = `Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win32Foreground {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
}
"@
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$hwnd = [Win32Foreground]::GetForegroundWindow()
$processId = [uint32]0
[Win32Foreground]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$builder = New-Object System.Text.StringBuilder 512
[Win32Foreground]::GetWindowText($hwnd, $builder, $builder.Capacity) | Out-Null
Write-Output $processId
Write-Output $builder.ToString()`

    const tempScriptPath = path.join(os.tmpdir(), `get_foreground_${Date.now()}.ps1`)
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      exec(`chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8' }, (error, stdout) => {
        try {
          if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath)
        } catch (cleanupError) {
          // 临时脚本删不掉不影响结果
        }
        if (error) {
          reject(error)
          return
        }
        const lines = stdout.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
        const pid = parseInt(lines[0], 10)
        const title = lines.slice(1).join('\n').trim()
        resolve({
          pid: Number.isNaN(pid) ? null : pid,
          title: title || null
        })
      })
    } catch (writeError) {
      reject(writeError)
    }
  })
}

/**
 * 通过 PID 获取进程的主窗口标题
 * @param {number} pid - 进程 ID
 * @returns {Promise<string|null>} 窗口标题，如果不存在则返回 null
 */
async function getWindowTitleByPID(pid) {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }

    // 使用临时文件执行 PowerShell 脚本，并确保输出使用 UTF-8 编码
    const psScript = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$process = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if ($process -and $process.MainWindowTitle) {
    [Console]::Out.WriteLine($process.MainWindowTitle)
}`
    
    const tempScriptPath = path.join(os.tmpdir(), `get_window_title_${pid}_${Date.now()}.ps1`)
    
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      
      // 使用 chcp 65001 设置代码页为 UTF-8，确保输出编码正确
      exec(`chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath)
          }
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        if (error) {
          // 如果进程不存在或没有窗口，返回 null
          if (error.code === 1 || stdout.trim() === '') {
            resolve(null)
            return
          }
          reject(error)
          return
        }

        const windowTitle = stdout.trim()
        // 如果窗口标题为空，返回 null
        resolve(windowTitle || null)
      })
    } catch (writeError) {
      console.error(`写入临时脚本失败 (PID: ${pid}):`, writeError)
      reject(writeError)
    }
  })
}

/**
 * 通过 PID 获取进程的所有窗口标题
 * @param {number} pid - 进程 ID
 * @returns {Promise<string[]>} 窗口标题数组
 */
async function getAllWindowTitlesByPID(pid) {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }

    // 使用临时文件执行 PowerShell 脚本，并确保输出使用 UTF-8 编码
    const psScript = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$titles = @()
Get-Process | Where-Object { $_.Id -eq ${pid} } | ForEach-Object { 
    if ($_.MainWindowTitle -and $_.MainWindowTitle.Trim() -ne '') { 
        $titles += $_.MainWindowTitle.Trim() 
    } 
}
$titles | Sort-Object -Unique | ForEach-Object { 
    [Console]::Out.WriteLine($_)
}`
    
    const tempScriptPath = path.join(os.tmpdir(), `get_all_window_titles_${pid}_${Date.now()}.ps1`)
    
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      
      // 使用 chcp 65001 设置代码页为 UTF-8，确保输出编码正确
      exec(`chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath)
          }
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        if (error) {
          // 如果进程不存在或没有窗口，返回空数组
          if (error.code === 1 || stdout.trim() === '') {
            resolve([])
            return
          }
          reject(error)
          return
        }

        const output = stdout.trim()
        if (!output) {
          resolve([])
          return
        }

        // 按行分割并过滤空字符串
        const titles = output.split('\n')
          .map(title => title.trim())
          .filter(title => title !== '')
        
        resolve(titles)
      })
    } catch (writeError) {
      console.error(`写入临时脚本失败 (PID: ${pid}):`, writeError)
      reject(writeError)
    }
  })
}

/**
 * 获取进程的父进程 ID
 * @param {number} pid - 进程 ID
 * @returns {Promise<number>} 父进程 ID
 */
async function getParentProcessID(pid) {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }

    const psCommand = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty ParentProcessId`

    exec(`powershell -Command "${psCommand}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }

      const parentPid = parseInt(stdout.trim(), 10)
      if (isNaN(parentPid)) {
        reject(new Error('无法解析父进程 PID'))
        return
      }

      resolve(parentPid)
    })
  })
}

/**
 * 通过 PID 最小化窗口
 * @param {number} pid - 进程 ID
 * @returns {Promise<boolean>} 是否成功
 */
async function minimizeWindowByPID(pid) {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      reject(new Error('仅支持 Windows 平台'))
      return
    }

    // 使用 PowerShell 通过 PID 找到所有窗口并最小化
    const psScript = `
$targetPid = ${pid}
$process = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
if (-not $process) {
    Write-Output "NO_PROCESS"
    exit
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    public static int targetPid = ${pid};
    public static int minimizedCount = 0;
    
    public static bool MinimizeWindowsByPid(IntPtr hWnd, IntPtr lParam) {
        uint processId;
        GetWindowThreadProcessId(hWnd, out processId);
        if ((int)processId == targetPid && IsWindowVisible(hWnd)) {
            ShowWindow(hWnd, 6); // SW_MINIMIZE = 6
            minimizedCount++;
        }
        return true;
    }
    
    public static int MinimizeAllWindowsByPid() {
        targetPid = ${pid};
        minimizedCount = 0;
        EnumWindows(MinimizeWindowsByPid, IntPtr.Zero);
        return minimizedCount;
    }
}
"@

$minimizedCount = [Win32]::MinimizeAllWindowsByPid()
if ($minimizedCount -gt 0) {
    Write-Output "SUCCESS:$minimizedCount"
} else {
    Write-Output "NO_WINDOW"
}
`
    
    // 将脚本保存到临时文件，避免命令行转义问题
    const tempScriptPath = path.join(os.tmpdir(), `minimize_${pid}_${Date.now()}.ps1`)
    
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      
      exec(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 清理临时文件
        try {
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath)
          }
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        if (error) {
          console.warn(`最小化窗口失败 (PID: ${pid}):`, error.message)
          if (error.code === 1) {
            resolve(false)
            return
          }
          reject(error)
          return
        }
        
        const output = stdout.trim()
        if (output.startsWith('SUCCESS:')) {
          const count = parseInt(output.split(':')[1]) || 0
          console.log(`成功最小化 ${count} 个窗口 (PID: ${pid})`)
          resolve(count > 0)
        } else if (output === 'NO_WINDOW') {
          console.log(`进程 ${pid} 没有可见窗口`)
          resolve(false)
        } else if (output === 'NO_PROCESS') {
          console.log(`进程 ${pid} 不存在`)
          resolve(false)
        } else {
          // 如果没有输出，也尝试返回 true（可能命令执行成功但没有输出）
          resolve(true)
        }
      })
    } catch (writeError) {
      console.error(`写入临时脚本失败 (PID: ${pid}):`, writeError)
      reject(writeError)
    }
  })
}

/**
 * 获取磁盘类型信息（SSD/HDD）
 * @param {string} filePath - 文件路径（用于确定磁盘）
 * @returns {Promise<Object>} { success: boolean, driveLetter?: string, mediaType?: string, friendlyName?: string, deviceId?: string, size?: number, sizeGB?: number, busType?: string, error?: string }
 */
async function getDiskType(filePath) {
  if (!isWindows()) {
    return { success: false, error: '仅支持 Windows 平台' }
  }

  try {
    const path = require('path')
    
    // 提取盘符
    const driveLetter = path.parse(filePath).root.replace('\\', '').replace('/', '')
    if (!driveLetter) {
      return { success: false, error: '无法从路径提取盘符' }
    }
    
    const letter = driveLetter[0]
    if (!fs.existsSync(`${letter}:\\`)) {
      return { success: false, error: `${letter}: 盘不存在` }
    }

    // 写成脚本文件再执行。直接塞进 powershell -Command 时，$_ 和花括号会被命令行吃掉，查询一定失败。
    const psScript = `
$partition = Get-Partition -DriveLetter '${letter}' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $partition) { Write-Output 'NO_PARTITION'; exit 0 }
$disk = $partition | Get-Disk | Get-PhysicalDisk | Select-Object -First 1
if (-not $disk) { Write-Output 'NO_PHYSICAL'; exit 0 }
[PSCustomObject]@{
  MediaType = [string]$disk.MediaType
  FriendlyName = [string]$disk.FriendlyName
  DeviceID = [string]$disk.DeviceId
  Size = [int64]$disk.Size
  BusType = [string]$disk.BusType
} | ConvertTo-Json -Compress
`
    const tempScriptPath = path.join(os.tmpdir(), `grm-disk-${letter}-${Date.now()}.ps1`)

    return new Promise((resolve) => {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`,
        { encoding: 'utf8' },
        (error, stdout, stderr) => {
          try {
            if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath)
          } catch (cleanupError) {
            // 临时脚本删不掉不影响结果
          }

          const trimmedOutput = (stdout || '').trim()
          if (error) {
            resolve({ success: false, error: (stderr || error.message || '查询磁盘失败').trim() })
            return
          }
          if (trimmedOutput === 'NO_PARTITION') {
            resolve({ success: false, error: `${letter}: 没有对应的分区` })
            return
          }
          if (!trimmedOutput || trimmedOutput === 'NO_PHYSICAL') {
            resolve({ success: false, error: `${letter}: 不是本地物理磁盘，读不到 SSD/HDD 类型` })
            return
          }

          try {
            const disk = JSON.parse(trimmedOutput)
            if (!disk.MediaType && !disk.DeviceID) {
              resolve({ success: false, error: '无法获取磁盘类型信息' })
              return
            }
            resolve({
              success: true,
              driveLetter: driveLetter,
              mediaType: disk.MediaType || 'Unknown',
              friendlyName: disk.FriendlyName || '未知磁盘',
              deviceId: disk.DeviceID,
              size: disk.Size || 0,
              sizeGB: disk.Size ? Math.round(disk.Size / (1024 * 1024 * 1024)) : 0,
              busType: disk.BusType || 'Unknown'
            })
          } catch (parseError) {
            console.error('解析磁盘类型失败:', parseError, '原始输出:', stdout)
            resolve({ success: false, error: '解析磁盘类型失败: ' + parseError.message })
          }
        }
      )
    })
  } catch (error) {
    console.error('获取磁盘类型异常:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 按进程号把这个程序在屏幕上占的那一块拷下来。
 * 吉里吉里这类老引擎画在 DirectDraw 上，窗口捕获接口等不到帧，关掉游戏才返回一张黑图。
 * 屏幕上的像素是已经画出来的，按窗口矩形从屏幕拷，才能拿到真正的画面。
 * @param {number} pid 游戏进程号
 * @returns {Promise<Buffer|null>} PNG 数据。找不到够大的可见窗口时返回 null
 */
function captureWindowImageByPid(pid) {
  return new Promise((resolve, reject) => {
    if (!isWindows()) {
      resolve(null)
      return
    }
    /** 只接受正整数，避免拼进脚本。 */
    const safePid = Number(pid)
    if (!Number.isInteger(safePid) || safePid <= 0) {
      resolve(null)
      return
    }
    /** 临时图片。读完就删，不留在截图目录里。 */
    const outPath = path.join(os.tmpdir(), `grm-window-shot-${Date.now()}.png`)
    const escapedOut = outPath.replace(/'/g, "''")
    const psScript = `Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class GrmWindowShot {
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("shcore.dll")] public static extern int SetProcessDpiAwareness(int awareness);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    public static uint TargetPid;
    public static int BestLeft;
    public static int BestTop;
    public static int BestWidth;
    public static int BestHeight;
    static EnumProc keepAlive;
    public static bool Callback(IntPtr hWnd, IntPtr lParam) {
        uint windowPid;
        GetWindowThreadProcessId(hWnd, out windowPid);
        if (windowPid != TargetPid || !IsWindowVisible(hWnd) || IsIconic(hWnd)) return true;
        RECT rect;
        if (!GetWindowRect(hWnd, out rect)) return true;
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        if (width < 80 || height < 80) return true;
        if (width * height <= BestWidth * BestHeight) return true;
        BestLeft = rect.Left;
        BestTop = rect.Top;
        BestWidth = width;
        BestHeight = height;
        return true;
    }
    public static void FindLargest() {
        keepAlive = Callback;
        EnumWindows(keepAlive, IntPtr.Zero);
    }
}
"@
try { [GrmWindowShot]::SetProcessDpiAwareness(2) | Out-Null } catch { [GrmWindowShot]::SetProcessDPIAware() | Out-Null }
[GrmWindowShot]::TargetPid = ${safePid}
[GrmWindowShot]::FindLargest()
if ([GrmWindowShot]::BestWidth -lt 80) { Write-Output 'NOWINDOW'; exit 0 }
$bitmap = New-Object System.Drawing.Bitmap ([GrmWindowShot]::BestWidth), ([GrmWindowShot]::BestHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen([GrmWindowShot]::BestLeft, [GrmWindowShot]::BestTop, 0, 0, $bitmap.Size)
$graphics.Dispose()
$bitmap.Save('${escapedOut}', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Output 'OK'`
    const tempScriptPath = path.join(os.tmpdir(), `grm-window-shot-${Date.now()}.ps1`)
    try {
      fs.writeFileSync(tempScriptPath, psScript, 'utf8')
    } catch (writeError) {
      reject(writeError)
      return
    }
    exec(`chcp 65001 >nul & powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`, { encoding: 'utf8', timeout: 8000 }, (error, stdout) => {
      try {
        if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath)
      } catch (cleanupError) {
        // 临时脚本删不掉不影响截图
      }
      if (error) {
        try {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
        } catch (cleanupError) {
          // 截图临时文件删不掉时留下，下次开机会被系统清掉
        }
        reject(error)
        return
      }
      const output = String(stdout || '').replace(/^\uFEFF/, '').trim()
      if (!output.includes('OK') || !fs.existsSync(outPath)) {
        resolve(null)
        return
      }
      try {
        const png = fs.readFileSync(outPath)
        fs.unlinkSync(outPath)
        resolve(png)
      } catch (readError) {
        reject(readError)
      }
    })
  })
}

module.exports = {
  isWindows,
  getActiveWindowPID,
  getForegroundWindowInfo,
  getWindowTitleByPID,
  getAllWindowTitlesByPID,
  getParentProcessID,
  minimizeWindowByPID,
  getDiskType,
  captureWindowImageByPid
}

