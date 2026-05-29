import { describe, expect, it } from "vitest";
import { getRequiredEnv } from "../src/lib/auth";
import { sanitizeFilename, safeZipPath } from "../src/lib/filenames";
import { recordLoginFailure, isLoginRateLimited, resetLoginRateLimits } from "../src/lib/rate-limit";
import { noteContentSchema } from "../src/lib/validation";

describe("security safeguards", () => {
  it("rejects placeholder or weak deployment secrets", () => {
    expect(() =>
      getRequiredEnv("APP_PASSWORD", { disallowValues: ["change-me"], minLength: 12 }, { APP_PASSWORD: "change-me" })
    ).toThrow();
    expect(() =>
      getRequiredEnv(
        "AUTH_SECRET",
        { disallowValues: ["replace-with-at-least-32-random-characters"], minLength: 32 },
        { AUTH_SECRET: "short" }
      )
    ).toThrow();
    expect(getRequiredEnv("AUTH_SECRET", { minLength: 32 }, { AUTH_SECRET: "a".repeat(32) })).toBe("a".repeat(32));
  });

  it("locks login after repeated failures", () => {
    resetLoginRateLimits();
    const now = Date.now();
    for (let index = 0; index < 4; index += 1) {
      recordLoginFailure("login", now + index);
    }
    expect(isLoginRateLimited("login", now + 4)).toBe(false);
    recordLoginFailure("login", now + 5);
    expect(isLoginRateLimited("login", now + 6)).toBe(true);
  });

  it("sanitizes filenames used in storage and zip entries", () => {
    expect(sanitizeFilename("../secret.txt")).toBe("secret.txt");
    expect(sanitizeFilename("..\\secret.txt")).toBe("secret.txt");
    expect(sanitizeFilename("CON")).toBe("file");
    expect(safeZipPath("attachments", "../note", "..\\evil.txt")).toBe("attachments/note/evil.txt");
  });

  it("rejects oversized note content", () => {
    process.env.MAX_NOTE_CONTENT_BYTES = "4";
    expect(noteContentSchema.safeParse("1234").success).toBe(true);
    expect(noteContentSchema.safeParse("12345").success).toBe(false);
    delete process.env.MAX_NOTE_CONTENT_BYTES;
  });
});
