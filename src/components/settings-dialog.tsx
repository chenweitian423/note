"use client";

import { Database, KeyRound, Upload } from "lucide-react";
import type { NoteWorkspace } from "./use-note-workspace";

export function SettingsDialog({ workspace }: { workspace: NoteWorkspace }) {
  const {
    health,
    importZip,
    openApiKeyDialog,
    openBackupDialog,
    setSettingsDialogOpen,
    settingsDialogOpen
  } = workspace;

  if (!settingsDialogOpen) return null;

  return (
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
  );
}
