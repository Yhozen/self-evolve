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
  ExecuteSandboxCommandResult,
  SandboxListResult,
  SandboxSummary,
} from "@/lib/sandbox";
import {
  createSandbox,
  executeSandboxCommand,
  listSandboxes,
} from "./_actions/sandbox";

type SandboxConsoleProps = {
  initialData: SandboxListResult;
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

function SandboxCardItem({ sandbox }: { sandbox: SandboxSummary }) {
  const canRunCommand = sandbox.status === "running";
  const [command, setCommand] = useState("pwd");
  const [args, setArgs] = useState("");
  const [cwd, setCwd] = useState(sandbox.cwd);
  const [result, setResult] = useState<ExecuteSandboxCommandResult | null>(
    null,
  );
  const [isRunning, startTransition] = useTransition();

  const runCommand = () => {
    if (!canRunCommand) {
      return;
    }

    startTransition(async () => {
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

  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="font-mono text-sm leading-6 break-all">
              {sandbox.sandboxId}
            </CardTitle>
            <CardDescription className="text-sm">
              Runtime {sandbox.runtime} in {sandbox.region}
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

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
        </dl>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Command</span>
              <input
                className="h-11 rounded-xl border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-ring"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="echo"
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
              placeholder={"One argument per line\nHello from sandbox"}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Arguments are sent exactly as entered, one line per argument.
              </p>
              {!canRunCommand ? (
                <p className="text-sm text-amber-700">
                  This sandbox is not runnable. Create a new sandbox or refresh
                  until one is running.
                </p>
              ) : null}
            </div>
            <Button onClick={runCommand} disabled={isRunning || !canRunCommand}>
              {isRunning ? "Running..." : "Run Command"}
            </Button>
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
  const [error, setError] = useState(initialData.error);
  const [createResult, setCreateResult] = useState<CreateSandboxResult | null>(
    null,
  );
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();

  const refresh = () => {
    startRefreshTransition(async () => {
      const nextData = await listSandboxes();
      setSandboxes(nextData.sandboxes);
      setError(nextData.error);
    });
  };

  const createAndRefresh = () => {
    startCreateTransition(async () => {
      setCreateResult(null);
      const created = await createSandbox();
      setCreateResult(created);

      if (created.error) {
        setError(created.error);
        return;
      }

      const nextData = await listSandboxes();
      setSandboxes(nextData.sandboxes);
      setError(nextData.error);
    });
  };

  return (
    <section className="grid gap-6">
      <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Current sandboxes</CardTitle>
              <CardDescription>
                Create a fresh sandbox, refresh the list, inspect runtime
                details, and run ad hoc commands directly against a running
                sandbox.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={createAndRefresh} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Sandbox"}
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
          {createResult?.sandboxId ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700">
              Created sandbox {createResult.sandboxId}. Refresh results have
              been applied below.
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
                <SandboxCardItem key={sandbox.sandboxId} sandbox={sandbox} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
