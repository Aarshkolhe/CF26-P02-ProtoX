import type { AuditLogEntry, WorkflowInstance } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function listWorkflows(): Promise<WorkflowInstance[]> {
  return request<WorkflowInstance[]>("/api/workflows");
}

export function getWorkflow(id: string): Promise<WorkflowInstance> {
  return request<WorkflowInstance>(`/api/workflows/${id}`);
}

export function getAuditLog(id: string): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>(`/api/workflows/${id}/audit`);
}

export function triggerWorkflow(context: Record<string, string>, approvalTimeoutMs?: number): Promise<WorkflowInstance> {
  return request<WorkflowInstance>("/api/workflows", {
    method: "POST",
    body: JSON.stringify({ ...context, approvalTimeoutMs }),
  });
}

export function decideApproval(workflowId: string, stepId: string, decision: "approved" | "rejected"): Promise<WorkflowInstance> {
  return request<WorkflowInstance>(`/api/workflows/${workflowId}/steps/${stepId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

export function resetAll(): Promise<void> {
  return request<void>("/api/workflows", { method: "DELETE" });
}
