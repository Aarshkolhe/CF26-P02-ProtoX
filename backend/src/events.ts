import { EventEmitter } from "node:events";

export interface WorkflowUpdateEvent {
  workflowId: string;
  type: string;
  message: string;
}

// In-process pub/sub: every audit() call in the coordinator broadcasts here,
// so SSE clients hear about a change at the exact moment it's committed —
// no extra bookkeeping, reusing the points where state already changes.
export const workflowEvents = new EventEmitter();
workflowEvents.setMaxListeners(50);
