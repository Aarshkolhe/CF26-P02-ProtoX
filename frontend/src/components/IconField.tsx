import type { LucideIcon } from "lucide-react";

export function IconField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium" style={{ color: "var(--ink)" }}>
      {label}
      <div className="relative mt-1.5">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
        {children}
      </div>
    </label>
  );
}

export const fieldInputClass =
  "w-full rounded-lg border border-[var(--border)] bg-transparent py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]";
