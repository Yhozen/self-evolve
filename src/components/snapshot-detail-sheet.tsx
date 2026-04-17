"use client";

import {
  Archive,
  ChevronDown,
  Clock,
  GitBranch,
  Globe,
  HardDrive,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { CopyField } from "@/components/shared/copy-field";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RepoSnapshotSummary } from "@/lib/repo-sandbox";
import { formatBytes } from "@/lib/sandbox-format";
import { timeAgo, timeUntil } from "@/lib/time";
import { cn } from "@/lib/utils";

export function SnapshotDetailSheet({
  snapshot,
  isLatest,
  open,
  onDelete,
  onOpenChange,
  onRestore,
}: {
  snapshot: RepoSnapshotSummary | null;
  isLatest: boolean;
  open: boolean;
  onDelete: (snapshotId: string) => Promise<{ error: string | null }>;
  onOpenChange: (open: boolean) => void;
  onRestore: (snapshotId: string) => Promise<{ error: string | null }>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {snapshot ? (
          <SnapshotDetailContent
            snapshot={snapshot}
            isLatest={isLatest}
            onDelete={onDelete}
            onOpenChange={onOpenChange}
            onRestore={onRestore}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SnapshotDetailContent({
  snapshot,
  isLatest,
  onDelete,
  onOpenChange,
  onRestore,
}: {
  snapshot: RepoSnapshotSummary;
  isLatest: boolean;
  onDelete: (snapshotId: string) => Promise<{ error: string | null }>;
  onOpenChange: (open: boolean) => void;
  onRestore: (snapshotId: string) => Promise<{ error: string | null }>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Archive className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Snapshot
          </span>
          {isLatest ? (
            <span className="inline-flex items-center rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
              Latest
            </span>
          ) : null}
        </div>
        <div className="space-y-1">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg">
            <GitBranch className="size-4 text-muted-foreground" />
            {snapshot.repo}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {snapshot.branch}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono">{snapshot.snapshotId}</span>
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-5">
          <section className="grid grid-cols-3 gap-2">
            <SummaryTile label="Size" value={formatBytes(snapshot.sizeBytes)} />
            <SummaryTile label="Created" value={timeAgo(snapshot.createdAt)} />
            <SummaryTile
              label="Expires"
              value={timeUntil(snapshot.expiresAt)}
            />
          </section>

          <section className="space-y-2">
            <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Use this snapshot
            </p>
            <button
              type="button"
              onClick={async () => {
                setRestoreBusy(true);
                await onRestore(snapshot.snapshotId);
                setRestoreBusy(false);
                onOpenChange(false);
              }}
              disabled={restoreBusy}
              className="group flex w-full items-center justify-between rounded-lg border bg-foreground/5 px-3 py-3 text-left transition-colors hover:bg-foreground/10 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-background">
                  {restoreBusy ? (
                    <Loader2 className="size-4 animate-spin text-foreground" />
                  ) : (
                    <Play className="size-4 text-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {restoreBusy ? "Restoring..." : "Restore to sandbox"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Spin up a fresh sandbox from this baseline
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                Instant
              </span>
            </button>
          </section>

          <section className="space-y-2">
            <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Identifiers
            </p>
            <CopyField label="Snapshot ID" value={snapshot.snapshotId} />
            <CopyField
              label="Source sandbox"
              value={snapshot.sourceSandboxId}
            />
          </section>

          <section className="space-y-2">
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors",
                    "hover:bg-muted/60",
                  )}
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Details
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      detailsOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <DetailItem
                    icon={<Globe className="size-3.5" />}
                    label="Region"
                    value={snapshot.region.toUpperCase()}
                  />
                  <DetailItem
                    icon={<HardDrive className="size-3.5" />}
                    label="Status"
                    value={snapshot.status}
                  />
                  <DetailItem
                    icon={<Clock className="size-3.5" />}
                    label="Created"
                    value={timeAgo(snapshot.createdAt)}
                  />
                  <DetailItem
                    icon={<Clock className="size-3.5" />}
                    label="Expires"
                    value={timeUntil(snapshot.expiresAt)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          variant="ghost"
          type="button"
          onClick={async () => {
            setDeleteBusy(true);
            await onDelete(snapshot.snapshotId);
            setDeleteBusy(false);
            onOpenChange(false);
          }}
          disabled={deleteBusy}
          className="w-full text-muted-foreground hover:text-destructive"
        >
          {deleteBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Delete snapshot
        </Button>
      </div>
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium capitalize text-foreground">
        {value}
      </p>
    </div>
  );
}
