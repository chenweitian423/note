import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { nextNoteNumber } from "./notes";
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
      noteNumber text,
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

    create table if not exists api_keys (
      id text primary key,
      name text not null,
      keyHash text not null unique,
      encryptedKey text not null default '',
      keySuffix text not null default '',
      createdAt text not null,
      lastUsedAt text
    );

    create index if not exists idx_tags_name on tags(name);
    create index if not exists idx_attachments_noteId on attachments(noteId);
    create index if not exists idx_api_keys_keyHash on api_keys(keyHash);
  `);
  migrateNoteNumbers(db);
  migrateApiKeyMetadata(db);
  db.run(`
    create index if not exists idx_notes_updatedAt on notes(updatedAt);
    create unique index if not exists idx_notes_noteNumber on notes(noteNumber);
  `);
}

function migrateNoteNumbers(db: Database): void {
  const hasNoteNumber = db
    .exec("pragma table_info(notes)")?.[0]
    ?.values.some((row) => row[1] === "noteNumber");

  if (!hasNoteNumber) {
    db.run("alter table notes add column noteNumber text");
  }

  const existing = db.exec("select id from notes where noteNumber is null or noteNumber = '' order by createdAt asc");
  const ids = existing[0]?.values.map((row) => String(row[0])) ?? [];
  for (const id of ids) {
    db.run("update notes set noteNumber = ? where id = ?", [nextNoteNumber(db), id]);
  }
}

function migrateApiKeyMetadata(db: Database): void {
  const columns = db.exec("pragma table_info(api_keys)")?.[0]?.values.map((row) => String(row[1])) ?? [];

  if (!columns.includes("keySuffix")) {
    db.run("alter table api_keys add column keySuffix text not null default ''");
  }
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
  writeDatabaseFile(db, getDbPath());
}

export function writeDatabaseFile(db: Database, dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tempPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(tempPath, "w");
  try {
    fs.writeFileSync(fd, Buffer.from(db.export()));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempPath, dbPath);
  fsyncDirectory(path.dirname(dbPath));
}

function fsyncDirectory(dir: string): void {
  try {
    const fd = fs.openSync(dir, "r");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Some filesystems do not allow fsync on directories; the file rename is still atomic.
  }
}
