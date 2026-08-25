import type { AuditLogEntry } from "../types";
import { formatClock } from "../lib/format";

const TYPE_TOKENS: Record<string, string> = {
  workflow_triggered: "var(--ink-muted)",
  step_started: "var(--accent)",
  step_retry: "var(--status-serious)",
  step_succeeded: "var(--status-good)",
  step_failed: "var(--status-critical)",
  approval_requested: "var(--status-warning)",
  approval_decided: "var(--status-warning)",
  approval_timeout: "var(--status-critical)",
  compensation_started: "var(--status-serious)",
  compensation_step_started: "var(--status-serious)",
  compensation_step_succeeded: "var(--status-rollback)",
  workflow_completed: "var(--status-good)",
  workflow_compensated: "var(--status-rollback)",
};

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
        No audit events yet.
      </p>
    );
  }

  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
          <tr>
            <th className="px-4 py-2.5 font-medium">Time</th>
            <th className="px-4 py-2.5 font-medium">Event</th>
            <th className="px-4 py-2.5 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.id} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                {formatClock(entry.timestamp)}
              </td>
              <td
                className="whitespace-nowrap px-4 py-2.5 font-medium"
                style={{ color: TYPE_TOKENS[entry.type] ?? "var(--ink-secondary)" }}
              >
                {entry.type.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-2.5" style={{ color: "var(--ink-secondary)" }}>
                {entry.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
