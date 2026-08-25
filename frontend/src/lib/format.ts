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
