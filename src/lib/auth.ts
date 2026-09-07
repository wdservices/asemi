import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fb as supabase, getMockSession } from "@/integrations/firebase/client";
import type { Tables } from "@/integrations/firebase/types";

export type Company = Tables<"companies">;

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["is-admin", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: session!.user.id,
        _role: "admin",
      });
      return !!data;
    },
  });
}

export function useMyCompany() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["my-company", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "company" | "admin";
}
export const DEMO_USERS: DemoUser[] = [
  {
    id: "usr_company_demo_001",
    name: "Demo Company User",
    email: "company@asemi.demo",
    role: "company",
  },
  { id: "usr_admin_demo_001", name: "Demo Admin", email: "admin@asemi.demo", role: "admin" },
  {
    id: "usr_pending_003",
    name: "Demo Pending Company (Ivory Dental)",
    email: "pending@asemi.demo",
    role: "company",
  },
  {
    id: "usr_needsinfo_004",
    name: "Demo Needs-Info Company (Malomo Foods)",
    email: "needsinfo@asemi.demo",
    role: "company",
  },
];

export function getSignedInUserId(): string | null {
  return getMockSession()?.user.id ?? null;
}

export function useDemoSignIn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async (userId: string) => {
    const match = DEMO_USERS.find((u) => u.id === userId);
    const roles = match?.role === "admin" ? ["admin"] : undefined;
    await supabase.auth.signInAs(userId, match?.email, roles);
    await queryClient.cancelQueries();
    queryClient.clear();
    await queryClient.invalidateQueries();
    navigate({ to: "/dashboard", replace: true });
  };
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
