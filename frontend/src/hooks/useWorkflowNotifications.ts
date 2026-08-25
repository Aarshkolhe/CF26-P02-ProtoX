import { useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { formatVendorLabel } from "../lib/format";
import type { WorkflowInstance } from "../types";

// Watches for status transitions across polls and raises a toast for the
// ones a human would actually want to notice. Skips the very first
// snapshot (page load) so existing workflows don't all toast at once.
export function useWorkflowNotifications(workflows: WorkflowInstance[]): void {
  const { addToast } = useToast();
  const prevStatuses = useRef<Map<string, string>>(new Map());
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      for (const w of workflows) prevStatuses.current.set(w.id, w.status);
      return;
    }

    for (const w of workflows) {
      const prev = prevStatuses.current.get(w.id);
      if (prev !== undefined && prev !== w.status) {
        const vendor = formatVendorLabel(w.context);
        if (w.status === "awaiting_approval") {
          addToast({ message: `${vendor} needs finance approval`, variant: "warning" });
        } else if (w.status === "completed") {
          addToast({ message: `${vendor} completed successfully`, variant: "good" });
        } else if (w.status === "compensated") {
          addToast({ message: `${vendor} rolled back — compensation complete`, variant: "rollback" });
        }
      }
      prevStatuses.current.set(w.id, w.status);
    }

    const currentIds = new Set(workflows.map((w) => w.id));
    for (const id of prevStatuses.current.keys()) {
      if (!currentIds.has(id)) prevStatuses.current.delete(id);
    }
  }, [workflows, addToast]);
}
