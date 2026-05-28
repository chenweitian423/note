import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { ensureDataDirs, getDbPath } from "./paths";

let sqlModulePromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

async function getSqlModule(): Promise<SqlJsStatic> {
  sqlModulePromise ??= initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  return sqlModulePromise;
}

export async function createMemoryDb(): Promise<Database> {
  const SQL = await getSqlModule();
  const db = new SQL.Database();
  initializeSchema(db);
  return db;
}

export function initializeSchema(db: Database): void {
  db.run(`
    create table if not exists notes (
      id text primary key,
      title text not null,
      slug text not null unique,
      content text not null default '',
      createdAt text not null,
      updatedAt text not null,
      archivedAt text
    );

    create table if not exists tags (
      id text primary key,
      name text not null unique,
      color text not null,
      createdAt text not null
    );

    create table if not exists note_tags (
      noteId text not null,
      tagId text not null,
      primary key (noteId, tagId),
      foreign key (noteId) references notes(id) on delete cascade,
      foreign key (tagId) references tags(id) on delete cascade
    );

    create table if not exists attachments (
      id text primary key,
      noteId text not null,
      filename text not null,
      storedName text not null,
      mimeType text not null,
      size integer not null,
      createdAt text not null,
      foreign key (noteId) references notes(id) on delete cascade
    );

    create table if not exists settings (
      key text primary key,
      value text not null
    );

    create index if not exists idx_notes_updatedAt on notes(updatedAt);
    create index if not exists idx_tags_name on tags(name);
    create index if not exists idx_attachments_noteId on attachments(noteId);
  `);
}

export async function getDb(): Promise<Database> {
  dbPromise ??= (async () => {
    ensureDataDirs();
    const SQL = await getSqlModule();
    const dbPath = getDbPath();
    const db = fs.existsSync(dbPath)
      ? new SQL.Database(fs.readFileSync(dbPath))
      : new SQL.Database();
    initializeSchema(db);
    persistDb(db);
    return db;
  })();
  return dbPromise;
}

export function persistDb(db: Database): void {
  ensureDataDirs();
  fs.writeFileSync(getDbPath(), Buffer.from(db.export()));
}
