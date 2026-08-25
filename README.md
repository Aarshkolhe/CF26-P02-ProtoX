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

*This reflects what's actually implemented (`frontend/package.json`,
`backend/package.json`), not the original proposal.*

### Frontend (`frontend/`)

| Package | Version | Role |
|---|---|---|
| React | 19.2.8 | UI |
| TypeScript | 6.0.3 | Language, strict mode |
| Vite | 8.2.2 | Dev server + build |
| React Router | 7.18.2 | Client-side routing, URL-persisted filters |
| Tailwind CSS | 4.3.3 (`@tailwindcss/vite`) | Styling, CSS-first (no `tailwind.config.js`) |
| lucide-react | 1.34.0 | Icons |
| oxlint | 1.79.0 | Linting |

No state-management or data-fetching library (Redux, React Query, etc.) —
state lives in a few React Contexts (`CoordinatorContext`, `IdentityContext`,
`ToastContext`) backed by the native `fetch` and `EventSource` Web APIs.

### Backend (`backend/`)

| Package | Version | Role |
|---|---|---|
| Node.js | 24.x | Runtime |
| Express | 5.2.1 | HTTP framework (REST + SSE routes) |
| TypeScript | 6.0.3 | Language, strict mode, ESM (`NodeNext`) |
| tsx | 4.23.12 | Dev runtime (`watch` mode) |
| Prisma | 6.19.3 (`prisma` + `@prisma/client`) | ORM, migrations, typed query client |
| Zod | 4.4.3 | Request body validation |
| cors | 2.8.6 | CORS middleware |
| dotenv | 17.4.2 | Env var loading |
| Node's built-in `EventEmitter` | — | In-process pub/sub feeding the SSE stream |

No queue/broker (Redis, BullMQ, RabbitMQ) — durable scheduling (retries,
approval timeouts, compensation pacing) is a plain Postgres `jobs` table
polled by an in-process interval; see §3.

### Database

**PostgreSQL 18**, accessed via Prisma. Five tables: `workflow_instances`,
`step_history`, `idempotency_keys`, `audit_log`, `jobs`.

### APIs

- **REST** (`/api/workflows`) — trigger, list, get one, get its audit log,
  submit an approval decision, reset demo data (`POST`/`GET`/`DELETE`).
- **Server-Sent Events** (`/api/events`) — a `text/event-stream` connection
  the frontend subscribes to via the native `EventSource` API for real-time
  push; polling (15s) is only a fallback if that connection can't establish.
- No GraphQL, gRPC, or WebSockets — plain REST + one-way SSE covers the
  whole app.
- **Mocked external services** — CRM/payment/inventory calls are simulated
  in-process (`externalServices.ts`), gated by the same idempotency-key
  mechanism a real integration would use.

### Deployment (prepared, not yet live)

A `render.yaml` Blueprint provisions all three pieces on
[Render](https://render.com): managed Postgres, a Node web service for the
backend, and a static site for the frontend build.

---

## 5. Setup & Installation

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 14, running locally (or reachable via `DATABASE_URL`)
- npm

### Backend

```bash
cd backend
npm install
cp .env.example .env        # set DATABASE_URL, PORT, etc.
npm run db:migrate          # creates workflow_instances, step_history,
                             # idempotency_keys, audit_log, jobs tables
npm run dev                 # starts the coordinator API on localhost:4000
```

The API is a plain Express + Prisma service — no separate job queue or
Redis. Approval timeouts, retry backoff, and compensation pacing are all
driven by a `jobs` table and a poller that runs inside the same process, so
recovering after a restart is just "the poller starts scanning again" (see
`npm run db:studio` to inspect the tables directly, or `GET /health`).

### Frontend

```bash
cd frontend
npm install
npm run dev                 # starts the dashboard on localhost:5173 (or similar)
```

The frontend currently runs against its own in-browser mock coordinator
(persisted to `localStorage`) rather than this backend — wiring it up to
call the real API is the next step.

### Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port for the coordinator API (default `4000`) |
| `APPROVAL_TIMEOUT_MINUTES` | Default approval timeout when a trigger request doesn't specify one |
| `NOTIFICATION_WEBHOOK_URL` | Optional webhook to POST approver notifications to; logs to the console if unset |
| `CORS_ORIGIN` | Origin allowed to call the API (default `http://localhost:5173`) |

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
