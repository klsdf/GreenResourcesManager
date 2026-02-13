<template>
  <HelpSection
    title="🎮 游戏管理 API"
    subtitle="通过 HTTP API 管理游戏数据"
    intro="游戏的CRUD操作。">


    <DetailCard title="📥 获取游戏信息">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/games</code>
      </div>
      <p><strong>参数：</strong><br/>
        &nbsp;&nbsp;<code>name</code> - 游戏名称（可选）<br/>
        &nbsp;&nbsp;<code>developer</code> - 开发商（可选）<br/>
        &nbsp;&nbsp;<code>publisher</code> - 发行商（可选）<br/>
        备注：不传参数即可查询所有游戏
      </p>
      <p><strong>响应：</strong>200 OK，返回游戏数组。例如：</p>
      <CodeBlock :code="CODE.gamesArray" language="json" />
      <p class="code-label">JavaScript代码示例</p>
      <CodeBlock :code="CODE.jsGetAll" language="javascript" />
      <p class="code-label">Python代码示例</p>
      <CodeBlock :code="CODE.pyGetAll" language="python" />
    </DetailCard>

    <DetailCard title="📥 获取单个游戏">
      <div class="api-endpoint">
        <div class="method get">GET</div>
        <code>/api/games/:id</code>
      </div>
      <p><strong>参数：</strong><code>id</code> - 游戏ID</p>
      <p><strong>响应：</strong>200 OK 返回游戏对象，不存在则 404。例如：</p>
      <CodeBlock :code="CODE.gameObject" language="json" />
      <p class="code-label">JavaScript代码示例</p>
      <CodeBlock :code="CODE.jsGetOne" language="javascript" />
      <p class="code-label">Python代码示例</p>
      <CodeBlock :code="CODE.pyGetOne" language="python" />
    </DetailCard>

    <DetailCard title="➕ 创建游戏">
      <div class="api-endpoint">
        <div class="method post">POST</div>
        <code>/api/games</code>
      </div>
      <p><strong>请求体：</strong></p>
      <CodeBlock :code="CODE.createBody" language="json" />
      <p><strong>响应：</strong>201 Created，返回创建的游戏对象。例如：</p>
      <p><strong>注意：</strong>ID 和 addedDate 会自动生成</p>
      <p class="code-label">JavaScript代码示例</p>
      <CodeBlock :code="CODE.jsCreate" language="javascript" />
      <p class="code-label">Python代码示例</p>
      <CodeBlock :code="CODE.pyCreate" language="python" />
    </DetailCard>

    <DetailCard title="✏️ 更新游戏">
      <div class="api-endpoint">
        <div class="method put">PUT</div>
        <code>/api/games/:id</code>
      </div>
      <p><strong>参数：</strong><code>id</code> - 游戏ID</p>
      <p><strong>请求体：</strong>要更新的字段（JSON 对象，只需传要修改的字段）</p>
      <CodeBlock :code="CODE.updateBody" language="json" />
      <p><strong>响应：</strong>200 OK，返回更新后的游戏对象。例如：</p>
      <p><strong>注意：</strong>ID 和 addedDate 字段不允许修改</p>
      <p class="code-label">JavaScript代码示例</p>
      <CodeBlock :code="CODE.jsUpdate" language="javascript" />
      <p class="code-label">Python代码示例</p>
      <CodeBlock :code="CODE.pyUpdate" language="python" />
    </DetailCard>

    <DetailCard title="🗑️ 删除游戏">
      <div class="api-endpoint">
        <div class="method delete">DELETE</div>
        <code>/api/games/:id</code>
      </div>
      <p><strong>参数：</strong><code>id</code> - 游戏ID</p>
      <p><strong>响应：</strong>204 No Content（成功）或 404 Not Found（不存在）</p>
      <p><strong>注意：</strong>删除操作不会删除本地游戏文件，仅移除管理器中的引用</p>
      <p class="code-label">JavaScript</p>
      <CodeBlock :code="CODE.jsDelete" language="javascript" />
      <p class="code-label">Python</p>
      <CodeBlock :code="CODE.pyDelete" language="python" />
    </DetailCard>

    <DetailCard title="📊 游戏数据字段说明">
      <p>游戏对象包含以下字段：</p>
      <ul>
        <li><code>id</code> - 游戏唯一标识符（自动生成，不可修改）</li>
        <li><code>resourceType</code> - 资源类型，固定为 "game"</li>
        <li><code>name</code> - 游戏名称（必需）</li>
        <li><code>nickname</code> - 游戏昵称</li>
        <li><code>nameZh</code> - 中文名</li>
        <li><code>nameEn</code> - 英文名</li>
        <li><code>nameJa</code> - 日文名</li>
        <li><code>description</code> - 游戏描述</li>
        <li><code>developers</code> - 开发商数组（注意是数组）</li>
        <li><code>publisher</code> - 发行商</li>
        <li><code>tags</code> - 标签数组</li>
        <li><code>engine</code> - 游戏引擎</li>
        <li><code>resourcePath</code> - 游戏可执行文件路径</li>
        <li><code>coverPath</code> - 封面图片路径</li>
        <li><code>playTime</code> - 游戏时长（秒）</li>
        <li><code>playCount</code> - 运行次数</li>
        <li><code>visitedSessions</code> - 访问会话时间数组（ISO 字符串数组，记录每次启动时间）</li>
        <li><code>addedDate</code> - 添加日期（自动生成，不可修改）</li>
        <li><code>rating</code> - 评分（1-5 或 null）</li>
        <li><code>comment</code> - 备注</li>
        <li><code>isFavorite</code> - 是否收藏</li>
      </ul>
    </DetailCard>

    <DetailCard title="⚠️ 错误处理">
      <p>API 使用标准的 HTTP 状态码：</p>
      <ul>
        <li><strong>200 OK：</strong>请求成功</li>
        <li><strong>201 Created：</strong>资源创建成功</li>
        <li><strong>204 No Content：</strong>删除成功（无响应体）</li>
        <li><strong>400 Bad Request：</strong>请求参数错误（如缺少必需字段）</li>
        <li><strong>404 Not Found：</strong>资源不存在</li>
        <li><strong>500 Internal Server Error：</strong>服务器内部错误</li>
      </ul>
      <p>错误响应格式：</p>
      <CodeBlock :code="CODE.errorResponse" language="json" />
    </DetailCard>

  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../../HelpSection.vue'
import DetailCard from '../../../DetailCard.vue'
import CodeBlock from '../../../CodeBlock.vue'

const CODE = {
  gamesArray: `{
    "status": 200,
    "msg": "success",
    "total": 1,
    "data": [
      {
        "id": "1767042792152n1yc9qrf3",
        "resourceType": "game",
        "name": "游戏名称",
        "nickname": "",
        "nameZh": "",
        "nameEn": "",
        "nameJa": "",
        "description": "游戏描述",
        "developers": ["开发商1", "开发商2"],
        "publisher": "发行商",
        "tags": ["标签1", "标签2"],
        "engine": "RPGMaker",
        "coverPath": "C:/Games/Screenshots/cover.png",
        "resourcePath": "C:/Games/GameFolder/game.exe",
        "playTime": 3600,
        "playCount": 10,
        "visitedSessions": [
          "2025-12-29T22:05:34.528Z",
          "2026-01-21T08:53:13.157Z"
        ],
        "addedDate": "2025-12-29T21:13:12.152Z",
        "rating": 5,
        "comment": "好玩",
        "isFavorite": true
      }
    ]
  }`,
  gameObject: `{
  "id": "1767042792152n1yc9qrf3",
  "resourceType": "game",
  "name": "游戏名称",
  "nickname": "",
  "nameZh": "",
  "nameEn": "",
  "nameJa": "",
  "description": "游戏描述",
  "developers": ["开发商1", "开发商2"],
  "publisher": "发行商",
  "tags": ["标签1", "标签2"],
  "engine": "RPGMaker",
  "coverPath": "C:/Games/Screenshots/cover.png",
  "resourcePath": "C:/Games/GameFolder/game.exe",
  "playTime": 3600,
  "playCount": 10,
  "visitedSessions": [
    "2025-12-29T22:05:34.528Z",
    "2026-01-21T08:53:13.157Z"
  ],
  "addedDate": "2025-12-29T21:13:12.152Z",
  "rating": 5,
  "comment": "好玩",
  "isFavorite": true
}`,
  createBody: `{
  "name": "游戏名称",
  "nickname": "",
  "nameZh": "",
  "nameEn": "",
  "nameJa": "",
  "description": "游戏描述",
  "developers": ["开发商"],
  "publisher": "发行商",
  "tags": ["标签1", "标签2"],
  "engine": "RPGMaker",
  "coverPath": "C:/Games/Screenshots/cover.png",
  "resourcePath": "C:/Games/GameFolder/game.exe",
  "playTime": 0,
  "playCount": 0,
  "visitedSessions": [],
  "rating": null,
  "comment": "",
  "isFavorite": false
}`,
  updateBody: `{
  "name": "更新后的游戏名",
  "description": "更新后的描述",
  "rating": 5,
  "tags": ["新标签1", "新标签2"],
  "isFavorite": true
}`,
  errorResponse: `{
  "error": "错误信息"
}`,
  jsGetAll: `const params = new URLSearchParams({'name': '游戏名称'}) // 按需添加查询条件，条件为空时查询所有游戏
const res = await fetch(\`http://127.0.0.1:8765/api/games?\${params}\`)
const games = await res.json()`,
  jsGetOne: `const res = await fetch('http://127.0.0.1:8765/api/games/1234567890abc')
const game = await res.json()`,
  jsCreate: `const res = await fetch('http://127.0.0.1:8765/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '新游戏',
    developers: ['开发商'],
    resourcePath: 'C:/Games/game.exe'
  })
})
const createdGame = await res.json()`,
  jsUpdate: `const res = await fetch('http://127.0.0.1:8765/api/games/1234567890abc', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '更新后的游戏名' })
})
const updatedGame = await res.json()`,
  jsDelete: `await fetch('http://127.0.0.1:8765/api/games/1234567890abc', { method: 'DELETE' })
// 成功返回 204，无响应体`,
  pyGetAll: `import requests
params = {'name': '游戏名称'} # 按需添加查询条件，条件为空时查询所有游戏
response = requests.get('http://127.0.0.1:8765/api/games', params=params)
games = response.json()`,
  pyGetOne: `import requests
response = requests.get('http://127.0.0.1:8765/api/games/1234567890abc')
game = response.json()`,
  pyCreate: `import requests
new_game = {
    'name': '新游戏',
    'developers': ['开发商'],
    'resourcePath': 'C:/Games/game.exe'
}
response = requests.post('http://127.0.0.1:8765/api/games', json=new_game)
created_game = response.json()`,
  pyUpdate: `import requests
update_data = {'name': '更新后的游戏名'}
response = requests.put('http://127.0.0.1:8765/api/games/1234567890abc', json=update_data)
updated_game = response.json()`,
  pyDelete: `import requests
response = requests.delete('http://127.0.0.1:8765/api/games/1234567890abc')
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
