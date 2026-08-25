import { Link } from "react-router-dom";
import type { WorkflowInstance } from "../types";
import { useNow } from "../hooks/useNow";
import { formatRelativeTime, formatVendorLabel } from "../lib/format";
import { StatusBadge, STATUS_TOKENS } from "./StatusBadge";

const LIVE_STATUSES = new Set(["running", "awaiting_approval", "compensating"]);
const MAX_STAGGER_MS = 320;

export function WorkflowCard({ workflow, index = 0 }: { workflow: WorkflowInstance; index?: number }) {
  const now = useNow();
  const succeeded = workflow.steps.filter((s) => s.status === "succeeded").length;
  const total = workflow.steps.length;
  const token = STATUS_TOKENS[workflow.status] ?? STATUS_TOKENS.pending;
  const isLive = LIVE_STATUSES.has(workflow.status);

  return (
    <Link
      to={`/workflows/${workflow.id}`}
      className="hover-lift animate-fade-in-up block rounded-xl border p-4 hover:border-[var(--border-strong)]"
      style={{ background: "var(--surface)", borderColor: "var(--border)", animationDelay: `${Math.min(index * 50, MAX_STAGGER_MS)}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium" style={{ color: "var(--ink)" }}>
            {formatVendorLabel(workflow.context)}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Vendor onboarding · {workflow.id.slice(0, 8)} · {formatRelativeTime(workflow.updatedAt, now)}
          </p>
        </div>
        <span className="flex items-center gap-1.5">
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: token.color }} />}
          <StatusBadge status={workflow.status} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(succeeded / total) * 100}%`, background: token.color }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {succeeded}/{total} steps
        </span>
      </div>
    </Link>
  );
}
