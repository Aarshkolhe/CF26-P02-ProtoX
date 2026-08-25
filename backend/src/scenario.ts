import type { StepType } from "@prisma/client";

export interface StepBlueprint {
  id: string;
  name: string;
  type: StepType;
  service?: string;
  compensationName?: string;
}

// The vendor onboarding demo workflow from PROJECT_CONTEXT.md:
// register vendor (CRM) -> set up billing (payment) -> finance approval
// (human checkpoint) -> create procurement ticket (inventory).
export const VENDOR_ONBOARDING_STEPS: StepBlueprint[] = [
  {
    id: "register_vendor",
    name: "Register vendor",
    type: "service",
    service: "CRM",
    compensationName: "Deactivate vendor record",
  },
  {
    id: "setup_billing",
    name: "Set up billing",
    type: "service",
    service: "Payment",
    compensationName: "Cancel billing setup",
  },
  {
    id: "finance_approval",
    name: "Finance approval",
    type: "approval",
  },
  {
    id: "create_procurement_ticket",
    name: "Create procurement ticket",
    type: "service",
    service: "Inventory",
    compensationName: "Cancel procurement ticket",
  },
];

export const DEFAULT_APPROVAL_TIMEOUT_MS = Number(process.env.APPROVAL_TIMEOUT_MINUTES ?? "1") * 60_000;

export const RETRY_BACKOFF_MS = 4_000;
export const MAX_SERVICE_ATTEMPTS = 3;
export const COMPENSATION_STEP_MS = 1_500;
export const JOB_POLL_INTERVAL_MS = 2_000;
