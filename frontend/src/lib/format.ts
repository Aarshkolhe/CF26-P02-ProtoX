export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

export function formatCountdown(deadlineIso: string, now: number): string {
  const msLeft = new Date(deadlineIso).getTime() - now;
  if (msLeft <= 0) return "timing out…";
  const totalSeconds = Math.ceil(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s left` : `${seconds}s left`;
}

export function formatVendorLabel(context: Record<string, string>): string {
  return context.vendorName || "Unnamed vendor";
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatRelativeTime(iso: string, now: number): string {
  const seconds = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
