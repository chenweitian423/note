import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, verifyPassword } from "../src/lib/auth";

describe("auth helpers", () => {
  it("verifies password and signed session token", async () => {
    expect(await verifyPassword("secret", "secret")).toBe(true);
    expect(await verifyPassword("wrong", "secret")).toBe(false);

    const token = await createSessionToken("secret-at-least-32-characters-long");
    await expect(readSessionToken(token, "secret-at-least-32-characters-long")).resolves.toEqual({ ok: true });
    await expect(readSessionToken(token, "other-secret-at-least-32-characters")).resolves.toEqual({ ok: false });
  });
});
