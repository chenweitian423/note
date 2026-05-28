"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bold,
  Check,
  Code2,
  Copy,
  Download,
  FilePlus2,
  Heading1,
  Image,
  KeyRound,
  Link,
  List,
  LogOut,
  Trash2,
  Upload
} from "lucide-react";
import { MarkdownView } from "@/lib/markdown";

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

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Attachment = {
  id: string;
  filename: string;
  size: number;
};

type Note = {
  id: string;
  noteNumber: string;
  title: string;
  content: string;
  updatedAt: string;
  tags: Tag[];
  attachments: Attachment[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function normalizeNote(note: Note): Note {
  return {
    ...note,
    tags: note.tags ?? [],
    attachments: note.attachments ?? []
  };
}

export function NoteShell() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [codeLanguage, setCodeLanguage] = useState("bash");
  const [activeMobilePane, setActiveMobilePane] = useState<"list" | "editor" | "preview">("editor");
  const [importing, setImporting] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyName, setApiKeyName] = useState("curl");
  const [copiedApiKeyId, setCopiedApiKeyId] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const firstLoad = useRef(true);

  useEffect(() => {
    void loadNotes();
  }, []);

  useEffect(() => {
    if (selectedNote) {
      firstLoad.current = true;
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      queueMicrotask(() => {
        firstLoad.current = false;
      });
    }
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!selectedId || firstLoad.current) return;
    setSaveState("saving");
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/notes/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      const data = (await response.json()) as { note: Note };
      const nextNote = normalizeNote(data.note);
      setNotes((current) => current.map((note) => (note.id === nextNote.id ? nextNote : note)));
      setSaveState("saved");
    }, 600);
    return () => window.clearTimeout(handle);
  }, [title, content, selectedId]);

  async function loadNotes(search = query) {
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    const response = await fetch(`/api/notes${params}`);
    if (!response.ok) return;
    const data = (await response.json()) as { notes: Note[] };
    const nextNotes = data.notes.map(normalizeNote);
    setNotes(nextNotes);
    const requestedNoteNumber = new URLSearchParams(window.location.search).get("note");
    const requestedNote = requestedNoteNumber
      ? nextNotes.find((note) => note.noteNumber.toLowerCase() === requestedNoteNumber.toLowerCase())
      : null;
    if (!selectedId && (requestedNote ?? nextNotes[0])) {
      setSelectedId((requestedNote ?? nextNotes[0]).id);
    }
  }

  async function createNewNote() {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "未命名笔记", content: "# 新笔记\n\n开始记录..." })
    });
    if (!response.ok) return;
    const data = (await response.json()) as { note: Note };
    const note = normalizeNote(data.note);
    setNotes((current) => [note, ...current]);
    selectNote(note);
    setActiveMobilePane("editor");
  }

  function selectNote(note: Note) {
    setSelectedId(note.id);
    const url = new URL(window.location.href);
    url.searchParams.set("note", note.noteNumber);
    window.history.replaceState(null, "", url.toString());
  }

  async function archiveSelectedNote() {
    if (!selectedId) return;
    await fetch(`/api/notes/${selectedId}`, { method: "DELETE" });
    setNotes((current) => current.filter((note) => note.id !== selectedId));
    setSelectedId("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function insertSnippet(before: string, after = "") {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${before}${selected || "文本"}${after}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  function insertCodeBlock() {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = content.slice(start, end).trimEnd();
    const code = selected || "在这里输入代码";
    const prefix = start > 0 && !content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < content.length && !content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const block = `${prefix}\`\`\`${codeLanguage}\n${code}\n\`\`\`${suffix}`;
    const next = `${content.slice(0, start)}${block}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => input.focus());
  }

  async function exportZip() {
    window.location.href = "/api/export";
  }

  async function importZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", file);
    await fetch("/api/import", { method: "POST", body: form });
    setImporting(false);
    await loadNotes("");
    event.target.value = "";
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    const form = new FormData();
    form.set("noteId", selectedId);
    form.set("file", file);
    await fetch("/api/attachments", { method: "POST", body: form });
    await loadNotes();
    event.target.value = "";
  }

  async function openApiKeyDialog() {
    setApiKeyDialogOpen(true);
    await loadApiKeys();
  }

  async function loadApiKeys() {
    const response = await fetch("/api/api-keys");
    if (!response.ok) return;
    const data = (await response.json()) as { apiKeys: ApiKey[] };
    setApiKeys(data.apiKeys);
  }

  async function createApiKey() {
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: apiKeyName })
    });
    if (!response.ok) return;
    const data = (await response.json()) as { apiKey: ApiKey };
    setApiKeys((current) => [data.apiKey, ...current]);
  }

  async function deleteApiKey(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((current) => current.filter((apiKey) => apiKey.id !== id));
  }

  async function copyApiKey(apiKey: ApiKey) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(apiKey.key);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = apiKey.key;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiedApiKeyId(apiKey.id);
    window.setTimeout(() => setCopiedApiKeyId(""), 1200);
  }

  return (
    <main className="workspace">
      <aside className={`sidebar ${activeMobilePane === "list" ? "active-pane" : ""}`}>
        <div className="topbar">
          <button title="新建笔记" aria-label="新建笔记" onClick={createNewNote}>
            <FilePlus2 size={18} />
          </button>
          <button title="导出" aria-label="导出" onClick={exportZip}>
            <Download size={18} />
          </button>
          <button title="API Key" aria-label="API Key" onClick={openApiKeyDialog}>
            <KeyRound size={18} />
          </button>
          <label className="icon-button" title="导入" aria-label="导入">
            <Upload size={18} />
            <input type="file" accept=".zip,application/zip" onChange={importZip} />
          </label>
          <button title="退出登录" aria-label="退出登录" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
        <input
          className="search"
          placeholder="搜索标题或正文"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            void loadNotes(event.target.value);
          }}
        />
        {importing ? <p className="status-line">正在导入...</p> : null}
        <div className="note-list">
          {notes.map((note) => (
            <button
              key={note.id}
              className={note.id === selectedId ? "note-item selected" : "note-item"}
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
          ))}
        </div>
      </aside>

      <section className={`editor-pane ${activeMobilePane === "editor" ? "active-pane" : ""}`}>
        <div className="mobile-tabs">
          <button onClick={() => setActiveMobilePane("list")}>列表</button>
          <button onClick={() => setActiveMobilePane("editor")}>编辑</button>
          <button onClick={() => setActiveMobilePane("preview")}>预览</button>
        </div>
        {selectedNote ? (
          <>
            <div className="editor-header">
              <input aria-label="标题" value={title} onChange={(event) => setTitle(event.target.value)} />
              <button title="归档" aria-label="归档" onClick={archiveSelectedNote}>
                <Archive size={18} />
              </button>
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
              onChange={(event) => setContent(event.target.value)}
            />
          </>
        ) : (
          <div className="empty-state">
            <button onClick={createNewNote}>新建笔记</button>
          </div>
        )}
      </section>

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
              {attachment.filename}
            </div>
          ))}
        </div>
      </aside>
      {apiKeyDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="api-key-dialog" role="dialog" aria-modal="true" aria-label="API Key 管理">
            <div className="dialog-header">
              <h2>API Key 管理</h2>
              <button aria-label="关闭" onClick={() => setApiKeyDialogOpen(false)}>
                ×
              </button>
            </div>
            <div className="api-key-create">
              <input
                aria-label="API Key 名称"
                value={apiKeyName}
                onChange={(event) => setApiKeyName(event.target.value)}
                placeholder="名称，例如 curl"
              />
              <button onClick={createApiKey}>创建</button>
            </div>
            <div className="api-key-list">
              {apiKeys.map((apiKey) => (
                <article key={apiKey.id} className="api-key-item">
                  <div className="api-key-meta">
                    <strong>{apiKey.name}</strong>
                    <span>创建于 {new Date(apiKey.createdAt).toLocaleString("zh-CN")}</span>
                    {apiKey.lastUsedAt ? (
                      <span>上次使用 {new Date(apiKey.lastUsedAt).toLocaleString("zh-CN")}</span>
                    ) : null}
                  </div>
                  <code>{apiKey.key}</code>
                  <div className="api-key-actions">
                    <button title="复制" aria-label={`复制 ${apiKey.name}`} onClick={() => copyApiKey(apiKey)}>
                      {copiedApiKeyId === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button title="删除" aria-label={`删除 ${apiKey.name}`} onClick={() => deleteApiKey(apiKey.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
              {apiKeys.length === 0 ? <p className="status-line">还没有 API Key。</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
