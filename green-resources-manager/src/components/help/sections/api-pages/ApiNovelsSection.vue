<template>
  <HelpSection 
    :title="$lt('📖 小说管理 API')" 
    :subtitle="$lt('通过 HTTP API 管理小说数据')"
    intro="小说管理 API 提供了完整的 CRUD 操作，允许您通过 HTTP 请求获取、创建、更新和删除小说数据。">
    
    <DetailCard :title="$lt('📥 获取所有小说')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/novels</code>
      </div>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回小说数组') }}</p>
      <CodeBlock :code="CODE.novelsArray" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetAll" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetAll" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📥 获取单个小说')">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/novels/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 小说ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK 返回小说对象，不存在则 404') }}</p>
      <CodeBlock :code="CODE.novelObject" language="json" />
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsGetOne" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyGetOne" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('➕ 创建小说')">
      <div class="api-endpoint">
        <div class="method post">POST</div>
        <code>/api/novels</code>
      </div>
      <p><strong>{{ $lt('请求体：') }}</strong></p>
      <CodeBlock :code="CODE.createBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('201 Created，返回创建的小说对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 会自动生成') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsCreate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyCreate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('✏️ 更新小说')">
      <div class="api-endpoint">
        <div class="method put">PUT</div>
        <code>/api/novels/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 小说ID') }}</p>
      <p><strong>{{ $lt('请求体：') }}</strong>{{ $lt('要更新的字段（JSON 对象，只需传要修改的字段）') }}</p>
      <CodeBlock :code="CODE.updateBody" language="json" />
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('200 OK，返回更新后的小说对象') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('ID 和 addedDate 字段不允许修改') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsUpdate" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyUpdate" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('🗑️ 删除小说')">
      <div class="api-endpoint">
        <div class="method delete">DELETE</div>
        <code>/api/novels/:id</code>
      </div>
      <p><strong>{{ $lt('参数：') }}</strong><code>id</code> {{ $lt('- 小说ID') }}</p>
      <p><strong>{{ $lt('响应：') }}</strong>{{ $lt('204 No Content（成功）或 404 Not Found（不存在）') }}</p>
      <p><strong>{{ $lt('注意：') }}</strong>{{ $lt('删除操作不会删除本地小说文件，仅移除管理器中的引用') }}</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsDelete" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyDelete" language="python" />
    </DetailCard>

    <DetailCard :title="$lt('📊 小说数据字段说明')">
      <p>{{ $lt('小说对象包含以下字段：') }}</p>
      <ul>
        <li><code>id</code> {{ $lt('- 小说唯一标识符（自动生成，不可修改）') }}</li>
        <li><code>resourceType</code> {{ $lt('- 资源类型，固定为 "novel"') }}</li>
        <li><code>name</code> {{ $lt('- 小说名称（必需）') }}</li>
        <li><code>description</code> {{ $lt('- 小说简介') }}</li>
        <li><code>author</code> {{ $lt('- 作者') }}</li>
        <li><code>genre</code> {{ $lt('- 类型（如：科幻、奇幻、言情等）') }}</li>
        <li><code>tags</code> {{ $lt('- 标签数组') }}</li>
        <li><code>resourcePath</code> {{ $lt('- 小说文件路径') }}</li>
        <li><code>coverPath</code> {{ $lt('- 封面图片路径') }}</li>
        <li><code>publishYear</code> {{ $lt('- 出版年份') }}</li>
        <li><code>visitedSessions</code> {{ $lt('- 访问会话时间数组（ISO 字符串数组，记录每次阅读时间）') }}</li>
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
  novelsArray: `[
  {
    "id": "1738368000000abc123",
    "resourceType": "novel",
    "name": "三体",
    "description": "地球往事三部曲第一部，讲述了地球文明和三体文明的信息交流、生死搏杀以及两个文明在宇宙中的兴衰历程。",
    "author": "刘慈欣",
    "genre": "科幻",
    "tags": ["科幻", "硬科幻", "雨果奖"],
    "resourcePath": "E:\\\\Books\\\\三体.epub",
    "coverPath": "E:\\\\Books\\\\Covers\\\\三体.jpg",
    "publishYear": "2008",
    "visitedSessions": [
      "2025-12-01T10:30:00.000Z",
      "2025-12-15T14:20:00.000Z"
    ],
    "addedDate": "2025-11-20T08:00:00.000Z",
    "rating": 5,
    "comment": "非常精彩的硬科幻作品",
    "isFavorite": true
  }
]`,

  novelObject: `{
  "id": "1738368000000abc123",
  "resourceType": "novel",
  "name": "三体",
  "description": "地球往事三部曲第一部，讲述了地球文明和三体文明的信息交流、生死搏杀以及两个文明在宇宙中的兴衰历程。",
  "author": "刘慈欣",
  "genre": "科幻",
  "tags": ["科幻", "硬科幻", "雨果奖"],
  "resourcePath": "E:\\\\Books\\\\三体.epub",
  "coverPath": "E:\\\\Books\\\\Covers\\\\三体.jpg",
  "publishYear": "2008",
  "visitedSessions": [
    "2025-12-01T10:30:00.000Z",
    "2025-12-15T14:20:00.000Z"
  ],
  "addedDate": "2025-11-20T08:00:00.000Z",
  "rating": 5,
  "comment": "非常精彩的硬科幻作品",
  "isFavorite": true
}`,

  createBody: `{
  "name": "三体",
  "description": "地球往事三部曲第一部",
  "author": "刘慈欣",
  "genre": "科幻",
  "tags": ["科幻", "硬科幻", "雨果奖"],
  "resourcePath": "E:\\\\Books\\\\三体.epub",
  "coverPath": "E:\\\\Books\\\\Covers\\\\三体.jpg",
  "publishYear": "2008",
  "rating": 5,
  "comment": "非常精彩的硬科幻作品",
  "isFavorite": true
}`,

  updateBody: `{
  "rating": 5,
  "comment": "重读后更加喜欢了",
  "isFavorite": true
}`,

  errorResponse: `{
  "error": "小说名称不能为空"
}`,

  jsGetAll: `// 获取所有小说
fetch('http://localhost:3000/api/novels')
  .then(response => response.json())
  .then(novels => console.log(novels))
  .catch(error => console.error('Error:', error));`,

  jsGetOne: `// 获取单个小说
const novelId = '1738368000000abc123';
fetch(\`http://localhost:3000/api/novels/\${novelId}\`)
  .then(response => response.json())
  .then(novel => console.log(novel))
  .catch(error => console.error('Error:', error));`,

  jsCreate: `// 创建小说
fetch('http://localhost:3000/api/novels', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '三体',
    description: '地球往事三部曲第一部',
    author: '刘慈欣',
    genre: '科幻',
    tags: ['科幻', '硬科幻', '雨果奖'],
    resourcePath: 'E:\\\\Books\\\\三体.epub',
    rating: 5
  })
})
  .then(response => response.json())
  .then(novel => console.log('Created:', novel))
  .catch(error => console.error('Error:', error));`,

  jsUpdate: `// 更新小说
const novelId = '1738368000000abc123';
fetch(\`http://localhost:3000/api/novels/\${novelId}\`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rating: 5,
    comment: '重读后更加喜欢了'
  })
})
  .then(response => response.json())
  .then(novel => console.log('Updated:', novel))
  .catch(error => console.error('Error:', error));`,

  jsDelete: `// 删除小说
const novelId = '1738368000000abc123';
fetch(\`http://localhost:3000/api/novels/\${novelId}\`, {
  method: 'DELETE'
})
  .then(response => {
    if (response.status === 204) {
      console.log('Novel deleted successfully');
    }
  })
  .catch(error => console.error('Error:', error));`,

  pyGetAll: `import requests

# 获取所有小说
response = requests.get('http://localhost:3000/api/novels')
novels = response.json()
print(novels)`,

  pyGetOne: `import requests

# 获取单个小说
novel_id = '1738368000000abc123'
response = requests.get(f'http://localhost:3000/api/novels/{novel_id}')
novel = response.json()
print(novel)`,

  pyCreate: `import requests

# 创建小说
novel_data = {
    'name': '三体',
    'description': '地球往事三部曲第一部',
    'author': '刘慈欣',
    'genre': '科幻',
    'tags': ['科幻', '硬科幻', '雨果奖'],
    'resourcePath': 'E:\\\\Books\\\\三体.epub',
    'rating': 5
}

response = requests.post('http://localhost:3000/api/novels', json=novel_data)
novel = response.json()
print('Created:', novel)`,

  pyUpdate: `import requests

# 更新小说
novel_id = '1738368000000abc123'
update_data = {
    'rating': 5,
    'comment': '重读后更加喜欢了'
}

response = requests.put(f'http://localhost:3000/api/novels/{novel_id}', json=update_data)
novel = response.json()
print('Updated:', novel)`,

  pyDelete: `import requests

# 删除小说
novel_id = '1738368000000abc123'
response = requests.delete(f'http://localhost:3000/api/novels/{novel_id}')

if response.status_code == 204:
    print('Novel deleted successfully')`
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
