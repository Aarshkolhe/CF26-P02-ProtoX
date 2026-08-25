export type StepType = "service" | "approval";

export type StepStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "compensating"
  | "compensated"
  | "skipped";

export type WorkflowStatus =
  | "running"
  | "awaiting_approval"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

export type ApprovalDecision = "approved" | "rejected" | "timeout";

export interface StepInstance {
  stepId: string;
  name: string;
  type: StepType;
  service?: string;
  status: StepStatus;
  idempotencyKey: string;
  attempts: number;
  startedAt?: string;
  endedAt?: string;
  approvalDeadline?: string;
  decision?: ApprovalDecision;
  compensationName?: string;
}

export interface WorkflowInstance {
  id: string;
  workflowType: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  context: Record<string, string>;
  approvalTimeoutMs: number;
  steps: StepInstance[];
}

export type AuditEventType =
  | "workflow_triggered"
  | "step_started"
  | "step_retry"
  | "step_succeeded"
  | "step_failed"
  | "approval_requested"
  | "approval_decided"
  | "approval_timeout"
  | "compensation_started"
  | "compensation_step_started"
  | "compensation_step_succeeded"
  | "workflow_completed"
  | "workflow_compensated";

export interface AuditLogEntry {
  id: string;
  workflowId: string;
  timestamp: string;
  type: AuditEventType;
  stepId?: string;
  message: string;
}
