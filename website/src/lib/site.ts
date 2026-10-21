const rawBase = import.meta.env.BASE_URL || '/'
export const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

export const siteOrigin = 'https://klsdf.github.io'
export const siteName = 'Green Resources Manager'
export const siteTitle = 'Green Resources Manager · 仓鼠症患者的资源管理神器'
export const siteDescription =
  '一款完全本地的多媒体资源管理器。游戏、漫画、小说、视频、音乐、网站，统统收进一个可爱的仓鼠窝。'

export const links = {
  github: 'https://github.com/klsdf/GreenResourcesManager',
  releases: 'https://github.com/klsdf/GreenResourcesManager/releases',
  latestRelease: 'https://github.com/klsdf/GreenResourcesManager/releases/latest',
  issues: 'https://github.com/klsdf/GreenResourcesManager/issues',
  profile: 'https://klsdf.github.io/Profile/',
  hatSoft: 'https://hat-soft.top/',
  bilibili: 'https://space.bilibili.com/3690993813555960',
  qqGroupA: 'https://qm.qq.com/q/HgPf1nA4UK'
}

export function url(path = '') {
  return `${base}${path.replace(/^\/+/, '')}`
}

export function absoluteUrl(path = '') {
  return new URL(path.replace(/^\/+/, ''), `${siteOrigin}${base}`).href
}

export function asset(path: string) {
  return url(`images/${path}`)
}
