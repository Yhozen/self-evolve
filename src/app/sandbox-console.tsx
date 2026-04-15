"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CreateSandboxResult,
  CreateSnapshotResult,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  SandboxSummary,
  SnapshotSummary,
} from "@/lib/sandbox";
import {
  createSandbox,
  executeSandboxCommand,
  listSandboxes,
  snapshotSandbox,
} from "./_actions/sandbox";

type SandboxConsoleProps = {
  initialData: SandboxListResult;
};

type SandboxCardItemProps = {
  sandbox: SandboxSummary;
  onSnapshotCreated: (result: CreateSnapshotResult) => Promise<void>;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });

  const parts = formatter.formatToParts(new Date(value));
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  return `${lookup.get("month")} ${lookup.get("day")}, ${lookup.get("year")}, ${lookup.get("hour")}:${lookup.get("minute")} ${lookup.get("dayPeriod")}`;
}

function formatDuration(timeoutMs: number) {
  const minutes = Math.floor(timeoutMs / 60000);
  const seconds = Math.floor((timeoutMs % 60000) / 1000);

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const sizeMb = sizeBytes / (1024 * 1024);

  if (sizeMb < 1024) {
    return `${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB`;
  }

  return `${(sizeMb / 1024).toFixed(1)} GB`;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "running"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-600/20"
      : status === "pending" || status === "snapshotting"
        ? "bg-amber-500/12 text-amber-700 ring-amber-600/20"
        : status === "failed" || status === "aborted"
          ? "bg-rose-500/12 text-rose-700 ring-rose-600/20"
          : "bg-muted text-muted-foreground ring-foreground/10";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}

function OutputPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex min-h-40 flex-col gap-2 rounded-xl border border-border bg-zinc-950 p-4 text-zinc-50">
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
        {title}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">
        {value || "No output."}
      </pre>
    </div>
  );
}

function SnapshotSummaryPanel({
  latestSnapshot,
}: {
  latestSnapshot: SnapshotSummary | null;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Persistent Base
          </div>
          {latestSnapshot ? (
            <>
              <p className="text-sm">
                New sandboxes restore from the latest saved snapshot.
              </p>
              <p className="font-mono text-xs leading-6 break-all text-muted-foreground">
                {latestSnapshot.snapshotId}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No persistent snapshot is saved yet. Create a sandbox, warm it,
              then use Save Snapshot to make the next sandbox reusable.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Current Vercel Sandbox docs say `node22` and `node24` already ship
            with `pnpm`, so `pnpm dlx ...` can run immediately before you save a
            snapshot.
          </p>
        </div>

        {latestSnapshot ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Created
              </dt>
              <dd className="mt-2">
                {formatTimestamp(latestSnapshot.createdAt)}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Expires
              </dt>
              <dd className="mt-2">
                {formatTimestamp(latestSnapshot.expiresAt)}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Size
              </dt>
              <dd className="mt-2">{formatBytes(latestSnapshot.sizeBytes)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function SandboxCardItem({ sandbox, onSnapshotCreated }: SandboxCardItemProps) {
  const canRunCommand = sandbox.status === "running";
  const [command, setCommand] = useState("pnpm");
  const [args, setArgs] = useState("dlx\ncowsay\nhi from the sandbox");
  const [cwd, setCwd] = useState(sandbox.cwd);
  const [result, setResult] = useState<ExecuteSandboxCommandResult | null>(
    null,
  );
  const [isRunning, startRunTransition] = useTransition();
  const [isSnapshotting, startSnapshotTransition] = useTransition();

  const runCommand = () => {
    if (!canRunCommand) {
      return;
    }

    startRunTransition(async () => {
      const execution = await executeSandboxCommand({
        sandboxId: sandbox.sandboxId,
        command,
        args: args
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        cwd,
      });

      setResult(execution);
    });
  };

  const saveSnapshot = () => {
    if (!canRunCommand) {
      return;
    }

    startSnapshotTransition(async () => {
      const created = await snapshotSandbox(sandbox.sandboxId);
      await onSnapshotCreated(created);
    });
  };

  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="font-mono text-sm leading-6 break-all">
              {sandbox.sandboxId}
            </CardTitle>
            <CardDescription className="space-y-1 text-sm">
              <p>
                Runtime {sandbox.runtime} in {sandbox.region}
              </p>
              <p className="font-mono text-xs break-all">
                {sandbox.sourceSnapshotId ??
                  "Fresh sandbox without a source snapshot"}
              </p>
            </CardDescription>
          </div>
          <StatusBadge status={sandbox.status} />
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 pt-2">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Working Dir
            </dt>
            <dd className="mt-2 font-mono text-xs leading-5 break-all">
              {sandbox.cwd}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Resources
            </dt>
            <dd className="mt-2">
              {sandbox.vcpus} vCPU, {sandbox.memoryMb} MB RAM
            </dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Timeout
            </dt>
            <dd className="mt-2">{formatDuration(sandbox.timeoutMs)}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Interactive Port
            </dt>
            <dd className="mt-2">
              {sandbox.interactivePort === null
                ? "Not exposed"
                : sandbox.interactivePort}
            </dd>
          </div>
        </dl>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Created
            </dt>
            <dd className="mt-2">{formatTimestamp(sandbox.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Started
            </dt>
            <dd className="mt-2">{formatTimestamp(sandbox.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Updated
            </dt>
            <dd className="mt-2">{formatTimestamp(sandbox.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Snapshotted
            </dt>
            <dd className="mt-2">{formatTimestamp(sandbox.snapshottedAt)}</dd>
          </div>
        </dl>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Command</span>
              <input
                className="h-11 rounded-xl border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-ring"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="pnpm"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Working directory</span>
              <input
                className="h-11 rounded-xl border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-ring"
                value={cwd}
                onChange={(event) => setCwd(event.target.value)}
                placeholder="/vercel/sandbox"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Arguments</span>
            <textarea
              className="min-h-28 rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition focus:border-ring"
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              placeholder={
                "One argument per line\ndlx\ncowsay\nhi from the sandbox"
              }
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Arguments are sent exactly as entered, one line per argument.
              </p>
              <p className="text-sm text-muted-foreground">
                The default command runs `pnpm dlx cowsay "hi from the
                sandbox"`.
              </p>
              {!canRunCommand ? (
                <p className="text-sm text-amber-700">
                  This sandbox is not runnable. Create a new sandbox or refresh
                  until one is running.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save Snapshot freezes this sandbox and turns it into the next
                  persistent base.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={saveSnapshot}
                disabled={isSnapshotting || !canRunCommand}
              >
                {isSnapshotting ? "Saving Snapshot..." : "Save Snapshot"}
              </Button>
              <Button
                onClick={runCommand}
                disabled={isRunning || !canRunCommand}
              >
                {isRunning ? "Running..." : "Run Command"}
              </Button>
            </div>
          </div>
        </div>

        {result ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="font-medium">
                  Exit code {result.exitCode}
                  {result.error ? " with error" : ""}
                </div>
                <div className="font-mono text-xs text-muted-foreground break-all">
                  {result.command}
                  {result.args.length > 0 ? ` ${result.args.join(" ")}` : ""}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {formatTimestamp(result.executedAt)}
              </div>
            </div>

            {result.error ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-700">
                {result.error}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <OutputPanel title="Stdout" value={result.stdout} />
              <OutputPanel title="Stderr" value={result.stderr} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SandboxConsole({ initialData }: SandboxConsoleProps) {
  const [sandboxes, setSandboxes] = useState(initialData.sandboxes);
  const [latestSnapshot, setLatestSnapshot] = useState(
    initialData.latestSnapshot,
  );
  const [error, setError] = useState(initialData.error);
  const [createResult, setCreateResult] = useState<CreateSandboxResult | null>(
    null,
  );
  const [snapshotResult, setSnapshotResult] =
    useState<CreateSnapshotResult | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();

  const applyData = (nextData: SandboxListResult) => {
    setSandboxes(nextData.sandboxes);
    setLatestSnapshot(nextData.latestSnapshot);
    setError(nextData.error);
  };

  const refreshData = async () => {
    const nextData = await listSandboxes();
    applyData(nextData);
  };

  const refresh = () => {
    startRefreshTransition(async () => {
      await refreshData();
    });
  };

  const createAndRefresh = () => {
    startCreateTransition(async () => {
      setCreateResult(null);
      setSnapshotResult(null);

      const created = await createSandbox();
      setCreateResult(created);

      if (created.error) {
        setError(created.error);
        return;
      }

      await refreshData();
    });
  };

  const handleSnapshotCreated = async (created: CreateSnapshotResult) => {
    setSnapshotResult(created);
    setCreateResult(null);

    if (created.error) {
      setError(created.error);
      return;
    }

    await refreshData();
  };

  return (
    <section className="grid gap-6">
      <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Current sandboxes</CardTitle>
              <CardDescription>
                Create fresh sandboxes, restore from the latest snapshot when
                available, save a running sandbox as the next persistent base,
                and run ad hoc commands directly against live instances.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={createAndRefresh} disabled={isCreating}>
                {isCreating
                  ? "Creating..."
                  : latestSnapshot
                    ? "Create From Snapshot"
                    : "Create Sandbox"}
              </Button>
              <Button
                variant="outline"
                onClick={refresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-2">
          <SnapshotSummaryPanel latestSnapshot={latestSnapshot} />

          {createResult?.sandboxId ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700">
              {createResult.restoredFromSnapshot &&
              createResult.sourceSnapshotId ? (
                <>
                  Created sandbox {createResult.sandboxId} from snapshot{" "}
                  {createResult.sourceSnapshotId}. Refresh results have been
                  applied below.
                </>
              ) : (
                <>
                  Created fresh sandbox {createResult.sandboxId}. Save a
                  snapshot once it is warmed to make future sandboxes
                  persistent.
                </>
              )}
            </div>
          ) : null}

          {snapshotResult?.snapshotId ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700">
              Saved snapshot {snapshotResult.snapshotId} from sandbox{" "}
              {snapshotResult.sandboxId}. That sandbox has been stopped and the
              latest snapshot is now available for future creates.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{sandboxes.length} sandboxes</span>
            <span>
              {
                sandboxes.filter((sandbox) => sandbox.status === "running")
                  .length
              }{" "}
              running
            </span>
            <span>
              {
                sandboxes.filter((sandbox) =>
                  ["pending", "snapshotting", "stopping"].includes(
                    sandbox.status,
                  ),
                ).length
              }{" "}
              transitioning
            </span>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {sandboxes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
              No sandboxes were returned by the current Vercel scope.
            </div>
          ) : (
            <div className="grid gap-5">
              {sandboxes.map((sandbox) => (
                <SandboxCardItem
                  key={sandbox.sandboxId}
                  sandbox={sandbox}
                  onSnapshotCreated={handleSnapshotCreated}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
