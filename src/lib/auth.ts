import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { requireAuth, requireDb } from "./firebase";
import type { Company } from "./db";

/** Resolve the current uid, waiting for Firebase Auth to restore session. */
export function getCurrentUserId(): Promise<string | null> {
  const auth = requireAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser?.uid ?? null);
    }, 8000);
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

export type { Company };

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Session {
  user: SessionUser;
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<Session | null> => {
      const user = requireAuth().currentUser;
      if (!user) return null;
      return { user: { id: user.uid, email: user.email } };
    },
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["is-admin", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
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
