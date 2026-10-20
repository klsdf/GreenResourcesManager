<template>
  <div class="settings-section">
    <div class="settings-grid">
      <SettingToggle
        v-if="shellMenuSupported"
        :title="$lt('添加到资源管理器右键菜单')"
        :description="$lt('右键压缩包时出现「用 GreenResourcesManager 解压到此处」。会自动试密码本里的全部密码，解压到旁边的同名文件夹。Windows 11 里这项在「显示更多选项」中，按住 Shift 再右键也能看到。')"
        :model-value="shellMenuEnabled"
        @update:model-value="onShellMenuChange"
      />
      <p v-if="shellMenuStale" class="shell-menu-note">{{ $lt('右键菜单还指着以前的程序位置，打开上面的开关会改成现在这份。') }}</p>

      <div class="setting-item">
        <label class="setting-label">
          <span class="setting-title">{{ $lt('压缩包密码本') }}</span>
          <span class="setting-desc">{{ $lt('解压加密压缩包时，系统会自动尝试密码本中的密码。每行一个密码。') }}</span>
        </label>
      </div>
      
      <div class="password-editor-container">
        <div class="password-editor-header">
          <span class="password-count">{{ $lt('共') }} {{ passwords.length }} {{ $lt('个密码') }}</span>
          <div class="password-actions">
            <button class="btn-add" @click="addPassword">{{ $lt('添加密码') }}</button>
            <button class="btn-save" @click="savePasswords" :disabled="isSaving">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
        
        <div class="password-list">
          <div 
            v-for="(password, index) in passwords" 
            :key="index"
            class="password-item"
          >
            <input
              v-model="passwords[index]"
              type="text"
              class="password-input"
              :placeholder="$lt('输入密码')"
              @blur="onPasswordChange"
            />
            <button class="btn-remove" @click="removePassword(index)" :title="$lt('删除')">×</button>
          </div>
          
          <div v-if="passwords.length === 0" class="empty-passwords">
            <p>{{ $lt('暂无密码，点击"添加密码"添加常用密码') }}</p>
          </div>
        </div>
        
        <div class="password-editor-footer">
          <div class="footer-actions">
            <button class="btn-open-folder" @click="openPasswordFolder">{{ $lt('打开密码文件夹') }}</button>
            <button class="btn-open-file" @click="openPasswordFile">{{ $lt('打开密码文件') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import notify from '../../utils/NotificationService.ts'
import SettingToggle from './SettingToggle.vue'

export default {
  name: 'ArchiveSettings',
  components: {
    SettingToggle
  },
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings'],
  data() {
    return {
      passwords: [] as string[],
      isSaving: false,
      hasChanges: false,
      passwordFilePath: '' as string,
      /** 当前系统能不能写资源管理器右键菜单。 */
      shellMenuSupported: false,
      /** 右键菜单是否已经指向现在这份程序。 */
      shellMenuEnabled: false,
      /** 菜单还在，但命令指向了别的安装位置。 */
      shellMenuStale: false,
      /** 正在写入注册表时忽略重复点击。 */
      shellMenuBusy: false
    }
  },
  async mounted() {
    await this.loadPasswords()
    await this.loadShellMenu()
  },
  methods: {
    /**
     * 读取右键菜单现在有没有挂上。
     */
    async loadShellMenu() {
      try {
        if (!window.electronAPI || !window.electronAPI.getShellExtractMenu) return
        const result = await window.electronAPI.getShellExtractMenu()
        if (!result.success) {
          notify.toast('error', '读取右键菜单失败', result.error || '未知错误')
          return
        }
        this.shellMenuSupported = result.supported
        this.shellMenuEnabled = result.enabled
        this.shellMenuStale = result.stale
      } catch (error) {
        console.error('读取右键菜单失败:', error)
      }
    },

    /**
     * 打开或关掉资源管理器右键里的解压项。
     * @param enabled 是否显示
     */
    async onShellMenuChange(enabled: boolean) {
      if (this.shellMenuBusy) {
        this.shellMenuEnabled = !enabled
        return
      }
      this.shellMenuBusy = true
      this.shellMenuEnabled = enabled
      try {
        if (!window.electronAPI || !window.electronAPI.setShellExtractMenu) {
          throw new Error('当前环境不支持修改右键菜单')
        }
        const result = await window.electronAPI.setShellExtractMenu(enabled)
        if (!result.success) {
          this.shellMenuEnabled = !enabled
          notify.toast('error', enabled ? '添加失败' : '移除失败', result.error || '未知错误')
          return
        }
        this.shellMenuEnabled = result.enabled
        this.shellMenuStale = false
        if (enabled && result.enabled) {
          notify.toast('success', '已添加到右键菜单', '在压缩包上右键即可解压。Windows 11 请在「显示更多选项」里找，或按住 Shift 再右键。如果刚加上还看不到，重新打开一次文件夹。')
        } else if (!enabled && !result.enabled) {
          notify.toast('success', '已从右键菜单移除', '资源管理器里不会再显示这项。')
        } else {
          notify.toast('error', '右键菜单没有改成功', '请再试一次。')
        }
      } catch (error: any) {
        this.shellMenuEnabled = !enabled
        notify.toast('error', '修改右键菜单失败', error.message || '未知错误')
      } finally {
        this.shellMenuBusy = false
      }
    },

    async loadPasswords() {
      try {
        if (window.electronAPI && window.electronAPI.readArchivePasswords) {
          const result = await window.electronAPI.readArchivePasswords()
          if (result.success && result.passwords) {
            this.passwords = [...result.passwords]
            if (result.filePath) {
              this.passwordFilePath = result.filePath
            }
            if (result.fileCreated) {
              notify.toast('info', '密码文件已创建', '已创建 SaveData/passwords.txt 文件，包含默认密码。')
            }
          } else {
            console.error('读取密码失败:', result.error)
            notify.toast('error', '读取密码失败', result.error || '未知错误')
          }
        }
      } catch (error) {
        console.error('加载密码失败:', error)
        notify.toast('error', '加载密码失败', error.message || '未知错误')
      }
    },
    
    async savePasswords() {
      if (this.isSaving) return
      
      try {
        this.isSaving = true
        
        // 过滤空密码
        const validPasswords = this.passwords.filter(p => p.trim().length > 0)
        
        if (window.electronAPI && window.electronAPI.writeArchivePasswords) {
          const result = await window.electronAPI.writeArchivePasswords(validPasswords)
          if (result.success) {
            this.passwords = validPasswords
            this.hasChanges = false
            notify.toast('success', '保存成功', `已保存 ${validPasswords.length} 个密码`)
          } else {
            notify.toast('error', '保存失败', result.error || '未知错误')
          }
        }
      } catch (error) {
        console.error('保存密码失败:', error)
        notify.toast('error', '保存密码失败', error.message || '未知错误')
      } finally {
        this.isSaving = false
      }
    },
    
    addPassword() {
      this.passwords.push('')
      this.hasChanges = true
    },
    
    removePassword(index: number) {
      this.passwords.splice(index, 1)
      this.hasChanges = true
    },
    
    onPasswordChange() {
      this.hasChanges = true
    },
    
    async openPasswordFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          // 获取 SaveData 目录路径
          let saveDataPath = ''
          
          if (this.passwordFilePath) {
            // 从密码文件路径获取目录（使用字符串操作，兼容浏览器环境）
            const lastSlash = Math.max(this.passwordFilePath.lastIndexOf('\\'), this.passwordFilePath.lastIndexOf('/'))
            saveDataPath = lastSlash > 0 ? this.passwordFilePath.substring(0, lastSlash) : this.passwordFilePath
          } else {
            // 尝试读取密码文件获取路径
            if (window.electronAPI.readArchivePasswords) {
              const result = await window.electronAPI.readArchivePasswords()
              if (result.success && result.filePath) {
                const lastSlash = Math.max(result.filePath.lastIndexOf('\\'), result.filePath.lastIndexOf('/'))
                saveDataPath = lastSlash > 0 ? result.filePath.substring(0, lastSlash) : result.filePath
              }
            }
            
            // 如果还是获取不到，使用默认路径
            if (!saveDataPath) {
              saveDataPath = 'SaveData'
            }
          }
          
          const result = await window.electronAPI.openFolder(saveDataPath)
          if (result.success) {
            notify.toast('success', '文件夹已打开', `已打开密码文件夹: ${saveDataPath}`)
          } else {
            notify.toast('error', '打开文件夹失败', result.error || '未知错误')
          }
        } else {
          notify.toast('error', '功能不可用', '当前环境不支持打开文件夹')
        }
      } catch (error) {
        console.error('打开密码文件夹失败:', error)
        notify.toast('error', '打开文件夹失败', error.message || '未知错误')
      }
    },
    
    async openPasswordFile() {
      try {
        if (window.electronAPI && window.electronAPI.openExternal) {
          let filePath = this.passwordFilePath
          
          // 如果还没有文件路径，先读取获取
          if (!filePath) {
            if (window.electronAPI.readArchivePasswords) {
              const result = await window.electronAPI.readArchivePasswords()
              if (result.success && result.filePath) {
                filePath = result.filePath
              }
            }
          }
          
          if (filePath) {
            const result = await window.electronAPI.openExternal(filePath)
            if (result.success) {
              notify.toast('success', '文件已打开', `已打开密码文件: ${filePath}`)
            } else {
              notify.toast('error', '打开文件失败', result.error || '未知错误')
            }
          } else {
            notify.toast('error', '文件路径未知', '无法获取密码文件路径')
          }
        } else {
          notify.toast('error', '功能不可用', '当前环境不支持打开文件')
        }
      } catch (error) {
        console.error('打开密码文件失败:', error)
        notify.toast('error', '打开文件失败', error.message || '未知错误')
      }
    }
  },
  
  beforeUnmount() {
    // 组件卸载前保存更改
    if (this.hasChanges && this.passwords.length > 0) {
      this.savePasswords()
    }
  }
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--bg-tertiary);
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.shell-menu-note {
  margin: -8px 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.password-editor-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
}

.password-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.password-count {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.password-actions {
  display: flex;
  gap: 10px;
}

.btn-add,
.btn-save {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-add {
  background: var(--accent-color);
  color: white;
}

.btn-add:hover {
  background: var(--accent-hover);
}

.btn-save {
  background: #10b981;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #059669;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-list {
  max-height: 1000px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.password-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.password-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.password-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.btn-remove {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: #dc2626;
}

.empty-passwords {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-passwords p {
  margin: 0;
  font-size: 0.9rem;
}

.password-editor-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.footer-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-open-folder,
.btn-open-file {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-open-folder {
  background: #10b981;
  color: white;
}

.btn-open-folder:hover {
  background: #059669;
}

.btn-open-file {
  background: #3b82f6;
  color: white;
}

.btn-open-file:hover {
  background: #2563eb;
}
</style>

