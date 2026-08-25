import { useCallback, useEffect, useState } from "react";
import * as api from "../api/client";
import type { AuditLogEntry, WorkflowInstance } from "../types";

const POLL_MS = 1500;

export function useCoordinator() {
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
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
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

  return { workflows, error, triggerWorkflow, decideApproval, resetAll };
}

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
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { workflow, auditLog, error };
}
