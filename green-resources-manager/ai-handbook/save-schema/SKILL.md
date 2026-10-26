---
name: save-schema
description: 说明 GreenResourcesManager 当前本地存档的 SQLite 结构和 jsonData 字段。在读存档、写存档、或核对资源字段名时使用。
---

# 当前存档结构

库文件是 `SaveData/database.db`。工作目录的 `save-location.json` 若给出仍存在的 `saveDataPath`，库在 `<saveDataPath>/SaveData/database.db`。

## 资源表

`games`、`software`、`manga`、`singleImage`、`video`、`videoFolder`、`novel`、`audio`、`website`、`other` 都是：

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  jsonData TEXT NOT NULL,
  timestamp TEXT,
  version TEXT
);
```

`jsonData` 就是资源对象，不要再套一层。音频文件夹没有单独的表，写在 `audio` 里，`resourcePath` 指向文件夹。

## 页面索引

只记录这一页按什么顺序显示哪些资源。`resourceType` 是物理表名。页面 id 里的 `-` 换成 `_`。

```sql
CREATE TABLE games_page (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL,
  resourceId TEXT NOT NULL
);
```

漫画页 id 是 `images`，索引表是 `images_page`，资源在 `manga`。番剧页 id 是 `anime-series`，索引表是 `anime_series_page`，资源在 `videoFolder`。单图页 id 是 `single-image`，索引表是 `single_image_page`。

## 其他表

- `settings`、`user`：同样是 `id + jsonData + timestamp + version`，`id` 固定为 `main`
- `achievements`：`achievementId`、`unlocked`（0 或 1）、`unlockTime`
- `pages`：页面本身的 `id`、`name`、`description`、`icon`、`addedDate`、`updatedDate`，不存资源
- `tag_refs`、`tag_meta`：由资源 JSON 推出。`tag_index_meta` 的 `version` 现在是 `1`

## jsonData 公共字段

`id`、`fingerprint`、`resourceType`、`name`、`description`、`tags`（字符串数组）、`resourcePath`、`visitedSessions`（ISO 时间数组，从早到晚）、`addedDate`、`rating`、`comment`、`isFavorite`、`finished`、`finishedAt`。`finished` 为 false 时 `finishedAt` 是空字符串。

`lastPlayed`、`firstPlayed`、`lastViewed`、`lastRead` 不入库。

## 各表额外字段

- `games`：`resourceType` 为 `game`。另有 `nickname`、`nameZh`、`nameEn`、`nameJa`、`developers`、`publisher`、`engine`、`coverPath`、`folderSize`、`playTime`、`playCount`。路径字段是 `resourcePath`
- `software`：`nickname`、`developer`（字符串）、`coverPath`、`folderSize`、`playTime`、`playCount`
- `manga`：`author`（数组）、`coverPath`、`pagesCount`
- `video`：`resourceType` 多为 `movie`。另有 `series`、`actors`、`releaseDate`、`thumbnail`、`duration`
- `videoFolder`：`resourceType` 多为 `animation`。另有 `series`、`actors`、`voiceActors`、`productionTeam`、`thumbnail`、`videoThumbnails`、`videoCount`。`videoThumbnails` 的键是文件夹内视频的相对路径（正斜杠），值是那一集封面的相对路径
- `novel`：`author`（字符串）、`genre`、`coverPath`、`publishYear`、`totalWords`、`readProgress`（0 到 100）、`readTime`（分钟）
- `audio`：`artist`、`actors`、`coverPath`、`duration`
- `website`：`resourcePath` 存网址

页面后来加上、类里还没有的字段会直接出现在 `jsonData` 里。写回去时保留这些键。
