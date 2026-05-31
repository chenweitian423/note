# 在线笔记

个人自托管 Markdown 在线笔记，支持附件、标签、自动保存，以及 ZIP 导入导出迁移。

## 当前版本

当前版本：`0.4.0`

每次发布都应同步更新版本号和更新内容：

- 仓库内记录：见 [CHANGELOG.md](./CHANGELOG.md)。
- GitHub 发布说明：以 `CHANGELOG.md` 中对应版本内容为准，发布步骤见 [docs/release-process.md](./docs/release-process.md)。

## Docker 部署

```bash
cp .env.example .env
docker compose up -d --build
open http://localhost:31300
```

默认宿主机端口是 `31300`，可通过 `.env` 中的 `APP_PORT` 修改。

远程脚本、备份、自动上传笔记等场景可使用 API Key 和 `curl` 操作，完整示例见 [docs/curl-api-usage.md](./docs/curl-api-usage.md)。

## 环境变量

```text
APP_PASSWORD=ReplaceMe
AUTH_SECRET=replace-with-at-least-32-random-characters
APP_PORT=31300
DATA_DIR=/data
MAX_ATTACHMENT_MB=20
MAX_IMPORT_ZIP_MB=50
MAX_NOTE_CONTENT_BYTES=1048576
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
