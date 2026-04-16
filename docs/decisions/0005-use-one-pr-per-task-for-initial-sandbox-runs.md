# 0005: Use One PR Per Task For Initial Sandbox Runs

## Status

Accepted

## Context

The repository is exploring an autonomous implementation workflow built around:

- Vercel sandboxes as the isolated execution environment
- a preconfigured sandbox snapshot with the repo, `opencode`, `wt`, and warm
  dependencies already available
- `wt switch -c` as the standard way to create the task branch and worktree
- `opencode` as the coding agent operating inside the sandbox
- draft pull requests as the review artifact

An earlier design branch considered stacked branches for larger features so each
slice could stay small and reviewable. That direction remains attractive, but
it adds several orchestration problems at once:

- task decomposition and stack planning
- parent-branch management between slices
- state carry-over across slices
- failure recovery for partially published stacks
- more complex run artifacts and publish rules

The current repository still lacks a concrete goal-specific product workflow, so
the system should prefer a smaller first operating model that can be executed
and evaluated quickly.

## Decision

Initial autonomous implementation runs will use a one-task, one-branch, one-PR
model.

The v1 workflow will:

- create one sandbox per accepted task from the current base snapshot
- update the repo from remote before starting task work
- create one task branch with `wt switch -c task/<slug>`
- run `opencode` inside the sandbox against that branch
- always run `pnpm install`, `pnpm lint`, `pnpm test`, and `pnpm build` before
  publish
- preserve any clean atomic Conventional Commits created by `opencode`
- push only the predeclared task branch
- open one draft pull request targeting `main`

The planner will remain intentionally small. It may:

- accept a task and emit a task slug plus brief
- reject a task that is too large or unclear for the one-PR model

The planner will not yet:

- decompose a task into stacked slices
- manage multi-branch dependency chains
- publish stacked pull requests

The sandbox will be treated as the full agent workstation for the duration of a
task. The capability boundary, not an in-sandbox policy layer, is the primary
safety control:

- the sandbox is isolated
- write credentials are short-lived GitHub App installation tokens
- publish credentials are injected only at publish time
- branch publication is allowed, but merge remains a human task

## Consequences

- The first autonomous workflow stays simple enough to implement and debug.
- Reviewability is protected by the planner's ability to reject oversized tasks.
- Publish is explicitly decoupled from implementation. A run may verify
  successfully but still enter a recoverable `publish_failed` state.
- The branch and PR model remains deterministic because every accepted task has
  one declared branch and one declared PR target.
- The system deliberately accepts technical debt:
  stacked branch workflows, targeted verification, and durable failure
  knowledge are deferred until the one-PR model proves itself.
