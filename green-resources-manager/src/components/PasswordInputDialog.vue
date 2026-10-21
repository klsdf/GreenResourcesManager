<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn-close" @click="handleCancel">✕</button>
      </div>
      <div class="modal-body">
        <p class="dialog-message">{{ message }}</p>
        <div class="password-input-group">
          <label>{{ $lt('密码：') }}</label>
          <input
            type="password"
            v-model="passwordValue"
            @keyup.enter="handleConfirm"
            @keyup.esc="handleCancel"
            ref="passwordInput"
            class="password-input"
            :placeholder="$lt('请输入密码')"
            autofocus
          />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleCancel">{{ $lt('取消') }}</button>
        <button class="btn-confirm" @click="handleConfirm" :disabled="!passwordValue">{{ $lt('确认') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PasswordInputDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '输入密码'
    },
    message: {
      type: String,
      default: '该压缩包需要密码，请输入密码：'
    }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      passwordValue: ''
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        // 对话框显示时，重置密码并聚焦输入框
        this.passwordValue = ''
        this.$nextTick(() => {
          if (this.$refs.passwordInput) {
            this.$refs.passwordInput.focus()
          }
        })
      }
    }
  },
  methods: {
    handleConfirm() {
      if (this.passwordValue) {
        this.$emit('confirm', this.passwordValue)
        this.passwordValue = ''
      }
    },
    handleCancel() {
      this.$emit('cancel')
      this.passwordValue = ''
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
  z-index: 10000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}


.modal-body {
  padding: 24px;
}

.dialog-message {
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.password-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password-input-group label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.password-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.password-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.password-input::placeholder {
  color: var(--text-tertiary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-confirm {
  background: var(--accent-color);
  color: var(--text-on-accent, #1a1a1a);
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-color-hover, #4a9eff);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 192, 244, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

