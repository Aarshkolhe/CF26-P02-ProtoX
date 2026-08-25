import type { StepType } from "../types";

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

export const DEFAULT_APPROVAL_TIMEOUT_MS = 45_000;
