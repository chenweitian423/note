# 更新日志

本项目使用语义化版本号。后续每次对 GitHub 发布新版本时，都先更新这里，再把对应版本内容复制到 GitHub Release 说明中。

## 0.4.2 - 2026-06-06

- 新增备份 API，可创建、列出并下载最新 ZIP 备份，备份文件保存在 `/data/exports`。
- 新增可选定时自动备份，使用 `AUTO_BACKUP_INTERVAL_HOURS` 开启，并通过 `BACKUP_RETENTION` 控制保留数量。
- 新增附件单文件下载接口，支持通过 curl 直接下载指定附件。
- 补强部署安全提示，明确 `AUTH_SECRET` 需要替换为随机值。

## 0.4.1 - 2026-06-06

- 优化 Dockerfile 为多阶段构建，使用 Next.js standalone 输出运行生产服务，并保留 `sql.js` wasm 运行资产。
- 重排 README 首页入口，让部署、远程操作、版本发布和验证信息更容易在 GitHub 首页找到。
- 新增 GitHub Actions Release 工作流，推送 `v*` tag 后自动用 `CHANGELOG.md` 对应版本小节创建 GitHub Release。

## 0.4.0 - 2026-05-31

- 补齐历史版本记录，作为后续 GitHub Release 说明的来源。
- 新增发布流程文档，明确版本号、更新日志、tag 和 GitHub Release 的同步要求。
- 补强 `curl` 远程操作说明，并在 README 中加入文档入口。

## 0.3.2 - 2026-05-30

- 放宽访问密码策略，允许个人自托管部署使用更灵活的 `APP_PASSWORD`。
- 保留 `AUTH_SECRET` 对 session 和 API Key 加密的强度要求。

## 0.3.1 - 2026-05-30

- 加固登录与 API 请求安全校验。
- 增加登录失败限流，降低暴力尝试风险。
- 对会修改数据的 Web session 请求增加同源校验。
- 增加上传、导入和笔记正文大小限制相关校验。

## 0.3.0 - 2026-05-30

- 新增 `curl` 远程操作说明文档。
- 支持通过 API Key 进行远程 API 访问，适合脚本化备份、上传和查询。
- 支持按笔记编号读取 JSON 或 Markdown 正文，方便远程定位笔记。

## 0.2.0 - 2026-05-28

- 实现个人自托管在线笔记第一版应用。
- 支持密码登录、HTTP-only session、笔记 CRUD、标签、附件、Markdown 编辑与预览。
- 支持 ZIP 导出和导入，导出中同时包含机器可读数据和人工可读 Markdown。
- 增加 Dockerfile、Docker Compose、Vitest 和 Playwright 基础配置。

## 0.1.0 - 2026-05-28

- 建立产品与架构设计文档。
- 明确第一版范围：个人自用、单应用密码、SQLite 持久化、Docker Compose 部署。
- 建立分任务实施计划和默认端口 `31300`。
