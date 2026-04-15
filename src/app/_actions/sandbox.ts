"use server";

import { Effect } from "effect";
import type {
  CreateSandboxResult,
  CreateSnapshotResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
} from "@/lib/sandbox";
import {
  createSandboxProgram,
  createSnapshotProgram,
  executeSandboxCommandProgram,
  listSandboxesProgram,
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
