# 在线笔记

个人自托管 Markdown 在线笔记，支持附件、标签、自动保存，以及 ZIP 导入导出迁移。

## 快速入口

- 当前版本：`0.4.5`
- 更新日志：[CHANGELOG.md](./CHANGELOG.md)
- 发布流程：[docs/release-process.md](./docs/release-process.md)
- curl 远程操作：[docs/curl-api-usage.md](./docs/curl-api-usage.md)
- 恢复与迁移：[docs/restore-and-migration.md](./docs/restore-and-migration.md)
- 默认访问地址：`http://localhost:31300`

## Docker 部署

```bash
cp .env.example .env
# 修改 .env，至少替换 APP_PASSWORD 和 AUTH_SECRET
docker compose up -d --build
open http://localhost:31300
```

默认宿主机端口是 `31300`，可通过 `.env` 中的 `APP_PORT` 修改。镜像使用 Next.js standalone 输出构建，运行层只包含生产启动所需文件。

## 远程操作

远程脚本、备份、自动上传笔记等场景可使用 API Key 和 `curl` 操作，完整示例见 [docs/curl-api-usage.md](./docs/curl-api-usage.md)。

## 备份

应用支持手动和可选定时备份。备份文件保存到 `/data/exports`，格式与迁移导出的 ZIP 一致。

- 网页入口：点击左上角数据库图标打开备份管理。
- 手动创建：`POST /api/backups`
- 列出备份：`GET /api/backups`
- 下载最新备份：`GET /api/backups/latest`
- 下载指定备份：`GET /api/backups/<filename>`
- 定时备份：设置 `AUTO_BACKUP_INTERVAL_HOURS` 为大于 `0` 的小时数。
- 保留数量：通过 `BACKUP_RETENTION` 设置，默认保留最近 `10` 份。

恢复和迁移步骤见 [docs/restore-and-migration.md](./docs/restore-and-migration.md)。

## 版本发布

每次发布都应同步更新版本号和更新内容：

- 仓库内记录：更新 [CHANGELOG.md](./CHANGELOG.md)。
- 版本 tag：使用 `v` 前缀，例如 `v0.4.4`。
- GitHub Release：推送 `v*` tag 后由 GitHub Actions 自动创建，正文来自 `CHANGELOG.md` 对应版本小节。

手动发布细节见 [docs/release-process.md](./docs/release-process.md)。

## 本地验证

```bash
npm run test
npm run build
docker compose config
```

## 健康检查

```bash
curl http://localhost:31300/api/health
```

健康检查会返回版本、检查时间，以及 `/data`、`/data/uploads`、`/data/exports` 是否可写。

## 环境变量

```text
APP_PASSWORD=ReplaceMe
AUTH_SECRET=replace-with-at-least-32-random-characters
APP_PORT=31300
DATA_DIR=/data
MAX_ATTACHMENT_MB=20
MAX_IMPORT_ZIP_MB=50
MAX_NOTE_CONTENT_BYTES=1048576
SECURE_COOKIES=false
BACKUP_RETENTION=10
AUTO_BACKUP_INTERVAL_HOURS=0
```

`AUTH_SECRET` 必须换成随机值，不要使用示例占位内容。可用下面命令生成：

```bash
openssl rand -hex 32
```

## 导出格式

导出的 ZIP 包含：

```text
manifest.json
notes.json
notes/
attachments/
```

`notes/` 下是可直接阅读的 Markdown 文件，`notes.json` 保留完整结构，便于再次导入本应用。
