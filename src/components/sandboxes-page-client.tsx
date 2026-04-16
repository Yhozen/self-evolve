"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createSandbox, listSandboxes } from "@/app/_actions/sandbox";
import {
  EmptyState,
  ResultBanner,
  SandboxCardItem,
  SnapshotSummaryPanel,
} from "@/components/sandbox-ui";
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
  SandboxListResult,
  StopSandboxResult,
} from "@/lib/sandbox";

type SandboxesPageClientProps = {
  initialData: SandboxListResult;
};

export function SandboxesPageClient({ initialData }: SandboxesPageClientProps) {
  const [sandboxes, setSandboxes] = useState(initialData.sandboxes);
  const [snapshots, setSnapshots] = useState(initialData.snapshots);
  const [latestSnapshot, setLatestSnapshot] = useState(
    initialData.latestSnapshot,
  );
  const [error, setError] = useState(initialData.error);
  const [createResult, setCreateResult] = useState<CreateSandboxResult | null>(
    null,
  );
  const [stopResult, setStopResult] = useState<StopSandboxResult | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();

  const applyData = (nextData: SandboxListResult) => {
    setSandboxes(nextData.sandboxes);
    setSnapshots(nextData.snapshots);
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
      setStopResult(null);

      const created = await createSandbox();
      setCreateResult(created);

      if (created.error) {
        setError(created.error);
        return;
      }

      await refreshData();
    });
  };

  const handleSandboxStopped = async (stopped: StopSandboxResult) => {
    setCreateResult(null);
    setStopResult(stopped);

    if (stopped.error) {
      setError(stopped.error);
      return;
    }

    await refreshData();
  };

  const runningSandboxes = sandboxes.filter(
    (sandbox) => sandbox.status === "running",
  ).length;
  const transitioningSandboxes = sandboxes.filter((sandbox) =>
    ["pending", "snapshotting", "stopping"].includes(sandbox.status),
  ).length;

  return (
    <section className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Live Compute
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                Operate live sandboxes and hand off durable state to snapshots.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Create or restore sandboxes, run commands, inspect execution
                output, and stop instances when they are no longer needed.
                Snapshot promotion stays in the dedicated snapshots workflow.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/snapshots">Open Snapshots</Link>
            </Button>
            <Button onClick={createAndRefresh} disabled={isCreating}>
              {isCreating
                ? "Creating..."
                : latestSnapshot
                  ? "Create From Snapshot"
                  : "Create Sandbox"}
            </Button>
            <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              The current Vercel scope is split into live sandboxes here and
              restore points on the Snapshots page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {sandboxes.length}
              </div>
              <p className="mt-1 text-muted-foreground">Sandboxes in scope</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Running
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {runningSandboxes}
              </div>
              <p className="mt-1 text-muted-foreground">Ready for commands</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Transitioning
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {transitioningSandboxes}
              </div>
              <p className="mt-1 text-muted-foreground">
                Pending, stopping, or snapshotting
              </p>
            </div>
          </CardContent>
        </Card>

        <SnapshotSummaryPanel
          latestSnapshot={latestSnapshot}
          snapshotCount={snapshots.length}
        />
      </div>

      {createResult?.sandboxId ? (
        <ResultBanner>
          {createResult.restoredFromSnapshot &&
          createResult.sourceSnapshotId ? (
            <>
              Created sandbox {createResult.sandboxId} from snapshot{" "}
              {createResult.sourceSnapshotId}. The refreshed inventory is shown
              below.
            </>
          ) : (
            <>
              Created fresh sandbox {createResult.sandboxId}. If it becomes a
              useful baseline, save a snapshot from the Snapshots page.
            </>
          )}
        </ResultBanner>
      ) : null}

      {stopResult?.sandboxId && !stopResult.error ? (
        <ResultBanner tone="warning">
          Stopped sandbox {stopResult.sandboxId}. Current status:{" "}
          {stopResult.status ?? "unknown"}.
        </ResultBanner>
      ) : null}

      {error ? <ResultBanner tone="error">{error}</ResultBanner> : null}

      <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Sandboxes</CardTitle>
          <CardDescription>
            Each card owns lifecycle and command execution. When a sandbox is
            warmed the way you want, promote it from the Snapshots page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          {sandboxes.length === 0 ? (
            <EmptyState>
              No sandboxes were returned by the current scope.
            </EmptyState>
          ) : (
            sandboxes.map((sandbox) => (
              <SandboxCardItem
                key={sandbox.sandboxId}
                sandbox={sandbox}
                onSandboxStopped={handleSandboxStopped}
              />
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
