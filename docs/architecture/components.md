# Components

This page describes the major components of the repository.

## Current Components

- Root contract docs
  `README.md` and `AGENTS.md` define the human and agent operating model at the repository root.
- Docs wiki
  `docs/` is the synthesized knowledge layer for the repository.
- Sandbox backend
  `src/server/sandbox/` provides the current Effect-backed boundary for Vercel
  sandbox lifecycle, command execution, and snapshot management.
- Templates
  `docs/templates/` provides reusable scaffolds for goals, run briefs, evaluation, decisions, and wiki pages.
- Run evidence area
  `docs/runs/` is reserved for per-run artifacts and outcomes.

## Target Components

These are expected or newly planned as the workflow becomes concrete:

- `GOAL.md` as the canonical goal definition
- goal-specific architecture docs
- minimal task planner that accepts or rejects one-PR tasks and creates task
  slugs
- sandbox task runner that creates a sandbox, refreshes the repo, creates the
  task branch with `wt`, launches `opencode`, runs verification, and publishes a
  draft pull request
- publish control plane that injects fresh GitHub App installation tokens only
  at publish time
- automated evaluation and PR preparation support
- optional local search or other wiki tooling as scale increases
