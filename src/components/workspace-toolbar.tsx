"use client";

import { Archive, Download, FilePlus2, LogOut, Settings } from "lucide-react";
import type { NoteWorkspace } from "./use-note-workspace";

export function WorkspaceToolbar({ workspace }: { workspace: NoteWorkspace }) {
  const { createNewNote, exportZip, logout, openSettingsDialog, showArchived, toggleArchiveBox } = workspace;

  return (
    <div className="topbar">
      <button title="新建笔记" aria-label="新建笔记" onClick={createNewNote}>
        <FilePlus2 size={18} />
      </button>
      <button title="导出" aria-label="导出" onClick={exportZip}>
        <Download size={18} />
      </button>
      <button
        title={showArchived ? "返回当前笔记" : "归档箱"}
        aria-label={showArchived ? "返回当前笔记" : "归档箱"}
        className={showArchived ? "active-tool" : undefined}
        onClick={toggleArchiveBox}
      >
        <Archive size={18} />
      </button>
      <button title="设置" aria-label="设置和状态" onClick={openSettingsDialog}>
        <Settings size={18} />
      </button>
      <button title="退出登录" aria-label="退出登录" onClick={logout}>
        <LogOut size={18} />
      </button>
    </div>
  );
}
