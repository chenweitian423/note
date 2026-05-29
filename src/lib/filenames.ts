const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

export function sanitizeFilename(input: string, fallback = "file"): string {
  const base = input
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/^\.+$/, "");

  if (!base || RESERVED_WINDOWS_NAMES.test(base)) {
    return fallback;
  }
  return base;
}

export function safeZipPath(...parts: string[]): string {
  return parts.map((part, index) => sanitizeFilename(part, index === parts.length - 1 ? "file" : "item")).join("/");
}
