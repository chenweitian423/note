import { describe, expect, it } from "vitest";
import { all } from "../src/lib/sql";
import { createTestDb } from "../src/test/create-test-db";

describe("database schema", () => {
  it("creates required tables", async () => {
    const db = await createTestDb();
    const tables = all<{ name: string }>(
      db,
      "select name from sqlite_master where type = 'table' order by name"
    ).map((row) => row.name);

    expect(tables).toContain("notes");
    expect(tables).toContain("tags");
    expect(tables).toContain("note_tags");
    expect(tables).toContain("attachments");
    expect(tables).toContain("settings");
  });
});
