# Data Flow

This page describes the intended high-level data flow for autonomous work.

## Expected Flow

1. Inputs arrive.
   Examples include `GOAL.md`, root docs, accepted decisions, prior run
   artifacts, or future external sources.
2. The agent reads the wiki.
   `docs/index.md` points the agent to the relevant canonical pages.
3. A minimal planner evaluates the task.
   The planner either rejects the task as too large for the current one-PR
   model or emits a task slug plus short task brief.
4. A sandbox is created from the current reusable snapshot.
   The snapshot provides the preconfigured workstation with `opencode`, `wt`,
   the repo checkout, and warm dependencies.
5. The repo is refreshed from remote inside the sandbox.
   The sandbox fetches current refs before creating the task branch.
6. The branch is created inside the sandbox.
   `wt switch -c task/<slug>` establishes the task branch.
7. `opencode` executes the task inside the sandbox.
   The runner passes a standard wrapper prompt plus the task brief.
8. The fixed publish gate runs inside the sandbox.
   `pnpm install`, `pnpm lint`, `pnpm test`, and `pnpm build` determine whether
   the run is publishable.
9. Publish credentials are injected only if needed.
   A fresh GitHub App installation token is minted by a trusted control plane
   only when verification succeeded and publish is about to happen.
10. The branch is pushed and a draft PR is opened.
    The branch target is always `main` in v1.
11. Durable knowledge is filed back.
    Canonical pages are updated and future run artifacts may be stored in
    `docs/runs/`.

## Repo Bootstrap Flow

The repository-to-sandbox bootstrap flow is a separate v1 product path:

1. The user selects a GitHub repository.
   Existing GitHub authorization is assumed.
2. The backend treats that repository as the baseline identity.
   V1 keys the reusable baseline by repository only.
3. A sandbox is created for that repository.
4. The default provisioning script runs inside the sandbox.
   Provisioning installs `opencode` and prepares the repo workspace.
5. The sandbox is snapshotted.
   That snapshot becomes the one current baseline snapshot for the repository
   and may replace the previous one.
6. The product returns the current instruction.
   The handoff includes the sandbox id, snapshot id, and the instruction the
   user should run in the isolated environment.
7. Future fresh sandboxes restore from that repository baseline snapshot.
   V1 intentionally restores from the current baseline, not from the user's
   most recently modified sandbox.

## Current Limitation

The one-PR-per-task runner is now specified concretely, but parts of the wider
system are still target-state capabilities rather than implemented workflow
automation.
