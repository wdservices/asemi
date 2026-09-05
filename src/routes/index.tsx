import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine, QrCode, BarChart3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand";
import { normalizeCode, useSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel — Product Authentication for Brands" },
      { name: "description", content: "Issue unique QR verification codes per batch and let consumers confirm genuine products with a phone camera." },
      { property: "og:title", content: "Sentinel — Product Authentication for Brands" },
      { property: "og:description", content: "Unique QR codes per production batch. Consumers verify instantly, no app required." },
    ],
  }),
  component: Index,
});

function Index() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { data: session } = useSession();

  return (
    <main className="ambient-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/verify" className="px-3 text-sm text-muted-foreground hover:text-foreground">Verify a product</Link>
          {session ? (
            <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Manufacturer sign in</Link></Button>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Product authentication</p>
          <h1 className="mt-3 font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Every unit verifiable.<br />Every counterfeit visible.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Sentinel issues a unique QR code for every product in every batch. Consumers scan with their phone camera
            — no app — and get an instant genuine / not-genuine answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Register your brand</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/verify">Verify a code</Link></Button>
          </div>
        </div>

        <div className="frost rounded-3xl p-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="size-4 text-cyan" /> Check a product now
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Enter the 12-character code printed under the QR.</p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.replace(/-/g, "").length === 12) navigate({ to: "/v/$code", params: { code } });
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="XXXX-XXXX-XXXX"
              className="h-12 font-mono text-lg tracking-widest"
              aria-label="Verification code"
            />
            <Button className="h-12" disabled={code.replace(/-/g, "").length !== 12}>Verify</Button>
          </form>
          <ul className="mt-8 grid gap-4 text-sm">
            {[
              [QrCode, "Per-batch code generation", "Generate thousands of unique codes, export CSV or print QR sheets."],
              [BarChart3, "Scan analytics", "See where and how often each code is scanned, with fraud flags."],
              [ShieldCheck, "Verified manufacturers", "Every brand is reviewed before it can issue codes."],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof QrCode;
              return (
                <li key={title as string} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary"><I className="size-4" /></span>
                  <div>
                    <p className="font-medium">{title as string}</p>
                    <p className="text-muted-foreground">{desc as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
