# Sandbox Task Runner Follow-Ups

## Purpose

Track the major deferred decisions, intentional simplifications, and technical
debt accepted while defining the initial sandbox task runner.

This page complements
[`sandbox-task-runner-v1.md`](sandbox-task-runner-v1.md). The v1 spec defines
the current operating model. This page records what was intentionally left out
so future iterations can revisit it deliberately.

## Why This Exists

The initial workflow is intentionally narrow:

- one task
- one sandbox
- one branch
- one draft PR

That keeps the first version understandable and shippable, but it also means
several important design branches were postponed on purpose. This page prevents
those omissions from becoming invisible assumptions.

## Deferred Product Decisions

### 1. One PR Per Task vs. Stacked Branches

Current choice:

- one PR per accepted task

Future decision:

- when to introduce stacked branch execution for larger features
- how to define parent-child slice relationships
- when to continue automatically between slices and when to stop for replanning

Why deferred:

- stack orchestration adds planning, lineage, failure recovery, and review
  complexity all at once

### 2. Minimal Planner vs. Slice Planner

Current choice:

- a minimal planner that either accepts a one-PR task or rejects it

Future decision:

- whether the planner should generate full tentative stacks
- whether later slices should be revised after earlier execution results

Why deferred:

- the current system needs proof that the one-PR model is stable before adding
  decomposition and stack maintenance

### 3. Fixed Verification Gate vs. Targeted Verification

Current choice:

- always run `pnpm install`, `pnpm lint`, `pnpm test`, and `pnpm build`

Future decision:

- how to choose targeted tests safely
- whether some repos need different publish gates
- when heavier verification belongs before push vs. after push in CI

Why deferred:

- the fixed gate is slower, but far easier to reason about while the workflow is
  still new

### 4. Hardcoded `main` vs. Repository Policy

Current choice:

- assume the base branch is always `main`

Future decision:

- how to support repos with different default branches
- whether the orchestrator should carry explicit repository policy

Why deferred:

- hardcoding `main` removes policy plumbing and keeps v1 deterministic

### 5. Inline Task Brief vs. Persisted Run Inputs

Current choice:

- pass the task brief inline to `opencode`

Future decision:

- whether the sandbox or worktree should contain a local run-brief file
- whether run inputs should be preserved for audit and replay

Why deferred:

- file-backed orchestration state improves traceability, but it complicates the
  first implementation

### 6. One Repo Serial Execution vs. Concurrency

Current choice:

- assume one active task per repo at a time

Future decision:

- whether to allow multiple parallel sandboxes against one repo
- how to prevent stale branch bases, duplicated work, and branch contention

Why deferred:

- serial execution is simpler and better aligned with the current
  determinism-first goal

## Technical Debt Register

### 1. Always Running `pnpm install`

Debt:

- the runner always refreshes dependencies even if no dependency files changed

Impact:

- slower runs
- extra network and package-manager churn

Reason accepted:

- easy to understand and less likely to hide dependency drift during the first
  rollout

Likely future improvement:

- only reinstall when manifest or lockfile changes require it

### 2. Full Fixed Verification Instead of Targeted Checks

Debt:

- every accepted task pays the cost of the full fixed publish gate

Impact:

- slower feedback loop
- unnecessary work for small diffs

Reason accepted:

- simpler and safer while test volume is still assumed to be manageable

Likely future improvement:

- task-aware or diff-aware targeted verification

### 3. No Durable Failure Artifacts Yet

Debt:

- rejected, discarded, and failed runs are not yet filed into durable
  repo-level run artifacts

Impact:

- repeated mistakes may be harder to recognize
- operational failures may leave little reusable evidence

Reason accepted:

- the first priority is getting the main happy path into a coherent shape

Likely future improvement:

- record failed and discarded runs under `docs/runs/`

### 4. Snapshot As Workstation, Not Layered Image

Debt:

- the snapshot acts as a ready workstation, not as a composable layered build
  artifact

Impact:

- less flexibility when different task classes need different base environments

Reason accepted:

- the current approach is simpler than building Dockerfile-like snapshot
  extension logic

Likely future improvement:

- recipe layering or Dockerfile-like snapshot customization

### 5. Minimal Planner Rejects But Does Not Decompose

Debt:

- large tasks are refused rather than broken down automatically

Impact:

- human or later planner work is needed to recover large-but-valid tasks

Reason accepted:

- decomposition logic would significantly increase orchestration complexity

Likely future improvement:

- planner-generated slice stacks with explicit branch lineage

### 6. Assumption That OpenCode Commits Stay Clean

Debt:

- the workflow assumes `opencode` will create clean atomic Conventional Commits
  when it chooses to commit

Impact:

- publish policy may be brittle if that assumption proves false

Reason accepted:

- automatic commit-history repair is not worth the added complexity in v1

Likely future improvement:

- stronger commit validation or automated recovery rules

## Revisit Triggers

The deferred decisions on this page should be revisited when one of these
conditions becomes true:

- one-PR tasks are routinely rejected as too large
- the fixed verification gate becomes a major throughput bottleneck
- publish failures or discarded work reveal a need for stronger run artifacts
- multiple repos or multiple concurrent tasks become a requirement
- different repos require different branch or verification policies

## Relationship To Decisions

- the accepted v1 workflow is defined in
  [`0005-use-one-pr-per-task-for-initial-sandbox-runs.md`](../decisions/0005-use-one-pr-per-task-for-initial-sandbox-runs.md)
- the executable shape of that workflow is defined in
  [`sandbox-task-runner-v1.md`](sandbox-task-runner-v1.md)

This page should change when the project intentionally accepts or retires debt,
not whenever implementation details fluctuate.
