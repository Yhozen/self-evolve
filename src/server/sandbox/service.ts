import { Context, Data, Effect } from "effect";
import type {
  BuildSandboxSnapshotInput,
  BuildSandboxSnapshotResult,
  CreateSandboxResult,
  CreateSnapshotResult,
  DeleteSnapshotResult,
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxListResult,
  SandboxSummary,
  SnapshotSummary,
  StopSandboxResult,
} from "@/lib/sandbox";

type NormalizedExecuteSandboxCommandInput = {
  sandboxId: string;
  command: string;
  args: string[];
  cwd: string | undefined;
};

type NormalizedSandboxRecipeInput = {
  name: string;
  script: string;
  cwd: string | undefined;
};

type NormalizedSandboxUserProfileInput = {
  name: string | null;
  script: string;
  cwd: string | undefined;
};

type NormalizedBuildSandboxSnapshotInput = {
  recipe: NormalizedSandboxRecipeInput;
  userProfile: NormalizedSandboxUserProfileInput | null;
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

export type StopSandboxSuccess = {
  sandboxId: string;
  status: string;
};

export type DeleteSnapshotSuccess = {
  snapshotId: string;
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

  protected abstract listSnapshotsRaw(): Effect.Effect<
    ReadonlyArray<SnapshotSummary>,
    SandboxBackendError
  >;

  protected abstract executeRaw(
    input: NormalizedExecuteSandboxCommandInput,
  ): Effect.Effect<ExecuteSandboxCommandSuccess, SandboxBackendError>;

  protected abstract createSnapshotRaw(input: {
    sandboxId: string;
  }): Effect.Effect<CreateSnapshotSuccess, SandboxBackendError>;

  protected abstract stopSandboxRaw(input: {
    sandboxId: string;
  }): Effect.Effect<StopSandboxSuccess, SandboxBackendError>;

  protected abstract deleteSnapshotRaw(input: {
    snapshotId: string;
  }): Effect.Effect<DeleteSnapshotSuccess, SandboxBackendError>;

  listSandboxes(): Effect.Effect<SandboxListResult> {
    return Effect.all({
      sandboxes: this.listRaw(),
      snapshots: this.listSnapshotsRaw().pipe(
        Effect.catchTag("SandboxBackendError", () => Effect.succeed([])),
      ),
    }).pipe(
      Effect.map(({ sandboxes, snapshots }) => ({
        sandboxes: [...sandboxes],
        snapshots: [...snapshots],
        latestSnapshot: SandboxBackend.getLatestSnapshot(snapshots),
        error: null,
      })),
      Effect.catchTag("SandboxBackendError", (error) =>
        Effect.succeed({
          sandboxes: [],
          snapshots: [],
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
      const snapshots = yield* backend.listSnapshotsRaw();
      const latestSnapshot = SandboxBackend.getLatestSnapshot(snapshots);
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

  buildSandboxSnapshot(
    input: BuildSandboxSnapshotInput,
  ): Effect.Effect<BuildSandboxSnapshotResult> {
    const backend = this;
    const prepared = this.prepareBuildSnapshotInput(input);

    return Effect.gen(function* () {
      const validated = yield* Effect.either(
        SandboxBackend.validateBuildSnapshotInput(prepared),
      );

      if (validated._tag === "Left") {
        return SandboxBackend.toBuildSnapshotErrorResult({
          prepared,
          failedStep: "validation",
          message: validated.left.message,
        });
      }

      const created = yield* Effect.either(backend.createRaw(null));

      if (created._tag === "Left") {
        return SandboxBackend.toBuildSnapshotErrorResult({
          prepared,
          failedStep: "createSandbox",
          message: created.left.message,
        });
      }

      const recipeExecution = yield* Effect.either(
        backend.executeShellScript({
          sandboxId: created.right.sandboxId,
          script: prepared.recipe.script,
          cwd: prepared.recipe.cwd,
        }),
      );

      if (recipeExecution._tag === "Left") {
        return SandboxBackend.toBuildSnapshotErrorResult({
          prepared,
          sandboxId: created.right.sandboxId,
          failedStep: "recipe",
          message: recipeExecution.left.message,
        });
      }

      if (recipeExecution.right.exitCode !== 0) {
        return SandboxBackend.toBuildSnapshotErrorResult({
          prepared,
          sandboxId: created.right.sandboxId,
          recipeExecution: recipeExecution.right,
          failedStep: "recipe",
          message: `Recipe "${prepared.recipe.name}" failed with exit code ${recipeExecution.right.exitCode}.`,
        });
      }

      let userProfileExecution: ExecuteSandboxCommandResult | null = null;

      if (prepared.userProfile) {
        const executedUserProfile = yield* Effect.either(
          backend.executeShellScript({
            sandboxId: created.right.sandboxId,
            script: prepared.userProfile.script,
            cwd: prepared.userProfile.cwd,
          }),
        );

        if (executedUserProfile._tag === "Left") {
          return SandboxBackend.toBuildSnapshotErrorResult({
            prepared,
            sandboxId: created.right.sandboxId,
            recipeExecution: recipeExecution.right,
            failedStep: "userProfile",
            message: executedUserProfile.left.message,
          });
        }

        userProfileExecution = executedUserProfile.right;

        if (userProfileExecution.exitCode !== 0) {
          return SandboxBackend.toBuildSnapshotErrorResult({
            prepared,
            sandboxId: created.right.sandboxId,
            recipeExecution: recipeExecution.right,
            userProfileExecution,
            failedStep: "userProfile",
            message: `User profile "${prepared.userProfile.name ?? "profile"}" failed with exit code ${userProfileExecution.exitCode}.`,
          });
        }
      }

      const snapshot = yield* Effect.either(
        backend.createSnapshotRaw({
          sandboxId: created.right.sandboxId,
        }),
      );

      if (snapshot._tag === "Left") {
        return SandboxBackend.toBuildSnapshotErrorResult({
          prepared,
          sandboxId: created.right.sandboxId,
          recipeExecution: recipeExecution.right,
          userProfileExecution,
          failedStep: "snapshot",
          message: snapshot.left.message,
        });
      }

      return {
        sandboxId: created.right.sandboxId,
        snapshotId: snapshot.right.snapshotId,
        recipeName: prepared.recipe.name,
        userProfileName: prepared.userProfile?.name ?? null,
        recipeExecution: recipeExecution.right,
        userProfileExecution,
        failedStep: null,
        error: null,
      };
    });
  }

  stopSandbox(sandboxId: string): Effect.Effect<StopSandboxResult> {
    const preparedSandboxId = sandboxId.trim();

    return SandboxBackend.validateSandboxId(preparedSandboxId).pipe(
      Effect.flatMap(() =>
        this.stopSandboxRaw({
          sandboxId: preparedSandboxId,
        }),
      ),
      Effect.map((sandbox) => ({
        sandboxId: sandbox.sandboxId,
        status: sandbox.status,
        error: null,
      })),
      Effect.catchTags({
        SandboxValidationError: (error) =>
          Effect.succeed({
            sandboxId: preparedSandboxId,
            status: null,
            error: error.message,
          }),
        SandboxBackendError: (error) =>
          Effect.succeed({
            sandboxId: preparedSandboxId,
            status: null,
            error: error.message,
          }),
      }),
    );
  }

  deleteSnapshot(snapshotId: string): Effect.Effect<DeleteSnapshotResult> {
    const preparedSnapshotId = snapshotId.trim();

    return SandboxBackend.validateSnapshotId(preparedSnapshotId).pipe(
      Effect.flatMap(() =>
        this.deleteSnapshotRaw({
          snapshotId: preparedSnapshotId,
        }),
      ),
      Effect.map((snapshot) => ({
        snapshotId: snapshot.snapshotId,
        error: null,
      })),
      Effect.catchTags({
        SandboxValidationError: (error) =>
          Effect.succeed({
            snapshotId: preparedSnapshotId,
            error: error.message,
          }),
        SandboxBackendError: (error) =>
          Effect.succeed({
            snapshotId: preparedSnapshotId,
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

  private prepareBuildSnapshotInput(
    input: BuildSandboxSnapshotInput,
  ): NormalizedBuildSandboxSnapshotInput {
    return {
      recipe: {
        name: input.recipe.name.trim(),
        script: input.recipe.script,
        cwd: input.recipe.cwd?.trim() || undefined,
      },
      userProfile: input.userProfile
        ? {
            name: input.userProfile.name?.trim() || null,
            script: input.userProfile.script,
            cwd: input.userProfile.cwd?.trim() || undefined,
          }
        : null,
    };
  }

  private executeShellScript(input: {
    sandboxId: string;
    script: string;
    cwd: string | undefined;
  }): Effect.Effect<ExecuteSandboxCommandResult, SandboxBackendError> {
    const commandInput: NormalizedExecuteSandboxCommandInput = {
      sandboxId: input.sandboxId,
      command: "bash",
      args: ["-lc", input.script],
      cwd: input.cwd,
    };

    return this.executeRaw(commandInput).pipe(
      Effect.map((execution) =>
        SandboxBackend.toExecutionResult(commandInput, execution),
      ),
    );
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

  private static validateBuildSnapshotInput(
    input: NormalizedBuildSandboxSnapshotInput,
  ): Effect.Effect<void, SandboxValidationError> {
    if (!input.recipe.name) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Recipe name is required.",
        }),
      );
    }

    if (!input.recipe.script.trim()) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Recipe script is required.",
        }),
      );
    }

    if (input.userProfile && !input.userProfile.script.trim()) {
      return Effect.fail(
        new SandboxValidationError({
          message:
            "User profile script is required when a user profile is provided.",
        }),
      );
    }

    return Effect.void;
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

  private static validateSnapshotId(
    snapshotId: string,
  ): Effect.Effect<void, SandboxValidationError> {
    if (!snapshotId) {
      return Effect.fail(
        new SandboxValidationError({
          message: "Snapshot ID is required.",
        }),
      );
    }

    return Effect.void;
  }

  private static getLatestSnapshot(
    snapshots: ReadonlyArray<SnapshotSummary>,
  ): SnapshotSummary | null {
    return snapshots.find((snapshot) => snapshot.status === "created") ?? null;
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

  private static toExecutionResult(
    input: NormalizedExecuteSandboxCommandInput,
    execution: ExecuteSandboxCommandSuccess,
  ): ExecuteSandboxCommandResult {
    return {
      sandboxId: execution.sandboxId,
      command: input.command,
      args: input.args,
      cwd: input.cwd ?? null,
      exitCode: execution.exitCode,
      stdout: execution.stdout,
      stderr: execution.stderr,
      executedAt: new Date().toISOString(),
      error: null,
    };
  }

  private static toBuildSnapshotErrorResult(input: {
    prepared: NormalizedBuildSandboxSnapshotInput;
    failedStep: BuildSandboxSnapshotResult["failedStep"];
    message: string;
    sandboxId?: string;
    recipeExecution?: ExecuteSandboxCommandResult | null;
    userProfileExecution?: ExecuteSandboxCommandResult | null;
  }): BuildSandboxSnapshotResult {
    return {
      sandboxId: input.sandboxId ?? null,
      snapshotId: null,
      recipeName: input.prepared.recipe.name,
      userProfileName: input.prepared.userProfile?.name ?? null,
      recipeExecution: input.recipeExecution ?? null,
      userProfileExecution: input.userProfileExecution ?? null,
      failedStep: input.failedStep,
      error: input.message,
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

export const buildSandboxSnapshotProgram = (input: BuildSandboxSnapshotInput) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.buildSandboxSnapshot(input),
  );

export const stopSandboxProgram = (sandboxId: string) =>
  Effect.flatMap(SandboxService, (sandbox) => sandbox.stopSandbox(sandboxId));

export const deleteSnapshotProgram = (snapshotId: string) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.deleteSnapshot(snapshotId),
  );

export const executeSandboxCommandProgram = (
  input: ExecuteSandboxCommandInput,
) =>
  Effect.flatMap(SandboxService, (sandbox) =>
    sandbox.executeSandboxCommand(input),
  );
