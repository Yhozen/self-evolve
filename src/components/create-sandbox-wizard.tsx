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
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  createSandbox,
  parseRepoUrl,
  useMockState,
  type MockSandbox,
} from "@/lib/mock-store";
import { cn } from "@/lib/utils";

type Step = "repository" | "configure" | "review" | "done";

interface StepConfig {
  id: Step;
  label: string;
  number: number;
}

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

export function CreateSandboxWizard() {
  const router = useRouter();
  const { sandboxes, snapshots } = useMockState();
  const [currentStep, setCurrentStep] = useState<Step>("repository");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [workspacePath, setWorkspacePath] = useState("/workspace");
  const [isCreating, setIsCreating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [createdSandbox, setCreatedSandbox] = useState<MockSandbox | null>(
    null,
  );

  const parsedRepo = useMemo(() => parseRepoUrl(repoUrl), [repoUrl]);

  // Find matching existing snapshot for fast-start hint
  const matchingSnapshot = useMemo(() => {
    if (!parsedRepo.isValid) return null;
    return (
      snapshots.find((s) => s.repo.toLowerCase() === parsedRepo.full.toLowerCase()) ||
      null
    );
  }, [snapshots, parsedRepo]);

  // Existing sandbox with same repo
  const existingSandbox = useMemo(() => {
    if (!parsedRepo.isValid) return null;
    return (
      sandboxes.find(
        (s) => s.repo.toLowerCase() === parsedRepo.full.toLowerCase(),
      ) || null
    );
  }, [sandboxes, parsedRepo]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goToStep = (step: Step) => setCurrentStep(step);

  const handleContinue = () => {
    if (currentStep === "repository" && parsedRepo.isValid) {
      setWorkspacePath(`/workspace/${parsedRepo.name}`);
      goToStep("configure");
    } else if (currentStep === "configure") {
      goToStep("review");
    } else if (currentStep === "review") {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (currentStep === "configure") goToStep("repository");
    else if (currentStep === "review") goToStep("configure");
  };

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      const sandbox = createSandbox({
        repoUrl,
        branch: selectedBranch,
        workspacePath,
        fromSnapshotId: matchingSnapshot?.snapshotId ?? null,
      });
      setCreatedSandbox(sandbox);
      setIsCreating(false);
      goToStep("done");
    }, 1400);
  };

  const handleSelectRecentRepo = (owner: string, name: string) => {
    setRepoUrl(`https://github.com/${owner}/${name}`);
  };

  const handleReset = () => {
    setRepoUrl("");
    setSelectedBranch("main");
    setWorkspacePath("/workspace");
    setAdvancedOpen(false);
    setCreatedSandbox(null);
    goToStep("repository");
  };

  const handleOpenSandbox = () => {
    router.push("/sandboxes");
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 lg:px-8">
      {/* Back link */}
      <Link
        href="/sandboxes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Back to sandboxes
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Create sandbox
        </h1>
        <p className="mt-2 text-pretty text-muted-foreground">
          Turn any GitHub repository into a ready-to-use development environment
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />

      {/* Step Content */}
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div key={currentStep} className="animate-fade-in-up">
          {currentStep === "repository" && (
            <RepositoryStep
              repoUrl={repoUrl}
              onRepoUrlChange={setRepoUrl}
              onSelectRecent={handleSelectRecentRepo}
              parsedRepo={parsedRepo}
              existingSandbox={existingSandbox}
              matchingSnapshot={matchingSnapshot}
              onContinue={handleContinue}
            />
          )}

          {currentStep === "configure" && (
            <ConfigureStep
              parsedRepo={parsedRepo}
              matchingSnapshot={matchingSnapshot}
              selectedBranch={selectedBranch}
              onBranchChange={setSelectedBranch}
              workspacePath={workspacePath}
              onWorkspacePathChange={setWorkspacePath}
              advancedOpen={advancedOpen}
              onAdvancedOpenChange={setAdvancedOpen}
              onBack={handleBack}
              onContinue={handleContinue}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              parsedRepo={parsedRepo}
              matchingSnapshot={matchingSnapshot}
              selectedBranch={selectedBranch}
              workspacePath={workspacePath}
              onBack={handleBack}
              onContinue={handleContinue}
              isCreating={isCreating}
            />
          )}

          {currentStep === "done" && createdSandbox && (
            <DoneStep
              sandbox={createdSandbox}
              onCreateAnother={handleReset}
              onOpenSandbox={handleOpenSandbox}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

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
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
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

// ---------------------------------------------------------------------------
// Step 1: Repository
// ---------------------------------------------------------------------------

function RepositoryStep({
  repoUrl,
  onRepoUrlChange,
  onSelectRecent,
  parsedRepo,
  existingSandbox,
  matchingSnapshot,
  onContinue,
}: {
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  onSelectRecent: (owner: string, name: string) => void;
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  existingSandbox: MockSandbox | null;
  matchingSnapshot: { snapshotId: string } | null;
  onContinue: () => void;
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
          onChange={(e) => onRepoUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsedRepo.isValid) onContinue();
          }}
          className="h-11 text-base"
          autoFocus
        />

        {/* Contextual hints */}
        {parsedRepo.isValid && matchingSnapshot ? (
          <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/8 p-3 text-sm animate-fade-in-up">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <div className="text-sky-900 dark:text-sky-200">
              We&apos;ll restore from an existing snapshot — your sandbox will
              be ready instantly.
            </div>
          </div>
        ) : null}

        {parsedRepo.isValid && existingSandbox && !matchingSnapshot ? (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground animate-fade-in-up">
            <GitBranch className="mt-0.5 size-4 shrink-0" />
            <div>
              You already have a sandbox for{" "}
              <span className="font-medium text-foreground">
                {parsedRepo.full}
              </span>
              . Creating another is fine.
            </div>
          </div>
        ) : null}

        <Button
          onClick={onContinue}
          disabled={!parsedRepo.isValid}
          className="h-11 w-full"
          size="lg"
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

// ---------------------------------------------------------------------------
// Step 2: Configure
// ---------------------------------------------------------------------------

function ConfigureStep({
  parsedRepo,
  matchingSnapshot,
  selectedBranch,
  onBranchChange,
  workspacePath,
  onWorkspacePathChange,
  advancedOpen,
  onAdvancedOpenChange,
  onBack,
  onContinue,
}: {
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  matchingSnapshot: { snapshotId: string } | null;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  workspacePath: string;
  onWorkspacePathChange: (path: string) => void;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
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

      {/* Status Card */}
      <div
        className={cn(
          "rounded-xl border p-4",
          matchingSnapshot
            ? "border-sky-500/20 bg-sky-500/5"
            : "bg-muted/30",
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
                ? "Found an existing snapshot. Skip the full install and restore in seconds."
                : "This public repository can be cloned without additional setup."}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced */}
      <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50">
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
                onChange={(e) => onBranchChange(e.target.value)}
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
                onChange={(e) => onWorkspacePathChange(e.target.value)}
                placeholder="/workspace/project"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg" className="h-11">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onContinue} size="lg" className="h-11 flex-1">
          Review
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Review
// ---------------------------------------------------------------------------

function ReviewStep({
  parsedRepo,
  matchingSnapshot,
  selectedBranch,
  workspacePath,
  onBack,
  onContinue,
  isCreating,
}: {
  parsedRepo: ReturnType<typeof parseRepoUrl>;
  matchingSnapshot: { snapshotId: string } | null;
  selectedBranch: string;
  workspacePath: string;
  onBack: () => void;
  onContinue: () => void;
  isCreating: boolean;
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
              ? "Restore the repository from the existing snapshot"
              : "Clone the repository into a fresh sandbox",
            "Install dependencies and run bootstrap scripts",
            "Open the sandbox — ready for opencode",
          ].map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isCreating}
          size="lg"
          className="h-11"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={isCreating}
          size="lg"
          className="h-11 flex-1"
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

// ---------------------------------------------------------------------------
// Step 4: Done
// ---------------------------------------------------------------------------

function DoneStep({
  sandbox,
  onCreateAnother,
  onOpenSandbox,
}: {
  sandbox: MockSandbox;
  onCreateAnother: () => void;
  onOpenSandbox: () => void;
}) {
  const [sshCopied, setSshCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  // Reset copy state if unmounted/remounted
  useEffect(() => {
    setSshCopied(false);
    setIdCopied(false);
  }, [sandbox.sandboxId]);

  const sshUrl = `ssh sandbox@${sandbox.sandboxId.slice(4, 16)}.sandbox.vercel.run`;

  const copy = async (
    value: string,
    setter: (v: boolean) => void,
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setter(true);
      setTimeout(() => setter(false), 1500);
    } catch {
      // ignore
    }
  };

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
          <span className="font-medium text-foreground">{sandbox.repo}</span>{" "}
          is ready to use
        </p>
      </div>

      <div className="space-y-2">
        <ConnectionRow
          label="Sandbox ID"
          value={sandbox.sandboxId}
          copied={idCopied}
          onCopy={() => copy(sandbox.sandboxId, setIdCopied)}
        />
        <ConnectionRow
          label="Connect via SSH"
          value={sshUrl}
          copied={sshCopied}
          onCopy={() => copy(sshUrl, setSshCopied)}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Quick start</p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Connect to your sandbox using the SSH command above</li>
          <li>
            2. Run{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
              opencode
            </code>{" "}
            to start coding
          </li>
          <li>3. Save snapshots to make future runs instant</li>
        </ol>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCreateAnother}
          size="lg"
          className="h-11 flex-1"
        >
          Create another
        </Button>
        <Button onClick={onOpenSandbox} size="lg" className="h-11 flex-1">
          Open sandbox
          <ExternalLink className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared row components
// ---------------------------------------------------------------------------

function SummaryRow({
  icon,
  label,
  value,
  badge,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  mono?: boolean;
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
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
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
