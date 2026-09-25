import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/brand";
import { normalizeCode } from "@/lib/auth";
import { fnVerifyCode, submitReport, type VerifyResult } from "@/lib/db";

export const Route = createFileRoute("/v/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.code} — Asemi` },
      { name: "description", content: "Check whether this product is genuine." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Product verification — Asemi" },
      { property: "og:description", content: "Check whether this product is genuine." },
    ],
  }),
  component: VerifyResult,
});

type Result = {
  status: "genuine" | "soft_escalation" | "invalid";
  code?: string;
  scan_count?: number | undefined;
  product?: VerifyResult["product"] | undefined;
  company?: VerifyResult["company"] | undefined;
  batch?: VerifyResult["batch"] | undefined;
};

function browserToken() {
  const k = "sentinel_token";
  let t = typeof window !== "undefined" ? localStorage.getItem(k) : null;
  if (!t && typeof window !== "undefined") {
    t = crypto.randomUUID();
    localStorage.setItem(k, t);
  }
  return t || "tok_anonymous";
}

function VerifyResult() {
  const { code } = Route.useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp =
          typeof window !== "undefined"
            ? `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
            : "browser_fp";
        const res = await fnVerifyCode({
          code,
          browserToken: browserToken(),
          deviceFingerprint: fp,
        });
        if (cancelled) return;

        if (res.status === "invalid") {
          setResult({ status: "invalid", code });
        } else {
          setResult({
            status: res.status === "genuine_repeated" ? "soft_escalation" : "genuine",
            code: res.code || code,
            scan_count: res.scan_count,
            product: res.product,
            company: res.company,
            batch: res.batch,
          });
        }
      } catch (err) {
        console.error("Verification error:", err);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <main className="ambient-bg flex min-h-screen flex-col items-center px-4 pb-16 pt-6 font-sans">
      <Logo compact className="self-start" />
      <div className="mt-6 w-full max-w-sm">
        {!result && !error && <Skeleton />}
        {error && (
          <Card
            tone="invalid"
            title="Couldn't verify"
            subtitle="Check your connection and try again."
          />
        )}
        {result?.status === "invalid" && (
          <Card
            tone="invalid"
            title="Not recognised"
            subtitle="This code is not in our registry. The product may be counterfeit."
            code={normalizeCode(code)}
          />
        )}
        {result && result.status !== "invalid" && (
          <>
            <Card
              tone={result.status === "genuine" ? "genuine" : "caution"}
              title={result.status === "genuine" ? "Genuine product" : "Checked Several Times"}
              subtitle={
                result.status === "genuine"
                  ? `Verified by ${result.company?.name || "the manufacturer"}.`
                  : `This code has been checked ${result.scan_count} times from different locations. If something feels off, let us know.`
              }
              code={result.code as string}
            />
            <div className="panel mt-4 overflow-hidden">
              {result.product?.image && (
                <img
                  src={result.product.image}
                  alt={result.product.name}
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="p-5">
                <p className="eyebrow">Product</p>
                <p className="mt-1 font-display text-xl font-semibold">{result.product?.name}</p>
                <p className="text-sm text-muted-foreground">{result.product?.category}</p>
                {result.product?.description && (
                  <p className="mt-3 text-sm">{result.product.description}</p>
                )}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Manufacturer</dt>
                    <dd className="font-medium">{result.company?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Batch</dt>
                    <dd className="font-mono font-medium">{result.batch?.number}</dd>
                  </div>
                  {(result.product?.lotNumber || result.batch?.lotNumber) && (
                    <div>
                      <dt className="text-muted-foreground">Lot number</dt>
                      <dd className="font-mono font-medium">
                        {result.product?.lotNumber || result.batch?.lotNumber}
                      </dd>
                    </div>
                  )}
                  {(result.product?.mfgDate || result.product?.expiryDate) && (
                    <div>
                      <dt className="text-muted-foreground">Dates</dt>
                      <dd className="font-medium">
                        {result.product?.mfgDate
                          ? `Mfg ${new Date(result.product.mfgDate).toLocaleDateString()}`
                          : ""}
                        {result.product?.mfgDate && result.product?.expiryDate ? " · " : ""}
                        {result.product?.expiryDate
                          ? `Exp ${new Date(result.product.expiryDate).toLocaleDateString()}`
                          : ""}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Produced</dt>
                    <dd className="font-medium">
                      {result.batch?.produced_at
                        ? new Date(result.batch.produced_at).toLocaleDateString()
                        : "Recently"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total Scans</dt>
                    <dd className="font-medium">{result.scan_count}</dd>
                  </div>
                </dl>
                {result.product?.regulatoryNumber && (
                  <p className="mt-4 rounded-lg bg-genuine/10 px-3 py-2 text-xs font-medium text-genuine">
                    Registered approval: {result.product.regulatoryNumber}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        {(result || error) && (
          <ReportForm
            code={normalizeCode(code)}
            companyName={result?.company?.name}
            productName={result?.product?.name}
          />
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/verify" className="underline">
            Check another code
          </Link>
          <span className="mx-2">•</span>
          <Link to="/" className="underline">
            Return to Asemi Home
          </Link>
        </p>
      </div>
    </main>
  );
}

function Card({
  tone,
  title,
  subtitle,
  code,
}: {
  tone: "genuine" | "caution" | "invalid";
  title: string;
  subtitle: string;
  code?: string;
}) {
  const Icon = tone === "genuine" ? CheckCircle2 : tone === "caution" ? AlertTriangle : XCircle;
  const bg =
    tone === "genuine"
      ? "bg-genuine text-genuine-foreground"
      : tone === "caution"
        ? "bg-caution text-caution-foreground"
        : "bg-invalid text-invalid-foreground";
  const verifyHref =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/v/${encodeURIComponent(code.replace(/\s/g, ""))}`
      : undefined;
  return (
    <div
      className={`animate-stamp rounded-3xl p-7 shadow-frost-lg ${bg}`}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-14" strokeWidth={1.75} />
      <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-sm opacity-90">{subtitle}</p>
      {code &&
        (verifyHref ? (
          <a
            href={verifyHref}
            className="mt-4 block font-mono text-sm tracking-widest opacity-90 underline underline-offset-4 hover:opacity-100"
            title="Open verification page for this code"
          >
            {code}
          </a>
        ) : (
          <p className="mt-4 font-mono text-sm tracking-widest opacity-80">{code}</p>
        ))}
    </div>
  );
}

function Skeleton() {
  return <div className="h-56 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
}

function ReportForm({
  code,
  productName,
}: {
  code: string;
  companyName?: string | undefined;
  productName?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent)
    return (
      <p className="mt-6 text-center text-sm text-genuine">
        Thanks — your report was sent to our security team and the brand manufacturer.
      </p>
    );
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Flag className="size-4" /> Report a suspicious product
      </button>
    );
  return (
    <form
      className="animate-rise panel mt-6 space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        (async () => {
          try {
            await submitReport({
              codeId: null,
              companyId: null,
              codeString: code,
              message: `[${productName || "Reported item"}] ${message}`,
              contact: contact || null,
            });
            setBusy(false);
            setSent(true);
            toast.success("Report submitted successfully");
          } catch (err) {
            console.error(err);
            setBusy(false);
            toast.error("Failed to submit report. Please try again.");
          }
        })();
      }}
    >
      <p className="font-medium">Report this product</p>
      <Textarea
        required
        minLength={5}
        placeholder="What looks wrong? Where did you buy it?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Input
        placeholder="Email or phone (optional)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          Send report
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
