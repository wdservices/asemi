import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/firebase/client";
import { DEMO_USERS, useDemoSignIn, type DemoUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Asemi" },
      {
        name: "description",
        content: "Sign in or create a manufacturer account to issue verification codes.",
      },
      { property: "og:title", content: "Sign in — Asemi" },
      {
        property: "og:description",
        content: "Manufacturer access to the Asemi product authentication platform.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const demoSignIn = useDemoSignIn();
  const [busy, setBusy] = useState<string | null>(null);

  const u0 = DEMO_USERS[0]!;
  const u1 = DEMO_USERS[1]!;
  const u2 = DEMO_USERS[2]!;
  const u3 = DEMO_USERS[3]!;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard", replace: true });
    })();
  }, [navigate]);

  async function signIn(user: DemoUser) {
    setBusy(user.id);
    try {
      await demoSignIn(user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="ambient-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="frost w-full max-w-lg rounded-2xl p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">Demo sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Firebase auth will be wired later. For now, pick a seeded persona to jump into the
          dashboard.
        </p>

        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start !text-left"
            disabled={busy !== null}
            onClick={() => signIn(u0)}
          >
            <div className="flex flex-col items-start gap-0.5 pr-4">
              <span className="text-sm font-semibold">{u0.name}</span>
              <span className="text-xs text-muted-foreground">
                Signed in as approved manufacturer — all company screens work
              </span>
            </div>
            {busy === u0.id ? "…" : "→"}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start !text-left"
            disabled={busy !== null}
            onClick={() => signIn(u2)}
          >
            <div className="flex flex-col items-start gap-0.5 pr-4">
              <span className="text-sm font-semibold">{u2.name}</span>
              <span className="text-xs text-muted-foreground">
                Company with status "pending" — exercises the approval UI and onboarding blocker
              </span>
            </div>
            {busy === u2.id ? "…" : "→"}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start !text-left"
            disabled={busy !== null}
            onClick={() => signIn(u3)}
          >
            <div className="flex flex-col items-start gap-0.5 pr-4">
              <span className="text-sm font-semibold">{u3.name}</span>
              <span className="text-xs text-muted-foreground">
                Company with status "needs info" with an admin note already set
              </span>
            </div>
            {busy === u3.id ? "…" : "→"}
          </Button>

          <Button
            className="w-full justify-start !text-left"
            disabled={busy !== null}
            onClick={() => signIn(u1)}
          >
            <div className="flex flex-col items-start gap-0.5 pr-4">
              <span className="text-sm font-semibold">{u1.name}</span>
              <span className="text-xs text-muted-foreground">
                Platform admin — approvals, companies, fraud, reports
              </span>
            </div>
            {busy === u1.id ? "…" : "→"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Running in offline demo mode with seeded in-memory data. Real Firebase auth coming soon.
        </p>
      </div>
    </main>
  );
}
