"use client";

import type { NoteWorkspace } from "./use-note-workspace";
import { WorkspaceToolbar } from "./workspace-toolbar";

export function NoteSidebar({ workspace }: { workspace: NoteWorkspace }) {
  const {
    activeMobilePane,
    archiveSelectedNotes,
    checkedNotes,
    importing,
    loadNotes,
    notes,
    query,
    restoreSelectedNotes,
    selectedId,
    selectedNoteIds,
    selectAllVisibleNotes,
    selectNote,
    setActiveMobilePane,
    setNoteDeleteTarget,
    setQuery,
    showArchived,
    toggleNoteSelection
  } = workspace;

  return (
    <aside className={`sidebar ${activeMobilePane === "list" ? "active-pane" : ""}`}>
      <WorkspaceToolbar workspace={workspace} />
      <input
        className="search"
        placeholder="搜索标题或正文"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          void loadNotes(event.target.value, showArchived);
        }}
      />
      {showArchived ? <p className="status-line">归档箱：这些笔记没有删除，可恢复或永久删除。</p> : null}
      {importing ? <p className="status-line">正在导入...</p> : null}
      {notes.length > 0 ? (
        <div className="bulk-note-actions">
          <label className="note-select-all">
            <input
              type="checkbox"
              aria-label="选择全部可见笔记"
              checked={selectedNoteIds.length > 0 && selectedNoteIds.length === notes.length}
              onChange={(event) => selectAllVisibleNotes(event.target.checked)}
            />
            <span>已选 {selectedNoteIds.length}</span>
          </label>
          {showArchived ? (
            <>
              <button className="text-action" disabled={selectedNoteIds.length === 0} onClick={restoreSelectedNotes}>
                批量恢复
              </button>
              <button
                className="text-action danger-action"
                disabled={selectedNoteIds.length === 0}
                onClick={() => setNoteDeleteTarget(checkedNotes)}
              >
                批量永久删除
              </button>
            </>
          ) : (
            <button className="text-action" disabled={selectedNoteIds.length === 0} onClick={archiveSelectedNotes}>
              批量归档
            </button>
          )}
        </div>
      ) : null}
      <div className="note-list">
        {notes.map((note) => (
          <div key={note.id} className={note.id === selectedId ? "note-row selected" : "note-row"}>
            <input
              type="checkbox"
              className="note-checkbox"
              aria-label={`选择 ${note.title}`}
              checked={selectedNoteIds.includes(note.id)}
              onChange={(event) => toggleNoteSelection(note.id, event.target.checked)}
            />
            <button
              className="note-item"
              onClick={() => {
                selectNote(note);
                setActiveMobilePane("editor");
              }}
            >
              <strong>
                <span className="note-number">{note.noteNumber}</span>
                {note.title}
              </strong>
              <span>{new Date(note.updatedAt).toLocaleString("zh-CN")}</span>
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
