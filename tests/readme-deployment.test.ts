import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("README deployment guide", () => {
  it("documents Docker Compose configuration and common operations for GitHub readers", () => {
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain("Docker Compose 部署示例");
    expect(readme).toContain("/opt/online-notepad/.env");
    expect(readme).toContain("/opt/online-notepad/app");
    expect(readme).toContain("docker-compose.yml");
    expect(readme).toContain("docker compose -p online-notepad up -d --build");
    expect(readme).toContain("docker compose -p online-notepad logs -f");
    expect(readme).toContain("curl -fsS http://127.0.0.1:31300/api/health");
    expect(readme).toContain("scripts/deploy-sky195.ps1");
    expect(readme).toContain("ALLOW_DIRTY_DEPLOY=1");
    expect(readme).toContain("当前稳定版");
    expect(readme).toContain("npm run e2e");
  });

  it("keeps the displayed current version in sync with package.json", () => {
    const root = process.cwd();
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

    expect(readme).toContain(`当前版本：\`${packageJson.version}\``);
  });

  it("documents the dirty working tree deployment guard in the release process", () => {
    const releaseProcess = fs.readFileSync(path.join(process.cwd(), "docs/release-process.md"), "utf8");

    expect(releaseProcess).toContain("ALLOW_DIRTY_DEPLOY=1");
    expect(releaseProcess).toContain("脏工作区");
  });
});
