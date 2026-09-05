import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand";
import { normalizeCode } from "@/lib/auth";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a product — Sentinel" },
      { name: "description", content: "Enter the code printed on your product to check whether it is genuine." },
      { property: "og:title", content: "Verify a product — Sentinel" },
      { property: "og:description", content: "Check whether your product is genuine in seconds." },
    ],
  }),
  component: VerifyEntry,
});

function VerifyEntry() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const ready = code.replace(/-/g, "").length === 12;
  return (
    <main className="ambient-bg flex min-h-screen flex-col items-center px-4 py-8">
      <Logo />
      <div className="frost mt-10 w-full max-w-sm rounded-2xl p-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Verify a product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the QR code with your camera, or type the code printed beneath it.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) navigate({ to: "/v/$code", params: { code } });
          }}
        >
          <Input
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="XXXX-XXXX-XXXX"
            className="h-14 text-center font-mono text-xl tracking-[0.3em]"
            aria-label="Verification code"
          />
          <Button className="h-12 w-full" disabled={!ready}>Check code</Button>
        </form>
      </div>
    </main>
  );
}
