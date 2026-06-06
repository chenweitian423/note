import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("deployment script", () => {
  it("deploys code under /opt while keeping secrets outside the app directory", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/deploy-sky195.sh"), "utf8");
    const powershellScript = fs.readFileSync(path.join(process.cwd(), "scripts/deploy-sky195.ps1"), "utf8");

    expect(script).toContain('BASE_DIR="/opt/online-notepad"');
    expect(script).toContain('APP_DIR="${BASE_DIR}/app"');
    expect(script).toContain('ENV_FILE="${BASE_DIR}/.env"');
    expect(script).toContain("--exclude='.env'");
    expect(script).toContain("docker compose -p online-notepad");
    expect(script).toContain("for attempt in");
    expect(script).toContain("curl -fsS http://127.0.0.1:31300/api/health");

    expect(powershellScript).toContain('$BaseDir = "/opt/online-notepad"');
    expect(powershellScript).toContain('$AppDir = "$BaseDir/app"');
    expect(powershellScript).toContain('$EnvFile = "$BaseDir/.env"');
    expect(powershellScript).toContain("--exclude=.env");
    expect(powershellScript).toContain("docker compose -p online-notepad");
    expect(powershellScript).toContain("for attempt in");
    expect(powershellScript).toContain("curl -fsS http://127.0.0.1:31300/api/health");
  });
});
