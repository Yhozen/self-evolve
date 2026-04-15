import "server-only";

import { Context, Data, Effect } from "effect";
import type {
  CreateSandboxResult,
  CreateSnapshotResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  SandboxSummary,
  SnapshotSummary,
} from "@/lib/sandbox";

type NormalizedExecuteSandboxCommandInput = {
  sandboxId: string;
  command: string;
  args: string[];
  cwd: string | undefined;
};

export type ExecuteSandboxCommandSuccess = {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CreateSandboxSuccess = {
  sandboxId: string;
  sourceSnapshotId: string | undefined;
};

export type CreateSnapshotSuccess = {
  sandboxId: string;
  snapshotId: string;
  expiresAt: string | null;
};

export class SandboxValidationError extends Data.TaggedError(
  "SandboxValidationError",
)<{
  message: string;
}> {}

export class SandboxBackendError extends Data.TaggedError(
  "SandboxBackendError",
)<{
  message: string;
  cause?: unknown;
}> {}

export abstract class SandboxBackend {
  abstract readonly backend: string;

  protected abstract createRaw(
    sourceSnapshotId: string | null,
  ): Effect.Effect<CreateSandboxSuccess, SandboxBackendError>;

  protected abstract listRaw(): Effect.Effect<
    ReadonlyArray<SandboxSummary>,
    SandboxBackendError
  >;

  protected abstract latestSnapshotRaw(): Effect.Effect<
    SnapshotSummary | null,
    SandboxBackendError
  >;

  protected abstract executeRaw(
    input: NormalizedExecuteSandboxCommandInput,
  ): Effect.Effect<ExecuteSandboxCommandSuccess, SandboxBackendError>;

  protected abstract createSnapshotRaw(input: {
    sandboxId: string;
  }): Effect.Effect<CreateSnapshotSuccess, SandboxBackendError>;

  listSandboxes(): Effect.Effect<SandboxListResult> {
    return Effect.all({
      sandboxes: this.listRaw(),
      latestSnapshot: this.latestSnapshotRaw().pipe(
        Effect.catchTag("SandboxBackendError", () => Effect.succeed(null)),
      ),
    }).pipe(
      Effect.map(({ sandboxes, latestSnapshot }) => ({
        sandboxes: [...sandboxes],
        latestSnapshot,
        error: null,
      })),
      Effect.catchTag("SandboxBackendError", (error) =>
        Effect.succeed({
          sandboxes: [],
          latestSnapshot: null,
          error: error.message,
        }),
      ),
    );
  }

  executeSandboxCommand(
    input: ExecuteSandboxCommandInput,
  ): Effect.Effect<ExecuteSandboxCommandResult> {
    const backend = this;
    const prepared = this.prepareExecuteInput(input);

    return Effect.gen(function* () {
      yield* SandboxBackend.validateExecuteInput(prepared);
      const execution = yield* backend.executeRaw(prepared);

      return {
        sandboxId: execution.sandboxId,
        command: prepared.command,
        args: prepared.args,
        cwd: prepared.cwd ?? null,
        exitCode: execution.exitCode,
        stdout: execution.stdout,
        stderr: execution.stderr,
        executedAt: new Date().toISOString(),
        error: null,
      };
    }).pipe(
      Effect.catchTags({
        SandboxValidationError: (error) =>
          Effect.succeed(SandboxBackend.toErrorResult(prepared, error.message)),
        SandboxBackendError: (error) =>
          Effect.succeed(SandboxBackend.toErrorResult(prepared, error.message)),
      }),
    );
  }

  createSandbox(): Effect.Effect<CreateSandboxResult> {
    const backend = this;

    return Effect.gen(function* () {
      const latestSnapshot = yield* backend.latestSnapshotRaw();
      const created = yield* backend.createRaw(
        latestSnapshot?.snapshotId ?? null,
      );

      return {
        sandboxId: created.sandboxId,
        sourceSnapshotId: created.sourceSnapshotId ?? null,
        restoredFromSnapshot: created.sourceSnapshotId !== undefined,
        error: null,
      };
    }).pipe(
      Effect.catchTag("SandboxBackendError", (error) =>
        Effect.succeed({
          sandboxId: null,
          sourceSnapshotId: null,
          restoredFromSnapshot: false,
          error: error.message,
        }),
      ),
    );
  }

  createSnapshot(sandboxId: string): Effect.Effect<CreateSnapshotResult> {
    const preparedSandboxId = sandboxId.trim();

    return SandboxBackend.validateSandboxId(preparedSandboxId).pipe(
      Effect.flatMap(() =>
        this.createSnapshotRaw({
          sandboxId: preparedSandboxId,
        }),
      ),
      Effect.map((snapshot) => ({
        sandboxId: snapshot.sandboxId,
        snapshotId: snapshot.snapshotId,
        expiresAt: snapshot.expiresAt,
        error: null,
      })),
      Effect.catchTags({
        SandboxValidationError: (error) =>
          Effect.succeed({
            sandboxId: preparedSandboxId,
            snapshotId: null,
            expiresAt: null,
            error: error.message,
          }),
        SandboxBackendError: (error) =>
          Effect.succeed({
            sandboxId: preparedSandboxId,
            snapshotId: null,
            expiresAt: null,
            error: error.message,
          }),
      }),
    );
  }

  private prepareExecuteInput(
    input: ExecuteSandboxCommandInput,
  ): NormalizedExecuteSandboxCommandInput {
    return {
      sandboxId: input.sandboxId.trim(),
      command: input.command.trim(),
      args: (input.args ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      cwd: input.cwd?.trim() || undefined,
    };
  }

  private static validateExecuteInput(
    input: NormalizedExecuteSandboxCommandInput,
  ): Effect.Effect<void, SandboxValidationError> {
    const validatedSandboxId = SandboxBackend.validateSandboxId(
      input.sandboxId,
    );

    if (!input.command) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Command is required.",
        }),
      );
    }

    return validatedSandboxId;
  }

  private static validateSandboxId(
    sandboxId: string,
  ): Effect.Effect<void, SandboxValidationError> {
    if (!sandboxId) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Sandbox ID is required.",
        }),
      );
    }

    return Effect.void;
  }

  private static toErrorResult(
    input: NormalizedExecuteSandboxCommandInput,
    message: string,
  ): ExecuteSandboxCommandResult {
    return {
      sandboxId: input.sandboxId,
      command: input.command,
      args: input.args,
      cwd: input.cwd ?? null,
      exitCode: 1,
      stdout: "",
      stderr: "",
      executedAt: new Date().toISOString(),
      error: message,
    };
  }
}

export class SandboxService extends Context.Tag("SandboxService")<
  SandboxService,
  SandboxBackend
>() {}

export const listSandboxesProgram = Effect.flatMap(SandboxService, (sandbox) =>
  sandbox.listSandboxes(),
);

export const createSandboxProgram = Effect.flatMap(SandboxService, (sandbox) =>
  sandbox.createSandbox(),
);

export const createSnapshotProgram = (sandboxId: string) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.createSnapshot(sandboxId),
  );

export const executeSandboxCommandProgram = (
  input: ExecuteSandboxCommandInput,
) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.executeSandboxCommand(input),
  );
