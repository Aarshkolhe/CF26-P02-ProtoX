# PROJECT_CONTEXT.md
**Read this file at the start of every session before writing code.**

## Project

Distributed Transaction Coordinator for Human-in-the-Loop Workflows
(Hackathon problem P-02 — Enterprise Productivity & Intelligent Automation)

Team: ProtoX · Jhulelal Institute of Technology
Members: Aarsh Kolhe, Atharva Ramteke, Durgesh Kubde, Ganesh Mishra

Build target: a **web application** (backend API + coordinator engine +
Postgres + React dashboard). Not a static site, not a native app.

## What we're building, in one paragraph

A durable, saga-based workflow coordinator for business processes that span
multiple systems (CRM, payment, inventory, etc.) and include a human
approval step. Traditional distributed transactions assume fast machine
participants; this coordinator treats a human approval as just another
async step that can pause for an unbounded time, then persists state so it
can resume safely after a crash, retries idempotently, and runs
compensating ("undo") actions if a step is rejected, times out, or fails.

## Non-negotiable design constraints (from the problem statement)

1. **Durable execution** — persist workflow state after every transition,
   before the next action runs. Must be able to resume from a crash without
   re-running completed steps.
2. **Idempotent operations** — every external/service call carries a
   deterministic idempotency key so retries never double-apply an effect.
3. **Saga-style compensation** — every forward step has a registered
   compensating action; on failure/rejection/timeout, walk backward through
   completed steps and invoke compensations in reverse order.
4. **Human approval checkpoints** — approval is a first-class async step.
   The workflow suspends on an event/webhook, it does NOT poll in a loop or
   block a thread.
5. **Timeout / abandoned workflow handling** — a scheduler tracks pending
   approvals; if no decision arrives by the deadline, fire a timeout event
   and treat it like a rejection (trigger compensation).
6. **Partial failure recovery** — retry failed service calls with backoff;
   after retries are exhausted, treat the step as failed and compensate.
7. **Complete execution history** — every transition (trigger, step
   start/end, approval decision, timeout, compensation) is written to an
   append-only audit log, queryable per workflow instance.

## Reference architecture

```
Trigger → Coordinator (persists state to State store)
            → Service step (idempotent call to CRM/payment/inventory)
              → Human approval (pauses on event, has a timeout)
                → Approved  → Workflow complete
                → Rejected/timeout → Compensate (undo completed steps)
```

## Proposed tech stack (adjust as needed, but keep this as the default)

- **Backend**: Node.js + Express (or Python + FastAPI — pick one and stay
  consistent) hosting the coordinator engine, step executor, and timeout
  scheduler.
- **Database**: PostgreSQL. Core tables: `workflow_instances`,
  `step_history`, `idempotency_keys`, `audit_log`.
- **Job scheduling**: a delayed-job mechanism (BullMQ/Redis, or a
  Postgres-backed job table) for approval timeouts and retries.
- **Frontend**: React dashboard — trigger workflows, show live status,
  approve/reject from the UI, view the audit trail.
- **External systems**: mocked REST APIs standing in for CRM, payment,
  inventory (no real integrations needed for the demo).
- **Notifications**: simple email or webhook call to notify an approver.

## Demo scenario to build toward

**Vendor onboarding workflow**: register vendor (CRM) → set up billing
(payment) → await finance approval (human checkpoint) → create procurement
ticket (inventory/ticketing).

Two demo runs are needed:
1. Full happy path — approved end-to-end.
2. A run that's rejected or left to time out — to show compensation
   actually firing and undoing the CRM/billing steps live.

## What "done" looks like for the hackathon demo

- Trigger a workflow from the dashboard and watch it progress step by step
  in real time.
- Approve one workflow, reject/timeout another, and see compensation run.
- Kill and restart the backend mid-workflow and show it resumes from
  persisted state instead of restarting.
- Show the full audit log for any workflow instance.

## Style / scope notes for Claude Code

- Prioritize a working, demoable saga engine over exhaustive edge-case
  coverage — this is a 24–36 hour hackathon build.
- Every service call function should accept/generate an idempotency key —
  don't bolt this on later.
- Compensation functions should be registered alongside their forward
  action (co-locate them), not defined separately somewhere else in the
  codebase — reduces the risk of a step existing without an undo path.
- Favor clear, inspectable state transitions over cleverness — the demo's
  credibility depends on being able to show *why* the coordinator did what
  it did (hence the audit log requirement).
