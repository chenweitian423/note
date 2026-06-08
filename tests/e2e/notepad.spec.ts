import { expect, test } from "@playwright/test";

function uniqueName(prefix: string) {
  return `${prefix} ${test.info().parallelIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("访问密码").fill("E2ePassword123");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.locator(".topbar").getByRole("button", { name: "新建笔记" })).toBeVisible();
}

async function openBackupManager(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "设置和状态" }).click();
  const settingsDialog = page.getByRole("dialog", { name: "设置和状态" });
  await settingsDialog.getByRole("button", { name: "备份管理" }).click();
  const backupDialog = page.getByRole("dialog", { name: "备份管理" });
  await expect(backupDialog).toBeVisible();
  return backupDialog;
}

test("login, create note, preview markdown, export", async ({ page }) => {
  const noteTitle = uniqueName("E2E note");
  await login(page);

  await page.locator(".topbar").getByRole("button", { name: "新建笔记" }).click();
  await page.getByRole("textbox", { name: "标题", exact: true }).fill(noteTitle);
  await page.getByRole("textbox", { name: "正文", exact: true }).fill(`# E2E heading\n\n- ${noteTitle}`);
  await expect(page.getByRole("heading", { name: "E2E heading" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".zip");
});

test("backup manager exposes zip restore upload", async ({ page }) => {
  await login(page);
  const backupDialog = await openBackupManager(page);

  await expect(backupDialog.locator('input[type="file"][accept=".zip,application/zip"]')).toHaveCount(1);
});

test("backup deletion requires in-app confirmation", async ({ page }) => {
  let deleteRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "DELETE" && request.url().includes("/api/backups/")) {
      deleteRequests += 1;
    }
  });

  await login(page);
  const backupDialog = await openBackupManager(page);

  await backupDialog.getByRole("button", { name: "创建备份" }).click();
  const backupItem = backupDialog.locator(".api-key-item", { hasText: ".zip" }).first();
  await expect(backupItem).toBeVisible();

  await backupItem.getByRole("button", { name: /删除/ }).click();
  const confirmDialog = page.getByRole("dialog", { name: "确认删除备份" });
  await expect(confirmDialog).toBeVisible();

  await confirmDialog.getByRole("button", { name: "取消" }).click();
  await expect(confirmDialog).toBeHidden();
  expect(deleteRequests).toBe(0);

  await backupItem.getByRole("button", { name: /删除/ }).click();
  await confirmDialog.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(confirmDialog).toBeHidden();
  expect(deleteRequests).toBe(1);
});

test("archive box restores notes and permanently deletes archived notes", async ({ page }) => {
  const noteTitle = uniqueName("Archive flow note");
  let permanentDeleteRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/notes/bulk") && request.postData()?.includes('"delete"')) {
      permanentDeleteRequests += 1;
    }
  });

  await login(page);
  await page.locator(".topbar").getByRole("button", { name: "新建笔记" }).click();
  const titleInput = page.getByRole("textbox", { name: "标题", exact: true });
  await expect(titleInput).toHaveValue("未命名笔记");
  await page.waitForLoadState("networkidle");
  const saveResponse = page.waitForResponse(async (response) => {
    if (!response.url().includes("/api/notes/") || response.request().method() !== "PATCH" || !response.ok()) {
      return false;
    }
    const data = (await response.json()) as { note?: { title?: string } };
    return data.note?.title === noteTitle;
  });
  await titleInput.fill(noteTitle);
  await expect(titleInput).toHaveValue(noteTitle);
  await page.getByRole("textbox", { name: "正文", exact: true }).fill(`Archive flow content ${noteTitle}`);
  await saveResponse;
  await expect(page.getByText("已保存")).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: new RegExp(noteTitle) })).toBeVisible();

  await page.getByRole("button", { name: "归档", exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(noteTitle) })).toHaveCount(0);

  await page.locator(".topbar").getByRole("button", { name: "归档箱" }).click();
  await expect(page.getByText("归档箱：这些笔记没有删除，可恢复或永久删除。")).toBeVisible();
  await page.getByRole("button", { name: new RegExp(noteTitle) }).click();
  await expect(page.getByRole("textbox", { name: "标题", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "恢复归档" }).click();
  await expect(page.getByRole("button", { name: new RegExp(noteTitle) })).toHaveCount(0);

  await page.locator(".topbar").getByRole("button", { name: "返回当前笔记" }).click();
  await expect(page.getByRole("button", { name: new RegExp(noteTitle) })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(noteTitle) }).click();
  await page.getByRole("button", { name: "归档", exact: true }).click();
  await page.locator(".topbar").getByRole("button", { name: "归档箱" }).click();
  const archivedNoteButton = page.getByRole("button", { name: new RegExp(noteTitle) });
  await expect(archivedNoteButton).toBeVisible();
  await archivedNoteButton.click();
  await expect(page.getByRole("textbox", { name: "标题", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "永久删除笔记" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "确认删除笔记" });
  await expect(confirmDialog).toBeVisible();
  await expect(confirmDialog.getByText("永久删除后不可恢复")).toBeVisible();
  await confirmDialog.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(confirmDialog).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(noteTitle) })).toHaveCount(0);
  expect(permanentDeleteRequests).toBe(1);
});
