<template>
  <div class="fun-shortcut-input" ref="root">
    <div class="shortcut-row">
      <button
        type="button"
        class="shortcut-recorder"
        :class="{ 'is-recording': recording }"
        @click="startRecording"
      >
        <template v-if="recording">
          <span class="recording-hint">{{ recordingHint }}</span>
          <template v-for="(part, index) in previewParts" :key="`preview-${part}`">
            <kbd class="kbd">{{ part }}</kbd>
            <kbd class="kbd-separator">+</kbd>
          </template>
        </template>
        <template v-else-if="shortcutParts.length">
          <template v-for="(part, index) in shortcutParts" :key="`${part}-${index}`">
            <kbd class="kbd">{{ part }}</kbd>
            <kbd class="kbd-separator" v-if="index < shortcutParts.length - 1">+</kbd>
          </template>
        </template>
        <span v-else class="recording-hint">点击后按下快捷键</span>
      </button>
      <button
        v-if="recording"
        type="button"
        class="btn-cancel"
        @click="cancelRecording"
      >取消</button>
      <button
        v-else
        type="button"
        class="btn-edit-shortcut"
        title="按下按键重新设置"
        @click="startRecording"
      >✏️</button>
    </div>
    <span v-if="inlineError" class="shortcut-error">{{ inlineError }}</span>
  </div>
</template>

<script lang="ts">
/**
 * 修饰键的物理按键。这些键只参与组合，松手之前不能单独当成一条快捷键。
 * 用 code 而不是 key，避免左右 Ctrl 被输入法或键盘布局写成不同字符。
 */
const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight'
])

/**
 * 把键盘 code 转成 Electron 快捷键里的主键名。
 * 字母和数字走 code，是为了 Shift 不会把 a 变成 A 以外的符号，中文输入法也不会把按键变成拼音。
 * 返回空字符串表示这个键不能注册成全局快捷键。
 */
function acceleratorFromCode(code: string): string {
  if (/^Key([A-Z])$/.test(code)) {
    return code.slice(3)
  }
  if (/^Digit([0-9])$/.test(code)) {
    return code.slice(5)
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
    return code
  }
  if (/^Numpad([0-9])$/.test(code)) {
    return `num${code.slice(6)}`
  }

  const named: Record<string, string> = {
    Escape: 'Esc',
    Space: 'Space',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Enter: 'Enter',
    NumpadEnter: 'Enter',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backquote: '`',
    NumpadAdd: 'numadd',
    NumpadSubtract: 'numsub',
    NumpadMultiply: 'nummult',
    NumpadDivide: 'numdiv',
    NumpadDecimal: 'numdec'
  }
  return named[code] || ''
}

/**
 * 当前这次按键里按住的修饰键，顺序固定成 Ctrl、Alt、Shift、Super。
 * 顺序固定是为了和已经保存的「Ctrl+Shift+S」这种写法一致，避免同一组合因为顺序不同被当成两个键。
 */
function modifierParts(event: KeyboardEvent): string[] {
  const parts: string[] = []
  if (event.ctrlKey) {
    parts.push('Ctrl')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  if (event.metaKey) {
    parts.push('Super')
  }
  return parts
}

/**
 * 把一次按键收成 Electron 能注册的字符串，例如 Ctrl+Shift+S。
 * 只按着 Ctrl、Shift 时返回空字符串，调用方继续等主键。
 */
function buildAccelerator(event: KeyboardEvent): string {
  if (MODIFIER_CODES.has(event.code)) {
    return ''
  }
  const key = acceleratorFromCode(event.code)
  if (!key) {
    return ''
  }
  return [...modifierParts(event), key].join('+')
}

export default {
  name: 'FunShortcutInput',
  props: {
    /** 当前快捷键，格式与 Electron 一致，例如 Ctrl+F12。 */
    modelValue: {
      type: String,
      default: ''
    },
    /** 设置被清空时回退用的默认快捷键。当前界面不再提供文本清空，保留给调用方重置。 */
    defaultShortcut: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'shortcut-changed'],
  data() {
    return {
      /** 为 true 时才监听键盘。平时不听，避免用户在别的输入框打字被记成快捷键。 */
      recording: false,
      /** 录制中已经按住的修饰键，用来在主键按下之前先显示出来。 */
      previewParts: [] as string[],
      /** 按到不能注册的键时，显示在控件下方的一句说明。 */
      inlineError: ''
    }
  },
  computed: {
    /**
     * 展示用的按键片段。按加号拆开，和录制结果的存储格式对应。
     */
    shortcutParts(): string[] {
      if (!this.modelValue || !this.modelValue.trim()) {
        return []
      }
      return this.modelValue.split('+').map((part: string) => part.trim()).filter(Boolean)
    },
    /**
     * 录制中的提示。取消靠「取消」按钮或点到外面，Esc 本身可以录成快捷键。
     */
    recordingHint(): string {
      return this.previewParts.length ? '继续按主键' : '请按下快捷键'
    }
  },
  /**
   * 监听函数必须固定引用。Vue 3 的 methods 交给 addEventListener 后 this 会丢失，所以在这里包一层。
   */
  created() {
    this.boundKeyDown = (event: KeyboardEvent) => this.onKeyDown(event)
    this.boundOutsideMouseDown = (event: MouseEvent) => this.onOutsideMouseDown(event)
  },
  beforeUnmount() {
    this.stopListening()
  },
  methods: {
    /**
     * 开始录制。点按键区域或铅笔都会进来。
     * 监听挂在 window 上，是因为焦点可能留在按钮上，组合键仍要能收到。
     */
    startRecording() {
      if (this.recording) {
        return
      }
      this.recording = true
      this.previewParts = []
      this.inlineError = ''
      // created 里会先绑好；这里再补一次，避免热更新后引用丢失，按键完全没反应。
      if (!this.boundKeyDown) {
        this.boundKeyDown = (event: KeyboardEvent) => this.onKeyDown(event)
      }
      window.addEventListener('keydown', this.boundKeyDown, true)
      this.$nextTick(() => {
        document.addEventListener('mousedown', this.boundOutsideMouseDown, true)
      })
    },
    /**
     * 取消本次录制，不改已经保存的快捷键。
     */
    cancelRecording() {
      this.stopListening()
      this.recording = false
      this.previewParts = []
    },
    /**
     * 点到控件外面就取消，避免录制状态一直占着键盘。
     */
    onOutsideMouseDown(event: MouseEvent) {
      const root = this.$refs.root as HTMLElement | undefined
      if (root && event.target instanceof Node && root.contains(event.target)) {
        return
      }
      this.cancelRecording()
    },
    /**
     * 收下一次按键。修饰键只更新预览；按下主键后立刻提交。
     * 捕获阶段调用 preventDefault，是为了不让 Esc、Ctrl+S 这些键先触发浏览器或菜单。
     */
    onKeyDown(event: KeyboardEvent) {
      if (!this.recording || event.repeat || event.isComposing) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      if (MODIFIER_CODES.has(event.code)) {
        this.previewParts = modifierParts(event)
        return
      }

      const accelerator = buildAccelerator(event)
      if (!accelerator) {
        this.inlineError = '这个键不能设为快捷键'
        this.previewParts = []
        return
      }

      this.inlineError = ''
      this.stopListening()
      this.recording = false
      this.previewParts = []
      if (accelerator === this.modelValue) {
        return
      }
      this.$emit('update:modelValue', accelerator)
      this.$emit('shortcut-changed', accelerator)
    },
    /**
     * 卸下录制期间的监听。重复调用也安全，避免组件销毁后还在拦截按键。
     */
    stopListening() {
      window.removeEventListener('keydown', this.boundKeyDown, true)
      document.removeEventListener('mousedown', this.boundOutsideMouseDown, true)
    }
  }
}
</script>

<style scoped>
.fun-shortcut-input {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.shortcut-row {
  display: flex;
  align-items: center;
}

.shortcut-recorder {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 4px 8px;
  border: 2px dashed transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-primary);
}

.shortcut-recorder.is-recording {
  border-color: var(--accent-color);
  background: var(--bg-secondary);
  min-width: 180px;
  justify-content: center;
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.2);
}

.recording-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
}

.shortcut-error {
  color: #e53e3e;
  font-size: 0.8rem;
}

.kbd {
  background-color: hsl(0deg, 0%, 99%);
  border-radius: 6px;
  border: 2px solid hsl(0deg, 0%, 80%);
  padding: 6px 8px;
  font-weight: bold;
  font-size: 0.95rem;
  min-width: 25px;
  text-align: center;
  display: inline-block;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #1a202c;
}

.kbd-separator {
  margin: 0 2px;
  font-weight: bold;
  color: hsl(0deg, 0%, 50%);
  background: none;
  border: none;
  padding: 0;
}

.btn-edit-shortcut,
.btn-cancel {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  margin-left: 8px;
  padding: 4px 8px;
  border-radius: 6px;
}

.btn-edit-shortcut {
  font-size: 1.1rem;
}

.btn-edit-shortcut:hover,
.btn-cancel:hover {
  background: var(--hover-bg);
  color: var(--accent-color);
}
</style>
