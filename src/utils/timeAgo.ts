export function getTimeElapsed(dateStr: string): string {
  if (!dateStr) return '0m';
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - created) / 1000));

  if (diffSec < 60) {
    return '1m';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const diffHours = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHours < 24) {
    return remMin > 0 ? `${diffHours}h ${remMin}m` : `${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`;
}
