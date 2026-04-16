export type SandboxSummary = {
  sandboxId: string;
  status: string;
  runtime: string;
  cwd: string;
  region: string;
  vcpus: number;
  memoryMb: number;
  timeoutMs: number;
  interactivePort: number | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  sourceSnapshotId: string | null;
  snapshottedAt: string | null;
};

export type SnapshotSummary = {
  snapshotId: string;
  status: string;
  sourceSandboxId: string;
  region: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

export type SandboxListResult = {
  sandboxes: SandboxSummary[];
  snapshots: SnapshotSummary[];
  latestSnapshot: SnapshotSummary | null;
  error: string | null;
};

export type ExecuteSandboxCommandInput = {
  sandboxId: string;
  command: string;
  args?: string[];
  cwd?: string;
};

export type ExecuteSandboxCommandResult = {
  sandboxId: string;
  command: string;
  args: string[];
  cwd: string | null;
  exitCode: number;
  stdout: string;
  stderr: string;
  executedAt: string;
  error: string | null;
};

export type CreateSandboxResult = {
  sandboxId: string | null;
  sourceSnapshotId: string | null;
  restoredFromSnapshot: boolean;
  error: string | null;
};

export type CreateSnapshotResult = {
  sandboxId: string;
  snapshotId: string | null;
  expiresAt: string | null;
  error: string | null;
};

export type StopSandboxResult = {
  sandboxId: string;
  status: string | null;
  error: string | null;
};

export type DeleteSnapshotResult = {
  snapshotId: string;
  error: string | null;
};
