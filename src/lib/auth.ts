import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { requireAuth, requireDb } from "./firebase";
import type { Company } from "./db";

/** Resolve the current uid fast — no long waits that block routing. */
export function getCurrentUserId(): Promise<string | null> {
  const auth = requireAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser?.uid ?? null);
    }, 2000);
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        clearTimeout(timer);
        unsub();
        resolve(u?.uid ?? null);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Synchronous fast-path for route guards — avoids async wait entirely. */
export function getCachedUserId(): string | null {
  try {
    return requireAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

export type { Company };

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Session {
  user: SessionUser;
}

export function useSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["session"],
    // Authoritative: wait briefly for Firebase to restore the session instead of
    // reading currentUser synchronously (which is null on first load and would
    // incorrectly cache a logged-out state).
    queryFn: async (): Promise<Session | null> => {
      const auth = requireAuth();
      const user =
        auth.currentUser ??
        (await new Promise<import("firebase/auth").User | null>((resolve) => {
          const timer = setTimeout(() => {
            unsub();
            resolve(auth.currentUser ?? null);
          }, 2500);
          const unsub = onAuthStateChanged(
            auth,
            (u) => {
              clearTimeout(timer);
              unsub();
              resolve(u);
            },
            () => {
              clearTimeout(timer);
              resolve(null);
            },
          );
        }));
      if (!user) return null;
      return { user: { id: user.uid, email: user.email } };
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Keep session cache in sync with Firebase Auth instantly — no full invalidation storms.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const auth = requireAuth();
      unsub = onAuthStateChanged(auth, (u) => {
        queryClient.setQueryData(["session"], u ? { user: { id: u.uid, email: u.email } } : null);
      });
    } catch {
      // Firebase not configured — ignore.
    }
    return () => unsub?.();
  }, [queryClient]);

  return query;
}

export function useIsAdmin() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["is-admin", session?.user.id],
    enabled: !!session,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (session?.user.email && session.user.email.toLowerCase() === "spellz49@gmail.com") {
        return true;
      }
      const snap = await getDoc(doc(requireDb(), "roles", session!.user.id));
      return snap.exists() && snap.data()?.["role"] === "admin";
    },
  });
}

export function useMyCompany() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["my-company", session?.user.id],
    enabled: !!session,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { getCompany } = await import("./db");
      return getCompany(session!.user.id);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut(requireAuth());
    navigate({ to: "/auth", replace: true });
  };
}

export function getSignedInUserId(): string | null {
  try {
    return requireAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

export const CATEGORIES = [
  "Personal care",
  "Oral care",
  "Household",
  "Food & beverage",
  "Pharmaceutical",
  "Cosmetics",
  "Other",
];

export function normalizeCode(input: string) {
  const raw = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}

export function verifyUrl(code: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/v/${code}`;
}
