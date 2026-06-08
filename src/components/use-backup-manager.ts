"use client";

import { ChangeEvent, useState } from "react";
import {
  summarizeBackupList,
  type Backup,
  type BackupSummary,
  type HealthStatus,
  type ImportPreview
} from "./note-workspace-model";

type BackupManagerOptions = {
  loadNotes: (search?: string) => Promise<void>;
};

export function useBackupManager({ loadNotes }: BackupManagerOptions) {
  const [importing, setImporting] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupDeleteTarget, setBackupDeleteTarget] = useState<Backup | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [backupVerifyResults, setBackupVerifyResults] = useState<Record<string, ImportPreview>>({});
  const [backupStatus, setBackupStatus] = useState("");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  async function importZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: form });
    const preview = (await response.json().catch(() => ({ valid: false, error: "ZIP 校验失败" }))) as ImportPreview;
    setImporting(false);
    setPendingImportFile(file);
    setImportPreview(preview);
    event.target.value = "";
  }

  async function restoreBackupZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBackupStatus("正在校验备份 ZIP...");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: form });
    const preview = (await response.json().catch(() => ({ valid: false, error: "ZIP 校验失败" }))) as ImportPreview;
    event.target.value = "";
    setPendingImportFile(file);
    setImportPreview(preview);
    if (!preview.valid) {
      setBackupStatus(`校验失败：${preview.error}`);
      return;
    }
    setBackupStatus("校验通过，等待确认导入");
  }

  async function confirmImportZip() {
    if (!pendingImportFile) return;
    setImporting(true);
    const form = new FormData();
    form.set("file", pendingImportFile);
    const response = await fetch("/api/import", { method: "POST", body: form });
    setImporting(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setImportPreview({ valid: false, error: data?.error ?? "导入失败" });
      setBackupStatus(data?.error ? `导入失败：${data.error}` : "导入失败");
      return;
    }
    await loadNotes("");
    setPendingImportFile(null);
    setImportPreview(null);
    setBackupStatus("ZIP 已导入");
  }

  function cancelImportZip() {
    setPendingImportFile(null);
    setImportPreview(null);
    setBackupStatus("");
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

  async function verifyBackupArchive(backup: Backup) {
    setBackupStatus(`正在校验 ${backup.filename}...`);
    const response = await fetch(`/api/backups/${encodeURIComponent(backup.filename)}/verify`, { method: "POST" });
    const preview = (await response.json().catch(() => ({ valid: false, error: "备份校验失败" }))) as ImportPreview;
    setBackupVerifyResults((current) => ({ ...current, [backup.filename]: preview }));
    setBackupStatus(preview.valid ? "备份可恢复" : `备份不可恢复：${preview.error}`);
  }

  return {
    importing,
    backupDialogOpen,
    setBackupDialogOpen,
    backups,
    backupSummary,
    backupDeleteTarget,
    setBackupDeleteTarget,
    importPreview,
    pendingImportFile,
    backupVerifyResults,
    backupStatus,
    settingsDialogOpen,
    setSettingsDialogOpen,
    health,
    importZip,
    restoreBackupZip,
    confirmImportZip,
    cancelImportZip,
    openBackupDialog,
    openSettingsDialog,
    createBackupArchive,
    deleteBackupArchive,
    verifyBackupArchive
  };
}
