import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flag,
  ExternalLink,
  ShieldAlert,
  CalendarClock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/brand";
import { normalizeCode } from "@/lib/auth";
import { submitReport, verifyProductCode } from "@/lib/db";
import { verifyResultQueryKey } from "@/lib/verify-cache";

export const Route = createFileRoute("/v/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.code} — Asemi` },
      { name: "description", content: "Check whether this product is genuine." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Product authentication — Asemi" },
      { property: "og:description", content: "Verify provenance and authenticity." },
    ],
  }),
  component: VerifyResultPage,
});

type Result = {
  status: "genuine" | "soft_escalation" | "invalid";
  code?: string;
  scan_count?: number | undefined;
  recalled?: boolean;
  recallReason?: string | null;
  recalledAt?: string | null;
  product?: Awaited<ReturnType<typeof verifyProductCode>>["product"] | undefined;
  company?: Awaited<ReturnType<typeof verifyProductCode>>["company"] | undefined;
  batch?: Awaited<ReturnType<typeof verifyProductCode>>["batch"] | undefined;
};

function isExpiredDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return false;
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

function VerifyResultPage() {
  const { code } = Route.useParams();
  const displayCode = normalizeCode(code);

  const verifyQuery = useQuery({
    queryKey: verifyResultQueryKey(code),
    queryFn: () => verifyProductCode(code),
    staleTime: 8_000,
    gcTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const res = verifyQuery.data;
  const result: Result | null = res
    ? res.status === "invalid"
      ? { status: "invalid", code }
      : {
          status: res.status === "genuine_repeated" ? "soft_escalation" : "genuine",
          code: res.code || code,
          scan_count: res.scan_count,
          recalled: Boolean(res.recalled),
          recallReason: res.recallReason ?? null,
          recalledAt: res.recalledAt ?? null,
          product: res.product,
          company: res.company,
          batch: res.batch,
        }
    : null;
  const error = verifyQuery.isError && !result;

  const mfgDate = result?.batch?.mfgDate ?? result?.product?.mfgDate ?? null;
  const expiryDate = result?.batch?.expiryDate ?? result?.product?.expiryDate ?? null;
  const lotNumber = result?.batch?.lotNumber ?? result?.product?.lotNumber ?? null;
  const expired = isExpiredDate(expiryDate);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <Logo compact />
          <Link
            to="/verify"
            className="text-xs font-medium text-blue-700 hover:underline underline-offset-4"
          >
            Scan another code
          </Link>
        </div>

        <div className="mt-6">
          {!result && !error && <VerificationLoadingCard code={displayCode} />}
          {error && (
            <StatusStampCard
              tone="invalid"
              title="Couldn't verify"
              subtitle="Check your connection and try again."
              code={displayCode}
            />
          )}
          {result?.status === "invalid" && (
            <div className="animate-[rise_160ms_ease-out_both]">
              <StatusStampCard
                tone="invalid"
                badge="Unregistered serial code"
                title="Not recognised"
                subtitle="This serial code is not registered in Asemi. The item may be counterfeit or altered."
                code={displayCode}
              />
            </div>
          )}
          {result && result.status !== "invalid" && (
            <div className="animate-[rise_160ms_ease-out_both]">
              {result.recalled ? (
                <StatusStampCard
                  tone="recalled"
                  badge="Serial code registered · Recall active"
                  title="Product / Batch Recalled"
                  subtitle={
                    result.recallReason ||
                    `Urgent recall issued by ${result.company?.name || "the manufacturer"}. Discontinue use immediately.`
                  }
                  code={result.code as string}
                  meta={
                    result.recalledAt
                      ? `Issued ${new Date(result.recalledAt).toLocaleDateString()}`
                      : undefined
                  }
                />
              ) : (
                <StatusStampCard
                  tone={result.status === "genuine" ? "genuine" : "caution"}
                  badge="Original product verified"
                  title={
                    result.status === "genuine"
                      ? "Authentic product"
                      : `Genuine product · Scanned ${result.scan_count ?? 1} ${(result.scan_count ?? 1) === 1 ? "time" : "times"}`
                  }
                  subtitle={
                    result.status === "genuine"
                      ? `This serial code is original and registered by ${result.company?.name || "the manufacturer"}. Verified ${result.scan_count ?? 1} ${(result.scan_count ?? 1) === 1 ? "time" : "times"}.`
                      : `This serial code is original and registered to ${result.company?.name || "the manufacturer"}. It has been checked ${result.scan_count ?? 1} times across different sessions — inspect packaging seals carefully before opening.`
                  }
                  code={result.code as string}
                />
              )}

              {!result.recalled && expired && expiryDate && (
                <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold">Past labeled expiry date</p>
                    <p className="mt-0.5 text-amber-900/90 tabular-nums">
                      This batch expired on {new Date(expiryDate).toLocaleDateString()}. Verify
                      shelf-life suitability before use.
                    </p>
                  </div>
                </div>
              )}

              {/* Provenance Certificate */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {result.product?.image && (
                  <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <img
                      src={result.product.image}
                      alt={result.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Provenance Certificate
                      </p>
                      {result.recalled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                          Recall active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          <CheckCircle2 className="size-3" /> Verified original
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-sans text-xl font-bold tracking-tight text-slate-900">
                      {result.product?.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {result.product?.category}
                      {result.product?.sku ? (
                        <span className="font-mono text-xs text-slate-500">
                          {" · "}SKU {result.product.sku}
                        </span>
                      ) : null}
                    </p>
                    {result.product?.description && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {result.product.description}
                      </p>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Brand / Manufacturer</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {result.company?.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Batch</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {result.batch?.number || "—"}
                      </dd>
                    </div>
                    {lotNumber && (
                      <div>
                        <dt className="text-xs text-slate-400">Lot number</dt>
                        <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {lotNumber}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-slate-400">Verification scans</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                        {result.scan_count ?? 1}
                      </dd>
                    </div>
                    {mfgDate && (
                      <div>
                        <dt className="text-xs text-slate-400">Manufacture date</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                          {new Date(mfgDate).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {expiryDate && (
                      <div>
                        <dt className="text-xs text-slate-400">Expiry date</dt>
                        <dd
                          className={`mt-0.5 font-medium tabular-nums ${
                            expired ? "text-red-700" : "text-slate-900"
                          }`}
                        >
                          {new Date(expiryDate).toLocaleDateString()}
                          {expired ? " (Expired)" : ""}
                        </dd>
                      </div>
                    )}
                    {!mfgDate && !expiryDate && (
                      <div>
                        <dt className="text-xs text-slate-400">Registered</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                          {result.batch?.produced_at
                            ? new Date(result.batch.produced_at).toLocaleDateString()
                            : "Verified"}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {result.product?.regulatoryNumber && (
                    <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Regulatory registration:</span>{" "}
                      <span className="font-mono">{result.product.regulatoryNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification portal stamp */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <img
                  src="/asemi_logo.png"
                  alt="Asemi"
                  className="mx-auto size-10 rounded-xl bg-white object-contain ring-1 ring-slate-200"
                />
                <p className="mt-2 text-sm font-semibold text-slate-900">Protected by Asemi</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Each unit carries a cryptographically serialized code registered directly by the
                  brand manufacturer.
                </p>
                <Button asChild size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700">
                  <a
                    href={typeof window !== "undefined" ? window.location.href : `/v/${code}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open certificate link <ExternalLink className="ml-1.5 size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {(result || error) && (
            <ReportForm
              code={normalizeCode(code)}
              companyName={result?.company?.name}
              productName={result?.product?.name}
            />
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            <Link to="/verify" className="underline underline-offset-2 hover:text-slate-900">
              Scan or check another code
            </Link>
            <span className="mx-2">·</span>
            <Link to="/" className="underline underline-offset-2 hover:text-slate-900">
              Asemi home
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function StatusStampCard({
  tone,
  badge,
  title,
  subtitle,
  code,
  meta,
}: {
  tone: "genuine" | "caution" | "invalid" | "recalled";
  badge?: string | undefined;
  title: string;
  subtitle: string;
  code?: string;
  meta?: string | undefined;
}) {
  const Icon =
    tone === "genuine"
      ? CheckCircle2
      : tone === "caution"
        ? AlertTriangle
        : tone === "recalled"
          ? ShieldAlert
          : XCircle;
  const bg =
    tone === "genuine"
      ? "bg-emerald-600 text-white"
      : tone === "caution"
        ? "bg-amber-500 text-slate-950"
        : "bg-red-600 text-white";
  const badgeCls =
    tone === "genuine"
      ? "bg-white/15 text-white ring-1 ring-white/25"
      : tone === "caution"
        ? "bg-slate-950 text-emerald-300"
        : "bg-white/15 text-white ring-1 ring-white/25";
  const verifyHref =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/v/${encodeURIComponent(code.replace(/\s/g, ""))}`
      : undefined;

  return (
    <div className={`rounded-3xl p-7 shadow-sm ${bg}`} role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Icon className="size-12 shrink-0" strokeWidth={1.75} />
        {badge && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badgeCls}`}
          >
            {(tone === "genuine" || tone === "caution") && (
              <CheckCircle2
                className={`size-3.5 shrink-0 ${tone === "caution" ? "text-emerald-400" : ""}`}
              />
            )}
            <span>{badge}</span>
          </span>
        )}
      </div>
      <h1 className="mt-4 font-sans text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed opacity-95">{subtitle}</p>
      {(code || meta) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-90">
          {code &&
            (verifyHref ? (
              <a
                href={verifyHref}
                className="font-mono text-sm font-semibold tracking-wider underline underline-offset-4 hover:opacity-100 tabular-nums"
              >
                {code}
              </a>
            ) : (
              <span className="font-mono text-sm font-semibold tracking-wider tabular-nums">
                {code}
              </span>
            ))}
          {meta && <span className="tabular-nums">· {meta}</span>}
        </div>
      )}
    </div>
  );
}

function VerificationLoadingCard({ code }: { code: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <ShieldCheck className="size-3.5 text-blue-600" />
            Checking registry
          </span>
        </div>
        <h1 className="mt-4 font-sans text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Verifying product…
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Confirming authenticity and provenance record for this unit.
        </p>
        <p className="mt-4 font-mono text-sm font-semibold tracking-wider text-slate-800 tabular-nums">
          {code}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Provenance Certificate
        </p>
        <div className="mt-3 space-y-2.5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 grid grid-cols-2 gap-3 pt-2">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
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
      <p className="mt-6 text-center text-sm text-emerald-700">
        Thanks — your report was sent to our security team and the brand manufacturer.
      </p>
    );
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <Flag className="size-4" /> Report a suspicious product
      </button>
    );
  return (
    <form
      className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
      <p className="font-medium text-slate-900">Report this product</p>
      <Textarea
        required
        minLength={5}
        placeholder="What looks wrong? Where did you purchase it?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Input
        placeholder="Email or phone (optional)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-700">
          Send report
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
