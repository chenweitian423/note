import { describe, expect, it } from "vitest";
import { createApiKey, deleteApiKey, listApiKeys, verifyApiKey } from "../src/lib/api-keys";
import { createTestDb } from "../src/test/create-test-db";
import { one } from "../src/lib/sql";

describe("api keys", () => {
  it("shows new keys once, lists only metadata, and verifies bearer tokens", async () => {
    const db = await createTestDb();
    const apiKey = createApiKey(db, { name: "curl" });

    expect(apiKey.key).toMatch(/^np_live_/);
    expect(apiKey.keySuffix).toBe(apiKey.key.slice(-6));

    const listed = listApiKeys(db)[0];
    expect(listed).toEqual({
      id: apiKey.id,
      name: "curl",
      keySuffix: apiKey.keySuffix,
      createdAt: apiKey.createdAt,
      lastUsedAt: null
    });
    expect("key" in listed).toBe(false);

    const stored = one<{ encryptedKey: string }>(db, "select encryptedKey from api_keys where id = ?", [apiKey.id]);
    expect(stored?.encryptedKey).toBe("");

    expect(verifyApiKey(db, apiKey.key)).toBe(true);
    expect(verifyApiKey(db, "np_live_wrong")).toBe(false);

    deleteApiKey(db, apiKey.id);
    expect(verifyApiKey(db, apiKey.key)).toBe(false);
  });
});
