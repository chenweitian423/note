import { Readable } from "node:stream";
import yauzl from "yauzl";

export type ZipEntry = {
  name: string;
  data: Buffer;
};

export async function readZipEntries(zipBuffer: Buffer): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (zipError, zipfile) => {
      if (zipError || !zipfile) {
        reject(zipError ?? new Error("无法读取 ZIP"));
        return;
      }

      const entries: ZipEntry[] = [];
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
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
            entries.push({ name: entry.fileName, data: Buffer.concat(chunks) });
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
