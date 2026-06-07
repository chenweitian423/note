import type { Database } from "sql.js";
import { randomUUID } from "node:crypto";
import { all, one, run } from "./sql";

export type Note = {
  id: string;
  noteNumber: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type Attachment = {
  id: string;
  noteId: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type NoteWithMeta = Note & {
  tags: Tag[];
  attachments: Attachment[];
};

function now(): string {
  return new Date().toISOString();
}

function id(): string {
  return randomUUID();
}

export function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || "note";
}

export function uniqueSlug(db: Database, title: string, existingId?: string): string {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (
    one<{ id: string }>(
      db,
      "select id from notes where slug = ? and (? is null or id != ?)",
      [candidate, existingId ?? null, existingId ?? null]
    )
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function nextNoteNumber(db: Database): string {
  const rows = all<{ noteNumber: string }>(
    db,
    "select noteNumber from notes where noteNumber is not null and noteNumber != ''"
  );
  const max = rows.reduce((current, row) => {
    const match = row.noteNumber.match(/^N(\d+)$/i);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `N${String(max + 1).padStart(4, "0")}`;
}

export function createNote(
  db: Database,
  input: {
    title: string;
    content?: string;
    id?: string;
    slug?: string;
    createdAt?: string;
    updatedAt?: string;
    archivedAt?: string | null;
    noteNumber?: string;
  }
): NoteWithMeta {
  const timestamp = input.createdAt ?? now();
  const note: Note = {
    id: input.id ?? id(),
    noteNumber: input.noteNumber ?? nextNoteNumber(db),
    title: input.title.trim() || "Untitled",
    slug: input.slug ?? uniqueSlug(db, input.title),
    content: input.content ?? "",
    createdAt: timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    archivedAt: input.archivedAt ?? null
  };
  run(
    db,
    "insert into notes (id, noteNumber, title, slug, content, createdAt, updatedAt, archivedAt) values (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      note.id,
      note.noteNumber,
      note.title,
      note.slug,
      note.content,
      note.createdAt,
      note.updatedAt,
      note.archivedAt
    ]
  );
  return { ...note, tags: [], attachments: [] };
}

export function getNote(db: Database, noteId: string): NoteWithMeta | null {
  const note = one<Note>(db, "select * from notes where id = ?", [noteId]);
  return note ? hydrateNote(db, note) : null;
}

export function getNoteByNumber(db: Database, noteNumber: string): NoteWithMeta | null {
  const note = one<Note>(db, "select * from notes where upper(noteNumber) = upper(?)", [noteNumber]);
  return note ? hydrateNote(db, note) : null;
}

export function listNotes(
  db: Database,
  filters: { query?: string; includeArchived?: boolean; archiveOnly?: boolean; tagId?: string } = {}
): NoteWithMeta[] {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.archiveOnly) {
    clauses.push("n.archivedAt is not null");
  } else if (!filters.includeArchived) {
    clauses.push("n.archivedAt is null");
  }
  if (filters.query) {
    clauses.push("(n.title like ? or n.content like ?)");
    params.push(`%${filters.query}%`, `%${filters.query}%`);
  }
  if (filters.tagId) {
    clauses.push("exists (select 1 from note_tags nt where nt.noteId = n.id and nt.tagId = ?)");
    params.push(filters.tagId);
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  return all<Note>(db, `select n.* from notes n ${where} order by n.updatedAt desc`, params).map((note) =>
    hydrateNote(db, note)
  );
}

export function updateNote(
  db: Database,
  noteId: string,
  patch: { title?: string; content?: string; tagIds?: string[] }
): NoteWithMeta | null {
  const note = getNote(db, noteId);
  if (!note) {
    return null;
  }

  const title = patch.title?.trim() || note.title;
  const content = patch.content ?? note.content;
  const slug = patch.title ? uniqueSlug(db, title, noteId) : note.slug;
  run(db, "update notes set title = ?, slug = ?, content = ?, updatedAt = ? where id = ?", [
    title,
    slug,
    content,
    now(),
    noteId
  ]);
  if (patch.tagIds) {
    setNoteTags(db, noteId, patch.tagIds);
  }
  return getNote(db, noteId);
}

export function archiveNote(db: Database, noteId: string): void {
  const timestamp = now();
  run(db, "update notes set archivedAt = ?, updatedAt = ? where id = ?", [timestamp, timestamp, noteId]);
}

export function restoreNote(db: Database, noteId: string): void {
  run(db, "update notes set archivedAt = null, updatedAt = ? where id = ?", [now(), noteId]);
}

export function deleteNote(db: Database, noteId: string): void {
  run(db, "delete from note_tags where noteId = ?", [noteId]);
  run(db, "delete from attachments where noteId = ?", [noteId]);
  run(db, "delete from notes where id = ?", [noteId]);
}

export function createTag(db: Database, input: { name: string; color: string; id?: string }): Tag {
  const tag: Tag = {
    id: input.id ?? id(),
    name: input.name.trim(),
    color: input.color,
    createdAt: now()
  };
  run(db, "insert into tags (id, name, color, createdAt) values (?, ?, ?, ?)", [
    tag.id,
    tag.name,
    tag.color,
    tag.createdAt
  ]);
  return tag;
}

export function listTags(db: Database): Tag[] {
  return all<Tag>(db, "select * from tags order by name asc");
}

export function setNoteTags(db: Database, noteId: string, tagIds: string[]): void {
  run(db, "delete from note_tags where noteId = ?", [noteId]);
  for (const tagId of tagIds) {
    run(db, "insert or ignore into note_tags (noteId, tagId) values (?, ?)", [noteId, tagId]);
  }
}

export function createAttachment(
  db: Database,
  input: { noteId: string; filename: string; storedName: string; mimeType: string; size: number; id?: string }
): Attachment {
  const attachment: Attachment = {
    id: input.id ?? id(),
    noteId: input.noteId,
    filename: input.filename,
    storedName: input.storedName,
    mimeType: input.mimeType,
    size: input.size,
    createdAt: now()
  };
  run(
    db,
    "insert into attachments (id, noteId, filename, storedName, mimeType, size, createdAt) values (?, ?, ?, ?, ?, ?, ?)",
    [
      attachment.id,
      attachment.noteId,
      attachment.filename,
      attachment.storedName,
      attachment.mimeType,
      attachment.size,
      attachment.createdAt
    ]
  );
  return attachment;
}

export function getAttachment(db: Database, attachmentId: string): Attachment | null {
  return one<Attachment>(db, "select * from attachments where id = ?", [attachmentId]);
}

export function listAttachments(db: Database, noteId: string): Attachment[] {
  return all<Attachment>(db, "select * from attachments where noteId = ? order by createdAt asc", [noteId]);
}

function hydrateNote(db: Database, note: Note): NoteWithMeta {
  const tags = all<Tag>(
    db,
    "select t.* from tags t join note_tags nt on nt.tagId = t.id where nt.noteId = ? order by t.name asc",
    [note.id]
  );
  return {
    ...note,
    tags,
    attachments: listAttachments(db, note.id)
  };
}
