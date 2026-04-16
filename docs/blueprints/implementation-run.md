# Implementation Run

This blueprint describes the planned v1 workflow for bounded implementation work
using a sandbox-backed agent workstation.

## Intended Use

Use this blueprint when an accepted task is small enough to fit the initial
one-PR-per-task model described in
[`docs/specs/sandbox-task-runner-v1.md`](../specs/sandbox-task-runner-v1.md).

## Required Inputs

- the root operating docs
- relevant architecture and decision pages under `docs/`
- a concrete user task
- a preconfigured sandbox snapshot with `opencode`, `wt`, the repo checkout,
  and warm dependencies available

## Workflow

1. Plan the task.
   Create a task slug and decide whether the task is small enough for the
   one-PR model. Reject if it is too large or unclear.
2. Create the sandbox.
   Start from the current reusable snapshot.
3. Refresh the repo.
   Inside the sandbox, fetch from remote so the repo state is current.
4. Create the task branch.
   Inside the sandbox, run `wt switch -c task/<slug>`.
5. Run `opencode`.
   Provide the standard orchestration wrapper prompt plus the task prompt.
6. Verify the result.
   Inside the sandbox, always run:
   `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build`.
7. Publish the branch.
   If verification passes, inject a fresh GitHub App installation token,
   push only the declared branch, and open a draft pull request targeting
   `main`.
8. Clean up.
   Remove the sandbox after successful publish or explicit discard. Retain it
   temporarily if publish failed after verification succeeded.

## Expected Outputs

- one task branch named `task/<slug>`
- one draft pull request targeting `main`
- verification evidence from the fixed publish gate
- docs updates when durable context changed
- a final task outcome such as `published`, `verify_failed`, or
  `publish_failed`

## Current Simplifications

- exactly one PR per accepted task
- no stacked branch execution yet
- fixed verification commands instead of targeted checks
- inline task brief passed to `opencode` instead of persisted orchestration
  files

Future versions may replace these simplifications once the workflow is stable.
