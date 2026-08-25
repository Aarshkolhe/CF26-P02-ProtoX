import { CheckCircle2, Hourglass, RotateCcw, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkflowInstance } from "../types";

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  wash,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  wash: string;
  index: number;
}) {
  return (
    <div
      className="hover-lift animate-fade-in-up rounded-xl border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)", animationDelay: `${index * 60}ms` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: wash, color }}>
        <Icon size={16} />
      </span>
      {/* key forces a brief remount so the number "pops" whenever it changes */}
      <p key={value} className="animate-scale-in mt-3 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
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
      <StatTile index={0} icon={TrendingUp} label="Running instances" value={running} color="var(--accent)" wash="var(--accent-wash)" />
      <StatTile
        index={1}
        icon={Hourglass}
        label="Human approval"
        value={awaitingApproval}
        color="var(--status-warning)"
        wash="var(--status-warning-wash)"
      />
      <StatTile
        index={2}
        icon={CheckCircle2}
        label="Completed"
        value={completed}
        color="var(--status-good)"
        wash="var(--status-good-wash)"
      />
      <StatTile
        index={3}
        icon={RotateCcw}
        label="Compensation"
        value={compensated}
        color="var(--status-serious)"
        wash="var(--status-serious-wash)"
      />
    </div>
  );
}
