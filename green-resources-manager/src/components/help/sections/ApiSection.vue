<template>
  <HelpSection 
    :title="$lt('🔌 API 手册')" 
    :subtitle="$lt('通过 HTTP API 访问应用数据，支持脚本批处理')"
    intro="应用提供了 RESTful API 接口，允许您通过 HTTP 请求访问和管理应用数据。API 服务器默认运行在 http://127.0.0.1:8765，仅允许本地访问。">
    
    <DetailCard :title="$lt('📡 API 服务器信息')">
      <ul>
        <li><strong>{{ $lt('服务器地址：') }}</strong><code>http://127.0.0.1:8765</code></li>
        <li><strong>{{ $lt('访问限制：') }}</strong>{{ $lt('仅允许本地访问（127.0.0.1）') }}</li>
        <li><strong>{{ $lt('数据格式：') }}</strong>JSON</li>
        <li><strong>{{ $lt('API 风格：') }}</strong>RESTful</li>
      </ul>
    </DetailCard>

  

    <DetailCard :title="$lt('🔒 安全说明')">
      <ul>
        <li>{{ $lt('API 服务器仅监听本地地址（127.0.0.1），外部无法访问') }}</li>
        <li>{{ $lt('所有操作都会直接修改应用数据文件，请谨慎使用') }}</li>
        <li>{{ $lt('建议在批处理脚本中添加错误处理逻辑') }}</li>
        <li>{{ $lt('建议定期备份 SaveData 文件夹') }}</li>
      </ul>
    </DetailCard>
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import DetailCard from '../../DetailCard.vue'
</script>

<style scoped>
.api-endpoint {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.method {
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 60px;
  text-align: center;
}

.method.get {
  background: #10b981;
  color: white;
}

.method.post {
  background: #3b82f6;
  color: white;
}

.method.put {
  background: #f59e0b;
  color: white;
}

.method.delete {
  background: #ef4444;
  color: white;
}

.code-block {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
}

.code-block code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
}

h4 {
  margin: 24px 0 12px 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

h4:first-child {
  margin-top: 0;
}

code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--accent-color);
}
</style>
