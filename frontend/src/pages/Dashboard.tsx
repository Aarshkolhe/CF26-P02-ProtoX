import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { matchesRequester, useIdentity } from "../context/IdentityContext";
import { useCoordinator } from "../hooks/useCoordinator";
import { StatRow } from "../components/StatRow";
import { TriggerWorkflowModal } from "../components/TriggerWorkflowModal";
import { WorkflowCard } from "../components/WorkflowCard";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "compensating", label: "Compensating" },
  { value: "completed", label: "Completed" },
  { value: "compensated", label: "Compensated" },
] as const;

export function Dashboard() {
  const { workflows, error } = useCoordinator();
  const { role, requesterName } = useIdentity();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isRequester = role === "requester";
  const ownedWorkflows = isRequester
    ? workflows.filter((w) => matchesRequester(w.context.requestedBy, requesterName))
    : workflows;

  const visibleWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ownedWorkflows.filter((w) => {
      const matchesQuery =
        !query || (w.context.vendorName ?? "").toLowerCase().includes(query) || w.id.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || w.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [ownedWorkflows, search, statusFilter]);

  const active = visibleWorkflows.filter((w) => w.status !== "completed" && w.status !== "compensated");
  const finished = visibleWorkflows.filter((w) => w.status === "completed" || w.status === "compensated");
  const isFiltering = search.trim() !== "" || statusFilter !== "all";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
          {isRequester ? (
            <>
              {requesterName ? `Welcome back, ${requesterName}.` : "Track your requests."}
              <br />
              Here's where they stand.
            </>
          ) : (
            <>
              Distributed transactions,
              <br />
              with a human in the loop.
            </>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: "var(--ink-muted)" }}>
          {isRequester
            ? "Submit a vendor onboarding request and track it through approval — finance handles the decision from the admin dashboard."
            : "Trigger a vendor onboarding saga, watch each step execute durably, and approve or reject at the finance checkpoint."}
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
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--status-good)" }} />
          Live — durably persisted by the coordinator, resumes automatically after a restart.
        </p>
      </section>

      {error && (
        <p className="mt-6 rounded-lg border px-4 py-2 text-center text-sm" style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}>
          {error} — retrying…
        </p>
      )}

      <section className="mt-10">
        <StatRow workflows={ownedWorkflows} />
      </section>

      {ownedWorkflows.length > 0 && (
        <section className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor or workflow ID…"
              className="w-full rounded-lg border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: "var(--surface)", color: "var(--ink)" }}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-8">
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

      {visibleWorkflows.length === 0 && (
        <p className="mt-10 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          {isFiltering
            ? "No workflows match your search/filter."
            : isRequester
              ? "No requests yet — trigger one above to get started."
              : "No workflows yet. Trigger one above to get started."}
        </p>
      )}

      <TriggerWorkflowModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
