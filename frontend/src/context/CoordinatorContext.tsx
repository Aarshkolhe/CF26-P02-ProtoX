import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../api/client";
import { subscribeToUpdates } from "../api/events";
import type { WorkflowInstance } from "../types";

// SSE is the primary update path (near-instant); this is just a safety net
// in case a connection never establishes (e.g. a proxy that blocks SSE).
const FALLBACK_POLL_MS = 15_000;

interface CoordinatorContextValue {
  workflows: WorkflowInstance[];
  error: string | null;
  triggerWorkflow: (context: Record<string, string>, approvalTimeoutMs?: number) => Promise<string>;
  decideApproval: (workflowId: string, stepId: string, decision: "approved" | "rejected") => Promise<void>;
  resetAll: () => Promise<void>;
}

const CoordinatorContext = createContext<CoordinatorContextValue | undefined>(undefined);

// A single shared subscription for the whole app — every component that
// calls useCoordinator() reads from this one context instead of each
// opening its own poll/SSE connection. Multiple independent EventSource
// connections from one tab is how you quietly walk into the browser's
// 6-connections-per-origin HTTP/1.1 cap for long-lived connections.
export function CoordinatorProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the coordinator API");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, FALLBACK_POLL_MS);
    const unsubscribe = subscribeToUpdates(() => refresh());
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [refresh]);

  const triggerWorkflow = useCallback(
    async (context: Record<string, string>, approvalTimeoutMs?: number) => {
      const workflow = await api.triggerWorkflow(context, approvalTimeoutMs);
      await refresh();
      return workflow.id;
    },
    [refresh],
  );

  const decideApproval = useCallback(
    async (workflowId: string, stepId: string, decision: "approved" | "rejected") => {
      await api.decideApproval(workflowId, stepId, decision);
      await refresh();
    },
    [refresh],
  );

  const resetAll = useCallback(async () => {
    await api.resetAll();
    await refresh();
  }, [refresh]);

  return (
    <CoordinatorContext.Provider value={{ workflows, error, triggerWorkflow, decideApproval, resetAll }}>
      {children}
    </CoordinatorContext.Provider>
  );
}

export function useCoordinator(): CoordinatorContextValue {
  const ctx = useContext(CoordinatorContext);
  if (!ctx) throw new Error("useCoordinator must be used within a CoordinatorProvider");
  return ctx;
}
