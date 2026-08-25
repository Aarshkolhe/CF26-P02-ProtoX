import { Building2, Clock, DollarSign, Play, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../context/IdentityContext";
import { useCoordinator } from "../hooks/useCoordinator";
import { fieldInputClass, IconField } from "./IconField";
import { Modal } from "./Modal";

const TIMEOUT_OPTIONS = [
  { label: "20s (fast demo)", ms: 20_000 },
  { label: "45s (default)", ms: 45_000 },
  { label: "90s", ms: 90_000 },
];

export function TriggerWorkflowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { triggerWorkflow } = useCoordinator();
  const { role, requesterName } = useIdentity();
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("12000");
  const [requestedBy, setRequestedBy] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(TIMEOUT_OPTIONS[1].ms);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lockedRequester = role === "requester" && requesterName ? requesterName : null;

  useEffect(() => {
    if (open && lockedRequester) setRequestedBy(lockedRequester);
  }, [open, lockedRequester]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const id = await triggerWorkflow(
        {
          vendorName: vendorName.trim() || `Vendor ${Math.floor(Math.random() * 1000)}`,
          billingAmount: amount,
          requestedBy: lockedRequester ?? (requestedBy.trim() || "Unassigned"),
        },
        timeoutMs,
      );
      setVendorName("");
      setRequestedBy("");
      onClose();
      navigate(`/workflows/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to trigger workflow");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Trigger workflow" subtitle="Start a new vendor onboarding saga" icon={<Play size={16} />}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <IconField label="Vendor name" icon={Building2}>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Acme Corporation"
            autoFocus
            className={fieldInputClass}
          />
        </IconField>

        <IconField label="Amount (USD)" icon={DollarSign}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            placeholder="50 000"
            className={fieldInputClass}
          />
        </IconField>

        <IconField label="Requested by" icon={UserRound}>
          <input
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="J. Smith"
            disabled={Boolean(lockedRequester)}
            className={`${fieldInputClass} disabled:opacity-70`}
          />
        </IconField>

        <IconField label="Approval timeout" icon={Clock}>
          <select
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            className={fieldInputClass}
            style={{ background: "var(--surface-raised)", color: "var(--ink)" }}
          >
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms} style={{ background: "var(--surface-raised)", color: "var(--ink)" }}>
                {opt.label}
              </option>
            ))}
          </select>
        </IconField>

        {submitError && (
          <p className="text-sm" style={{ color: "var(--status-critical)" }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition hover:brightness-110 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Play size={15} fill="currentColor" />
          {submitting ? "Triggering…" : "Trigger workflow"}
        </button>
      </form>
    </Modal>
  );
}
