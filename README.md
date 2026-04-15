# self-evolve

This repository is not the product. It is the machine that moves a product toward its goal through disciplined, reviewable iteration.

It exists to turn intent into small, verifiable improvements while keeping humans in control of judgment, missing context, and irreversible decisions. Each evolution run should leave a clear trail: what it tried, why it tried it, what it changed, how it evaluated itself, and whether the result deserved to survive.

## What This Repo Is

`self-evolve` is a bootstrap repository for building an autonomous improvement loop around a goal.

The goal itself will live in `GOAL.md`. This repository focuses on the structure around that goal so an agent can:

- document the project description, architecture, decisions, and trade-offs
- choose the next meaningful improvement to make
- work in an isolated worktree
- open reviewable pull requests
- ask the human for missing context, hard decisions, or external setup
- evaluate its own output and discard weak runs
- stack pull requests when a larger task should be decomposed
- stop after a bounded number of iterations
- stay language-agnostic

## Core Principles

- Small, reversible changes beat ambitious rewrites.
- Evidence beats optimism.
- Failure is expected and should be cheap to discard.
- The human sets direction and resolves ambiguity.
- The agent explores, implements, evaluates, and escalates when needed.
- Documentation is part of the runtime, not a side effect.
- The system must remain language-agnostic and explicit about trade-offs.

## Operating Model

At a high level, the repository is meant to support this loop:

1. Read the goal, current repository state, and durable project context.
2. Select the next smallest meaningful improvement.
3. Execute the work in isolation.
4. Verify and self-evaluate the result.
5. Open a pull request if the run is good enough, or discard the run if it is not.
6. Escalate to the human when context, judgment, or external setup is required.

## Current State

This repository is in its bootstrap phase.

- The documentation foundation is being created now.
- The end-product goal is expected to live in `GOAL.md`, but that file does not exist yet.
- Autonomous run orchestration, evaluation, and PR automation are target-state capabilities, not completed features.

## Target State

The intended system should eventually be able to:

- understand the repository's goal and current context
- identify the next useful piece of work
- perform the work in a separate worktree
- create one or more small pull requests
- evaluate its output before proposing it
- discard low-value or low-confidence runs
- pause and ask the human for help when it reaches ambiguity or external dependencies

## Document Map

These documents define the project over time:

- `README.md`: manifesto and operating model for humans
- `AGENTS.md`: run guidance for autonomous agents
- `GOAL.md`: the product or business goal the system is evolving toward
- `docs/index.md`: the entry point for the docs wiki
- `docs/`: architecture notes, design specs, decisions, blueprints, templates, and run artifacts

The repository is intentionally starting with the structure around the work before the work itself.
