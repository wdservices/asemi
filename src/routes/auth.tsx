import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentUserId } from "@/lib/auth";
import { Logo } from "@/components/brand";
import { AuthCard } from "@/components/asemi/AuthCard";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "login" | "register" } => {
    return {
      mode: search["mode"] === "register" ? "register" : "login",
    };
  },
  head: () => ({
    meta: [
      { title: "Manufacturer Portal — Asemi" },
      {
        name: "description",
        content:
          "Sign in or register your enterprise brand on the Asemi product authentication registry.",
      },
      { property: "og:title", content: "Manufacturer Portal — Asemi" },
      {
        property: "og:description",
        content: "Enterprise manufacturer access to the Asemi product authentication platform.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const initialMode = search.mode || "login";

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        navigate({ to: "/dashboard", replace: true });
      }
    })();
  }, [navigate]);

  return (
    <main className="ambient-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Navigation & Branding Header */}
        <div className="w-full flex items-center justify-between mb-6 px-1 relative z-20">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#78716c] hover:text-[#1a1a1e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Registry</span>
          </Link>
          <Logo />
        </div>

        {/* Unified Authentication Card (Same UI for Login and Register) */}
        <AuthCard
          initialMode={initialMode}
          onSuccess={(role) => {
            if (role === "ADMIN") {
              navigate({ to: "/admin" });
            } else {
              navigate({ to: "/dashboard" });
            }
          }}
          isModal={false}
        />
      </div>
    </main>
  );
}
