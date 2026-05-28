import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Database } from "sql.js";
import { all, one, run } from "./sql";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyHash: string;
  encryptedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ApiKeyView = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function now(): string {
  return new Date().toISOString();
}

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `np_live_${randomBytes(32).toString("base64url")}`;
}

export function encryptApiKey(key: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptApiKey(encryptedKey: string, secret: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = encryptedKey.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("API key 密文无效");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function createApiKey(db: Database, input: { name: string; secret: string }): ApiKeyView {
  const key = generateApiKey();
  const record: ApiKeyRecord = {
    id: randomUUID(),
    name: input.name.trim() || "未命名 API Key",
    keyHash: hashApiKey(key),
    encryptedKey: encryptApiKey(key, input.secret),
    createdAt: now(),
    lastUsedAt: null
  };
  run(
    db,
    "insert into api_keys (id, name, keyHash, encryptedKey, createdAt, lastUsedAt) values (?, ?, ?, ?, ?, ?)",
    [record.id, record.name, record.keyHash, record.encryptedKey, record.createdAt, record.lastUsedAt]
  );
  return toView(record, input.secret);
}

export function listApiKeys(db: Database, secret: string): ApiKeyView[] {
  return all<ApiKeyRecord>(db, "select * from api_keys order by createdAt desc").map((record) =>
    toView(record, secret)
  );
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

function toView(record: ApiKeyRecord, secret: string): ApiKeyView {
  return {
    id: record.id,
    name: record.name,
    key: decryptApiKey(record.encryptedKey, secret),
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt
  };
}
