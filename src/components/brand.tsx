import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 font-display font-semibold text-foreground",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" />
      </span>
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
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  approved: "bg-genuine/10 text-genuine",
  pending: "bg-caution/15 text-caution-foreground",
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
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
    <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
