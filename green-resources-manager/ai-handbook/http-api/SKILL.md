---
name: http-api
description: 通过 GreenResourcesManager 的本地 HTTP API 增删改查资源。在调用 127.0.0.1:8765、写批处理脚本，或提到游戏、漫画、视频、小说、网站、音频、软件接口时使用。
---

# 本地 HTTP API

服务地址是 `http://127.0.0.1:8765`，只给本机用。请求和响应都是 JSON。删除资源只去掉管理器里的记录，不删磁盘上的文件。`id` 和 `addedDate` 由服务生成，更新时不要改这两个字段。

## 路径

每类资源都是同一套：

- `GET /api/<资源>` 列出。游戏还可以带 `name`、`developer`、`publisher`
- `GET /api/<资源>/:id` 读一条。没有则 404
- `POST /api/<资源>` 新建，成功是 201
- `PUT /api/<资源>/:id` 只传要改的字段，成功是 200
- `DELETE /api/<资源>/:id` 成功是 204

`<资源>` 用这些名字：`games`、`manga`、`videos`、`novels`、`websites`、`audio`、`software`。

字段和存档里的 `jsonData` 相同，见 [../save-schema/SKILL.md](../save-schema/SKILL.md)。

## 示例

```javascript
const res = await fetch('http://127.0.0.1:8765/api/games')
const games = await res.json()
```

```python
import requests
games = requests.get('http://127.0.0.1:8765/api/games').json()
```

状态码：200 成功，201 已创建，204 已删除，400 参数不对，404 不存在，500 服务内部错误。
