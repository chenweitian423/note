"use client";

import { Archive, ArchiveRestore, Bold, Code2, Heading1, Image, Link, List, Trash2 } from "lucide-react";
import type { NoteWorkspace } from "./use-note-workspace";

const CODE_LANGUAGES = [
  { value: "text", label: "Plain Text" },
  { value: "bash", label: "Bash" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "nginx", label: "Nginx" }
];

export function NoteEditorPane({ workspace }: { workspace: NoteWorkspace }) {
  const {
    activeMobilePane,
    archiveSelectedNote,
    codeLanguage,
    content,
    createNewNote,
    dirtySinceSelect,
    insertCodeBlock,
    insertSnippet,
    restoreSelectedNote,
    saveState,
    selectedNote,
    setActiveMobilePane,
    setCodeLanguage,
    setContent,
    setNoteDeleteTarget,
    setTitle,
    showArchived,
    textareaRef,
    title
  } = workspace;

  return (
    <section className={`editor-pane ${activeMobilePane === "editor" ? "active-pane" : ""}`}>
      <div className="mobile-tabs">
        <button onClick={() => setActiveMobilePane("list")}>列表</button>
        <button onClick={() => setActiveMobilePane("editor")}>编辑</button>
        <button onClick={() => setActiveMobilePane("preview")}>预览</button>
      </div>
      {selectedNote ? (
        <>
          <div className="editor-header">
            <input
              aria-label="标题"
              value={title}
              onChange={(event) => {
                dirtySinceSelect.current = true;
                setTitle(event.target.value);
              }}
            />
            {showArchived ? (
              <>
                <button title="恢复" aria-label="恢复归档" onClick={restoreSelectedNote}>
                  <ArchiveRestore size={18} />
                </button>
                <button title="永久删除" aria-label="永久删除笔记" onClick={() => setNoteDeleteTarget([selectedNote])}>
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <button title="归档" aria-label="归档" onClick={archiveSelectedNote}>
                <Archive size={18} />
              </button>
            )}
          </div>
          <div className="formatbar">
            <button title="标题" aria-label="插入标题" onClick={() => insertSnippet("# ", "")}>
              <Heading1 size={17} />
            </button>
            <button title="粗体" aria-label="插入粗体" onClick={() => insertSnippet("**", "**")}>
              <Bold size={17} />
            </button>
            <button title="列表" aria-label="插入列表" onClick={() => insertSnippet("- ", "")}>
              <List size={17} />
            </button>
            <button title="链接" aria-label="插入链接" onClick={() => insertSnippet("[", "](https://)")}>
              <Link size={17} />
            </button>
            <button title="图片" aria-label="插入图片" onClick={() => insertSnippet("![", "](图片地址)")}>
              <Image size={17} />
            </button>
            <select
              className="code-language-select"
              aria-label="代码块类型"
              value={codeLanguage}
              onChange={(event) => setCodeLanguage(event.target.value)}
            >
              {CODE_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button title="代码块" aria-label="插入代码块" onClick={insertCodeBlock}>
              <Code2 size={17} />
            </button>
            <span>{saveState === "saving" ? "保存中" : saveState === "error" ? "保存失败" : "已保存"}</span>
          </div>
          <textarea
            ref={textareaRef}
            aria-label="正文"
            value={content}
            onChange={(event) => {
              dirtySinceSelect.current = true;
              setContent(event.target.value);
            }}
          />
        </>
      ) : (
        <div className="empty-state">
          <button onClick={createNewNote}>新建笔记</button>
        </div>
      )}
    </section>
  );
}
