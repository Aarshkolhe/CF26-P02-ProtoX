import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client";
import { subscribeToUpdates } from "../api/events";
import type { AuditLogEntry, WorkflowInstance } from "../types";

export { useCoordinator } from "../context/CoordinatorContext";

// SSE is the primary update path (near-instant); this is just a safety net
// in case a connection never establishes (e.g. a proxy that blocks SSE).
const FALLBACK_POLL_MS = 15_000;

// Page-scoped (only WorkflowDetail calls this), so — unlike the shared
// workflow list — it's fine for this to own its own subscription.
export function useWorkflow(workflowId: string | undefined) {
  const [workflow, setWorkflow] = useState<WorkflowInstance | undefined>(undefined);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workflowId) return;
    try {
      const [wf, log] = await Promise.all([api.getWorkflow(workflowId), api.getAuditLog(workflowId)]);
      setWorkflow(wf);
      setAuditLog(log);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the coordinator API");
    }
  }, [workflowId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, FALLBACK_POLL_MS);
    const unsubscribe = subscribeToUpdates((event) => {
      if (event.workflowId === workflowId) refresh();
    });
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [refresh, workflowId]);

  return { workflow, auditLog, error };
}
