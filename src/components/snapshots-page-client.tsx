"use client";

import {
  Archive,
  ChevronRight,
  HardDrive,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SnapshotDetailSheet } from "@/components/snapshot-detail-sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  deleteSnapshot,
  restoreFromSnapshot,
  useMockState,
  type MockSnapshot,
} from "@/lib/mock-store";
import { formatBytes } from "@/lib/sandbox-format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export function SnapshotsPageClient() {
  const { snapshots } = useMockState();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justRestoredId, setJustRestoredId] = useState<string | null>(null);

  const latestSnapshot = snapshots[0] ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snapshots;
    return snapshots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.repo.toLowerCase().includes(q) ||
        s.snapshotId.toLowerCase().includes(q),
    );
  }, [snapshots, query]);

  const selected = selectedId
    ? snapshots.find((s) => s.snapshotId === selectedId) ?? null
    : null;

  const handleRestore = (snapshotId: string) => {
    const sandbox = restoreFromSnapshot(snapshotId);
    if (sandbox) {
      setJustRestoredId(snapshotId);
      setTimeout(() => setJustRestoredId(null), 2400);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
      <PageHeader
        title="Snapshots"
        description="Reusable restore points. Spin up fresh sandboxes from a known-good baseline."
      />

      {snapshots.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
            {latestSnapshot ? (
              <>
                <span className="mx-2 text-muted-foreground/40">·</span>
                Latest from{" "}
                <span className="font-medium text-foreground">
                  {latestSnapshot.repo}
                </span>{" "}
                {timeAgo(latestSnapshot.createdAt)}
              </>
            ) : null}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search snapshots..."
              className="h-9 pl-8"
            />
          </div>
        </div>
      ) : null}

      {justRestoredId ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-1">
          <Play className="size-4" />
          <span>
            Fresh sandbox created from snapshot. Head to{" "}
            <Link
              href="/sandboxes"
              className="font-medium underline underline-offset-2"
            >
              Sandboxes
            </Link>{" "}
            to use it.
          </span>
        </div>
      ) : null}

      {snapshots.length === 0 ? (
        <EmptySnapshots />
      ) : filtered.length === 0 ? (
        <NoResults query={query} />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((snapshot, index) => {
            const isLatest = snapshot.snapshotId === latestSnapshot?.snapshotId;
            return (
              <li
                key={snapshot.snapshotId}
                className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <SnapshotRow
                  snapshot={snapshot}
                  isLatest={isLatest}
                  onSelect={() => setSelectedId(snapshot.snapshotId)}
                  onRestore={() => handleRestore(snapshot.snapshotId)}
                  onDelete={() => deleteSnapshot(snapshot.snapshotId)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <SnapshotDetailSheet
        snapshot={selected}
        isLatest={
          selected !== null &&
          selected.snapshotId === latestSnapshot?.snapshotId
        }
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onRestore={(id) => {
          handleRestore(id);
          setSelectedId(null);
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function SnapshotRow({
  snapshot,
  isLatest,
  onSelect,
  onRestore,
  onDelete,
}: {
  snapshot: MockSnapshot;
  isLatest: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-background px-4 py-3 transition-all",
        "hover:border-foreground/15 hover:shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/70">
          <Archive className="size-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {snapshot.repo}
            </p>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {snapshot.branch}
            </span>
            {isLatest ? (
              <span className="inline-flex items-center rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
                Latest
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <HardDrive className="size-3" />
              {formatBytes(snapshot.sizeBytes)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeAgo(snapshot.createdAt)}</span>
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRestore}
        className="hidden sm:inline-flex"
      >
        <Play className="size-3" />
        Restore
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
            aria-label="Snapshot actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={onRestore}>
            <Play className="size-4" />
            Restore to sandbox
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} variant="destructive">
            <Trash2 className="size-4" />
            Delete snapshot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty & no results
// ---------------------------------------------------------------------------

function EmptySnapshots() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center animate-in fade-in">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Archive className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-base font-semibold">
          No snapshots yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a sandbox, warm it up with your dependencies, then save it as
          a snapshot. Future sandboxes restore instantly.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/sandboxes">Go to sandboxes</Link>
        </Button>
        <Button asChild>
          <Link href="/create-sandbox">
            <Plus className="size-3.5" />
            Create sandbox
          </Link>
        </Button>
      </div>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <p className="text-sm font-medium">No matching snapshots</p>
      <p className="text-sm text-muted-foreground">
        {query ? `Nothing found for "${query}"` : "No snapshots available"}
      </p>
    </div>
  );
}
