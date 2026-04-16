"use server";

import { Effect } from "effect";
import type {
  CreateSandboxResult,
  CreateSnapshotResult,
  DeleteSnapshotResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  StopSandboxResult,
} from "@/lib/sandbox";
import {
  createSandboxProgram,
  createSnapshotProgram,
  deleteSnapshotProgram,
  executeSandboxCommandProgram,
  listSandboxesProgram,
  stopSandboxProgram,
} from "@/server/sandbox/service";
import { VercelSandboxLive } from "@/server/sandbox/vercel-sandbox-live";

function runSandboxProgram<T>(program: Effect.Effect<T, never, never>) {
  return Effect.runPromise(program);
}

export async function listSandboxes(): Promise<SandboxListResult> {
  return runSandboxProgram(
    listSandboxesProgram.pipe(Effect.provide(VercelSandboxLive)),
  );
}

export async function createSandbox(): Promise<CreateSandboxResult> {
  return runSandboxProgram(
    createSandboxProgram.pipe(Effect.provide(VercelSandboxLive)),
  );
}

export async function snapshotSandbox(
  sandboxId: string,
): Promise<CreateSnapshotResult> {
  return runSandboxProgram(
    createSnapshotProgram(sandboxId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

export async function stopSandbox(
  sandboxId: string,
): Promise<StopSandboxResult> {
  return runSandboxProgram(
    stopSandboxProgram(sandboxId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

export async function deleteSnapshot(
  snapshotId: string,
): Promise<DeleteSnapshotResult> {
  return runSandboxProgram(
    deleteSnapshotProgram(snapshotId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

export async function executeSandboxCommand({
  sandboxId,
  command,
  args = [],
  cwd,
}: ExecuteSandboxCommandInput): Promise<ExecuteSandboxCommandResult> {
  return runSandboxProgram(
    executeSandboxCommandProgram({
      sandboxId,
      command,
      args,
      cwd,
    }).pipe(Effect.provide(VercelSandboxLive)),
  );
}
