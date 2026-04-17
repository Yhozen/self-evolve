"use server";

import { revalidatePath } from "next/cache";
import type {
  RepoBootstrapInput,
  RepoBootstrapResult,
  RepoSandboxCommandInput,
  RepoSandboxCommandResult,
  RepoSandboxInventory,
  RepoSandboxSummary,
  RepoSnapshotSummary,
  StartSandboxHandoffResult,
} from "@/lib/repo-sandbox";
import { filterManagedInventory } from "@/lib/repo-sandbox";
import type {
  CreateSnapshotResult,
  DeleteSnapshotResult,
  StopSandboxResult,
} from "@/lib/sandbox";
import {
  createRepoSandbox,
  createRepoSnapshot,
  deleteRepoSnapshot,
  executeRepoSandboxCommand,
  getRepoSandboxInventory,
  restoreRepoSnapshot,
  startRepoSandboxHandoff,
  stopRepoSandbox,
} from "@/server/repo-sandbox/service";

type RepoSandboxMutation<T> = {
  inventory: RepoSandboxInventory;
  result: T;
};

async function loadManagedInventory() {
  return filterManagedInventory(await getRepoSandboxInventory());
}

function revalidateRepoSandboxRoutes() {
  revalidatePath("/create-sandbox");
  revalidatePath("/sandboxes");
  revalidatePath("/snapshots");
}

export async function listRepoSandboxInventoryAction() {
  return loadManagedInventory();
}

export async function createRepoSandboxAction(
  input: RepoBootstrapInput,
): Promise<RepoBootstrapResult> {
  const result = await createRepoSandbox(input);
  revalidateRepoSandboxRoutes();
  return result;
}

export async function stopRepoSandboxAction(
  sandboxId: string,
): Promise<RepoSandboxMutation<StopSandboxResult>> {
  const result = await stopRepoSandbox(sandboxId);
  revalidateRepoSandboxRoutes();

  return {
    result,
    inventory: await loadManagedInventory(),
  };
}

export async function createRepoSnapshotAction(sandboxId: string): Promise<
  RepoSandboxMutation<{
    sandbox: RepoSandboxSummary | null;
    snapshot: RepoSnapshotSummary | null;
    snapshotResult: CreateSnapshotResult;
  }>
> {
  const snapshotResult = await createRepoSnapshot(sandboxId);
  const inventory = await loadManagedInventory();

  revalidateRepoSandboxRoutes();

  return {
    inventory,
    result: {
      sandbox:
        inventory.sandboxes.find((item) => item.sandboxId === sandboxId) ??
        null,
      snapshot:
        snapshotResult.snapshotId !== null
          ? (inventory.snapshots.find(
              (item) => item.snapshotId === snapshotResult.snapshotId,
            ) ?? null)
          : null,
      snapshotResult,
    },
  };
}

export async function deleteRepoSnapshotAction(
  snapshotId: string,
): Promise<RepoSandboxMutation<DeleteSnapshotResult>> {
  const result = await deleteRepoSnapshot(snapshotId);
  revalidateRepoSandboxRoutes();

  return {
    result,
    inventory: await loadManagedInventory(),
  };
}

export async function restoreRepoSnapshotAction(snapshotId: string): Promise<
  RepoSandboxMutation<{
    attach: StartSandboxHandoffResult["attach"];
    error: string | null;
    sandbox: RepoSandboxSummary | null;
  }>
> {
  const restoreResult = await restoreRepoSnapshot(snapshotId);

  let attach: StartSandboxHandoffResult["attach"] = null;
  let error = restoreResult.error;

  if (restoreResult.sandbox?.sandboxId) {
    const handoffResult = await startRepoSandboxHandoff(
      restoreResult.sandbox.sandboxId,
    );
    attach = handoffResult.attach;
    error = handoffResult.error ?? restoreResult.error;
  }

  revalidateRepoSandboxRoutes();
  const inventory = await loadManagedInventory();

  return {
    inventory,
    result: {
      sandbox:
        restoreResult.sandbox?.sandboxId !== undefined
          ? (inventory.sandboxes.find(
              (item) => item.sandboxId === restoreResult.sandbox?.sandboxId,
            ) ?? null)
          : null,
      attach,
      error,
    },
  };
}

export async function startRepoSandboxHandoffAction(
  sandboxId: string,
): Promise<RepoSandboxMutation<StartSandboxHandoffResult>> {
  const result = await startRepoSandboxHandoff(sandboxId);
  revalidateRepoSandboxRoutes();

  return {
    result,
    inventory: await loadManagedInventory(),
  };
}

export async function executeRepoSandboxCommandAction(
  input: RepoSandboxCommandInput,
): Promise<RepoSandboxCommandResult> {
  return executeRepoSandboxCommand(input);
}
