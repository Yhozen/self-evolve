# Data Flow

This page describes the intended high-level data flow for autonomous work.

## Expected Flow

1. Inputs arrive.
   Examples include `GOAL.md`, root docs, accepted decisions, prior run artifacts, or future external sources.
2. The agent reads the wiki.
   `docs/index.md` points the agent to the relevant canonical pages.
3. The agent chooses or receives a bounded task.
   A blueprint in `docs/blueprints/` should describe the expected workflow.
4. The run executes.
   The implementation may change code, docs, or both.
5. The run is evaluated.
   Evidence is checked against `docs/evaluation/`.
6. Durable knowledge is filed back.
   Canonical pages are updated and a run artifact may be stored in `docs/runs/`.

## Current Limitation

This flow is partly conceptual today because the concrete goal, runtime tooling, and automated checks do not exist yet.
