"use client";

import { type ReactNode, useState, useTransition } from "react";
import {
  deleteSnapshot,
  executeSandboxCommand,
  stopSandbox,
} from "@/app/_actions/sandbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  DeleteSnapshotResult,
  ExecuteSandboxCommandResult,
  SandboxSummary,
  SnapshotSummary,
  StopSandboxResult,
} from "@/lib/sandbox";
import {
  formatBytes,
  formatDuration,
  formatTimestamp,
} from "@/lib/sandbox-format";

type ResultBannerProps = {
  children: ReactNode;
  tone?: "error" | "success" | "warning";
};

type SnapshotSummaryPanelProps = {
  latestSnapshot: SnapshotSummary | null;
  snapshotCount: number;
};

type SnapshotCardItemProps = {
  isLatest: boolean;
  onDeleted: (result: DeleteSnapshotResult) => Promise<void>;
  snapshot: SnapshotSummary;
};

type SandboxCardItemProps = {
  onSandboxStopped: (result: StopSandboxResult) => Promise<void>;
  sandbox: SandboxSummary;
};

export function ResultBanner({
  children,
  tone = "success",
}: ResultBannerProps) {
  const classes =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/8 text-amber-800"
        : "border-rose-500/25 bg-rose-500/8 text-rose-700";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "running"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-600/20"
      : status === "pending" ||
          status === "snapshotting" ||
          status === "stopping"
        ? "bg-amber-500/12 text-amber-700 ring-amber-600/20"
        : status === "failed" || status === "aborted" || status === "deleted"
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

export function SnapshotSummaryPanel({
  latestSnapshot,
  snapshotCount,
}: SnapshotSummaryPanelProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start">
        <div className="min-w-0 space-y-1.5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Persistent Base
          </div>
          {latestSnapshot ? (
            <>
              <p className="text-sm">
                New sandboxes restore from the latest saved snapshot.
              </p>
              <p className="break-all font-mono text-xs leading-6 text-muted-foreground">
                {latestSnapshot.snapshotId}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No persistent snapshot is saved yet. Create a sandbox, warm it,
              and save a snapshot to make the next sandbox reusable.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Snapshots are the durable restore point. Stopped sandboxes are not.
          </p>
        </div>

        <dl className="grid w-full gap-3 text-sm sm:grid-cols-2 xl:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Snapshots
            </dt>
            <dd className="mt-2 text-sm leading-6">{snapshotCount}</dd>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Created
            </dt>
            <dd className="mt-2 break-words text-sm leading-6">
              {formatTimestamp(latestSnapshot?.createdAt ?? null)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Expires
            </dt>
            <dd className="mt-2 break-words text-sm leading-6">
              {formatTimestamp(latestSnapshot?.expiresAt ?? null)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Size
            </dt>
            <dd className="mt-2 break-words text-sm leading-6">
              {latestSnapshot
                ? formatBytes(latestSnapshot.sizeBytes)
                : "Not available"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function SnapshotCardItem({
  isLatest,
  onDeleted,
  snapshot,
}: SnapshotCardItemProps) {
  const canDeleteSnapshot = snapshot.status !== "deleted";
  const [isDeleting, startDeleteTransition] = useTransition();

  const removeSnapshot = () => {
    if (!canDeleteSnapshot) {
      return;
    }

    startDeleteTransition(async () => {
      const deleted = await deleteSnapshot(snapshot.snapshotId);
      await onDeleted(deleted);
    });
  };

  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="break-all font-mono text-sm leading-6">
              {snapshot.snapshotId}
            </CardTitle>
            <CardDescription className="space-y-1 text-sm">
              <p>Source sandbox {snapshot.sourceSandboxId}</p>
              <p>{isLatest ? "Current restore base" : "Stored snapshot"}</p>
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {isLatest ? (
              <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background">
                Latest
              </span>
            ) : null}
            <StatusBadge status={snapshot.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-2">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Region
            </dt>
            <dd className="mt-2">{snapshot.region}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Size
            </dt>
            <dd className="mt-2">{formatBytes(snapshot.sizeBytes)}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Created
            </dt>
            <dd className="mt-2">{formatTimestamp(snapshot.createdAt)}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Expires
            </dt>
            <dd className="mt-2">{formatTimestamp(snapshot.expiresAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Deleting a snapshot removes that saved restore point from Vercel.
          </p>
          <Button
            variant="outline"
            onClick={removeSnapshot}
            disabled={isDeleting || !canDeleteSnapshot}
          >
            {isDeleting ? "Deleting..." : "Delete Snapshot"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SandboxCardItem({
  onSandboxStopped,
  sandbox,
}: SandboxCardItemProps) {
  const fieldIdBase = sandbox.sandboxId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const canRunCommand = sandbox.status === "running";
  const canStopSandbox = ["running", "pending"].includes(sandbox.status);
  const [command, setCommand] = useState("pnpm");
  const [args, setArgs] = useState("dlx\ncowsay\nhi from the sandbox");
  const [cwd, setCwd] = useState(sandbox.cwd);
  const [result, setResult] = useState<ExecuteSandboxCommandResult | null>(
    null,
  );
  const [isRunning, startRunTransition] = useTransition();
  const [isStopping, startStopTransition] = useTransition();

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

  const removeSandbox = () => {
    if (!canStopSandbox) {
      return;
    }

    startStopTransition(async () => {
      const stopped = await stopSandbox(sandbox.sandboxId);
      await onSandboxStopped(stopped);
    });
  };

  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="break-all font-mono text-sm leading-6">
              {sandbox.sandboxId}
            </CardTitle>
            <CardDescription className="space-y-1 text-sm">
              <p>
                Runtime {sandbox.runtime} in {sandbox.region}
              </p>
              <p className="break-all font-mono text-xs">
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
            <dd className="mt-2 break-all font-mono text-xs leading-5">
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
            <label
              htmlFor={`${fieldIdBase}-command`}
              className="grid gap-2 text-sm"
            >
              <span className="font-medium">Command</span>
              <Input
                id={`${fieldIdBase}-command`}
                className="font-mono"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="pnpm"
              />
            </label>
            <label
              htmlFor={`${fieldIdBase}-cwd`}
              className="grid gap-2 text-sm"
            >
              <span className="font-medium">Working directory</span>
              <Input
                id={`${fieldIdBase}-cwd`}
                className="font-mono"
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
              <p className="text-sm text-muted-foreground">
                Snapshot creation has moved to the Snapshots page so sandbox and
                restore-point workflows stay separate.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={removeSandbox}
                disabled={isStopping || !canStopSandbox}
              >
                {isStopping ? "Stopping..." : "Stop Sandbox"}
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
                <div className="break-all font-mono text-xs text-muted-foreground">
                  {result.command}
                  {result.args.length > 0 ? ` ${result.args.join(" ")}` : ""}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {formatTimestamp(result.executedAt)}
              </div>
            </div>

            {result.error ? (
              <ResultBanner tone="error">{result.error}</ResultBanner>
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
