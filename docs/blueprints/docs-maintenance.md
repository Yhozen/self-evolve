# Docs Maintenance

Use this blueprint when the task is to maintain, extend, lint, or query the wiki under `docs/`.

## Inputs

- `docs/index.md`
- `docs/subagents.md`
- the relevant wiki pages for the task
- any new source material being incorporated

## Workflow

1. Read `docs/index.md` to find the relevant pages.
2. Read `docs/subagents.md` for maintenance rules.
3. Update the canonical page or add a new focused page if needed.
4. Update `docs/index.md` if the wiki map changed.
5. Append to `docs/log.md` if the change was meaningful.
6. Verify links, structure, and consistency before finishing.

## Outputs

- updated canonical wiki pages
- an updated index if the structure changed
- a log entry for meaningful operations

## Escalate When

- the right canonical page is unclear
- the change implies a lasting product or architecture decision
- the wiki structure no longer fits the domain and needs redesign
