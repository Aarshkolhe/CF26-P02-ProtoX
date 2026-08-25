import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { workflowEvents } from "./events.js";
import { callExternalService, notifyApprover } from "./externalServices.js";
import { HttpError } from "./httpError.js";
import { COMPENSATION_STEP_MS, MAX_SERVICE_ATTEMPTS, RETRY_BACKOFF_MS, VENDOR_ONBOARDING_STEPS } from "./scenario.js";

async function audit(workflowId: string, type: string, stepId: string | undefined, message: string): Promise<void> {
  await prisma.auditLogEntry.create({
    data: { workflowId, type, stepId: stepId ?? null, message },
  });
  workflowEvents.emit("update", { workflowId, type, message });
}

async function getStep(workflowId: string, stepId: string) {
  const step = await prisma.stepInstance.findUnique({ where: { workflowId_stepId: { workflowId, stepId } } });
  if (!step) throw new HttpError(404, `Step ${stepId} not found on workflow ${workflowId}`);
  return step;
}

async function scheduleJob(workflowId: string, stepId: string, type: "approval_timeout" | "step_retry" | "compensation_step", runAt: Date) {
  await prisma.job.create({ data: { workflowId, stepId, type, runAt, status: "pending" } });
}

async function cancelPendingJobs(workflowId: string, stepId: string) {
  await prisma.job.updateMany({
    where: { workflowId, stepId, status: "pending" },
    data: { status: "cancelled" },
  });
}

export async function triggerWorkflow(context: Record<string, string>, approvalTimeoutMs: number): Promise<string> {
  const workflow = await prisma.workflowInstance.create({
    data: {
      workflowType: "vendor_onboarding",
      status: "running",
      context: context as Prisma.InputJsonValue,
      approvalTimeoutMs,
    },
  });

  await prisma.stepInstance.createMany({
    data: VENDOR_ONBOARDING_STEPS.map((bp, i) => ({
      workflowId: workflow.id,
      stepId: bp.id,
      sequence: i,
      name: bp.name,
      type: bp.type,
      service: bp.service,
      status: "pending" as const,
      idempotencyKey: `${workflow.id}:${bp.id}`,
      compensationName: bp.compensationName,
    })),
  });

  await audit(workflow.id, "workflow_triggered", undefined, `Vendor onboarding triggered for "${context.vendorName ?? "unnamed vendor"}".`);

  await advance(workflow.id);
  return workflow.id;
}

// Finds the next pending step and runs it. Recurses synchronously through
// consecutive service-step successes; stops (returns) at the first
// approval step or the first step that has to wait on a retry backoff.
export async function advance(workflowId: string): Promise<void> {
  const steps = await prisma.stepInstance.findMany({ where: { workflowId }, orderBy: { sequence: "asc" } });
  const next = steps.find((s) => s.status === "pending");

  if (!next) {
    await prisma.workflowInstance.update({ where: { id: workflowId }, data: { status: "completed" } });
    await audit(workflowId, "workflow_completed", undefined, "Workflow completed — all steps succeeded.");
    return;
  }

  if (next.type === "service") {
    await runServiceStep(workflowId, next.stepId);
  } else {
    await runApprovalStep(workflowId, next.stepId);
  }
}

export async function runServiceStep(workflowId: string, stepId: string): Promise<void> {
  const step = await getStep(workflowId, stepId);
  const attempts = step.attempts + 1;

  // Durable execution: the "running" state (and the incremented attempt
  // count) is committed before the external call happens, so a crash
  // mid-call is recovered by re-entering this same function on restart.
  await prisma.stepInstance.update({
    where: { id: step.id },
    data: { status: "running", startedAt: step.startedAt ?? new Date(), attempts },
  });
  await prisma.workflowInstance.update({ where: { id: workflowId }, data: { status: "running" } });
  await audit(
    workflowId,
    attempts > 1 ? "step_retry" : "step_started",
    stepId,
    `${step.name} — attempt ${attempts} (idempotency key ${step.idempotencyKey}).`,
  );

  const result = await callExternalService(step.stepId, step.idempotencyKey, attempts);

  if (!result.ok) {
    if (attempts >= MAX_SERVICE_ATTEMPTS) {
      await prisma.stepInstance.update({ where: { id: step.id }, data: { status: "failed", endedAt: new Date() } });
      await audit(workflowId, "step_failed", stepId, `${step.name} failed (${result.error}) — retries exhausted after ${attempts} attempts.`);
      await startCompensation(workflowId);
      return;
    }
    await prisma.stepInstance.update({ where: { id: step.id }, data: { status: "pending" } });
    await audit(workflowId, "step_failed", stepId, `${step.name} failed (${result.error}) — retrying with backoff.`);
    await scheduleJob(workflowId, stepId, "step_retry", new Date(Date.now() + RETRY_BACKOFF_MS));
    return;
  }

  await prisma.stepInstance.update({ where: { id: step.id }, data: { status: "succeeded", endedAt: new Date() } });
  await audit(workflowId, "step_succeeded", stepId, `${step.name} succeeded.`);
  await advance(workflowId);
}

async function runApprovalStep(workflowId: string, stepId: string): Promise<void> {
  const workflow = await prisma.workflowInstance.findUniqueOrThrow({ where: { id: workflowId } });
  const step = await getStep(workflowId, stepId);
  const deadline = new Date(Date.now() + workflow.approvalTimeoutMs);

  await prisma.stepInstance.update({
    where: { id: step.id },
    data: { status: "awaiting_approval", startedAt: step.startedAt ?? new Date(), approvalDeadline: deadline },
  });
  await prisma.workflowInstance.update({ where: { id: workflowId }, data: { status: "awaiting_approval" } });
  await audit(
    workflowId,
    "approval_requested",
    stepId,
    `${step.name} requested — awaiting decision (times out in ${Math.round(workflow.approvalTimeoutMs / 1000)}s).`,
  );

  const vendorName = (workflow.context as Record<string, string>).vendorName ?? "a vendor";
  await notifyApprover(`Finance approval needed for ${vendorName} onboarding (workflow ${workflowId}).`);

  await scheduleJob(workflowId, stepId, "approval_timeout", deadline);
}

export async function decideApproval(workflowId: string, stepId: string, decision: "approved" | "rejected"): Promise<void> {
  const step = await getStep(workflowId, stepId);
  if (step.status !== "awaiting_approval") {
    throw new HttpError(409, `Step ${stepId} is not awaiting approval (current status: ${step.status})`);
  }

  await cancelPendingJobs(workflowId, stepId);

  if (decision === "approved") {
    await prisma.stepInstance.update({
      where: { id: step.id },
      data: { status: "succeeded", endedAt: new Date(), decision: "approved" },
    });
    await audit(workflowId, "approval_decided", stepId, `${step.name} approved by finance.`);
    await advance(workflowId);
  } else {
    await prisma.stepInstance.update({
      where: { id: step.id },
      data: { status: "failed", endedAt: new Date(), decision: "rejected" },
    });
    await audit(workflowId, "approval_decided", stepId, `${step.name} rejected by finance.`);
    await startCompensation(workflowId);
  }
}

export async function fireApprovalTimeout(workflowId: string, stepId: string): Promise<void> {
  const step = await getStep(workflowId, stepId);
  if (step.status !== "awaiting_approval") return; // already decided — nothing to do

  await prisma.stepInstance.update({
    where: { id: step.id },
    data: { status: "failed", endedAt: new Date(), decision: "timeout" },
  });
  await audit(workflowId, "approval_timeout", stepId, `${step.name} timed out with no decision — treating as a rejection.`);
  await startCompensation(workflowId);
}

async function startCompensation(workflowId: string): Promise<void> {
  await prisma.workflowInstance.update({ where: { id: workflowId }, data: { status: "compensating" } });
  await audit(workflowId, "compensation_started", undefined, "Rejection/timeout detected — compensating completed steps in reverse order.");
  await compensateNext(workflowId);
}

// State-driven rather than queue-driven: at any point, the next action is
// derived from current step statuses rather than an in-memory position.
// That makes it resume-safe for free — resuming after a restart just
// calls this again.
export async function compensateNext(workflowId: string): Promise<void> {
  const steps = await prisma.stepInstance.findMany({
    where: { workflowId, compensationName: { not: null } },
    orderBy: { sequence: "desc" },
  });

  const inProgress = steps.find((s) => s.status === "compensating");
  if (inProgress) {
    const hasPendingJob = await prisma.job.findFirst({
      where: { workflowId, stepId: inProgress.stepId, type: "compensation_step", status: "pending" },
    });
    if (!hasPendingJob) {
      // No timer survived (e.g. a restart raced the schedule) — fire it now.
      await scheduleJob(workflowId, inProgress.stepId, "compensation_step", new Date());
    }
    return;
  }

  const next = steps.find((s) => s.status === "succeeded");
  if (next) {
    await prisma.stepInstance.update({ where: { id: next.id }, data: { status: "compensating" } });
    await audit(workflowId, "compensation_step_started", next.stepId, `Running compensation: ${next.compensationName}.`);
    await scheduleJob(workflowId, next.stepId, "compensation_step", new Date(Date.now() + COMPENSATION_STEP_MS));
    return;
  }

  await prisma.workflowInstance.update({ where: { id: workflowId }, data: { status: "compensated" } });
  await audit(workflowId, "workflow_compensated", undefined, "All completed steps compensated — workflow rolled back.");
}

export async function completeCompensationStep(workflowId: string, stepId: string): Promise<void> {
  const step = await getStep(workflowId, stepId);
  if (step.status !== "compensating") return; // already handled

  await prisma.stepInstance.update({ where: { id: step.id }, data: { status: "compensated", endedAt: new Date() } });
  await audit(workflowId, "compensation_step_succeeded", stepId, `${step.compensationName} completed.`);
  await compensateNext(workflowId);
}

// Crash recovery: called once at startup. Every in-flight workflow is
// resumed from whatever its last persisted state was — no step is ever
// re-run past where it already succeeded.
export async function resumeAll(): Promise<void> {
  const workflows = await prisma.workflowInstance.findMany({
    where: { status: { in: ["running", "compensating"] } },
  });

  for (const workflow of workflows) {
    try {
      await resumeWorkflow(workflow.id);
    } catch (err) {
      console.error(`[resume] failed to resume workflow ${workflow.id}:`, err);
    }
  }

  const resumedAwaitingApproval = await prisma.workflowInstance.count({ where: { status: "awaiting_approval" } });
  if (workflows.length > 0 || resumedAwaitingApproval > 0) {
    console.log(
      `[resume] ${workflows.length} in-flight workflow(s) resumed; ${resumedAwaitingApproval} awaiting approval (handled by the job poller).`,
    );
  }
}

async function resumeWorkflow(workflowId: string): Promise<void> {
  const workflow = await prisma.workflowInstance.findUniqueOrThrow({ where: { id: workflowId } });

  if (workflow.status === "compensating") {
    await compensateNext(workflowId);
    return;
  }

  if (workflow.status !== "running") return;

  const steps = await prisma.stepInstance.findMany({ where: { workflowId }, orderBy: { sequence: "asc" } });
  const running = steps.find((s) => s.status === "running");
  if (running) {
    await runServiceStep(workflowId, running.stepId);
    return;
  }
  const pending = steps.find((s) => s.status === "pending");
  if (pending) {
    // If a retry job is already scheduled for this step, let the poller
    // fire it at its due time rather than advancing twice.
    const hasPendingJob = await prisma.job.findFirst({
      where: { workflowId, stepId: pending.stepId, status: "pending" },
    });
    if (!hasPendingJob) {
      await advance(workflowId);
    }
  }
}
