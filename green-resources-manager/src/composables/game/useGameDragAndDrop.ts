import { ref, type Ref } from 'vue'
import { useDragAndDrop } from '../useDragAndDrop'
import notify from '../../utils/NotificationService'
import { isArchiveFile } from '../useArchive'
import { Game as GameClass } from '@resources/game.ts'

// Game 类型就是 GameClass 的实例类型
type Game = InstanceType<typeof GameClass>

/**
 * 游戏拖拽选项类型
 */
export interface GameDragDropOptions {
	onAddGame: (game: Game) => Promise<void>
	onShowPathUpdateDialog: (info: {
		existingGame: Game
		newPath: string
		newFileName: string
	}) => void
	isElectronEnvironment: boolean
}

/**
 * 从文件路径提取游戏名称
 * @param filePath - 文件路径或文件名
 * @returns 提取的游戏名称
 */
function extractGameNameFromPath(filePath: string): string {
  const fileName = filePath.split(/[\\/]/).pop() || ''
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

  let cleanName = nameWithoutExt
    .replace(/\.exe$/i, '')
    .replace(/\.swf$/i, '')
    .replace(/\.bat$/i, '')
    .replace(/\.zip$/i, '')
    .replace(/\.rar$/i, '')
    .replace(/\.7z$/i, '')
    .replace(/\.tar$/i, '')
    .replace(/\.gz$/i, '')
    .replace(/\.bz2$/i, '')
    .replace(/\.xz$/i, '')
    .replace(/^game[-_\s]*/i, '')
    .replace(/[-_\s]+/g, ' ')
    .trim()

  if (!cleanName) {
    cleanName = nameWithoutExt
  }

  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
}

/**
 * 游戏拖拽处理 composable
 * 处理游戏文件的拖拽添加逻辑
 */
export function useGameDragAndDrop(options: GameDragDropOptions) {
  const {
    games: gamesInput,
    onAddGame,
    onShowPathUpdateDialog,
    isElectronEnvironment
  } = options

  // 处理 games 可能是 Ref 或普通数组
  // 在函数内部获取当前值
  const getGames = () => {
    return 'value' in gamesInput ? gamesInput.value : gamesInput
  }

  // 使用通用拖拽 composable
  const dragDrop = useDragAndDrop({
    acceptedExtensions: ['.exe', '.swf', '.bat', '.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz'],
    enabled: true,
    onDrop: handleGameDrop
  })

  /**
   * 处理游戏文件拖拽
   */
  async function handleGameDrop(files: File[]) {
    try {
      console.log('=== 拖拽调试信息 ===')
      console.log('拖拽文件数量:', files.length)
      console.log('拖拽文件详细信息:', files.map(f => ({
        name: f.name,
        path: (f as any).path,
        type: f.type,
        size: f.size
      })))
      console.log('当前游戏库状态:')
      const currentGames = getGames()
      currentGames.forEach((game, index) => {
        console.log(`  ${index + 1}. ${game.name?.value}`)
        console.log(`     路径: ${game.resourcePath?.value}`)
        console.log(`     文件存在: ${game.fileExists?.value}`)
      })

      if (files.length === 0) {
        notify.native('拖拽失败', '请拖拽游戏可执行文件到此处')
        return
      }

      // 批量添加游戏文件
      let addedCount = 0
      let failedCount = 0

      for (const executableFile of files) {
        try {
          const filePath = (executableFile as any).path || executableFile.name
          
          // 获取当前游戏列表（每次循环都获取最新值，因为 games 可能是响应式的）
          const currentGames = getGames()

          // 检查是否已经存在相同的文件路径
          const existingGameByPath = currentGames.find(game => {
            return game.resourcePath?.value === filePath
          })
          if (existingGameByPath) {
            console.log(`游戏文件已存在: ${executableFile.name}`)
            failedCount++
            continue
          }

          // 检查是否存在同名但路径不同的丢失文件
          const existingGameByName = currentGames.find(game => {
            const gamePath = game.resourcePath?.value
            if (!gamePath) return false
            
            const gameFileName = gamePath.split(/[\\/]/).pop()?.toLowerCase() || ''
            const newFileName = executableFile.name.toLowerCase()
            const isSameName = gameFileName === newFileName
            const isFileMissing = !game.fileExists?.value

            console.log(`检查游戏: ${game.name?.value}`)
            console.log(`  文件名: ${gameFileName} vs ${newFileName}`)
            console.log(`  是否同名: ${isSameName}`)
            console.log(`  文件存在: ${game.fileExists?.value}`)
            console.log(`  是否丢失: ${isFileMissing}`)
            console.log(`  匹配条件: ${isSameName && isFileMissing}`)

            return isSameName && isFileMissing
          })

          if (existingGameByName) {
            console.log(`发现同名丢失文件: ${executableFile.name}`)
            console.log(`现有游戏路径: ${existingGameByName.resourcePath?.value}`)
            console.log(`新文件路径: ${filePath}`)
            // 显示路径更新确认对话框
            onShowPathUpdateDialog({
              existingGame: existingGameByName,
              newPath: filePath,
              newFileName: executableFile.name
            })
            // 暂停处理，等待用户确认
            return
          }

          // 检查是否为压缩包
          const isArchive = isArchiveFile(filePath)

          // 创建游戏数据对象（普通对象）
          const gameData: any = {
            name: extractGameNameFromPath(executableFile.name),
            developers: [],
            publisher: [],
            description: '',
            tags: [],
            resourcePath: filePath,
            coverPath: '',
            folderSize: 0,
            playTime: 0,
            playCount: 0,
            visitedSessions: [],
            addedDate: new Date().toISOString(),
            fileExists: true, // 拖拽添加的游戏默认文件存在
            isArchive: isArchive // 标记是否为压缩包
          }

          // 获取游戏文件夹大小
          if (isElectronEnvironment && window.electronAPI && window.electronAPI.getFolderSize) {
            try {
              const result = await window.electronAPI.getFolderSize(filePath)
              if (result.success) {
                gameData.folderSize = result.size
                console.log(`游戏 ${gameData.name} 文件夹大小: ${result.size} 字节`)
              }
            } catch (error) {
              console.error('获取文件夹大小失败:', error)
            }
          }

          // 使用 fromJSON 创建 Game 实例（会自动生成 id）
          const game = GameClass.fromJSON(gameData)
          console.log('创建游戏对象:', game)

          // 添加到游戏列表
          await onAddGame(game)
          addedCount++

        } catch (error) {
          console.error(`添加游戏文件失败: ${executableFile.name}`, error)
          failedCount++
        }
      }

      // 显示结果通知
      if (addedCount > 0) {
        notify.toast(
          'success',
          '添加成功',
          `成功添加 ${addedCount} 个游戏${failedCount > 0 ? `，${failedCount} 个文件添加失败` : ''}`
        )
      } else {
        // 详细分析失败原因
        let failureReason = ''
        if (files.length === 0) {
          failureReason = '没有检测到任何文件'
        } else {
          failureReason = `所有 ${files.length} 个可执行文件都已存在于游戏库中`
        }

        notify.toast(
          'error',
          '添加失败',
          `没有成功添加任何游戏文件\n原因：${failureReason}\n\n提示：\n• 请确保拖拽的是 .exe、.swf、.bat 或压缩包文件（.zip、.rar、.7z 等）\n• 检查文件是否已存在于游戏库中\n• 尝试重新拖拽文件`
        )
      }

    } catch (error) {
      console.error('拖拽添加游戏失败:', error)

      // 根据错误类型提供更详细的错误信息
      let errorMessage = ''
      if (error instanceof Error) {
        if (error.name === 'SecurityError') {
          errorMessage = '安全错误：浏览器阻止了文件访问\n请尝试使用"添加游戏"按钮手动选择文件'
        } else if (error.name === 'NotAllowedError') {
          errorMessage = '权限错误：无法访问拖拽的文件\n请检查文件权限或尝试重新拖拽'
        } else if (error.message.includes('path')) {
          errorMessage = `文件路径错误：${error.message}\n请确保文件路径有效且可访问`
        } else if (error.message.includes('size')) {
          errorMessage = `文件大小错误：${error.message}\n请检查文件是否损坏或过大`
        } else {
          errorMessage = `未知错误：${error.message}\n请尝试重新拖拽文件或使用"添加游戏"按钮`
        }
      } else {
        errorMessage = '未知错误，请尝试重新拖拽文件或使用"添加游戏"按钮'
      }

      notify.toast(
        'error',
        '添加失败',
        `拖拽添加游戏时发生错误\n\n${errorMessage}\n\n建议：\n• 重新拖拽文件\n• 使用"添加游戏"按钮手动选择\n• 检查文件是否完整且可访问`
      )
    }
  }

  return {
    // 拖拽状态和事件处理函数（从通用 composable 导出）
    isDragOver: dragDrop.isDragOver,
    handleDragOver: dragDrop.handleDragOver,
    handleDragEnter: dragDrop.handleDragEnter,
    handleDragLeave: dragDrop.handleDragLeave,
    handleDrop: dragDrop.handleDrop
  }
}

