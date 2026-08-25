import { Plus } from "lucide-react";
import { useState } from "react";
import { useCoordinator } from "../hooks/useCoordinator";
import { StatRow } from "../components/StatRow";
import { TriggerWorkflowModal } from "../components/TriggerWorkflowModal";
import { WorkflowCard } from "../components/WorkflowCard";

export function Dashboard() {
  const { workflows, error } = useCoordinator();
  const [modalOpen, setModalOpen] = useState(false);
  const active = workflows.filter((w) => w.status !== "completed" && w.status !== "compensated");
  const finished = workflows.filter((w) => w.status === "completed" || w.status === "compensated");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
          Distributed transactions,
          <br />
          with a human in the loop.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: "var(--ink-muted)" }}>
          Trigger a vendor onboarding saga, watch each step execute durably, and approve or reject at
          the finance checkpoint.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:brightness-110"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Plus size={16} />
          Trigger workflow
        </button>
        <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>
          State is durably persisted by the coordinator — restarting the backend mid-workflow
          resumes it automatically instead of losing progress.
        </p>
      </section>

      {error && (
        <p className="mt-6 rounded-lg border px-4 py-2 text-center text-sm" style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}>
          {error} — retrying…
        </p>
      )}

      <section className="mt-10">
        <StatRow workflows={workflows} />
      </section>

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            In progress
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((w) => (
              <WorkflowCard key={w.id} workflow={w} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            Finished
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((w) => (
              <WorkflowCard key={w.id} workflow={w} />
            ))}
          </div>
        </section>
      )}

      {workflows.length === 0 && (
        <p className="mt-10 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          No workflows yet. Trigger one above to get started.
        </p>
      )}

      <TriggerWorkflowModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
