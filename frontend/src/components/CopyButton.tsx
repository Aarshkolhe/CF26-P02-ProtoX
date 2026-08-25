import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (permissions/insecure context) — fail silently
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded p-0.5 align-middle transition hover:bg-white/10 active:scale-90"
      style={{ color: copied ? "var(--status-good)" : "var(--ink-muted)" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
