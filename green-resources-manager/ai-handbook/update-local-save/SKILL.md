---
name: update-local-save
description: 把 GreenResourcesManager 的旧本地存档改成当前 SQLite 格式。在升级存档、迁移旧 JSON、或资源表还没有 jsonData 列时使用。
---

# 升级本地存档

先退出应用。复制 `database.db` 再改。已经有 `jsonData` 列的表不要再迁。

## 找到库

- 默认：工作目录下的 `SaveData/database.db`
- 工作目录有 `save-location.json`，且 `saveDataPath` 指向仍存在的目录时，库在 `<saveDataPath>/SaveData/database.db`

用 `PRAGMA table_info(games);` 判断。有 `jsonData` 就是当前格式。有表但没有这一列，走旧 SQLite。没有库、只有按类型分开的 JSON，走旧 JSON。

## 旧 JSON

文件不存在就跳过。内容是对象时，取里面第一个数组。

| 文件 | 表 | 页面索引 |
| --- | --- | --- |
| `Game/games.json` | `games` | `games_page` |
| `Software/software.json` | `software` | `software_page` |
| `Image/images.json` | `manga` | `images_page` |
| `SingleImage/singleImage.json` | `singleImage` | `single_image_page` |
| `Video/videos.json` | `video` | `videos_page` |
| `AnimeSeries/folders.json` | `videoFolder` | `anime_series_page` |
| `Audio/audios.json` | `audio` | `audio_page` |
| `Website/websites.json` | `website` | `websites_page` |
| `Novel/novels.json` | `novel` | `novels_page` |

改名后再写入：`executablePath`、`folderPath`、`filePath`、`url` 改为 `resourcePath`。`cover` 改为 `coverPath`。音频的 `thumbnail` 改为 `coverPath`。视频和视频文件夹继续用 `thumbnail`。新字段已有值时保留新值，再删旧键。

没有 `visitedSessions` 时：游戏用 `firstPlayed`、`lastPlayed` 按这个顺序组成数组，然后删掉这两个键。其他资源用 `lastViewed`、`lastPlayed`、`lastVisited`、`lastWatched`、`lastRead` 里第一个有值的时间组成一项数组，并删掉对应的旧次数和时间字段。

同一 `id` 已在表里就覆盖 `jsonData`，不要再插一行。

## 旧 SQLite

把一行收成对象。`developers`、`tags`、`visitedSessions`、`actors`、`voiceActors`、`productionTeam` 若是 JSON 字符串，先解析成数组。`isFavorite` 的 `1` 和 `0` 改成 `true` 和 `false`。再按上一节改字段名。

建临时表 `(id TEXT PRIMARY KEY, jsonData TEXT NOT NULL, timestamp TEXT, version TEXT)`，写入后删除旧表并把临时表改回原名。

## 写入

```sql
INSERT OR REPLACE INTO "games" (id, jsonData, timestamp, version) VALUES (?, ?, ?, ?);
```

页面索引的 `resourceType` 写物理表名，`resourceId` 写资源 `id`。索引自己的 `id` 另取。字段含义见 [../save-schema/SKILL.md](../save-schema/SKILL.md)。

改过标签后执行：

```sql
DELETE FROM tag_index_meta WHERE key = 'version';
```

下次启动会按 `jsonData` 重建标签索引。
