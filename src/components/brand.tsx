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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </p>
        {icon && (
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-sans text-[28px] font-semibold leading-none tracking-tight text-zinc-950 tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-5 text-zinc-500">{hint}</p>}
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
        <h1 className="font-sans text-[22px] font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-xl text-sm text-zinc-500">{description}</p>}
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <p className="font-sans text-lg font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
