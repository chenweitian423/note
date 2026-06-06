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
4. 运行必要验证，例如：

```bash
rtk npm run test
rtk npm run build
rtk docker compose config
```

如果本机没有 Node/npm/docker，可按 `AGENTS.md` 约定使用远端 `sky195` 环境验证。

## GitHub 发布说明

推送 `v*` tag 后，`.github/workflows/release.yml` 会自动创建 GitHub Release。Release 正文来自 `CHANGELOG.md` 中对应版本的小节内容。

发布 tag 名称使用 `v` 前缀，例如：

```bash
rtk git tag v0.4.2
rtk git push origin v0.4.2
```

如果需要手动创建 GitHub Release，正文也直接使用 `CHANGELOG.md` 中对应版本的小节内容。建议格式：

```text
## 更新内容

- ...

## 验证

- rtk npm run test
- rtk npm run build
- rtk docker compose config
```
