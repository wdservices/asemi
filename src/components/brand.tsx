import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 font-sans font-bold text-foreground",
        className,
      )}
    >
      <img
        src="/asemi_logo.png"
        alt="Asemi logo"
        className="size-9 shrink-0 rounded-xl bg-white object-contain shadow-sm ring-1 ring-slate-200"
      />
      {!compact && <span className="text-lg tracking-tight">Asemi</span>}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {icon && <span className="text-blue-600">{icon}</span>}
      </div>
      <p className="mt-2 font-sans text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  approved: "bg-genuine/10 text-genuine",
  pending: "bg-caution/15 text-caution-foreground",
  awaiting_payment: "bg-caution/15 text-caution-foreground",
  generating: "bg-cyan/10 text-cyan",
  needs_info: "bg-cyan/10 text-cyan",
  rejected: "bg-invalid/10 text-invalid",
  ready: "bg-genuine/10 text-genuine",
  open: "bg-caution/15 text-caution-foreground",
  reviewed: "bg-genuine/10 text-genuine",
  escalated: "bg-invalid/10 text-invalid",
  none: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <p className="font-sans text-lg font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
