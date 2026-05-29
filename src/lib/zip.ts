import { Readable } from "node:stream";
import yauzl from "yauzl";
import {
  DEFAULT_MAX_ZIP_ENTRIES,
  DEFAULT_MAX_ZIP_ENTRY_BYTES,
  DEFAULT_MAX_ZIP_TOTAL_BYTES
} from "./limits";

export type ZipEntry = {
  name: string;
  data: Buffer;
};

export type ZipReadLimits = {
  maxEntries?: number;
  maxEntryBytes?: number;
  maxTotalBytes?: number;
};

export async function readZipEntries(zipBuffer: Buffer, limits: ZipReadLimits = {}): Promise<ZipEntry[]> {
  const maxEntries = limits.maxEntries ?? DEFAULT_MAX_ZIP_ENTRIES;
  const maxEntryBytes = limits.maxEntryBytes ?? DEFAULT_MAX_ZIP_ENTRY_BYTES;
  const maxTotalBytes = limits.maxTotalBytes ?? DEFAULT_MAX_ZIP_TOTAL_BYTES;

  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (zipError, zipfile) => {
      if (zipError || !zipfile) {
        reject(zipError ?? new Error("无法读取 ZIP"));
        return;
      }

      const entries: ZipEntry[] = [];
      let totalBytes = 0;
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entries.length >= maxEntries) {
          reject(new Error("ZIP has too many entries"));
          zipfile.close();
          return;
        }
        if (entry.uncompressedSize > maxEntryBytes) {
          reject(new Error("ZIP entry is too large"));
          zipfile.close();
          return;
        }
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            reject(streamError ?? new Error("无法读取 ZIP 条目"));
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on("error", reject);
          stream.on("end", () => {
            const data = Buffer.concat(chunks);
            if (data.length > maxEntryBytes) {
              reject(new Error("ZIP entry is too large"));
              zipfile.close();
              return;
            }
            totalBytes += data.length;
            if (totalBytes > maxTotalBytes) {
              reject(new Error("ZIP total size is too large"));
              zipfile.close();
              return;
            }
            entries.push({ name: entry.fileName, data });
            zipfile.readEntry();
          });
        });
      });
      zipfile.on("end", () => resolve(entries));
      zipfile.on("error", reject);
    });
  });
}

export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
