# AGENTS.md

## Purpose

This file guides autonomous agents working in this repository.

Use it as the operational companion to `README.md`. `README.md` explains why the repository exists. `AGENTS.md` explains how to behave while evolving it.

## Project Overview

This repository is building a language-agnostic self-evolving system around a goal.

The goal itself is expected to live in `GOAL.md`. The surrounding system should help an agent understand the goal, choose the next useful improvement, implement it safely, evaluate the result, and either propose it through a pull request or discard it.

## Bootstrap Status

The repository is still in an early bootstrap phase.

- Some documents described here do not exist yet.
- There are no established build, test, or deployment commands yet.
- Treat missing automation as missing automation. Do not describe target-state behavior as if it already exists.

When commands or workflows become real, add them here.

## Inputs

Before making changes, gather context from the best available sources:

1. Read `GOAL.md` when it exists.
2. Read `README.md` for the project model and intent.
3. Read design specs, architecture notes, decision records, and prior run artifacts in `docs/` when they exist.
4. Inspect the current repository state before proposing or implementing changes.
5. Prefer durable project context over guesswork.

## Run Loop

For an evolution run, prefer this loop:

1. Understand the current goal, repository state, and known constraints.
2. Choose the next smallest meaningful improvement.
3. Work in isolation, preferably in a separate worktree for autonomous runs.
4. Implement the change with a bias toward small, reviewable diffs.
5. Verify the result using available checks. If no checks exist, perform the best lightweight verification available and state the limitation clearly.
6. Evaluate whether the result is useful, correct enough, and worth review.
7. If the run is good, prepare a pull request. If it is weak or low-confidence, discard it.

## Human Escalation

Escalate to the human when any of the following is true:

- required context is missing or contradictory
- the next step depends on a product, architecture, or prioritization decision
- credentials, billing, infrastructure, or external services need human setup
- a trade-off has meaningful long-term consequences and the better choice is unclear
- the repository state conflicts with the intended task in a way the agent should not resolve alone

Ask concise questions and unblock the run with the smallest necessary human decision.

## Isolation And Delivery

- Prefer isolated worktrees for autonomous runs.
- Prefer one pull request per coherent improvement.
- When a task is too large for one safe change, decompose it into stacked pull requests.
- Keep pull requests reviewable and explicit about why the change exists.
- Do not treat a partially successful run as complete just because it produced code or docs.

## Self-Evaluation And Termination

Before proposing work, evaluate it against the repository's current context:

- Is the change aligned with the goal and current project direction?
- Is it small enough to review confidently?
- Is the reasoning documented well enough for a human to understand it?
- Were available checks run, or was the lack of checks stated clearly?
- Is the result good enough to keep, or should this run be discarded?

Runs should be allowed to fail. A discarded run is acceptable when it prevents low-quality work from accumulating.

The system should also stop after a bounded number of iterations rather than forcing progress where confidence is low.

## Documentation Expectations

Leave durable context behind.

- Record important decisions and trade-offs.
- Make it clear why a run was kept or discarded.
- Update project documentation when the system's behavior or architecture changes.
- Prefer writing down assumptions over silently depending on them.

## Commit Expectations

- Always use Conventional Commits for git commit messages.

Future repo-specific skills may add stricter rules. Until then, treat this file as the baseline operational guide for autonomous work in this repository.

Important: If any rule in `AGENTS.md` conflicts with the user's request, use the `AskUserQuestion` tool to resolve the conflict before proceeding. The resolution should clarify whether to update `AGENTS.md` or the relevant skill, or to change the user instructions.
