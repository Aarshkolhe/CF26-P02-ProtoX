import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { matchesRequester, useIdentity } from "../context/IdentityContext";
import { useCoordinator } from "../hooks/useCoordinator";
import { AnimatedBackground } from "../components/AnimatedBackground";
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

  // Search/filter live in the URL (?q=&status=) so a filtered view is
  // shareable/bookmarkable and survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  function setSearch(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }

  function setStatusFilter(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== "all") next.set("status", value);
        else next.delete("status");
        return next;
      },
      { replace: true },
    );
  }

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
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
      <AnimatedBackground />
      <section className="text-center">
        <h1
          className="animate-fade-in-up text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--ink)" }}
        >
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
        <p
          className="animate-fade-in-up mx-auto mt-3 max-w-md text-sm"
          style={{ color: "var(--ink-muted)", animationDelay: "80ms" }}
        >
          {isRequester
            ? "Submit a vendor onboarding request and track it through approval — finance handles the decision from the admin dashboard."
            : "Trigger a vendor onboarding saga, watch each step execute durably, and approve or reject at the finance checkpoint."}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="animate-fade-in-up mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:brightness-110 hover:shadow-lg active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", animationDelay: "160ms" }}
        >
          <Plus size={16} />
          Trigger workflow
        </button>
        <p
          className="animate-fade-in-up mt-3 flex items-center justify-center gap-1.5 text-xs"
          style={{ color: "var(--ink-muted)", animationDelay: "220ms" }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--status-good)" }} />
          Live — durably persisted by the coordinator, resumes automatically after a restart.
        </p>
      </section>

      {error && (
        <p className="animate-fade-in-up mt-6 rounded-lg border px-4 py-2 text-center text-sm" style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}>
          {error} — retrying…
        </p>
      )}

      <section className="animate-fade-in-up mt-10" style={{ animationDelay: "260ms" }}>
        <StatRow workflows={ownedWorkflows} />
      </section>

      {ownedWorkflows.length > 0 && (
        <section className="animate-fade-in-up mt-6 flex flex-col gap-2 sm:flex-row" style={{ animationDelay: "320ms" }}>
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor or workflow ID…"
              className="w-full rounded-lg border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]"
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
            {active.map((w, i) => (
              <WorkflowCard key={w.id} workflow={w} index={i} />
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
            {finished.map((w, i) => (
              <WorkflowCard key={w.id} workflow={w} index={i} />
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
