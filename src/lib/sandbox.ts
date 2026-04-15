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
};

export type SandboxListResult = {
  sandboxes: SandboxSummary[];
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
  error: string | null;
};
