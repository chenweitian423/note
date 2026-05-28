import { describe, expect, it } from "vitest";
import { createApiKey, deleteApiKey, listApiKeys, verifyApiKey } from "../src/lib/api-keys";
import { createTestDb } from "../src/test/create-test-db";

describe("api keys", () => {
  it("stores repeat-copyable encrypted keys and verifies bearer tokens", async () => {
    const db = await createTestDb();
    const secret = "test-secret-at-least-32-characters-long";
    const apiKey = createApiKey(db, { name: "curl", secret });

    expect(apiKey.key).toMatch(/^np_live_/);
    expect(listApiKeys(db, secret)[0].key).toBe(apiKey.key);
    expect(verifyApiKey(db, apiKey.key)).toBe(true);
    expect(verifyApiKey(db, "np_live_wrong")).toBe(false);

    deleteApiKey(db, apiKey.id);
    expect(verifyApiKey(db, apiKey.key)).toBe(false);
  });
});
