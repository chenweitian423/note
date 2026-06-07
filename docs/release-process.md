# 版本发布流程

本项目后续每次更新都应有清晰版本号和更新内容，并同步体现在 GitHub 上。

## 版本号规则

使用语义化版本号：

- `MAJOR`：不兼容的数据结构、部署方式或 API 行为变化。
- `MINOR`：新增功能，兼容已有部署和数据。
- `PATCH`：缺陷修复、安全加固、文档补充或小幅体验优化。

当前项目仍处于个人自托管早期阶段，可以按 `0.x.y` 推进；有稳定迁移策略后再进入 `1.0.0`。

## 每次发布前

1. 修改 `package.json` 的 `version`。
2. 同步修改 `package-lock.json` 根版本号。
3. 在 `CHANGELOG.md` 顶部新增版本条目，写清日期和更新内容。
4. 同步检查并更新所有相关项目文档：`AGENTS.md`、`README.md`、`docs/release-process.md`、设计/计划文档以及受本次变更影响的使用说明。
5. 运行必要验证，例如：

```bash
rtk npm run test
rtk npm run e2e
rtk npm run build
rtk docker compose config
```

Playwright E2E 发布验证固定使用官方镜像 `mcr.microsoft.com/playwright:v1.60.0-noble`。如果本机没有 Node/npm/docker，可按 `AGENTS.md` 约定使用远端 Docker 环境验证。

## 远端固定部署

线上固定配置路径：

```text
/opt/online-notepad/.env
/opt/online-notepad/app
```

发布到远端服务器时使用仓库脚本。运行前先把 `HOST` 设置为你的 SSH 主机别名或地址：

```bash
HOST=your-ssh-host rtk bash scripts/deploy-remote.sh
```

Windows PowerShell 环境可使用：

```powershell
$env:HOST="your-ssh-host"
rtk powershell -ExecutionPolicy Bypass -File scripts/deploy-remote.ps1
```

脚本会把代码同步到 `/opt/online-notepad/app`，排除 `.env`、`node_modules`、`.next` 和测试产物，然后执行 `docker compose -p online-notepad up -d --build` 与 `/api/health` 健康检查。

部署脚本默认会拒绝脏工作区，避免把未提交改动同步到线上。确需临时部署未提交内容时，可以显式设置 `ALLOW_DIRTY_DEPLOY=1` 后再运行部署命令。

## GitHub 发布说明

推送 `v*` tag 后，`.github/workflows/release.yml` 会自动创建 GitHub Release。Release 正文来自 `CHANGELOG.md` 中对应版本的小节内容。

发布 tag 名称使用 `v` 前缀，例如：

```bash
rtk git tag v0.4.4
rtk git push origin v0.4.4
```

如果需要手动创建 GitHub Release，正文也直接使用 `CHANGELOG.md` 中对应版本的小节内容。建议格式：

```text
## 更新内容

- ...

## 验证

- rtk npm run test
- rtk npm run e2e
- rtk npm run build
- rtk docker compose config
```
