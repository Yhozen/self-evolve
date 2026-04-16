"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  Folder,
  Clock,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Globe,
  Sliders,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";

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
  { owner: "facebook", name: "react" },
];

export function CreateSandboxWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("repository");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [workspacePath, setWorkspacePath] = useState("/workspace");
  const [isCreating, setIsCreating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Mock parsed repo data
  const parsedRepo = repoUrl
    ? parseGitHubUrl(repoUrl)
    : { owner: "", name: "", isValid: false };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

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
    // Mock creation - in real app this would call the API
    setTimeout(() => {
      setIsCreating(false);
      goToStep("done");
    }, 2500);
  };

  const handleSelectRecentRepo = (owner: string, name: string) => {
    setRepoUrl(`https://github.com/${owner}/${name}`);
  };

  const handleReset = () => {
    setRepoUrl("");
    setSelectedBranch("main");
    setWorkspacePath("/workspace");
    setAdvancedOpen(false);
    goToStep("repository");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create Sandbox
          </h1>
          <p className="mt-2 text-muted-foreground">
            Turn any GitHub repository into a ready-to-use development
            environment
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />

        {/* Step Content */}
        <Card className="mt-8">
          <CardContent className="p-6">
            {currentStep === "repository" && (
              <RepositoryStep
                repoUrl={repoUrl}
                onRepoUrlChange={setRepoUrl}
                onSelectRecent={handleSelectRecentRepo}
                isValid={parsedRepo.isValid}
                onContinue={handleContinue}
              />
            )}

            {currentStep === "configure" && (
              <ConfigureStep
                parsedRepo={parsedRepo}
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
                selectedBranch={selectedBranch}
                workspacePath={workspacePath}
                onBack={handleBack}
                onContinue={handleContinue}
                isCreating={isCreating}
              />
            )}

            {currentStep === "done" && (
              <DoneStep
                parsedRepo={parsedRepo}
                onCreateAnother={handleReset}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step Indicator Component
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
        const isPending = index > currentStepIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                  isCompleted &&
                    "bg-foreground text-background",
                  isCurrent &&
                    "bg-foreground text-background ring-4 ring-foreground/10",
                  isPending &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 transition-colors",
                  index < currentStepIndex
                    ? "bg-foreground"
                    : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Step 1: Repository
function RepositoryStep({
  repoUrl,
  onRepoUrlChange,
  onSelectRecent,
  isValid,
  onContinue,
}: {
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  onSelectRecent: (owner: string, name: string) => void;
  isValid: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Add your repository
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a GitHub URL and we&apos;ll set up a sandbox for you
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => onRepoUrlChange(e.target.value)}
          className="h-12 text-base"
        />

        <Button
          onClick={onContinue}
          disabled={!isValid}
          className="h-12 w-full"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Recent Repositories */}
      <div className="space-y-3 border-t pt-6">
        <p className="text-sm text-muted-foreground">Recent repositories</p>
        <div className="flex flex-wrap gap-2">
          {RECENT_REPOS.map((repo) => (
            <button
              key={`${repo.owner}/${repo.name}`}
              onClick={() => onSelectRecent(repo.owner, repo.name)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                "hover:bg-muted hover:border-foreground/20",
                repoUrl === `https://github.com/${repo.owner}/${repo.name}` &&
                  "border-foreground/30 bg-muted"
              )}
            >
              <Globe className="h-4 w-4 text-muted-foreground" />
              {repo.owner}/{repo.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Configure
function ConfigureStep({
  parsedRepo,
  selectedBranch,
  onBranchChange,
  workspacePath,
  onWorkspacePathChange,
  advancedOpen,
  onAdvancedOpenChange,
  onBack,
  onContinue,
}: {
  parsedRepo: { owner: string; name: string; isValid: boolean };
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Sparkles className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Configure sandbox
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            We&apos;ve detected the optimal settings. Customize if needed.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background">
            <Sparkles className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Ready to go</p>
            <p className="text-sm text-muted-foreground">
              This public repository can be cloned without additional setup.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Collapsible open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                Advanced settings
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                advancedOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Branch
              </label>
              <Input
                value={selectedBranch}
                onChange={(e) => onBranchChange(e.target.value)}
                placeholder="main"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Workspace path
              </label>
              <Input
                value={workspacePath}
                onChange={(e) => onWorkspacePathChange(e.target.value)}
                placeholder="/workspace/project"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} className="h-11 flex-1">
          Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Review
function ReviewStep({
  parsedRepo,
  selectedBranch,
  workspacePath,
  onBack,
  onContinue,
  isCreating,
}: {
  parsedRepo: { owner: string; name: string; isValid: boolean };
  selectedBranch: string;
  workspacePath: string;
  onBack: () => void;
  onContinue: () => void;
  isCreating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Review and create
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your sandbox configuration before creating
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-4">
        <SummaryRow
          icon={<GitBranch className="h-5 w-5" />}
          label="Repository"
          value={`${parsedRepo.owner}/${parsedRepo.name}`}
          badge={selectedBranch}
        />
        <div className="border-t" />
        <SummaryRow
          icon={<Folder className="h-5 w-5" />}
          label="Workspace path"
          value={workspacePath}
        />
        <div className="border-t" />
        <SummaryRow
          icon={<Clock className="h-5 w-5" />}
          label="Snapshot baseline"
          value="Repo"
        />
      </div>

      {/* What happens next */}
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          What happens next
        </p>
        <div className="space-y-2">
          {[
            "Clone the repository into a fresh sandbox",
            "Install dependencies and run bootstrap scripts",
            "Create a baseline snapshot for instant restores",
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isCreating}
          className="h-11"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={isCreating}
          className="h-11 flex-1"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating sandbox...
            </>
          ) : (
            "Create sandbox"
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 4: Done
function DoneStep({
  parsedRepo,
  onCreateAnother,
}: {
  parsedRepo: { owner: string; name: string; isValid: boolean };
  onCreateAnother: () => void;
}) {
  const mockSandboxId = "sbx_a1b2c3d4e5f6";
  const mockConnectionUrl = `ssh sandbox@connect.example.dev -p 22`;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground">
          <Check className="h-6 w-6 text-background" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Sandbox ready
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your development environment for{" "}
          <span className="font-medium text-foreground">
            {parsedRepo.owner}/{parsedRepo.name}
          </span>{" "}
          is ready to use
        </p>
      </div>

      {/* Connection Details */}
      <div className="space-y-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Sandbox ID</p>
              <p className="font-mono text-sm text-foreground">
                {mockSandboxId}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Connect via SSH</p>
              <p className="truncate font-mono text-sm text-foreground">
                {mockConnectionUrl}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Quick start</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Connect to your sandbox using the SSH command above
          </p>
          <p>
            2. Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">opencode</code> to start coding
          </p>
          <p>
            3. Your changes are automatically saved to snapshots
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCreateAnother} className="h-11 flex-1">
          Create another
        </Button>
        <Button className="h-11 flex-1">
          Open sandbox
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Summary Row Component
function SummaryRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground">{value}</p>
      </div>
      {badge && (
        <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}

// Helper function to parse GitHub URLs
function parseGitHubUrl(url: string): {
  owner: string;
  name: string;
  isValid: boolean;
} {
  try {
    // Handle both https://github.com/owner/repo and github.com/owner/repo
    const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, "");
    const match = cleanUrl.match(/^github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      return {
        owner: match[1],
        name: match[2].replace(/\.git$/, ""),
        isValid: true,
      };
    }
  } catch {
    // Invalid URL
  }
  return { owner: "", name: "", isValid: false };
}
