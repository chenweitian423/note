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
  });
});
