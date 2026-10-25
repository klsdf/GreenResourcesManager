export interface ExclusionCategory {
  id: string
  label: string
  hint: string
  patterns: string[]
  defaultChecked: boolean
}

/**
 * 批量导入搜索 exe 时默认跳过的常见附属程序。
 * 匹配方式是「文件名或文件夹名里包含这段文字」，所以这里只写能稳定区分的片段。
 */
export const EXCLUSION_CATEGORIES: ExclusionCategory[] = [
  {
    id: 'unity',
    label: 'Unity 引擎',
    hint: '崩溃处理器和 Mono 运行时目录，包里的游戏主程序不会叫这些名字',
    patterns: ['UnityCrashHandler', 'MonoBleedingEdge'],
    defaultChecked: true
  },
  {
    id: 'unreal',
    label: 'Unreal 引擎',
    hint: '崩溃上报、内嵌浏览器、Epic 覆盖层和引擎运行库',
    patterns: [
      'CrashReportClient.exe',
      'UnrealCEFSubProcess.exe',
      'EpicWebHelper.exe',
      'EOSOverlayRenderer',
      'UE4PrereqSetup',
      'UEPrereqSetup'
    ],
    defaultChecked: true
  },
  {
    id: 'renpy',
    label: "Ren'Py / Python",
    hint: "Ren'Py 自带的 Python 运行时和更新工具，主程序是游戏自己的名字",
    patterns: ['python.exe', 'pythonw.exe', 'zsync.exe', 'zsyncmake.exe', 'renpy'],
    defaultChecked: true
  },
  {
    id: 'chromium',
    label: 'Electron / Chromium',
    hint: 'Chromium 辅助进程和自动更新程序',
    patterns: ['crashpad_handler.exe', 'notification_helper.exe', 'squirrel.exe', 'Update.exe'],
    defaultChecked: true
  },
  {
    id: 'prereq',
    label: '运行库安装包',
    hint: 'DirectX、VC++、OpenAL、PhysX、.NET 安装程序和 _CommonRedist 目录',
    patterns: [
      '_CommonRedist',
      'vc_redist',
      'vcredist',
      'dxsetup',
      'dxwebsetup',
      'oalinst',
      'physx',
      'dotnetfx'
    ],
    defaultChecked: true
  },
  {
    id: 'installer',
    label: '安装与卸载',
    hint: 'unins000、unins001、uninstall 等卸载程序',
    patterns: ['unins'],
    defaultChecked: true
  },
  {
    id: 'tools',
    label: '配置与调试工具',
    hint: '设置工具和调试控制台，不包含游戏主程序',
    patterns: ['config.exe', 'settings.exe', '.console.exe'],
    defaultChecked: true
  },
  {
    id: 'tool-lib',
    label: '工具与运行库目录',
    hint: 'Tool、Tools 等工具目录和 lib、libs、lib32、lib64 等运行库目录，整层跳过',
    patterns: ['folder:tool', 'folder:=lib', 'folder:=libs', 'folder:=lib32', 'folder:=lib64'],
    defaultChecked: true
  },
  {
    id: 'nwjs',
    label: 'NW.js 运行时',
    hint: 'RPG Maker MV/MZ 的 nw.exe。主程序如果就叫 nw.exe，请取消勾选',
    patterns: ['nw.exe', 'nwjs.exe'],
    defaultChecked: false
  },
  {
    id: 'java',
    label: 'Java 运行时',
    hint: 'java.exe、javaw.exe。用 Java 直接启动的游戏请取消勾选',
    patterns: ['java.exe', 'javaw.exe', 'javaws.exe'],
    defaultChecked: false
  }
]

export function getDefaultExcludedCategoryIds(): string[] {
  return EXCLUSION_CATEGORIES.filter(category => category.defaultChecked).map(category => category.id)
}

export function buildExcludePatterns(categoryIds: string[], customText: string): string[] {
  const selected = new Set(categoryIds)
  const categoryPatterns = EXCLUSION_CATEGORIES
    .filter(category => selected.has(category.id))
    .flatMap(category => category.patterns)
  const customPatterns = customText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  // 搜索时统一转小写比较，这里也按小写去重，避免同一段写两遍。
  const seen = new Set<string>()
  const patterns: string[] = []
  for (const pattern of [...categoryPatterns, ...customPatterns]) {
    const key = pattern.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    patterns.push(pattern)
  }
  return patterns
}
