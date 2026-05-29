# 在线笔记

个人自托管 Markdown 在线笔记，支持附件、标签、自动保存，以及 ZIP 导入导出迁移。

## Docker 部署

```bash
cp .env.example .env
docker compose up -d --build
open http://localhost:31300
```

默认宿主机端口是 `31300`，可通过 `.env` 中的 `APP_PORT` 修改。

## 环境变量

```text
APP_PASSWORD=replace-with-a-long-random-password
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
