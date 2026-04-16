import { Sandbox, Snapshot } from "@vercel/sandbox";
import { Effect, Layer } from "effect";
import type { SandboxSummary, SnapshotSummary } from "@/lib/sandbox";
import {
  type CreateSandboxSuccess,
  type CreateSnapshotSuccess,
  type DeleteSnapshotSuccess,
  type ExecuteSandboxCommandSuccess,
  SandboxBackend,
  SandboxBackendError,
  SandboxService,
  type StopSandboxSuccess,
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
  sourceSnapshotId?: string;
  snapshottedAt?: number;
};

type SnapshotListItem = {
  id: string;
  status: string;
  sourceSandboxId: string;
  region: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
};

type SnapshotCredentials = {
  projectId: string;
  teamId: string;
  token: string;
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
    sourceSnapshotId: sandbox.sourceSnapshotId ?? null,
    snapshottedAt: sandbox.snapshottedAt
      ? new Date(sandbox.snapshottedAt).toISOString()
      : null,
  };
}

function toSnapshotSummary(snapshot: SnapshotListItem): SnapshotSummary {
  return {
    snapshotId: snapshot.id,
    status: snapshot.status,
    sourceSandboxId: snapshot.sourceSandboxId,
    region: snapshot.region,
    sizeBytes: snapshot.sizeBytes,
    createdAt: new Date(snapshot.createdAt).toISOString(),
    updatedAt: new Date(snapshot.updatedAt).toISOString(),
    expiresAt: snapshot.expiresAt
      ? new Date(snapshot.expiresAt).toISOString()
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

function getOidcClaims() {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();

  if (!oidcToken) {
    return null;
  }

  const [, payload] = oidcToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      owner_id?: string;
      project_id?: string;
    };
  } catch {
    return null;
  }
}

function getSnapshotCredentials(): SnapshotCredentials | null {
  const oidcClaims = getOidcClaims();
  const token =
    process.env.VERCEL_TOKEN?.trim() ?? process.env.VERCEL_OIDC_TOKEN?.trim();
  const teamId =
    process.env.VERCEL_TEAM_ID?.trim() ?? oidcClaims?.owner_id?.trim() ?? null;
  const projectId =
    process.env.VERCEL_PROJECT_ID?.trim() ??
    oidcClaims?.project_id?.trim() ??
    null;

  if (!token || !teamId || !projectId) {
    return null;
  }

  return {
    projectId,
    teamId,
    token,
  };
}

function requireSnapshotCredentials(): Effect.Effect<
  SnapshotCredentials,
  SandboxBackendError
> {
  const snapshotCredentials = getSnapshotCredentials();

  if (snapshotCredentials) {
    return Effect.succeed(snapshotCredentials);
  }

  return Effect.fail(
    new SandboxBackendError({
      message:
        "Snapshot credentials are not available. Configure VERCEL_PROJECT_ID, VERCEL_TEAM_ID, and VERCEL_TOKEN or provide VERCEL_OIDC_TOKEN.",
    }),
  );
}

export class VercelSandboxBackend extends SandboxBackend {
  readonly backend = "vercel";

  protected createRaw(
    sourceSnapshotId: string | null,
  ): Effect.Effect<CreateSandboxSuccess, SandboxBackendError> {
    return Effect.tryPromise({
      try: async () => {
        const sandbox = await Sandbox.create({
          timeout: 5 * 60 * 1000,
          resources: {
            vcpus: 2,
          },
          ...(sourceSnapshotId
            ? {
                source: {
                  type: "snapshot" as const,
                  snapshotId: sourceSnapshotId,
                },
              }
            : {
                runtime: "node24" as const,
              }),
        });

        return {
          sandboxId: sandbox.sandboxId,
          sourceSnapshotId: sandbox.sourceSnapshotId,
        };
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

  protected listSnapshotsRaw(): Effect.Effect<
    ReadonlyArray<SnapshotSummary>,
    SandboxBackendError
  > {
    const snapshotCredentials = getSnapshotCredentials();

    if (!snapshotCredentials) {
      return Effect.succeed([]);
    }

    return Effect.tryPromise({
      try: async () => {
        const snapshots: SnapshotSummary[] = [];
        let until: number | null | undefined;

        do {
          const page = await Snapshot.list({
            ...snapshotCredentials,
            limit: 100,
            until: until ?? undefined,
          });

          snapshots.push(
            ...page.json.snapshots
              .map(toSnapshotSummary)
              .filter((snapshot) => snapshot.status !== "deleted"),
          );
          until = page.json.pagination.next;
        } while (until !== null && until !== undefined);

        snapshots.sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        );

        return snapshots;
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

  protected createSnapshotRaw(input: {
    sandboxId: string;
  }): Effect.Effect<CreateSnapshotSuccess, SandboxBackendError> {
    return Effect.gen(function* () {
      const sandbox = yield* Effect.tryPromise({
        try: () => Sandbox.get({ sandboxId: input.sandboxId }),
        catch: toSandboxBackendError,
      });

      const snapshot = yield* Effect.tryPromise({
        try: () =>
          sandbox.snapshot({
            expiration: 0,
          }),
        catch: toSandboxBackendError,
      });

      return {
        sandboxId: sandbox.sandboxId,
        snapshotId: snapshot.snapshotId,
        expiresAt: snapshot.expiresAt?.toISOString() ?? null,
      };
    });
  }

  protected stopSandboxRaw(input: {
    sandboxId: string;
  }): Effect.Effect<StopSandboxSuccess, SandboxBackendError> {
    return Effect.gen(function* () {
      const sandbox = yield* Effect.tryPromise({
        try: () => Sandbox.get({ sandboxId: input.sandboxId }),
        catch: toSandboxBackendError,
      });

      const stoppedSandbox = yield* Effect.tryPromise({
        try: () =>
          sandbox.stop({
            blocking: true,
          }),
        catch: toSandboxBackendError,
      });

      return {
        sandboxId: input.sandboxId,
        status: stoppedSandbox.status,
      };
    });
  }

  protected deleteSnapshotRaw(input: {
    snapshotId: string;
  }): Effect.Effect<DeleteSnapshotSuccess, SandboxBackendError> {
    return Effect.gen(function* () {
      const snapshotCredentials = yield* requireSnapshotCredentials();

      const snapshot = yield* Effect.tryPromise({
        try: () =>
          Snapshot.get({
            ...snapshotCredentials,
            snapshotId: input.snapshotId,
          }),
        catch: toSandboxBackendError,
      });

      yield* Effect.tryPromise({
        try: () => snapshot.delete(),
        catch: toSandboxBackendError,
      });

      return {
        snapshotId: input.snapshotId,
      };
    });
  }
}

export const VercelSandboxLive = Layer.succeed(
  SandboxService,
  new VercelSandboxBackend(),
);
