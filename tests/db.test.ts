import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { all } from "../src/lib/sql";
import { createTestDb } from "../src/test/create-test-db";
import { initializeSchema, persistDb, writeDatabaseFile } from "../src/lib/db";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "online-notepad-db-"));
}

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

  it("writes database files atomically without leaving temp files", async () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "app.db");
    const db = await createTestDb();
    db.run("insert into settings (key, value) values ('health', 'ok')");

    writeDatabaseFile(db, dbPath);

    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.readdirSync(dir).filter((name) => name.includes(".tmp"))).toEqual([]);

    const SQL = await initSqlJs({
      locateFile: (file) => `node_modules/sql.js/dist/${file}`
    });
    const restored = new SQL.Database(fs.readFileSync(dbPath));
    expect(all<{ value: string }>(restored, "select value from settings where key = 'health'")).toEqual([
      { value: "ok" }
    ]);
  });

  it("serializes persistDb writes so the last state wins", async () => {
    const dir = tempDir();
    process.env.DATA_DIR = dir;
    const db = await createTestDb();
    db.run("insert into settings (key, value) values ('health', 'first')");

    const firstPersist = persistDb(db);
    db.run("update settings set value = 'second' where key = 'health'");
    const secondPersist = persistDb(db);
    await Promise.all([firstPersist, secondPersist]);

    const SQL = await initSqlJs({
      locateFile: (file) => `node_modules/sql.js/dist/${file}`
    });
    const restored = new SQL.Database(fs.readFileSync(path.join(dir, "app.db")));
    expect(all<{ value: string }>(restored, "select value from settings where key = 'health'")).toEqual([
      { value: "second" }
    ]);
  });
});
