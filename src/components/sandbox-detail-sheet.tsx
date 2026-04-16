"use client";

import {
  Archive,
  ChevronDown,
  Clock,
  Cpu,
  GitBranch,
  Globe,
  HardDrive,
  Loader2,
  Play,
  Sparkles,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CopyField } from "@/components/shared/copy-field";
import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createSnapshot,
  deleteSandbox,
  resumeSandbox,
  stopSandbox,
  type MockSandbox,
} from "@/lib/mock-store";
import { formatDuration } from "@/lib/sandbox-format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export function SandboxDetailSheet({
  sandbox,
  open,
  onOpenChange,
}: {
  sandbox: MockSandbox | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {sandbox ? (
          <SandboxDetailContent
            sandbox={sandbox}
            onAfterAction={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SandboxDetailContent({
  sandbox,
  onAfterAction,
}: {
  sandbox: MockSandbox;
  onAfterAction: () => void;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotDone, setSnapshotDone] = useState(false);

  // Reset state when a different sandbox is opened
  useEffect(() => {
    setCommandOpen(false);
    setAdvancedOpen(false);
    setSnapshotBusy(false);
    setSnapshotDone(false);
  }, [sandbox.sandboxId]);

  const isRunning = sandbox.status === "running";

  const handleSnapshot = () => {
    setSnapshotBusy(true);
    // Simulate saving
    setTimeout(() => {
      createSnapshot(sandbox.sandboxId);
      setSnapshotBusy(false);
      setSnapshotDone(true);
      setTimeout(() => setSnapshotDone(false), 2000);
    }, 900);
  };

  const handleStop = () => {
    stopSandbox(sandbox.sandboxId);
  };

  const handleResume = () => {
    resumeSandbox(sandbox.sandboxId);
  };

  const handleDelete = () => {
    deleteSandbox(sandbox.sandboxId);
    onAfterAction();
  };

  const sshUrl = `ssh sandbox@${sandbox.sandboxId.slice(4, 16)}.sandbox.vercel.run`;
  const previewUrl = sandbox.interactivePort
    ? `https://${sandbox.sandboxId.slice(4, 16)}-${sandbox.interactivePort}.sandbox.vercel.run`
    : null;

  return (
    <>
      <SheetHeader className="gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <StatusDot status={sandbox.status} />
          <span className="text-xs font-medium capitalize text-muted-foreground">
            {sandbox.status}
          </span>
        </div>
        <div className="space-y-1">
          <SheetTitle className="flex items-center gap-2 font-heading text-lg">
            <GitBranch className="size-4 text-muted-foreground" />
            {sandbox.repo}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {sandbox.branch}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono">{sandbox.sandboxId}</span>
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-5">
          {/* Connection */}
          {isRunning ? (
            <section className="space-y-2">
              <SectionLabel>Connection</SectionLabel>
              <div className="space-y-2">
                <CopyField label="Sandbox ID" value={sandbox.sandboxId} />
                <CopyField label="SSH" value={sshUrl} />
                {previewUrl ? (
                  <CopyField label="Preview URL" value={previewUrl} />
                ) : null}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Sandbox is stopped
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Resume it to get connection details and run commands.
              </p>
              <Button size="sm" onClick={handleResume} className="mt-3">
                <Play className="size-3.5" />
                Resume sandbox
              </Button>
            </section>
          )}

          {/* Primary actions */}
          {isRunning ? (
            <section className="space-y-2">
              <SectionLabel>Actions</SectionLabel>

              {/* Run command */}
              <Collapsible open={commandOpen} onOpenChange={setCommandOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/60",
                      commandOpen && "bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Terminal className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Run a command</p>
                        <p className="text-xs text-muted-foreground">
                          Execute inside the sandbox shell
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        commandOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1">
                  <CommandRunner cwd={sandbox.cwd} />
                </CollapsibleContent>
              </Collapsible>

              {/* Save snapshot */}
              <button
                onClick={handleSnapshot}
                disabled={snapshotBusy}
                className="group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    {snapshotBusy ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : snapshotDone ? (
                      <Sparkles className="size-4 text-emerald-600" />
                    ) : (
                      <Archive className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {snapshotDone
                        ? "Snapshot saved"
                        : snapshotBusy
                          ? "Saving snapshot..."
                          : "Save as snapshot"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {snapshotDone
                        ? "Available on the snapshots page"
                        : "Create a reusable restore point"}
                    </p>
                  </div>
                </div>
              </button>

              {/* Stop */}
              <button
                onClick={handleStop}
                className="group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    <Square className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stop sandbox</p>
                    <p className="text-xs text-muted-foreground">
                      Frees resources, keeps the sandbox
                    </p>
                  </div>
                </div>
              </button>
            </section>
          ) : null}

          {/* Advanced */}
          <section className="space-y-2">
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors",
                    "hover:bg-muted/60",
                  )}
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Details
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      advancedOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <DetailItem
                    icon={<Cpu className="size-3.5" />}
                    label="Resources"
                    value={`${sandbox.vcpus} vCPU · ${Math.round(
                      sandbox.memoryMb / 1024,
                    )} GB`}
                  />
                  <DetailItem
                    icon={<Globe className="size-3.5" />}
                    label="Region"
                    value={sandbox.region.toUpperCase()}
                  />
                  <DetailItem
                    icon={<HardDrive className="size-3.5" />}
                    label="Runtime"
                    value={sandbox.runtime}
                  />
                  <DetailItem
                    icon={<Clock className="size-3.5" />}
                    label="Timeout"
                    value={formatDuration(sandbox.timeoutMs)}
                  />
                  <DetailItem
                    icon={<Clock className="size-3.5" />}
                    label="Created"
                    value={timeAgo(sandbox.createdAt)}
                  />
                  <DetailItem
                    icon={<Clock className="size-3.5" />}
                    label="Updated"
                    value={timeAgo(sandbox.updatedAt)}
                  />
                </div>

                {sandbox.sourceSnapshotId ? (
                  <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Restored from
                    </p>
                    <p className="mt-1 break-all font-mono text-xs">
                      {sandbox.sourceSnapshotId}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Working directory
                  </p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {sandbox.cwd}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          variant="ghost"
          onClick={handleDelete}
          className="w-full text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete sandbox
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

type CommandResult = {
  command: string;
  stdout: string;
  exitCode: number;
};

const MOCK_COMMAND_RESPONSES: Record<string, string> = {
  "ls -la":
    "drwxr-xr-x  12 sandbox sandbox  4096 Apr 16 15:22 .\ndrwxr-xr-x   3 sandbox sandbox  4096 Apr 16 15:20 ..\n-rw-r--r--   1 sandbox sandbox   220 Apr 16 15:20 .env\ndrwxr-xr-x   9 sandbox sandbox  4096 Apr 16 15:22 node_modules\n-rw-r--r--   1 sandbox sandbox  1823 Apr 16 15:20 package.json\ndrwxr-xr-x   4 sandbox sandbox  4096 Apr 16 15:20 src",
  "pnpm --version": "10.33.0",
  "node --version": "v22.5.0",
  "git status":
    "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean",
};

function CommandRunner({ cwd }: { cwd: string }) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = () => {
    const trimmed = command.trim();
    if (!trimmed) return;
    setBusy(true);
    setTimeout(() => {
      const stdout =
        MOCK_COMMAND_RESPONSES[trimmed] ||
        `$ ${trimmed}\n(executed in ${cwd})\nCompleted in 0.${Math.floor(
          Math.random() * 900 + 100,
        )}s`;
      setHistory((prev) => [
        { command: trimmed, stdout, exitCode: 0 },
        ...prev,
      ]);
      setCommand("");
      setBusy(false);
    }, 500);
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
            $
          </span>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="ls -la"
            className="pl-6 font-mono text-sm"
          />
        </div>
        <Button onClick={run} disabled={busy || !command.trim()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Run"}
        </Button>
      </div>

      {history.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {history.map((item, i) => (
            <div
              key={i}
              className="rounded-md bg-zinc-950 p-2.5 font-mono text-xs text-zinc-200 animate-in fade-in slide-in-from-top-1"
            >
              <div className="text-zinc-500">$ {item.command}</div>
              <pre className="mt-1 whitespace-pre-wrap break-words">
                {item.stdout}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          Try <code className="font-mono">ls -la</code>,{" "}
          <code className="font-mono">pnpm --version</code>, or{" "}
          <code className="font-mono">git status</code>
        </p>
      )}
    </div>
  );
}
