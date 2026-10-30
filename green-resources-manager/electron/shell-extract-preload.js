/**
 * 解压进度小窗的预加载脚本。
 * 只暴露进度更新和三个按钮，不把整个主程序接口放进来。
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('shellExtract', {
  /**
   * 订阅进度。主进程每次换密码或结束时推一次。
   * @param {(state: { fileName: string, message: string, status: string, outputDir: string }) => void} callback
   */
  onUpdate: (callback) => {
    ipcRenderer.on('shell-extract-update', (_event, state) => callback(state))
  },
  /**
   * 打开解压出来的文件夹。
   * @param {string} folderPath
   */
  openFolder: (folderPath) => ipcRenderer.invoke('shell-extract-open-folder', folderPath),
  /** 关闭进度窗口，同时停掉还没完成的解压。 */
  close: () => ipcRenderer.invoke('shell-extract-close'),
  /** 把主窗口带到前面。右键启动时主窗口是藏着的。 */
  showMain: () => ipcRenderer.invoke('shell-extract-show-main'),
  /** 把一段文字放进剪贴板。失败报错时用来复制工具输出。 */
  copyText: (text) => ipcRenderer.invoke('shell-extract-copy', text)
})
