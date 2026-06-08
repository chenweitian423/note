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

  it("checks AGENTS handoff metadata before releasing", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/release.ps1"), "utf8");

    expect(script).toContain("AGENTS.md");
    expect(script).toContain("最新提交");
    expect(script).toContain("当前版本");
    expect(script).toContain("最新 tag");
    expect(script).toContain("release-verify.ps1");
  });
});
