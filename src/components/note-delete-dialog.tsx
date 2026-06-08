"use client";

import { NoteShellDialog } from "./note-shell-dialogs";
import type { NoteWorkspace } from "./use-note-workspace";

export function NoteDeleteDialog({ workspace }: { workspace: NoteWorkspace }) {
  const { deleteSelectedNotePermanently, noteDeleteTarget, setNoteDeleteTarget } = workspace;

  if (!noteDeleteTarget) return null;

  return (
    <NoteShellDialog
      label="确认删除笔记"
      title="确认删除笔记"
      closeLabel="关闭确认删除笔记"
      onClose={() => setNoteDeleteTarget(null)}
      className="api-key-dialog confirm-dialog"
    >
      <div className="api-key-list">
        <article className="api-key-item compact">
          <div className="api-key-meta">
            <strong>
              {noteDeleteTarget.length === 1 ? noteDeleteTarget[0].title : `将永久删除 ${noteDeleteTarget.length} 篇笔记`}
            </strong>
            {noteDeleteTarget.slice(0, 5).map((note) => (
              <span key={note.id}>
                {note.noteNumber} {note.title}
              </span>
            ))}
            {noteDeleteTarget.length > 5 ? <span>还有 {noteDeleteTarget.length - 5} 篇未显示</span> : null}
            <span>永久删除后不可恢复，相关附件记录也会一并清理。</span>
          </div>
        </article>
      </div>
      <div className="api-key-actions confirm-actions">
        <button className="text-action" onClick={() => setNoteDeleteTarget(null)}>
          取消
        </button>
        <button className="text-action danger-action" onClick={deleteSelectedNotePermanently}>
          确认删除
        </button>
      </div>
    </NoteShellDialog>
  );
}
