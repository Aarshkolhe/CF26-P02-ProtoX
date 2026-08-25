import { prisma } from "./db.js";
import { completeCompensationStep, fireApprovalTimeout, runServiceStep } from "./coordinator.js";
import { JOB_POLL_INTERVAL_MS } from "./scenario.js";

// Durable scheduling: nothing here depends on an in-memory timer surviving
// a restart. Every delayed action (approval timeouts, retry backoff,
// compensation pacing) is a row in the jobs table with a due time; this
// poller just periodically claims and executes whatever is due.
async function pollOnce(): Promise<void> {
  const due = await prisma.job.findMany({
    where: { status: "pending", runAt: { lte: new Date() } },
    take: 20,
    orderBy: { runAt: "asc" },
  });

  for (const job of due) {
    // Claim atomically so a slow tick can't process the same job twice.
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "done" },
    });
    if (claimed.count === 0) continue;

    try {
      if (job.type === "approval_timeout") {
        await fireApprovalTimeout(job.workflowId, job.stepId);
      } else if (job.type === "step_retry") {
        await runServiceStep(job.workflowId, job.stepId);
      } else if (job.type === "compensation_step") {
        await completeCompensationStep(job.workflowId, job.stepId);
      }
    } catch (err) {
      console.error(`[poller] job ${job.id} (${job.type}) failed:`, err);
    }
  }
}

export function startPoller(): NodeJS.Timeout {
  return setInterval(() => {
    pollOnce().catch((err) => console.error("[poller] tick failed:", err));
  }, JOB_POLL_INTERVAL_MS);
}
