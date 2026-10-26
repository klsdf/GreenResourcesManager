---
name: edit-local-save
description: 读取和修改 GreenResourcesManager 当前版本的本地存档。在直接改 database.db、增删资源、改封面路径或标签时使用。
---

# 读写当前存档

先退出应用。复制 `database.db` 再改。资源正文只放在 `jsonData`，不要拆回多列。已有资源的 `id` 不要改。不要写入 `folderVideos`。

库的位置和表结构见 [../save-schema/SKILL.md](../save-schema/SKILL.md)。

## 读取

```sql
SELECT id, jsonData, timestamp, version FROM games WHERE id = ?;
```

`jsonData` 是这条资源的 JSON 字符串。某一页的顺序以 `*_page` 为准，再用 `resourceId` 去资源表取正文。

## 修改已有资源

读出对象，改完整段写回。`id` 列和 JSON 里的 `id` 保持一致。`timestamp` 写成当前 ISO 时间。不认识的键保留，不要删。

```sql
UPDATE games SET jsonData = ?, timestamp = ? WHERE id = ?;
```

## 新增

资源表插入一行，再往目标页面索引插入一行。索引的 `resourceType` 用物理表名，`resourceId` 用资源 `id`。索引自己的 `id` 另取。

## 删除

先删页面索引里对应的 `resourceId`。别的页面还引用这条资源时，资源表留着。确定没有任何页面再用，再删资源表那一行。

## 标签和封面

改了 `tags`、`developers`、`publisher`、`author`、`actors`、`voiceActors`、`productionTeam` 之后：

```sql
DELETE FROM tag_index_meta WHERE key = 'version';
```

封面路径相对于 `SaveData`，用正斜杠。游戏封面放 `Game/Covers/`，截图放 `Game/Screenshots/`。漫画 `Image/Covers/`，电影 `Video/Covers/`，番剧 `AnimeSeries/Covers/`，小说 `Novel/Covers/`，音频 `Audio/Covers/`，网站 `Website/Covers/`，软件 `Software/Covers/`，单图 `SingleImage/Covers/`，其他 `Other/Covers/`。不要再写 `games/covers`、`images/covers`、`videos/covers`。
