import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.60.0-noble";

describe("release verification workflow", () => {
  it("pins Playwright 1.60 in package metadata, CI, and release docs", () => {
    const root = process.cwd();
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const workflow = fs.readFileSync(path.join(root, ".github/workflows/playwright.yml"), "utf8");
    const releaseProcess = fs.readFileSync(path.join(root, "docs/release-process.md"), "utf8");

    expect(packageJson.devDependencies["@playwright/test"]).toBe("^1.60.0");
    expect(workflow).toContain(PLAYWRIGHT_IMAGE);
    expect(workflow).toContain("npm run e2e");
    expect(releaseProcess).toContain(PLAYWRIGHT_IMAGE);
    expect(releaseProcess).toContain("rtk npm run e2e");
  });
});
