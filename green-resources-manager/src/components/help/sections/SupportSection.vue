<template>
  <HelpSection 
    :title="$lt('💬 客服群&问题反馈')" 
    :subtitle="$lt('有问题？找我们！')">
    <DetailCard :title="$lt('🎯 加入客服群')">
      <p>{{ $lt('如果您在使用过程中遇到任何问题，或者有任何建议和反馈，欢迎加入我们的客服群！') }}</p>
      <div class="support-group-card">
        <div class="group-info">
          <h3>{{ $lt('QQ客服群') }}</h3>
          <p class="group-description">{{ $lt('在这里您可以：') }}</p>
          <ul>
            <li>{{ $lt('反馈使用中遇到的问题') }}</li>
            <li>{{ $lt('提出功能建议和改进意见') }}</li>
            <li>{{ $lt('与其他用户交流使用心得') }}</li>
            <li>{{ $lt('获取最新的更新信息') }}</li>
          </ul>
          <div class="group-link-container">
            <div @click="openExternalLink('https://qm.qq.com/q/qD9za7lqOQ')" class="group-link-button">
              <span class="link-icon">💬</span>
              <span class="link-text">{{ $lt('点击加入客服群') }}</span>
            </div>
          </div>
          <p class="group-link-text">{{ $lt('或复制链接：') }}<span @click="copyToClipboard('https://qm.qq.com/q/qD9za7lqOQ')" class="copy-link">https://qm.qq.com/q/qD9za7lqOQ</span></p>
        </div>
      </div>
    </DetailCard>

    <DetailCard :title="$lt('📧 问题反馈渠道')">
      <div class="contact-methods">
        <div class="contact-method">
          <span class="contact-icon">🐙</span>
          <div class="contact-details">
            <h4>GitHub Issues</h4>
            <p>{{ $lt('如果您发现 bug 或有技术问题，可以在 GitHub Issues 中反馈') }}</p>
            <span @click="openExternalLink(GITHUB_REPO.issuesUrl)" class="external-link">
              {{ GITHUB_REPO.issuesUrl }}
            </span>
          </div>
        </div>
        <div class="contact-method">
          <span class="contact-icon">📝</span>
          <div class="contact-details">
            <h4>{{ $lt('腾讯文档问题反馈') }}</h4>
            <p>{{ $lt('您也可以通过腾讯文档提交问题反馈和建议') }}</p>
            <span @click="openExternalLink('https://docs.qq.com/sheet/DQmNVemhqc2dMV3d1?tab=h2pjf7')" class="external-link"> {{ $lt('点击打开问题反馈表格') }} </span>
          </div>
        </div>
      </div>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
import { useHelpUtils } from '../../../composables/useHelpUtils'
import { GITHUB_REPO } from '../../../utils/constants'

const { openExternalLink, copyToClipboard } = useHelpUtils()
</script>

