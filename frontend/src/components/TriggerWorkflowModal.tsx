import { Building2, Clock, DollarSign, Play, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("12000");
  const [requestedBy, setRequestedBy] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(TIMEOUT_OPTIONS[1].ms);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = triggerWorkflow(
      {
        vendorName: vendorName.trim() || `Vendor ${Math.floor(Math.random() * 1000)}`,
        billingAmount: amount,
        requestedBy: requestedBy.trim() || "Unassigned",
      },
      timeoutMs,
    );
    setVendorName("");
    setRequestedBy("");
    onClose();
    navigate(`/workflows/${id}`);
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
            className={fieldInputClass}
          />
        </IconField>

        <IconField label="Approval timeout" icon={Clock}>
          <select value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} className={fieldInputClass}>
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                {opt.label}
              </option>
            ))}
          </select>
        </IconField>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition hover:brightness-110"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Play size={15} fill="currentColor" />
          Trigger workflow
        </button>
      </form>
    </Modal>
  );
}
