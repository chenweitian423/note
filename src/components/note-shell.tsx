"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bold,
  Check,
  Code2,
  Copy,
  Database,
  Download,
  FilePlus2,
  Heading1,
  Image,
  KeyRound,
  Link,
  List,
  LogOut,
  Settings,
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
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type CreatedApiKey = ApiKey & {
  key: string;
};

type Backup = {
  filename: string;
  size: number;
  createdAt: string;
};

type BackupSummary = {
  count: number;
  totalSize: number;
  retention: number;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
};

type AutoBackupStatus = {
  enabled: boolean;
  intervalHours: number;
  retention: number;
  running: boolean;
  latestBackupCreatedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

type HealthStatus = {
  ok: boolean;
  version: string;
  checkedAt: string;
  checks: Record<string, boolean>;
  autoBackup: AutoBackupStatus;
};

function normalizeNote(note: Note): Note {
  return {
    ...note,
    tags: note.tags ?? [],
    attachments: note.attachments ?? []
  };
}

function withoutSecret(apiKey: CreatedApiKey): ApiKey {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keySuffix: apiKey.keySuffix,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt
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
  const [newApiKey, setNewApiKey] = useState<CreatedApiKey | null>(null);
  const [copiedApiKeyId, setCopiedApiKeyId] = useState("");
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupDeleteTarget, setBackupDeleteTarget] = useState<Backup | null>(null);
  const [backupStatus, setBackupStatus] = useState("");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
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
    const response = await fetch("/api/import", { method: "POST", body: form });
    setImporting(false);
    if (!response.ok) return;
    await loadNotes("");
    event.target.value = "";
  }

  async function restoreBackupZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBackupStatus("正在导入备份 ZIP...");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/import", { method: "POST", body: form });
    event.target.value = "";
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setBackupStatus(data?.error ? `导入失败：${data.error}` : "导入失败");
      return;
    }
    await loadNotes("");
    setBackupStatus("备份 ZIP 已导入");
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

  async function openBackupDialog() {
    setBackupDialogOpen(true);
    await Promise.all([loadBackups(), loadHealth()]);
  }

  async function openSettingsDialog() {
    setSettingsDialogOpen(true);
    await loadHealth();
  }

  async function loadHealth() {
    const response = await fetch("/api/health");
    if (!response.ok) return;
    setHealth((await response.json()) as HealthStatus);
  }

  async function loadBackups() {
    const response = await fetch("/api/backups");
    if (!response.ok) return;
    const data = (await response.json()) as { backups: Backup[]; summary: BackupSummary };
    setBackups(data.backups);
    setBackupSummary(data.summary);
  }

  async function createBackupArchive() {
    setBackupStatus("正在创建备份...");
    const response = await fetch("/api/backups", { method: "POST" });
    if (!response.ok) {
      setBackupStatus("备份失败");
      return;
    }
    const data = (await response.json()) as { backup: Backup };
    setBackups((current) => {
      const nextBackups = [data.backup, ...current.filter((backup) => backup.filename !== data.backup.filename)];
      setBackupSummary(summarizeBackupList(nextBackups, backupSummary?.retention ?? 10));
      return nextBackups;
    });
    setBackupStatus("备份已创建");
  }

  async function deleteBackupArchive() {
    if (!backupDeleteTarget) return;
    const backup = backupDeleteTarget;
    const response = await fetch(`/api/backups/${encodeURIComponent(backup.filename)}`, { method: "DELETE" });
    if (!response.ok) {
      setBackupStatus("删除备份失败");
      return;
    }
    setBackups((current) => {
      const nextBackups = current.filter((item) => item.filename !== backup.filename);
      setBackupSummary(summarizeBackupList(nextBackups, backupSummary?.retention ?? 10));
      return nextBackups;
    });
    setBackupDeleteTarget(null);
    setBackupStatus("备份已删除");
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
    const data = (await response.json()) as { apiKey: CreatedApiKey };
    setNewApiKey(data.apiKey);
    setApiKeys((current) => [withoutSecret(data.apiKey), ...current]);
  }

  async function deleteApiKey(id: string) {
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((current) => current.filter((apiKey) => apiKey.id !== id));
  }

  async function copyText(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  async function copyNewApiKey(apiKey: CreatedApiKey) {
    await copyText(apiKey.key);
    setCopiedApiKeyId(apiKey.id);
    window.setTimeout(() => setCopiedApiKeyId(""), 1200);
  }

  function formatBytes(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  function summarizeBackupList(items: Backup[], retention: number): BackupSummary {
    const createdTimes = items.map((backup) => backup.createdAt).sort();
    return {
      count: items.length,
      totalSize: items.reduce((total, backup) => total + backup.size, 0),
      retention,
      oldestCreatedAt: createdTimes[0] ?? null,
      newestCreatedAt: createdTimes.at(-1) ?? null
    };
  }

  function formatBackupDate(value: string | null) {
    return value ? new Date(value).toLocaleString("zh-CN") : "暂无";
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
          <button title="设置" aria-label="设置和状态" onClick={openSettingsDialog}>
            <Settings size={18} />
          </button>
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
      {backupDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="api-key-dialog" role="dialog" aria-modal="true" aria-label="备份管理">
            <div className="dialog-header">
              <h2>备份管理</h2>
              <button aria-label="关闭" onClick={() => setBackupDialogOpen(false)}>
                ×
              </button>
            </div>
            <div className="api-key-create">
              <button onClick={createBackupArchive}>创建备份</button>
              <a className="text-action" href="/api/backups/latest">
                下载最新备份
              </a>
              <label className="text-action backup-restore-action" aria-label="导入备份 ZIP">
                导入备份 ZIP
                <input type="file" accept=".zip,application/zip" onChange={restoreBackupZip} />
              </label>
              {backupStatus ? <span className="status-line">{backupStatus}</span> : null}
            </div>
            <div className="settings-grid backup-summary">
              <div>
                <span>备份总数</span>
                <strong>{backupSummary?.count ?? backups.length}</strong>
              </div>
              <div>
                <span>总占用空间</span>
                <strong>{formatBytes(backupSummary?.totalSize ?? backups.reduce((total, backup) => total + backup.size, 0))}</strong>
              </div>
              <div>
                <span>保留策略</span>
                <strong>最近 {backupSummary?.retention ?? 10} 份</strong>
              </div>
              <div>
                <span>最早备份</span>
                <strong>{formatBackupDate(backupSummary?.oldestCreatedAt ?? null)}</strong>
              </div>
              <div>
                <span>最新备份</span>
                <strong>{formatBackupDate(backupSummary?.newestCreatedAt ?? null)}</strong>
              </div>
            </div>
            <div className="settings-grid backup-summary auto-backup-summary">
              <div>
                <span>自动备份</span>
                <strong>{health?.autoBackup.enabled ? "已开启" : "未开启"}</strong>
              </div>
              <div>
                <span>备份间隔</span>
                <strong>{health?.autoBackup.enabled ? `${health.autoBackup.intervalHours} 小时` : "未设置"}</strong>
              </div>
              <div>
                <span>最近自动备份</span>
                <strong>{formatBackupDate(health?.autoBackup.lastRunAt ?? null)}</strong>
              </div>
              <div>
                <span>运行状态</span>
                <strong>{health?.autoBackup.running ? "运行中" : "空闲"}</strong>
              </div>
              <div>
                <span>最近失败</span>
                <strong>{health?.autoBackup.lastError ?? "无"}</strong>
              </div>
            </div>
            <div className="api-key-list">
              {backups.map((backup) => (
                <article key={backup.filename} className="api-key-item">
                  <div className="api-key-meta">
                    <strong>{backup.filename}</strong>
                    <span>
                      {new Date(backup.createdAt).toLocaleString("zh-CN")} · {formatBytes(backup.size)}
                    </span>
                  </div>
                  <div className="api-key-actions">
                    <a className="text-action" href={`/api/backups/${encodeURIComponent(backup.filename)}`}>
                      下载这份备份
                    </a>
                    <button
                      className="text-action"
                      aria-label={`删除 ${backup.filename}`}
                      onClick={() => setBackupDeleteTarget(backup)}
                    >
                      删除这份备份
                    </button>
                  </div>
                </article>
              ))}
              {backups.length === 0 ? <p className="status-line">还没有备份。</p> : null}
            </div>
          </section>
        </div>
      ) : null}
      {backupDeleteTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section className="api-key-dialog confirm-dialog" role="dialog" aria-modal="true" aria-label="确认删除备份">
            <div className="dialog-header">
              <h2>确认删除</h2>
              <button aria-label="取消" onClick={() => setBackupDeleteTarget(null)}>
                ×
              </button>
            </div>
            <div className="api-key-list">
              <article className="api-key-item compact">
                <div className="api-key-meta">
                  <strong>{backupDeleteTarget.filename}</strong>
                  <span>创建时间 {new Date(backupDeleteTarget.createdAt).toLocaleString("zh-CN")}</span>
                  <span>文件大小 {formatBytes(backupDeleteTarget.size)}</span>
                </div>
              </article>
            </div>
            <div className="api-key-actions confirm-actions">
              <button className="text-action" onClick={() => setBackupDeleteTarget(null)}>
                取消
              </button>
              <button className="text-action danger-action" onClick={deleteBackupArchive}>
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {settingsDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="api-key-dialog" role="dialog" aria-modal="true" aria-label="设置和状态">
            <div className="dialog-header">
              <h2>设置和状态</h2>
              <button aria-label="关闭" onClick={() => setSettingsDialogOpen(false)}>
                ×
              </button>
            </div>
            <div className="settings-grid">
              <div>
                <span>当前版本</span>
                <strong>{health?.version ?? "读取中..."}</strong>
              </div>
              <div>
                <span>健康状态</span>
                <strong>{health?.ok ? "正常" : health ? "异常" : "读取中..."}</strong>
              </div>
              <div>
                <span>检查时间</span>
                <strong>{health ? new Date(health.checkedAt).toLocaleString("zh-CN") : "读取中..."}</strong>
              </div>
            </div>
            {health ? (
              <div className="api-key-list">
                {Object.entries(health.checks).map(([name, ok]) => (
                  <article key={name} className="api-key-item compact">
                    <div className="api-key-meta">
                      <strong>{name}</strong>
                      <span>{ok ? "可写" : "不可写"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="settings-actions">
              <button
                onClick={() => {
                  setSettingsDialogOpen(false);
                  void openApiKeyDialog();
                }}
              >
                <KeyRound size={16} />
                API Key
              </button>
              <button
                onClick={() => {
                  setSettingsDialogOpen(false);
                  void openBackupDialog();
                }}
              >
                <Database size={16} />
                备份管理
              </button>
              <label className="text-action backup-restore-action" aria-label="导入 ZIP">
                <Upload size={16} />
                导入 ZIP
                <input type="file" accept=".zip,application/zip" onChange={importZip} />
              </label>
              <a
                className="text-action"
                href="https://github.com/chenweitian423/note/blob/master/docs/curl-api-usage.md"
                target="_blank"
                rel="noreferrer"
              >
                curl 文档
              </a>
            </div>
          </section>
        </div>
      ) : null}
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
            {newApiKey ? (
              <article className="api-key-item api-key-once">
                <div className="api-key-meta">
                  <strong>新 API Key 只显示一次</strong>
                  <span>请立即复制保存，关闭后只能看到尾号。</span>
                </div>
                <code>{newApiKey.key}</code>
                <div className="api-key-actions">
                  <button title="复制" aria-label={`复制 ${newApiKey.name}`} onClick={() => copyNewApiKey(newApiKey)}>
                    {copiedApiKeyId === newApiKey.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </article>
            ) : null}
            <div className="api-key-list">
              {apiKeys.map((apiKey) => (
                <article key={apiKey.id} className="api-key-item">
                  <div className="api-key-meta">
                    <strong>{apiKey.name}</strong>
                    <span>尾号 {apiKey.keySuffix || "旧密钥"}</span>
                    <span>创建于 {new Date(apiKey.createdAt).toLocaleString("zh-CN")}</span>
                    {apiKey.lastUsedAt ? (
                      <span>上次使用 {new Date(apiKey.lastUsedAt).toLocaleString("zh-CN")}</span>
                    ) : null}
                  </div>
                  <div className="api-key-actions">
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
