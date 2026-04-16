# Wiki Log

This file is append-only.

Use one entry per meaningful docs operation with the heading format `## [YYYY-MM-DD] kind | subject`.

## [2026-04-15] bootstrap | docs wiki skeleton

- Created the initial docs wiki structure under `docs/`.
- Added `index.md`, `log.md`, and the first canonical overview, architecture, blueprint, evaluation, decision, glossary, run, and template pages.
- Established the rule that placeholders live in canonical files until future project-initialization work or later runs replace them with concrete project context.

## [2026-04-15] decision | sandbox backend abstraction and runnable create flow

- Added decision record `0002-abstract-sandbox-backend-and-create-runnable-sandboxes.md`.
- Recorded that sandbox operations now flow through an Effect-backed service boundary under `src/server/sandbox/` with a Vercel live implementation.
- Recorded that the sandbox console now creates fresh sandboxes on demand, prioritizes runnable sandboxes in the list, and disables command execution for stopped sandboxes.

## [2026-04-15] decision | snapshot-backed persistent sandbox restores

- Added decision record `0003-use-snapshots-for-persistent-sandbox-restores.md`.
- Recorded that persistent sandbox behavior now uses Vercel snapshots as the reusable base for new sandboxes.
- Recorded that the sandbox console exposes the latest snapshot, restores new sandboxes from it when available, and allows saving a running sandbox as the next persistent base.

## [2026-04-15] decision | sandbox and snapshot management surface

- Added decision record `0004-expose-basic-sandbox-and-snapshot-management.md`.
- Recorded that the sandbox console now exposes stop for sandboxes and list/delete for snapshots through the Effect-backed service boundary.

## [2026-04-15] docs | snapshot recipe direction

- Updated `0003-use-snapshots-for-persistent-sandbox-restores.md` to capture the near-term design direction of `recipe + optional user profile`.
- Recorded that Dockerfile-like snapshot customization is a future idea and not part of the current simplified snapshot workflow.

## [2026-04-15] implementation | backend snapshot recipe builder

- Added a backend-only sandbox build flow that creates a fresh sandbox, runs a recipe script, optionally runs a user profile script, and snapshots the result.
- Added typed recipe/profile build results and a server action wrapper without changing the current UI.
- Recorded that arbitrary snapshot layering remains deferred even though recipe-driven snapshot creation is now implemented.

## [2026-04-16] docs | sandbox task runner v1

- Added decision record `0005-use-one-pr-per-task-for-initial-sandbox-runs.md`.
- Added spec `sandbox-task-runner-v1.md` covering assumptions, workflow, state machine, publish rules, and deferred work for the initial sandbox-backed task runner.
- Replaced the placeholder implementation blueprint with the planned one-task, one-PR sandbox execution flow.
- Updated architecture, decision, spec, and docs indexes so the new workflow documents are discoverable.

## [2026-04-16] docs | sandbox task runner follow-ups

- Added `sandbox-task-runner-follow-ups.md` to track deferred decisions and intentional technical debt for the initial task runner.
- Updated the spec indexes so the follow-up page is discoverable alongside the v1 workflow spec.

## [2026-04-16] docs | repo sandbox bootstrap v1

- Added `repo-sandbox-bootstrap-v1.md` to capture the initial user-facing flow for selecting a repository, provisioning a sandbox, snapshotting it, and returning the `opencode` handoff instruction.
- Recorded the accepted v1 simplifications: baseline keyed by repository only, exactly one mutable current snapshot per repository, restore-from-baseline behavior for fresh sandboxes, and no separate user authentication model.
- Updated the docs index, specs index, and architecture pages so the bootstrap flow is discoverable alongside the autonomous task runner docs.
