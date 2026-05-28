import fs from "node:fs";
import path from "node:path";

export function getDataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
}

export function getDbPath(): string {
  return path.join(getDataDir(), "app.db");
}

export function getUploadsDir(): string {
  return path.join(getDataDir(), "uploads");
}

export function getExportsDir(): string {
  return path.join(getDataDir(), "exports");
}

export function ensureDataDirs(): void {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.mkdirSync(getUploadsDir(), { recursive: true });
  fs.mkdirSync(getExportsDir(), { recursive: true });
}
