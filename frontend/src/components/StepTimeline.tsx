import { Building2, PackageCheck, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StepInstance, WorkflowInstance } from "../types";
import { useNow } from "../hooks/useNow";
import { formatCountdown } from "../lib/format";
import { CopyButton } from "./CopyButton";
import { STATUS_TOKENS, StatusBadge } from "./StatusBadge";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  CRM: Building2,
  Payment: Wallet,
  Inventory: PackageCheck,
};

function StepRow({
  step,
  index,
  isLast,
  onApprove,
  onReject,
}: {
  step: StepInstance;
  index: number;
  isLast: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const now = useNow();
  const canDecide = step.status === "awaiting_approval" && onApprove && onReject;
  const token = STATUS_TOKENS[step.status] ?? STATUS_TOKENS.pending;
  const Icon = step.type === "approval" ? ShieldCheck : (step.service && SERVICE_ICONS[step.service]) || Building2;
  const isActive = step.status === "running" || step.status === "awaiting_approval" || step.status === "compensating";

  return (
    <li className="animate-fade-in-up relative flex gap-4 pb-8 last:pb-0" style={{ animationDelay: `${index * 70}ms` }}>
      {!isLast && <span className="absolute left-[15px] top-8 h-full w-px" style={{ background: "var(--border)" }} aria-hidden />}
      <span
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${isActive ? "animate-pulse" : ""}`}
        style={{ background: token.wash, color: token.color }}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium" style={{ color: "var(--ink)" }}>
            {step.name}
          </span>
          {step.service && (
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              {step.service}
            </span>
          )}
          <StatusBadge status={step.status} />
          {step.attempts > 1 && (
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {step.attempts} attempts
            </span>
          )}
        </div>

        {step.type === "approval" && step.status === "awaiting_approval" && step.approvalDeadline && (
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--status-warning)" }}>
            {formatCountdown(step.approvalDeadline, now)}
          </p>
        )}

        {step.compensationName && (step.status === "compensating" || step.status === "compensated") && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-secondary)" }}>
            Compensation: {step.compensationName}
          </p>
        )}

        {step.decision && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-secondary)" }}>
            Decision: <span className="font-medium">{step.decision}</span>
          </p>
        )}

        <p className="mt-1 flex items-center gap-1 font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
          key: {step.idempotencyKey}
          <CopyButton value={step.idempotencyKey} label="Copy idempotency key" />
        </p>

        {canDecide && (
          <div className="animate-fade-in-up mt-3 flex gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:brightness-110 hover:shadow-md active:scale-95"
              style={{ background: "var(--status-good)", color: "#ffffff" }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:brightness-110 hover:shadow-md active:scale-95"
              style={{ background: "var(--status-critical)", color: "#ffffff" }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function StepTimeline({
  workflow,
  onApprove,
  onReject,
}: {
  workflow: WorkflowInstance;
  onApprove?: (stepId: string) => void;
  onReject?: (stepId: string) => void;
}) {
  return (
    <ol>
      {workflow.steps.map((step, i) => (
        <StepRow
          key={step.stepId}
          step={step}
          index={i}
          isLast={i === workflow.steps.length - 1}
          onApprove={step.type === "approval" && onApprove ? () => onApprove(step.stepId) : undefined}
          onReject={step.type === "approval" && onReject ? () => onReject(step.stepId) : undefined}
        />
      ))}
    </ol>
  );
}
