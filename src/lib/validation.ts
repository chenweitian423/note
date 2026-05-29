import { z } from "zod";
import { byteLength, DEFAULT_MAX_NOTE_CONTENT_BYTES, envNumber } from "./limits";

export function maxNoteContentBytes(): number {
  return envNumber("MAX_NOTE_CONTENT_BYTES", DEFAULT_MAX_NOTE_CONTENT_BYTES);
}

export const noteContentSchema = z
  .string()
  .refine((value) => byteLength(value) <= maxNoteContentBytes(), "笔记正文过大");
