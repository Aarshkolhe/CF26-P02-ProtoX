import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 transition hover:bg-white/10"
          style={{ color: "var(--ink-muted)" }}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          {icon && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
            >
              {icon}
            </span>
          )}
          <div>
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
