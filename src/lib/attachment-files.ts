import fs from "node:fs";
import path from "node:path";
import type { Attachment } from "./notes";

export function deleteAttachmentFiles(uploadsDir: string, attachments: Attachment[]): void {
  const root = path.resolve(uploadsDir);
  for (const attachment of attachments) {
    const filePath = path.resolve(root, attachment.storedName);
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      continue;
    }
    fs.rmSync(filePath, { force: true });
  }
}
