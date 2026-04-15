# 0003: Use Snapshots For Persistent Sandbox Restores

## Status

Accepted

## Context

The sandbox console could create runnable Vercel sandboxes, but each new sandbox
started from a cold filesystem state.

That created two gaps for the current use case:

- the UI could not preserve a warmed environment across sandbox restarts
- the user wants a persistent sandbox workflow for commands such as
  `pnpm dlx cowsay "hi from the sandbox"`

Current Vercel Sandbox documentation treats sandboxes as ephemeral compute and
uses snapshots as the persistence mechanism for restoring filesystem state and
installed packages into new sandboxes.

## Decision

The Vercel sandbox backend will treat persistence as snapshot-backed restore.

The backend contract now includes:

- reading the latest reusable snapshot for the configured Vercel project
- creating a new sandbox from that snapshot when one exists
- saving a running sandbox as a snapshot with no expiration so it can act as
  the next persistent base

The console UI will expose that model directly by:

- showing the latest persistent snapshot summary
- preferring create-from-snapshot over cold create when a snapshot exists
- adding a `Save Snapshot` action per running sandbox

## Consequences

- The persistence model is explicit and matches the current Vercel platform
  behavior instead of implying that stopped sandboxes remain directly runnable.
- A warmed sandbox can be turned into a reusable base without changing the
  project-owned sandbox abstraction.
- Snapshot creation intentionally stops the source sandbox, so the UI must
  refresh after persistence operations and explain that behavior clearly.
- Persistence depends on snapshot listing for the configured Vercel project, so
  restore behavior now relies on `VERCEL_PROJECT_ID` being available to the app
  server.
