"use client";

import {
  Archive,
  ChevronRight,
  Cpu,
  GitBranch,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusDot } from "@/components/shared/status-dot";
import { SandboxDetailSheet } from "@/components/sandbox-detail-sheet";
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
  createSnapshot,
  deleteSandbox,
  resumeSandbox,
  stopSandbox,
  useMockState,
  type MockSandbox,
} from "@/lib/mock-store";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type Filter = "all" | "running" | "stopped";

export function SandboxesPageClient() {
  const { sandboxes } = useMockState();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: sandboxes.length,
      running: sandboxes.filter((s) => s.status === "running").length,
      stopped: sandboxes.filter((s) => s.status !== "running").length,
    };
  }, [sandboxes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sandboxes.filter((s) => {
      if (filter === "running" && s.status !== "running") return false;
      if (filter === "stopped" && s.status === "running") return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.repo.toLowerCase().includes(q) ||
        s.sandboxId.toLowerCase().includes(q)
      );
    });
  }, [sandboxes, filter, query]);

  const selected = selectedId
    ? sandboxes.find((s) => s.sandboxId === selectedId) ?? null
    : null;

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
                onStop={() => stopSandbox(sandbox.sandboxId)}
                onResume={() => resumeSandbox(sandbox.sandboxId)}
                onSnapshot={() => createSnapshot(sandbox.sandboxId)}
                onDelete={() => deleteSandbox(sandbox.sandboxId)}
              />
            </li>
          ))}
        </ul>
      )}

      <SandboxDetailSheet
        sandbox={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({
  filter,
  onFilterChange,
  counts,
  query,
  onQueryChange,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: { all: number; running: number; stopped: number };
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "running", label: "Running", count: counts.running },
    { id: "stopped", label: "Stopped", count: counts.stopped },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              filter === f.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-sm px-1 text-xs tabular-nums",
                filter === f.id
                  ? "text-foreground/70"
                  : "text-muted-foreground/70",
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative sm:w-64">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search sandboxes..."
          className="h-9 pl-8"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function SandboxRow({
  sandbox,
  onSelect,
  onStop,
  onResume,
  onSnapshot,
  onDelete,
}: {
  sandbox: MockSandbox;
  onSelect: () => void;
  onStop: () => void;
  onResume: () => void;
  onSnapshot: () => void;
  onDelete: () => void;
}) {
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
            aria-label="Sandbox actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isRunning ? (
            <>
              <DropdownMenuItem onSelect={onSnapshot}>
                <Archive className="size-4" />
                Save as snapshot
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onStop}>
                <Square className="size-4" />
                Stop sandbox
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={onResume}>
              <Play className="size-4" />
              Resume sandbox
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} variant="destructive">
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty & no results
// ---------------------------------------------------------------------------

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
          Turn any GitHub repository into a ready-to-use development
          environment in just a few clicks.
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
