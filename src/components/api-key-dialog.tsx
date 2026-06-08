"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import type { NoteWorkspace } from "./use-note-workspace";

export function ApiKeyDialog({ workspace }: { workspace: NoteWorkspace }) {
  const {
    apiKeyDialogOpen,
    apiKeyName,
    apiKeys,
    copiedApiKeyId,
    copyNewApiKey,
    createApiKey,
    deleteApiKey,
    newApiKey,
    setApiKeyDialogOpen,
    setApiKeyName
  } = workspace;

  if (!apiKeyDialogOpen) return null;

  return (
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
  );
}
