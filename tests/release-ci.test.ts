import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.60.0-noble";
const privateHostAlias = ["sky", "195"].join("");
const privateDeployScript = ["deploy", "sky", "195"].join("-");
const privateRepoOwner = ["chen", "weitian", "423"].join("");

describe("release verification workflow", () => {
  it("uses a broad CI workflow name so notification emails describe all jobs", () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), ".github/workflows/playwright.yml"), "utf8");
    const firstLine = workflow.split(/\r?\n/, 1)[0];

    expect(firstLine).toBe("name: CI");
  });

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
    expect(releaseProcess).toContain("scripts/release-verify.ps1");
    expect(releaseProcess).toContain("-SkipE2E");
    expect(releaseProcess).toContain("-SkipDocker");
    expect(releaseProcess).toContain("-OnlyDocker");
    expect(releaseProcess).toContain("-DockerUp");
    expect(releaseProcess).toContain("down -v --remove-orphans");
  });

  it("runs test, build, and e2e checks in GitHub Actions", () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), ".github/workflows/playwright.yml"), "utf8");

    expect(workflow).toContain("npm run test");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("Prepare Docker Compose env file");
    expect(workflow).toContain("/opt/online-notepad/.env");
    expect(workflow).toContain("docker compose config");
    expect(workflow).toContain("npm run e2e");
  });

  it("allows Playwright dev-server origins in Next config", () => {
    const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

    expect(nextConfig).toContain("allowedDevOrigins");
    expect(nextConfig).toContain("127.0.0.1");
  });

  it("keeps e2e selectors semantic for primary controls", () => {
    const e2e = fs.readFileSync(path.join(process.cwd(), "tests/e2e/notepad.spec.ts"), "utf8");

    expect(e2e).not.toContain(".topbar button");
    expect(e2e).not.toContain(".settings-actions button");
    expect(e2e).not.toContain(".api-key-create button");
    expect(e2e).not.toContain(".confirm-actions button");
    expect(e2e).not.toContain(".danger-action");
    expect(e2e).toContain("getByRole");
    expect(e2e).toContain("getByLabel");
  });

  it("does not expose personal deployment or repository details in public files", () => {
    const publicFiles = [
      "README.md",
      "docs/release-process.md",
      "src/components/note-shell.tsx"
    ];

    for (const file of publicFiles) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain(privateHostAlias);
      expect(source).not.toContain(privateDeployScript);
      expect(source).not.toContain(privateRepoOwner);
    }
  });
});
