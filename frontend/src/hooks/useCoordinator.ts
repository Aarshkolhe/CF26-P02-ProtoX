import { useSyncExternalStore } from "react";
import { coordinator } from "../api/mockApi";

export function useCoordinator() {
  const snapshot = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot);
  return {
    workflows: snapshot.workflows,
    auditLog: snapshot.auditLog,
    triggerWorkflow: coordinator.triggerWorkflow.bind(coordinator),
    decideApproval: coordinator.decideApproval.bind(coordinator),
    resetAll: coordinator.resetAll.bind(coordinator),
  };
}

export function useWorkflow(workflowId: string | undefined) {
  const { workflows, auditLog } = useCoordinator();
  const workflow = workflowId ? workflows.find((w) => w.id === workflowId) : undefined;
  const entries = workflowId ? auditLog.filter((e) => e.workflowId === workflowId) : [];
  return { workflow, auditLog: entries };
}
