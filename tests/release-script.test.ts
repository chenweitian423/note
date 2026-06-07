import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release helper script", () => {
  it("verifies version metadata, runs checks, and pushes the release tag", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts/release.ps1"), "utf8");

    expect(script).toContain("package.json");
    expect(script).toContain("package-lock.json");
    expect(script).toContain("CHANGELOG.md");
    expect(script).toContain("npm run test");
    expect(script).toContain("npm run build");
    expect(script).toContain("npm run e2e");
    expect(script).toContain("git tag -a");
    expect(script).toContain("git push origin");
    expect(script).toContain("git status --porcelain");
  });
});
