import { App } from "@octokit/app";
import { Sandbox } from "@vercel/sandbox";
import { Effect } from "effect";
import { z } from "zod";
import { env } from "@/env/server";
import type {
  RepoBaselineRecord,
  RepoBootstrapInput,
  RepoBootstrapResult,
  RepoSandboxAttach,
  RepoSandboxCommandInput,
  RepoSandboxCommandResult,
  RepoSandboxInventory,
  RepoSandboxMetadata,
  RepoSandboxSummary,
  RepoSnapshotMetadata,
  RepoSnapshotSummary,
  RestoreRepoSnapshotResult,
  StartSandboxHandoffResult,
} from "@/lib/repo-sandbox";
import {
  buildRepoBaselineKey,
  inferRepoNameFromSandbox,
  parseRepoUrl,
} from "@/lib/repo-sandbox";
import type {
  CreateSnapshotResult,
  DeleteSnapshotResult,
  SandboxListResult,
  StopSandboxResult,
} from "@/lib/sandbox";
import { runSandboxProgram } from "@/server/sandbox/runtime";
import {
  createSnapshotProgram,
  deleteSnapshotProgram,
  executeSandboxCommandProgram,
  listSandboxesProgram,
  stopSandboxProgram,
} from "@/server/sandbox/service";
import { VercelSandboxLive } from "@/server/sandbox/vercel-sandbox-live";
import {
  clearRepoBaseline,
  getRepoBaseline,
  getSandboxMetadata,
  getSnapshotMetadata,
  pruneRepoSandboxState,
  readRepoSandboxState,
  removeSnapshotMetadata,
  setRepoBaseline,
  updateSandboxAttachMetadata,
  upsertSandboxMetadata,
  upsertSnapshotMetadata,
} from "./state-store";

const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode";
const OPENCODE_PORT = 4096;
const OPENCODE_USERNAME = "opencode";
const SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;
const SANDBOX_VCPUS = 2;
const PREVIEW_PORTS = [3000, OPENCODE_PORT];
const SERVER_STARTUP_DELAY_MS = 8_000;

const installationAuthSchema = z
  .object({
    token: z.string().min(1),
  })
  .loose();

function resolveDefaultInstallationId() {
  const raw = env.GITHUB_APP_INSTALLATION_ID?.trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getGitHubApp() {
  return new App({
    appId: Number(env.GITHUB_APP_ID),
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
}

async function mintInstallationToken(installationId: number) {
  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  return installationAuthSchema.parse(
    await octokit.auth({
      type: "installation",
      installationId,
    }),
  ).token;
}

function now() {
  return new Date().toISOString();
}

function resolveInstallationId(installationId: number | null | undefined) {
  if (typeof installationId === "number" && Number.isFinite(installationId)) {
    return installationId;
  }

  return resolveDefaultInstallationId();
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function listRawInventory() {
  return runSandboxProgram(
    listSandboxesProgram.pipe(Effect.provide(VercelSandboxLive)),
  );
}

async function stopRawSandbox(sandboxId: string) {
  return runSandboxProgram(
    stopSandboxProgram(sandboxId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

async function createRawSnapshot(sandboxId: string) {
  return runSandboxProgram(
    createSnapshotProgram(sandboxId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

async function deleteRawSnapshot(snapshotId: string) {
  return runSandboxProgram(
    deleteSnapshotProgram(snapshotId).pipe(Effect.provide(VercelSandboxLive)),
  );
}

async function executeRawCommand(
  input: RepoSandboxCommandInput,
): Promise<RepoSandboxCommandResult> {
  return runSandboxProgram(
    executeSandboxCommandProgram(input).pipe(Effect.provide(VercelSandboxLive)),
  );
}

async function resolveSandboxCwd(sandbox: Sandbox) {
  const pwd = await sandbox.runCommand({
    cmd: "pwd",
    args: [],
  });

  const stdout = (await pwd.stdout()).trim();
  return stdout || "/vercel/sandbox/app";
}

async function runShellScript(input: {
  sandbox: Sandbox;
  cwd: string;
  env?: Record<string, string>;
  script: string;
}) {
  return input.sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", input.script],
    cwd: input.cwd,
    env: input.env,
  });
}

async function provisionFreshRepoSandbox(input: {
  branch: string;
  cwd: string;
  sandbox: Sandbox;
  workspacePath: string;
}) {
  const command = await runShellScript({
    sandbox: input.sandbox,
    cwd: input.cwd,
    env: {
      REQUESTED_BRANCH: input.branch,
      REQUESTED_WORKSPACE_PATH: input.workspacePath,
    },
    script: `
set -euo pipefail

if [ -n "$REQUESTED_WORKSPACE_PATH" ] && [ "$REQUESTED_WORKSPACE_PATH" != "$PWD" ]; then
  mkdir -p "$(dirname "$REQUESTED_WORKSPACE_PATH")"
  ln -sfn "$PWD" "$REQUESTED_WORKSPACE_PATH"
fi

if [ -n "$REQUESTED_BRANCH" ]; then
  CURRENT_BRANCH="$(git branch --show-current || true)"
  if [ "$CURRENT_BRANCH" != "$REQUESTED_BRANCH" ]; then
    git checkout "$REQUESTED_BRANCH"
  fi
fi

if ! [ -x "$HOME/.opencode/bin/opencode" ]; then
  curl -fsSL https://opencode.ai/install | bash
fi

export PATH="$HOME/.opencode/bin:$PATH"

if [ -f package.json ]; then
  corepack enable >/dev/null 2>&1 || true

  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile=false
  elif [ -f bun.lock ] || [ -f bun.lockb ]; then
    bun install
  elif [ -f yarn.lock ]; then
    yarn install
  elif [ -f package-lock.json ]; then
    npm install
  fi
fi
`,
  });

  return {
    exitCode: command.exitCode,
    stderr: await command.stderr(),
    stdout: await command.stdout(),
  };
}

async function prepareRestoredRepoSandbox(input: {
  baselineBranch: string;
  branch: string;
  cwd: string;
  sandbox: Sandbox;
  workspacePath: string;
}) {
  const command = await runShellScript({
    sandbox: input.sandbox,
    cwd: input.cwd,
    env: {
      REQUESTED_BRANCH: input.branch,
      REQUESTED_WORKSPACE_PATH: input.workspacePath,
    },
    script: `
set -euo pipefail

if [ -n "$REQUESTED_WORKSPACE_PATH" ] && [ "$REQUESTED_WORKSPACE_PATH" != "$PWD" ]; then
  mkdir -p "$(dirname "$REQUESTED_WORKSPACE_PATH")"
  ln -sfn "$PWD" "$REQUESTED_WORKSPACE_PATH"
fi

if ! [ -x "$HOME/.opencode/bin/opencode" ]; then
  curl -fsSL https://opencode.ai/install | bash
fi

export PATH="$HOME/.opencode/bin:$PATH"

if [ -n "$REQUESTED_BRANCH" ]; then
  CURRENT_BRANCH="$(git branch --show-current || true)"
  if [ "$CURRENT_BRANCH" != "$REQUESTED_BRANCH" ]; then
    if git rev-parse --verify --quiet "$REQUESTED_BRANCH" >/dev/null; then
      git checkout "$REQUESTED_BRANCH"
    else
      echo "Baseline branch mismatch: snapshot is on ${input.baselineBranch} and local branch $REQUESTED_BRANCH is not available. Create a fresh sandbox for a new branch." >&2
      exit 1
    fi

    if [ -f package.json ]; then
      corepack enable >/dev/null 2>&1 || true

      if [ -f pnpm-lock.yaml ]; then
        pnpm install --frozen-lockfile=false
      elif [ -f bun.lock ] || [ -f bun.lockb ]; then
        bun install
      elif [ -f yarn.lock ]; then
        yarn install
      elif [ -f package-lock.json ]; then
        npm install
      fi
    fi
  fi
fi
`,
  });

  return {
    exitCode: command.exitCode,
    stderr: await command.stderr(),
    stdout: await command.stdout(),
  };
}

async function startOpenCodeServer(sandboxId: string) {
  const sandbox = await Sandbox.get({ sandboxId });
  const password = crypto.randomUUID();

  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      `OPENCODE_SERVER_PASSWORD="${password}" nohup ${OPENCODE_BIN} serve --hostname 0.0.0.0 --port ${OPENCODE_PORT} > /tmp/opencode.log 2>&1 &`,
    ],
  });

  await sleep(SERVER_STARTUP_DELAY_MS);

  const url = sandbox.domain(OPENCODE_PORT);
  const auth = Buffer.from(`${OPENCODE_USERNAME}:${password}`).toString(
    "base64",
  );
  const response = await fetch(`${url}/global/health`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OpenCode health check failed with status ${response.status}.`,
    );
  }

  const attach = {
    username: OPENCODE_USERNAME,
    url,
    password,
    attachCommand: `OPENCODE_SERVER_PASSWORD=${password} opencode attach ${url}`,
    startedAt: now(),
  } satisfies RepoSandboxAttach;

  await updateSandboxAttachMetadata({
    sandboxId,
    attach,
  });

  return attach;
}

function mergeSandboxSummary(input: {
  metadata: RepoSandboxMetadata | null;
  raw: SandboxListResult["sandboxes"][number];
  snapshotMetadata: RepoSnapshotMetadata | null;
}) {
  const metadata = input.metadata ?? null;
  const fallbackRepoName =
    metadata?.name ??
    input.snapshotMetadata?.name ??
    inferRepoNameFromSandbox(input.raw);
  const fallbackRepo =
    metadata?.repo ?? input.snapshotMetadata?.repo ?? fallbackRepoName;
  const fallbackRepoKey =
    metadata?.repoKey ?? input.snapshotMetadata?.repoKey ?? "";
  const fallbackRepoUrl =
    metadata?.repoUrl ?? input.snapshotMetadata?.repoUrl ?? "";
  const fallbackBranch =
    metadata?.branch ?? input.snapshotMetadata?.branch ?? "unknown";
  const fallbackWorkspacePath =
    metadata?.workspacePath ?? input.raw.cwd ?? `/${fallbackRepoName}`;

  return {
    ...input.raw,
    name: fallbackRepoName,
    repo: fallbackRepo,
    repoKey: fallbackRepoKey,
    repoUrl: fallbackRepoUrl,
    branch: fallbackBranch,
    workspacePath: fallbackWorkspacePath,
    attach: metadata?.attach ?? null,
    isManaged: metadata !== null || input.snapshotMetadata !== null,
  } satisfies RepoSandboxSummary;
}

function mergeSnapshotSummary(input: {
  baselineBySnapshotId: Map<string, RepoBaselineRecord>;
  metadata: RepoSnapshotMetadata | null;
  raw: SandboxListResult["snapshots"][number];
  sourceSandboxMetadata: RepoSandboxMetadata | null;
}) {
  const metadata = input.metadata ?? null;
  const fallbackName =
    metadata?.name ?? input.sourceSandboxMetadata?.name ?? input.raw.snapshotId;
  const fallbackRepo =
    metadata?.repo ?? input.sourceSandboxMetadata?.repo ?? fallbackName;
  const fallbackRepoKey =
    metadata?.repoKey ?? input.sourceSandboxMetadata?.repoKey ?? "";
  const fallbackRepoUrl =
    metadata?.repoUrl ?? input.sourceSandboxMetadata?.repoUrl ?? "";
  const fallbackBranch =
    metadata?.branch ?? input.sourceSandboxMetadata?.branch ?? "unknown";
  const fallbackWorkspacePath =
    metadata?.workspacePath ??
    input.sourceSandboxMetadata?.workspacePath ??
    `/${fallbackName}`;

  return {
    ...input.raw,
    name: fallbackName,
    repo: fallbackRepo,
    repoKey: fallbackRepoKey,
    repoUrl: fallbackRepoUrl,
    branch: fallbackBranch,
    workspacePath: fallbackWorkspacePath,
    isCurrentBaseline: input.baselineBySnapshotId.has(input.raw.snapshotId),
    isManaged: metadata !== null || input.sourceSandboxMetadata !== null,
  } satisfies RepoSnapshotSummary;
}

function createBaselineRecord(input: {
  branch: string;
  createdAt: string;
  installationId: number | null;
  name: string;
  repo: string;
  repoKey: string;
  repoUrl: string;
  snapshotId: string;
  workspacePath: string;
}): RepoBaselineRecord {
  return {
    baselineKey: buildRepoBaselineKey({
      repoKey: input.repoKey,
      branch: input.branch,
    }),
    repoKey: input.repoKey,
    name: input.name,
    repo: input.repo,
    repoUrl: input.repoUrl,
    branch: input.branch,
    workspacePath: input.workspacePath,
    installationId: input.installationId,
    snapshotId: input.snapshotId,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

async function findSandboxSummary(sandboxId: string) {
  const inventory = await getRepoSandboxInventory();
  return (
    inventory.sandboxes.find((item) => item.sandboxId === sandboxId) ?? null
  );
}

async function findSnapshotSummary(snapshotId: string) {
  const inventory = await getRepoSandboxInventory();
  return (
    inventory.snapshots.find((item) => item.snapshotId === snapshotId) ?? null
  );
}

export async function getRepoSandboxInventory(): Promise<RepoSandboxInventory> {
  const rawInventory = await listRawInventory();

  await pruneRepoSandboxState({
    sandboxIds: rawInventory.sandboxes.map((item) => item.sandboxId),
    snapshotIds: rawInventory.snapshots.map((item) => item.snapshotId),
  });

  const state = await readRepoSandboxState();
  const sandboxMetadataById = new Map(
    state.sandboxes.map((item) => [item.sandboxId, item]),
  );
  const snapshotMetadataById = new Map(
    state.snapshots.map((item) => [item.snapshotId, item]),
  );
  const baselineBySnapshotId = new Map(
    state.baselines.map((item) => [item.snapshotId, item]),
  );

  const sandboxes = rawInventory.sandboxes.map((raw) =>
    mergeSandboxSummary({
      raw,
      metadata: sandboxMetadataById.get(raw.sandboxId) ?? null,
      snapshotMetadata:
        raw.sourceSnapshotId !== null
          ? (snapshotMetadataById.get(raw.sourceSnapshotId) ?? null)
          : null,
    }),
  );

  const sandboxesById = new Map(
    sandboxes.map((item) => [
      item.sandboxId,
      sandboxMetadataById.get(item.sandboxId) ?? null,
    ]),
  );

  const snapshots = rawInventory.snapshots.map((raw) =>
    mergeSnapshotSummary({
      raw,
      baselineBySnapshotId,
      metadata: snapshotMetadataById.get(raw.snapshotId) ?? null,
      sourceSandboxMetadata: sandboxesById.get(raw.sourceSandboxId) ?? null,
    }),
  );

  return {
    sandboxes,
    snapshots,
    latestSnapshot: snapshots[0] ?? null,
    error: rawInventory.error,
  };
}

export async function stopRepoSandbox(
  sandboxId: string,
): Promise<StopSandboxResult> {
  return stopRawSandbox(sandboxId);
}

export async function executeRepoSandboxCommand(
  input: RepoSandboxCommandInput,
) {
  return executeRawCommand(input);
}

export async function createRepoSnapshot(
  sandboxId: string,
): Promise<CreateSnapshotResult> {
  const result = await createRawSnapshot(sandboxId);

  if (result.error || !result.snapshotId) {
    return result;
  }

  const sandboxMetadata = await getSandboxMetadata(sandboxId);
  const sandboxSummary = await findSandboxSummary(sandboxId);

  if (!sandboxMetadata && !sandboxSummary) {
    return result;
  }

  const source = sandboxMetadata ?? sandboxSummary;

  if (!source || !source.repoKey || !source.repoUrl) {
    return result;
  }

  const createdAt = now();

  await upsertSnapshotMetadata({
    snapshotId: result.snapshotId,
    name: source.name,
    repo: source.repo,
    repoKey: source.repoKey,
    repoUrl: source.repoUrl,
    branch: source.branch,
    workspacePath: source.workspacePath,
    sourceSandboxId: sandboxId,
    createdAt,
    updatedAt: createdAt,
  });

  await setRepoBaseline({
    ...createBaselineRecord({
      repoKey: source.repoKey,
      name: source.name,
      repo: source.repo,
      repoUrl: source.repoUrl,
      branch: source.branch,
      workspacePath: source.workspacePath,
      installationId: sandboxMetadata?.installationId ?? null,
      snapshotId: result.snapshotId,
      createdAt,
    }),
  });

  return result;
}

export async function deleteRepoSnapshot(
  snapshotId: string,
): Promise<DeleteSnapshotResult> {
  const metadata = await getSnapshotMetadata(snapshotId);
  const result = await deleteRawSnapshot(snapshotId);

  if (!result.error) {
    await removeSnapshotMetadata(snapshotId);

    if (metadata?.repoKey) {
      const baseline = await getRepoBaseline(
        buildRepoBaselineKey({
          repoKey: metadata.repoKey,
          branch: metadata.branch,
        }),
      );

      if (baseline?.snapshotId === snapshotId) {
        await clearRepoBaseline(baseline.baselineKey);
      }
    }
  }

  return result;
}

export async function restoreRepoSnapshot(
  snapshotId: string,
): Promise<RestoreRepoSnapshotResult> {
  const snapshotMetadata = await getSnapshotMetadata(snapshotId);

  if (!snapshotMetadata) {
    return {
      sandbox: null,
      error:
        "Snapshot metadata is missing. Recreate the baseline from the repository first.",
    };
  }

  try {
    const sandbox = await Sandbox.create({
      source: {
        type: "snapshot",
        snapshotId,
      },
      timeout: SANDBOX_TIMEOUT_MS,
      resources: {
        vcpus: SANDBOX_VCPUS,
      },
      ports: PREVIEW_PORTS,
    });

    const createdAt = now();

    await upsertSandboxMetadata({
      sandboxId: sandbox.sandboxId,
      name: snapshotMetadata.name,
      repo: snapshotMetadata.repo,
      repoKey: snapshotMetadata.repoKey,
      repoUrl: snapshotMetadata.repoUrl,
      branch: snapshotMetadata.branch,
      workspacePath: snapshotMetadata.workspacePath,
      installationId: null,
      sourceSnapshotId: snapshotId,
      attach: null,
      createdAt,
      updatedAt: createdAt,
    });

    return {
      sandbox: await findSandboxSummary(sandbox.sandboxId),
      error: null,
    };
  } catch (error) {
    return {
      sandbox: null,
      error:
        error instanceof Error ? error.message : "Failed to restore snapshot.",
    };
  }
}

export async function startRepoSandboxHandoff(
  sandboxId: string,
): Promise<StartSandboxHandoffResult> {
  try {
    const attach = await startOpenCodeServer(sandboxId);

    return {
      sandboxId,
      attach,
      error: null,
    };
  } catch (error) {
    return {
      sandboxId,
      attach: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start the OpenCode handoff.",
    };
  }
}

export async function createRepoSandbox(
  input: RepoBootstrapInput,
): Promise<RepoBootstrapResult> {
  const parsedRepo = parseRepoUrl(input.repoUrl);
  const branch = input.branch?.trim() || "main";
  const baselineKey = buildRepoBaselineKey({
    repoKey: parsedRepo.key,
    branch,
  });

  if (!parsedRepo.isValid) {
    return {
      attach: null,
      failedStep: "validation",
      restoredFromSnapshot: false,
      sandbox: null,
      snapshot: null,
      error: "A valid GitHub repository URL is required.",
    };
  }

  const workspacePath =
    input.workspacePath?.trim() || `/workspace/${parsedRepo.name}`;

  try {
    const baseline = await getRepoBaseline(baselineKey);
    const installationId = resolveInstallationId(
      input.installationId ?? baseline?.installationId ?? null,
    );
    const gitSource = installationId
      ? {
          type: "git" as const,
          url: parsedRepo.url,
          revision: branch,
          username: "x-access-token",
          password: await mintInstallationToken(installationId),
        }
      : {
          type: "git" as const,
          url: parsedRepo.url,
          revision: branch,
        };
    const sandbox = baseline
      ? await Sandbox.create({
          source: {
            type: "snapshot",
            snapshotId: baseline.snapshotId,
          },
          timeout: SANDBOX_TIMEOUT_MS,
          resources: {
            vcpus: SANDBOX_VCPUS,
          },
          ports: PREVIEW_PORTS,
        })
      : await Sandbox.create({
          source: gitSource,
          runtime: "node24",
          timeout: SANDBOX_TIMEOUT_MS,
          resources: {
            vcpus: SANDBOX_VCPUS,
          },
          ports: PREVIEW_PORTS,
        });

    const cwd = await resolveSandboxCwd(sandbox);
    const provisionResult = baseline
      ? await prepareRestoredRepoSandbox({
          sandbox,
          cwd,
          branch,
          baselineBranch: baseline.branch,
          workspacePath,
        })
      : await provisionFreshRepoSandbox({
          sandbox,
          cwd,
          branch,
          workspacePath,
        });

    if (provisionResult.exitCode !== 0) {
      return {
        attach: null,
        failedStep: "provision",
        restoredFromSnapshot: baseline !== null,
        sandbox: null,
        snapshot: null,
        error:
          provisionResult.stderr ||
          provisionResult.stdout ||
          "Provisioning failed.",
      };
    }

    const createdAt = now();

    await upsertSandboxMetadata({
      sandboxId: sandbox.sandboxId,
      name: parsedRepo.name,
      repo: parsedRepo.full,
      repoKey: parsedRepo.key,
      repoUrl: parsedRepo.url,
      branch,
      workspacePath,
      installationId,
      sourceSnapshotId: sandbox.sourceSnapshotId ?? null,
      attach: null,
      createdAt,
      updatedAt: createdAt,
    });

    let snapshot: RepoSnapshotSummary | null = null;

    if (!baseline) {
      const createdSnapshot = await createRawSnapshot(sandbox.sandboxId);

      if (createdSnapshot.error || !createdSnapshot.snapshotId) {
        return {
          attach: null,
          failedStep: "snapshot",
          restoredFromSnapshot: false,
          sandbox: await findSandboxSummary(sandbox.sandboxId),
          snapshot: null,
          error:
            createdSnapshot.error ?? "Failed to create the baseline snapshot.",
        };
      }

      await upsertSnapshotMetadata({
        snapshotId: createdSnapshot.snapshotId,
        name: parsedRepo.name,
        repo: parsedRepo.full,
        repoKey: parsedRepo.key,
        repoUrl: parsedRepo.url,
        branch,
        workspacePath,
        sourceSandboxId: sandbox.sandboxId,
        createdAt,
        updatedAt: createdAt,
      });

      await setRepoBaseline({
        ...createBaselineRecord({
          repoKey: parsedRepo.key,
          name: parsedRepo.name,
          repo: parsedRepo.full,
          repoUrl: parsedRepo.url,
          branch,
          workspacePath,
          installationId,
          snapshotId: createdSnapshot.snapshotId,
          createdAt,
        }),
      });

      snapshot = await findSnapshotSummary(createdSnapshot.snapshotId);
    } else {
      snapshot = await findSnapshotSummary(baseline.snapshotId);
    }

    const attach = await startOpenCodeServer(sandbox.sandboxId);

    return {
      attach,
      failedStep: null,
      restoredFromSnapshot: baseline !== null,
      sandbox: await findSandboxSummary(sandbox.sandboxId),
      snapshot,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create sandbox.";

    return {
      attach: null,
      failedStep: message.toLowerCase().includes("token")
        ? "token"
        : "createSandbox",
      restoredFromSnapshot: false,
      sandbox: null,
      snapshot: null,
      error: message,
    };
  }
}
