import { Link } from "react-router-dom";
import type { WorkflowInstance } from "../types";
import { formatVendorLabel } from "../lib/format";
import { StatusBadge, STATUS_TOKENS } from "./StatusBadge";

export function WorkflowCard({ workflow }: { workflow: WorkflowInstance }) {
  const succeeded = workflow.steps.filter((s) => s.status === "succeeded").length;
  const total = workflow.steps.length;
  const token = STATUS_TOKENS[workflow.status] ?? STATUS_TOKENS.pending;

  return (
    <Link
      to={`/workflows/${workflow.id}`}
      className="block rounded-xl border p-4 transition hover:border-[var(--border-strong)]"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium" style={{ color: "var(--ink)" }}>
            {formatVendorLabel(workflow.context)}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Vendor onboarding · {workflow.id.slice(0, 8)}
          </p>
        </div>
        <StatusBadge status={workflow.status} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all"
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
