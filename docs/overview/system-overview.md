# System Overview

This repository is building a language-agnostic self-evolving system around a goal.

The docs wiki under `docs/` is the persistent knowledge layer for that system.

## Three Layers

This repository is converging on three layers inspired by the LLM Wiki pattern:

1. Raw inputs
   Root documents such as `README.md`, `AGENTS.md`, and the future `GOAL.md`, plus future external references and run inputs.
2. The wiki
   The canonical markdown pages under `docs/` that synthesize the repository's current understanding.
3. The schema
   The instructions that tell an agent how to maintain the wiki, primarily `AGENTS.md` and `docs/subagents.md`.

## Human And Agent Roles

- The human provides direction, missing context, and decisions with long-term consequences.
- The agent maintains structure, keeps the wiki current, files durable knowledge, and performs bounded autonomous runs.

## What The Wiki Is For

The wiki should help an agent answer:

- what the repository is trying to achieve
- what is true right now
- which workflows exist
- what evidence is required before work is kept
- when the human needs to be asked for help

## Current Limitation

The repository is still bootstrapping. Several pages in this wiki are placeholders because the concrete project goal and future runtime details are not defined yet.
