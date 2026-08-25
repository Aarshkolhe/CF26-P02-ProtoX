import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useIdentity } from "../context/IdentityContext";
import { useCoordinator, useWorkflow } from "../hooks/useCoordinator";
import { AuditLogTable } from "../components/AuditLogTable";
import { CopyButton } from "../components/CopyButton";
import { ExecutionTimeline } from "../components/ExecutionTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { StepTimeline } from "../components/StepTimeline";
import { formatVendorLabel } from "../lib/format";

export function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const { workflow, auditLog, error } = useWorkflow(id);
  const { decideApproval } = useCoordinator();
  const { role } = useIdentity();
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const canDecide = role === "admin";

  function handleDecision(stepId: string, decision: "approved" | "rejected") {
    if (!workflow) return;
    setDecisionError(null);
    decideApproval(workflow.id, stepId, decision).catch((err) => {
      setDecisionError(err instanceof Error ? err.message : "Failed to record decision");
    });
  }

  if (!workflow) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <BackLink />
        <p className="mt-6 text-sm" style={{ color: "var(--ink-muted)" }}>
          {error ?? "Workflow not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <BackLink />

      <div className="animate-fade-in-up mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
            {formatVendorLabel(workflow.context)}
          </h1>
          <p className="flex flex-wrap items-center gap-1 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span>
              Vendor onboarding · {workflow.id} · billing ${workflow.context.billingAmount ?? "—"}
              {workflow.context.requestedBy && ` · requested by ${workflow.context.requestedBy}`}
            </span>
            <CopyButton value={workflow.id} label="Copy workflow ID" />
          </p>
        </div>
        <StatusBadge status={workflow.status} />
      </div>

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--status-warning)" }}>
          {error} — showing the last known state.
        </p>
      )}
      {decisionError && (
        <p className="mt-3 text-xs" style={{ color: "var(--status-critical)" }}>
          {decisionError}
        </p>
      )}
      {!canDecide && (
        <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>
          Read-only — approvals are handled from the admin dashboard.
        </p>
      )}

      <section
        className="animate-fade-in-up mt-6 rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", animationDelay: "80ms" }}
      >
        <ExecutionTimeline workflow={workflow} />
      </section>

      <section
        className="animate-fade-in-up mt-6 rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", animationDelay: "140ms" }}
      >
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
          Saga steps
        </h2>
        <StepTimeline
          workflow={workflow}
          onApprove={canDecide ? (stepId) => handleDecision(stepId, "approved") : undefined}
          onReject={canDecide ? (stepId) => handleDecision(stepId, "rejected") : undefined}
        />
      </section>

      <section className="animate-fade-in-up mt-6" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
          Audit log
        </h2>
        <AuditLogTable entries={auditLog} />
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm transition hover:opacity-80"
      style={{ color: "var(--ink-muted)" }}
    >
      <ArrowLeft size={14} />
      Back to dashboard
    </Link>
  );
}
