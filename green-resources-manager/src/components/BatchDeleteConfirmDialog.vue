<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-wrapper">
      <div class="modal-content" @mousedown.stop>
        <div class="modal-header">
          <h3>批量删除文件</h3>
          <button class="btn-close" @click="handleClose">✕</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <p class="warning-title">确定要删除选中的项目吗？</p>
              <p class="warning-description">
                将删除 <strong>{{ count }}</strong> 个项目，此操作不可撤销。
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button class="btn-confirm" @click="handleConfirm">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BatchDeleteConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    count: {
      type: Number,
      default: 0
    }
  },
  emits: ['close', 'confirm'],
  setup(props, { emit }) {
    const handleOverlayMouseDown = () => {
      handleClose()
    }

    const handleClose = () => {
      emit('close')
    }

    const handleConfirm = () => {
      emit('confirm')
    }

    return {
      handleOverlayMouseDown,
      handleClose,
      handleConfirm
    }
  }
})
</script>

<style scoped lang="scss">
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

.modal-wrapper {
  width: 100%;
  max-width: 450px;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .btn-close {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.delete-warning {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.warning-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.warning-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;

  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);

  &:hover {
    background: var(--bg-hover);
  }
}

.btn-confirm {
  background: #ef4444;
  color: white;

  &:hover {
    opacity: 0.9;
  }
}
</style>
