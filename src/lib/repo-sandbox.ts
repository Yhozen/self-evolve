import type {
  ExecuteSandboxCommandInput,
  ExecuteSandboxCommandResult,
  SandboxSummary,
  SnapshotSummary,
} from "@/lib/sandbox";

export type ParsedRepoUrl = {
  owner: string;
  name: string;
  full: string;
  key: string;
  url: string;
  isValid: boolean;
};

export type RepoSandboxAttach = {
  username: string;
  url: string;
  password: string;
  attachCommand: string;
  startedAt: string;
};

export type RepoSandboxMetadata = {
  sandboxId: string;
  name: string;
  repo: string;
  repoKey: string;
  repoUrl: string;
  branch: string;
  workspacePath: string;
  installationId: number | null;
  sourceSnapshotId: string | null;
  attach: RepoSandboxAttach | null;
  createdAt: string;
  updatedAt: string;
};

export type RepoSnapshotMetadata = {
  snapshotId: string;
  name: string;
  repo: string;
  repoKey: string;
  repoUrl: string;
  branch: string;
  workspacePath: string;
  sourceSandboxId: string;
  createdAt: string;
  updatedAt: string;
};

export type RepoBaselineRecord = {
  baselineKey: string;
  repoKey: string;
  name: string;
  repo: string;
  repoUrl: string;
  branch: string;
  workspacePath: string;
  installationId: number | null;
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
};

export type RepoSandboxState = {
  baselines: RepoBaselineRecord[];
  sandboxes: RepoSandboxMetadata[];
  snapshots: RepoSnapshotMetadata[];
};

export type RepoSandboxSummary = SandboxSummary & {
  name: string;
  repo: string;
  repoKey: string;
  repoUrl: string;
  branch: string;
  workspacePath: string;
  attach: RepoSandboxAttach | null;
  isManaged: boolean;
};

export type RepoSnapshotSummary = SnapshotSummary & {
  name: string;
  repo: string;
  repoKey: string;
  repoUrl: string;
  branch: string;
  workspacePath: string;
  isCurrentBaseline: boolean;
  isManaged: boolean;
};

export type RepoSandboxInventory = {
  sandboxes: RepoSandboxSummary[];
  snapshots: RepoSnapshotSummary[];
  latestSnapshot: RepoSnapshotSummary | null;
  error: string | null;
};

export type RestoreRepoSnapshotResult = {
  sandbox: RepoSandboxSummary | null;
  error: string | null;
};

export type RepoBootstrapInput = {
  branch?: string;
  installationId?: number | null;
  repoUrl: string;
  workspacePath?: string;
};

export type RepoBootstrapResult = {
  attach: RepoSandboxAttach | null;
  failedStep:
    | "validation"
    | "token"
    | "createSandbox"
    | "provision"
    | "handoff"
    | "snapshot"
    | "baseline"
    | null;
  restoredFromSnapshot: boolean;
  sandbox: RepoSandboxSummary | null;
  snapshot: RepoSnapshotSummary | null;
  error: string | null;
};

export type StartSandboxHandoffResult = {
  attach: RepoSandboxAttach | null;
  sandboxId: string;
  error: string | null;
};

export type RepoSandboxCommandInput = ExecuteSandboxCommandInput;

export type RepoSandboxCommandResult = ExecuteSandboxCommandResult;

export function buildRepoBaselineKey(input: {
  branch: string;
  repoKey: string;
}) {
  return `${input.repoKey}#${input.branch.toLowerCase()}`;
}

export function parseRepoUrl(url: string): ParsedRepoUrl {
  const trimmed = url.trim();

  if (!trimmed) {
    return {
      owner: "",
      name: "",
      full: "",
      key: "",
      url: "",
      isValid: false,
    };
  }

  const patterns = [
    /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
    /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);

    if (!match) {
      continue;
    }

    const owner = match[1];
    const name = match[2];
    const full = `${owner}/${name}`;

    return {
      owner,
      name,
      full,
      key: `github.com/${full}`,
      url: `https://github.com/${full}.git`,
      isValid: true,
    };
  }

  return {
    owner: "",
    name: "",
    full: "",
    key: "",
    url: "",
    isValid: false,
  };
}

export function inferRepoNameFromSandbox(sandbox: Pick<SandboxSummary, "cwd">) {
  const parts = sandbox.cwd.split("/").filter(Boolean);
  return parts.at(-1) ?? sandbox.cwd;
}

export function inferRepoNameFromSnapshot(
  snapshot: Pick<SnapshotSummary, "snapshotId">,
) {
  return snapshot.snapshotId;
}

export function filterManagedInventory(
  inventory: RepoSandboxInventory,
): RepoSandboxInventory {
  const sandboxes = inventory.sandboxes.filter((item) => item.isManaged);
  const snapshots = inventory.snapshots.filter((item) => item.isManaged);

  return {
    ...inventory,
    sandboxes,
    snapshots,
    latestSnapshot: snapshots[0] ?? null,
  };
}
