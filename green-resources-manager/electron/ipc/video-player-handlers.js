/**
 * 视频播放器的主进程接口。
 * 播放页通过这些接口探测文件、拿播放地址、拖动转码进度和截图。
 */

const { app } = require('electron')
const videoSession = require('../services/video-session')

/**
 * 注册视频播放器 IPC。
 * @param {import('electron').IpcMain} ipcMain 主进程 IPC
 */
function registerVideoPlayerHandlers(ipcMain) {
  ipcMain.handle('video-open-session', (event, request) => videoSession.openSession(request || {}))
  ipcMain.handle('video-seek-session', (event, request) => {
    const payload = request || {}
    return videoSession.seekSession(payload.sessionId, payload.seconds)
  })
  ipcMain.handle('video-escalate-session', (event, request) => {
    const payload = request || {}
    return videoSession.escalateSession(payload.sessionId, payload.seconds)
  })
  ipcMain.handle('video-pause-session', (event, request) => {
    const payload = request || {}
    return videoSession.pauseEncoding(payload.sessionId)
  })
  ipcMain.handle('video-close-session', (event, request) => {
    const payload = request || {}
    return videoSession.closeSession(payload.sessionId)
  })
  ipcMain.handle('video-screenshot', (event, request) => {
    const payload = request || {}
    return videoSession.captureFrame(payload.sessionId, payload.seconds)
  })
  ipcMain.handle('video-list-siblings', (event, filePath) => videoSession.listSiblings(filePath))

  app.on('before-quit', () => {
    videoSession.closeAllSessions()
  })
}

module.exports = {
  registerVideoPlayerHandlers
}
