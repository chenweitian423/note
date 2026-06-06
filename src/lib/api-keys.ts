import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Database } from "sql.js";
import { all, one, run } from "./sql";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyHash: string;
  encryptedKey: string;
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ApiKeySummary = {
  id: string;
  name: string;
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedApiKey = ApiKeySummary & {
  key: string;
};

function now(): string {
  return new Date().toISOString();
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `np_live_${randomBytes(32).toString("base64url")}`;
}

export function createApiKey(db: Database, input: { name: string }): CreatedApiKey {
  const key = generateApiKey();
  const record: ApiKeyRecord = {
    id: randomUUID(),
    name: input.name.trim() || "未命名 API Key",
    keyHash: hashApiKey(key),
    encryptedKey: "",
    keySuffix: key.slice(-6),
    createdAt: now(),
    lastUsedAt: null
  };
  run(
    db,
    "insert into api_keys (id, name, keyHash, encryptedKey, keySuffix, createdAt, lastUsedAt) values (?, ?, ?, ?, ?, ?, ?)",
    [record.id, record.name, record.keyHash, record.encryptedKey, record.keySuffix, record.createdAt, record.lastUsedAt]
  );
  return { ...toSummary(record), key };
}

export function listApiKeys(db: Database): ApiKeySummary[] {
  clearLegacyEncryptedKeys(db);
  return all<ApiKeyRecord>(db, "select * from api_keys order by createdAt desc").map(toSummary);
}

export function deleteApiKey(db: Database, id: string): void {
  run(db, "delete from api_keys where id = ?", [id]);
}

export function verifyApiKey(db: Database, key: string): boolean {
  const keyHash = hashApiKey(key);
  const record = one<ApiKeyRecord>(db, "select * from api_keys where keyHash = ?", [keyHash]);
  if (!record) {
    return false;
  }
  const left = Buffer.from(record.keyHash);
  const right = Buffer.from(keyHash);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return false;
  }
  run(db, "update api_keys set lastUsedAt = ? where id = ?", [now(), record.id]);
  return true;
}

function clearLegacyEncryptedKeys(db: Database): void {
  run(db, "update api_keys set encryptedKey = '' where encryptedKey <> ''");
}

function toSummary(record: ApiKeyRecord): ApiKeySummary {
  return {
    id: record.id,
    name: record.name,
    keySuffix: record.keySuffix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt
  };
}
