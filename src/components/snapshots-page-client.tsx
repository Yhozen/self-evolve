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
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  deleteRepoSnapshotAction,
  restoreRepoSnapshotAction,
} from "@/app/_actions/repo-sandbox";
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
import type {
  RepoSandboxInventory,
  RepoSnapshotSummary,
} from "@/lib/repo-sandbox";
import { formatBytes } from "@/lib/sandbox-format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type Notice = {
  tone: "error" | "success";
  message: string;
};

export function SnapshotsPageClient({
  initialInventory,
}: {
  initialInventory: RepoSandboxInventory;
}) {
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setInventory(initialInventory);
  }, [initialInventory]);

  const snapshots = inventory.snapshots;
  const latestSnapshot = inventory.latestSnapshot;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return snapshots;
    }

    return snapshots.filter(
      (snapshot) =>
        snapshot.name.toLowerCase().includes(normalizedQuery) ||
        snapshot.repo.toLowerCase().includes(normalizedQuery) ||
        snapshot.snapshotId.toLowerCase().includes(normalizedQuery),
    );
  }, [query, snapshots]);

  const selected = selectedId
    ? (snapshots.find((snapshot) => snapshot.snapshotId === selectedId) ?? null)
    : null;

  const syncInventory = (nextInventory: RepoSandboxInventory) => {
    setInventory(nextInventory);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleRestore = async (snapshotId: string) => {
    const response = await restoreRepoSnapshotAction(snapshotId);
    syncInventory(response.inventory);

    if (response.result.error) {
      setNotice({
        tone: "error",
        message: response.result.error,
      });
      return { error: response.result.error };
    }

    setNotice({
      tone: "success",
      message: response.result.attach
        ? "Fresh sandbox created and OpenCode handoff is ready."
        : "Fresh sandbox created from the snapshot.",
    });

    return { error: null };
  };

  const handleDelete = async (snapshotId: string) => {
    const response = await deleteRepoSnapshotAction(snapshotId);
    syncInventory(response.inventory);

    if (response.result.error) {
      setNotice({
        tone: "error",
        message: response.result.error,
      });
      return { error: response.result.error };
    }

    setNotice({
      tone: "success",
      message: "Snapshot deleted.",
    });

    return { error: null };
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search snapshots..."
              className="h-9 pl-8"
            />
          </div>
        </div>
      ) : null}

      {notice ? <NoticeBanner notice={notice} /> : null}

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
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  onSelect={() => setSelectedId(snapshot.snapshotId)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <SnapshotDetailSheet
        snapshot={selected}
        isLatest={selected?.snapshotId === latestSnapshot?.snapshotId}
        open={selected !== null}
        onDelete={handleDelete}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onRestore={handleRestore}
      />
    </section>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-1",
        notice.tone === "error"
          ? "border-destructive/20 bg-destructive/6 text-destructive"
          : "border-emerald-500/20 bg-emerald-500/8 text-emerald-800",
      )}
    >
      {notice.message}
    </div>
  );
}

function SnapshotRow({
  snapshot,
  isLatest,
  onDelete,
  onRestore,
  onSelect,
}: {
  snapshot: RepoSnapshotSummary;
  isLatest: boolean;
  onDelete: (snapshotId: string) => Promise<{ error: string | null }>;
  onRestore: (snapshotId: string) => Promise<{ error: string | null }>;
  onSelect: () => void;
}) {
  const [menuBusy, setMenuBusy] = useState<string | null>(null);

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
        type="button"
        onClick={() => onRestore(snapshot.snapshotId)}
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
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label="Snapshot actions"
            disabled={menuBusy !== null}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={async () => {
              setMenuBusy("restore");
              await onRestore(snapshot.snapshotId);
              setMenuBusy(null);
            }}
          >
            <Play className="size-4" />
            Restore to sandbox
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async () => {
              setMenuBusy("delete");
              await onDelete(snapshot.snapshotId);
              setMenuBusy(null);
            }}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            Delete snapshot
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
          Create a sandbox, warm it up with your dependencies, then save it as a
          snapshot. Future sandboxes restore instantly.
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
