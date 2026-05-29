# 在线笔记设计文档

日期：2026-05-28

## 目标

开发一个个人自托管在线笔记程序，功能上参考 `jocksliu/web-notepad-enhanced`，但默认部署方式更安全，Markdown 编辑体验更舒服，并且把导出迁移作为一等功能。

第一版面向个人自用，不包含公开注册、多用户协作、公开分享链接或实时协同编辑。

## 选定方案

采用单个 Next.js 应用，使用 SQLite 持久化数据，并通过 Docker Compose 部署。

这样可以把前端页面、API 路由、鉴权、Markdown 预览、附件处理、导入导出流程都放在同一个仓库中。SQLite 保持部署简单，Docker volume 让数据持久化和迁移更可控。

## 部署方式

应用通过 Docker Compose 启动。

容器内部监听 `3000` 端口。宿主机默认使用非常规大端口 `31300`，降低和本机已有服务冲突的概率：

```yaml
ports:
  - "${APP_PORT:-31300}:3000"
```

需要的环境变量：

```text
APP_PASSWORD=replace-with-a-long-random-password
AUTH_SECRET=replace-with-at-least-32-random-characters
APP_PORT=31300
```

持久化数据放在挂载的数据卷中：

```text
/data/app.db
/data/uploads/
/data/exports/
```

迁移方式有两种：复制 Docker volume，或使用应用内置的 ZIP 导出功能。

## 产品范围

应用登录后直接进入笔记工作区，不做营销落地页。第一版优先保证快速记录、简单整理、可靠自动保存和方便迁移。

核心功能：

- 个人访问密码登录。
- 新建、重命名、编辑、删除、归档笔记。
- Markdown 编辑和预览。
- 输入后自动保存，使用 debounce 减少请求频率。
- 按标题和正文全文搜索。
- 使用标签整理笔记。
- 每篇笔记可上传附件。
- 一键导出所有笔记和附件为 ZIP。
- 导入之前由本应用导出的 ZIP。
- 基础主题偏好设置。

第一版不做：

- 公开账号注册。
- 多用户系统。
- 公开笔记分享。
- 协同编辑。
- 端到端加密。
- 笔记版本历史。

## 用户界面

桌面端使用三栏工作区：

- 左侧：笔记列表、搜索、标签筛选、新建笔记入口。
- 中间：Markdown 编辑器。
- 右侧：预览和笔记详情。

移动端使用标签页在列表、编辑器、预览之间切换。

工具栏尽量使用图标按钮，包括新建、导出、导入、上传附件、切换预览、切换主题等操作。应用的第一屏就是可用的笔记界面，而不是介绍页面。

编辑器默认使用 Markdown。可以提供一个小型格式工具栏，用于插入标题、粗体、列表、链接和图片引用等常用 Markdown 片段。

## 数据模型

SQLite 表设计：

```text
notes
  id
  title
  slug
  content
  createdAt
  updatedAt
  archivedAt

tags
  id
  name
  color

note_tags
  noteId
  tagId

attachments
  id
  noteId
  filename
  storedName
  mimeType
  size
  createdAt

settings
  key
  value
```

附件归属于笔记。标签通过关联表实现，这样一篇笔记可以拥有多个标签。

## 鉴权

第一版使用 `APP_PASSWORD` 配置一个应用级访问密码。

登录成功后，服务端设置一个使用 `AUTH_SECRET` 签名的 HTTP-only session cookie。所有 API 路由都要求有效 session。这个设计刻意保持简单，因为当前产品范围是个人自用。

## 导出格式

导出功能生成 ZIP，同时包含机器可读和人工可读的内容：

```text
manifest.json
notes.json
notes/
  my-note.md
attachments/
  <note-id>/
    image.png
```

`manifest.json` 记录导出格式版本、应用版本、导出时间、笔记数量、附件数量和附件映射关系。

`notes.json` 保留完整笔记结构，包括标签和附件引用。

`notes/` 下的 Markdown 文件保证即使脱离本应用，也能直接阅读和迁移笔记内容。

## 导入行为

导入功能接受本应用导出的 ZIP 文件。

导入流程会先校验 `manifest.json`，再读取 `notes.json`，随后复制附件到上传目录，并把笔记写入 SQLite。

如果导入内容中的 ID 或 slug 和现有笔记冲突，应用会生成新的 ID 和唯一 slug。第一版导入不会覆盖已有笔记。

## 错误处理

重要失败场景需要返回清晰提示：

- 密码错误。
- session 缺失或无效。
- 自动保存失败。
- 附件过大或文件类型不支持。
- 导出 ZIP 无效。
- 导入冲突或导入过程部分失败。

导入时如果校验失败，应避免留下孤立附件文件。

## 测试与验证

第一版至少验证：

- 鉴权 API。
- 笔记 CRUD API。
- 标签创建和绑定。
- 附件上传和元数据持久化。
- ZIP 导出的目录结构和必要文件。
- 在空数据库中导入 ZIP。
- 在已有数据的数据库中冲突安全地导入 ZIP。
- Docker Compose 使用默认宿主机端口 `31300` 成功启动。
- 浏览器中完成登录、新建笔记、编辑 Markdown、预览和导出的基础流程。

## 已确认决策

当前设计已确认：个人自用、ZIP 导出、Markdown 编辑加预览、Docker Compose 默认宿主机端口 `31300`。
