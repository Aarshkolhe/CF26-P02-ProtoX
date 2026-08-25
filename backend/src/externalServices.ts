import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

interface CallResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Deterministic stand-ins for CRM/payment/inventory systems (no real
// integrations for the demo, per PROJECT_CONTEXT.md). register_vendor
// fails its first attempt every run so the retry/backoff path is always
// visible; everything else succeeds immediately.
function simulateExternalCall(stepId: string, attempt: number): CallResult {
  if (stepId === "register_vendor" && attempt === 1) {
    return { ok: false, error: "Simulated transient network error from CRM service" };
  }
  return { ok: true, data: { confirmedAt: new Date().toISOString() } };
}

// The idempotency guard: a successful call's result is cached under its
// key, so retrying the same step (same key) never re-applies the effect —
// it just returns the cached result. A failed attempt is never cached,
// since nothing was actually applied downstream, so retrying is safe and
// expected.
export async function callExternalService(stepId: string, idempotencyKey: string, attempt: number): Promise<CallResult> {
  const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
  if (existing) {
    return { ok: true, data: existing.response as Record<string, unknown> };
  }

  const result = simulateExternalCall(stepId, attempt);
  if (result.ok) {
    await prisma.idempotencyKey.create({
      data: { key: idempotencyKey, response: (result.data ?? {}) as Prisma.InputJsonValue },
    });
  }
  return result;
}

// Stands in for notifying a human approver (README: "simple email or
// webhook call"). Posts to NOTIFICATION_WEBHOOK_URL if configured,
// otherwise just logs — never blocks the workflow on delivery.
export async function notifyApprover(message: string): Promise<void> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(`[notify] ${message}`);
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error("[notify] webhook delivery failed:", err);
  }
}
