import type {
  ApprovalDecision,
  AuditEventType,
  AuditLogEntry,
  StepInstance,
  WorkflowInstance,
} from "../types";
import { DEFAULT_APPROVAL_TIMEOUT_MS, VENDOR_ONBOARDING_STEPS } from "./scenario";

// Simulated latencies. Kept short so a live demo can watch a full saga
// (including a retry and a compensation run) play out in well under a minute.
const SERVICE_CALL_MS = 1100;
const RETRY_BACKOFF_MS = 1400;
const COMPENSATION_STEP_MS = 900;

const STORAGE_KEY = "protox.coordinator.v1";

function now(): string {
  return new Date().toISOString();
}

function timerKey(workflowId: string, stepId: string): string {
  return `${workflowId}:${stepId}`;
}

interface Snapshot {
  workflows: WorkflowInstance[];
  auditLog: AuditLogEntry[];
}

// Stands in for the coordinator's HTTP API. State transitions, retries,
// timeouts, and compensation all run here; state is persisted to
// localStorage after every transition (mirrors the "durable execution"
// requirement) so a page reload resumes in-flight workflows instead of
// losing them, the same way the real coordinator should survive a restart.
class MockCoordinatorEngine {
  private workflows = new Map<string, WorkflowInstance>();
  private auditLog: AuditLogEntry[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = { workflows: [], auditLog: [] };

  constructor() {
    this.load();
    this.refreshSnapshot();
    this.resumeAll();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Snapshot => this.snapshot;

  triggerWorkflow(context: Record<string, string>, approvalTimeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS): string {
    const id = crypto.randomUUID();
    const steps: StepInstance[] = VENDOR_ONBOARDING_STEPS.map((bp) => ({
      stepId: bp.id,
      name: bp.name,
      type: bp.type,
      service: bp.service,
      status: "pending",
      idempotencyKey: `${id}:${bp.id}`,
      attempts: 0,
      compensationName: bp.compensationName,
    }));
    const workflow: WorkflowInstance = {
      id,
      workflowType: "vendor_onboarding",
      status: "running",
      createdAt: now(),
      updatedAt: now(),
      context,
      approvalTimeoutMs,
      steps,
    };
    this.workflows.set(id, workflow);
    this.audit(id, "workflow_triggered", undefined, `Vendor onboarding triggered for "${context.vendorName ?? "unnamed vendor"}".`);
    this.commit();
    this.advance(workflow);
    return id;
  }

  decideApproval(workflowId: string, stepId: string, decision: Extract<ApprovalDecision, "approved" | "rejected">): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    const step = workflow.steps.find((s) => s.stepId === stepId);
    if (!step || step.status !== "awaiting_approval") return;

    this.clearTimer(workflowId, stepId);
    step.decision = decision;
    step.endedAt = now();

    if (decision === "approved") {
      step.status = "succeeded";
      this.audit(workflow.id, "approval_decided", step.stepId, `${step.name} approved by finance.`);
      this.commit();
      this.advance(workflow);
    } else {
      step.status = "failed";
      this.audit(workflow.id, "approval_decided", step.stepId, `${step.name} rejected by finance.`);
      this.commit();
      this.startCompensation(workflow);
    }
  }

  resetAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.workflows.clear();
    this.auditLog = [];
    this.commit();
  }

  // --- forward execution -------------------------------------------------

  private advance(workflow: WorkflowInstance): void {
    const step = workflow.steps.find((s) => s.status === "pending");
    if (!step) {
      workflow.status = "completed";
      workflow.updatedAt = now();
      this.audit(workflow.id, "workflow_completed", undefined, "Workflow completed — all steps succeeded.");
      this.commit();
      return;
    }
    if (step.type === "service") {
      this.runServiceStep(workflow, step);
    } else {
      this.runApprovalStep(workflow, step);
    }
  }

  private runServiceStep(workflow: WorkflowInstance, step: StepInstance): void {
    step.status = "running";
    step.startedAt ??= now();
    step.attempts += 1;
    workflow.status = "running";
    workflow.updatedAt = now();
    this.audit(
      workflow.id,
      step.attempts > 1 ? "step_retry" : "step_started",
      step.stepId,
      `${step.name} — attempt ${step.attempts} (idempotency key ${step.idempotencyKey}).`,
    );
    this.commit();

    // The vendor registration call deterministically fails its first
    // attempt so every demo run visibly exercises the retry/backoff path.
    const simulatedTransientFailure = step.stepId === "register_vendor" && step.attempts === 1;

    this.setTimer(workflow.id, step.stepId, () => {
      if (simulatedTransientFailure) {
        this.audit(workflow.id, "step_failed", step.stepId, `${step.name} failed (simulated transient error) — retrying with backoff.`);
        this.commit();
        this.setTimer(workflow.id, step.stepId, () => this.runServiceStep(workflow, step), RETRY_BACKOFF_MS);
        return;
      }
      step.status = "succeeded";
      step.endedAt = now();
      this.audit(workflow.id, "step_succeeded", step.stepId, `${step.name} succeeded.`);
      this.commit();
      this.advance(workflow);
    }, SERVICE_CALL_MS);
  }

  private runApprovalStep(workflow: WorkflowInstance, step: StepInstance): void {
    step.status = "awaiting_approval";
    step.startedAt ??= now();
    step.approvalDeadline = new Date(Date.now() + workflow.approvalTimeoutMs).toISOString();
    workflow.status = "awaiting_approval";
    workflow.updatedAt = now();
    this.audit(
      workflow.id,
      "approval_requested",
      step.stepId,
      `${step.name} requested — awaiting decision (times out in ${Math.round(workflow.approvalTimeoutMs / 1000)}s).`,
    );
    this.commit();
    this.scheduleApprovalTimeout(workflow, step, workflow.approvalTimeoutMs);
  }

  private scheduleApprovalTimeout(workflow: WorkflowInstance, step: StepInstance, ms: number): void {
    this.setTimer(workflow.id, step.stepId, () => this.fireApprovalTimeout(workflow.id, step.stepId), Math.max(ms, 0));
  }

  private fireApprovalTimeout(workflowId: string, stepId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    const step = workflow.steps.find((s) => s.stepId === stepId);
    if (!step || step.status !== "awaiting_approval") return;

    step.status = "failed";
    step.decision = "timeout";
    step.endedAt = now();
    this.audit(workflow.id, "approval_timeout", step.stepId, `${step.name} timed out with no decision — treating as a rejection.`);
    this.commit();
    this.startCompensation(workflow);
  }

  // --- compensation --------------------------------------------------------
  // State-driven rather than queue-driven: at any point, the next action is
  // derived from current step statuses. That makes it resume-safe for free —
  // resuming after a "restart" just calls compensateNext() again.

  private startCompensation(workflow: WorkflowInstance): void {
    workflow.status = "compensating";
    workflow.updatedAt = now();
    this.audit(workflow.id, "compensation_started", undefined, "Rejection/timeout detected — compensating completed steps in reverse order.");
    this.commit();
    this.compensateNext(workflow);
  }

  private compensateNext(workflow: WorkflowInstance): void {
    const reverseOrder = [...workflow.steps].reverse().filter((s) => s.compensationName);

    const inProgress = reverseOrder.find((s) => s.status === "compensating");
    if (inProgress) {
      this.setTimer(workflow.id, inProgress.stepId, () => this.completeCompensation(workflow, inProgress), COMPENSATION_STEP_MS);
      return;
    }

    const next = reverseOrder.find((s) => s.status === "succeeded");
    if (next) {
      next.status = "compensating";
      this.audit(workflow.id, "compensation_step_started", next.stepId, `Running compensation: ${next.compensationName}.`);
      this.commit();
      this.setTimer(workflow.id, next.stepId, () => this.completeCompensation(workflow, next), COMPENSATION_STEP_MS);
      return;
    }

    workflow.status = "compensated";
    workflow.updatedAt = now();
    this.audit(workflow.id, "workflow_compensated", undefined, "All completed steps compensated — workflow rolled back.");
    this.commit();
  }

  private completeCompensation(workflow: WorkflowInstance, step: StepInstance): void {
    step.status = "compensated";
    step.endedAt = now();
    this.audit(workflow.id, "compensation_step_succeeded", step.stepId, `${step.compensationName} completed.`);
    this.commit();
    this.compensateNext(workflow);
  }

  // --- crash recovery --------------------------------------------------

  private resumeAll(): void {
    for (const workflow of this.workflows.values()) {
      this.resumeWorkflow(workflow);
    }
  }

  private resumeWorkflow(workflow: WorkflowInstance): void {
    if (workflow.status === "completed" || workflow.status === "compensated") return;

    if (workflow.status === "compensating") {
      this.compensateNext(workflow);
      return;
    }

    if (workflow.status === "awaiting_approval") {
      const step = workflow.steps.find((s) => s.status === "awaiting_approval");
      if (!step) {
        this.advance(workflow);
        return;
      }
      const msLeft = step.approvalDeadline ? new Date(step.approvalDeadline).getTime() - Date.now() : 0;
      if (msLeft <= 0) {
        this.fireApprovalTimeout(workflow.id, step.stepId);
      } else {
        this.scheduleApprovalTimeout(workflow, step, msLeft);
      }
      return;
    }

    const running = workflow.steps.find((s) => s.status === "running");
    if (running) {
      this.runServiceStep(workflow, running);
      return;
    }
    const pending = workflow.steps.find((s) => s.status === "pending");
    if (pending) {
      this.advance(workflow);
    }
  }

  // --- plumbing ------------------------------------------------------------

  private audit(workflowId: string, type: AuditEventType, stepId: string | undefined, message: string): void {
    this.auditLog.push({
      id: crypto.randomUUID(),
      workflowId,
      timestamp: now(),
      type,
      stepId,
      message,
    });
  }

  private setTimer(workflowId: string, stepId: string, fn: () => void, ms: number): void {
    this.clearTimer(workflowId, stepId);
    this.timers.set(timerKey(workflowId, stepId), setTimeout(fn, ms));
  }

  private clearTimer(workflowId: string, stepId: string): void {
    const key = timerKey(workflowId, stepId);
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(key);
    }
  }

  private commit(): void {
    this.persist();
    this.refreshSnapshot();
    this.notify();
  }

  private refreshSnapshot(): void {
    this.snapshot = {
      workflows: Array.from(this.workflows.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      auditLog: this.auditLog,
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    try {
      const payload = JSON.stringify({
        workflows: Array.from(this.workflows.values()),
        auditLog: this.auditLog,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // best-effort; demo still works without persistence (e.g. storage disabled)
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { workflows: WorkflowInstance[]; auditLog: AuditLogEntry[] };
      for (const workflow of parsed.workflows) this.workflows.set(workflow.id, workflow);
      this.auditLog = parsed.auditLog ?? [];
    } catch {
      // corrupt/old storage shape — start fresh
    }
  }
}

export const coordinator = new MockCoordinatorEngine();
export type { Snapshot };
