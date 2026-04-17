import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  RepoBaselineRecord,
  RepoSandboxMetadata,
  RepoSandboxState,
  RepoSnapshotMetadata,
} from "@/lib/repo-sandbox";

const DATA_DIRECTORY = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIRECTORY, "repo-sandbox-state.json");

const EMPTY_STATE: RepoSandboxState = {
  baselines: [],
  sandboxes: [],
  snapshots: [],
};

let mutationQueue = Promise.resolve();

async function ensureStateFile() {
  await mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await readFile(STATE_FILE, "utf8");
  } catch {
    await writeFile(STATE_FILE, JSON.stringify(EMPTY_STATE, null, 2), "utf8");
  }
}

async function readStateFile() {
  await ensureStateFile();

  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<RepoSandboxState>;

    return {
      baselines: Array.isArray(parsed.baselines) ? parsed.baselines : [],
      sandboxes: Array.isArray(parsed.sandboxes) ? parsed.sandboxes : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    } satisfies RepoSandboxState;
  } catch {
    return EMPTY_STATE;
  }
}

async function writeStateFile(state: RepoSandboxState) {
  await ensureStateFile();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function mutateState<T>(
  updater: (
    state: RepoSandboxState,
  ) => Promise<{ result: T; state: RepoSandboxState }>,
) {
  const run = mutationQueue.then(async () => {
    const current = await readStateFile();
    const next = await updater(current);
    await writeStateFile(next.state);
    return next.result;
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

export async function readRepoSandboxState() {
  return readStateFile();
}

export async function upsertSandboxMetadata(metadata: RepoSandboxMetadata) {
  return mutateState(async (state) => {
    const nextSandboxes = [
      metadata,
      ...state.sandboxes.filter(
        (item) => item.sandboxId !== metadata.sandboxId,
      ),
    ];

    return {
      result: metadata,
      state: {
        ...state,
        sandboxes: nextSandboxes,
      },
    };
  });
}

export async function removeSandboxMetadata(sandboxId: string) {
  return mutateState(async (state) => ({
    result: undefined,
    state: {
      ...state,
      sandboxes: state.sandboxes.filter((item) => item.sandboxId !== sandboxId),
    },
  }));
}

export async function getSandboxMetadata(sandboxId: string) {
  const state = await readStateFile();
  return state.sandboxes.find((item) => item.sandboxId === sandboxId) ?? null;
}

export async function upsertSnapshotMetadata(metadata: RepoSnapshotMetadata) {
  return mutateState(async (state) => {
    const nextSnapshots = [
      metadata,
      ...state.snapshots.filter(
        (item) => item.snapshotId !== metadata.snapshotId,
      ),
    ];

    return {
      result: metadata,
      state: {
        ...state,
        snapshots: nextSnapshots,
      },
    };
  });
}

export async function removeSnapshotMetadata(snapshotId: string) {
  return mutateState(async (state) => ({
    result: undefined,
    state: {
      ...state,
      baselines: state.baselines.filter(
        (item) => item.snapshotId !== snapshotId,
      ),
      snapshots: state.snapshots.filter(
        (item) => item.snapshotId !== snapshotId,
      ),
    },
  }));
}

export async function getSnapshotMetadata(snapshotId: string) {
  const state = await readStateFile();
  return state.snapshots.find((item) => item.snapshotId === snapshotId) ?? null;
}

export async function setRepoBaseline(record: RepoBaselineRecord) {
  return mutateState(async (state) => {
    const nextBaselines = [
      record,
      ...state.baselines.filter(
        (item) => item.baselineKey !== record.baselineKey,
      ),
    ];

    return {
      result: record,
      state: {
        ...state,
        baselines: nextBaselines,
      },
    };
  });
}

export async function getRepoBaseline(baselineKey: string) {
  const state = await readStateFile();
  return (
    state.baselines.find((item) => item.baselineKey === baselineKey) ?? null
  );
}

export async function clearRepoBaseline(baselineKey: string) {
  return mutateState(async (state) => ({
    result: undefined,
    state: {
      ...state,
      baselines: state.baselines.filter(
        (item) => item.baselineKey !== baselineKey,
      ),
    },
  }));
}

export async function updateSandboxAttachMetadata(input: {
  attach: RepoSandboxMetadata["attach"];
  sandboxId: string;
}) {
  return mutateState(async (state) => ({
    result: undefined,
    state: {
      ...state,
      sandboxes: state.sandboxes.map((item) =>
        item.sandboxId === input.sandboxId
          ? {
              ...item,
              attach: input.attach,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    },
  }));
}

export async function pruneRepoSandboxState(input: {
  sandboxIds: string[];
  snapshotIds: string[];
}) {
  return mutateState(async (state) => ({
    result: undefined,
    state: {
      baselines: state.baselines.filter((item) =>
        input.snapshotIds.includes(item.snapshotId),
      ),
      sandboxes: state.sandboxes.filter((item) =>
        input.sandboxIds.includes(item.sandboxId),
      ),
      snapshots: state.snapshots.filter((item) =>
        input.snapshotIds.includes(item.snapshotId),
      ),
    },
  }));
}
