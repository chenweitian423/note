export const DEFAULT_MAX_NOTE_CONTENT_BYTES = 1024 * 1024;
export const DEFAULT_MAX_IMPORT_ZIP_BYTES = 50 * 1024 * 1024;
export const DEFAULT_MAX_ZIP_ENTRY_BYTES = 20 * 1024 * 1024;
export const DEFAULT_MAX_ZIP_TOTAL_BYTES = 100 * 1024 * 1024;
export const DEFAULT_MAX_ZIP_ENTRIES = 1000;

export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}
