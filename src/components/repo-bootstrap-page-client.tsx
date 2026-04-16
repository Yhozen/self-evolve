"use client";

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  KeyRoundIcon,
  PackageCheckIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SandboxListResult } from "@/lib/sandbox";
import { formatTimestamp } from "@/lib/sandbox-format";

type RepoBootstrapPageClientProps = {
  inventory: Pick<
    SandboxListResult,
    "latestSnapshot" | "sandboxes" | "snapshots"
  >;
};

type BootstrapStep = {
  title: string;
  description: string;
  icon: typeof GitBranchIcon;
};

const bootstrapSteps: BootstrapStep[] = [
  {
    title: "Clone the private repository",
    description:
      "Use the GitHub App installation token to materialize the repo inside a fresh sandbox.",
    icon: GitBranchIcon,
  },
  {
    title: "Provision the workspace",
    description:
      "Run the default bootstrap recipe, install opencode, and prepare a stable working directory.",
    icon: PackageCheckIcon,
  },
  {
    title: "Save the repo baseline",
    description:
      "Snapshot the provisioned sandbox so future fresh sandboxes can restore from that baseline.",
    icon: CheckCircle2Icon,
  },
  {
    title: "Return the attach handoff",
    description:
      "Show the command and endpoint the user needs to attach opencode to the isolated environment.",
    icon: TerminalSquareIcon,
  },
];

function normalizeRepositoryKey(repoUrl: string) {
  const trimmed = repoUrl.trim();

  if (!trimmed) {
    return null;
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
    const repo = match[2];

    return `github.com/${owner}/${repo}`;
  }

  return null;
}

export function RepoBootstrapPageClient({
  inventory,
}: RepoBootstrapPageClientProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [installationId, setInstallationId] = useState("");
  const [didPreview, setDidPreview] = useState(false);

  const repositoryKey = normalizeRepositoryKey(repoUrl);
  const trimmedInstallationId = installationId.trim();
  const hasInstallationId = /^\d+$/.test(trimmedInstallationId);
  const canPreview = repositoryKey !== null && hasInstallationId;
  const repoName = repositoryKey?.split("/").at(-1) ?? "<repo>";
  const workspacePath = `/workspace/${repoName}`;
  const attachCommand =
    "OPENCODE_SERVER_PASSWORD=<generated-password> opencode attach https://<sandbox-domain>";

  const previewBootstrap = () => {
    if (!canPreview) {
      return;
    }

    setDidPreview(true);
  };

  const resetPreview = () => {
    setRepoUrl("");
    setInstallationId("");
    setDidPreview(false);
  };

  return (
    <section className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-sm backdrop-blur lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Repo Bootstrap
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                Turn a repository into a reusable sandbox baseline.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                This first iteration focuses on the operator flow: collect the
                repo input, preview the bootstrap request, and show the handoff
                we expect to return once the backend is wired.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/45 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Live
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {inventory.sandboxes.length}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Sandboxes in scope
              </p>
            </div>
            <div className="rounded-2xl bg-muted/45 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Snapshots
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {inventory.snapshots.length}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Restore points available
              </p>
            </div>
            <div className="rounded-2xl bg-muted/45 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Latest Base
              </div>
              <div className="mt-2 text-sm font-semibold leading-6">
                {formatTimestamp(inventory.latestSnapshot?.createdAt ?? null)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Current project-level snapshot
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Bootstrap Request</CardTitle>
            <CardDescription>
              Enter the minimum data we need for the first repo bootstrap flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/acme/private-repo"
                spellCheck={false}
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Accepts standard GitHub HTTPS or SSH repository URLs.
              </p>
              <div className="rounded-xl bg-muted/45 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">
                  Repository key:
                </span>{" "}
                <span className="font-mono text-muted-foreground">
                  {repositoryKey ?? "Waiting for a valid GitHub repository URL"}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="installation-id">GitHub Installation ID</Label>
              <div className="relative">
                <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="installation-id"
                  value={installationId}
                  onChange={(event) => setInstallationId(event.target.value)}
                  placeholder="12345678"
                  className="pl-10"
                  inputMode="numeric"
                />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                This is the GitHub App installation that already has access to
                the repository.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
              This page does not call the backend yet. The next slice will wire
              this form to the GitHub App token service, repo-scoped snapshot
              persistence, and sandbox bootstrap orchestration.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={previewBootstrap} disabled={!canPreview}>
                Preview Bootstrap
              </Button>
              <Button variant="outline" onClick={resetPreview}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Flow Preview</CardTitle>
            <CardDescription>
              The first implementation will keep the operator handoff simple and
              explicit.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6">
            {bootstrapSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
                      <Icon className="size-4" />
                    </div>
                    {index < bootstrapSteps.length - 1 ? (
                      <ArrowRightIcon className="mt-3 size-4 text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Expected Handoff</CardTitle>
          <CardDescription>
            Once the bootstrap backend is in place, this is the shape of the
            result we want to return to the user.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-muted/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Sandbox Workspace
              </div>
              <p className="mt-2 font-mono text-sm leading-6">
                {workspacePath}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The repo checkout, opencode install, and repo baseline snapshot
                will all converge on a stable workspace path.
              </p>
            </div>

            <div className="rounded-2xl bg-muted/35 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Baseline Policy
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Future fresh sandboxes should restore from the saved baseline
                for{" "}
                <span className="font-mono text-foreground">
                  {repositoryKey ?? "github.com/<owner>/<repo>"}
                </span>
                , not from the latest project-wide snapshot.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/70 bg-stone-950 p-4 text-stone-50">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-400">
                Attach Command
              </div>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">
                {attachCommand}
              </pre>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm leading-6 text-emerald-800">
              {didPreview && canPreview ? (
                <>
                  Preview ready for{" "}
                  <span className="font-mono">{repositoryKey}</span> using
                  installation{" "}
                  <span className="font-mono">{trimmedInstallationId}</span>.
                  The next backend slice should turn this into a real bootstrap
                  request and return sandbox plus snapshot identifiers.
                </>
              ) : (
                "Fill in a valid repository URL and numeric installation ID to preview the repo bootstrap request."
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
