<template>
  <HelpSection 
    :title="$lt('📚 漫画管理 API')" 
    :subtitle="$lt('通过 HTTP API 管理漫画数据')"
    intro="漫画管理 API 提供了完整的 CRUD 操作，允许您通过 HTTP 请求获取、创建、更新和删除漫画数据。">
    
    <DetailCard :title="$lt('📥 获取所有漫画')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/manga</code>
      </div>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回漫画数组') }}</p>
      <CodeBlock :code="CODE.mangaArray" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetAll" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetAll" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📥 获取单个漫画')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/manga/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 漫画ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK 返回漫画对象，不存在则 404') }}</p>
      <CodeBlock :code="CODE.mangaObject" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetOne" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetOne" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('➕ 创建漫画')">
      <div class="api-endpoint">
        <div class="method post">POST</div>
        <code>/api/manga</code>
      </div>
      <p><strong>{{ $lt('请求体：') }}</strong></p>
      <CodeBlock :code="CODE.createBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('201 Created，返回创建的漫画对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 会自动生成') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsCreate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyCreate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('✏️ 更新漫画')">
      <div class="api-endpoint">
        <div class="method put">PUT</div>
        <code>/api/manga/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 漫画ID') }}</p>
      <p><strong>{{ $lt('请求体：') }}</strong>{{ $lt('要更新的字段（JSON 对象，只需传要修改的字段）') }}</p>
      <CodeBlock :code="CODE.updateBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回更新后的漫画对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 字段不允许修改') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsUpdate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyUpdate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('🗑️ 删除漫画')">
      <div class="api-endpoint">
        <div class="method delete">DELETE</div>
        <code>/api/manga/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 漫画ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('204 No Content（成功）或 404 Not Found（不存在）') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('删除操作不会删除本地漫画文件，仅移除管理器中的引用') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsDelete" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyDelete" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📊 漫画数据字段说明')">
      <p>{{ $lt('漫画对象包含以下字段：') }}</p>
      <ul>
        <li><code>id</code> {{ $lt('- 漫画唯一标识符（自动生成，不可修改）') }}</li>
        <li><code>resourceType</code> {{ $lt('- 资源类型，固定为 "manga"') }}</li>
        <li><code>name</code> {{ $lt('- 漫画名称（必需）') }}</li>
        <li><code>description</code> {{ $lt('- 漫画描述') }}</li>
        <li><code>author</code> {{ $lt('- 作者') }}</li>
        <li><code>tags</code> {{ $lt('- 标签数组') }}</li>
        <li><code>resourcePath</code> {{ $lt('- 漫画文件夹路径') }}</li>
        <li><code>coverPath</code> {{ $lt('- 封面图片路径') }}</li>
        <li><code>visitedSessions</code> {{ $lt('- 访问会话时间数组（ISO 字符串数组，记录每次查看时间）') }}</li>
        <li><code>addedDate</code> {{ $lt('- 添加日期（自动生成，不可修改）') }}</li>
        <li><code>rating</code> {{ $lt('- 评分（1-5 或 0）') }}</li>
        <li><code>comment</code> {{ $lt('- 备注') }}</li>
        <li><code>isFavorite</code> {{ $lt('- 是否收藏') }}</li>
      </ul>
    </DetailCard>

    <DetailCard :title="$lt('⚠️ 错误处理')">
      <p>{{ $lt('API 使用标准的 HTTP 状态码：') }}</p>
      <ul>
        <li><strong>200 OK：</strong>{{ $lt('请求成功') }}</li>
        <li><strong>201 Created：</strong>{{ $lt('资源创建成功') }}</li>
        <li><strong>204 No Content：</strong>{{ $lt('删除成功（无响应体）') }}</li>
        <li><strong>400 Bad Request：</strong>{{ $lt('请求参数错误（如缺少必需字段）') }}</li>
        <li><strong>404 Not Found：</strong>{{ $lt('资源不存在') }}</li>
        <li><strong>500 Internal Server Error：</strong>{{ $lt('服务器内部错误') }}</li>
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
  mangaArray: `[
  {
    "id": "1767042792152n1yc9qrf3",
    "resourceType": "manga",
    "name": "漫画名称",
    "description": "漫画描述",
    "author": "作者名",
    "tags": ["标签1", "标签2"],
    "resourcePath": "C:/Manga/MangaFolder",
    "coverPath": "C:/Manga/Covers/cover.jpg",
    "visitedSessions": [
      "2025-12-29T22:05:34.528Z",
      "2026-01-21T08:53:13.157Z"
    ],
    "addedDate": "2025-12-29T21:13:12.152Z",
    "rating": 5,
    "comment": "很好看",
    "isFavorite": true
  }
]`,
  mangaObject: `{
  "id": "1767042792152n1yc9qrf3",
  "resourceType": "manga",
  "name": "漫画名称",
  "description": "漫画描述",
  "author": "作者名",
  "tags": ["标签1", "标签2"],
  "resourcePath": "C:/Manga/MangaFolder",
  "coverPath": "C:/Manga/Covers/cover.jpg",
  "visitedSessions": [
    "2025-12-29T22:05:34.528Z",
    "2026-01-21T08:53:13.157Z"
  ],
  "addedDate": "2025-12-29T21:13:12.152Z",
  "rating": 5,
  "comment": "很好看",
  "isFavorite": true
}`,
  createBody: `{
  "name": "漫画名称",
  "description": "漫画描述",
  "author": "作者名",
  "tags": ["标签1", "标签2"],
  "resourcePath": "C:/Manga/MangaFolder",
  "coverPath": "C:/Manga/Covers/cover.jpg",
  "visitedSessions": [],
  "rating": 0,
  "comment": "",
  "isFavorite": false
}`,
  updateBody: `{
  "name": "更新后的漫画名",
  "description": "更新后的描述",
  "rating": 5,
  "tags": ["新标签1", "新标签2"],
  "isFavorite": true
}`,
  errorResponse: `{
  "error": "错误信息"
}`,
  jsGetAll: `const res = await fetch('http://127.0.0.1:8765/api/manga')
const manga = await res.json()`,
  jsGetOne: `const res = await fetch('http://127.0.0.1:8765/api/manga/1234567890abc')
const manga = await res.json()`,
  jsCreate: `const res = await fetch('http://127.0.0.1:8765/api/manga', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '新漫画',
    author: '作者名',
    resourcePath: 'C:/Manga/NewManga'
  })
})
const createdManga = await res.json()`,
  jsUpdate: `const res = await fetch('http://127.0.0.1:8765/api/manga/1234567890abc', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '更新后的漫画名' })
})
const updatedManga = await res.json()`,
  jsDelete: `await fetch('http://127.0.0.1:8765/api/manga/1234567890abc', { method: 'DELETE' })
// 成功返回 204，无响应体`,
  pyGetAll: `import requests
response = requests.get('http://127.0.0.1:8765/api/manga')
manga = response.json()`,
  pyGetOne: `import requests
response = requests.get('http://127.0.0.1:8765/api/manga/1234567890abc')
manga = response.json()`,
  pyCreate: `import requests
new_manga = {
    'name': '新漫画',
    'author': '作者名',
    'resourcePath': 'C:/Manga/NewManga'
}
response = requests.post('http://127.0.0.1:8765/api/manga', json=new_manga)
created_manga = response.json()`,
  pyUpdate: `import requests
update_data = {'name': '更新后的漫画名'}
response = requests.put('http://127.0.0.1:8765/api/manga/1234567890abc', json=update_data)
updated_manga = response.json()`,
  pyDelete: `import requests
response = requests.delete('http://127.0.0.1:8765/api/manga/1234567890abc')
# 成功返回 204，无响应体`
}
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

h4 {
  margin: 24px 0 12px 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

h4:first-child {
  margin-top: 0;
}

.code-label {
  margin: 16px 0 4px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
}

.code-label:first-of-type {
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
