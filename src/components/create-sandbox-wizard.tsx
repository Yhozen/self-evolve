"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  ExternalLink,
  Folder,
  GitBranch,
  Globe,
  Loader2,
  Sliders,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createRepoSandboxAction } from "@/app/_actions/repo-sandbox";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type {
  RepoBootstrapResult,
  RepoSandboxInventory,
  RepoSandboxSummary,
  RepoSnapshotSummary,
} from "@/lib/repo-sandbox";
import { parseRepoUrl } from "@/lib/repo-sandbox";
import { cn } from "@/lib/utils";

type Step = "repository" | "configure" | "review" | "done";

type StepConfig = {
  id: Step;
  label: string;
  number: number;
};

const STEPS: StepConfig[] = [
  { id: "repository", label: "Repository", number: 1 },
  { id: "configure", label: "Configure", number: 2 },
  { id: "review", label: "Review", number: 3 },
  { id: "done", label: "Done", number: 4 },
];

const RECENT_REPOS = [
  { owner: "vercel", name: "next.js" },
  { owner: "shadcn", name: "ui" },
  { owner: "Yhozen", name: "self-evolve" },
];

export function CreateSandboxWizard({
  initialInventory,
}: {
  initialInventory: RepoSandboxInventory;
}) {
  const router = useRouter();
  const [inventory, setInventory] = useState(initialInventory);
  const [currentStep, setCurrentStep] = useState<Step>("repository");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [workspacePath, setWorkspacePath] = useState("/workspace");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] =
    useState<RepoBootstrapResult | null>(null);

  const sandboxes = inventory.sandboxes;
  const snapshots = inventory.snapshots;
  const parsedRepo = useMemo(() => parseRepoUrl(repoUrl), [repoUrl]);

  const matchingSnapshot = useMemo(() => {
    if (!parsedRepo.isValid) {
      return null;
    }

    return (
      snapshots.find(
        (snapshot) =>
          snapshot.repo.toLowerCase() === parsedRepo.full.toLowerCase() &&
          snapshot.branch.toLowerCase() === selectedBranch.trim().toLowerCase(),
      ) ?? null
    );
  }, [parsedRepo, selectedBranch, snapshots]);

  const existingSandbox = useMemo(() => {
    if (!parsedRepo.isValid) {
      return null;
    }

    return (
      sandboxes.find(
        (sandbox) =>
          sandbox.repo.toLowerCase() === parsedRepo.full.toLowerCase() &&
          sandbox.branch.toLowerCase() === selectedBranch.trim().toLowerCase(),
      ) ?? null
    );
  }, [parsedRepo, sandboxes, selectedBranch]);

  const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);

  const goToStep = (step: Step) => {
    setCreateError(null);
    setCurrentStep(step);
  };

  const mergeInventory = (result: RepoBootstrapResult) => {
    setInventory((previous) => {
      const sandboxesNext = result.sandbox
        ? [
            result.sandbox,
            ...previous.sandboxes.filter(
              (item) => item.sandboxId !== result.sandbox?.sandboxId,
            ),
          ]
        : previous.sandboxes;
      const snapshotsNext = result.snapshot
        ? [
            result.snapshot,
            ...previous.snapshots.filter(
              (item) => item.snapshotId !== result.snapshot?.snapshotId,
            ),
          ]
        : previous.snapshots;

      return {
        ...previous,
        sandboxes: sandboxesNext,
        snapshots: snapshotsNext,
        latestSnapshot: result.snapshot ?? previous.latestSnapshot,
      };
    });
  };

  const handleContinue = async () => {
    if (currentStep === "repository" && parsedRepo.isValid) {
      setWorkspacePath(`/workspace/${parsedRepo.name}`);
      goToStep("configure");
      return;
    }

    if (currentStep === "configure") {
      goToStep("review");
      return;
    }

    if (currentStep === "review") {
      await handleCreate();
    }
  };

  const handleBack = () => {
    if (currentStep === "configure") {
      goToStep("repository");
      return;
    }

    if (currentStep === "review") {
      goToStep("configure");
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    setIsCreating(true);

    const result = await createRepoSandboxAction({
      repoUrl,
      branch: selectedBranch,
      workspacePath,
    });

    setIsCreating(false);

    if (result.error || !result.sandbox) {
      setCreateError(result.error ?? "Failed to create the sandbox.");
      return;
    }

    setCreatedResult(result);
    mergeInventory(result);
    goToStep("done");
  };

  const handleSelectRecentRepo = (owner: string, name: string) => {
    setRepoUrl(`https://github.com/${owner}/${name}`);
  };

  const handleReset = () => {
    setRepoUrl("");
    setSelectedBranch("main");
    setWorkspacePath("/workspace");
    setAdvancedOpen(false);
    setCreateError(null);
    setCreatedResult(null);
    goToStep("repository");
  };

  const handleOpenSandbox = () => {
    router.push("/sandboxes");
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 lg:px-8">
      <Link
        href="/sandboxes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Back to sandboxes
      </Link>

      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Create sandbox
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Turn any GitHub repository into a ready-to-use development environment
        </p>
      </div>

      <StepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div key={currentStep} className="animate-fade-in-up">
          {currentStep === "repository" ? (
            <RepositoryStep
              existingSandbox={existingSandbox}
              matchingSnapshot={matchingSnapshot}
              onContinue={() => void handleContinue()}
              onRepoUrlChange={setRepoUrl}
              onSelectRecent={handleSelectRecentRepo}
              parsedRepo={parsedRepo}
              repoUrl={repoUrl}
            />
          ) : null}

          {currentStep === "configure" ? (
            <ConfigureStep
              advancedOpen={advancedOpen}
              matchingSnapshot={matchingSnapshot}
              onAdvancedOpenChange={setAdvancedOpen}
              onBack={handleBack}
              onBranchChange={setSelectedBranch}
              onContinue={() => void handleContinue()}
              onWorkspacePathChange={setWorkspacePath}
              parsedRepo={parsedRepo}
              selectedBranch={selectedBranch}
              workspacePath={workspacePath}
            />
          ) : null}

          {currentStep === "review" ? (
            <ReviewStep
              createError={createError}
              isCreating={isCreating}
              matchingSnapshot={matchingSnapshot}
              onBack={handleBack}
              onContinue={() => void handleContinue()}
              parsedRepo={parsedRepo}
              selectedBranch={selectedBranch}
              workspacePath={workspacePath}
            />
          ) : null}

          {currentStep === "done" && createdResult?.sandbox ? (
            <DoneStep
              key={createdResult.sandbox.sandboxId}
              result={createdResult}
              sandbox={createdResult.sandbox}
              onCreateAnother={handleReset}
              onOpenSandbox={handleOpenSandbox}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StepIndicator({
  steps,
  currentStepIndex,
}: {
  steps: StepConfig[];
  currentStepIndex: number;
}) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  isCompleted && "bg-foreground text-background",
                  isCurrent &&
                    "bg-foreground text-background ring-4 ring-foreground/10",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mx-2 h-px w-6 transition-colors sm:mx-3 sm:w-8",
                  index < currentStepIndex ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RepositoryStep({
  existingSandbox,
  matchingSnapshot,
  onContinue,
  onRepoUrlChange,
  onSelectRecent,
  parsedRepo,
  repoUrl,
}: {
  existingSandbox: RepoSandboxSummary | null;
  matchingSnapshot: RepoSnapshotSummary | null;
  onContinue: () => void;
  onRepoUrlChange: (url: string) => void;
  onSelectRecent: (owner: string, name: string) => void;
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  repoUrl: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Add your repository
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a GitHub URL and we&apos;ll set up a sandbox for you
        </p>
      </div>

      <div className="space-y-3">
        <Input
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(event) => onRepoUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && parsedRepo.isValid) {
              onContinue();
            }
          }}
          className="h-11 text-base"
          autoFocus
        />

        {parsedRepo.isValid && matchingSnapshot ? (
          <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/8 p-3 text-sm animate-fade-in-up">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <div className="text-sky-900 dark:text-sky-200">
              We already have a baseline for{" "}
              <span className="font-medium">{matchingSnapshot.branch}</span>.
              This sandbox can restore instantly.
            </div>
          </div>
        ) : null}

        {parsedRepo.isValid && existingSandbox && !matchingSnapshot ? (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground animate-fade-in-up">
            <GitBranch className="mt-0.5 size-4 shrink-0" />
            <div>
              You already have a live sandbox for{" "}
              <span className="font-medium text-foreground">
                {existingSandbox.repo}
              </span>{" "}
              on{" "}
              <span className="font-medium text-foreground">
                {existingSandbox.branch}
              </span>
              .
            </div>
          </div>
        ) : null}

        <Button
          onClick={onContinue}
          disabled={!parsedRepo.isValid}
          className="h-11 w-full"
          size="lg"
          type="button"
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="space-y-2 border-t pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {RECENT_REPOS.map((repo) => {
            const isSelected =
              repoUrl === `https://github.com/${repo.owner}/${repo.name}`;

            return (
              <button
                type="button"
                key={`${repo.owner}/${repo.name}`}
                onClick={() => onSelectRecent(repo.owner, repo.name)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  "hover:border-foreground/20 hover:bg-muted",
                  isSelected && "border-foreground/30 bg-muted",
                )}
              >
                <Globe className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">
                  {repo.owner}/{repo.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfigureStep({
  advancedOpen,
  matchingSnapshot,
  onAdvancedOpenChange,
  onBack,
  onBranchChange,
  onContinue,
  onWorkspacePathChange,
  parsedRepo,
  selectedBranch,
  workspacePath,
}: {
  advancedOpen: boolean;
  matchingSnapshot: RepoSnapshotSummary | null;
  onAdvancedOpenChange: (open: boolean) => void;
  onBack: () => void;
  onBranchChange: (branch: string) => void;
  onContinue: () => void;
  onWorkspacePathChange: (path: string) => void;
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  selectedBranch: string;
  workspacePath: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Sparkles className="size-5 text-foreground" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Configure sandbox
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            We&apos;ve detected the optimal settings for{" "}
            <span className="font-medium text-foreground">
              {parsedRepo.full}
            </span>
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border p-4",
          matchingSnapshot ? "border-sky-500/20 bg-sky-500/5" : "bg-muted/30",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              matchingSnapshot ? "bg-sky-500/15" : "bg-background",
            )}
          >
            <Sparkles
              className={cn(
                "size-4",
                matchingSnapshot ? "text-sky-600" : "text-foreground",
              )}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {matchingSnapshot ? "Instant restore available" : "Ready to go"}
            </p>
            <p className="text-sm text-muted-foreground">
              {matchingSnapshot
                ? "Found a matching baseline snapshot for this branch. We can skip the full bootstrap."
                : "We will create a fresh sandbox, install dependencies, and capture a baseline snapshot."}
            </p>
          </div>
        </div>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Sliders className="size-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                Advanced settings
              </span>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                advancedOpen && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="mt-2 space-y-4 rounded-lg border p-4">
            <div className="space-y-1.5">
              <label
                htmlFor="branch"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Branch
              </label>
              <Input
                id="branch"
                value={selectedBranch}
                onChange={(event) => onBranchChange(event.target.value)}
                placeholder="main"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="workspace"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Workspace path
              </label>
              <Input
                id="workspace"
                value={workspacePath}
                onChange={(event) => onWorkspacePathChange(event.target.value)}
                placeholder="/workspace/project"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
          className="h-11"
          type="button"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          size="lg"
          className="h-11 flex-1"
          type="button"
        >
          Review
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  createError,
  isCreating,
  matchingSnapshot,
  onBack,
  onContinue,
  parsedRepo,
  selectedBranch,
  workspacePath,
}: {
  createError: string | null;
  isCreating: boolean;
  matchingSnapshot: RepoSnapshotSummary | null;
  onBack: () => void;
  onContinue: () => void;
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  selectedBranch: string;
  workspacePath: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Review and create
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your sandbox configuration before creating
        </p>
      </div>

      <div className="divide-y overflow-hidden rounded-xl border">
        <SummaryRow
          icon={<GitBranch className="size-5" />}
          label="Repository"
          value={parsedRepo.full}
          badge={selectedBranch}
        />
        <SummaryRow
          icon={<Folder className="size-5" />}
          label="Workspace path"
          value={workspacePath}
          mono
        />
        <SummaryRow
          icon={<Clock className="size-5" />}
          label="Baseline"
          value={matchingSnapshot ? "Existing snapshot" : "Fresh clone"}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          What happens next
        </p>
        <ol className="space-y-2">
          {[
            matchingSnapshot
              ? "Restore the repository from the existing baseline snapshot"
              : "Clone the repository into a fresh sandbox",
            "Install opencode and project dependencies inside the isolated environment",
            matchingSnapshot
              ? "Return the current attach instruction so you can connect immediately"
              : "Create a baseline snapshot for the next sandbox, then return the attach instruction",
          ].map((item, index) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {createError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-sm text-destructive">
          {createError}
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isCreating}
          size="lg"
          className="h-11"
          type="button"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={isCreating}
          size="lg"
          className="h-11 flex-1"
          type="button"
        >
          {isCreating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating sandbox...
            </>
          ) : (
            <>
              Create sandbox
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  onCreateAnother,
  onOpenSandbox,
  result,
  sandbox,
}: {
  onCreateAnother: () => void;
  onOpenSandbox: () => void;
  result: RepoBootstrapResult;
  sandbox: RepoSandboxSummary;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  const attach = result.attach;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-subtle-pulse rounded-full bg-emerald-500/20 blur-xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Check className="size-7" strokeWidth={3} />
          </div>
        </div>
        <h2 className="mt-5 font-heading text-xl font-semibold text-foreground">
          Sandbox ready
        </h2>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          Your development environment for{" "}
          <span className="font-medium text-foreground">{sandbox.repo}</span> is
          ready to use
        </p>
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          {result.restoredFromSnapshot
            ? "Restored from the existing branch baseline."
            : "Created a fresh baseline snapshot for future sandboxes."}
        </p>
        {result.snapshot ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Snapshot ID:{" "}
            <span className="font-mono text-foreground">
              {result.snapshot.snapshotId}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <ConnectionRow
          copied={copiedField === "Sandbox ID"}
          label="Sandbox ID"
          onCopy={() => copy("Sandbox ID", sandbox.sandboxId)}
          value={sandbox.sandboxId}
        />
        {attach ? (
          <>
            <ConnectionRow
              copied={copiedField === "Attach command"}
              label="Attach command"
              onCopy={() => copy("Attach command", attach.attachCommand)}
              value={attach.attachCommand}
            />
            <ConnectionRow
              copied={copiedField === "Server URL"}
              label="Server URL"
              onCopy={() => copy("Server URL", attach.url)}
              value={attach.url}
            />
          </>
        ) : null}
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Quick start</p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            1. Run{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              {attach?.attachCommand ?? "opencode attach <url>"}
            </code>
          </li>
          <li>2. Work inside the isolated environment for this repository</li>
          <li>3. Create another sandbox later to reuse the saved baseline</li>
        </ol>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCreateAnother}
          size="lg"
          className="h-11 flex-1"
          type="button"
        >
          Create another
        </Button>
        <Button
          onClick={onOpenSandbox}
          size="lg"
          className="h-11 flex-1"
          type="button"
        >
          Open sandboxes
          <ExternalLink className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  badge,
  mono,
}: {
  badge?: string;
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "truncate font-medium text-foreground",
            mono && "font-mono text-sm",
          )}
        >
          {value}
        </p>
      </div>
      {badge ? (
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function ConnectionRow({
  copied,
  label,
  onCopy,
  value,
}: {
  copied: boolean;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-mono text-sm text-foreground">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
