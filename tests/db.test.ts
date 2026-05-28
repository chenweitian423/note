import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { all } from "../src/lib/sql";
import { createTestDb } from "../src/test/create-test-db";
import { initializeSchema } from "../src/lib/db";

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
    expect(tables).toContain("api_keys");
  });

  it("migrates legacy notes without note numbers", async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `node_modules/sql.js/dist/${file}`
    });
    const db = new SQL.Database();
    db.run(`
      create table notes (
        id text primary key,
        title text not null,
        slug text not null unique,
        content text not null default '',
        createdAt text not null,
        updatedAt text not null,
        archivedAt text
      );
      insert into notes (id, title, slug, content, createdAt, updatedAt, archivedAt)
      values ('legacy-1', 'Legacy', 'legacy', 'content', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', null);
    `);

    initializeSchema(db);

    const notes = all<{ id: string; noteNumber: string }>(db, "select id, noteNumber from notes");
    expect(notes).toEqual([{ id: "legacy-1", noteNumber: "N0001" }]);
  });
});
