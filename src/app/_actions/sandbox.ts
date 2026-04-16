"use server";

import { Effect } from "effect";
import type {
  BuildSandboxSnapshotInput,
  BuildSandboxSnapshotResult,
  CreateSandboxResult,
  CreateSnapshotResult,
  DeleteSnapshotResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  StopSandboxResult,
} from "@/lib/sandbox";
import { runSandboxProgram } from "@/server/sandbox/runtime";
import {
  buildSandboxSnapshotProgram,
  createSandboxProgram,
  createSnapshotProgram,
  deleteSnapshotProgram,
  executeSandboxCommandProgram,
  listSandboxesProgram,
  stopSandboxProgram,
} from "@/server/sandbox/service";
import { VercelSandboxLive } from "@/server/sandbox/vercel-sandbox-live";

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

export async function buildSandboxSnapshot(
  input: BuildSandboxSnapshotInput,
): Promise<BuildSandboxSnapshotResult> {
  return runSandboxProgram(
    buildSandboxSnapshotProgram(input).pipe(Effect.provide(VercelSandboxLive)),
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
