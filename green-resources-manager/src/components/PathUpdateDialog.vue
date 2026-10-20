<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn-close" @click="handleCancel">✕</button>
      </div>
      <div class="modal-body">
        <div class="path-update-info">
          <p>{{ description }}</p>
          <div class="path-comparison">
            <div class="path-item">
              <label>{{ itemNameLabel }}：</label>
              <span class="item-name">{{ itemName }}</span>
            </div>
            <div class="path-item">
              <label>{{ $lt('当前路径：') }}</label>
              <span class="path-old">{{ oldPath }}</span>
              <span class="status-badge status-missing">{{ missingLabel }}</span>
            </div>
            <div class="path-item">
              <label>{{ $lt('新路径：') }}</label>
              <span class="path-new">{{ newPath }}</span>
              <span class="status-badge status-found">{{ foundLabel }}</span>
            </div>
          </div>
          <p class="update-question">{{ question }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleCancel">{{ cancelText }}</button>
        <button class="btn-confirm" @click="handleConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PathUpdateDialog',
  props: {
    // 对话框显示状态
    visible: {
      type: Boolean,
      default: false
    },
    // 对话框标题
    title: {
      type: String,
      default: '更新路径'
    },
    // 描述文本
    description: {
      type: String,
      default: '发现同名但路径不同的文件：'
    },
    // 项目名称标签（如"游戏名称"、"漫画名称"、"视频名称"）
    itemNameLabel: {
      type: String,
      default: '名称'
    },
    // 项目名称
    itemName: {
      type: String,
      default: ''
    },
    // 旧路径
    oldPath: {
      type: String,
      default: ''
    },
    // 新路径
    newPath: {
      type: String,
      default: ''
    },
    // 丢失状态标签
    missingLabel: {
      type: String,
      default: '文件丢失'
    },
    // 存在状态标签
    foundLabel: {
      type: String,
      default: '文件存在'
    },
    // 确认问题
    question: {
      type: String,
      default: '是否要更新路径？'
    },
    // 取消按钮文本
    cancelText: {
      type: String,
      default: '取消'
    },
    // 确认按钮文本
    confirmText: {
      type: String,
      default: '更新路径'
    }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    handleConfirm() {
      this.$emit('confirm')
    },
    handleCancel() {
      this.$emit('cancel')
    },
    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     * 这样只有在外部区域按下鼠标时才会关闭，符合常见软件的交互习惯
     */
    handleOverlayMouseDown(event) {
      // 只在 overlay 背景上按下鼠标时才关闭（不是 content 区域）
      // event.target 是 overlay 本身，而不是 content
      if (event.target === event.currentTarget) {
        this.handleCancel()
      }
    }
  }
}
</script>

<style scoped>
/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-dark);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
}


.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

/* 路径更新信息样式 */
.path-update-info {
  padding: 20px 0;
}

.path-comparison {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.path-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 10px;
}

.path-item:last-child {
  margin-bottom: 0;
}

.path-item label {
  min-width: 80px;
  font-weight: 500;
  color: var(--text-primary);
}

.item-name {
  font-weight: 600;
  color: var(--accent-color);
  font-size: 16px;
}

.path-old,
.path-new {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  word-break: break-all;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-missing {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.status-found {
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.update-question {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 20px 0 0 0;
}

/* 按钮样式 */
.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-confirm {
  padding: 10px 20px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-confirm:hover {
  background: var(--accent-hover);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .path-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .path-item label {
    min-width: auto;
  }
  
  .path-old,
  .path-new {
    width: 100%;
  }
}
</style>
