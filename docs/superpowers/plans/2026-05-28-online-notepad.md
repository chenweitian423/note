# Online Notepad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个个人自托管在线笔记应用，支持 Markdown 编辑/预览、附件、标签、ZIP 导入导出，并通过 Docker Compose 使用默认宿主机端口 `31300` 部署。

**Architecture:** 使用 Next.js App Router 同时承载 UI 和 API。SQLite 数据库和附件目录放在 `/data` 持久化目录中，API 层通过小型 service 模块访问数据库、鉴权、附件和导入导出逻辑。

**Tech Stack:** Next.js、React、TypeScript、better-sqlite3、zod、jose、archiver、yauzl、vitest、Playwright、Docker Compose。

---

## 文件结构

- `package.json`：脚本和依赖。
- `next.config.ts`：Next.js 配置。
- `tsconfig.json`：TypeScript 配置。
- `vitest.config.ts`：单元测试配置。
- `playwright.config.ts`：浏览器验证配置。
- `.env.example`：部署环境变量示例，默认 `APP_PORT=31300`。
- `Dockerfile`：生产镜像构建。
- `docker-compose.yml`：Compose 部署，端口 `${APP_PORT:-31300}:3000`。
- `src/app/layout.tsx`：全局布局。
- `src/app/page.tsx`：登录后主界面入口。
- `src/app/login/page.tsx`：登录页。
- `src/app/api/*/route.ts`：认证、笔记、标签、附件、导入导出 API。
- `src/components/*`：笔记列表、编辑器、预览、工具栏、标签、附件组件。
- `src/lib/auth.ts`：密码校验、session cookie 签发与验证。
- `src/lib/db.ts`：SQLite 连接和 schema 初始化。
- `src/lib/notes.ts`：笔记、标签、附件数据访问。
- `src/lib/export.ts`：ZIP 导出。
- `src/lib/import.ts`：ZIP 导入。
- `src/lib/paths.ts`：`/data`、上传目录、导出目录路径。
- `src/lib/markdown.ts`：Markdown 渲染配置。
- `src/test/*`：测试辅助函数和临时数据目录。
- `tests/*.test.ts`：API/service 单元测试。
- `tests/e2e/notepad.spec.ts`：浏览器流程测试。

---

### Task 1: 项目脚手架和基础配置

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: 创建项目配置文件**

`package.json` 内容：

```json
{
  "name": "online-notepad",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "archiver": "^7.0.1",
    "better-sqlite3": "^11.9.1",
    "jose": "^5.9.6",
    "lucide-react": "^0.468.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "yauzl": "^3.2.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/archiver": "^6.0.3",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@types/yauzl": "^2.10.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`.env.example` 内容：

```text
APP_PASSWORD=change-me
AUTH_SECRET=replace-with-at-least-32-random-characters
APP_PORT=31300
DATA_DIR=/data
MAX_ATTACHMENT_MB=20
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`

Expected: 创建 `package-lock.json`，依赖安装成功。

- [ ] **Step 3: 运行空项目检查**

Run: `npm run test`

Expected: Vitest 启动并提示没有测试或所有测试通过。若因为没有测试文件退出非零，先继续到 Task 2 后再验证。

- [ ] **Step 4: 提交**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts playwright.config.ts .gitignore .env.example
git commit -m "chore: scaffold next notepad app"
```

---

### Task 2: 数据目录和 SQLite schema

**Files:**
- Create: `src/lib/paths.ts`
- Create: `src/lib/db.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/db.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createTestDb } from "../src/test/create-test-db";

describe("database schema", () => {
  it("creates required tables", () => {
    const db = createTestDb();
    const tables = db
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((row: any) => row.name);

    expect(tables).toContain("notes");
    expect(tables).toContain("tags");
    expect(tables).toContain("note_tags");
    expect(tables).toContain("attachments");
    expect(tables).toContain("settings");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- tests/db.test.ts`

Expected: FAIL，原因是 `src/test/create-test-db` 不存在。

- [ ] **Step 3: 实现路径和数据库初始化**

`src/lib/paths.ts` 提供 `getDataDir()`、`getDbPath()`、`getUploadsDir()`、`ensureDataDirs()`。

`src/lib/db.ts` 提供：

```ts
export function initializeSchema(db: Database.Database): void
export function getDb(): Database.Database
```

schema 必须创建 `notes`、`tags`、`note_tags`、`attachments`、`settings`，并在 `notes.updatedAt`、`tags.name`、`attachments.noteId` 上建立必要索引。

`src/test/create-test-db.ts` 使用内存数据库：

```ts
import Database from "better-sqlite3";
import { initializeSchema } from "../lib/db";

export function createTestDb() {
  const db = new Database(":memory:");
  initializeSchema(db);
  return db;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test -- tests/db.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/paths.ts src/lib/db.ts src/test/create-test-db.ts tests/db.test.ts
git commit -m "feat: add sqlite schema"
```

---

### Task 3: 鉴权和 session

**Files:**
- Create: `src/lib/auth.ts`
- Create: `tests/auth.test.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`

- [ ] **Step 1: 写失败测试**

`tests/auth.test.ts` 覆盖：

```ts
expect(await verifyPassword("secret", "secret")).toBe(true);
expect(await verifyPassword("wrong", "secret")).toBe(false);
const token = await createSessionToken("secret");
await expect(readSessionToken(token, "secret")).resolves.toEqual({ ok: true });
await expect(readSessionToken(token, "other")).resolves.toEqual({ ok: false });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- tests/auth.test.ts`

Expected: FAIL，原因是 `src/lib/auth.ts` 不存在。

- [ ] **Step 3: 实现鉴权模块**

`src/lib/auth.ts` 导出：

```ts
export const SESSION_COOKIE = "notepad_session";
export function getRequiredEnv(name: string): string;
export async function verifyPassword(input: string, expected: string): Promise<boolean>;
export async function createSessionToken(secret: string): Promise<string>;
export async function readSessionToken(token: string, secret: string): Promise<{ ok: boolean }>;
```

使用 `jose` 签发 HMAC JWT，过期时间 7 天。

- [ ] **Step 4: 实现 auth API**

`POST /api/auth/login` 接收 `{ "password": "..." }`，校验 `APP_PASSWORD`，成功后写入 HTTP-only cookie。

`POST /api/auth/logout` 清除 cookie。

`GET /api/auth/me` 返回 `{ "authenticated": true }` 或 401。

- [ ] **Step 5: 运行测试确认通过**

Run: `npm run test -- tests/auth.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add src/lib/auth.ts tests/auth.test.ts src/app/api/auth
git commit -m "feat: add password authentication"
```

---

### Task 4: 笔记、标签和附件数据访问

**Files:**
- Create: `src/lib/notes.ts`
- Create: `tests/notes.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/notes.test.ts` 覆盖：

```ts
const note = createNote(db, { title: "第一篇", content: "# Hello" });
expect(note.title).toBe("第一篇");
updateNote(db, note.id, { content: "updated" });
expect(getNote(db, note.id)?.content).toBe("updated");
const tag = createTag(db, { name: "工作", color: "#2563eb" });
setNoteTags(db, note.id, [tag.id]);
expect(listNotes(db, { query: "Hello" })).toHaveLength(1);
archiveNote(db, note.id);
expect(listNotes(db, { includeArchived: false })).toHaveLength(0);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- tests/notes.test.ts`

Expected: FAIL，原因是 `src/lib/notes.ts` 不存在。

- [ ] **Step 3: 实现数据访问函数**

`src/lib/notes.ts` 导出：

```ts
export function createNote(db, input)
export function getNote(db, id)
export function listNotes(db, filters)
export function updateNote(db, id, patch)
export function archiveNote(db, id)
export function deleteNote(db, id)
export function createTag(db, input)
export function listTags(db)
export function setNoteTags(db, noteId, tagIds)
export function createAttachment(db, input)
export function listAttachments(db, noteId)
```

所有写入都更新 ISO 时间字符串。搜索使用 `title like ? or content like ?`，第一版不引入全文索引。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test -- tests/notes.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/notes.ts tests/notes.test.ts
git commit -m "feat: add note data access"
```

---

### Task 5: 笔记 API

**Files:**
- Create: `src/app/api/notes/route.ts`
- Create: `src/app/api/notes/[id]/route.ts`
- Create: `src/app/api/tags/route.ts`
- Create: `src/lib/require-session.ts`

- [ ] **Step 1: 写 API 约束**

所有 API 先调用 `requireSession()`。未登录返回 401。

`GET /api/notes` 支持 `q` 和 `includeArchived`。

`POST /api/notes` 接收 `{ title, content }`。

`PATCH /api/notes/:id` 接收 `{ title?, content?, tagIds? }`。

`DELETE /api/notes/:id` 软删除为归档。

- [ ] **Step 2: 实现 `requireSession`**

`src/lib/require-session.ts` 从 cookie 读取 `notepad_session` 并调用 `readSessionToken()`，失败时返回 401 helper。

- [ ] **Step 3: 实现 notes 和 tags routes**

使用 zod 校验请求体。错误请求返回 400，未找到返回 404。

- [ ] **Step 4: 手工验证 API**

Run: `npm run dev`

Expected: `POST /api/auth/login` 后可调用 `POST /api/notes` 新建笔记，未登录时返回 401。

- [ ] **Step 5: 提交**

```bash
git add src/app/api/notes src/app/api/tags src/lib/require-session.ts
git commit -m "feat: add notes api"
```

---

### Task 6: ZIP 导出和导入

**Files:**
- Create: `src/lib/export.ts`
- Create: `src/lib/import.ts`
- Create: `tests/export-import.test.ts`
- Create: `src/app/api/export/route.ts`
- Create: `src/app/api/import/route.ts`

- [ ] **Step 1: 写失败测试**

`tests/export-import.test.ts` 覆盖：

```ts
const db = createTestDb();
const note = createNote(db, { title: "迁移测试", content: "# 内容" });
const zip = await exportArchive(db, tempUploadsDir);
expectZipContains(zip, ["manifest.json", "notes.json"]);
const nextDb = createTestDb();
await importArchive(nextDb, tempUploadsDir2, zip);
expect(listNotes(nextDb, {})).toHaveLength(1);
expect(listNotes(nextDb, {})[0].title).toBe("迁移测试");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- tests/export-import.test.ts`

Expected: FAIL，原因是导入导出模块不存在。

- [ ] **Step 3: 实现导出**

`exportArchive(db, uploadsDir)` 返回 ZIP Buffer，结构必须包含：

```text
manifest.json
notes.json
notes/<slug-or-id>.md
attachments/<note-id>/<filename>
```

`manifest.json` 包含 `version: 1`、`exportedAt`、`noteCount`、`attachmentCount`。

- [ ] **Step 4: 实现导入**

`importArchive(db, uploadsDir, zipBuffer)` 校验 `manifest.json` 和 `notes.json`。冲突时生成新 ID 和 slug，不覆盖已有笔记。

- [ ] **Step 5: 实现 API routes**

`GET /api/export` 返回 `application/zip`。

`POST /api/import` 接收 multipart form-data 中的 `file` 字段。

- [ ] **Step 6: 运行测试确认通过**

Run: `npm run test -- tests/export-import.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/lib/export.ts src/lib/import.ts tests/export-import.test.ts src/app/api/export src/app/api/import
git commit -m "feat: add zip export and import"
```

---

### Task 7: 主界面和 Markdown 编辑体验

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/note-shell.tsx`
- Create: `src/components/note-list.tsx`
- Create: `src/components/note-editor.tsx`
- Create: `src/components/note-preview.tsx`
- Create: `src/components/note-toolbar.tsx`
- Create: `src/lib/markdown.ts`

- [ ] **Step 1: 实现登录页**

登录页包含密码输入框和登录按钮。提交到 `/api/auth/login`，成功后跳转 `/`。

- [ ] **Step 2: 实现主界面**

主界面加载 `/api/notes`，展示三栏布局：

```text
左侧：搜索、标签、笔记列表
中间：标题输入、Markdown textarea
右侧：Markdown 预览、附件列表
```

移动端使用 CSS media query 将三栏改成可切换标签页。

- [ ] **Step 3: 实现自动保存**

编辑器在标题或正文变化后 600ms 调用 `PATCH /api/notes/:id`。保存中显示小型状态文本，保存失败显示错误。

- [ ] **Step 4: 实现 Markdown 预览**

`src/lib/markdown.ts` 统一配置 `react-markdown` 和 `remark-gfm`。预览区域支持标题、列表、代码块、表格、链接和图片。

- [ ] **Step 5: 手工验证**

Run: `npm run dev`

Expected: 浏览器打开 `http://localhost:3000`，能登录、新建笔记、输入 Markdown、看到预览并自动保存。

- [ ] **Step 6: 提交**

```bash
git add src/app src/components src/lib/markdown.ts
git commit -m "feat: add notepad interface"
```

---

### Task 8: Docker Compose 部署

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: 创建 Dockerfile**

Dockerfile 使用 Node 22 Alpine，安装依赖，执行 `npm run build`，生产环境运行 `npm run start`。

- [ ] **Step 2: 创建 docker-compose.yml**

必须包含：

```yaml
services:
  notepad:
    build: .
    ports:
      - "${APP_PORT:-31300}:3000"
    environment:
      APP_PASSWORD: ${APP_PASSWORD}
      AUTH_SECRET: ${AUTH_SECRET}
      DATA_DIR: /data
      MAX_ATTACHMENT_MB: ${MAX_ATTACHMENT_MB:-20}
    volumes:
      - notepad-data:/data
    restart: unless-stopped

volumes:
  notepad-data:
```

- [ ] **Step 3: 验证构建**

Run: `docker compose config`

Expected: 输出中包含 `31300:3000`。

Run: `docker compose build`

Expected: 镜像构建成功。

- [ ] **Step 4: 提交**

```bash
git add Dockerfile docker-compose.yml .env.example
git commit -m "chore: add docker compose deployment"
```

---

### Task 9: 端到端验证和收尾

**Files:**
- Create: `tests/e2e/notepad.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: 写 Playwright 测试**

`tests/e2e/notepad.spec.ts` 覆盖：

```ts
test("login, create note, preview markdown, export", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("访问密码").fill("change-me");
  await page.getByRole("button", { name: "登录" }).click();
  await page.getByRole("button", { name: "新建笔记" }).click();
  await page.getByLabel("标题").fill("E2E 笔记");
  await page.getByLabel("正文").fill("# 标题\n\n- 内容");
  await expect(page.getByRole("heading", { name: "标题" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".zip");
});
```

- [ ] **Step 2: 写 README**

README 必须包含：

```text
cp .env.example .env
docker compose up -d --build
open http://localhost:31300
```

并说明导出 ZIP 包含 `manifest.json`、`notes.json`、`notes/`、`attachments/`。

- [ ] **Step 3: 运行完整验证**

Run: `npm run test`

Expected: PASS。

Run: `npm run build`

Expected: PASS。

Run: `docker compose config`

Expected: 端口映射为 `31300:3000`。

- [ ] **Step 4: 提交**

```bash
git add tests/e2e/notepad.spec.ts README.md
git commit -m "test: add end-to-end notepad verification"
```

---

## 自检结果

- 设计文档中的个人自用、Markdown 双模式、ZIP 导入导出、附件、标签、Docker Compose 和默认端口 `31300` 均有对应任务。
- 计划没有保留 TBD/TODO/FIXME 占位内容。
- 后续实现应按任务顺序小步提交，优先让每个 service 模块有测试，再接 UI 和 Docker。
