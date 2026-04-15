# 0002: Abstract Sandbox Backend And Create Runnable Sandboxes

## Status

Accepted

## Context

The sandbox console originally called `@vercel/sandbox` directly from a `use server` module and assumed that the listed sandbox was runnable.

That coupling made two problems visible:

- backend behavior was tied to Vercel-specific APIs instead of a project-owned interface
- the UI could repeatedly attempt commands against sandboxes that had already stopped

The repository now needs a backend boundary that can support Effect-based orchestration and alternate implementations later, while still keeping the current Vercel integration working.

## Decision

The sandbox console will use a project-owned sandbox backend abstraction implemented as an Effect service and layer under `src/server/sandbox/`.

The current live implementation will remain Vercel-backed, but the UI and server actions will call the abstract service rather than `@vercel/sandbox` directly.

The backend contract will include:

- listing sandboxes
- creating a new sandbox
- executing a command in a sandbox

The console UI will prefer runnable sandboxes, add an explicit `Create Sandbox` action, and disable command execution for sandboxes that are not in the `running` state.

## Consequences

- The Vercel integration is isolated behind a project-owned boundary that can be replaced or expanded later.
- `use server` files remain thin and delegate to `src/server`, which matches the repository guidance and the Next.js data-access-layer guidance.
- The user can recover from stopped sandboxes directly in the UI by creating a fresh runnable sandbox.
- Sandbox ordering now prioritizes runnable states ahead of stopped or failed sandboxes.
- Future sandbox providers can be added without rewriting the client-side console flow.
