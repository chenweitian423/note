import { expect, test } from "@playwright/test";

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
  await login(page);

  await page.locator(".topbar").getByRole("button", { name: "新建笔记" }).click();
  await page.getByRole("textbox", { name: "标题", exact: true }).fill("E2E note");
  await page.getByRole("textbox", { name: "正文", exact: true }).fill("# E2E heading\n\n- Content");
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
