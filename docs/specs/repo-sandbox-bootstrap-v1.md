# Repo Sandbox Bootstrap V1

## Purpose

Define the initial user-facing flow for turning a selected GitHub repository
into a reusable sandbox baseline that can be handed off to `opencode`.

This is a v1 product spec. It records the intended operating model and the
accepted simplifications for the first version.

## Summary

The bootstrap flow will:

1. accept a repository selection after GitHub authorization already exists
2. create a sandbox for that repository
3. run the default provisioning script inside the sandbox
4. install `opencode` as part of provisioning
5. create or replace the current baseline snapshot for that repository
6. return the sandbox details plus the current instruction the user should run
   inside the isolated environment
7. let future fresh sandboxes restore from that current snapshot for the same
   repository

## Goals

- let a user start from a repository they already authorized
- avoid repeating workstation setup for every fresh sandbox
- keep the user handoff simple by returning instructions instead of building a
  richer interactive product surface
- treat the baseline snapshot as the reusable starting point for future
  sandboxes

## Non-Goals

- user authentication and account modeling beyond existing GitHub authorization
- multiple named snapshots per repository
- snapshot lineage or version history
- branch-aware or commit-aware baseline selection
- interactive in-product control of `opencode`
- per-user sandbox customization

Those remain future work.

## Assumptions

### GitHub Access

- the GitHub authorization flow already exists
- the system can already access the selected repository
- v1 does not model separate user authentication concerns beyond that

### Repository Identity

- the baseline key is the repository itself
- branch, commit SHA, and user identity are ignored for baseline selection in v1
- a repository may have only one current baseline snapshot at a time
- the current baseline snapshot may be regenerated and replaced

### Provisioning

- the default provisioning script is responsible for preparing the workspace
- `opencode` is installed by that default provisioning script
- the result of provisioning is good enough to snapshot as the reusable baseline

### User Handoff

- the product returns instructions, not an embedded terminal or interactive
  control surface
- the user is expected to run `opencode` in the isolated environment after the
  bootstrap flow completes

## Primary User Flow

### 1. Select Repository

- the user chooses a repository they already authorized
- the backend resolves the repository as the baseline identity for this flow

### 2. Create Sandbox

- create a sandbox for the selected repository
- clone or otherwise materialize the repository into the sandbox workspace

### 3. Provision Sandbox

Inside the sandbox:

- run the default provisioning script
- install `opencode`
- prepare the repo workspace well enough to become the reusable baseline

### 4. Save Current Baseline Snapshot

- snapshot the provisioned sandbox
- mark that snapshot as the one current baseline snapshot for the repository
- if a baseline snapshot already exists for the repository, replace it

### 5. Return Handoff Instruction

Return:

- the repository identity
- the active sandbox id
- the current snapshot id
- the instruction the user should run to use `opencode` in that isolated
  environment

## Repeat Sandbox Flow

When the user later asks for another sandbox from the same repository:

1. look up the one current snapshot for that repository
2. create a fresh sandbox from that snapshot
3. return the current instruction again

This flow intentionally restores from the repository baseline snapshot rather
than from the user’s most recently modified sandbox.

## State Model

For each repository, v1 tracks only:

- repository identity
- current baseline snapshot id
- most recent baseline generation time

V1 does not require:

- snapshot history
- multiple baselines
- per-branch baselines
- per-user baselines

## Accepted Risks And Simplifications

- repository changes may make the current baseline stale
- replacing the baseline snapshot destroys prior baseline history
- provisioning failures or bad baselines are tolerated as operational v1 risk
- baseline selection is coarse because it ignores branch and commit identity
- returning plain instructions is acceptable even if richer connection UX would
  be better later

These are acceptable trade-offs for the first version.

## Open Upgrade Paths

Likely future extensions include:

- keying baselines by repository plus commit or branch
- keeping baseline history instead of one mutable current snapshot
- separating repo bootstrap from later task execution flows
- adding richer connection and instruction handoff UX
- adding explicit authentication and ownership modeling
