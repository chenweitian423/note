"use client";

import { Check, Copy, Database, KeyRound, Trash2, Upload } from "lucide-react";
import { NoteShellDialog } from "./note-shell-dialogs";
import type { NoteWorkspace } from "./use-note-workspace";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatBackupDate(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂无";
}

export function NoteDialogsPanel({ workspace }: { workspace: NoteWorkspace }) {
  const {
    apiKeyDialogOpen,
    apiKeyName,
    apiKeys,
    backupDeleteTarget,
    backupDialogOpen,
    backups,
    backupStatus,
    backupSummary,
    backupVerifyResults,
    confirmImportZip,
    copiedApiKeyId,
    copyNewApiKey,
    createApiKey,
    createBackupArchive,
    deleteApiKey,
    deleteBackupArchive,
    deleteSelectedNotePermanently,
    health,
    importPreview,
    importing,
    importZip,
    newApiKey,
    noteDeleteTarget,
    openApiKeyDialog,
    openBackupDialog,
    pendingImportFile,
    restoreBackupZip,
    setApiKeyDialogOpen,
    setApiKeyName,
    setBackupDeleteTarget,
    setBackupDialogOpen,
    setNoteDeleteTarget,
    setSettingsDialogOpen,
    settingsDialogOpen,
    verifyBackupArchive
  } = workspace;

  function renderImportPreview() {
    if (!importPreview) return null;

    return (
      <article className="api-key-item compact">
        <div className="api-key-meta">
          <strong>{importPreview.valid ? "校验通过" : "校验失败"}</strong>
          {importPreview.valid ? (
            <>
              <span>来源 {importPreview.app ?? "未知应用"}</span>
              <span>导出时间 {new Date(importPreview.exportedAt).toLocaleString("zh-CN")}</span>
              <span>
                {importPreview.noteCount} 篇笔记 · {importPreview.attachmentCount} 个附件
              </span>
              <span>checksum {importPreview.checksumValid ? "可恢复" : "未提供"}</span>
            </>
          ) : (
            <span>{importPreview.error}</span>
          )}
        </div>
        <div className="api-key-actions">
          <button className="text-action" onClick={workspace.cancelImportZip}>
            取消导入
          </button>
          {importPreview.valid ? (
            <button className="text-action" onClick={confirmImportZip} disabled={importing || !pendingImportFile}>
              确认导入
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <>
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
            {importPreview ? <div className="api-key-list">{renderImportPreview()}</div> : null}
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
              {backups.map((backup) => {
                const verifyResult = backupVerifyResults[backup.filename];
                return (
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
                      <button className="text-action" onClick={() => verifyBackupArchive(backup)}>
                        校验这份备份
                      </button>
                      <button
                        className="text-action"
                        aria-label={`删除 ${backup.filename}`}
                        onClick={() => setBackupDeleteTarget(backup)}
                      >
                        删除这份备份
                      </button>
                    </div>
                    {verifyResult ? (
                      <div className="api-key-meta">
                        <span>
                          {verifyResult.valid
                            ? `可恢复：${verifyResult.noteCount} 篇笔记，${verifyResult.attachmentCount} 个附件`
                            : `不可恢复：${verifyResult.error}`}
                        </span>
                      </div>
                    ) : null}
                  </article>
                );
              })}
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
              <button aria-label="关闭确认删除" onClick={() => setBackupDeleteTarget(null)}>
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
      {noteDeleteTarget ? (
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
    </>
  );
}
