import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('input[name="password"]').fill("E2ePassword123");
  await page.locator(".login-panel button").click();
  await expect(page.locator(".topbar")).toBeVisible();
}

async function openBackupManager(page: import("@playwright/test").Page) {
  await page.locator(".topbar button").nth(2).click();
  const settingsDialog = page.locator("section.api-key-dialog", { has: page.locator(".settings-grid") });
  await settingsDialog.locator(".settings-actions button").nth(1).click();
  const backupDialog = page.locator("section.api-key-dialog", { has: page.locator(".backup-summary") });
  await expect(backupDialog).toBeVisible();
  return backupDialog;
}

test("login, create note, preview markdown, export", async ({ page }) => {
  await login(page);

  const topbar = page.locator(".topbar");
  await topbar.locator("button").nth(0).click();
  await page.locator(".editor-header input").fill("E2E note");
  await page.locator("textarea").fill("# E2E heading\n\n- Content");
  await expect(page.getByRole("heading", { name: "E2E heading" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await topbar.locator("button").nth(1).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".zip");
});

test("backup manager exposes zip restore upload", async ({ page }) => {
  await login(page);
  const backupDialog = await openBackupManager(page);

  await expect(backupDialog.locator('input[accept=".zip,application/zip"]')).toHaveCount(1);
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

  await backupDialog.locator(".api-key-create button").click();
  const backupItem = backupDialog.locator(".api-key-item", { hasText: ".zip" }).first();
  await expect(backupItem).toBeVisible();

  await backupItem.locator("button.text-action").click();
  const confirmDialog = page.locator(".confirm-dialog");
  await expect(confirmDialog).toBeVisible();

  await confirmDialog.locator(".confirm-actions button").first().click();
  await expect(confirmDialog).toBeHidden();
  expect(deleteRequests).toBe(0);

  await backupItem.locator("button.text-action").click();
  await confirmDialog.locator(".danger-action").click();
  await expect(confirmDialog).toBeHidden();
  expect(deleteRequests).toBe(1);
});
