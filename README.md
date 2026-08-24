# Distributed Transaction Coordinator for Human-in-the-Loop Workflows

**Problem Code:** P-02 · **Domain:** Enterprise Productivity & Intelligent Automation
**Team:** ProtoX · Jhulelal Institute of Technology

---

## 1. Problem Statement & Solution Overview

Modern business workflows span multiple independent systems — CRM, payment,
inventory, invoicing, approval, and notification services. Traditional
distributed transaction protocols (e.g. two-phase commit) assume fast,
deterministic machine participants. Human approvals do not satisfy those
assumptions: an approver might take minutes, days, or never respond at all.

Existing tools don't close this gap cleanly. Two-phase commit locks resources
and expects quick replies. Simple job queues have no compensation logic when
something downstream fails. Ad hoc scripts can't recover cleanly from a crash
mid-workflow, and rarely leave behind a usable audit trail.

**Our solution** is a durable, saga-based workflow coordinator that treats a
human approval as just another asynchronous step in the pipeline — one that
can pause for an unbounded amount of time and resume safely, exactly like it
would for a slow downstream API. Every step writes its state to durable
storage before moving on, every service call is idempotent so retries are
safe, and every step has a matching compensating action so the coordinator
can undo completed work if a later step is rejected, times out, or fails.

**One-line problem statement:** Build a coordinator that reliably orchestrates
multi-system business workflows containing human approval checkpoints, with
durability, idempotency, and recoverable compensation.

---

## 2. System Architecture / Workflow

```
 Workflow trigger
        │
        ▼
  ┌─────────────┐        ┌──────────────┐
  │ Coordinator │───────▶│ State store  │  (durable history, resumable state)
  └─────────────┘        └──────────────┘
        │
        ▼
  Service step (e.g. CRM, payment, inventory — idempotent calls)
        │
        ▼
  Human approval (pauses until decision or timeout)
        │
   ┌────┴─────┐
   ▼          ▼
Approved   Rejected / timeout
   │          │
   ▼          ▼
Workflow    Compensate
complete    (undo completed steps)
```

**Flow description:**
1. A workflow instance is triggered (API call, UI action, or scheduled job).
2. The coordinator persists the workflow's state before executing anything,
   so a crash at any point can be recovered from the last known state.
3. Each service step calls out to an external system using an idempotency
   key, so retries after a network failure never double-apply an action.
4. When a step requires human sign-off, the coordinator suspends the
   workflow and waits for an external event (approval, rejection, or a
   timeout firing) instead of polling in a loop.
5. On approval, the workflow proceeds to completion. On rejection or
   timeout, the coordinator runs the compensating actions for every step
   that already succeeded, in reverse order.
6. Every transition — trigger, step start/end, approval decision, timeout,
   compensation — is appended to an audit log for full traceability.

---

## 3. Core Technical Mechanism

The coordinator is built around the **saga pattern**: a workflow is modeled
as a sequence of steps, where each forward action has a corresponding
compensating (undo) action.

| Constraint | Mechanism |
|---|---|
| Durable execution | State is written to the state store after every transition, before the next action runs. On restart, the coordinator reads the last known state and resumes from there rather than starting over. |
| Idempotent operations | Every external call carries a deterministic idempotency key (derived from workflow ID + step ID). Downstream services can safely receive the same request twice. |
| Compensation / saga recovery | Each step is registered with a paired compensating action. On failure, rejection, or timeout, the coordinator walks backward through completed steps and invokes their compensations. |
| Human approval checkpoints | Approval is modeled as a first-class async step: the workflow suspends on an event listener rather than blocking a thread or polling. |
| Timeout / abandoned workflows | A delayed-job scheduler tracks pending approvals. If no decision arrives before the deadline, a timeout event fires automatically, which the coordinator treats the same way as an explicit rejection. |
| Partial failure recovery | Failed service calls are retried with backoff; if retries are exhausted, the coordinator treats the step as failed and triggers compensation. |
| Execution history | Every state transition (trigger, step result, approval decision, timeout, compensation) is written to an append-only audit log, queryable per workflow instance. |

---

## 4. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend / coordinator engine | Node.js (Express) or Python (FastAPI) | Hosts the workflow state machine, step executor, and timeout scheduler |
| Database / state store | PostgreSQL | Tables for workflow instances, step history, idempotency keys, audit log |
| Job scheduling | A delayed-job queue (e.g. BullMQ on Redis, or a Postgres-backed job table) | Drives approval timeouts and retries |
| Frontend dashboard | React | Live workflow status, pending approvals, full audit trail view |
| External service simulation | Mock REST APIs | Stand-ins for CRM, payment, and inventory systems used in the demo |
| Notifications | Email / webhook | Delivers approval requests to a human approver |

*Exact package choices may vary — this reflects the stack proposed for the
hackathon build; adjust the table above to match what was actually
implemented.*

---

## 5. Setup & Installation

> Update the commands below once the actual repository structure is final —
> this section assumes a standard Node.js backend + React frontend + Postgres
> layout.

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm or yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL, PORT, etc.
npm run migrate             # creates workflow_instances, step_history,
                             # idempotency_keys, audit_log tables
npm run dev                 # starts the coordinator API
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # starts the dashboard on localhost:5173 (or similar)
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port for the coordinator API |
| `APPROVAL_TIMEOUT_MINUTES` | Default timeout before an approval auto-escalates or auto-rejects |
| `NOTIFICATION_WEBHOOK_URL` | Endpoint used to notify approvers |

---

## 6. Usage Instructions

1. **Trigger a workflow** — send a request describing the workflow to run
   (e.g. vendor onboarding), which starts the coordinator's saga.
2. **Watch it progress** — the dashboard shows each step live: which
   service calls succeeded, and which step is currently in progress.
3. **Respond to an approval** — when the workflow reaches a human
   checkpoint, approve or reject it from the dashboard (or let the timeout
   fire to see automatic escalation).
4. **Observe the outcome** — on approval, the workflow marks itself
   complete. On rejection or timeout, watch the compensation steps run and
   undo the already-completed actions.
5. **Review the audit trail** — every workflow instance has a full,
   timestamped history of every transition, viewable from the dashboard or
   via the audit log API.

### Demo scenario
The reference demo walks through a **vendor onboarding** workflow: register
vendor in CRM → set up billing → await finance approval → create
procurement ticket. One run is approved end-to-end; a second run is
deliberately rejected (or left to time out) to show compensation firing and
the vendor/billing records being rolled back.

---

## 7. Validation / Experiments / Results

Planned validation for the prototype:

- **Happy path** — full workflow run from trigger to completion, confirming
  every step executes once and only once.
- **Compensation path** — rejection/timeout triggers compensating actions
  for all previously completed steps, confirmed against the audit log.
- **Idempotency check** — a step is deliberately retried (simulated network
  failure) and the target service is confirmed to receive the effect only
  once, verified via idempotency keys.
- **Crash-and-resume** — the coordinator process is killed mid-workflow and
  restarted; the workflow is confirmed to resume from its last persisted
  state rather than re-running completed steps.
- **Concurrency** — multiple workflow instances are run in parallel against
  shared downstream resources to confirm no double-allocation occurs.

*(Replace this section with actual measured results — e.g. how many test
runs were executed, timing, and any concurrency figures — once the demo has
been run.)*

---

## 8. Limitations & Future Scope

**Current limitations:**
- Downstream CRM/payment/inventory systems are simulated with mock APIs,
  not integrated with real enterprise systems.
- Approval routing is simple (single approver); no delegation, escalation
  chains, or multi-approver quorum logic yet.
- Authorization is basic role-based access; no fine-grained permission
  model per workflow type.
- The scheduler and state store are not yet tested at production scale or
  under sustained high concurrency.

**Future scope:**
- Real integration adapters for common enterprise systems (Salesforce,
  SAP, Stripe, etc.).
- Multi-approver and delegated-approval support.
- Configurable escalation policies (auto-remind, auto-escalate to a
  manager, auto-reject) per workflow type.
- Horizontal scaling of the coordinator and stronger monitoring/alerting
  for stuck or long-running workflows.
- A workflow-definition UI so new saga templates can be authored without
  code changes.

---

## 9. Team Members

| Name |
|---|
| Aarsh Kolhe |
| Atharva Ramteke |
| Durgesh Kubde |
| Ganesh Mishra |

**Team:** ProtoX
**Institution:** Jhulelal Institute of Technology

---

## 10. AI Assistance Disclosure

AI assistance (Claude, by Anthropic) was used during this project for:
- Comparing candidate problem statements and reasoning through their
  feasibility for the hackathon timeframe.
- Explaining the saga pattern and mapping the problem's known constraints
  to concrete design decisions.
- Drafting the system architecture diagram and presentation slide content.
- Drafting this README.

All architectural decisions, implementation, and validation were reviewed
and carried out by the team. AI assistance was used for planning,
explanation, and documentation support rather than as an autonomous author
of the system itself.
