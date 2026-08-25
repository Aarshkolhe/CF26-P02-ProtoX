import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../context/IdentityContext";

export function RoleSwitcher() {
  const { role, requesterName, setAdmin, setRequester } = useIdentity();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(requesterName ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing]);

  function handleAdminClick() {
    setAdmin();
    navigate("/");
  }

  function handleRequesterClick() {
    if (role === "requester") {
      setDraftName(requesterName ?? "");
      setEditing(true);
      return;
    }
    if (requesterName) {
      setRequester(requesterName);
      navigate("/");
    } else {
      setDraftName("");
      setEditing(true);
    }
  }

  function confirmName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;
    setRequester(trimmed);
    setEditing(false);
    navigate("/");
  }

  const pillBase = "rounded-md px-2.5 py-1 text-xs font-medium transition";

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        onClick={handleAdminClick}
        className={pillBase}
        style={role === "admin" ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--ink-secondary)" }}
      >
        Admin
      </button>
      <button
        type="button"
        onClick={handleRequesterClick}
        className={pillBase}
        style={role === "requester" ? { background: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--ink-secondary)" }}
      >
        {requesterName ? requesterName : "Requester"}
      </button>

      {editing && (
        <form
          onSubmit={confirmName}
          className="absolute right-0 top-full z-50 mt-2 flex w-56 gap-1.5 rounded-lg border p-2 shadow-lg"
          style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
        >
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Set
          </button>
        </form>
      )}
    </div>
  );
}
