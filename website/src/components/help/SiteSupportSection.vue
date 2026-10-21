<template>
  <HelpSection
    :title="$lt('💬 客服群 & 问题反馈')"
    :subtitle="$lt('有问题？来找仓鼠娘玩！')"
  >
    <DetailCard :title="$lt('🎯 加入交流群')">
      <p>{{ $lt('如果您在使用过程中遇到任何问题，或者有任何建议和反馈，欢迎加入我们的 QQ 群！') }}</p>
      <div class="support-group-card">
        <div class="group-info">
          <h3>{{ $lt('QQ 群') }}</h3>
          <p class="group-description">{{ $lt('在这里您可以：') }}</p>
          <ul>
            <li>{{ $lt('反馈使用中遇到的问题') }}</li>
            <li>{{ $lt('提出功能建议和改进意见') }}</li>
            <li>{{ $lt('与其他用户交流使用心得') }}</li>
            <li>{{ $lt('获取最新的更新信息') }}</li>
          </ul>
          <div class="group-link-container">
            <div @click="openExternalLink('https://qm.qq.com/q/HgPf1nA4UK')" class="group-link-button">
              <span class="link-icon">💬</span>
              <span class="link-text">{{ $lt('加入 853149421 群') }}</span>
            </div>
          </div>
          <p class="group-link-text">1098139167 {{ $lt('（另一个窝，同样欢迎来玩）') }}</p>
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
            <span @click="openExternalLink('https://docs.qq.com/sheet/DQmNVemhqc2dMV3d1?tab=h2pjf7')" class="external-link">
              {{ $lt('点击打开问题反馈表格') }}
            </span>
          </div>
        </div>
      </div>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../../../../green-resources-manager/src/components/help/HelpSection.vue'
import DetailCard from '../../../../green-resources-manager/src/components/DetailCard.vue'
import { useHelpUtils } from '../../../../green-resources-manager/src/composables/useHelpUtils'
import { GITHUB_REPO } from '../../../../green-resources-manager/src/utils/constants'

const { openExternalLink } = useHelpUtils()
</script>
