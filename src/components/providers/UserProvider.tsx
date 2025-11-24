// components/UserProvider.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type UserPayload = {
  name?: string;
  email?: string;
  monthlyIncome?: number | null;
  theme?: "light" | "dark" | null;
  // ...other fields
};

type Context = {
  user: UserPayload | null;
  loading: boolean;
  setUser: (u: UserPayload | null) => void;
  updateUser: (patch: Partial<UserPayload>) => Promise<UserPayload | null>;
};

const UserContext = createContext<Context | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      // Try server first
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const json = await res.json();
          if (mounted) {
            setUser(json || null);
            setLoading(false);
            return;
          }
        } else if (res.status === 204) {
          // no user doc yet; fall through to session fallback
        } else {
          // fall back
          console.warn("/api/user returned", res.status);
        }
      } catch (err) {
        console.warn("Failed to load /api/user", err);
      }

      // fallback -> use session user
      if (mounted) {
        if (session?.user) {
          setUser({
            name: session.user.name ?? undefined,
            email: session.user.email ?? undefined,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [session]);

  async function updateUser(
    patch: Partial<UserPayload>
  ): Promise<UserPayload | null> {
    // optimistic local update
    setUser((prev) => ({ ...(prev || {}), ...patch }));

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `PUT /api/user failed (${res.status})`);
      }
      const updated = await res.json();
      setUser(updated);
      return updated;
    } catch (err) {
      console.error("updateUser failed", err);
      // revert: reload from server/session
      try {
        const refetch = await fetch("/api/user");
        if (refetch.ok) {
          const json = await refetch.json();
          setUser(json || null);
          return json;
        }
      } catch {}
      // if re-fetch fails, leave optimistic state (user will see something)
      return null;
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
