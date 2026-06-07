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
    expect(script).toContain("EXPECTED_VERSION");
    expect(script).toContain("package.json");
    expect(script).toContain("ALLOW_DIRTY_DEPLOY");
    expect(script).toContain("git status --porcelain");
    expect(script).toContain("python3 -c");
    expect(script).toContain("printf '%s'");
    expect(script).toContain("json.load(sys.stdin)");
    expect(script).toContain("data.get");
    expect(script).toContain("version");
    expect(script).toContain("EXPECTED_VERSION");
    expect(script).toContain("Deployment summary");
    expect(script).toContain("git rev-parse --short HEAD");
    expect(script).toContain("docker compose -p online-notepad ps");

    expect(powershellScript).toContain('$BaseDir = "/opt/online-notepad"');
    expect(powershellScript).toContain('$AppDir = "$BaseDir/app"');
    expect(powershellScript).toContain('$EnvFile = "$BaseDir/.env"');
    expect(powershellScript).toContain("--exclude=.env");
    expect(powershellScript).toContain("docker compose -p online-notepad");
    expect(powershellScript).toContain("for attempt in");
    expect(powershellScript).toContain("curl -fsS http://127.0.0.1:31300/api/health");
    expect(powershellScript).toContain("$ExpectedVersion");
    expect(powershellScript).toContain("package.json");
    expect(powershellScript).toContain("ALLOW_DIRTY_DEPLOY");
    expect(powershellScript).toContain("git status --porcelain");
    expect(powershellScript).toContain('ssh $HostName "bash -s"');
    expect(powershellScript).toContain("python3 -c");
    expect(powershellScript).toContain("printf '%s'");
    expect(powershellScript).toContain("json.load(sys.stdin)");
    expect(powershellScript).toContain("data.get");
    expect(powershellScript).toContain("version");
    expect(powershellScript).toContain("EXPECTED_VERSION");
    expect(powershellScript).toContain("Deployment summary");
    expect(powershellScript).toContain("git rev-parse --short HEAD");
    expect(powershellScript).toContain("docker compose -p online-notepad ps");
    expect(powershellScript).toContain('Replace("`r`n", "`n")');
  });
});
