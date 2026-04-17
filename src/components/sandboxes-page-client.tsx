"use client";

import {
  Archive,
  ChevronRight,
  Cpu,
  GitBranch,
  MoreHorizontal,
  Plus,
  Search,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  createRepoSnapshotAction,
  startRepoSandboxHandoffAction,
  stopRepoSandboxAction,
} from "@/app/_actions/repo-sandbox";
import { SandboxDetailSheet } from "@/components/sandbox-detail-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
  RepoSandboxInventory,
  RepoSandboxSummary,
} from "@/lib/repo-sandbox";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type Filter = "all" | "running" | "stopped";
type Notice = {
  tone: "error" | "success";
  message: string;
};

export function SandboxesPageClient({
  initialInventory,
}: {
  initialInventory: RepoSandboxInventory;
}) {
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setInventory(initialInventory);
  }, [initialInventory]);

  const sandboxes = inventory.sandboxes;

  const counts = useMemo(() => {
    return {
      all: sandboxes.length,
      running: sandboxes.filter((item) => item.status === "running").length,
      stopped: sandboxes.filter((item) => item.status !== "running").length,
    };
  }, [sandboxes]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sandboxes.filter((sandbox) => {
      if (filter === "running" && sandbox.status !== "running") {
        return false;
      }

      if (filter === "stopped" && sandbox.status === "running") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        sandbox.name.toLowerCase().includes(normalizedQuery) ||
        sandbox.repo.toLowerCase().includes(normalizedQuery) ||
        sandbox.sandboxId.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filter, query, sandboxes]);

  const selected = selectedId
    ? (sandboxes.find((sandbox) => sandbox.sandboxId === selectedId) ?? null)
    : null;

  const syncInventory = (nextInventory: RepoSandboxInventory) => {
    setInventory(nextInventory);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleStop = async (sandboxId: string) => {
    const response = await stopRepoSandboxAction(sandboxId);
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
      message: "Sandbox stopped.",
    });

    return { error: null };
  };

  const handleSnapshot = async (sandboxId: string) => {
    const response = await createRepoSnapshotAction(sandboxId);
    syncInventory(response.inventory);

    if (response.result.snapshotResult.error) {
      setNotice({
        tone: "error",
        message: response.result.snapshotResult.error,
      });

      return {
        error: response.result.snapshotResult.error,
        snapshotId: null,
      };
    }

    setNotice({
      tone: "success",
      message: "Snapshot saved and marked as the current baseline.",
    });

    return {
      error: null,
      snapshotId: response.result.snapshot?.snapshotId ?? null,
    };
  };

  const handleStartHandoff = async (sandboxId: string) => {
    const response = await startRepoSandboxHandoffAction(sandboxId);
    syncInventory(response.inventory);

    if (response.result.error) {
      setNotice({
        tone: "error",
        message: response.result.error,
      });
      return {
        attach: null,
        error: response.result.error,
      };
    }

    setNotice({
      tone: "success",
      message: "OpenCode handoff is ready.",
    });

    return {
      attach: response.result.attach,
      error: null,
    };
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 lg:px-8">
      <PageHeader
        title="Sandboxes"
        description="Your live development environments. Click any sandbox to manage it."
      />

      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        query={query}
        onQueryChange={setQuery}
      />

      {notice ? <NoticeBanner notice={notice} /> : null}

      {sandboxes.length === 0 ? (
        <EmptySandboxes />
      ) : filtered.length === 0 ? (
        <NoResults query={query} />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((sandbox, index) => (
            <li
              key={sandbox.sandboxId}
              className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <SandboxRow
                sandbox={sandbox}
                onSelect={() => setSelectedId(sandbox.sandboxId)}
                onSnapshot={handleSnapshot}
                onStop={handleStop}
              />
            </li>
          ))}
        </ul>
      )}

      <SandboxDetailSheet
        sandbox={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onSnapshot={handleSnapshot}
        onStartHandoff={handleStartHandoff}
        onStop={handleStop}
      />
    </section>
  );
}

function Toolbar({
  filter,
  onFilterChange,
  counts,
  query,
  onQueryChange,
}: {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  counts: { all: number; running: number; stopped: number };
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "running", label: "Running", count: counts.running },
    { id: "stopped", label: "Stopped", count: counts.stopped },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              filter === item.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-sm px-1 text-xs tabular-nums",
                filter === item.id
                  ? "text-foreground/70"
                  : "text-muted-foreground/70",
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative sm:w-64">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search sandboxes..."
          className="h-9 pl-8"
        />
      </div>
    </div>
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

function SandboxRow({
  sandbox,
  onSelect,
  onSnapshot,
  onStop,
}: {
  sandbox: RepoSandboxSummary;
  onSelect: () => void;
  onSnapshot: (sandboxId: string) => Promise<{
    error: string | null;
    snapshotId: string | null;
  }>;
  onStop: (sandboxId: string) => Promise<{ error: string | null }>;
}) {
  const [menuBusy, setMenuBusy] = useState<string | null>(null);
  const isRunning = sandbox.status === "running";

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
          <GitBranch className="size-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {sandbox.repo}
            </p>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {sandbox.branch}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status={sandbox.status} />
              <span className="capitalize">{sandbox.status}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <Cpu className="size-3" />
              {sandbox.vcpus} vCPU
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeAgo(sandbox.updatedAt)}</span>
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </button>

      {isRunning ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={(event) => event.stopPropagation()}
              aria-label="Sandbox actions"
              disabled={menuBusy !== null}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onSelect={async () => {
                setMenuBusy("snapshot");
                await onSnapshot(sandbox.sandboxId);
                setMenuBusy(null);
              }}
            >
              <Archive className="size-4" />
              Save as snapshot
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                setMenuBusy("stop");
                await onStop(sandbox.sandboxId);
                setMenuBusy(null);
              }}
            >
              <Square className="size-4" />
              Stop sandbox
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function EmptySandboxes() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center animate-in fade-in">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <GitBranch className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-base font-semibold">
          No sandboxes yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Turn any GitHub repository into a ready-to-use development environment
          in just a few clicks.
        </p>
      </div>
      <Button asChild>
        <Link href="/create-sandbox">
          <Plus className="size-3.5" />
          Create your first sandbox
        </Link>
      </Button>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <p className="text-sm font-medium">No matching sandboxes</p>
      <p className="text-sm text-muted-foreground">
        {query ? `Nothing found for "${query}"` : "Try changing your filter"}
      </p>
    </div>
  );
}
