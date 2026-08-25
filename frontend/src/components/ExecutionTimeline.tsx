import type { WorkflowInstance } from "../types";
import { useNow } from "../hooks/useNow";
import { formatDuration } from "../lib/format";
import { STATUS_TOKENS } from "./StatusBadge";

const MIN_SEGMENT_PCT = 1.5;

export function ExecutionTimeline({ workflow }: { workflow: WorkflowInstance }) {
  const now = useNow();
  const isFinished = workflow.status === "completed" || workflow.status === "compensated";
  const start = new Date(workflow.createdAt).getTime();
  const end = isFinished ? new Date(workflow.updatedAt).getTime() : now;
  const totalMs = Math.max(end - start, 1000);

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (totalMs / tickCount) * i);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          Execution timeline
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
          {isFinished ? "total" : "elapsed"} {formatDuration(end - start)}
        </span>
      </div>

      <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {workflow.steps.map((step, i) => {
            const token = STATUS_TOKENS[step.status] ?? STATUS_TOKENS.pending;
            const segStart = step.startedAt ? new Date(step.startedAt).getTime() : null;
            const segEnd = step.endedAt ? new Date(step.endedAt).getTime() : segStart ? now : null;
            const leftPct = segStart != null ? Math.max(0, ((segStart - start) / totalMs) * 100) : 0;
            const rawWidthPct = segStart != null && segEnd != null ? ((segEnd - segStart) / totalMs) * 100 : 0;
            const widthPct = segStart != null ? Math.max(rawWidthPct, MIN_SEGMENT_PCT) : 0;
            const isLive = step.status === "running" || step.status === "awaiting_approval" || step.status === "compensating";

            return (
              <div
                key={step.stepId}
                className="animate-fade-in-up flex items-center gap-3 px-3 py-2"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="w-32 shrink-0 truncate text-xs" style={{ color: "var(--ink-secondary)" }}>
                  {step.name}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded" style={{ background: "var(--page)" }}>
                  {segStart != null && (
                    <div
                      className={`absolute top-0 h-full rounded transition-all duration-1000 ease-linear ${isLive ? "animate-pulse" : ""}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: token.color }}
                      title={`${step.name}: ${formatDuration((segEnd ?? now) - segStart)}`}
                    />
                  )}
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
                  {segStart != null ? formatDuration((segEnd ?? now) - segStart) : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between border-t px-3 py-1.5 font-mono text-[10px]" style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>
          {ticks.map((t, i) => (
            <span key={i}>{formatDuration(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
