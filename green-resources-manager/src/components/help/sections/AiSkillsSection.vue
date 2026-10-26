<template>
  <HelpSection
    title="AI Skills"
    subtitle="给协助修改这个项目的 AI 看的说明"
    intro="每条都是一份 skill。简介只说明它管什么，具体步骤在对应文件夹的 SKILL.md 里。"
  >
    <section v-for="group in skillGroups" :key="group.id" class="skill-group">
      <h2>{{ group.title }}</h2>
      <ul class="skill-list">
        <li v-for="skill in group.skills" :key="skill.id" class="skill-item">
          <div class="skill-text">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-summary">{{ skill.summary }}</span>
          </div>
          <button type="button" class="skill-open" @click="openSkillFolder(skill.id)">打开文件夹</button>
        </li>
      </ul>
    </section>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import notify from '../../../utils/NotificationService.ts'

/** 帮助页上的一组 skill。 */
interface SkillGroup {
  /** 分组标识 */
  id: string
  /** 分组标题 */
  title: string
  /** 这一组里的 skill */
  skills: SkillEntry[]
}

/** 列表里的一条 skill。id 对应 ai-handbook 下的文件夹名。 */
interface SkillEntry {
  /** 文件夹名，也是打开按钮要传给主进程的名字 */
  id: string
  /** 显示名称 */
  name: string
  /** 一行介绍 */
  summary: string
}

/** 帮助页展示的 skill。新增一份 skill 时在这里加一行。 */
const skillGroups: SkillGroup[] = [
  {
    id: 'save',
    title: '本地存档',
    skills: [
      {
        id: 'update-local-save',
        name: '升级本地存档',
        summary: '把旧 JSON 或没有 jsonData 列的旧表，收成当前的 SQLite 存档。'
      },
      {
        id: 'edit-local-save',
        name: '读写当前存档',
        summary: '退出应用后怎么读 database.db、改一条资源、增删页面索引，以及封面和标签怎么处理。'
      },
      {
        id: 'save-schema',
        name: '存档结构',
        summary: '当前有哪些表，jsonData 里各类资源有哪些字段。'
      }
    ]
  },
  {
    id: 'api',
    title: 'API',
    skills: [
      {
        id: 'http-api',
        name: '本地 HTTP API',
        summary: '通过 http://127.0.0.1:8765 对游戏、漫画、视频、小说、网站、音频和软件做增删改查。'
      }
    ]
  },
  {
    id: 'workshop',
    title: '创意工坊',
    skills: [
      {
        id: 'workshop-pages',
        name: '自定义页面',
        summary: '从模板复制一页资源名单，并改它接受什么文件、显示哪些字段。'
      },
      {
        id: 'workshop-plugin',
        name: '自定义插件',
        summary: '在 mods 里写插件，登记侧边栏入口。便笺和日期管理是两个可以直接照着改的例子。'
      }
    ]
  }
]

/**
 * 用系统文件管理器打开这一份 skill 的文件夹。
 * @param skillId ai-handbook 下的目录名
 */
async function openSkillFolder(skillId: string) {
  if (!window.electronAPI?.openAiHandbook) {
    notify.toast('error', '打不开文件夹', '当前环境不能打开文件夹')
    return
  }
  const result = await window.electronAPI.openAiHandbook(skillId)
  if (!result?.success) {
    notify.toast('error', '打不开文件夹', result?.error || '文件夹不存在')
  }
}
</script>

<style scoped>
.skill-group {
  margin-bottom: 28px;
}

.skill-group h2 {
  margin: 0 0 12px;
  font-size: 1.15rem;
  color: var(--text-primary);
}

.skill-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.skill-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-name {
  font-weight: 650;
  color: var(--text-primary);
}

.skill-summary {
  color: var(--text-secondary);
  line-height: 1.5;
}

.skill-open {
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--accent-color, #4a90e2);
  color: #fff;
  cursor: pointer;
}

.skill-open:hover {
  filter: brightness(1.05);
}
</style>
