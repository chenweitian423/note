export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatBackupDate(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂无";
}
