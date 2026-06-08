export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Attachment = {
  id: string;
  filename: string;
  size: number;
};

export type Note = {
  id: string;
  noteNumber: string;
  title: string;
  content: string;
  updatedAt: string;
  archivedAt: string | null;
  tags: Tag[];
  attachments: Attachment[];
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export type ApiKey = {
  id: string;
  name: string;
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedApiKey = ApiKey & {
  key: string;
};

export type Backup = {
  filename: string;
  size: number;
  createdAt: string;
};

export type BackupSummary = {
  count: number;
  totalSize: number;
  retention: number;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
};

export type ImportPreview =
  | {
      valid: true;
      app: string | null;
      exportedAt: string;
      noteCount: number;
      attachmentCount: number;
      checksumValid: boolean | null;
    }
  | {
      valid: false;
      error: string;
    };

export type AutoBackupStatus = {
  enabled: boolean;
  intervalHours: number;
  retention: number;
  running: boolean;
  latestBackupCreatedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

export type HealthStatus = {
  ok: boolean;
  version: string;
  checkedAt: string;
  checks: Record<string, boolean>;
  autoBackup: AutoBackupStatus;
};

export function normalizeNote(note: Note): Note {
  return {
    ...note,
    tags: note.tags ?? [],
    attachments: note.attachments ?? []
  };
}

export function withoutSecret(apiKey: CreatedApiKey): ApiKey {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keySuffix: apiKey.keySuffix,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt
  };
}

export function summarizeBackupList(items: Backup[], retention: number): BackupSummary {
  const createdTimes = items.map((backup) => backup.createdAt).sort();
  return {
    count: items.length,
    totalSize: items.reduce((total, backup) => total + backup.size, 0),
    retention,
    oldestCreatedAt: createdTimes[0] ?? null,
    newestCreatedAt: createdTimes.at(-1) ?? null
  };
}
