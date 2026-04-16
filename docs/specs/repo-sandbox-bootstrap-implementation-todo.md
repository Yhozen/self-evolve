# Repo Sandbox Bootstrap Implementation TODO

## Purpose

Turn the product spec in
[`repo-sandbox-bootstrap-v1.md`](repo-sandbox-bootstrap-v1.md) into a concrete
implementation plan for this repository.

This page is intentionally implementation-facing. It focuses on what needs to
be built, what already exists, and where the current code does not yet match
the planned product flow.

## Desired V1 Outcome

Given a GitHub repository that the user already authorized through a GitHub
App installation:

1. create a sandbox from that private repository
2. provision the sandbox with the default bootstrap recipe
3. install `opencode`
4. create a baseline snapshot for that repository
5. return the attach instruction the user should run
6. allow future fresh sandboxes to restore from that repository baseline

## Current Assets Already In The Repo

- A Vercel sandbox backend already exists under `src/server/sandbox/`.
- Snapshot create, list, restore, stop, and delete flows already exist.
- A backend-only `buildSandboxSnapshot()` flow already exists, but it always
  starts from a fresh runtime and does not clone a repository.
- A working route pattern exists in `src/app/api/test/route.ts` for:
  - `runtime = "nodejs"`
  - explicit `try/catch`
  - returning structured JSON errors
- `@octokit/app` is already installed and available for GitHub App token minting.

## Critical Gaps In The Current Code

### 1. Snapshot Restore Is Global, Not Repo-Scoped

The current `createSandbox()` implementation in `src/server/sandbox/service.ts`
and `src/server/sandbox/vercel-sandbox-live.ts` restores from the latest
snapshot in the Vercel project.

That is incompatible with the planned bootstrap flow once more than one
repository exists. The product needs a repository-to-baseline mapping layer,
not "latest snapshot wins" behavior.

### 2. Bootstrap Snapshot Builder Does Not Clone A Repo

The existing `buildSandboxSnapshot()` flow creates a fresh sandbox with
`runtime: "node24"` and then runs a shell recipe.

That is useful for generic snapshot warming, but it is not enough for the repo
bootstrap product flow because the source repository is not materialized in the
sandbox.

### 3. No Persistence Layer Exists For Repo Baselines

The product spec assumes state like:

- repository identity
- current baseline snapshot id
- most recent baseline generation time

No repo baseline persistence layer exists in the repository today.

### 4. Private Repo Access Exists Only As A Code Snippet

We have the correct GitHub App installation-token clone pattern, but it is not
yet integrated into the app's server code or lifecycle.

### 5. The Current Attach Flow Is Snapshot-Centric

`src/app/api/test/route.ts` starts `opencode` from an existing snapshot id.

The bootstrap product also needs:

- bootstrap from a private Git repo
- return attach details for the freshly bootstrapped sandbox
- create another sandbox later from the saved repo baseline

## Implementation Checklist

## Phase 1: Domain And Persistence

- [ ] Define a normalized repository identity.
- [ ] Normalize and store at least one canonical repo key such as
      `github.com/<owner>/<repo>`.
- [ ] Decide where repo baseline state lives.
- [ ] Add a `RepoBaseline` record or equivalent with at least:
      - repository key
      - repository URL
      - GitHub installation id
      - current baseline snapshot id
      - baseline recipe version
      - last bootstrapped at
- [ ] Make baseline replacement explicit rather than implicit.
- [ ] Decide whether replacing the baseline also deletes the previous snapshot
      immediately or only removes the mapping.

## Phase 2: GitHub App Token Service

- [ ] Add a server-only GitHub App service under `src/server/`.
- [ ] Parse and validate `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.
- [ ] Mint installation tokens with the GitHub App API at sandbox-create time.
- [ ] Use `octokit.rest.apps.createInstallationAccessToken()` rather than
      depending on opaque auth-object shapes.
- [ ] Never persist installation tokens.
- [ ] Never log installation tokens.
- [ ] Return a structured error when token minting fails.

## Phase 3: Sandbox Backend Extensions

- [ ] Add a sandbox create path for private Git sources.
- [ ] Support `Sandbox.create({ source: { type: "git", ... } })` with the
      GitHub installation token.
- [ ] Add a sandbox create path from an explicit snapshot id.
- [ ] Avoid routing repo bootstrap through the current "latest snapshot in
      project" behavior.
- [ ] Keep the existing generic snapshot builder separate from the repo
      bootstrap flow unless both are intentionally unified.
- [ ] Add helper methods for:
      - create from git repo
      - create from explicit snapshot
      - run shell recipe
      - snapshot sandbox

## Phase 4: Bootstrap Orchestration Service

- [ ] Create a dedicated repo-bootstrap orchestration module under
      `src/server/`.
- [ ] Accept at least:
      - installation id
      - repository URL
- [ ] Create the sandbox from the private repo.
- [ ] Run the default bootstrap recipe inside the sandbox.
- [ ] Snapshot the provisioned sandbox only after the recipe succeeds.
- [ ] Save or replace the repo baseline mapping.
- [ ] Optionally delete the old mapped snapshot after the new baseline is
      durable.
- [ ] Return a structured result containing at least:
      - repository key
      - sandbox id
      - snapshot id
      - bootstrap status
      - attach instruction or attach payload
- [ ] Distinguish failure steps clearly:
      - token
      - sandbox create
      - provisioning
      - snapshot
      - baseline persistence

## Phase 5: Bootstrap Recipe

- [ ] Write the default bootstrap recipe as code, not as scattered inline
      shell strings.
- [ ] Decide the minimum guaranteed bootstrap output for v1.
- [ ] Install `opencode`.
- [ ] Ensure the repo working directory is known and stable.
- [ ] Decide whether v1 also installs repository dependencies by default.
- [ ] If dependency install is included, decide how it behaves for
      non-Node repositories.
- [ ] Add a lightweight verification step before snapshotting.
- [ ] Fail before snapshot creation if `opencode` install or bootstrap
      validation fails.

## Phase 6: Attach And Handoff

- [ ] Reuse the working route-handler style from `src/app/api/test/route.ts`.
- [ ] Standardize how `opencode` is launched inside a sandbox.
- [ ] Return a handoff payload containing at least:
      - sandbox id
      - snapshot id
      - sandbox URL
      - attach command
      - any ephemeral password or token required to attach
- [ ] Keep attach credentials ephemeral and scoped to the running sandbox.
- [ ] Decide whether bootstrap should auto-start the `opencode` server or only
      return the command needed to start it.

## Phase 7: Create Another Sandbox From Baseline

- [ ] Add a repo-scoped "create fresh sandbox" path that looks up the current
      baseline snapshot for that repository.
- [ ] Create the new sandbox from that explicit snapshot id.
- [ ] Return the current attach instruction again.
- [ ] Return a clear error when no baseline exists for the repository.
- [ ] Do not fall back to a project-global latest snapshot.

## Phase 8: UI Surface

- [ ] Add a repo bootstrap entry point in the app UI.
- [ ] Let the user provide or select:
      - repository URL
      - installation id, if not already derivable from existing app state
- [ ] Show bootstrap progress and failure step.
- [ ] Show the saved baseline snapshot for the repository.
- [ ] Show the attach command clearly enough to copy or reuse.
- [ ] Add a "create another sandbox" action that uses the repo baseline.

## Phase 9: Observability And Safety

- [ ] Add structured logging around bootstrap lifecycle steps.
- [ ] Redact tokens and attach secrets from logs.
- [ ] Add timeouts for sandbox creation, bootstrap, and attach startup.
- [ ] Decide the cleanup policy for failed bootstrap sandboxes.
- [ ] Decide the cleanup policy for superseded baseline snapshots.
- [ ] Record enough metadata to debug stale or broken baselines later.

## Phase 10: Verification

- [ ] Add unit coverage for repo identity normalization.
- [ ] Add unit coverage for baseline selection and replacement logic.
- [ ] Add unit coverage for bootstrap result typing and failure mapping.
- [ ] Add at least one integration-style test for:
      - bootstrap from repo
      - save baseline
      - create another sandbox from baseline
- [ ] Manually verify the attach flow against a real sandbox before treating
      the feature as complete.

## Suggested Delivery Order

1. Repo baseline domain model and persistence.
2. GitHub App token service.
3. Sandbox backend support for private Git source and explicit snapshot restore.
4. Repo bootstrap orchestration service.
5. Attach and handoff route.
6. Repo bootstrap UI.
7. Verification and cleanup rules.

## Explicit V1 Punts

- No separate user-auth model beyond existing GitHub authorization.
- No per-user baselines.
- No branch-aware or commit-aware baseline keys.
- No baseline history beyond the one current snapshot per repository.
- No automatic stale-baseline invalidation when the source repo changes.
- No rich in-product terminal for `opencode`.

## Notes For The First Code Pass

- Do not start from the current generic `createSandbox()` flow for this
  feature. It is intentionally project-global and snapshot-oriented.
- Do not reuse `buildSandboxSnapshot()` unchanged for this feature. It does not
  clone the repository.
- Prefer adding repo-bootstrap code as a separate service boundary first, then
  deciding later whether it should absorb or reuse parts of the generic sandbox
  service.
