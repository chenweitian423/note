"use client";

import { formatBackupDate, formatBytes } from "./dialog-format";
import type { NoteWorkspace } from "./use-note-workspace";

export function BackupDialogs({ workspace }: { workspace: NoteWorkspace }) {
  const {
    backupDeleteTarget,
    backupDialogOpen,
    backups,
    backupStatus,
    backupSummary,
    backupVerifyResults,
    confirmImportZip,
    createBackupArchive,
    deleteBackupArchive,
    health,
    importPreview,
    importing,
    pendingImportFile,
    restoreBackupZip,
    setBackupDeleteTarget,
    setBackupDialogOpen,
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
    </>
  );
}
