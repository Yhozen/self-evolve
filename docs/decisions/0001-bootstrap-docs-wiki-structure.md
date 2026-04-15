# 0001: Bootstrap Docs Wiki Structure

## Status

Accepted

## Context

The repository needs a durable knowledge layer under `docs/` before it has a concrete product goal or execution tooling.

The root `AGENTS.md` should stay concise, but agents still need detailed instructions for maintaining the wiki.

Some canonical files must exist before they can be filled with real project content.

## Decision

The repository will use a layered docs wiki under `docs/` with:

- `index.md` as the content-oriented entry point
- `log.md` as the chronological operation log
- `subagents.md` as the docs-specific schema and maintenance guide
- separate sections for overview, architecture, blueprints, evaluation, decisions, specs, glossary, runs, and templates
- placeholders in canonical files rather than in a separate holding area

## Consequences

- Agents can navigate the docs tree through a stable entry point.
- Root agent guidance stays short while docs-specific behavior lives closer to the wiki.
- The repository can absorb real goal-specific content later without reorganizing the wiki.
- Some pages will intentionally remain partial until future project-initialization work or later runs supply real context.
