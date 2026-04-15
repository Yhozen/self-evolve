# Docs Subagents Guide

This file defines how agents should work inside `docs/`.

Root instructions in `../AGENTS.md` still apply. This file adds subtree-specific behavior for the wiki.

## Purpose

The `docs/` tree is a persistent, agent-maintained wiki for this repository.

It is meant to sit between raw project inputs and future autonomous runs:

- humans and agents read it as the current synthesized understanding of the repository
- agents update it as new context, decisions, and run outcomes appear
- placeholders are allowed in canonical pages while the project is still bootstrapping

## When To Read This File

Read this file when:

- editing anything under `docs/`
- using the wiki as context for an autonomous run
- adding or changing wiki structure, templates, or maintenance rules

## Directory Model

- `index.md` is the content-oriented map of the wiki.
- `log.md` is the chronological log of meaningful wiki operations.
- `overview/` holds high-level project summaries.
- `architecture/` holds structural descriptions and boundaries.
- `blueprints/` holds operational workflows for autonomous runs.
- `evaluation/` defines what evidence makes a run worth keeping.
- `decisions/` holds durable ADR-style decisions.
- `specs/` holds project and feature specs.
- `glossary/` holds stable project terms.
- `runs/` holds per-run artifacts and outcomes.
- `templates/` holds reusable markdown scaffolds.
- `superpowers/` holds tool-generated specs or workflow artifacts when those tools are used.

## Page Types

There are five main page types in this wiki:

1. Canonical pages
   Summaries of current truth, such as architecture, evaluation criteria, or workflow blueprints.
2. Decision records
   Durable records of why an important choice was made.
3. Run artifacts
   Inputs, evidence, and outcomes for a specific run. These are historical records, not canonical truth.
4. Templates
   Reusable page shapes that future runs can instantiate.
5. Tool-generated artifacts
   Files produced by structured tooling workflows, such as brainstorming specs, that may inform the wiki without automatically becoming canonical.

## Required Behaviors

- Read `index.md` before making broad wiki changes.
- Prefer updating an existing canonical page over creating a duplicate summary.
- Update `index.md` whenever a canonical page is added, renamed, or removed.
- Append to `log.md` for meaningful ingests, lint passes, query-derived pages, structural changes, and large documentation updates.
- Keep per-run evidence under `runs/`, not mixed into overview or architecture pages.
- Keep root `AGENTS.md` concise. Put docs-specific workflow detail here instead.

## Placeholder Rules

Placeholder pages are expected during bootstrap.

- Put placeholders in the real canonical file that will eventually hold the content.
- Say explicitly what is missing and what future process is expected to fill it.
- Do not create a separate holding area for placeholders.
- Replace placeholder sections in place once concrete information exists.

## Change Coupling

When one kind of document changes, update the related wiki pages in the same pass:

- If `README.md` or `AGENTS.md` changes materially, review `overview/system-overview.md` and `overview/current-state.md`.
- If the run loop or a workflow changes, update the relevant page in `blueprints/` and any impacted pages in `evaluation/`.
- If evaluation standards change, update both `evaluation/criteria.md` and `evaluation/discard-policy.md`.
- If a durable trade-off is accepted, add or update a record in `decisions/`.
- If a new canonical page is added, update `index.md` and add a `log.md` entry.
- If the project gains a concrete goal, update `GOAL.md` and the placeholder content in overview pages that depend on it.

## Operations

### Ingest

Use ingest behavior when new durable context arrives.

Examples:

- a new root document is added
- a design spec is accepted
- a human provides concrete goal or architecture context
- an external source is read and its conclusions matter to the repo

Expected ingest behavior:

1. Read the new source.
2. Update the relevant canonical pages.
3. Add a new page only if the knowledge does not fit an existing one.
4. Update `index.md` if the page map changed.
5. Append a concise entry to `log.md`.

### Query

Use query behavior when a human asks a question against the wiki.

- Read `index.md` first.
- Read the relevant canonical pages.
- Answer with citations to wiki pages.
- If the result is durable and reusable, file it back into the wiki as a page or update an existing page.

### Lint

Use lint behavior to keep the wiki healthy.

Look for:

- contradictions between canonical pages
- stale placeholder text after concrete information exists
- orphan pages with no meaningful inbound references
- important concepts mentioned but lacking a page or glossary entry
- missing links between decisions, blueprints, and evaluation rules

## Writing Style

- Prefer plain markdown and relative links.
- Keep pages short and focused.
- Use headings that describe what the page is for.
- Favor synthesis over raw notes.
- Avoid duplicating the same explanation in multiple places.

## Current Bootstrap Assumptions

- `GOAL.md` does not exist yet.
- A future project-initialization workflow, potentially called `init-project`, is expected to collect project-specific context and fill key placeholders.
- Some blueprints are scaffolds rather than fully validated workflows.
- `docs/` is already the canonical wiki; do not wait for later tooling to start using it.
