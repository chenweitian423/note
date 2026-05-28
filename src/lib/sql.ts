import type { Database } from "sql.js";

export type SqlValue = string | number | Uint8Array | null;

export function all<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T[] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    return rows;
  } finally {
    statement.free();
  }
}

export function one<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T | null {
  return all<T>(db, sql, params)[0] ?? null;
}

export function run(db: Database, sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
}
