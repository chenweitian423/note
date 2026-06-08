"use client";

import { useState } from "react";
import { withoutSecret, type ApiKey, type CreatedApiKey } from "./note-workspace-model";

export function useApiKeyManager() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyName, setApiKeyName] = useState("curl");
  const [newApiKey, setNewApiKey] = useState<CreatedApiKey | null>(null);
  const [copiedApiKeyId, setCopiedApiKeyId] = useState("");

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

  return {
    apiKeyDialogOpen,
    setApiKeyDialogOpen,
    apiKeys,
    apiKeyName,
    setApiKeyName,
    newApiKey,
    copiedApiKeyId,
    openApiKeyDialog,
    createApiKey,
    deleteApiKey,
    copyNewApiKey
  };
}
