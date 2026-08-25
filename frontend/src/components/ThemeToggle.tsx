import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import type { ThemeChoice } from "../hooks/useTheme";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const ICONS: Record<ThemeChoice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };
const LABELS: Record<ThemeChoice, string> = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  function cycle() {
    const idx = ORDER.indexOf(theme);
    setTheme(ORDER[(idx + 1) % ORDER.length]);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${LABELS[theme]} — click to change`}
      title={`${LABELS[theme]} — click to change`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:bg-white/5 active:scale-95"
      style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
    >
      <Icon size={15} />
    </button>
  );
}
