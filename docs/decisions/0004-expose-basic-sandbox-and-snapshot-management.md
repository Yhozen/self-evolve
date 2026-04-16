# 0004: Expose Basic Sandbox And Snapshot Management

## Status

Accepted

## Context

The sandbox console could already create sandboxes, run commands, and save a
running sandbox as a snapshot.

That left a management gap:

- users could not stop a running sandbox from the UI
- users could not inspect the full snapshot inventory
- users could not delete snapshots they no longer wanted
- the platform distinction between sandbox lifecycle and snapshot lifecycle was
  implicit instead of explicit

Current Vercel Sandbox behavior exposes sandbox shutdown through `stop()` and
snapshot removal through snapshot deletion APIs.

## Decision

The console will expose basic management primitives directly through the
Effect-backed sandbox service:

- sandboxes: list, create, inspect, stop
- snapshots: list, create, inspect, delete

The UI will label sandbox removal as `Stop Sandbox` rather than `Delete
Sandbox`, because the current platform exposes shutdown but not hard deletion
for sandbox instances.

## Consequences

- The UI now matches the actual Vercel lifecycle model instead of implying a
  sandbox hard-delete capability that does not exist.
- Snapshot inventory becomes visible and manageable without leaving the app.
- The project-owned sandbox abstraction now covers the basic operational
  lifecycle for both sandboxes and snapshots.
