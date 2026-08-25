import { CheckCircle2, Hourglass, RotateCcw, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkflowInstance } from "../types";

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  wash,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  wash: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: wash, color }}>
        <Icon size={16} />
      </span>
      <p className="mt-3 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
    </div>
  );
}

export function StatRow({ workflows }: { workflows: WorkflowInstance[] }) {
  const running = workflows.filter((w) => w.status === "running").length;
  const awaitingApproval = workflows.filter((w) => w.status === "awaiting_approval").length;
  const completed = workflows.filter((w) => w.status === "completed").length;
  const compensated = workflows.filter((w) => w.status === "compensating" || w.status === "compensated").length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile icon={TrendingUp} label="Running instances" value={running} color="var(--accent)" wash="var(--accent-wash)" />
      <StatTile
        icon={Hourglass}
        label="Human approval"
        value={awaitingApproval}
        color="var(--status-warning)"
        wash="var(--status-warning-wash)"
      />
      <StatTile icon={CheckCircle2} label="Completed" value={completed} color="var(--status-good)" wash="var(--status-good-wash)" />
      <StatTile
        icon={RotateCcw}
        label="Compensation"
        value={compensated}
        color="var(--status-serious)"
        wash="var(--status-serious-wash)"
      />
    </div>
  );
}
