import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release automation helpers", () => {
  it("provides a local compose override and example env for Windows Docker verification", () => {
    const localCompose = fs.readFileSync(
      path.join(process.cwd(), "docker-compose.local.yml"),
      "utf8"
    );
    const localEnv = fs.readFileSync(
      path.join(process.cwd(), ".env.local.example"),
      "utf8"
    );

    expect(localCompose).toContain("env_file");
    expect(localCompose).toContain(".env.local");
    expect(localCompose).toContain("ports:");
    expect(localEnv).toContain("APP_PASSWORD=");
    expect(localEnv).toContain("AUTH_SECRET=");
  });

  it("includes a release verification helper that cleans build artifacts before running checks", () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), "scripts/release-verify.ps1"),
      "utf8"
    );

    expect(script).toContain(".next");
    expect(script).toContain(".test-data");
    expect(script).toContain("test-results");
    expect(script).toContain("docker compose");
    expect(script).toContain("npm run test");
    expect(script).toContain("npm run e2e");
    expect(script).toContain("npm run build");
  });

  it("lets release verification skip expensive layers or run a full Docker startup check", () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), "scripts/release-verify.ps1"),
      "utf8"
    );

    expect(script).toContain("[switch]$SkipE2E");
    expect(script).toContain("[switch]$SkipDocker");
    expect(script).toContain("[switch]$OnlyDocker");
    expect(script).toContain("[switch]$DockerUp");
    expect(script).toContain("Invoke-HealthCheck");
    expect(script).toContain("up -d --build");
    expect(script).toContain("down -v --remove-orphans");
    expect(script).toContain("finally");
  });

  it("checks AGENTS handoff metadata before releasing", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/release.ps1"), "utf8");
    const handoffScript = fs.readFileSync(path.join(process.cwd(), "scripts/update-handoff.ps1"), "utf8");

    expect(script).toContain("update-handoff.ps1");
    expect(script).toContain("release-verify.ps1");
    expect(handoffScript).toContain("AGENTS.md");
    expect(handoffScript).toContain("package.json");
    expect(handoffScript).toContain("git rev-parse --short HEAD");
    expect(handoffScript).toContain("git describe --tags --abbrev=0");
    expect(handoffScript).toContain("/api/health");
    expect(handoffScript).toContain("UTF8Encoding");
    expect(handoffScript).toContain("WriteAllText");
    expect(handoffScript).toContain("ReadAllText");
    expect(handoffScript).not.toContain("WriteAllLines");
    expect(handoffScript).not.toContain("Set-Content");
  });

  it("keeps e2e-created note names unique across runs", () => {
    const e2e = fs.readFileSync(path.join(process.cwd(), "tests/e2e/notepad.spec.ts"), "utf8");

    expect(e2e).toContain("function uniqueName");
    expect(e2e).toContain("uniqueName(\"E2E note\")");
    expect(e2e).toContain("uniqueName(\"Archive flow note\")");
    expect(e2e.match(/Date\.now\(\)/g)).toHaveLength(1);
    expect(e2e).not.toContain('fill("E2E note")');
  });
});
