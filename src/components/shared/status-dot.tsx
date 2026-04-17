import { cn } from "@/lib/utils";

export type SandboxStatusTone =
  | "running"
  | "pending"
  | "stopped"
  | "failed"
  | "snapshot";

export function getStatusTone(status: string): SandboxStatusTone {
  if (status === "running") return "running";
  if (["pending", "snapshotting", "stopping", "starting"].includes(status))
    return "pending";
  if (["failed", "aborted", "error"].includes(status)) return "failed";
  if (status === "ready") return "snapshot";
  return "stopped";
}

export function StatusDot({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = getStatusTone(status);

  return (
    <span className={cn("relative inline-flex size-2", className)}>
      {tone === "running" ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
      ) : null}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          tone === "running" && "bg-emerald-500",
          tone === "pending" && "bg-amber-500",
          tone === "failed" && "bg-rose-500",
          tone === "snapshot" && "bg-sky-500",
          tone === "stopped" && "bg-muted-foreground/50",
        )}
      />
    </span>
  );
}

export function StatusLabel({ status }: { status: string }) {
  const tone = getStatusTone(status);
  const label =
    tone === "pending"
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone === "running" && "text-emerald-700",
        tone === "pending" && "text-amber-700",
        tone === "failed" && "text-rose-700",
        tone === "snapshot" && "text-sky-700",
        tone === "stopped" && "text-muted-foreground",
      )}
    >
      <StatusDot status={status} />
      {label}
    </span>
  );
}
