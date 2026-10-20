<template>
  <HelpSection 
    :title="$lt('🌐 网站管理 API')" 
    :subtitle="$lt('通过 HTTP API 管理网站书签数据')"
    intro="网站管理 API 提供了完整的 CRUD 操作，允许您通过 HTTP 请求获取、创建、更新和删除网站书签数据。">
    
    <DetailCard :title="$lt('📥 获取所有网站')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/websites</code>
      </div>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回网站数组') }}</p>
      <CodeBlock :code="CODE.websitesArray" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetAll" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetAll" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📥 获取单个网站')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/websites/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 网站ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK 返回网站对象，不存在则 404') }}</p>
      <CodeBlock :code="CODE.websiteObject" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetOne" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetOne" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('➕ 创建网站')">
      <div class="api-endpoint">
        <div class="method post">POST</div>
        <code>/api/websites</code>
      </div>
      <p><strong>{{ $lt('请求体：') }}</strong></p>
      <CodeBlock :code="CODE.createBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('201 Created，返回创建的网站对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 会自动生成') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsCreate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyCreate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('✏️ 更新网站')">
      <div class="api-endpoint">
        <div class="method put">PUT</div>
        <code>/api/websites/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 网站ID') }}</p>
      <p><strong>{{ $lt('请求体：') }}</strong>{{ $lt('要更新的字段（JSON 对象，只需传要修改的字段）') }}</p>
      <CodeBlock :code="CODE.updateBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回更新后的网站对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 字段不允许修改') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsUpdate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyUpdate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('🗑️ 删除网站')">
      <div class="api-endpoint">
        <div class="method delete">DELETE</div>
        <code>/api/websites/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 网站ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('204 No Content（成功）或 404 Not Found（不存在）') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('删除操作仅移除管理器中的网站书签') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsDelete" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyDelete" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📊 网站数据字段说明')">
      <p>{{ $lt('网站对象包含以下字段：') }}</p>
      <ul>
        <li><code>id</code> {{ $lt('- 网站唯一标识符（自动生成，不可修改）') }}</li>
        <li><code>resourceType</code> {{ $lt('- 资源类型，固定为 "website"') }}</li>
        <li><code>name</code> {{ $lt('- 网站名称（必需）') }}</li>
        <li><code>description</code> {{ $lt('- 网站描述') }}</li>
        <li><code>resourcePath</code> {{ $lt('- 网站URL地址') }}</li>
        <li><code>tags</code> {{ $lt('- 标签数组') }}</li>
        <li><code>visitedSessions</code> {{ $lt('- 访问会话时间数组（ISO 字符串数组，记录每次访问时间）') }}</li>
        <li><code>addedDate</code> {{ $lt('- 添加日期（自动生成，不可修改）') }}</li>
        <li><code>rating</code> {{ $lt('- 评分（1-5 或 0）') }}</li>
        <li><code>comment</code> {{ $lt('- 备注') }}</li>
        <li><code>isFavorite</code> {{ $lt('- 是否收藏') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('⚠️ 错误处理')">
      <p>{{ $lt('API 使用标准的 HTTP 状态码：') }}</p>
      <ul>
        <li><code>200 OK</code> {{ $lt('- 请求成功') }}</li>
        <li><code>201 Created</code> {{ $lt('- 资源创建成功') }}</li>
        <li><code>204 No Content</code> {{ $lt('- 删除成功') }}</li>
        <li><code>400 Bad Request</code> {{ $lt('- 请求参数错误（如缺少必需字段）') }}</li>
        <li><code>404 Not Found</code> {{ $lt('- 资源不存在') }}</li>
        <li><code>500 Internal Server Error</code> {{ $lt('- 服务器内部错误') }}</li>
      </ul>
      <p>{{ $lt('错误响应格式：') }}</p>
      <CodeBlock :code="CODE.errorResponse" language="json" />
    </DetailCard>

  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../../HelpSection.vue'
import DetailCard from '../../../DetailCard.vue'
import CodeBlock from '../../../CodeBlock.vue'

const CODE = {
  websitesArray: `[
  {
    "id": "1738368000000xyz789",
    "resourceType": "website",
    "name": "GitHub",
    "description": "全球最大的代码托管平台",
    "resourcePath": "https://github.com",
    "tags": ["开发", "代码", "开源"],
    "visitedSessions": [
      "2026-01-15T09:00:00.000Z",
      "2026-01-20T14:30:00.000Z",
      "2026-01-25T16:45:00.000Z"
    ],
    "addedDate": "2026-01-10T08:00:00.000Z",
    "rating": 5,
    "comment": "每天都要用",
    "isFavorite": true
  }
]`,

  websiteObject: `{
  "id": "1738368000000xyz789",
  "resourceType": "website",
  "name": "GitHub",
  "description": "全球最大的代码托管平台",
  "resourcePath": "https://github.com",
  "tags": ["开发", "代码", "开源"],
  "visitedSessions": [
    "2026-01-15T09:00:00.000Z",
    "2026-01-20T14:30:00.000Z",
    "2026-01-25T16:45:00.000Z"
  ],
  "addedDate": "2026-01-10T08:00:00.000Z",
  "rating": 5,
  "comment": "每天都要用",
  "isFavorite": true
}`,

  createBody: `{
  "name": "GitHub",
  "description": "全球最大的代码托管平台",
  "resourcePath": "https://github.com",
  "tags": ["开发", "代码", "开源"],
  "rating": 5,
  "comment": "每天都要用",
  "isFavorite": true
}`,

  updateBody: `{
  "description": "全球最大的代码托管和协作平台",
  "tags": ["开发", "代码", "开源", "协作"],
  "rating": 5
}`,

  errorResponse: `{
  "error": "网站名称不能为空"
}`,

  jsGetAll: `// 获取所有网站
fetch('http://localhost:3000/api/websites')
  .then(response => response.json())
  .then(websites => console.log(websites))
  .catch(error => console.error('Error:', error));`,

  jsGetOne: `// 获取单个网站
const websiteId = '1738368000000xyz789';
fetch(\`http://localhost:3000/api/websites/\${websiteId}\`)
  .then(response => response.json())
  .then(website => console.log(website))
  .catch(error => console.error('Error:', error));`,

  jsCreate: `// 创建网站
fetch('http://localhost:3000/api/websites', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'GitHub',
    description: '全球最大的代码托管平台',
    resourcePath: 'https://github.com',
    tags: ['开发', '代码', '开源'],
    rating: 5
  })
})
  .then(response => response.json())
  .then(website => console.log('Created:', website))
  .catch(error => console.error('Error:', error));`,

  jsUpdate: `// 更新网站
const websiteId = '1738368000000xyz789';
fetch(\`http://localhost:3000/api/websites/\${websiteId}\`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    description: '全球最大的代码托管和协作平台',
    tags: ['开发', '代码', '开源', '协作']
  })
})
  .then(response => response.json())
  .then(website => console.log('Updated:', website))
  .catch(error => console.error('Error:', error));`,

  jsDelete: `// 删除网站
const websiteId = '1738368000000xyz789';
fetch(\`http://localhost:3000/api/websites/\${websiteId}\`, {
  method: 'DELETE'
})
  .then(response => {
    if (response.status === 204) {
      console.log('Website deleted successfully');
    }
  })
  .catch(error => console.error('Error:', error));`,

  pyGetAll: `import requests

# 获取所有网站
response = requests.get('http://localhost:3000/api/websites')
websites = response.json()
print(websites)`,

  pyGetOne: `import requests

# 获取单个网站
website_id = '1738368000000xyz789'
response = requests.get(f'http://localhost:3000/api/websites/{website_id}')
website = response.json()
print(website)`,

  pyCreate: `import requests

# 创建网站
website_data = {
    'name': 'GitHub',
    'description': '全球最大的代码托管平台',
    'resourcePath': 'https://github.com',
    'tags': ['开发', '代码', '开源'],
    'rating': 5
}

response = requests.post('http://localhost:3000/api/websites', json=website_data)
website = response.json()
print('Created:', website)`,

  pyUpdate: `import requests

# 更新网站
website_id = '1738368000000xyz789'
update_data = {
    'description': '全球最大的代码托管和协作平台',
    'tags': ['开发', '代码', '开源', '协作']
}

response = requests.put(f'http://localhost:3000/api/websites/{website_id}', json=update_data)
website = response.json()
print('Updated:', website)`,

  pyDelete: `import requests

# 删除网站
website_id = '1738368000000xyz789'
response = requests.delete(f'http://localhost:3000/api/websites/{website_id}')

if response.status_code == 204:
    print('Website deleted successfully')`
}
</script>

<style scoped>
.api-endpoint {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  padding: 12px;
  background: var(--bg-secondary, #2a2a2a);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.method {
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.method.get {
  background: #61affe;
  color: white;
}

.method.post {
  background: #49cc90;
  color: white;
}

.method.put {
  background: #fca130;
  color: white;
}

.method.delete {
  background: #f93e3e;
  color: white;
}

.code-label {
  margin-top: 16px;
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--text-primary, #e8e8e8);
}

ul {
  margin: 12px 0;
  padding-left: 24px;
}

li {
  margin: 6px 0;
  line-height: 1.6;
}

code {
  background: var(--bg-tertiary, #1e1e1e);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}
</style>
