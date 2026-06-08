"use client";

import { Download, Upload } from "lucide-react";
import { MarkdownView } from "@/lib/markdown";
import type { NoteWorkspace } from "./use-note-workspace";

export function NotePreviewPane({ workspace }: { workspace: NoteWorkspace }) {
  const { activeMobilePane, content, selectedId, selectedNote, uploadAttachment } = workspace;

  return (
    <aside className={`preview-pane ${activeMobilePane === "preview" ? "active-pane" : ""}`}>
      <div className="preview-scroll">
        <MarkdownView content={content} />
      </div>
      <div className="attachments">
        <div className="attachments-title">
          <span>附件</span>
          <label className="icon-button" title="上传附件" aria-label="上传附件">
            <Upload size={17} />
            <input type="file" onChange={uploadAttachment} disabled={!selectedId} />
          </label>
        </div>
        {(selectedNote?.attachments ?? []).map((attachment) => (
          <div key={attachment.id} className="attachment-row">
            <span>{attachment.filename}</span>
            <a
              className="attachment-download"
              href={`/api/attachments/${attachment.id}/download`}
              title="下载附件"
              aria-label={`下载 ${attachment.filename}`}
            >
              <Download size={15} />
            </a>
          </div>
        ))}
      </div>
    </aside>
  );
}
