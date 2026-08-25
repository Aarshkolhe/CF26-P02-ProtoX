export const STATUS_TOKENS: Record<string, { color: string; wash: string }> = {
  pending: { color: "var(--status-neutral)", wash: "var(--status-neutral-wash)" },
  running: { color: "var(--accent)", wash: "var(--accent-wash)" },
  awaiting_approval: { color: "var(--status-warning)", wash: "var(--status-warning-wash)" },
  succeeded: { color: "var(--status-good)", wash: "var(--status-good-wash)" },
  completed: { color: "var(--status-good)", wash: "var(--status-good-wash)" },
  failed: { color: "var(--status-critical)", wash: "var(--status-critical-wash)" },
  compensating: { color: "var(--status-serious)", wash: "var(--status-serious-wash)" },
  compensated: { color: "var(--status-rollback)", wash: "var(--status-rollback-wash)" },
  skipped: { color: "var(--status-neutral)", wash: "var(--status-neutral-wash)" },
};

const LABELS: Record<string, string> = {
  pending: "Pending",
  running: "Running",
  awaiting_approval: "Awaiting approval",
  succeeded: "Succeeded",
  completed: "Completed",
  failed: "Failed",
  compensating: "Compensating",
  compensated: "Compensated",
  skipped: "Skipped",
};

export function StatusBadge({ status }: { status: string }) {
  const token = STATUS_TOKENS[status] ?? STATUS_TOKENS.pending;
  const label = LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: token.wash, color: token.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: token.color }} />
      {label}
    </span>
  );
}
