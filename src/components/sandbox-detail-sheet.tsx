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
  Square,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { executeRepoSandboxCommandAction } from "@/app/_actions/repo-sandbox";
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
import type { RepoSandboxAttach, RepoSandboxSummary } from "@/lib/repo-sandbox";
import { formatDuration } from "@/lib/sandbox-format";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type CommandResult = {
  command: string;
  stderr: string;
  exitCode: number;
  stdout: string;
};

export function SandboxDetailSheet({
  sandbox,
  open,
  onOpenChange,
  onSnapshot,
  onStartHandoff,
  onStop,
}: {
  sandbox: RepoSandboxSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnapshot: (sandboxId: string) => Promise<{
    error: string | null;
    snapshotId: string | null;
  }>;
  onStartHandoff: (sandboxId: string) => Promise<{
    attach: RepoSandboxAttach | null;
    error: string | null;
  }>;
  onStop: (sandboxId: string) => Promise<{ error: string | null }>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {sandbox ? (
          <SandboxDetailContent
            key={sandbox.sandboxId}
            sandbox={sandbox}
            onSnapshot={onSnapshot}
            onStartHandoff={onStartHandoff}
            onStop={onStop}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SandboxDetailContent({
  sandbox,
  onSnapshot,
  onStartHandoff,
  onStop,
}: {
  sandbox: RepoSandboxSummary;
  onSnapshot: (sandboxId: string) => Promise<{
    error: string | null;
    snapshotId: string | null;
  }>;
  onStartHandoff: (sandboxId: string) => Promise<{
    attach: RepoSandboxAttach | null;
    error: string | null;
  }>;
  onStop: (sandboxId: string) => Promise<{ error: string | null }>;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"error" | "success">("success");

  const isRunning = sandbox.status === "running";
  const attach = sandbox.attach;

  const handleSnapshot = async () => {
    setSnapshotBusy(true);
    const result = await onSnapshot(sandbox.sandboxId);
    setSnapshotBusy(false);
    setNoticeTone(result.error ? "error" : "success");
    setNotice(result.error ?? "Snapshot saved as the latest baseline.");
  };

  const handleStartHandoff = async () => {
    setHandoffBusy(true);
    const result = await onStartHandoff(sandbox.sandboxId);
    setHandoffBusy(false);
    setNoticeTone(result.error ? "error" : "success");
    setNotice(result.error ?? "OpenCode handoff started.");
  };

  const handleStop = async () => {
    setStopBusy(true);
    const result = await onStop(sandbox.sandboxId);
    setStopBusy(false);
    setNoticeTone(result.error ? "error" : "success");
    setNotice(result.error ?? "Sandbox stopped.");
  };

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
          {notice ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                noticeTone === "error"
                  ? "border-destructive/20 bg-destructive/6 text-destructive"
                  : "border-emerald-500/20 bg-emerald-500/8 text-emerald-800",
              )}
            >
              {notice}
            </div>
          ) : null}

          {isRunning ? (
            <section className="space-y-2">
              <SectionLabel>OpenCode</SectionLabel>
              {attach ? (
                <div className="space-y-2">
                  <CopyField
                    label="Attach command"
                    value={attach.attachCommand}
                  />
                  <CopyField label="Server URL" value={attach.url} />
                  <CopyField label="Username" value={attach.username} />
                  <CopyField label="Password" value={attach.password} />
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    OpenCode handoff not started yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start the server to get the attach command for this sandbox.
                  </p>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleStartHandoff}
                    disabled={handoffBusy}
                    className="mt-3"
                  >
                    {handoffBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    Start OpenCode handoff
                  </Button>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-xl border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Sandbox is stopped
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This first iteration does not resume stopped sandboxes. Restore
                from the latest snapshot or create a new sandbox instead.
              </p>
            </section>
          )}

          {isRunning ? (
            <section className="space-y-2">
              <SectionLabel>Actions</SectionLabel>

              <Collapsible open={commandOpen} onOpenChange={setCommandOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
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
                  <CommandRunner
                    sandboxId={sandbox.sandboxId}
                    cwd={sandbox.cwd}
                  />
                </CollapsibleContent>
              </Collapsible>

              <button
                type="button"
                onClick={handleSnapshot}
                disabled={snapshotBusy}
                className="group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    {snapshotBusy ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Archive className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {snapshotBusy ? "Saving snapshot..." : "Save as snapshot"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create a reusable restore point
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleStop}
                disabled={stopBusy}
                className="group flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    {stopBusy ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stop sandbox</p>
                    <p className="text-xs text-muted-foreground">
                      Frees resources but keeps the record and baseline
                    </p>
                  </div>
                </div>
              </button>
            </section>
          ) : null}

          <section className="space-y-2">
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
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
                      detailsOpen && "rotate-180",
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
    </>
  );
}

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

function CommandRunner({ sandboxId, cwd }: { sandboxId: string; cwd: string }) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const trimmed = command.trim();

    if (!trimmed) {
      return;
    }

    const [binary, ...args] = trimmed.split(/\s+/);
    setBusy(true);

    const result = await executeRepoSandboxCommandAction({
      sandboxId,
      command: binary,
      args,
      cwd,
    });

    setHistory((previous) => [
      {
        command: trimmed,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
      ...previous,
    ]);

    if (!result.error) {
      setCommand("");
    }

    setBusy(false);
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
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void run();
              }
            }}
            placeholder="ls -la"
            className="pl-6 font-mono text-sm"
          />
        </div>
        <Button type="button" onClick={run} disabled={busy || !command.trim()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Run"}
        </Button>
      </div>

      {history.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {history.map((item) => (
            <div
              key={`${item.command}-${item.stdout}-${item.stderr}-${item.exitCode}`}
              className="rounded-md bg-zinc-950 p-2.5 font-mono text-xs text-zinc-200 animate-in fade-in slide-in-from-top-1"
            >
              <div className="text-zinc-500">$ {item.command}</div>
              {item.stdout ? (
                <pre className="mt-1 whitespace-pre-wrap break-words">
                  {item.stdout}
                </pre>
              ) : null}
              {item.stderr ? (
                <pre className="mt-1 whitespace-pre-wrap break-words text-rose-300">
                  {item.stderr}
                </pre>
              ) : null}
              <div className="mt-1 text-zinc-500">exit {item.exitCode}</div>
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
