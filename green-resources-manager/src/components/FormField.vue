<!-- 表单输入框 -->
<template>
  <div class="form-group">
    <label v-if="label">{{ $lt(label) }}</label>
    <input
      v-if="type === 'text' || type === 'email' || type === 'password' || type === 'number'"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="$lt(placeholder)"
      :class="inputClass"
      :readonly="readonly"
      :disabled="disabled"
    >
    <textarea
      v-else-if="type === 'textarea'"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :placeholder="$lt(placeholder)"
      :class="inputClass"
      :rows="rows"
      :readonly="readonly"
      :disabled="disabled"
    ></textarea>
    <select
      v-else-if="type === 'select'"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
      :class="inputClass"
      :disabled="disabled"
    >
      <option v-if="placeholder" value="" disabled>{{ $lt(placeholder) }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <div v-else-if="type === 'file'" class="file-input-group">
      <input
        type="text"
        :value="modelValue"
        :placeholder="$lt(placeholder)"
        :class="inputClass"
        readonly
      >
      <button class="btn-browse" @click="$emit('browse')">{{ $lt('浏览') }}</button>
    </div>
    <div v-else-if="type === 'multiselect'" class="multiselect-container">
      <div class="multiselect-display">
        <span
          v-for="(selectedId, index) in modelValue"
          :key="index"
          class="multiselect-item"
        >
          {{ getOptionLabel(selectedId) }}
          <button
            type="button"
            class="multiselect-remove"
            @click="removeSelection(index)"
          >×</button>
        </span>
      </div>
      <select
        @change="addSelection"
        :class="inputClass"
        :disabled="disabled"
      >
        <option value="" disabled>{{ $lt(placeholder) }}</option>
        <option
          v-for="option in availableOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <div v-else-if="type === 'tags'" class="tags-input-container">
      <div class="tags-display">
        <fun-tag
          v-for="(tag, index) in modelValue"
          :key="index"
          :text="tag"
          closable
          @close="$emit('removeTag', index)"
        />
      </div>
      <input
        type="text"
        :value="tagInput"
        @input="$emit('update:tagInput', $event.target.value)"
        @focus="$emit('tagInputFocus')"
        @blur="$emit('tagInputBlur')"
        @keydown.enter.prevent="$emit('addTag')"
        @keydown.comma.prevent="$emit('addTag')"
        :placeholder="$lt(tagPlaceholder)"
        class="tag-input"
      >
    </div>
  </div>
</template>

<script>
export default {
  name: 'FormField',
  props: {
    modelValue: {
      type: [String, Number, Array],
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'email', 'password', 'number', 'textarea', 'select', 'file', 'tags', 'multiselect'].includes(value)
    },
    placeholder: {
      type: String,
      default: ''
    },
    rows: {
      type: Number,
      default: 3
    },
    readonly: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    options: {
      type: Array,
      default: () => []
    },
    tagInput: {
      type: String,
      default: ''
    },
    tagPlaceholder: {
      type: String,
      default: '输入标签后按回车或逗号添加'
    },
    inputClass: {
      type: String,
      default: 'form-input'
    }
  },
  emits: [
    'update:modelValue',
    'update:tagInput',
    'addTag',
    'removeTag',
    'browse',
    'change',
    'tagInputFocus',
    'tagInputBlur'
  ],
  computed: {
    availableOptions() {
      if (!this.options) return []
      return this.options.filter(option => !this.modelValue.includes(option.value))
    }
  },
  methods: {
    getOptionLabel(value) {
      const option = this.options.find(opt => opt.value === value)
      return option ? option.label : value
    },
    addSelection(event) {
      const value = event.target.value
      if (value && !this.modelValue.includes(value)) {
        const newValue = [...this.modelValue, value]
        this.$emit('update:modelValue', newValue)
        this.$emit('change', newValue)
        event.target.value = '' // 重置选择框
      }
    },
    removeSelection(index) {
      const newValue = [...this.modelValue]
      newValue.splice(index, 1)
      this.$emit('update:modelValue', newValue)
      this.$emit('change', newValue)
    }
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea,
select ,
.tags-input-container {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus,
.form-textarea:focus,
select:focus,
.tags-input-container:focus-within {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled,
.form-textarea:disabled,
select:disabled {
  background-color: #f9fafb;
  color: #333436;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 2.5rem;
}

.file-input-group {
  display: flex;
  gap: 0.5rem;
}

.file-path-input {
  flex: 1;
}

.btn-browse {
  padding: 10px 16px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  min-width: 80px;
  transition: background-color 0.3s ease-in-out;
}

.btn-browse:hover {
  background-color: var(--accent-hover);
}

/* { */
  /* border: px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  background-color: white;
} */

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}


.tag-input {
  border: none;
  outline: none;
  width: 100%;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  background: transparent;
}

.tag-input::placeholder {
  color: var(--text-primary);
}

/* Multiselect styles */
.multiselect-container {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.multiselect-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.multiselect-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem;
  min-height: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.multiselect-item {
  display: inline-flex;
  align-items: center;
  background-color: var(--accent-color);
  color: #ffffff;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  gap: 0.25rem;
  transition: background-color 0.3s ease;
}

.multiselect-remove {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  padding: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.multiselect-remove:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.multiselect-container select {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}
</style>
