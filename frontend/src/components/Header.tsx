import { GitBranch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useIdentity } from "../context/IdentityContext";
import { useCoordinator } from "../hooks/useCoordinator";
import { RoleSwitcher } from "./RoleSwitcher";

export function Header() {
  const { resetAll } = useCoordinator();
  const { role } = useIdentity();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirming) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [confirming]);

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--page) 85%, transparent)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6"
            style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
          >
            <GitBranch size={16} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>
              ProtoX Coordinator
            </span>
            <span className="text-xs leading-tight" style={{ color: "var(--ink-muted)" }}>
              Distributed transaction coordinator · human-in-the-loop
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <RoleSwitcher />

          {role === "admin" && (
            <div ref={containerRef} className="flex items-center gap-2">
              {confirming && (
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Clear all workflows?
                </span>
              )}
              {confirming ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    navigate("/");
                    resetAll().catch((err) => console.error("Failed to reset demo data:", err));
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition hover:brightness-110 active:scale-95"
                  style={{ background: "var(--status-critical)", color: "#ffffff" }}
                >
                  Confirm reset
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-white/5 active:scale-95"
                  style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
                >
                  Reset demo data
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
