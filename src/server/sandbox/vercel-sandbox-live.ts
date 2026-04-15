import "server-only";

import { Sandbox } from "@vercel/sandbox";
import { Effect, Layer } from "effect";
import type { SandboxSummary } from "@/lib/sandbox";
import {
  type ExecuteSandboxCommandSuccess,
  SandboxBackend,
  SandboxBackendError,
  SandboxService,
} from "./service";

type SandboxListItem = {
  id: string;
  status: string;
  runtime: string;
  cwd: string;
  region: string;
  vcpus: number;
  memory: number;
  timeout: number;
  interactivePort?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  stoppedAt?: number;
};

function toSandboxSummary(sandbox: SandboxListItem): SandboxSummary {
  return {
    sandboxId: sandbox.id,
    status: sandbox.status,
    runtime: sandbox.runtime,
    cwd: sandbox.cwd,
    region: sandbox.region,
    vcpus: sandbox.vcpus,
    memoryMb: Math.round(sandbox.memory / (1024 * 1024)),
    timeoutMs: sandbox.timeout,
    interactivePort: sandbox.interactivePort ?? null,
    createdAt: new Date(sandbox.createdAt).toISOString(),
    updatedAt: new Date(sandbox.updatedAt).toISOString(),
    startedAt: sandbox.startedAt
      ? new Date(sandbox.startedAt).toISOString()
      : null,
    stoppedAt: sandbox.stoppedAt
      ? new Date(sandbox.stoppedAt).toISOString()
      : null,
  };
}

function toSandboxBackendError(error: unknown): SandboxBackendError {
  if (error instanceof Error) {
    return new SandboxBackendError({
      message: error.message,
      cause: error,
    });
  }

  return new SandboxBackendError({
    message: "Unknown sandbox error",
    cause: error,
  });
}

export class VercelSandboxBackend extends SandboxBackend {
  readonly backend = "vercel";

  protected createRaw(): Effect.Effect<string, SandboxBackendError> {
    return Effect.tryPromise({
      try: async () => {
        const sandbox = await Sandbox.create({
          runtime: "node22",
          timeout: 5 * 60 * 1000,
          resources: {
            vcpus: 2,
          },
        });

        return sandbox.sandboxId;
      },
      catch: toSandboxBackendError,
    });
  }

  protected listRaw(): Effect.Effect<
    ReadonlyArray<SandboxSummary>,
    SandboxBackendError
  > {
    return Effect.tryPromise({
      try: async () => {
        const sandboxes: SandboxSummary[] = [];
        let until: number | null | undefined;

        do {
          const page = await Sandbox.list({
            limit: 100,
            until: until ?? undefined,
          });

          sandboxes.push(...page.json.sandboxes.map(toSandboxSummary));
          until = page.json.pagination.next;
        } while (until !== null && until !== undefined);

        const statusPriority = new Map<string, number>([
          ["running", 0],
          ["pending", 1],
          ["snapshotting", 2],
          ["stopping", 3],
          ["stopped", 4],
          ["failed", 5],
          ["aborted", 6],
        ]);

        sandboxes.sort((left, right) => {
          const leftPriority = statusPriority.get(left.status) ?? 99;
          const rightPriority = statusPriority.get(right.status) ?? 99;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          return right.createdAt.localeCompare(left.createdAt);
        });

        return sandboxes;
      },
      catch: toSandboxBackendError,
    });
  }

  protected executeRaw(input: {
    sandboxId: string;
    command: string;
    args: string[];
    cwd: string | undefined;
  }): Effect.Effect<ExecuteSandboxCommandSuccess, SandboxBackendError> {
    return Effect.gen(function* () {
      const sandbox = yield* Effect.tryPromise({
        try: () => Sandbox.get({ sandboxId: input.sandboxId }),
        catch: toSandboxBackendError,
      });

      const command = yield* Effect.tryPromise({
        try: () =>
          sandbox.runCommand({
            cmd: input.command,
            args: input.args,
            cwd: input.cwd,
          }),
        catch: toSandboxBackendError,
      });

      const { stdout, stderr } = yield* Effect.all({
        stdout: Effect.tryPromise({
          try: () => command.stdout(),
          catch: toSandboxBackendError,
        }),
        stderr: Effect.tryPromise({
          try: () => command.stderr(),
          catch: toSandboxBackendError,
        }),
      });

      return {
        sandboxId: sandbox.sandboxId,
        exitCode: command.exitCode,
        stdout,
        stderr,
      };
    });
  }
}

export const VercelSandboxLive = Layer.succeed(
  SandboxService,
  new VercelSandboxBackend(),
);
