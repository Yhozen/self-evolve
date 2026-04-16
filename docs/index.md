# Docs Index

This is the content-oriented entry point for the wiki under `docs/`.

Read `log.md` for recent chronological changes.

## Overview

- [System Overview](overview/system-overview.md) - How this repository, the wiki, and agent instructions fit together.
- [Current State](overview/current-state.md) - What exists today, including bootstrap limitations and known gaps.
- [Target State](overview/target-state.md) - The intended operating model once goal-specific context and automation exist.

## Architecture

- [Architecture Index](architecture/README.md) - Map of structural pages for the repository and its docs runtime.
- [Components](architecture/components.md) - Current and target components of the self-evolving system.
- [Data Flow](architecture/data-flow.md) - How context, runs, evaluation, and documentation are expected to interact.

## Blueprints

- [Blueprints Index](blueprints/README.md) - Current and planned workflows for autonomous work.
- [Docs Maintenance](blueprints/docs-maintenance.md) - How to ingest, query, and lint the docs wiki itself.
- [Implementation Run](blueprints/implementation-run.md) - Planned v1 workflow for one-task, one-PR sandbox-backed implementation runs.
- [Evaluation-Only Run](blueprints/evaluation-only.md) - Planned workflow scaffold for assessing existing work without implementing.
- [PR Preparation](blueprints/pr-preparation.md) - Planned workflow scaffold for preparing reviewable changes once work is complete.

## Evaluation

- [Evaluation Index](evaluation/README.md) - Map of evaluation guidance.
- [Evaluation Criteria](evaluation/criteria.md) - What evidence a run should provide before it is kept.
- [Discard Policy](evaluation/discard-policy.md) - When a run should be rejected, deferred, or decomposed.

## Decisions

- [Decisions Index](decisions/README.md) - Durable records of architectural and process choices.
- [0001: Bootstrap Docs Wiki Structure](decisions/0001-bootstrap-docs-wiki-structure.md) - Why the docs wiki is layered and why placeholders live in canonical files.
- [0002: Abstract Sandbox Backend And Create Runnable Sandboxes](decisions/0002-abstract-sandbox-backend-and-create-runnable-sandboxes.md) - Why sandbox operations now go through an Effect-backed backend boundary and create flow.
- [0003: Use Snapshots For Persistent Sandbox Restores](decisions/0003-use-snapshots-for-persistent-sandbox-restores.md) - Why persistent sandbox behavior now restores from the latest snapshot instead of treating stopped sandboxes as durable compute.
- [0004: Expose Basic Sandbox And Snapshot Management](decisions/0004-expose-basic-sandbox-and-snapshot-management.md) - Why sandbox removal is modeled as stop and snapshots are listed and deleted as first-class resources.
- [0005: Use One PR Per Task For Initial Sandbox Runs](decisions/0005-use-one-pr-per-task-for-initial-sandbox-runs.md) - Why the first autonomous workflow uses one branch and one draft PR per accepted task.

## Specs

- [Specs Index](specs/README.md) - Home for project or feature specs and proposed work.
- [Repo Sandbox Bootstrap V1](specs/repo-sandbox-bootstrap-v1.md) - Initial user flow for selecting a repo, provisioning one reusable sandbox baseline, and returning the `opencode` handoff instruction.
- [Sandbox Task Runner V1](specs/sandbox-task-runner-v1.md) - Initial one-task, one-sandbox, one-branch, one-draft-PR execution model.
- [Sandbox Task Runner Follow-Ups](specs/sandbox-task-runner-follow-ups.md) - Deferred decisions and technical debt accepted for the initial task runner.
- [Superpowers Specs](superpowers/specs/README.md) - Tool-generated design specs and brainstorming artifacts when those workflows are used.

## Glossary

- [Glossary](glossary/README.md) - Stable project terms used across the repository.

## Runs

- [Runs Index](runs/README.md) - Where per-run artifacts and outcomes belong.

## Templates

- [Goal Template](templates/goal-template.md) - Scaffold for `GOAL.md` and future project initialization.
- [Run Brief Template](templates/run-brief-template.md) - Standard input shape for an autonomous run.
- [Evaluation Report Template](templates/evaluation-report-template.md) - Standard evidence shape for run evaluation.
- [Decision Record Template](templates/decision-record-template.md) - Template for ADR-style decision entries.
- [Wiki Page Template](templates/wiki-page-template.md) - General-purpose page structure for durable wiki pages.
- [Source Summary Template](templates/source-summary-template.md) - Template for filing a raw source into the wiki.

## Docs Runtime

- [Wiki Log](log.md) - Append-only chronological record of wiki changes and operations.
- [Superpowers Notes](superpowers/README.md) - Notes about tool-generated docs under `docs/superpowers/`.
