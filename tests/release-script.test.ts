import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release helper script", () => {
  it("verifies version metadata, runs checks, and pushes the release tag", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/release.ps1"), "utf8");

    expect(script).toContain("package.json");
    expect(script).toContain("package-lock.json");
    expect(script).toContain("CHANGELOG.md");
    expect(script).toContain("AGENTS.md");
    expect(script).toContain("当前版本");
    expect(script).toContain("最新提交");
    expect(script).toContain("最新 tag");
    expect(script).toContain("release-verify.ps1");
    expect(script).toContain("git tag -a");
    expect(script).toContain("git push origin");
    expect(script).toContain("git ls-remote origin");
    expect(script).toContain("refs/tags/$tag");
    expect(script).toContain("git status --porcelain");
  });
});
