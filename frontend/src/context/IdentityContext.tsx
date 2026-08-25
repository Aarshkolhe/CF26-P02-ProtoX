import { createContext, useContext, useEffect, useState } from "react";

export type Role = "admin" | "requester";

interface Identity {
  role: Role;
  requesterName: string | null;
}

interface IdentityContextValue extends Identity {
  setAdmin: () => void;
  setRequester: (name: string) => void;
}

const STORAGE_KEY = "protox.identity.v1";

const IdentityContext = createContext<IdentityContextValue | undefined>(undefined);

function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    // corrupt/blocked storage — fall back to default
  }
  return { role: "admin", requesterName: null };
}

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity>(loadIdentity);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    } catch {
      // best-effort persistence only
    }
  }, [identity]);

  const setAdmin = () => setIdentity((prev) => ({ ...prev, role: "admin" }));
  const setRequester = (name: string) => setIdentity({ role: "requester", requesterName: name });

  return <IdentityContext.Provider value={{ ...identity, setAdmin, setRequester }}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within an IdentityProvider");
  return ctx;
}

export function matchesRequester(contextRequestedBy: string | undefined, requesterName: string | null): boolean {
  if (!requesterName) return false;
  return (contextRequestedBy ?? "").trim().toLowerCase() === requesterName.trim().toLowerCase();
}
