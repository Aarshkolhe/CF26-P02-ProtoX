import { AlertTriangle, Bell, CheckCircle2, RotateCcw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "good" | "warning" | "critical" | "rollback";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (toast: { message: string; variant: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 6000;

const VARIANT_CONFIG: Record<ToastVariant, { icon: LucideIcon; color: string; wash: string }> = {
  good: { icon: CheckCircle2, color: "var(--status-good)", wash: "var(--status-good-wash)" },
  warning: { icon: Bell, color: "var(--status-warning)", wash: "var(--status-warning-wash)" },
  critical: { icon: AlertTriangle, color: "var(--status-critical)", wash: "var(--status-critical-wash)" },
  rollback: { icon: RotateCcw, color: "var(--status-rollback)", wash: "var(--status-rollback-wash)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, variant }: { message: string; variant: ToastVariant }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
            {toasts.map((t) => {
              const config = VARIANT_CONFIG[t.variant];
              const Icon = config.icon;
              return (
                <div
                  key={t.id}
                  className="animate-fade-in-up hover-lift flex items-start gap-3 rounded-xl border p-3 shadow-lg"
                  style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: config.wash, color: config.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <p className="flex-1 pt-0.5 text-sm" style={{ color: "var(--ink)" }}>
                    {t.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeToast(t.id)}
                    aria-label="Dismiss"
                    className="shrink-0 rounded p-0.5 transition hover:bg-white/10"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
