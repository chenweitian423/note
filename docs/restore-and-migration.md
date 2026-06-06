# 恢复与迁移说明

这份文档用于在服务器故障、误操作或迁移到新服务器时恢复在线笔记数据。

## 备份位置

应用备份保存在持久化数据目录：

```text
/data/exports/
```

Docker Compose 默认使用名为 `online-notepad_notepad-data` 的 volume。可以在服务器上查看备份文件：

```bash
docker exec online-notepad-notepad-1 ls -lh /data/exports
```

也可以通过 API 下载最新备份：

```bash
curl -L \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/backups/latest" \
  -o latest-online-notepad-backup.zip
```

下载指定备份：

```bash
curl -L \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/backups/online-notepad-backup-2026-06-06T09-21-24-556Z.zip" \
  -o online-notepad-backup.zip
```

## 从 ZIP 恢复

1. 部署新应用并配置 `.env`。
2. 打开网页登录，或准备 API Key。
3. 上传备份 ZIP 到导入接口：

```bash
curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./latest-online-notepad-backup.zip" \
  "$BASE/api/import"
```

导入不会覆盖已有笔记；如果 ID 或 slug 冲突，会生成新的 ID 和唯一 slug。

## 迁移到新服务器

1. 在旧服务器创建备份：

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/backups"
```

2. 下载最新备份：

```bash
curl -L \
  -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/backups/latest" \
  -o latest-online-notepad-backup.zip
```

3. 在新服务器部署应用：

```bash
cp .env.example .env
# 修改 APP_PASSWORD 和 AUTH_SECRET
docker compose up -d --build
```

4. 登录新服务，创建 API Key，上传 ZIP 到 `/api/import`。

## 回滚代码部署

如果代码更新后需要回滚，可以使用部署前保留的目录备份，例如：

```bash
cd /opt
docker compose -f /opt/online-notepad/docker-compose.yml down
mv /opt/online-notepad /opt/online-notepad-broken
cp -a /opt/online-notepad-backup-20260606-v043 /opt/online-notepad
cd /opt/online-notepad
docker compose up -d --build
```

注意：这只回滚代码目录，不会回滚 Docker volume 中的数据。需要回滚数据时，请先使用备份 ZIP 导入到新的空数据目录，确认无误后再切换服务。
