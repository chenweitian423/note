import { expect, test } from "@playwright/test";

test("login, create note, preview markdown, export", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("访问密码").fill("E2ePassword123");
  await page.getByRole("button", { name: "登录" }).click();
  const topbar = page.locator(".topbar");
  await topbar.getByRole("button", { name: "新建笔记" }).click();
  await page.getByRole("textbox", { name: "标题", exact: true }).fill("E2E 笔记");
  await page.getByLabel("正文").fill("# 标题\n\n- 内容");
  await expect(page.getByRole("heading", { name: "标题" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await topbar.getByRole("button", { name: "导出" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".zip");
});

test("backup manager exposes zip restore upload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("访问密码").fill("E2ePassword123");
  await page.getByRole("button", { name: "登录" }).click();
  await page.getByRole("button", { name: "设置和状态" }).click();

  const settingsDialog = page.getByRole("dialog", { name: "设置和状态" });
  await settingsDialog.getByRole("button", { name: "备份管理" }).click();

  const backupDialog = page.getByRole("dialog", { name: "备份管理" });
  await expect(backupDialog).toBeVisible();
  await expect(backupDialog.getByText("导入备份 ZIP")).toBeVisible();
});
