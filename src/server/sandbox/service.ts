import "server-only";

import { Context, Data, Effect } from "effect";
import type {
  CreateSandboxResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  SandboxSummary,
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

  protected abstract createRaw(): Effect.Effect<string, SandboxBackendError>;

  protected abstract listRaw(): Effect.Effect<
    ReadonlyArray<SandboxSummary>,
    SandboxBackendError
  >;

  protected abstract executeRaw(
    input: NormalizedExecuteSandboxCommandInput,
  ): Effect.Effect<ExecuteSandboxCommandSuccess, SandboxBackendError>;

  listSandboxes(): Effect.Effect<SandboxListResult> {
    return this.listRaw().pipe(
      Effect.map((sandboxes) => ({
        sandboxes: [...sandboxes],
        error: null,
      })),
      Effect.catchTag("SandboxBackendError", (error) =>
        Effect.succeed({
          sandboxes: [],
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
    return this.createRaw().pipe(
      Effect.map((sandboxId) => ({
        sandboxId,
        error: null,
      })),
      Effect.catchTag("SandboxBackendError", (error) =>
        Effect.succeed({
          sandboxId: null,
          error: error.message,
        }),
      ),
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
    if (!input.sandboxId) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Sandbox ID is required.",
        }),
      );
    }

    if (!input.command) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Command is required.",
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

export const executeSandboxCommandProgram = (
  input: ExecuteSandboxCommandInput,
) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.executeSandboxCommand(input),
  );
