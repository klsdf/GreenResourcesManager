<template>
  <!--
    这一页整段都不走 $t。
    语言切换是给看不懂当前界面的人用的，如果按钮也跟着当前语言翻译，他们就没法判断该点哪一个。
  -->
  <div class="settings-section">
    <div class="language-list" role="radiogroup">
      <label
        v-for="option in languageOptions"
        :key="option.value"
        class="language-option"
        :class="{ active: currentLanguage === option.value }"
      >
        <input
          class="language-radio"
          type="radio"
          name="app-language"
          :value="option.value"
          :checked="currentLanguage === option.value"
          @change="onLanguageChange(option.value)"
        />
        <span class="language-prompt">{{ option.prompt }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { setLanguage, getCurrentLanguage, availableLanguages } from '../../locales'
import type { AppLanguageOption } from '../../locales'
import notify from '../../utils/NotificationService'
import { useI18n } from 'vue-i18n'

export default {
  name: 'LanguageSettings',
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data() {
    return {
      /** 当前选中的语言代码，用来点亮对应的单选按钮 */
      currentLanguage: getCurrentLanguage(),
      /**
       * 单选列表。prompt 是各语言写死的句子，不从语言包读取。
       */
      languageOptions: availableLanguages as AppLanguageOption[]
    }
  },
  methods: {
    /**
     * 切换界面语言。
     * 按钮文案保持不变，其余界面会立刻换成新语言。
     * @param lang 被点中的语言代码
     */
    onLanguageChange(lang: string) {
      setLanguage(lang)
      this.currentLanguage = lang
      notify.toast('success', this.t('messages.saveSuccess'), this.t('settings.language.description'))
    }
  }
}
</script>

<style scoped>
.settings-section {
  padding: 30px;
}

.language-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 640px;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.language-option:hover {
  border-color: var(--accent-color);
}

.language-option.active {
  border-color: var(--accent-color);
  background: var(--primary-bg);
}

.language-radio {
  width: 18px;
  height: 18px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.language-prompt {
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.5;
}
</style>
