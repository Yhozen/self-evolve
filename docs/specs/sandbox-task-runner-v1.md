# Sandbox Task Runner V1

## Purpose

Define the initial autonomous implementation workflow that runs one accepted
task inside one Vercel sandbox and produces one draft pull request.

This is a v1 operating spec, not a claim that every part is already
implemented.

## Summary

The task runner will:

1. plan the task just enough to decide whether it fits the one-PR model
2. create a sandbox from a preconfigured snapshot
3. refresh the repo state from remote
4. create a task branch with `wt switch -c task/<slug>`
5. run `opencode` inside the sandbox with a standard wrapper prompt plus the
   user task
6. run the fixed publish gate:
   `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build`
7. publish the declared branch and open a draft pull request against `main`
8. remove the sandbox after successful publish or explicit discard

## Goals

- keep the initial workflow small enough to reason about
- preserve reviewability by producing one branch and one draft PR per accepted
  task
- use the sandbox snapshot to avoid repeated workstation setup
- make publish deterministic through a fixed branch name, fixed base branch, and
  fixed verification gate
- keep merge and final judgment with a human reviewer

## Non-Goals

- stacked branch execution
- slice-by-slice task decomposition
- targeted test selection
- committed run-brief files
- durable failure artifacts for discarded runs
- Dockerfile-like snapshot layering

Those remain future work.

## Assumptions

### Repository

- the default branch is always `main`
- the repository uses `pnpm`
- the repository test suite is small enough that always running install, lint,
  tests, and build is acceptable for now

### Sandbox Snapshot

- `opencode` is installed
- `wt` is installed
- the target repository is already checked out
- dependencies are warm
- no long-lived Git write credentials are baked into the snapshot

Warm dependencies are a performance assumption only. The runner will still
execute `pnpm install` before verification to keep dependencies current.

### Agent Behavior

- `opencode` runs inside the sandbox, not on the host
- the orchestration layer passes a standard wrapper prompt plus the task prompt
- the wrapper prompt may instruct `opencode` to create atomic Conventional
  Commits, but the sandbox itself is otherwise treated as an unbounded execution
  environment
- branch publication is bounded by the capability layer, not by a restrictive
  in-sandbox policy layer

## Minimal Planner

The planner is intentionally small.

It must:

- create a stable task slug
- decide whether the task fits the one-PR model
- produce a concise task brief for `opencode`

It may return:

- `planned`
- `rejected`

Reasons for rejection include:

- the task is obviously too large for one reviewable PR
- the task is unclear enough that execution would be low confidence

## Branch Policy

- accepted tasks use the branch name `task/<slug>`
- the planner generates the slug automatically
- the branch is created inside the sandbox with `wt switch -c task/<slug>`
- the pull request target is always `main`

## Execution Flow

### 1. Plan

- receive a task prompt
- run the minimal planner
- reject the task if it does not fit the one-PR model

### 2. Create Sandbox

- create a sandbox from the preconfigured snapshot
- attach task metadata such as task id and branch name in orchestration state

### 3. Refresh Repo

Inside the sandbox:

- `cd` to the checked-out repo
- run `git fetch origin --prune`
- ensure the sandbox is working against current remote state before creating the
  branch

### 4. Create Branch

Inside the sandbox:

- run `wt switch -c task/<slug>`

### 5. Run OpenCode

Inside the sandbox:

- launch `opencode` with a standard wrapper prompt plus the task brief
- allow `opencode` to edit, run commands, and commit inside the sandbox
- do not inject publish credentials during this step

### 6. Verify

Inside the sandbox, always run:

1. `pnpm install`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`

Any failure moves the task to `verify_failed`.

### 7. Publish

When verification passes:

- mint a fresh GitHub App installation token from a trusted control plane
- inject it ephemerally into the sandbox
- verify the current branch matches the predeclared `task/<slug>`
- push that branch only
- open a draft pull request targeting `main`

If push or PR creation fails after verification succeeds, the task enters
`publish_failed`.

### 8. Cleanup

- remove the sandbox after `published`
- remove the sandbox after `discarded`
- retain the sandbox for a bounded recovery window after `publish_failed`

## Task State Machine

The v1 runner uses these states:

- `planned`
- `rejected`
- `running`
- `verify_failed`
- `publish_failed`
- `published`
- `discarded`

Expected transitions:

- planner accepts task -> `planned`
- planner rejects task -> `rejected`
- accepted task starts sandbox execution -> `running`
- verification fails -> `verify_failed`
- verification passes but publish fails -> `publish_failed`
- publish succeeds -> `published`
- failed or abandoned work is explicitly abandoned -> `discarded`

## Publish Rules

- merge is always a human task
- only the predeclared branch for the task may be pushed
- draft PRs are the intended publish artifact
- clean atomic Conventional Commits created by `opencode` should be preserved
- if `opencode` does not create commits, orchestration may create the final
  Conventional Commit before push

## Implementation Notes

- sandbox provisioning should reuse the existing snapshot-backed sandbox service
- repo refresh and verification commands can be modeled as normal sandbox
  command execution through the service boundary
- the GitHub App installation token should be minted only at publish time, not
  baked into the snapshot and not created inside the sandbox
- the runner should distinguish verification failures from publish failures
  because the latter may be transient and recoverable

## Deferred Work

- stacked branches and parent-child slice execution
- task briefs persisted as local orchestration files
- targeted test selection instead of always running the full fixed gate
- durable failure artifacts filed back into `docs/runs/`
- richer repository policies beyond the hardcoded `main` assumption
- snapshot layering or Dockerfile-like base extension
