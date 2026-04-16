"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { listSandboxes, snapshotSandbox } from "@/app/_actions/sandbox";
import {
  EmptyState,
  ResultBanner,
  SnapshotCardItem,
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
  CreateSnapshotResult,
  DeleteSnapshotResult,
  SandboxListResult,
} from "@/lib/sandbox";

type SnapshotsPageClientProps = {
  initialData: SandboxListResult;
};

export function SnapshotsPageClient({ initialData }: SnapshotsPageClientProps) {
  const [sandboxes, setSandboxes] = useState(initialData.sandboxes);
  const [snapshots, setSnapshots] = useState(initialData.snapshots);
  const [latestSnapshot, setLatestSnapshot] = useState(
    initialData.latestSnapshot,
  );
  const [error, setError] = useState(initialData.error);
  const [snapshotResult, setSnapshotResult] =
    useState<CreateSnapshotResult | null>(null);
  const [deleteSnapshotResult, setDeleteSnapshotResult] =
    useState<DeleteSnapshotResult | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();

  const runningSandboxes = useMemo(
    () => sandboxes.filter((sandbox) => sandbox.status === "running"),
    [sandboxes],
  );

  const [selectedSandboxId, setSelectedSandboxId] = useState(
    initialData.sandboxes.find((sandbox) => sandbox.status === "running")
      ?.sandboxId ?? "",
  );

  useEffect(() => {
    if (
      selectedSandboxId &&
      runningSandboxes.some(
        (sandbox) => sandbox.sandboxId === selectedSandboxId,
      )
    ) {
      return;
    }

    setSelectedSandboxId(runningSandboxes[0]?.sandboxId ?? "");
  }, [runningSandboxes, selectedSandboxId]);

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

  const createSnapshotForSelectedSandbox = () => {
    if (!selectedSandboxId) {
      return;
    }

    startCreateTransition(async () => {
      setSnapshotResult(null);
      setDeleteSnapshotResult(null);

      const created = await snapshotSandbox(selectedSandboxId);
      setSnapshotResult(created);

      if (created.error) {
        setError(created.error);
        return;
      }

      await refreshData();
    });
  };

  const handleSnapshotDeleted = async (deleted: DeleteSnapshotResult) => {
    setSnapshotResult(null);
    setDeleteSnapshotResult(deleted);

    if (deleted.error) {
      setError(deleted.error);
      return;
    }

    await refreshData();
  };

  return (
    <section className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Restore Points
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                Keep snapshot CRUD focused in one place.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Create snapshots from running sandboxes, inspect the current
                restore base, and delete restore points that are no longer
                useful.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Create Snapshot</CardTitle>
            <CardDescription>
              Choose a running sandbox and promote it to the next persistent
              restore base.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Running sandbox</span>
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-ring"
                value={selectedSandboxId}
                onChange={(event) => setSelectedSandboxId(event.target.value)}
                disabled={runningSandboxes.length === 0}
              >
                {runningSandboxes.length === 0 ? (
                  <option value="">No running sandboxes available</option>
                ) : (
                  runningSandboxes.map((sandbox) => (
                    <option key={sandbox.sandboxId} value={sandbox.sandboxId}>
                      {sandbox.sandboxId}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              <p>
                Creating a snapshot freezes the selected sandbox and turns that
                snapshot into the restore base used for future sandbox creates.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {runningSandboxes.length} running sandbox
                {runningSandboxes.length === 1 ? "" : "es"} available for
                snapshotting.
              </p>
              <Button
                onClick={createSnapshotForSelectedSandbox}
                disabled={isCreating || !selectedSandboxId}
              >
                {isCreating ? "Saving Snapshot..." : "Create Snapshot"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <SnapshotSummaryPanel
          latestSnapshot={latestSnapshot}
          snapshotCount={snapshots.length}
        />
      </div>

      {snapshotResult?.snapshotId ? (
        <ResultBanner>
          Saved snapshot {snapshotResult.snapshotId} from sandbox{" "}
          {snapshotResult.sandboxId}. The latest snapshot has been refreshed
          below.
        </ResultBanner>
      ) : null}

      {deleteSnapshotResult?.snapshotId && !deleteSnapshotResult.error ? (
        <ResultBanner tone="warning">
          Deleted snapshot {deleteSnapshotResult.snapshotId}.
        </ResultBanner>
      ) : null}

      {error ? <ResultBanner tone="error">{error}</ResultBanner> : null}

      <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Snapshots</CardTitle>
          <CardDescription>
            Saved restore points returned by the active Vercel project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          {snapshots.length === 0 ? (
            <EmptyState>
              No snapshots were returned by the current project.
            </EmptyState>
          ) : (
            snapshots.map((snapshot) => (
              <SnapshotCardItem
                key={snapshot.snapshotId}
                isLatest={snapshot.snapshotId === latestSnapshot?.snapshotId}
                onDeleted={handleSnapshotDeleted}
                snapshot={snapshot}
              />
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
